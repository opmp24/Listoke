// Admin UI: sign-in, upload gallery images, upload documents, manage approvals
(function(){
  function el(id){return document.getElementById(id)}
  const loginBtn = el('login-google');
  const logoutBtn = el('logout');
  const authStatus = el('auth-status');
  const galleryFile = el('gallery-file');
  const uploadGallery = el('upload-gallery');
  const galleryStatus = el('gallery-upload-status');
  const docFile = el('doc-file');
  const docPublic = el('doc-public');
  const uploadDoc = el('upload-doc');
  const docStatus = el('doc-upload-status');
  const approvedList = el('approved-list');

  if (!window.firebase) {
    authStatus.innerText = 'Firebase no configurado. Copie firebase-config.example.js a firebase-config.js y ponga sus credenciales.';
    return;
  }

  firebase.initializeApp && firebase.initializeApp(firebaseConfig);
  const auth = firebase.auth();
  const storage = firebase.storage();
  const db = firebase.firestore();

  function renderUser(user){
    if (user){
      authStatus.innerText = `Conectado como ${user.email}`;
      loginBtn.style.display = 'none';
      logoutBtn.style.display = 'inline-block';
    } else {
      authStatus.innerText = 'No autenticado';
      loginBtn.style.display = 'inline-block';
      logoutBtn.style.display = 'none';
    }
  }

  auth.onAuthStateChanged(u => renderUser(u));

  loginBtn.addEventListener('click', ()=>{
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider).catch(err=>alert(err.message));
  });
  logoutBtn.addEventListener('click', ()=>auth.signOut());

  uploadGallery.addEventListener('click', async ()=>{
    const file = galleryFile.files[0];
    if (!file) return galleryStatus.innerText = 'Seleccione una imagen.';
    galleryStatus.innerText = 'Subiendo...';
    try{
      const ref = storage.ref().child(`gallery/${Date.now()}_${file.name}`);
      const snap = await ref.put(file);
      const url = await ref.getDownloadURL();
      await db.collection('gallery').add({url, name: file.name, created: firebase.firestore.FieldValue.serverTimestamp()});
      galleryStatus.innerText = 'Imagen subida.';
    }catch(e){galleryStatus.innerText = 'Error: '+e.message}
  });

  uploadDoc.addEventListener('click', async ()=>{
    const file = docFile.files[0];
    if (!file) return docStatus.innerText = 'Seleccione un archivo.';
    docStatus.innerText = 'Subiendo...';
    try{
      const ref = storage.ref().child(`documents/${Date.now()}_${file.name}`);
      const snap = await ref.put(file);
      const url = await ref.getDownloadURL();
      const meta = {url, name:file.name, public: !!docPublic.checked, created: firebase.firestore.FieldValue.serverTimestamp()};
      const docRef = await db.collection('documents').add(meta);
      docStatus.innerText = 'Documento subido.';
    }catch(e){docStatus.innerText = 'Error: '+e.message}
  });

  // List approved users
  async function loadApproved(){
    approvedList.innerText = 'Cargando...';
    try{
      const snap = await db.collection('approvedUsers').get();
      if (snap.empty){approvedList.innerText = 'No hay usuarios aprobados.';return}
      const items = [];
      snap.forEach(d=>items.push(`<div>${d.id} — ${d.data().email || ''}</div>`));
      approvedList.innerHTML = items.join('');
    }catch(e){approvedList.innerText = 'Error: '+e.message}
  }
  loadApproved();
})();
