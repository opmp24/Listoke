/**
 * Gestiona la carga dinámica del layout común (nav/footer) para mantener la consistencia en todas las páginas.
 * También inicializa funcionalidades globales como animaciones de scroll y la inyección del botón de WhatsApp.
 */
/**
 * EXPLICACIÓN DE LA INTEGRACIÓN (MASTER PAGE):
 * 
 * 1. El disparador: Cada página secundaria (ej: about.html) carga este script: <script src="../js/main.js" defer></script>.
 *    Esto le dice al navegador: "Sal de la carpeta pages, entra a la carpeta js y ejecuta main.js".
 * 
 * 2. La acción (main.js): Este archivo ejecuta una petición fetch('layout.html').
 *    Le dice al navegador: "Desde la página actual (en /pages), dame el contenido de layout.html".
 * 
 * 3. La inyección: Una vez que obtiene el index.html, extrae el <nav> y el <footer> y los pega en la página actual.
 */
document.addEventListener('DOMContentLoaded', async () => {
    // Inyectar CSS del tema iOS (si es necesario para estilos específicos)
    const themeLink = document.createElement('link');
    themeLink.rel = 'stylesheet';
    themeLink.href = '/css/ios-theme.css'; // Ruta absoluta para Netlify
    document.head.appendChild(themeLink);

    const nav = document.querySelector('nav');
    const footer = document.querySelector('footer');

    // Si el nav ya tiene contenido (ej. en index.html), no hacemos nada.
    if (nav && nav.children.length > 0) {
        return;
    }

    // Advertencia si se abre como archivo local.
    if (window.location.protocol === 'file:') {
        console.warn('El menú no se puede cargar usando el protocolo file:// por seguridad. Usa un servidor local (Live Server).');
        if(nav) nav.innerHTML = '<div class="alert alert-warning m-3">El menú no se puede cargar desde un archivo local. Por favor, usa un servidor web (como Live Server en VS Code).</div>';
        return;
    }

    try {
        // Cargamos layout.html desde el directorio actual (pages/)
        const response = await fetch('layout.html');
        if (!response.ok) throw new Error(`Error ${response.status} al cargar la plantilla.`);
        
        const text = await response.text();
        const doc = new DOMParser().parseFromString(text, 'text/html');

        // Inyectamos el Nav
        const masterNav = doc.querySelector('nav');
        if (masterNav && nav) {
            // Insertar botón de tema en el Nav
            const navContainer = masterNav.querySelector('.container') || masterNav.querySelector('.container-fluid');
            if (navContainer) {
                const themeBtn = document.createElement('button');
                themeBtn.className = 'btn btn-link nav-link ms-auto me-2 p-2';
                themeBtn.innerHTML = document.documentElement.getAttribute('data-bs-theme') === 'dark' ? '<i class="bi bi-sun-fill"></i>' : '<i class="bi bi-moon-stars-fill"></i>';
                themeBtn.onclick = window.toggleTheme;
                
                // Insertar antes del botón de menú móvil (toggler) si existe, o al final
                const toggler = navContainer.querySelector('.navbar-toggler');
                navContainer.insertBefore(themeBtn, toggler);
            }
            nav.replaceWith(masterNav);
        }

        // Inyectamos el Footer
        const masterFooter = doc.querySelector('footer');
        if (masterFooter && footer) {
            footer.replaceWith(masterFooter);
        }

        // Inyectamos el botón de WhatsApp
        const masterWa = doc.querySelector('.whatsapp-fab');
        const waPlaceholder = document.getElementById('whatsapp-placeholder');
        if (masterWa) {
            if (waPlaceholder) {
                waPlaceholder.replaceWith(masterWa);
            } else if (!document.querySelector('.whatsapp-fab')) {
                document.body.appendChild(masterWa);
            }
        }

        // Marcamos el link activo en el menú
        const currentHref = window.location.href;
        document.querySelectorAll('.navbar-nav .nav-link').forEach(link => {
            link.classList.toggle('active', link.href === currentHref);
        });

        // Reactivamos funcionalidades globales que se pierden al reemplazar el nav
        if (window.loadCustomInstallIcon) window.loadCustomInstallIcon();
        if (window.checkInstallButton) window.checkInstallButton();

        // Inicializamos las animaciones de scroll
        initScrollAnimations();
        initCounterAnimations();

    } catch (error) {
        console.error('Error cargando la página maestra:', error);
    }
});

function initScrollAnimations() {
    // Verificamos si anime.js está cargado
    if (typeof anime === 'undefined') return;

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                anime({
                    targets: entry.target,
                    translateY: [50, 0], // Desde 50px abajo hacia su posición original
                    opacity: [0, 1],     // Desde invisible a visible
                    duration: 1000,      // 1 segundo de duración
                    easing: 'easeOutExpo' // Efecto de frenado suave característico de Anime.js
                });
                observer.unobserve(entry.target); // Animamos solo una vez
            }
        });
    }, { threshold: 0.1 });

    document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
}

function initCounterAnimations() {
    // Verificamos si anime.js está cargado
    if (typeof anime === 'undefined') return;

    const counters = document.querySelectorAll('.counter');
    const observer = new IntersectionObserver((entries, obs) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const el = entry.target;
                const target = parseInt(el.getAttribute('data-target'));
                anime({
                    targets: el,
                    innerHTML: [0, target],
                    easing: 'easeOutExpo',
                    round: 1, // Redondear a enteros
                    duration: 2500
                });
                obs.unobserve(el); // Dejar de observar una vez animado
            }
        });
    }, { threshold: 0.5 }); // Se activa cuando el 50% del elemento es visible
    
    counters.forEach(c => observer.observe(c));
}

// Función global para alternar tema
window.toggleTheme = () => {
    const currentTheme = document.documentElement.getAttribute('data-bs-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-bs-theme', newTheme);
    const isDark = newTheme === 'dark';
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    
    // Actualizar icono del botón si existe
    const btnIcon = document.querySelector('.bi-moon-stars-fill, .bi-sun-fill');
    if (btnIcon) {
        btnIcon.className = isDark ? 'bi bi-sun-fill' : 'bi bi-moon-stars-fill';
    }
};