// Public listing for documents and gallery. Uses Firebase if configured.
(async function(){
  function el(id){return document.getElementById(id)}
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

  function openInModal(content) {
    if (!galleryModal || !modalContentWrapper) return;
    
    modalContentWrapper.innerHTML = ''; // Limpia el contenido anterior
    modalContentWrapper.innerHTML = content;

    galleryModal.show();
  }

  // Si la configuración de Drive está presente, lista los archivos desde las carpetas de Drive.
  if (window.DRIVE_CONFIG){
    try{
      const apiKey = window.DRIVE_CONFIG.apiKey;
      if (!apiKey) throw new Error("La clave de API de Google no está en drive-config.js");
      const docsJson = await listDriveFolder(window.DRIVE_CONFIG.documentsFolderId, apiKey);
      if (docsEl) {
        if (docsJson && Array.isArray(docsJson.files) && docsJson.files.length){
          const viewer = el('doc-viewer');
          const placeholder = el('viewer-placeholder');
          
          const ul = document.createElement('ul');
          ul.className = 'list-group';

          docsJson.files.forEach((file, index) => {
            const li = document.createElement('li');
            li.className = 'list-group-item list-group-item-action';
            
            const link = document.createElement('a');
            link.href = '#'; // Evita que la página recargue
            link.textContent = file.name;
            link.setAttribute('data-file-id', file.id);
            
            link.onclick = (e) => {
              e.preventDefault();
              document.querySelectorAll('.list-group-item').forEach(item => item.classList.remove('active'));
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
          const viewer = el('doc-viewer');
          const placeholder = el('viewer-placeholder');
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
            // Usamos el componente card de Bootstrap
            const item = document.createElement('div');
            item.className = 'card h-100 border-0 rounded-0';
            item.innerHTML = `<img src="${thumbUrl}" class="card-img-top rounded-0" alt="${file.name}" style="aspect-ratio: 1/1; object-fit: cover; cursor: pointer;">`;

            if (isImage) {
              item.onclick = (e) => {
                e.preventDefault();
                const highResUrl = driveFileUrl(file.id);
                openInModal(`<img src="${highResUrl}" alt="${file.name}">`);
              };
              col.appendChild(item);
              if (imageGridEl) imageGridEl.appendChild(col);
            } else if (isVideo) {
              item.onclick = (e) => {
                e.preventDefault();
                const videoEmbed = `<div class="ratio ratio-16x9"><iframe src="${driveFileUrl(file.id)}" title="${file.name}" class="rounded-0" frameborder="0" allow="autoplay; fullscreen" allowfullscreen></iframe></div>`;
                openInModal(videoEmbed);
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
      const specificVideoId = window.DRIVE_CONFIG.latestVideoId;
      if (videoGridEl && specificVideoId) {
        // No limpiamos el grid aquí para poder añadir videos de Drive y de YouTube
        
        const col = document.createElement('div');
        col.className = 'col';
        const item = document.createElement('div');
        item.className = 'card h-100 border-0 rounded-0';
        item.innerHTML = `<img src="https://img.youtube.com/vi/${specificVideoId}/mqdefault.jpg" class="card-img-top rounded-0" alt="Video de YouTube" style="aspect-ratio: 1/1; object-fit: cover; cursor: pointer;">`;

        item.onclick = (e) => {
          e.preventDefault();
          const videoEmbed = `<div class="ratio ratio-16x9"><iframe src="https://www.youtube-nocookie.com/embed/${specificVideoId}?autoplay=1" title="Video de YouTube" class="rounded-0" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>`;
          openInModal(videoEmbed);
        };
        col.appendChild(item);
        // Añadimos el video de YouTube al principio de la lista de videos
        videoGridEl.prepend(col);
      }
    } catch (e) {
      console.error('Error al cargar videos de YouTube:', e);
    }

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
        if (Array.isArray(docsJson) && docsJson.length>0){
          const items = docsJson.map(f=>`<div><a href="https://raw.githubusercontent.com/${window.GITHUB_CONFIG.owner}/${window.GITHUB_CONFIG.repo}/${window.GITHUB_CONFIG.branch}/${f.path}" target="_blank">${f.name}</a></div>`);
          docsEl.innerHTML = items.join('');
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
        imageGridEl.innerHTML = ''; // Limpiar
        if (Array.isArray(galJson) && galJson.length>0){
          galJson.forEach(f => {
            const col = document.createElement('div');
            col.className = 'col';
            const item = document.createElement('div');
            item.className = 'card h-100 border-0 rounded-0';
            item.innerHTML = `<img src="https://raw.githubusercontent.com/${window.GITHUB_CONFIG.owner}/${window.GITHUB_CONFIG.repo}/${window.GITHUB_CONFIG.branch}/${f.path}" class="card-img-top rounded-0" alt="${f.name}" style="aspect-ratio: 1/1; object-fit: cover; cursor: pointer;">`;
            
            item.onclick = (e) => {
              e.preventDefault();
              openInModal(`<img src="${item.querySelector('img').src}" class="img-fluid" alt="${f.name}">`);
            };
            col.appendChild(item);
            imageGridEl.appendChild(col);
          });
        } else displayMessage(imageGridEl, 'No hay imágenes en la galería.');
      } else displayMessage(imageGridEl, 'No se pudo listar la galería desde GitHub.');
    }catch(e){ displayMessage(imageGridEl, `Error cargando galería: ${e.message}`, true); }

    // Latest video from settings in repo (simple file settings/latest.json with {"latestVideoId":"..."})
    try{
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
      snap.forEach(d=>{const data=d.data();items.push(`<div><a href="${data.url}" target="_blank">${data.name}</a></div>`)});
      docsEl.innerHTML = items.join('');
    }
  }catch(e){ displayMessage(docsEl, `Error cargando documentos: ${e.message}`, true); }
  
  // Load gallery
  try{
    const snap = await db.collection('gallery').orderBy('created','desc').limit(24).get();
    if (snap.empty){ displayMessage(imageGridEl, 'No hay imágenes en la galería.'); } else {
      imageGridEl.innerHTML = ''; // Limpiar
      snap.forEach(d => {
        const data = d.data();
        const col = document.createElement('div');
        col.className = 'col';
        const item = document.createElement('div');
        item.className = 'card h-100 border-0 rounded-0';
        item.innerHTML = `<img src="${data.url}" class="card-img-top rounded-0" alt="${data.name}" style="aspect-ratio: 1/1; object-fit: cover; cursor: pointer;">`;
        item.onclick = () => openInModal(`<img src="${data.url}" class="img-fluid" alt="${data.name}">`);
        col.appendChild(item);
        imageGridEl.appendChild(col);
      });
    }
  }catch(e){ displayMessage(imageGridEl, `Error cargando galería: ${e.message}`, true); }

  // Latest video: placeholder — site owner can write a settings/latest.json with {"latestVideoId":"..."}
  try{
    const setDoc = await db.collection('settings').doc('main').get();
    if (setDoc.exists && setDoc.data().latestVideoId){
      const id = setDoc.data().latestVideoId;
      latestVideoEl.innerHTML = `<iframe width="560" height="315" src="https://www.youtube.com/embed/${id}" frameborder="0" allowfullscreen></iframe>`;
    } else { displayMessage(latestVideoEl, 'No hay video configurado.'); }
  }catch(e){ displayMessage(latestVideoEl, `Error cargando video: ${e.message}`, true); }

})();
