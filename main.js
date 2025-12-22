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
            nav.replaceWith(masterNav);
        }

        // Inyectamos el Footer
        const masterFooter = doc.querySelector('footer');
        if (masterFooter && footer) {
            footer.replaceWith(masterFooter);
        }

        // Inyectamos el botón de WhatsApp
        const masterWa = doc.querySelector('.whatsapp-fab');
        if (masterWa && !document.querySelector('.whatsapp-fab')) {
            document.body.appendChild(masterWa);
        }

        // Marcamos el link activo en el menú
        const currentHref = window.location.href;
        document.querySelectorAll('.navbar-nav .nav-link').forEach(link => {
            link.classList.toggle('active', link.href === currentHref);
        });

        // Reactivamos funcionalidades globales que se pierden al reemplazar el nav
        if (window.loadCustomInstallIcon) window.loadCustomInstallIcon();
        if (window.checkInstallButton) window.checkInstallButton();

    } catch (error) {
        console.error('Error cargando la página maestra:', error);
    }
});