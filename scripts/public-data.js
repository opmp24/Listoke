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
    const url = `https://www.googleapis.com/drive/v3/files?q=${q}&key=${apiKey}&pageSize=${maxResults}&fields=files(id,name,mimeType)`;
    const resp = await fetch(url);
    if (!resp.ok) throw new Error('Drive API error ' + resp.status);
    return resp.json();
  }

  // If Drive config present, list files from Drive folders (public files)
  if (window.DRIVE_CONFIG){
    try{
      const apiKey = window.DRIVE_CONFIG.apiKey;
      // documents
      const docsJson = await listDriveFolder(window.DRIVE_CONFIG.documentsFolderId, apiKey, window.DRIVE_CONFIG.maxResults || 100);
      if (docsJson && Array.isArray(docsJson.files) && docsJson.files.length){
        const items = docsJson.files.map(f=>`<div><a href="https://drive.google.com/file/d/${f.id}/view" target="_blank">${f.name}</a></div>`);
        docsEl.innerHTML = items.join('');
      } else docsEl.innerHTML = '<div>No hay documentos públicos en Drive.</div>';
    }catch(e){docsEl.innerText = 'Error cargando documentos desde Drive: '+e.message}

    try{
      const apiKey = window.DRIVE_CONFIG.apiKey;
      const galJson = await listDriveFolder(window.DRIVE_CONFIG.galleryFolderId, apiKey, window.DRIVE_CONFIG.maxResults || 100);
      if (galJson && Array.isArray(galJson.files) && galJson.files.length){
        const items = galJson.files.map(f=>{
          if (f.mimeType && f.mimeType.startsWith('image')){
            return `<div class="card"><img src="${driveFileUrl(f.id)}" alt="${f.name}"></div>`
          }
          return `<div class="card"><a href="https://drive.google.com/file/d/${f.id}/view" target="_blank">${f.name}</a></div>`
        });
        galleryEl.innerHTML = items.join('');
      } else galleryEl.innerHTML = '<div>No hay imágenes en la galería.</div>';
    }catch(e){galleryEl.innerText = 'Error cargando galería desde Drive: '+e.message}

    // latest video via settings/latest.json in Drive is not implemented; admin can set video id in Firestore or settings file
    latestVideoEl.innerHTML = '<div class="muted">Configure latest video in Admin.</div>';
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
    docsEl.innerHTML = '<div class="muted">Integración Firebase no configurada. Los documentos privados no estarán disponibles.</div>';
    galleryEl.innerHTML = '<div class="muted">Integración Firebase no configurada.</div>';
    latestVideoEl.innerHTML = '<div class="muted">Configurar video en Admin.</div>';
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
  }catch(e){docsEl.innerText = 'Error cargando documentos: '+e.message}

  // Load gallery
  try{
    const snap = await db.collection('gallery').orderBy('created','desc').limit(12).get();
    if (snap.empty){galleryEl.innerHTML = '<div>No hay imágenes en la galería.</div>'} else {
      const items = [];
      snap.forEach(d=>{const data=d.data();items.push(`<div class="card"><img src="${data.url}" alt="${data.name}"></div>`)});
      galleryEl.innerHTML = items.join('');
    }
  }catch(e){galleryEl.innerText = 'Error cargando galería: '+e.message}

  // Latest video: placeholder — admin can write a document in Firestore 'settings' with key latestVideoId
  try{
    const setDoc = await db.collection('settings').doc('main').get();
    if (setDoc.exists && setDoc.data().latestVideoId){
      const id = setDoc.data().latestVideoId;
      latestVideoEl.innerHTML = `<iframe width="560" height="315" src="https://www.youtube.com/embed/${id}" frameborder="0" allowfullscreen></iframe>`;
    } else {
      latestVideoEl.innerHTML = '<div class="muted">No hay video configurado.</div>';
    }
  }catch(e){latestVideoEl.innerText='Error cargando video: '+e.message}

})();
