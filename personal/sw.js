const CACHE = 'stronger-cache-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/styles.css',
  '/app.js',
  'https://cdn.jsdelivr.net/npm/chart.js'
];

self.addEventListener('install', ev => {
  ev.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)));
});
self.addEventListener('fetch', ev => {
  ev.respondWith(caches.match(ev.request).then(resp => resp || fetch(ev.request)));
});
