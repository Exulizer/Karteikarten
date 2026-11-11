/* KarteiDeck Service Worker: legt die App beim ersten Besuch im Cache, danach läuft sie offline. */
var CACHE = 'karteideck-v3';
var FILES = ['./', './karteikarten.html', './einstellungen.js', './karteikarten.js', './manifest.webmanifest', './icon.svg', './icon-192.png', './icon-512.png', './apple-touch-icon.png'];
self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) {
    return Promise.all(FILES.map(function (f) { return c.add(f).catch(function () {}); }));   // fehlende optionale Dateien stören nicht
  }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;
  if (new URL(e.request.url).pathname.indexOf('/api/') >= 0) return;   // Konto-Schnittstelle nie zwischenspeichern
  e.respondWith(caches.match(e.request).then(function (hit) {
    var net = fetch(e.request).then(function (r) {   // im Hintergrund aktualisieren
      if (r && r.ok) { var cp = r.clone(); caches.open(CACHE).then(function (c) { c.put(e.request, cp); }); }
      return r;
    }).catch(function () { return hit; });
    return hit || net;
  }));
});
