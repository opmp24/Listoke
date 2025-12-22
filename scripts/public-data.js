// Public listing for documents and gallery. Uses Firebase if configured.
(async function(){
  const docsEl = document.getElementById('documents-list');
  const imageGridEl = document.getElementById('gallery-grid');
  const videoGridEl = document.getElementById('videos-grid');

  // Función auxiliar para mostrar mensajes en los elementos
  function displayMessage(element, message, isError = false) {
    if (element) element.innerHTML = `<div class="${isError ? 'text-danger' : 'text-muted'} small">${message}</div>`;
  }

  // Función para construir la URL de visualización directa de archivos de Drive
  function driveFileUrl(id) {
    return `https://drive.google.com/uc?export=view&id=${id}`;
  }

  // Función para listar archivos de una carpeta de Google Drive usando la API
  async function listDriveFolder(folderId, apiKey, maxResults = 100) {
    const q = encodeURIComponent(`'${folderId}' in parents and trashed = false`);
    const url = `https://www.googleapis.com/drive/v3/files?q=${q}&orderBy=createdTime desc&key=${apiKey}&pageSize=${maxResults}&fields=files(id,name,mimeType,webViewLink,thumbnailLink,owners)&supportsAllDrives=true&includeItemsFromAllDrives=true`;
    const resp = await fetch(url);
    const json = await resp.json();
    if (!resp.ok) {
      const errorMessage = json.error?.message || JSON.stringify(json);
      throw new Error(`Error de la API de Drive (${resp.status}): ${errorMessage}`);
    }
    return json;
  }
  
  // --- Lógica para el Mapa de Google ---
  async function loadMapFromDrive(apiKey, folderId) {
    const mapEl = document.getElementById('map');
    if (!mapEl) return; // No hacer nada si no hay elemento de mapa en la página

    try {
      // 1. Listar archivos en la carpeta de mapas para encontrar 'sucursales.txt'
      const filesJson = await listDriveFolder(folderId, apiKey);
      const mapFile = filesJson.files.find(f => f.name.toLowerCase() === 'sucursales.txt');

      if (!mapFile) {
        throw new Error("No se encontró el archivo 'sucursales.txt' en la carpeta de Drive.");
      }

      // 2. Obtener el contenido del archivo
      const fileUrl = `https://www.googleapis.com/drive/v3/files/${mapFile.id}?alt=media&key=${apiKey}`;
      const resp = await fetch(fileUrl);
      if (!resp.ok) throw new Error(`No se pudo descargar el archivo de dirección (${resp.status})`);
      const address = await resp.text();

      // 3. Geocodificar la dirección y mostrar el mapa
      // Esta función se expone globalmente para que el callback de la API de Maps la pueda llamar
      window.initMap = function() {
        const geocoder = new google.maps.Geocoder();
        geocoder.geocode({ 'address': address.trim() }, function(results, status) {
          if (status == 'OK') {
            const map = new google.maps.Map(mapEl, {
              zoom: 16,
              center: results[0].geometry.location
            });
            new google.maps.Marker({ map: map, position: results[0].geometry.location });
          } else {
            displayMessage(mapEl, `Geocode no tuvo éxito por la siguiente razón: ${status}`, true);
          }
        });
      };

      // Cargar dinámicamente el script de Maps ahora que tenemos la dirección y el callback listo
      if (!document.querySelector('script[src*="maps.googleapis.com"]')) {
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=initMap`;
        script.async = true;
        script.defer = true;
        document.body.appendChild(script);
      }
    } catch (e) { displayMessage(mapEl, `Error al cargar el mapa: ${e.message}`, true); }
  }

  // --- Lógica para el Modal (Lightbox) ---
  const modalEl = document.getElementById('gallery-modal');
  const modalContentWrapper = document.getElementById('modal-content-wrapper');
  let galleryModal; // Variable para la instancia del modal de Bootstrap

  if (modalEl) {
    galleryModal = new bootstrap.Modal(modalEl);
    // Limpiar el contenido del modal cuando se cierra para detener videos, etc.
    modalEl.addEventListener('hidden.bs.modal', () => {
      modalContentWrapper.innerHTML = '';
    });
  }

  function openInModal(type, src, alt) {
    if (!galleryModal || !modalContentWrapper) return;
    
    modalContentWrapper.innerHTML = '';

    if (type === 'image') {
      const img = document.createElement('img');
      img.src = src;
      img.alt = alt;
      img.className = 'img-fluid';
      modalContentWrapper.appendChild(img);
    } else if (type === 'video') {
      const videoContainer = document.createElement('div');
      videoContainer.className = 'ratio ratio-16x9';
      videoContainer.innerHTML = `<iframe src="${src}" title="${alt}" frameborder="0" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe>`;
      modalContentWrapper.appendChild(videoContainer);
    } else {
      console.error('Tipo de contenido no soportado para el modal:', type);
      return;
    }
    galleryModal.show();
  }

  // Si la configuración de Drive está presente, lista los archivos desde las carpetas de Drive.
  if (window.DRIVE_CONFIG){
    try{
      const apiKey = window.DRIVE_CONFIG.apiKey;
      if (!apiKey) throw new Error("La clave de API de Google no está en drive-config.js");
      if (docsEl) {
        const docsJson = await listDriveFolder(window.DRIVE_CONFIG.documentsFolderId, apiKey);
        if (docsJson && Array.isArray(docsJson.files) && docsJson.files.length){
          const viewer = el('doc-viewer');
          const placeholder = el('viewer-placeholder');
          
          const ul = document.createElement('ul');
          ul.className = 'list-group';

          docsJson.files.forEach((file, index) => {
            const li = document.createElement('li');
            li.className = 'list-group-item';
            
            const link = document.createElement('a');
            link.href = '#'; // Evita que la página recargue
            link.textContent = file.name;
            link.setAttribute('data-file-id', file.id);
            
            link.onclick = (e) => {
              e.preventDefault();
              document.querySelectorAll('#documents-list .list-group-item').forEach(item => item.classList.remove('active'));
              li.classList.add('active');

              const embedUrl = `https://drive.google.com/file/d/${file.id}/preview`;
              if (placeholder) placeholder.classList.add('d-none');
              if (viewer) {
                viewer.src = embedUrl;
                viewer.classList.remove('d-none');
              }
            };
            li.appendChild(link);
            ul.appendChild(li);

            // Muestra el primer documento por defecto
            if (index === 0) {
              link.click();
            }
          });
          docsEl.innerHTML = ''; // Limpia el "Cargando..."
          docsEl.appendChild(ul);
        } else {
          const viewer = document.getElementById('doc-viewer');
          const placeholder = document.getElementById('viewer-placeholder');
          if (viewer) viewer.classList.add('d-none');
          if (placeholder) placeholder.classList.remove('d-none');
          displayMessage(docsEl, 'No hay documentos públicos en Drive (ver consola para diagnóstico).');
        }
      }
    }catch(e){
      console.error('Error listing Drive documents', e);
      displayMessage(docsEl, `Error cargando documentos desde Drive: ${e.message}. Revisa la consola para más detalles.`, true);
    }

    // Carga la galería de imágenes desde Google Drive
    try{
      const galleryFolderId = window.DRIVE_CONFIG.galleryFolderId;
      if (imageGridEl && galleryFolderId) {
        const galJson = await listDriveFolder(galleryFolderId, window.DRIVE_CONFIG.apiKey);

        if (galJson && Array.isArray(galJson.files)) {
          if (imageGridEl) imageGridEl.innerHTML = ''; // Limpia el "Cargando..."
          if (videoGridEl) videoGridEl.innerHTML = '';

          galJson.files.forEach(file => {
            const isImage = file.mimeType?.startsWith('image');
            const isVideo = file.mimeType?.startsWith('video');

            if (!isImage && !isVideo) return; // Ignora otros tipos de archivo

            const thumbUrl = file.thumbnailLink ? file.thumbnailLink.replace(/=s\d+/, '=s400') : driveFileUrl(file.id);
            
            // Creamos la columna de Bootstrap
            const col = document.createElement('div');
            col.className = 'col';
            const item = document.createElement('a');
            item.href = '#';
            item.innerHTML = `<img src="${thumbUrl}" class="gallery-item-img" alt="${file.name}">`;

            if (isImage) {
              item.onclick = (e) => {
                e.preventDefault();
                // Usamos el thumbnailLink en alta resolución para evitar problemas de permisos/CORS con driveFileUrl
                const highResUrl = file.thumbnailLink ? file.thumbnailLink.replace(/=s\d+/, '=s2048') : driveFileUrl(file.id);
                openInModal('image', highResUrl, file.name);
              };
              col.appendChild(item);
              if (imageGridEl) imageGridEl.appendChild(col);
            } else if (isVideo) {
              item.onclick = (e) => {
                e.preventDefault();
                openInModal('video', driveFileUrl(file.id), file.name);
              };
              col.appendChild(item);
              if (videoGridEl) videoGridEl.appendChild(col);
            }
          });
          if (imageGridEl && imageGridEl.innerHTML === '') displayMessage(imageGridEl, 'No se encontraron imágenes.');
          if (videoGridEl && videoGridEl.innerHTML === '') displayMessage(videoGridEl, 'No se encontraron videos.');
        }
      } else if (imageGridEl) {
        displayMessage(imageGridEl, 'La carpeta de galería no está configurada en <code>drive-config.js</code>.');
      }
    }catch(e){
      console.error('Error listing Drive gallery', e);
      displayMessage(imageGridEl, `Error cargando galería desde Drive: ${e.message}. Revisa la consola para más detalles.`, true);
    }

    // Carga el video de YouTube y lo añade a la pestaña de videos
    try {
      const { apiKey, youtubeChannelId, latestVideoId } = window.DRIVE_CONFIG;
      
      if (videoGridEl && apiKey) {
        const ytFragment = document.createDocumentFragment();
        let hasYtVideos = false;

        // 1. Intentar cargar lista de videos del canal (Uploads Playlist)
        if (youtubeChannelId) {
          try {
            // Convertir ID de canal (UC...) a ID de playlist de subidas (UU...)
            const uploadsId = youtubeChannelId.replace(/^UC/, 'UU');
            const ytUrl = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${uploadsId}&maxResults=12&key=${apiKey}`;
            
            const resp = await fetch(ytUrl);
            if (resp.ok) {
              const data = await resp.json();
              if (data.items && data.items.length > 0) {
                hasYtVideos = true;
                data.items.forEach(item => {
                  const vid = item.snippet.resourceId.videoId;
                  const title = item.snippet.title;
                  const thumb = item.snippet.thumbnails.medium?.url || item.snippet.thumbnails.default?.url;
                  
                  const col = document.createElement('div');
                  col.className = 'col';
                  const link = document.createElement('a');
                  link.href = '#';
                  link.innerHTML = `<img src="${thumb}" class="gallery-item-img" alt="${title}">`;
                  link.onclick = (e) => {
                    e.preventDefault();
                    openInModal('video', `https://www.youtube-nocookie.com/embed/${vid}?autoplay=1`, title);
                  };
                  col.appendChild(link);
                  ytFragment.appendChild(col);
                });
              }
            }
          } catch (err) {
            console.error('Error API YouTube:', err);
          }
        }

        // 2. Fallback a video único si no se cargó lista
        if (!hasYtVideos && latestVideoId) {
           const col = document.createElement('div');
           col.className = 'col';
           const link = document.createElement('a');
           link.href = '#';
           link.innerHTML = `<img src="https://img.youtube.com/vi/${latestVideoId}/mqdefault.jpg" class="gallery-item-img" alt="Video Destacado">`;
           link.onclick = (e) => {
             e.preventDefault();
             openInModal('video', `https://www.youtube-nocookie.com/embed/${latestVideoId}?autoplay=1`, 'Video Destacado');
           };
           col.appendChild(link);
           ytFragment.appendChild(col);
        }

        // Insertar al principio del grid
        if (ytFragment.children.length > 0) {
          videoGridEl.prepend(ytFragment);
        }
      }
    } catch (e) {
      console.error('Error al cargar videos de YouTube:', e);
    }

    // Carga el mapa si está configurado
    if (window.DRIVE_CONFIG.mapsFolderId) await loadMapFromDrive(apiKey, window.DRIVE_CONFIG.mapsFolderId);

    return;
  }

  // Si la configuración de GitHub está presente, intenta cargar desde el repositorio.
  if (window.GITHUB_CONFIG){
    try{
      // Documents: list contents of documentsPath
      const docsUrl = `https://api.github.com/repos/${window.GITHUB_CONFIG.owner}/${window.GITHUB_CONFIG.repo}/contents/${window.GITHUB_CONFIG.documentsPath}`;
      const docsResp = await fetch(docsUrl);
      if (docsResp.ok){
        const docsJson = await docsResp.json();
        docsEl.innerHTML = ''; // Limpiar "Cargando..."
        if (Array.isArray(docsJson) && docsJson.length>0){
          const items = docsJson.map(f=>`<div><a href="https://raw.githubusercontent.com/${window.GITHUB_CONFIG.owner}/${window.GITHUB_CONFIG.repo}/${window.GITHUB_CONFIG.branch}/${f.path}" target="_blank">${f.name}</a></div>`);
          docsEl.innerHTML = items.join(''); // Nota: Esto no usa el visor de documentos como la versión de Drive.
        } else displayMessage(docsEl, 'No hay documentos públicos en el repositorio.');
      } else {
        displayMessage(docsEl, 'No se pudo listar documentos desde GitHub.');
      }
    }catch(e){ displayMessage(docsEl, `Error cargando documentos: ${e.message}`, true); }

    try{
      const galUrl = `https://api.github.com/repos/${window.GITHUB_CONFIG.owner}/${window.GITHUB_CONFIG.repo}/contents/${window.GITHUB_CONFIG.galleryPath}`;
      const galResp = await fetch(galUrl);
      if (galResp.ok){
        const galJson = await galResp.json();
        if (imageGridEl) imageGridEl.innerHTML = ''; // Limpiar
        if (Array.isArray(galJson) && galJson.length>0){
          galJson.forEach(f => {
            const col = document.createElement('div');
            col.className = 'col';
            const item = document.createElement('a');
            item.href = '#';
            item.innerHTML = `<img src="https://raw.githubusercontent.com/${window.GITHUB_CONFIG.owner}/${window.GITHUB_CONFIG.repo}/${window.GITHUB_CONFIG.branch}/${f.path}" class="gallery-item-img" alt="${f.name}">`;
            
            item.onclick = (e) => {
              e.preventDefault();
              openInModal('image', item.querySelector('img').src, f.name);
            };
            col.appendChild(item);
            imageGridEl.appendChild(col);
          });
        } else displayMessage(imageGridEl, 'No hay imágenes en la galería.');
      } else displayMessage(imageGridEl, 'No se pudo listar la galería desde GitHub.');
    }catch(e){ displayMessage(imageGridEl, `Error cargando galería: ${e.message}`, true); }

    // Latest video from settings in repo (simple file settings/latest.json with {"latestVideoId":"..."})
    try{
      const latestVideoEl = document.getElementById('latest-video'); // Asumiendo que existe este elemento
      const setUrl = `https://raw.githubusercontent.com/${window.GITHUB_CONFIG.owner}/${window.GITHUB_CONFIG.repo}/${window.GITHUB_CONFIG.branch}/settings/latest.json`;
      const setResp = await fetch(setUrl);
      if (setResp.ok){
        const setJson = await setResp.json();
        if (setJson.latestVideoId){
          latestVideoEl.innerHTML = `<iframe width="560" height="315" src="https://www.youtube.com/embed/${setJson.latestVideoId}" frameborder="0" allowfullscreen></iframe>`;
        } else displayMessage(latestVideoEl, 'No hay video configurado.');
      } else displayMessage(latestVideoEl, 'No hay video configurado.');
    }catch(e){ displayMessage(latestVideoEl, `Error cargando video: ${e.message}`, true); }

    return;
  }

  if (!window.firebase) {
    displayMessage(docsEl, 'Integración Firebase no configurada. Los documentos privados no estarán disponibles.');
    displayMessage(imageGridEl, 'Integración Firebase no configurada.');
    displayMessage(videoGridEl, 'Configurar video en settings/latest.json o en Drive.');
    return;
  }

  if (window.firebaseConfig) firebase.initializeApp(firebaseConfig);
  const db = firebase.firestore();
  const auth = firebase.auth();

  // Load public documents
  try {
    const snap = await db.collection('documents').where('public','==',true).orderBy('created','desc').get();
    if (snap.empty){ displayMessage(docsEl, 'No hay documentos públicos.'); } else {
      const items = [];
      snap.forEach(d=>{const data=d.data();items.push(`<div><a href="${data.url}" target="_blank">${data.name}</a></div>`)}); // Nota: Esto no usa el visor de documentos como la versión de Drive.
      docsEl.innerHTML = items.join('');
    }
  }catch(e){ displayMessage(docsEl, `Error cargando documentos: ${e.message}`, true); }
  
  // Load gallery
  try{
    const snap = await db.collection('gallery').orderBy('created','desc').limit(24).get();
    if (snap.empty){ displayMessage(imageGridEl, 'No hay imágenes en la galería.'); } else {
      if (imageGridEl) imageGridEl.innerHTML = ''; // Limpiar
      snap.forEach(d => {
        const data = d.data();
        const col = document.createElement('div');
        col.className = 'col';
        const item = document.createElement('a');
        item.href = '#';
        item.innerHTML = `<img src="${data.url}" class="gallery-item-img" alt="${data.name}">`;
        item.onclick = (e) => { e.preventDefault(); openInModal('image', data.url, data.name); };
        col.appendChild(item);
        imageGridEl.appendChild(col);
      });
    }
  }catch(e){ displayMessage(imageGridEl, `Error cargando galería: ${e.message}`, true); }

  // Latest video: placeholder — site owner can write a settings/latest.json with {"latestVideoId":"..."}
  try{
    const latestVideoEl = document.getElementById('latest-video'); // Asumiendo que existe este elemento
    const setDoc = await db.collection('settings').doc('main').get();
    if (setDoc.exists && setDoc.data().latestVideoId){
      const id = setDoc.data().latestVideoId;
      latestVideoEl.innerHTML = `<iframe width="560" height="315" src="https://www.youtube.com/embed/${id}" frameborder="0" allowfullscreen></iframe>`;
    } else { displayMessage(latestVideoEl, 'No hay video configurado.'); }
  }catch(e){ displayMessage(latestVideoEl, `Error cargando video: ${e.message}`, true); }

})();

// Función auxiliar eliminada del IIFE para poder ser reutilizada si es necesario, o mantenida dentro.
// Por simplicidad en el diff, se elimina aquí.
function el(id){return document.getElementById(id)}
