'use strict';

var CACHE_NAME = 'bmpi-mba-pwa-shell-v1.3.0';
var APP_SHELL = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './app-config.js',
  './manifest.webmanifest',
  './offline.html',
  './icons/bmpi-192.png',
  './icons/bmpi-512.png',
  './icons/bmpi-192-maskable.png',
  './icons/bmpi-512-maskable.png'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function (cache) { return cache.addAll(APP_SHELL); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (key) {
        return key.indexOf('bmpi-mba-pwa-shell-') === 0 && key !== CACHE_NAME;
      }).map(function (key) { return caches.delete(key); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (event) {
  var request = event.request;
  var url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;

  // Always check app-config.js online first so a newly deployed Apps Script URL
  // is not stuck behind an old cache entry. Fall back to the cached config offline.
  if (url.pathname.endsWith('/app-config.js')) {
    event.respondWith(
      fetch(request).then(function (response) {
        if (response && response.ok) {
          var configCopy = response.clone();
          caches.open(CACHE_NAME).then(function (cache) { cache.put(request, configCopy); });
        }
        return response;
      }).catch(function () { return caches.match(request); })
    );
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).then(function (response) {
        var copy = response.clone();
        caches.open(CACHE_NAME).then(function (cache) { cache.put('./index.html', copy); });
        return response;
      }).catch(function () {
        return caches.match(request).then(function (cached) {
          return cached || caches.match('./offline.html') || caches.match('./index.html');
        });
      })
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(function (cached) {
      if (cached) return cached;
      return fetch(request).then(function (response) {
        if (response && response.ok) {
          var copy = response.clone();
          caches.open(CACHE_NAME).then(function (cache) { cache.put(request, copy); });
        }
        return response;
      });
    })
  );
});
