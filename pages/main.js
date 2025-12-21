document.addEventListener('DOMContentLoaded', async () => {
    // Si estamos en la página de inicio (index.html o raíz), no hacemos nada
    // porque ya tiene el header y footer originales.
    const path = window.location.pathname;
    if (!path.includes('/pages/')) {
        return;
    }

    try {
        // 1. Obtenemos el contenido de index.html (la "Master Page")
        // Usamos '../index.html' porque estamos dentro de la carpeta 'pages/'
        const response = await fetch('../index.html');
        if (!response.ok) throw new Error('No se pudo cargar la página maestra.');
        
        const text = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(text, 'text/html');

        // 2. Extraemos e inyectamos el Header (Nav)
        const masterNav = doc.querySelector('nav');
        const targetNav = document.querySelector('nav');
        if (masterNav && targetNav) {
            targetNav.replaceWith(masterNav);
        }

        // 3. Extraemos e inyectamos el Footer
        const masterFooter = doc.querySelector('footer');
        const targetFooter = document.querySelector('footer');
        if (masterFooter && targetFooter) {
            targetFooter.replaceWith(masterFooter);
        }

        // 4. Extraemos e inyectamos el botón de WhatsApp si no existe
        const masterWa = doc.querySelector('.whatsapp-fab');
        if (masterWa && !document.querySelector('.whatsapp-fab')) {
            document.body.appendChild(masterWa);
        }

        // 5. Actualizamos el enlace activo del menú
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            // Comparamos la URL completa para asegurar coincidencia
            if (link.href === window.location.href) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });

        // 6. Reactivar funcionalidades globales (Iconos y PWA)
        if (window.loadCustomInstallIcon) window.loadCustomInstallIcon();
        if (window.checkInstallButton) window.checkInstallButton();

    } catch (error) {
        console.error('Error cargando elementos de la página maestra:', error);
    }
});