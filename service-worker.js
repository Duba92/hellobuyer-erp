const CACHE_NAME = 'hellobuyer-v1';
const urlsToCache = [
  './',
  './index.html',
  './products.html',
  './pos.html',
  './reports.html',
  './css/style.css',
  './js/app.js',
  './js/products.js',
  './js/pos.js',
  './js/reports.js',
  './js/offline.js',
  './manifest.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      );
    })
  );
});
