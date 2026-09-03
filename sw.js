/* sw.js — service worker: bikin aplikasi bisa dibuka offline.
 * Strategi: navigasi = network-first (update kalau online),
 * aset statis = cache-first (instan saat offline).
 */
'use strict';

var VERSION = 'typecraft-v2';
var CORE = [
  './',
  'index.html',
  'style.css',
  'app.js',
  'engine.js',
  'words.js',
  'store.js',
  'chart.js',
  'keyboard.js',
  'icon.svg',
  'manifest.webmanifest',
  'icons/icon-192.png',
  'icons/icon-512.png'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(VERSION).then(function (cache) {
      return Promise.all(CORE.map(function (url) {
        return cache.add(url).catch(function () { /* satu file gagal tidak fatal */ });
      }));
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== VERSION; })
        .map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (event) {
  var req = event.request;
  if (req.method !== 'GET') return;

  // Navigasi: coba jaringan dulu, fallback ke cache (offline).
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).then(function (res) {
        var copy = res.clone();
        caches.open(VERSION).then(function (c) { c.put('index.html', copy); });
        return res;
      }).catch(function () {
        return caches.match('index.html');
      })
    );
    return;
  }

  // Aset statis: cache dulu, update di latar belakang.
  event.respondWith(
    caches.match(req).then(function (cached) {
      var network = fetch(req).then(function (res) {
        if (res && res.ok && res.type === 'basic') {
          var copy = res.clone();
          caches.open(VERSION).then(function (c) { c.put(req, copy); });
        }
        return res;
      }).catch(function () { return cached; });
      return cached || network;
    })
  );
});
