document.addEventListener('DOMContentLoaded', async () => {
    // On sub-pages, load the master header and footer
    const path = window.location.pathname;
    if (path.endsWith('/') || path.endsWith('/index.html')) {
        return; // Do nothing on the main page
    }

    try {
        const response = await fetch('../index.html');
        if (!response.ok) throw new Error('Could not fetch master template.');
        
        const text = await response.text();
        const masterDoc = new DOMParser().parseFromString(text, 'text/html');

        // Find master elements
        const masterNav = masterDoc.querySelector('nav');
        const masterFooter = masterDoc.querySelector('footer');
        const masterWhatsapp = masterDoc.querySelector('.whatsapp-fab');

        // Find placeholders in the current page
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
            document.body.appendChild(masterWhatsapp.cloneNode(true));
        }

        // --- Post-load initializations ---

        // 1. Set the active navigation link
        const navLinks = document.querySelectorAll('.main-nav .nav-link');
        let homeLink;
        navLinks.forEach(link => {
            const linkPath = new URL(link.href).pathname;
            if (linkPath === '/Segured/' || linkPath === '/Segured/index.html') {
                homeLink = link;
            }
            if (linkPath === path) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });
        // The master template has 'Home' as active, so if we are on another page, deactivate it.
        if (homeLink && ! (path === '/Segured/' || path === '/Segured/index.html')) {
            homeLink.classList.remove('active');
        }

        // 6. Reactivar funcionalidades globales (Iconos y PWA)
        if (window.loadCustomInstallIcon) window.loadCustomInstallIcon();
        if (window.checkInstallButton) window.checkInstallButton();

    } catch (error) {
        console.error('Failed to load page template:', error);
    }
});