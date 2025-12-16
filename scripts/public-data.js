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

  async function listDriveFolder(folderId){
    const baseUrl = window.DRIVE_CONFIG.proxyUrl || '';
    // Llamamos a nuestra propia función sin servidor (proxy).
    const url = `${baseUrl}/.netlify/functions/get-drive-files?folderId=${folderId}`;
    const resp = await fetch(url);
    const json = await resp.json();
    if (!resp.ok) throw new Error('Error del servidor proxy: ' + (json.error?.message || JSON.stringify(json)));
    return json;
  }

  // If Drive config present, list files from Drive folders (public files)
  if (window.DRIVE_CONFIG){
    async function fetchDriveFileContent(fileId, apiKey){
      const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&key=${apiKey}`;
      const resp = await fetch(url);
      if (!resp.ok) throw new Error('Drive file fetch error ' + resp.status);
      return resp.text();
    }

    try{
      // documents
      const docsJson = await listDriveFolder(window.DRIVE_CONFIG.documentsFolderId);
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

    try{
      // No changes needed for the gallery part, but we need to handle the case where galleryEl is null
      if (!window.DRIVE_CONFIG.galleryFolderId || !galleryEl) {
        if (galleryEl) galleryEl.innerHTML = ''; // Clear if element exists but no config
        return; // Exit if no gallery config or element
      }
      const galJson = await listDriveFolder(window.DRIVE_CONFIG.galleryFolderId);
      console.log('Drive gallery response:', galJson);
      if (galJson && Array.isArray(galJson.files) && galJson.files.length){
        const imgItems = [];
        const videoItems = [];
        galJson.files.forEach(f=>{
          if (f.mimeType && f.mimeType.startsWith('image')){
            const thumb = f.thumbnailLink ? f.thumbnailLink : driveFileUrl(f.id);
            imgItems.push(`<div class="card"><img src="${thumb}" alt="${f.name}"></div>`)
          } else if (f.mimeType && f.mimeType.startsWith('video')){
            videoItems.push(`<div class="col-md-6"><video controls class="w-100" src="${driveFileUrl(f.id)}"></video></div>`)
          } else {
            const href = f.webViewLink ? f.webViewLink : `https://drive.google.com/file/d/${f.id}/view`;
            imgItems.push(`<div class="card"><a href="${href}" target="_blank">${f.name}</a></div>`)
          }
        });
        if (galleryEl) galleryEl.innerHTML = imgItems.join('');
        const videosEl = document.getElementById('gallery-videos');
        if (videosEl) {
          videosEl.innerHTML = videoItems.join('') || '';
          // also include any configured YouTube IDs in DRIVE_CONFIG.galleryYouTubeIds
          if (window.DRIVE_CONFIG && Array.isArray(window.DRIVE_CONFIG.galleryYouTubeIds) && window.DRIVE_CONFIG.galleryYouTubeIds.length){
            const yItems = window.DRIVE_CONFIG.galleryYouTubeIds.map(id=>`<div class="col-md-6"><div class="ratio ratio-16x9"><iframe src="https://www.youtube.com/embed/${id}" title="YouTube video" allowfullscreen></iframe></div></div>`);
            videosEl.innerHTML += yItems.join('');
          }
          if (!videosEl.innerHTML) videosEl.innerHTML = '<div class="muted">No hay videos en Drive.</div>';
        }
      } else if (galleryEl) galleryEl.innerHTML = '<div>No hay imágenes en la galería (ver consola para diagnóstico).</div>';
    }catch(e){
      console.error('Error listing Drive gallery', e);
      if (galleryEl) galleryEl.innerText = 'Error cargando galería desde Drive: '+e.message + '. Revisa la consola para más detalles.';
    }

    // latest video: prefer explicit config, fallback to a text/json file in documents folder
    try{
      if (window.DRIVE_CONFIG.latestVideoId){
        if (latestVideoEl) latestVideoEl.innerHTML = `<iframe width="560" height="315" src="https://www.youtube.com/embed/${window.DRIVE_CONFIG.latestVideoId}" frameborder="0" allowfullscreen></iframe>`;
      } else {
        // try to find latestVideo.txt or latestVideo.json in documentsFolderId
        if (window.DRIVE_CONFIG.documentsFolderId){
          const list = await listDriveFolder(window.DRIVE_CONFIG.documentsFolderId, window.DRIVE_CONFIG.apiKey, 100);
          const found = list.files && list.files.find(f=>f.name && (f.name.toLowerCase()==='latestvideo.txt' || f.name.toLowerCase()==='latestvideo.json'));
          if (found){
            const txt = await fetchDriveFileContent(found.id, window.DRIVE_CONFIG.apiKey);
            try{ const parsed = JSON.parse(txt); if (parsed.latestVideoId){ latestVideoEl.innerHTML = `<iframe width="560" height="315" src="https://www.youtube.com/embed/${parsed.latestVideoId}" frameborder="0" allowfullscreen></iframe>`; return; } }catch(e){}
            const id = txt.trim();
            if (id && latestVideoEl) latestVideoEl.innerHTML = `<iframe width="560" height="315" src="https://www.youtube.com/embed/${id}" frameborder="0" allowfullscreen></iframe>`;
            else if (latestVideoEl) latestVideoEl.innerHTML = '<div class="muted">No hay video configurado.</div>';
          } else latestVideoEl.innerHTML = '<div class="muted">No hay video configurado.</div>';
        } else latestVideoEl.innerHTML = '<div class="muted">No hay video configurado.</div>';
      }
    }catch(e){latestVideoEl.innerText='Error cargando video: '+e.message}

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
