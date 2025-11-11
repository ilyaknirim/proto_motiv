
const CACHE_NAME = 'motiv-cache-v2';
const ASSETS = [
  './icon_sunrise.png', './maskable_icon.png', './favicon.ico',
  './',
  './index.html',
  './styles_optimized.css',
  './app_optimized.js',
  './audio_manifest.json',
  './melody_generator/integration.js',
  './melody_generator/melody_generator_new.js',
  './melody_generator/patterns.js',
  './melody_generator/player.js',
  './melody_generator/scales.js'
];
// cache audio files lazily; do not pre-cache all mp3 to avoid large SW
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});
self.addEventListener('activate', (e) => {
  e.waitUntil(self.clients.claim());
});
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  // serve cached first for app shell
  if (ASSETS.includes(url.pathname) || ASSETS.includes(url.pathname.replace(/^\//,''))) {
    e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
    return;
  }
  // for audio files, try network then cache
  if (url.pathname.startsWith('/audio') || url.pathname.includes('/audio/')) {
    e.respondWith(fetch(e.request).then(resp => {
      const copy = resp.clone();
      caches.open(CACHE_NAME).then(c => c.put(e.request, copy));
      return resp;
    }).catch(()=> caches.match(e.request)));
    return;
  }
  // default fallback
  e.respondWith(fetch(e.request).catch(()=> caches.match(e.request)));
});
