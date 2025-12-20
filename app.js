document.addEventListener('DOMContentLoaded', () => {
  
  // --- Lógica de Instalación de la PWA ---
  let deferredPrompt;
  const installBtn = document.getElementById('installBtn');

  window.addEventListener('beforeinstallprompt', (e) => {
    // Previene que el mini-infobar aparezca en móviles
    e.preventDefault();
    // Guarda el evento para que pueda ser disparado más tarde
    deferredPrompt = e;
    // Muestra el botón de instalación
    if (installBtn) {
      installBtn.style.display = 'block';
      // Una vez que el botón es visible, intentamos cargar el icono personalizado
      loadCustomInstallIcon();
    }
  });

  if (installBtn) {
    installBtn.addEventListener('click', async () => {
      if (deferredPrompt) {
        // Oculta nuestro botón de instalación
        installBtn.style.display = 'none';
        // Muestra el prompt de instalación del navegador
        deferredPrompt.prompt();
        // Espera a que el usuario responda
        await deferredPrompt.userChoice;
        // El prompt ya no se puede usar, lo descartamos
        deferredPrompt = null;
      }
    });
  }

  // --- Carga del Icono de Instalación desde Google Drive ---
  async function loadCustomInstallIcon() {
    // Salimos si no hay botón, configuración, o carpeta de iconos definida
    if (!installBtn || !window.DRIVE_CONFIG || !window.DRIVE_CONFIG.apiKey || !window.DRIVE_CONFIG.iconsFolderId) {
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
        
        const originalSvg = installBtn.querySelector('svg');
        if (originalSvg) {
          const newIcon = document.createElement('img');
          newIcon.src = iconUrl;
          newIcon.height = 16;
          newIcon.classList.add('me-1');
          originalSvg.replaceWith(newIcon);
        }
      }
    } catch (error) {
      console.error('Error al cargar el icono de instalación personalizado:', error);
    }
  }
});