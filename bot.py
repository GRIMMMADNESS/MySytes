import os
import logging
from telegram import Update
from telegram.ext import Application, CommandHandler, MessageHandler, ContextTypes, filters
import speech_recognition as sr
from pydub import AudioSegment
import tempfile

# Настройка логирования
logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    level=logging.INFO
)

# Замените на свой токен
TOKEN = "7314963769:AAFy5PEmtjWmyr4B2sRE7EbnxXZt7PMskj0"

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text(
        "Привет! Отправь мне голосовое сообщение, и я переведу его в текст."
    )

async def handle_voice(update: Update, context: ContextTypes.DEFAULT_TYPE):
    try:
        # Получаем голосовое сообщение
        voice = update.message.voice
        voice_file = await context.bot.get_file(voice.file_id)
        
        # Создаем временные файлы для сохранения аудио
        with tempfile.NamedTemporaryFile(delete=False, suffix='.ogg') as voice_ogg:
            await voice_file.download_to_drive(voice_ogg.name)
            
            # Конвертируем ogg в wav
            audio = AudioSegment.from_ogg(voice_ogg.name)
            wav_path = voice_ogg.name[:-4] + '.wav'
            audio.export(wav_path, format='wav')
            
            # Распознаем речь
            recognizer = sr.Recognizer()
            with sr.AudioFile(wav_path) as source:
                audio_data = recognizer.record(source)
                text = recognizer.recognize_google(audio_data, language='ru-RU')
                
            await update.message.reply_text(f"Распознанный текст: {text}")
            
            # Удаляем временные файлы
            os.remove(voice_ogg.name)
            os.remove(wav_path)
            
    except Exception as e:
        await update.message.reply_text(
            "Извините, произошла ошибка при распознавании речи. Попробуйте еще раз."
        )
        logging.error(f"Error in voice handling: {str(e)}")

def main():
    # Создаем приложение
    application = Application.builder().token(TOKEN).build()
    
    # Добавляем обработчики
    application.add_handler(CommandHandler("start", start))
    application.add_handler(MessageHandler(filters.VOICE, handle_voice))
    
    # Запускаем бота
    application.run_polling(allowed_updates=Update.ALL_TYPES)

if __name__ == '__main__':
    main() 