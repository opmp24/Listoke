document.addEventListener('DOMContentLoaded', () => {
  
  // --- Lógica de Instalación de la PWA ---
  let deferredPrompt;

  window.addEventListener('beforeinstallprompt', (e) => {
    // Previene que el mini-infobar aparezca en móviles
    e.preventDefault();
    // Guarda el evento para que pueda ser disparado más tarde
    deferredPrompt = e;
    // Intenta mostrar el botón (si ya existe en el DOM)
    window.checkInstallButton();
  });

  // Función global para verificar y mostrar el botón
  window.checkInstallButton = () => {
    const btn = document.getElementById('installBtn');
    if (btn && deferredPrompt) {
      btn.style.display = 'block';
    }
  };

  // Delegación de eventos para el click (funciona aunque el botón se reemplace)
  document.addEventListener('click', async (e) => {
    const btn = e.target.closest('#installBtn');
    if (btn && deferredPrompt) {
      // Oculta nuestro botón de instalación
      btn.style.display = 'none';
      // Muestra el prompt de instalación del navegador
      deferredPrompt.prompt();
      // Espera a que el usuario responda
      await deferredPrompt.userChoice;
      // El prompt ya no se puede usar, lo descartamos
      deferredPrompt = null;
    }
  });

  // Intentamos cargar el icono personalizado inmediatamente (para el logo y botón)
  loadCustomInstallIcon();

  // --- Carga del Icono de Instalación desde Google Drive ---
  window.loadCustomInstallIcon = async function() {
    // Salimos si no hay configuración o carpeta de iconos definida
    if (!window.DRIVE_CONFIG || !window.DRIVE_CONFIG.apiKey || !window.DRIVE_CONFIG.iconsFolderId) {
      return;
    }

    const { apiKey, iconsFolderId } = window.DRIVE_CONFIG;
    const iconName = 'install.svg'; // El nombre de tu icono en Google Drive

    try {
      const q = `name = '${iconName}' and '${iconsFolderId}' in parents and trashed = false`;
      const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id)&key=${apiKey}`;
      
      const searchResp = await fetch(searchUrl);
      const searchData = await searchResp.json();

      if (searchData.files && searchData.files.length > 0) {
        const fileId = searchData.files[0].id;
        const iconUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&key=${apiKey}`;
        
        // 1. Actualizar el icono del botón de instalación (si existe)
        const installBtn = document.getElementById('installBtn');
        if (installBtn) {
          const originalSvg = installBtn.querySelector('svg');
          if (originalSvg) {
            const newIcon = document.createElement('img');
            newIcon.src = iconUrl;
            newIcon.height = 16;
            newIcon.classList.add('me-1');
            originalSvg.replaceWith(newIcon);
          }
        }

        // 2. Actualizar el logo de la barra de navegación
        const navLogo = document.querySelector('.navbar-brand img');
        if (navLogo) {
          navLogo.src = iconUrl;
        }
      }
    } catch (error) {
      console.error('Error al cargar el icono de instalación personalizado:', error);
    }
  }
});