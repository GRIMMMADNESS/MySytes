// Инициализация Three.js
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({
    canvas: document.querySelector('#bg-animation'),
    alpha: true,
    antialias: true
});

renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
camera.position.setZ(30);

// Создаем звездное поле
const starGeometry = new THREE.BufferGeometry();
const starMaterial = new THREE.PointsMaterial({
    size: 0.7,
    transparent: true,
    opacity: 1,
    color: 0xffffff,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true
});

const starVertices = [];
const starColors = [];
const starSizes = [];

// Создаем больше звезд
for (let i = 0; i < 15000; i++) {
    const x = (Math.random() - 0.5) * 2000;
    const y = (Math.random() - 0.5) * 2000;
    const z = -Math.random() * 2000;
    
    starVertices.push(x, y, z);
    
    // Добавляем разные цвета для звезд
    const hue = Math.random();
    const color = new THREE.Color();
    if (Math.random() > 0.5) {
        color.setHSL(hue, 0.5, 0.8); // Обычные звезды
    } else {
        color.setHSL(0.5, 0.8, 0.8); // Голубоватые звезды
    }
    
    starColors.push(color.r, color.g, color.b);
    starSizes.push(Math.random() * 2 + 0.5);
}

starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starVertices, 3));
starGeometry.setAttribute('color', new THREE.Float32BufferAttribute(starColors, 3));
starGeometry.setAttribute('size', new THREE.Float32BufferAttribute(starSizes, 1));

const stars = new THREE.Points(starGeometry, starMaterial);
scene.add(stars);

// Добавляем туманность
const nebulaMaterial = new THREE.ShaderMaterial({
    uniforms: {
        time: { value: 0 },
        resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) }
    },
    vertexShader: `
        varying vec2 vUv;
        varying vec3 vPosition;
        void main() {
            vUv = uv;
            vPosition = position;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
    fragmentShader: `
        uniform float time;
        uniform vec2 resolution;
        varying vec2 vUv;
        varying vec3 vPosition;
        
        float rand(vec2 n) { 
            return fract(sin(dot(n, vec2(12.9898, 4.1414))) * 43758.5453);
        }
        
        float noise(vec2 p) {
            vec2 ip = floor(p);
            vec2 u = fract(p);
            u = u * u * (3.0 - 2.0 * u);
            
            float res = mix(
                mix(rand(ip), rand(ip + vec2(1.0, 0.0)), u.x),
                mix(rand(ip + vec2(0.0, 1.0)), rand(ip + vec2(1.0, 1.0)), u.x), u.y);
            return res * res;
        }
        
        float fbm(vec2 p) {
            float sum = 0.0;
            float amp = 1.0;
            float freq = 1.0;
            for(int i = 0; i < 6; i++) {
                sum += noise(p * freq) * amp;
                amp *= 0.5;
                freq *= 2.0;
                p += vec2(3.123, 2.456) * time * 0.1;
            }
            return sum;
        }
        
        void main() {
            vec2 p = (gl_FragCoord.xy * 2.0 - resolution.xy) / min(resolution.x, resolution.y);
            p *= 2.0;
            
            float t = time * 0.2;
            vec2 q = vec2(fbm(p + t), fbm(p + vec2(1.0)));
            vec2 r = vec2(fbm(p + 4.0 * q + vec2(1.7, 9.2) + t), 
                         fbm(p + 4.0 * q + vec2(8.3, 2.8) + t));
                         
            float f = fbm(p + 4.0 * r);
            
            vec3 color = mix(
                vec3(0.0, 0.3, 0.5),    // Темно-синий
                vec3(0.0, 0.8, 1.0),    // Голубой
                f * f
            );
            
            color = mix(
                color,
                vec3(0.0, 0.5, 1.0),    // Средний синий
                dot(q, q)
            );
            
            color = mix(
                color,
                vec3(0.0, 0.2, 0.4),    // Глубокий синий
                dot(r, r)
            );
            
            // Добавляем свечение
            float glow = max(0.0, 1.0 - length(p));
            color += vec3(0.1, 0.4, 0.8) * glow * 0.5;
            
            // Добавляем прозрачность по краям
            float alpha = smoothstep(1.0, 0.0, length(p) * 0.5);
            
            gl_FragColor = vec4(color, alpha * 0.5);
        }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false
});

// Создаем большую плоскость для туманности
const nebulaPlane = new THREE.PlaneGeometry(200, 200);
const nebula = new THREE.Mesh(nebulaPlane, nebulaMaterial);
nebula.position.z = -100;
nebula.rotation.z = Math.PI * 0.2; // Немного поворачиваем для более интересного эффекта
scene.add(nebula);

// Добавляем интерактивность с мышью
let mouseX = 0;
let mouseY = 0;
let targetX = 0;
let targetY = 0;

document.addEventListener('mousemove', (event) => {
    mouseX = (event.clientX - window.innerWidth / 2) * 0.001;
    mouseY = (event.clientY - window.innerHeight / 2) * 0.001;
});

// Функция анимации
function animate() {
    requestAnimationFrame(animate);

    // Плавное движение камеры
    targetX = mouseX * 0.3;
    targetY = mouseY * 0.3;
    camera.rotation.y += (targetX - camera.rotation.y) * 0.05;
    camera.rotation.x += (targetY - camera.rotation.x) * 0.05;

    // Анимация звезд
    const positions = starGeometry.attributes.position.array;
    const sizes = starGeometry.attributes.size.array;

    for (let i = 0; i < positions.length; i += 3) {
        // Движение звезд к камере
        positions[i + 2] += 0.1;

        // Если звезда слишком близко, перемещаем ее в начало
        if (positions[i + 2] > 0) {
            positions[i + 2] = -1000;
        }

        // Пульсация размера звезд
        const idx = i / 3;
        sizes[idx] = Math.sin(Date.now() * 0.001 + idx) * 0.5 + 1;
    }

    starGeometry.attributes.position.needsUpdate = true;
    starGeometry.attributes.size.needsUpdate = true;

    // Обновляем время для шейдера туманности
    nebulaMaterial.uniforms.time.value += 0.0005;

    renderer.render(scene, camera);
}

animate();

// Обработка изменения размера окна
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    nebulaMaterial.uniforms.resolution.value.set(window.innerWidth, window.innerHeight);
});

// Переключение темы
const themeSwitch = document.getElementById('theme-switch');
themeSwitch.addEventListener('change', () => {
    document.body.setAttribute('data-theme', themeSwitch.checked ? 'light' : 'dark');
});

// Анимация прогресс-баров навыков
const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const progressBars = entry.target.querySelectorAll('.skill-progress');
            progressBars.forEach(bar => {
                const progress = bar.getAttribute('data-progress');
                bar.style.width = `${progress}%`;
            });
        }
    });
}, { threshold: 0.5 });

const skillsContainer = document.querySelector('.skills-container');
if (skillsContainer) {
    observer.observe(skillsContainer);
}

// Плавная прокрутка
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth'
            });
        }
    });
});

// Параллакс эффект
document.addEventListener('mousemove', (e) => {
    const mouseX = e.clientX / window.innerWidth - 0.5;
    const mouseY = e.clientY / window.innerHeight - 0.5;
    
    gsap.to('.content-wrapper', {
        duration: 0.5,
        x: mouseX * 50,
        y: mouseY * 50,
        ease: 'power2.out'
    });
});

// Анимация появления проектов
const projectCards = document.querySelectorAll('.project-card');
projectCards.forEach((card, index) => {
    gsap.from(card, {
        duration: 0.6,
        opacity: 0,
        y: 50,
        delay: index * 0.2,
        scrollTrigger: {
            trigger: card,
            start: 'top bottom-=100',
            toggleActions: 'play none none reverse'
        }
    });
});

// Обработка отправки формы
const contactForm = document.querySelector('.contact-form');
if (contactForm) {
    contactForm.addEventListener('submit', (e) => {
        e.preventDefault();
        // Здесь можно добавить логику отправки формы
        alert('Сообщение отправлено!');
        contactForm.reset();
    });
}

// Добавляем кастомный курсор
const cursor = document.createElement('div');
cursor.classList.add('custom-cursor');
document.body.appendChild(cursor);

document.addEventListener('mousemove', (e) => {
    cursor.style.left = e.clientX + 'px';
    cursor.style.top = e.clientY + 'px';
});

document.addEventListener('mousedown', () => cursor.classList.add('active'));
document.addEventListener('mouseup', () => cursor.classList.remove('active'));

// Заменяем старый код печатающегося текста на:
const subtitle = document.querySelector('.subtitle');
if (subtitle) {
    subtitle.textContent = 'Бондаренко Максим';
}

// Добавляем анимацию для проектов при наведении
projectCards.forEach(card => {
    card.addEventListener('mouseenter', () => {
        gsap.to(card.querySelector('.project-image'), {
            duration: 0.5,
            scale: 1.1,
            ease: 'power2.out'
        });
    });
    
    card.addEventListener('mouseleave', () => {
        gsap.to(card.querySelector('.project-image'), {
            duration: 0.5,
            scale: 1,
            ease: 'power2.out'
        });
    });
});

// Добавляем анимацию для технологий
const techItems = document.querySelectorAll('.tech-item');
techItems.forEach((item, index) => {
    gsap.from(item, {
        opacity: 0,
        y: 50,
        duration: 0.6,
        delay: index * 0.1,
        scrollTrigger: {
            trigger: item,
            start: 'top bottom-=100',
            toggleActions: 'play none none reverse'
        }
    });
    
    // Добавляем эффект свечения при наведении
    item.addEventListener('mouseenter', () => {
        gsap.to(item, {
            backgroundColor: 'var(--secondary-color)',
            color: 'var(--background-color)',
            boxShadow: '0 0 20px var(--secondary-color)',
            duration: 0.3
        });
    });
    
    item.addEventListener('mouseleave', () => {
        gsap.to(item, {
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            color: 'var(--text-color)',
            boxShadow: 'none',
            duration: 0.3
        });
    });
}); 