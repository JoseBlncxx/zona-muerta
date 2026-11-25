// Service worker de Zona Muerta: guarda el juego para que funcione sin Internet.
// Si cambias el juego, sube el número de versión para que los celulares descarguen lo nuevo.
const CACHE = 'zona-muerta-v5';
const FILES = ['./', 'index.html', 'core.js', 'mapas.js', 'datos.js', 'audio.js', 'game.js', 'ui.js', 'manifest.json', 'icon-192.png', 'icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  // Primero intenta Internet (para recibir actualizaciones); si no hay, usa la copia guardada.
  e.respondWith(
    fetch(e.request).then(res => {
      const copy = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); return res;
    }).catch(() => caches.match(e.request, { ignoreSearch: true }))
  );
});
