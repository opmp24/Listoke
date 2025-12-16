// Public listing for documents and gallery. Uses Firebase if configured.
(async function(){
  function el(id){return document.getElementById(id)}
  const docsEl = el('documents-list');
  const galleryEl = el('gallery-grid');
  const latestVideoEl = el('latest-video');

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
