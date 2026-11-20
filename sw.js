/* KarteiDeck Service Worker: legt die App beim ersten Besuch im Cache, danach läuft sie offline. */
var CACHE = 'karteideck-v4';
var FILES = ['./', './karteikarten.html', './einstellungen.js', './app.js', './manifest.webmanifest', './icon.svg', './icon-192.png', './icon-512.png', './apple-touch-icon.png'];
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
  var u = new URL(e.request.url);
  function save(r) { if (r && r.ok) { var cp = r.clone(); caches.open(CACHE).then(function (c) { c.put(e.request, cp); }); } return r; }
  if (u.pathname.indexOf('/api/') >= 0) {   // Konto-Schnittstelle nie zwischenspeichern, nur das Zusatzfunktionen-Skript (offline nutzbar, wird beim Abmelden gelöscht)
    if (/[?&]a=pro(&|$)/.test(u.search)) e.respondWith(fetch(e.request).then(function (r) { if (r.status === 401 || r.status === 403) { caches.open(CACHE).then(function (c) { c.delete(e.request); }); } return save(r); }).catch(function () { return caches.match(e.request); }));
    return;
  }
  if (e.request.mode === 'navigate' || /\.(html|js)$/.test(u.pathname)) {   // Seite und Skripte: erst Netz (immer neueste Version), offline der Zwischenspeicher
    e.respondWith(fetch(e.request).then(save).catch(function () { return caches.match(e.request, { ignoreSearch: true }).then(function (h) { return h || caches.match('./karteikarten.html'); }); }));
    return;
  }
  e.respondWith(caches.match(e.request).then(function (hit) {   // Bilder u. a.: Zwischenspeicher, im Hintergrund aktualisieren
    var net = fetch(e.request).then(save).catch(function () { return hit; });
    return hit || net;
  }));
});
