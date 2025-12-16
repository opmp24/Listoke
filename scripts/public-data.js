// Public listing for documents and gallery. Uses Firebase if configured.
(async function(){
  function el(id){return document.getElementById(id)}
  const docsEl = el('documents-list');
  const galleryEl = el('gallery-grid');
  const latestVideoEl = el('latest-video');

  function driveFileUrl(id){
    // direct view URL for images/files that are shared "anyone with link"
    return `https://drive.google.com/uc?export=view&id=${id}`;
  }

  async function listDriveFolder(folderId, apiKey, maxResults=100){
    const q = encodeURIComponent(`'${folderId}' in parents and trashed = false`);
    const url = `https://www.googleapis.com/drive/v3/files?q=${q}&key=${apiKey}&pageSize=${maxResults}&fields=files(id,name,mimeType,webViewLink,thumbnailLink,owners)&supportsAllDrives=true&includeItemsFromAllDrives=true`;
    const resp = await fetch(url);
    const json = await resp.json();
    if (!resp.ok) throw new Error('Drive API error ' + resp.status + ' — ' + (json.error?.message || JSON.stringify(json)));
    return json;
  }

  // If Drive config present, list files from Drive folders (public files)
  if (window.DRIVE_CONFIG){
    try{
      // documents
      const apiKey = window.DRIVE_CONFIG.apiKey;
      if (!apiKey) throw new Error("La clave de API de Google no está en drive-config.js");
      const docsJson = await listDriveFolder(window.DRIVE_CONFIG.documentsFolderId, apiKey);
      if (docsEl) {
        console.log('Drive documents response:', docsJson);
        if (docsJson && Array.isArray(docsJson.files) && docsJson.files.length){
          const viewer = el('doc-viewer');
          const placeholder = el('viewer-placeholder');
          
          const ul = document.createElement('ul');
          ul.className = 'list-group';

          docsJson.files.forEach(file => {
            const li = document.createElement('li');
            li.className = 'list-group-item list-group-item-action';
            
            const link = document.createElement('a');
            link.href = '#'; // Evitamos que la página recargue
            link.textContent = file.name;
            link.setAttribute('data-file-id', file.id);
            
            link.addEventListener('click', (e) => {
              e.preventDefault();
              document.querySelectorAll('.list-group-item').forEach(item => item.classList.remove('active'));
              li.classList.add('active');

              const embedUrl = `https://drive.google.com/file/d/${file.id}/preview`;
              if (placeholder) placeholder.classList.add('d-none');
              if (viewer) {
                viewer.src = embedUrl;
                viewer.classList.remove('d-none');
              }
            });
            li.appendChild(link);
            ul.appendChild(li);
          });
          docsEl.innerHTML = ''; // Limpiamos el "Cargando..."
          docsEl.appendChild(ul);
        } else {
          docsEl.innerHTML = '<div>No hay documentos públicos en Drive (ver consola para diagnóstico).</div>';
        }
      }
    }catch(e){
      console.error('Error listing Drive documents', e);
      if (docsEl) docsEl.innerText = 'Error cargando documentos desde Drive: '+e.message + '. Revisa la consola para más detalles.';
    }

    // Carga la galería de imágenes y videos desde Google Drive
    try{
      const galleryFolderId = window.DRIVE_CONFIG.galleryFolderId;
      if (galleryEl && galleryFolderId) {
        const galJson = await listDriveFolder(galleryFolderId, window.DRIVE_CONFIG.apiKey);
        console.log('Drive gallery response:', galJson);

        if (galJson && Array.isArray(galJson.files) && galJson.files.length > 0) {
          const imgItems = [];
          const videoItems = [];

          galJson.files.forEach(f => {
            if (f.mimeType && f.mimeType.startsWith('image')) {
              const thumb = f.thumbnailLink ? f.thumbnailLink.replace(/=s\d+/, '=s400') : driveFileUrl(f.id);
              imgItems.push(`<div class="card"><img src="${thumb}" alt="${f.name}"></div>`);
            } else if (f.mimeType && f.mimeType.startsWith('video')) {
              videoItems.push(`<div class="col-md-6"><video controls class="w-100" src="${driveFileUrl(f.id)}"></video></div>`);
            }
          });

          galleryEl.innerHTML = imgItems.length > 0 ? imgItems.join('') : '<div class="muted small">No se encontraron imágenes en la carpeta de Drive.</div>';
          const videosEl = document.getElementById('gallery-videos');
          if (videosEl) {
            videosEl.innerHTML = videoItems.length > 0 ? videoItems.join('') : '<div class="muted small">No se encontraron videos en la carpeta de Drive.</div>';
          }
        } else {
          galleryEl.innerHTML = '<div class="muted small">No se encontraron archivos en la carpeta de galería. Verifique que los archivos sean públicos.</div>';
          const videosEl = document.getElementById('gallery-videos');
          if (videosEl) videosEl.innerHTML = '';
        }
      } else if (galleryEl) {
        galleryEl.innerHTML = '<div class="muted small">La carpeta de galería no está configurada en <code>drive-config.js</code>.</div>';
        const videosEl = document.getElementById('gallery-videos');
        if (videosEl) videosEl.innerHTML = '';
      }
    }catch(e){
      console.error('Error listing Drive gallery', e);
      if (galleryEl) galleryEl.innerText = 'Error cargando galería desde Drive: '+e.message + '. Revisa la consola para más detalles.';
    }

    // Carga el último video de YouTube
    try{
      const channelId = window.DRIVE_CONFIG.youtubeChannelId;
      const apiKey = window.DRIVE_CONFIG.apiKey;
      if (latestVideoEl && channelId && channelId !== 'YOUR_YOUTUBE_CHANNEL_ID' && apiKey) {
        const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&order=date&maxResults=1&type=video&key=${apiKey}`;
        const resp = await fetch(url);
        const json = await resp.json();

        if (resp.ok && json.latestVideoId) {
          latestVideoEl.innerHTML = `<div class="ratio ratio-16x9"><iframe src="https://www.youtube.com/embed/${json.items[0].id.videoId}" title="Último video de YouTube" allowfullscreen></iframe></div>`;
        } else {
          console.error('Error al obtener el último video de YouTube:', json.error?.message || 'Respuesta no válida de la API.');
          latestVideoEl.innerHTML = '<div class="muted">No se pudo cargar el último video de YouTube.</div>';
        }
      } else if (latestVideoEl) {
        latestVideoEl.innerHTML = '<div class="muted">El ID del canal de YouTube no está configurado.</div>';
      }
    }catch(e){
      if (latestVideoEl) latestVideoEl.innerText='Error cargando video: '+e.message;
      console.error('Error cargando el último video de YouTube:', e);
    }

    return;
  }

  // If GitHub config present, try to load gallery/documents from repo via GitHub API
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
        } else docsEl.innerHTML = '<div>No hay documentos públicos en el repo.</div>';
      } else {
        docsEl.innerHTML = '<div class="muted">No se pudo listar documentos desde GitHub.</div>';
      }
    }catch(e){docsEl.innerText = 'Error cargando documentos: '+e.message}

    try{
      const galUrl = `https://api.github.com/repos/${window.GITHUB_CONFIG.owner}/${window.GITHUB_CONFIG.repo}/contents/${window.GITHUB_CONFIG.galleryPath}`;
      const galResp = await fetch(galUrl);
      if (galResp.ok){
        const galJson = await galResp.json();
        if (Array.isArray(galJson) && galJson.length>0){
          const items = galJson.map(f=>`<div class="card"><img src="https://raw.githubusercontent.com/${window.GITHUB_CONFIG.owner}/${window.GITHUB_CONFIG.repo}/${window.GITHUB_CONFIG.branch}/${f.path}" alt="${f.name}"></div>`);
          galleryEl.innerHTML = items.join('');
        } else galleryEl.innerHTML = '<div>No hay imágenes en la galería.</div>';
      } else galleryEl.innerHTML = '<div class="muted">No se pudo listar galería desde GitHub.</div>';
    }catch(e){galleryEl.innerText = 'Error cargando galería: '+e.message}

    // Latest video from settings in repo (simple file settings/latest.json with {"latestVideoId":"..."})
    try{
      const setUrl = `https://raw.githubusercontent.com/${window.GITHUB_CONFIG.owner}/${window.GITHUB_CONFIG.repo}/${window.GITHUB_CONFIG.branch}/settings/latest.json`;
      const setResp = await fetch(setUrl);
      if (setResp.ok){
        const setJson = await setResp.json();
        if (setJson.latestVideoId){
          latestVideoEl.innerHTML = `<iframe width="560" height="315" src="https://www.youtube.com/embed/${setJson.latestVideoId}" frameborder="0" allowfullscreen></iframe>`;
        } else latestVideoEl.innerHTML = '<div class="muted">No hay video configurado.</div>';
      } else latestVideoEl.innerHTML = '<div class="muted">No hay video configurado.</div>';
    }catch(e){latestVideoEl.innerText='Error cargando video: '+e.message}

    return;
  }

  if (!window.firebase) {
    if (docsEl) docsEl.innerHTML = '<div class="muted">Integración Firebase no configurada. Los documentos privados no estarán disponibles.</div>';
    if (galleryEl) galleryEl.innerHTML = '<div class="muted">Integración Firebase no configurada.</div>';
    if (latestVideoEl) latestVideoEl.innerHTML = '<div class="muted">Configurar video en settings/latest.json o en Drive.</div>';
    return;
  }

  firebase.initializeApp && firebase.initializeApp(firebaseConfig);
  const db = firebase.firestore();
  const auth = firebase.auth();

  // Load public documents
  try{
    const snap = await db.collection('documents').where('public','==',true).orderBy('created','desc').get();
    if (snap.empty){docsEl.innerHTML = '<div>No hay documentos públicos.</div>'} else {
      const items = [];
      snap.forEach(d=>{const data=d.data();items.push(`<div><a href="${data.url}" target="_blank">${data.name}</a></div>`)});
      docsEl.innerHTML = items.join('');
    }
  }catch(e){if (docsEl) docsEl.innerText = 'Error cargando documentos: '+e.message}

  // Load gallery
  try{
    const snap = await db.collection('gallery').orderBy('created','desc').limit(12).get();
    if (snap.empty){galleryEl.innerHTML = '<div>No hay imágenes en la galería.</div>'} else {
      const items = [];
      snap.forEach(d=>{const data=d.data();items.push(`<div class="card"><img src="${data.url}" alt="${data.name}"></div>`)});
      galleryEl.innerHTML = items.join('');
    }
  }catch(e){if (galleryEl) galleryEl.innerText = 'Error cargando galería: '+e.message}

  // Latest video: placeholder — site owner can write a settings/latest.json with {"latestVideoId":"..."}
  try{
    const setDoc = await db.collection('settings').doc('main').get();
    if (setDoc.exists && setDoc.data().latestVideoId){
      const id = setDoc.data().latestVideoId;
      latestVideoEl.innerHTML = `<iframe width="560" height="315" src="https://www.youtube.com/embed/${id}" frameborder="0" allowfullscreen></iframe>`;
    } else {
      latestVideoEl.innerHTML = '<div class="muted">No hay video configurado.</div>';
    }
  }catch(e){if (latestVideoEl) latestVideoEl.innerText='Error cargando video: '+e.message}

})();
