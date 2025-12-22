document.addEventListener('DOMContentLoaded', async () => {
    // On sub-pages, load the master header and footer
    const path = window.location.pathname;
    // Verificamos si estamos dentro de la carpeta 'pages'
    if (!path.includes('/pages/')) {
        return;
    }

    try {
        // Usamos ruta relativa para subir un nivel desde /pages/ a la raíz
        const response = await fetch('../index.html');
        if (!response.ok) throw new Error('Could not fetch master template.');
        
        const text = await response.text();
        const masterDoc = new DOMParser().parseFromString(text, 'text/html');

        // Find master elements (Buscamos NAV, no HEADER)
        const masterNav = masterDoc.querySelector('nav');
        const masterFooter = masterDoc.querySelector('footer');
        const masterWhatsapp = masterDoc.querySelector('.whatsapp-fab');

        // Find placeholders in the current page (Buscamos NAV)
        const navPlaceholder = document.querySelector('nav');
        const footerPlaceholder = document.querySelector('footer');

        // Replace content
        if (masterNav && navPlaceholder) {
            navPlaceholder.replaceWith(masterNav);
        }
        if (masterFooter && footerPlaceholder) {
            footerPlaceholder.replaceWith(masterFooter);
        }
        if (masterWhatsapp) {
            if (!document.querySelector('.whatsapp-fab')) {
                document.body.appendChild(masterWhatsapp.cloneNode(true));
            }
        }

        // --- Post-load initializations ---

        // 1. Set the active navigation link
        // Usamos .navbar-nav porque es la clase que tiene tu index.html
        const navLinks = document.querySelectorAll('.navbar-nav .nav-link');
        
        navLinks.forEach(link => {
            // Comparamos la URL completa para asegurar coincidencia exacta
            if (link.href === window.location.href) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });

        // 2. Reactivar funcionalidades globales (Iconos y PWA) usando las funciones de app.js
        if (window.loadCustomInstallIcon) window.loadCustomInstallIcon();
        if (window.checkInstallButton) window.checkInstallButton();

    } catch (error) {
        console.error('Failed to load page template:', error);
    }
});
