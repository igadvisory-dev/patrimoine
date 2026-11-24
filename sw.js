// Service worker : garde l'app disponible hors ligne.
// Les appels aux API de prix ne sont jamais mis en cache ici.
const CACHE = 'patrimoine-v92';
const FILES = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE && !k.endsWith('-logos')).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  // Logos des cryptos : gardés en cache pour s'afficher hors ligne.
  const isLogo = (/(^|\.)coingecko\.com$/.test(url.hostname) && !url.hostname.startsWith('api.'))
    || (url.hostname === 'www.google.com' && url.pathname.startsWith('/s2/favicons')) || /(^|\.)gstatic\.com$/.test(url.hostname);
  if (isLogo){
    e.respondWith(caches.open(CACHE + '-logos').then(c => c.match(e.request).then(hit => hit || fetch(e.request).then(r => { c.put(e.request, r.clone()); return r; }))));
    return;
  }
  if (url.origin !== self.location.origin) return;
  // Réseau d'abord (pour recevoir les mises à jour), cache si hors ligne.
  e.respondWith(
    fetch(url.href, {cache:'no-store'}).then(r => {
      const copy = r.clone();
      caches.open(CACHE).then(c => c.put(e.request, copy));
      return r;
    }).catch(() => caches.match(e.request).then(r => r || caches.match('./index.html')))
  );
});
