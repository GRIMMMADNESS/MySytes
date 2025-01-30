import logging
import asyncio
import os
import requests
import socks
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import Application, CommandHandler, MessageHandler, CallbackQueryHandler, filters, ContextTypes
from youtubesearchpython import VideosSearch
import yt_dlp
import traceback
import glob
from datetime import datetime, timedelta

# Настройка логирования
logging.basicConfig(
    format='%(asctime)s - %(levelname)s - %(message)s',
    level=logging.INFO,
    handlers=[
        logging.FileHandler('bot.log'),
        logging.StreamHandler()
    ]
)

logger = logging.getLogger(__name__)
logging.getLogger('httpx').setLevel(logging.WARNING)

# Константы
MAX_FILE_SIZE_MB = 50
MAX_VIDEO_DURATION = 600  # 10 минут
SEARCH_RESULTS_LIMIT = 5

class ProxyManager:
    def __init__(self):
        self.socks_ports = [9150, 9050]  # Порты Tor Browser и Tor Service
        self.current_port = None
        self.last_check = {}
        self.check_interval = timedelta(minutes=1)
    
    def need_check(self, proxy_url: str) -> bool:
        if proxy_url not in self.last_check:
            return True
        return datetime.now() - self.last_check[proxy_url] > self.check_interval
    
    async def check_proxy(self, proxy_url: str) -> bool:
        if not self.need_check(proxy_url):
            return True
            
        try:
            async with asyncio.timeout(10):
                session = requests.Session()
                session.proxies = {
                    'http': proxy_url,
                    'https': proxy_url
                }
                response = await asyncio.get_event_loop().run_in_executor(
                    None,
                    lambda: session.get('https://www.youtube.com', timeout=10)
                )
                if response.status_code == 200:
                    self.last_check[proxy_url] = datetime.now()
                    logger.info(f"Прокси {proxy_url} работает")
                    return True
        except Exception as e:
            logger.warning(f"Ошибка проверки прокси {proxy_url}: {str(e)}")
        return False
    
    async def get_working_proxy(self) -> str:
        """Возвращает рабочий SOCKS5 прокси"""
        # Сначала проверяем текущий порт, если он есть
        if self.current_port:
            proxy_url = f"socks5h://127.0.0.1:{self.current_port}"
            if await self.check_proxy(proxy_url):
                return proxy_url
        
        # Проверяем все порты
        for port in self.socks_ports:
            proxy_url = f"socks5h://127.0.0.1:{port}"
            if await self.check_proxy(proxy_url):
                self.current_port = port
                return proxy_url
        
        return None

# Создаем менеджер прокси
proxy_manager = ProxyManager()

# Базовые настройки для yt-dlp
YDL_OPTIONS = {
    'format': 'best',
    'nocheckcertificate': True,
    'no_warnings': True,
    'ignoreerrors': True,
    'quiet': True,
    'extract_flat': True,
    'socket_timeout': 30,
    'retries': 3,
    'http_headers': {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    },
    'prefer_insecure': True,
    'force_ipv4': True,
    'rm_cachedir': True
}

def get_download_options(base_opts: dict, format_id: str = None) -> dict:
    """Создает настройки для загрузки видео"""
    opts = base_opts.copy()
    opts.update({
        'format': format_id if format_id else 'best',
        'outtmpl': 'downloads/%(title)s.%(ext)s',
        'merge_output_format': 'mp4',
        'retries': 5,
        'fragment_retries': 5,
        'continuedl': True
    })
    return opts

async def search_videos(query: str) -> list:
    """Поиск видео на YouTube"""
    try:
        videos_search = VideosSearch(query, limit=SEARCH_RESULTS_LIMIT)
        results = videos_search.result()['result']
        
        formatted_results = []
        for video in results:
            formatted_results.append({
                'title': video['title'],
                'url': video['link'],
                'duration': video['duration'],
                'channel': video['channel']['name'],
                'views': video.get('viewCount', {}).get('short', 'N/A'),
                'thumbnail': video['thumbnails'][0]['url']
            })
        
        return formatted_results
    except Exception as e:
        logger.error(f"Error searching videos: {str(e)}")
        return []

def cleanup_temp_files(pattern: str = "downloads/*"):
    """Очищает временные файлы"""
    try:
        if not os.path.exists('downloads'):
            os.makedirs('downloads')
            return
            
        for file in glob.glob(pattern):
            try:
                if os.path.isfile(file):
                    os.remove(file)
                    logger.info(f"Удален временный файл: {file}")
            except Exception as e:
                logger.warning(f"Не удалось удалить файл {file}: {str(e)}")
    except Exception as e:
        logger.error(f"Ошибка при очистке временных файлов: {str(e)}")

# Обработчик команды /start
async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    keyboard = [
        [InlineKeyboardButton("🔍 Поиск видео", callback_data='search')],
        [InlineKeyboardButton("ℹ️ Помощь", callback_data='help')],
        [InlineKeyboardButton("⭐️ Избранное", callback_data='favorites')]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)
    
    await update.message.reply_text(
        "👋 Привет! Я бот для поиска видео.\n\n"
        "🎥 Отправь мне название видео, и я найду его для тебя!\n"
        "📌 Используй кнопки ниже для навигации:",
        reply_markup=reply_markup
    )

# Обработчик текстовых сообщений
async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.message.text
    status_message = await update.message.reply_text(
        f"🔍 Ищу видео по запросу: {query}\n\n"
        "⏳ Пожалуйста, подождите..."
    )
    
    try:
        videos = await search_videos(query)
        
        if not videos:
            await status_message.edit_text("😕 По вашему запросу ничего не найдено.")
            return
        
        for video in videos:
            keyboard = [
                [
                    InlineKeyboardButton("📥 Скачать", callback_data=f"format_{video['url']}"),
                    InlineKeyboardButton("⭐️ В избранное", callback_data=f"fav_{video['url']}")
                ]
            ]
            reply_markup = InlineKeyboardMarkup(keyboard)
            
            caption = (
                f"📹 *{video['title']}*\n\n"
                f"👤 Канал: {video['channel']}\n"
                f"⏱ Длительность: {video['duration']}\n"
                f"👁 Просмотры: {video['views']}\n\n"
                f"🔗 [Смотреть на YouTube]({video['url']})"
            )
            
            await update.message.reply_photo(
                photo=video['thumbnail'],
                caption=caption,
                reply_markup=reply_markup,
                parse_mode='Markdown'
            )
        
        await status_message.delete()
    
    except Exception as e:
        logging.error(f"Error searching videos: {e}")
        await status_message.edit_text(
            "😔 Произошла ошибка при поиске видео.\n"
            "Пожалуйста, попробуйте позже или измените запрос."
        )

# Обработчик нажатий на кнопки
async def button_click(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()
    
    if query.data == 'search':
        await query.message.reply_text(
            "🔍 Введите название видео для поиска:"
        )
    elif query.data == 'help':
        await query.message.reply_text(
            "ℹ️ Справка по использованию бота:\n\n"
            "1. Для поиска просто отправьте название видео\n"
            "2. Используйте кнопки для навигации\n"
            "3. Нажмите 'Скачать' и выберите качество видео\n"
            "4. Добавляйте видео в избранное\n\n"
            "⚠️ Ограничения:\n"
            "- Максимальная длительность видео: 10 минут\n"
            "- Максимальный размер файла: 50MB\n\n"
            "По всем вопросам: @your_username"
        )
    elif query.data == 'favorites':
        await query.message.reply_text(
            "⭐️ Ваш список избранных видео пуст\n\n"
            "Чтобы добавить видео в избранное, нажмите на ⭐️ рядом с видео в результатах поиска"
        )
    elif query.data.startswith('format_'):
        url = query.data.replace('format_', '')
        try:
            formats = await get_video_formats(url)
            if not formats:
                await query.message.reply_text(
                    "😔 Не удалось найти подходящие форматы для скачивания.\n"
                    "Видео может быть слишком большим."
                )
                return
            
            keyboard = []
            for fmt in formats:
                btn_text = f"🎥 {fmt['quality']} ({fmt['size']}MB)"
                keyboard.append([InlineKeyboardButton(
                    btn_text,
                    callback_data=f"download_{url}_{fmt['format_id']}"
                )])
            
            reply_markup = InlineKeyboardMarkup(keyboard)
            await query.message.reply_text(
                "📥 Выберите качество видео:",
                reply_markup=reply_markup
            )
        except Exception as e:
            await query.message.reply_text(
                "😔 Произошла ошибка при получении форматов видео.\n"
                "Пожалуйста, попробуйте позже."
            )
    
    elif query.data.startswith('download_'):
        _, url, format_id = query.data.split('_', 2)
        status_message = await query.message.reply_text(
            "⏳ Скачиваю видео...\n"
            "Это может занять некоторое время."
        )
        
        try:
            video_path = await download_video(url, format_id)
            
            with open(video_path, 'rb') as video_file:
                await query.message.reply_video(
                    video=video_file,
                    caption="✅ Вот ваше видео!"
                )
            
            os.remove(video_path)
            await status_message.delete()
            
        except Exception as e:
            error_message = str(e)
            if "too long" in error_message.lower():
                await status_message.edit_text(
                    "⚠️ Это видео слишком длинное.\n"
                    "Максимальная длительность: 10 минут."
                )
            elif "filesize" in error_message.lower():
                await status_message.edit_text(
                    "⚠️ Это видео слишком большое.\n"
                    "Максимальный размер: 50MB."
                )
            else:
                await status_message.edit_text(
                    "😔 Произошла ошибка при скачивании видео.\n"
                    "Пожалуйста, попробуйте другое видео."
                )
            logging.error(f"Download error: {e}")

async def help_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text(
        "ℹ️ Справка по использованию бота:\n\n"
        "1. Для поиска просто отправьте название видео\n"
        "2. Используйте кнопки для навигации\n"
        "3. Нажмите 'Скачать' и выберите качество видео\n"
        "4. Добавляйте видео в избранное\n\n"
        "⚠️ Ограничения:\n"
        "- Максимальная длительность видео: 10 минут\n"
        "- Максимальный размер файла: 50MB\n\n"
        "По всем вопросам: @your_username"
    )

async def get_video_formats(url: str) -> list:
    """Получает доступные форматы видео"""
    logger.info(f"Получение форматов для URL: {url}")
    
    ydl_opts = YDL_OPTIONS.copy()
    
    try:
        # Получаем рабочий прокси
        proxy = await proxy_manager.get_working_proxy()
        if proxy:
            ydl_opts['proxy'] = proxy
            logger.info(f"Используем прокси: {proxy}")
        
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            logger.info("Извлечение информации о видео...")
            info = ydl.extract_info(url, download=False)
            
            if not info:
                raise Exception("Не удалось получить информацию о видео")
            
            formats = []
            available_formats = info.get('formats', [])
            
            logger.info(f"Найдено {len(available_formats)} форматов")
            
            for f in available_formats:
                try:
                    has_video = f.get('vcodec', 'none') != 'none'
                    has_audio = f.get('acodec', 'none') != 'none'
                    
                    if has_video and has_audio:
                        format_id = f['format_id']
                        ext = f.get('ext', 'mp4')
                        resolution = f.get('height', 0)
                        quality = f.get('quality_label', f'{resolution}p' if resolution else 'N/A')
                        filesize = f.get('filesize', 0) or f.get('filesize_approx', 0)
                        size_mb = round(filesize / (1024 * 1024), 1) if filesize else 0
                        
                        if size_mb <= MAX_FILE_SIZE_MB:
                            formats.append({
                                'format_id': format_id,
                                'quality': quality,
                                'size': size_mb,
                                'ext': ext
                            })
                            logger.info(f"Добавлен формат: {format_id} ({quality}, {size_mb}MB)")
                except Exception as e:
                    logger.warning(f"Ошибка обработки формата: {str(e)}")
                    continue
            
            if formats:
                formats.sort(key=lambda x: int(x['quality'].replace('p', '')) if x['quality'].endswith('p') else 0, reverse=True)
                return formats
            
            return [{'format_id': 'best', 'quality': '720p', 'size': 0, 'ext': 'mp4'}]
            
    except Exception as e:
        logger.error(f"Ошибка при получении форматов: {str(e)}")
        logger.error(f"Traceback: {traceback.format_exc()}")
        return [{'format_id': 'best', 'quality': '720p', 'size': 0, 'ext': 'mp4'}]

async def download_video(url: str, format_id: str = None) -> str:
    """Скачивает видео и возвращает путь к файлу"""
    logger.info(f"Начало загрузки видео: {url}, формат: {format_id}")
    
    ydl_opts = get_download_options(YDL_OPTIONS, format_id)
    max_attempts = 3
    attempt = 0
    last_error = None
    
    while attempt < max_attempts:
        try:
            cleanup_temp_files()
            
            # Получаем рабочий прокси
            proxy = await proxy_manager.get_working_proxy()
            if not proxy:
                raise Exception("Не удалось получить рабочий прокси")
            
            ydl_opts['proxy'] = proxy
            logger.info(f"Попытка {attempt + 1} с прокси: {proxy}")
            
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                # Проверяем информацию о видео
                info = ydl.extract_info(url, download=False)
                if not info:
                    raise Exception("Не удалось получить информацию о видео")
                
                # Проверяем длительность
                duration = info.get('duration', 0)
                if duration > MAX_VIDEO_DURATION:
                    raise Exception(f"Видео слишком длинное ({duration} сек)")
                
                # Проверяем размер файла
                filesize = info.get('filesize', 0) or info.get('filesize_approx', 0)
                if filesize > MAX_FILE_SIZE_MB * 1024 * 1024:
                    raise Exception(f"Файл слишком большой ({filesize/(1024*1024):.1f}MB)")
                
                # Скачиваем видео
                logger.info("Начинаем загрузку видео...")
                info = ydl.extract_info(url, download=True)
                filename = ydl.prepare_filename(info)
                
                if not os.path.exists(filename):
                    raise Exception("Файл не был скачан")
                
                actual_size = os.path.getsize(filename)
                logger.info(f"Видео успешно скачано: {filename} ({actual_size/(1024*1024):.1f}MB)")
                return filename
                
        except Exception as e:
            last_error = str(e)
            logger.error(f"Ошибка при попытке {attempt + 1}: {str(e)}")
            attempt += 1
            
            if attempt >= max_attempts:
                cleanup_temp_files()
                logger.error(f"Все попытки исчерпаны. Последняя ошибка: {last_error}")
                logger.error(f"Traceback: {traceback.format_exc()}")
                raise Exception("Не удалось скачать видео после нескольких попыток")
            
            # Ждем перед следующей попыткой
            await asyncio.sleep(2 * attempt)
    
    raise Exception("Не удалось скачать видео")

def main():
    # Создаём токен бота
    TOKEN = "7905669787:AAEa2iCwYVIeEJBwNiPZes7L1ZvZsL-lykc"
    
    # Создаём приложение
    application = Application.builder().token(TOKEN).build()

    # Добавляем обработчики
    application.add_handler(CommandHandler("start", start))
    application.add_handler(CommandHandler("help", help_command))
    application.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_message))
    application.add_handler(CallbackQueryHandler(button_click))

    # Запускаем бота
    print("Бот запущен...")
    application.run_polling(allowed_updates=Update.ALL_TYPES)

if __name__ == '__main__':
    main() 