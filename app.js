let deferredPrompt;
const installBtn = document.getElementById('installBtn');

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  installBtn.style.display = 'inline-block';
});

installBtn?.addEventListener('click', async () => {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  const choice = await deferredPrompt.userChoice;
  deferredPrompt = null;
  installBtn.style.display = 'none';
});

// Register service worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // compute service worker path so registration works from pages/* paths and root
    // For GitHub pages, the path needs to be relative to the repo root.
    navigator.serviceWorker.register('/Segured/sw.js').then(reg => {
      console.log('SW registered', reg);
      // check for updates on load
      if (reg && reg.update) reg.update();
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed') {
            if (navigator.serviceWorker.controller) {
              // New content is available, reload to update app
              console.log('New SW installed; reloading to update');
              window.location.reload();
            }
          }
        });
      });
    }).catch((err) => console.log('SW error', err));
  });
}

// Ensure PWA reloads to latest when reopened: listen for controllerchange
navigator.serviceWorker && navigator.serviceWorker.addEventListener && navigator.serviceWorker.addEventListener('controllerchange', () => {
  console.log('controllerchange detected — reloading');
  window.location.reload();
});

// Smooth scrolling for nav
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', (e) => {
    e.preventDefault();
    const target = document.querySelector(a.getAttribute('href'));
    if (target) target.scrollIntoView({behavior:'smooth'});
  });
});
