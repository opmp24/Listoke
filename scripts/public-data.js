// Public listing for documents and gallery. Uses Firebase if configured.
(async function(){
  function el(id){return document.getElementById(id)}
  const docsEl = document.getElementById('documents-list');
  const galleryEl = document.getElementById('gallery-grid');
  const latestVideoEl = document.getElementById('latest-video');

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
    const url = `https://www.googleapis.com/drive/v3/files?q=${q}&key=${apiKey}&pageSize=${maxResults}&fields=files(id,name,mimeType,webViewLink,thumbnailLink,owners)&supportsAllDrives=true&includeItemsFromAllDrives=true`;
    const resp = await fetch(url);
    const json = await resp.json();
    if (!resp.ok) {
      const errorMessage = json.error?.message || JSON.stringify(json);
      throw new Error(`Error de la API de Drive (${resp.status}): ${errorMessage}`);
    }
    return json;
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
      if (galleryEl && galleryFolderId) {
        const galJson = await listDriveFolder(galleryFolderId, window.DRIVE_CONFIG.apiKey);

        if (galJson && Array.isArray(galJson.files) && galJson.files.length > 0) {
          const viewer = el('gallery-viewer');
          const placeholder = el('gallery-placeholder');
          
          galleryEl.innerHTML = ''; // Limpia el "Cargando..."

          galJson.files.forEach((file, index) => {
            if (!file.mimeType?.startsWith('image')) return; // Solo procesa imágenes

            const thumbUrl = file.thumbnailLink ? file.thumbnailLink.replace(/=s\d+/, '=s400') : driveFileUrl(file.id);
            
            const card = document.createElement('div');
            card.className = 'card gallery-thumb'; // Añadimos una clase para estilos y selección
            card.innerHTML = `<img src="${thumbUrl}" alt="${file.name}" class="card-img-top">`;
            
            card.onclick = (e) => {
              e.preventDefault();
              document.querySelectorAll('.gallery-thumb').forEach(item => item.classList.remove('active'));
              card.classList.add('active');

              if (placeholder) placeholder.classList.add('d-none');
              if (viewer) {
                viewer.src = driveFileUrl(file.id); // Carga la imagen en alta resolución en el visor
                viewer.classList.remove('d-none');
              }
            };
            galleryEl.appendChild(card);

            // Muestra la primera imagen por defecto
            if (index === 0) {
              card.click();
            }
          });
        } else {
          displayMessage(galleryEl, 'No se encontraron imágenes en la carpeta de galería.');
        }
      } else if (galleryEl) {
        displayMessage(galleryEl, 'La carpeta de galería no está configurada en <code>drive-config.js</code>.');
      }
    }catch(e){
      console.error('Error listing Drive gallery', e);
      displayMessage(galleryEl, `Error cargando galería desde Drive: ${e.message}. Revisa la consola para más detalles.`, true);
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
        } else displayMessage(docsEl, 'No hay documentos públicos en el repo.');
      } else {
        displayMessage(docsEl, 'No se pudo listar documentos desde GitHub.');
      }
    }catch(e){ displayMessage(docsEl, `Error cargando documentos: ${e.message}`, true); }

    try{
      const galUrl = `https://api.github.com/repos/${window.GITHUB_CONFIG.owner}/${window.GITHUB_CONFIG.repo}/contents/${window.GITHUB_CONFIG.galleryPath}`;
      const galResp = await fetch(galUrl);
      if (galResp.ok){
        const galJson = await galResp.json();
        galleryEl.innerHTML = ''; // Limpiar
        if (Array.isArray(galJson) && galJson.length>0){
          galJson.forEach(f => {
            const card = document.createElement('div');
            card.className = 'card';
            const img = document.createElement('img');
            img.src = `https://raw.githubusercontent.com/${window.GITHUB_CONFIG.owner}/${window.GITHUB_CONFIG.repo}/${window.GITHUB_CONFIG.branch}/${f.path}`;
            img.alt = f.name;
            card.appendChild(img);
            galleryEl.appendChild(card);
          });
        } else displayMessage(galleryEl, 'No hay imágenes en la galería.');
      } else displayMessage(galleryEl, 'No se pudo listar galería desde GitHub.');
    }catch(e){ displayMessage(galleryEl, `Error cargando galería: ${e.message}`, true); }

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
    displayMessage(galleryEl, 'Integración Firebase no configurada.');
    displayMessage(latestVideoEl, 'Configurar video en settings/latest.json o en Drive.');
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
    if (snap.empty){ displayMessage(galleryEl, 'No hay imágenes en la galería.'); } else {
      const items = [];
      snap.forEach(d=>{const data=d.data();items.push(`<div class="card"><img src="${data.url}" alt="${data.name}"></div>`)});
      galleryEl.innerHTML = items.join('');
    }
  }catch(e){ displayMessage(galleryEl, `Error cargando galería: ${e.message}`, true); }

  // Latest video: placeholder — site owner can write a settings/latest.json with {"latestVideoId":"..."}
  try{
    const setDoc = await db.collection('settings').doc('main').get();
    if (setDoc.exists && setDoc.data().latestVideoId){
      const id = setDoc.data().latestVideoId;
      latestVideoEl.innerHTML = `<iframe width="560" height="315" src="https://www.youtube.com/embed/${id}" frameborder="0" allowfullscreen></iframe>`;
    } else { displayMessage(latestVideoEl, 'No hay video configurado.'); }
  }catch(e){ displayMessage(latestVideoEl, `Error cargando video: ${e.message}`, true); }

})();
