// Удаляем весь код из script.js, так как он больше не нужен 

document.addEventListener('DOMContentLoaded', () => {
    // Кастомный курсор
    const cursor = document.getElementById('custom-cursor');
    const cursorDot = document.getElementById('custom-cursor-dot');
    
    document.addEventListener('mousemove', (e) => {
        cursor.style.left = e.clientX + 'px';
        cursor.style.top = e.clientY + 'px';
        cursorDot.style.left = e.clientX + 'px';
        cursorDot.style.top = e.clientY + 'px';
    });

    document.addEventListener('mousedown', () => {
        cursor.style.transform = 'translate(-50%, -50%) scale(0.8)';
        cursorDot.style.transform = 'translate(-50%, -50%) scale(0.5)';
    });

    document.addEventListener('mouseup', () => {
        cursor.style.transform = 'translate(-50%, -50%) scale(1)';
        cursorDot.style.transform = 'translate(-50%, -50%) scale(1)';
    });

    // Прелоадер
    const preloader = document.querySelector('.preloader');
    
    const hidePreloader = () => {
        preloader.classList.add('fade-out');
        setTimeout(() => {
            preloader.style.display = 'none';
        }, 500);
    };

    if (document.readyState === 'complete') {
        hidePreloader();
    } else {
        window.addEventListener('load', hidePreloader);
        setTimeout(hidePreloader, 5000);
    }

    // Анимированный счетчик для статистики
    const animateValue = (element, start, end, duration) => {
        const range = end - start;
        const increment = range / (duration / 16);
        let current = start;
        
        const updateCounter = () => {
            current += increment;
            if ((increment > 0 && current >= end) || (increment < 0 && current <= end)) {
                element.textContent = end.toString() + '+';
                return;
            }
            element.textContent = Math.floor(current).toString() + '+';
            requestAnimationFrame(updateCounter);
        };
        
        updateCounter();
    };

    const startCounterAnimation = (entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const statNumbers = document.querySelectorAll('.stat-number');
                statNumbers.forEach(stat => {
                    const endValue = parseInt(stat.textContent);
                    animateValue(stat, 0, endValue, 2000);
                });
                observer.unobserve(entry.target);
            }
        });
    };

    const statsObserver = new IntersectionObserver(startCounterAnimation, {
        threshold: 0.5
    });
    
    const stats = document.querySelector('.stats');
    if (stats) {
        statsObserver.observe(stats);
    }

    // Кнопка наверх
    const scrollTopBtn = document.getElementById('scroll-top');
    
    const handleScroll = () => {
        const scrollProgress = document.querySelector('.scroll-progress');
        const scrolled = (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100;
        scrollProgress.style.width = `${scrolled}%`;

        if (window.scrollY > 500) {
            scrollTopBtn.classList.add('visible');
        } else {
            scrollTopBtn.classList.remove('visible');
        }
    };

    window.addEventListener('scroll', handleScroll);

    scrollTopBtn.addEventListener('click', () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });

    // Переключатель темы
    const themeToggle = document.getElementById('theme-toggle');
    const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)');
    
    const setTheme = (theme) => {
        document.body.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
        themeToggle.textContent = theme === 'dark' ? '🌓' : '🌞';
    };

    const toggleTheme = () => {
        const currentTheme = document.body.getAttribute('data-theme') || 'dark';
        setTheme(currentTheme === 'dark' ? 'light' : 'dark');
    };

    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
        setTheme(savedTheme);
    } else {
        setTheme(prefersDarkScheme.matches ? 'dark' : 'light');
    }

    themeToggle.addEventListener('click', toggleTheme);
    prefersDarkScheme.addEventListener('change', (e) => {
        setTheme(e.matches ? 'dark' : 'light');
    });

    // Форма обратной связи
    const contactForm = document.getElementById('contact-form');
    if (contactForm) {
        contactForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const formData = new FormData(contactForm);
            
            // Здесь будет отправка данных на сервер
            showNotification('Сообщение отправлено! Мы свяжемся с вами в ближайшее время.');
            contactForm.reset();
        });
    }

    // Оптимизированный параллакс эффект
    let parallaxTimeout;
    document.addEventListener('mousemove', (e) => {
        if (!parallaxTimeout) {
            parallaxTimeout = setTimeout(() => {
                const parallaxItems = document.querySelectorAll('.parallax-item');
                parallaxItems.forEach(item => {
                    const speed = 0.05;
                    const x = (window.innerWidth - e.pageX * speed) / 100;
                    const y = (window.innerHeight - e.pageY * speed) / 100;
                    item.style.transform = `translateX(${x}px) translateY(${y}px)`;
                });
                parallaxTimeout = null;
            }, 16);
        }
    });

    // Оптимизированный эффект искажения
    const distortionContainer = document.querySelector('.distortion-container');
    let circles = [];
    const MAX_CIRCLES = 2; // Уменьшаем количество кругов

    let distortionTimeout;
    document.addEventListener('mousemove', (e) => {
        if (!distortionTimeout) {
            distortionTimeout = setTimeout(() => {
                if (circles.length < MAX_CIRCLES) {
                    const circle = document.createElement('div');
                    circle.className = 'distortion-circle';
                    circles.push(circle);
                    distortionContainer.appendChild(circle);
                }

                circles.forEach((circle, index) => {
                    const delay = index * 100;
                    setTimeout(() => {
                        circle.style.left = e.clientX + 'px';
                        circle.style.top = e.clientY + 'px';
                    }, delay);
                });
                distortionTimeout = null;
            }, 16);
        }
    });

    // Фильтры галереи
    const filterButtons = document.querySelectorAll('.filter-btn');
    const galleryContainer = document.querySelector('.gallery-container');
    
    filterButtons.forEach(button => {
        button.addEventListener('click', () => {
            const filter = button.dataset.filter;
            filterButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            filterGallery(filter);
        });
    });

    function filterGallery(filter) {
        const items = galleryContainer.children;
        Array.from(items).forEach(item => {
            if (filter === 'all' || item.dataset.category === filter) {
                item.style.display = 'block';
            } else {
                item.style.display = 'none';
            }
        });
    }

    // Поиск
    const searchInput = document.getElementById('search-input');
    let searchTimeout;

    searchInput.addEventListener('input', () => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            const query = searchInput.value.toLowerCase();
            searchArtworks(query);
        }, 300);
    });

    function searchArtworks(query) {
        const items = galleryContainer.children;
        Array.from(items).forEach(item => {
            const title = item.querySelector('h3').textContent.toLowerCase();
            const artist = item.querySelector('p').textContent.toLowerCase();
            if (title.includes(query) || artist.includes(query)) {
                item.style.display = 'block';
            } else {
                item.style.display = 'none';
            }
        });
    }

    // Модальное окно
    const modal = document.getElementById('artwork-modal');
    const closeModal = document.querySelector('.close-modal');
    
    function openModal(artwork) {
        modal.style.display = 'block';
        const modalImage = modal.querySelector('.artwork-image img');
        const modalTitle = modal.querySelector('.artwork-info h2');
        const modalArtist = modal.querySelector('.artwork-info .artist');
        
        modalImage.src = artwork.image;
        modalTitle.textContent = artwork.title;
        modalArtist.textContent = artwork.artist;
        
        // Увеличиваем счетчик просмотров
        const views = modal.querySelector('.views');
        views.textContent = `👁️ ${parseInt(artwork.views) + 1}`;
    }

    closeModal.addEventListener('click', () => {
        modal.style.display = 'none';
    });

    // Закрытие модального окна по клику вне него
    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });

    // Система лайков
    document.querySelectorAll('.like-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const likes = btn.querySelector('.likes-count');
            const count = parseInt(likes.textContent);
            likes.textContent = count + 1;
            btn.classList.add('liked');
            showNotification('Работа добавлена в избранное!');
        });
    });

    // Чат сообщества
    const chat = document.getElementById('community-chat');
    const chatTrigger = chat.querySelector('.chat-trigger');
    const toggleChat = chat.querySelector('.toggle-chat');
    const chatForm = chat.querySelector('.chat-form');
    const chatMessages = chat.querySelector('.chat-messages');

    chatTrigger.addEventListener('click', () => {
        chat.classList.toggle('open');
    });

    toggleChat.addEventListener('click', () => {
        chat.classList.remove('open');
    });

    // Закрытие чата по клику вне его
    document.addEventListener('click', (e) => {
        if (!chat.contains(e.target)) {
            chat.classList.remove('open');
        }
    });

    chatForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const input = chatForm.querySelector('input');
        const message = input.value.trim();
        
        if (message) {
            addChatMessage('Вы', message);
            input.value = '';
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }
    });

    function addChatMessage(user, message) {
        const messageElement = document.createElement('div');
        messageElement.className = 'chat-message';
        messageElement.innerHTML = `
            <span class="chat-user">${user}:</span>
            <span class="chat-text">${message}</span>
        `;
        chatMessages.appendChild(messageElement);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    // Ленивая загрузка изображений
    const lazyImages = document.querySelectorAll('img[data-src]');
    const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.dataset.src;
                img.removeAttribute('data-src');
                observer.unobserve(img);
            }
        });
    });

    lazyImages.forEach(img => imageObserver.observe(img));

    // Анимированные переходы между страницами
    document.querySelectorAll('a[data-transition]').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const href = link.getAttribute('href');
            
            document.body.classList.add('page-transition');
            setTimeout(() => {
                window.location.href = href;
            }, 500);
        });
    });

    // Система достижений
    function checkAchievements() {
        const achievements = document.querySelectorAll('.achievement-card');
        achievements.forEach(achievement => {
            const progress = achievement.querySelector('.progress');
            const currentWidth = parseInt(progress.style.width);
            
            if (currentWidth >= 100 && !achievement.classList.contains('unlocked')) {
                achievement.classList.add('unlocked');
                showNotification('Новое достижение разблокировано!');
            }
        });
    }

    // Шаринг в социальные сети
    document.querySelectorAll('.share-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const platform = btn.dataset.platform;
            const url = encodeURIComponent(window.location.href);
            const title = encodeURIComponent(document.title);
            
            let shareUrl;
            switch (platform) {
                case 'twitter':
                    shareUrl = `https://twitter.com/intent/tweet?url=${url}&text=${title}`;
                    break;
                case 'facebook':
                    shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${url}`;
                    break;
                case 'pinterest':
                    shareUrl = `https://pinterest.com/pin/create/button/?url=${url}&description=${title}`;
                    break;
            }
            
            window.open(shareUrl, '_blank', 'width=600,height=400');
        });
    });

    // Загрузка дополнительных работ
    const loadMoreBtn = document.querySelector('.load-more');
    let page = 1;

    loadMoreBtn.addEventListener('click', () => {
        page++;
        loadMoreArtworks(page);
    });

    function loadMoreArtworks(page) {
        // Здесь будет загрузка дополнительных работ с сервера
        showNotification('Загрузка...');
        
        // Имитация загрузки
        setTimeout(() => {
            // Добавление новых работ в галерею
            showNotification('Новые работы загружены!');
        }, 1000);
    }

    // Инициализация карты
    function initMap() {
        // Здесь будет инициализация карты с помощью выбранной библиотеки
        const mapContainer = document.getElementById('map');
        if (mapContainer) {
            // Инициализация карты
        }
    }

    // Вызов функций при загрузке
    checkAchievements();
    initMap();
});

// Функция для показа уведомлений
function showNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => notification.classList.add('show'), 100);
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Обработчики для кнопок
document.querySelectorAll('.cta-button').forEach(button => {
    button.addEventListener('click', () => {
        showNotification(button.textContent + ' - Скоро будет доступно!');
    });
}); 

// Добавляем эффект искажения
const distortionContainer = document.createElement('div');
distortionContainer.className = 'distortion-container';
document.body.appendChild(distortionContainer);

const createDistortionCircle = () => {
    const circle = document.createElement('div');
    circle.className = 'distortion-circle';
    return circle;
};

let circles = [];
const MAX_CIRCLES = 3;

document.addEventListener('mousemove', (e) => {
    if (circles.length < MAX_CIRCLES) {
        const circle = createDistortionCircle();
        circles.push(circle);
        distortionContainer.appendChild(circle);
    }

    circles.forEach((circle, index) => {
        const delay = index * 100;
        setTimeout(() => {
            circle.style.left = e.clientX + 'px';
            circle.style.top = e.clientY + 'px';
        }, delay);
    });
}); 

// Добавляем эффект живого текста
document.querySelectorAll('.living-text span').forEach((char, index) => {
    char.style.setProperty('--char-index', index);
    
    document.addEventListener('mousemove', (e) => {
        const rect = char.getBoundingClientRect();
        const charX = rect.left + rect.width / 2;
        const charY = rect.top + rect.height / 2;
        
        const deltaX = e.clientX - charX;
        const deltaY = e.clientY - charY;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        
        const maxDistance = 400;
        const scale = Math.max(0, 1 - distance / maxDistance);
        
        char.style.transform = `scale(${1 + scale * 0.5}) rotate(${deltaX * 0.05}deg)`;
    });
}); 

// Добавляем магнитный эффект для кнопок
document.querySelectorAll('.magnetic-button').forEach(button => {
    button.addEventListener('mousemove', (e) => {
        const rect = button.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        
        const deltaX = x - centerX;
        const deltaY = y - centerY;
        
        const angle = Math.atan2(deltaY, deltaX);
        const distance = Math.min(Math.sqrt(deltaX * deltaX + deltaY * deltaY), 100);
        
        const moveX = Math.cos(angle) * distance * 0.2;
        const moveY = Math.sin(angle) * distance * 0.2;
        
        button.style.transform = `translate(${moveX}px, ${moveY}px)`;
    });
    
    button.addEventListener('mouseleave', () => {
        button.style.transform = '';
    });
}); 