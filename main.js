document.addEventListener('DOMContentLoaded', async () => {
    // On sub-pages, load the master header and footer
    const path = window.location.pathname;
    if (path.endsWith('/') || path.endsWith('/index.html')) {
        return; // Do nothing on the main page
    }

    try {
        // Detectar si estamos en GitHub Pages (/Segured/) o local (/)
        const repoPrefix = window.location.pathname.includes('/Segured/') ? '/Segured' : '';
        const response = await fetch(`${repoPrefix}/index.html`);
        if (!response.ok) throw new Error('Could not fetch master template.');
        
        const text = await response.text();
        const masterDoc = new DOMParser().parseFromString(text, 'text/html');

        // Find master elements
        const masterHeader = masterDoc.querySelector('header');
        const masterFooter = masterDoc.querySelector('footer');
        const masterWhatsapp = masterDoc.querySelector('.whatsapp-fab');

        // Find placeholders in the current page
        const headerPlaceholder = document.querySelector('header');
        const footerPlaceholder = document.querySelector('footer');

        // Replace content
        if (masterHeader && headerPlaceholder) {
            headerPlaceholder.replaceWith(masterHeader);
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

        // 2. Initialize PWA install button logic (copied from app.js for sub-pages)
        let deferredPrompt;
        const installBtn = document.getElementById('installBtn');
        if (installBtn) {
            window.addEventListener('beforeinstallprompt', (e) => {
                e.preventDefault();
                deferredPrompt = e;
                installBtn.style.display = 'block';
            });
            installBtn.addEventListener('click', async () => {
                if (deferredPrompt) {
                    deferredPrompt.prompt();
                    await deferredPrompt.userChoice;
                    deferredPrompt = null;
                    installBtn.style.display = 'none';
                }
            });
        }

    } catch (error) {
        console.error('Failed to load page template:', error);
    }
});