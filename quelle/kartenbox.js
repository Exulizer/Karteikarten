(function () {
  'use strict';
  var DEF = 'Allgemein';
  var KEY = 'karteikarten-v2', OLD = 'karteikarten-v1', SKEY = 'kartenbox-einstellungen-v1';
  var db = { cats: [DEF], cards: [], log: {}, colors: {} };
  /* Rubrikfarben: Klebe-Etiketten in gedeckten Tönen (Gelb fehlt, die Karten sind gelb) */
  var PALETTE = ['#e5484d', '#f08a24', '#3fa66b', '#14a3a3', '#3b82f6', '#8b5cf6', '#e0529c', '#8a6d4b', '#6b7a8c'];
  var PNAMES = ['Rot', 'Orange', 'Grün', 'Türkis', 'Blau', 'Violett', 'Rosa', 'Braun', 'Grau'];
  function nextColor() {
    var used = {}; Object.keys(db.colors).forEach(function (k) { used[db.colors[k]] = 1; });
    for (var i = 0; i < PALETTE.length; i++) if (!used[PALETTE[i]]) return PALETTE[i];
    return PALETTE[Object.keys(db.colors).length % PALETTE.length];
  }
  function fixColors() { db.cats.forEach(function (c) { if (PALETTE.indexOf(db.colors[c]) < 0) db.colors[c] = nextColor(); }); Object.keys(db.colors).forEach(function (k) { if (db.cats.indexOf(k) < 0) delete db.colors[k]; }); }
  function catColor(n) {   // auch für Demo-Rubriken, die nicht in deinen Karten liegen
    if (db.colors[n]) return db.colors[n];
    var di = DEMO ? DEMO.cats.indexOf(n) : -1; if (di >= 0) return PALETTE[di % PALETTE.length];
    var h = 0; for (var i = 0; i < n.length; i++) h = (h * 31 + n.charCodeAt(i)) % 997;
    return PALETTE[h % PALETTE.length];
  }
  var studyDirty = true;
  var current = 'study';

  function $(id) { return document.getElementById(id); }
  function el(tag, cls, txt) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (txt != null) e.textContent = txt;
    return e;
  }
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function isStr(s) { return typeof s === 'string' && s.trim() !== ''; }
  function validCard(c) { return c && isStr(c.q) && (isStr(c.a) || hasCloze(c.q)); }
  /* Lückentext: {{Wort}} in der Frage wird auf der Vorderseite zur Lücke, hinten steht der volle Satz */
  function hasCloze(q) { return /\{\{.+?\}\}/.test(q); }
  function clozeWords(q) { var m = [], re = /\{\{(.+?)\}\}/g, x; while ((x = re.exec(q))) m.push(x[1].trim()); return m; }
  function qShow(c) { return hasCloze(c.q) ? c.q.replace(/\{\{.+?\}\}/g, '[ … ]') : c.q; }
  function aShow(c) { return hasCloze(c.q) ? c.q.replace(/\{\{(.+?)\}\}/g, '$1') + (c.a && c.a !== clozeWords(c.q).join(', ') ? '\n\n' + c.a : '') : c.a; }
  function cleanTags(t) {
    var out = [];
    (Array.isArray(t) ? t : []).forEach(function (x) {
      x = String(x).trim().replace(/\s+/g, ' ').slice(0, 24);
      if (x && out.length < 8 && !out.some(function (y) { return sameName(x, y); })) out.push(x);
    });
    return out;
  }
  function parseTags(str) { return cleanTags(String(str || '').split(/[,;]+/)); }
  function okImg(v) { return typeof v === 'string' && v.length < 600000 && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+\/=]+$/.test(v); }
  /* Vergleich beim Tippen: Groß/Klein, Akzente und Satzzeichen egal */
  function flat(t) { return String(t).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ß/g, 'ss').replace(/[^a-z0-9\u00c0-\uffff ]+/g, ' ').replace(/\s+/g, ' ').trim(); }
  function lev(a, b) {
    var p = [], i, j, c;
    for (j = 0; j <= b.length; j++) p[j] = j;
    for (i = 1; i <= a.length; i++) {
      var prev = p[0]; p[0] = i;
      for (j = 1; j <= b.length; j++) { c = p[j]; p[j] = Math.min(p[j] + 1, p[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1)); prev = c; }
    }
    return p[b.length];
  }
  function grade(typed, want) {   // 2 richtig, 1 fast, 0 falsch
    var t = flat(typed), w = flat(want);
    if (!t) return 0;
    if (t === w) return 2;
    if (w.length > 28) {
      var tw = w.split(' ').filter(function (x) { return x.length > 2; }), hit = 0;
      tw.forEach(function (x) { if (t.indexOf(x) >= 0) hit++; });
      var r = tw.length ? hit / tw.length : 0;
      return r >= 0.8 ? 2 : r >= 0.5 ? 1 : 0;
    }
    var d = lev(t, w);
    return d <= Math.floor(w.length / 8) ? 2 : d <= Math.max(1, Math.floor(w.length / 4)) ? 1 : 0;
  }
  function ensureCat(n) { if (db.cats.indexOf(n) < 0) db.cats.push(n); }
  function countIn(cat) { return db.cards.filter(function (c) { return c.cat === cat; }).length; }
  function byId(id) {
    return db.cards.find(function (c) { return c.id === id; }) || demoCards().find(function (c) { return c.id === id; });
  }
  function sameName(a, b) { return a.toLowerCase() === b.toLowerCase(); }
  function shuffleArr(a) {
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
  }
  function download(name, text, type) {
    var blob = new Blob([text], { type: type });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  var tt;
  function toast(msg) {
    var t = $('toast');
    t.textContent = msg;
    function pos() {   // Hinweis steht über der unteren Leiste, nie darauf
      var dk = document.querySelector('.dock'), dr = dk && dk.offsetParent !== null ? dk.getBoundingClientRect() : null;
      t.style.bottom = (dr && dr.height > 0 && dr.top < innerHeight ? Math.round(innerHeight - dr.top) + 10 : 22) + 'px';
    }
    pos(); setTimeout(pos, 60);
    t.classList.add('show');
    clearTimeout(tt);
    tt = setTimeout(function () { t.classList.remove('show'); }, 2800);
  }

  /* ===== Einstellungen ===== */
  var DEFAULTS = {
    schrift: { groesse: 18, zeilenabstand: 1.6, art: 'serif' },
    karte: { breite: 420, zeilenMin: 5, zeilenMax: 12, automatischeHoehe: true },
    faecher: { anzahl: 5, groesse: 0.55, winkel: 10, unschaerfe: 7 },
    animation: { an: true, tempo: 1 },
    lernen: { mischen: false, tastatur: true, timer: true, sekunden: 30, tagesziel: 10, richtung: 'vor', tippen: false, wortbank: true, vorlesen: 'aus', sprache: 'de-DE', pruefung: 10, auto: 6, player: false },
    design: { thema: 'auto' },
    update: { pruefen: true },
    start: { seite: 'immer' },
    anbieter: { name: '', strasse: '', ort: '', email: '', hoster: '' },
    seite: { url: '' },
    konto: { api: '', test: false }
  };
  var FONTS = {
    serif: 'Georgia, "Iowan Old Style", "Palatino Linotype", serif',
    sans: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
    hand: '"Segoe Print", "Bradley Hand", "Chalkboard SE", "Comic Sans MS", cursive'
  };
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function merge(base, over) {
    var out = clone(base);
    if (!over || typeof over !== 'object') return out;
    Object.keys(out).forEach(function (g) {
      if (over[g] && typeof over[g] === 'object') {
        Object.keys(out[g]).forEach(function (k) { if (over[g][k] !== undefined) out[g][k] = over[g][k]; });
      }
    });
    return out;
  }
  function num(v, lo, hi, def) { v = Number(v); return isFinite(v) ? Math.min(hi, Math.max(lo, v)) : def; }
  function normalize(s) {
    s.schrift.groesse = Math.round(num(s.schrift.groesse, 12, 40, 18));
    s.schrift.zeilenabstand = Math.round(num(s.schrift.zeilenabstand, 1.2, 2.2, 1.6) * 10) / 10;
    if (!FONTS[s.schrift.art]) s.schrift.art = 'serif';
    s.karte.breite = Math.round(num(s.karte.breite, 240, 720, 420));
    s.karte.zeilenMin = Math.round(num(s.karte.zeilenMin, 2, 20, 5));
    s.karte.zeilenMax = Math.round(num(s.karte.zeilenMax, s.karte.zeilenMin, 30, Math.max(12, s.karte.zeilenMin)));
    s.karte.automatischeHoehe = s.karte.automatischeHoehe !== false;
    s.faecher.anzahl = Math.round(num(s.faecher.anzahl, 3, 7, 5));
    s.faecher.groesse = Math.round(num(s.faecher.groesse, 0.35, 0.8, 0.55) * 100) / 100;
    s.faecher.winkel = Math.round(num(s.faecher.winkel, 4, 16, 10));
    s.faecher.unschaerfe = Math.round(num(s.faecher.unschaerfe, 3, 14, 7));
    s.animation.an = s.animation.an !== false;
    s.animation.tempo = Math.round(num(s.animation.tempo, 0.4, 3, 1) * 10) / 10;
    s.lernen.mischen = s.lernen.mischen === true;
    s.lernen.tastatur = s.lernen.tastatur !== false;
    s.lernen.timer = s.lernen.timer !== false;
    s.lernen.sekunden = Math.round(num(s.lernen.sekunden, 10, 60, 30));
    s.lernen.player = s.lernen.player === true;
    s.lernen.auto = Math.round(num(s.lernen.auto, 3, 30, 6));
    s.lernen.tagesziel = Math.round(num(s.lernen.tagesziel, 0, 200, 10));
    if (['vor', 'rueck', 'misch'].indexOf(s.lernen.richtung) < 0) s.lernen.richtung = 'vor';
    s.lernen.tippen = s.lernen.tippen === true;
    s.lernen.wortbank = s.lernen.wortbank !== false;
    if (['aus', 'frage', 'loesung', 'beides'].indexOf(s.lernen.vorlesen) < 0) s.lernen.vorlesen = 'aus';
    if (!/^[a-z]{2,3}-[A-Z]{2}$/.test(s.lernen.sprache)) s.lernen.sprache = 'de-DE';
    s.lernen.pruefung = Math.round(num(s.lernen.pruefung, 3, 100, 10));
    if (['auto', 'hell', 'dunkel'].indexOf(s.design.thema) < 0) s.design.thema = 'auto';
    s.update.pruefen = s.update.pruefen !== false;
    if (['immer', 'taeglich', 'einmal', 'aus'].indexOf(s.start.seite) < 0) s.start.seite = 'immer';
    s.konto.test = s.konto.test === true;
    s.konto.api = /^[\w.\/-]{0,100}$/.test(String(s.konto.api || '')) ? String(s.konto.api || '') : '';
    s.seite.url = String(s.seite.url || '').trim().replace(/\/+$/, '').slice(0, 120);
    Object.keys(s.anbieter).forEach(function (k) { s.anbieter[k] = String(s.anbieter[k] || '').trim().slice(0, 120); });
    return s;
  }
  var FILECFG = normalize(merge(DEFAULTS, window.KARTENBOX_EINSTELLUNGEN));
  var CFG = clone(FILECFG);
  try {
    var rawCfg = localStorage.getItem(SKEY);
    if (rawCfg) CFG = normalize(merge(FILECFG, JSON.parse(rawCfg)));
  } catch (e) {}
  function saveCfg() { try { localStorage.setItem(SKEY, JSON.stringify(CFG)); } catch (e) {} scheduleWrite(); }

  var mq = window.matchMedia ? matchMedia('(prefers-color-scheme: dark)') : null;
  function themeNow() {
    var t = CFG.design.thema;
    if (t === 'hell') return 'light';
    if (t === 'dunkel') return 'dark';
    return mq && mq.matches ? 'dark' : 'light';
  }
  function applyCfg() {
    var r = document.documentElement, th = themeNow();
    r.setAttribute('data-theme', th);
    var MOON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z" fill="currentColor"/></svg>';
    var SUN = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4.5" fill="currentColor"/><g stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M18.7 5.3l-2.1 2.1M7.4 16.6l-2.1 2.1"/></g></svg>';
    $('themeBtn').innerHTML = th === 'dark' ? SUN : MOON;
    $('themeBtn').setAttribute('aria-label', th === 'dark' ? 'Helles Design' : 'Dunkles Design');
    $('themeBtn').title = th === 'dark' ? 'Helles Design' : 'Dunkles Design';
    r.style.setProperty('--tempo', CFG.animation.an ? CFG.animation.tempo : 200);
    r.style.setProperty('--font', FONTS[CFG.schrift.art]);
  }
  var REF = [];
  function setCfg(path, val) {
    var p = path.split('.');
    CFG[p[0]][p[1]] = val;
    normalize(CFG);
    saveCfg();
    applyCfg();
    if (p[0] !== 'design') studyDirty = true;
    REF.forEach(function (f) { f(); });
    renderDrawing();
  }
  function getCfg(path) { var p = path.split('.'); return CFG[p[0]][p[1]]; }
  $('themeBtn').addEventListener('click', function () { setCfg('design.thema', themeNow() === 'dark' ? 'hell' : 'dunkel'); });
  if (mq && mq.addEventListener) mq.addEventListener('change', applyCfg);

  /* ===== Daten ===== */
  function parseData(d) {
    var arr, cats = [];
    if (Array.isArray(d)) arr = d;
    else if (d && Array.isArray(d.cards)) { arr = d.cards; if (Array.isArray(d.cats)) cats = d.cats; }
    else throw new Error('format');
    var out = { cats: [], cards: [], log: {}, colors: {} };
    if (d && d.log && typeof d.log === 'object' && !Array.isArray(d.log)) {
      Object.keys(d.log).forEach(function (k) {
        var v = d.log[k];
        if (/^\d{4}-\d{2}-\d{2}$/.test(k) && v && isFinite(v.n) && v.n > 0) out.log[k] = { n: Math.round(v.n), ok: Math.max(0, Math.round(Number(v.ok) || 0)) };
          if (Array.isArray(v.c)) { var cc = v.c.filter(function (e) { return Array.isArray(e) && typeof e[0] === 'string' && e[0].length < 80; }).slice(-400).map(function (e) { return [e[0], e[1] ? 1 : 0]; }); if (cc.length) out.log[k].c = cc; }
      });
    }
    function add(c) { c = String(c).trim(); if (c && out.cats.indexOf(c) < 0) out.cats.push(c); return c; }
    cats.forEach(function (c) { if (isStr(c)) add(c); });
    arr.filter(validCard).forEach(function (c) {
      var cat = isStr(c.cat) ? add(c.cat) : add(DEF);
      var o = { id: isStr(c.id) ? c.id : uid(), q: c.q.trim(), a: isStr(c.a) ? c.a.trim() : clozeWords(c.q).join(', '), cat: cat };
      var tg = cleanTags(c.tags); if (tg.length) o.tags = tg;
      if (okImg(c.img)) o.img = c.img;
      if (c.miss > 0) o.miss = Math.min(99, Math.round(c.miss));
      if (isFinite(c.n) && c.n > 0) {   // Lernstand: Karteikasten 1 bis 5
        o.n = Math.round(c.n);
        o.box = Math.min(5, Math.max(1, Math.round(Number(c.box) || 1)));
        o.due = Number(c.due) || 0;
        o.last = c.last === 'bad' ? 'bad' : 'ok';
      }
      if (c.pin === true) o.pin = true;
      out.cards.push(o);
    });
    if (!out.cats.length) out.cats.push(DEF);
    if (d && d.colors && typeof d.colors === 'object') out.cats.forEach(function (c) { if (PALETTE.indexOf(d.colors[c]) >= 0) out.colors[c] = d.colors[c]; });
    return out;
  }
  /* Alte Demo-Karten (früher als echte Karten gespeichert) entfernen; leer gewordene Demo-Rubriken auch */
  function purgeDemo(d) {
    var n = d.cards.length;
    var known = {};
    DEMO.cards.forEach(function (c) { known[c.q + '\u0001' + c.a] = true; });
    // erkennt die Demo an der Kennung (alte Version) oder an Frage und Antwort (importierte Datei)
    d.cards = d.cards.filter(function (c) { return !/^demo\d+$/.test(String(c.id)) && !known[c.q + '\u0001' + c.a]; });
    if (d.cards.length === n) return false;
    DEMO.cats.forEach(function (name) {
      if (!d.cards.some(function (c) { return c.cat === name; })) d.cats = d.cats.filter(function (x) { return x !== name; });
    });
    if (!d.cats.length) d.cats = [DEF];
    return true;
  }
  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) {
        var d = parseData(JSON.parse(raw));
        var cut = purgeDemo(d);
        db.cats = d.cats; db.cards = d.cards; db.log = d.log; db.colors = d.colors;
        if (cut) persist();
      } else if (window.KARTENBOX_KARTEN) {
        var kd = parseData(window.KARTENBOX_KARTEN);
        db.cats = kd.cats; db.cards = kd.cards; db.log = kd.log; db.colors = kd.colors;
      } else {
        var o = localStorage.getItem(OLD);
        if (o) {
          var a = JSON.parse(o);
          if (Array.isArray(a)) db.cards = a.filter(validCard).map(function (c) { return { id: c.id || uid(), q: c.q, a: c.a, cat: DEF }; });
        }
      }
    } catch (e) {}
    db.cards.forEach(function (c) { if (!isStr(c.cat)) c.cat = DEF; ensureCat(c.cat); });
    if (!db.cats.length) db.cats = [DEF];
    fixColors();
  }
  function persist() {
    try { localStorage.setItem(KEY, JSON.stringify(db)); }
    catch (e) { toast('Browser-Speicher voll. Bitte Karten speichern.'); }
  }
  function save() { S.demo = false; studyDirty = true; persist(); scheduleWrite(); }

  /* ===== Ordner verbinden (Chrome/Edge): Karten und Einstellungen liegen als Dateien im Ordner der HTML ===== */
  var FL = {
    handle: null, state: 'none', name: '', timer: null,
    supported: !!(window.showDirectoryPicker && window.indexedDB)
  };
  var F_CARDS = 'karteikarten.json', F_CFG = 'einstellungen.js', F_JS = 'karteikarten.js';
  function idbOpen() {
    return new Promise(function (res, rej) {
      var r = indexedDB.open('kartenbox', 1);
      r.onupgradeneeded = function () { r.result.createObjectStore('kv'); };
      r.onsuccess = function () { res(r.result); };
      r.onerror = function () { rej(r.error); };
    });
  }
  function idbDo(mode, fn) {
    return idbOpen().then(function (d) {
      return new Promise(function (res, rej) {
        var q = fn(d.transaction('kv', mode).objectStore('kv'));
        q.onsuccess = function () { res(q.result); };
        q.onerror = function () { rej(q.error); };
      });
    });
  }
  function scheduleWrite() {
    scheduleSync();
    if (!FL.handle || FL.state !== 'ok') return;
    clearTimeout(FL.timer);
    FL.timer = setTimeout(writeFile, 350);
  }
  /* karteikarten.js: dieselben Karten als Skript, das die Seite neben der HTML von selbst lädt (auch ohne Ordnerzugriff) */
  function cardsJs(data) {
    return '/* KarteiDeck – Karten. Liegt neben karteikarten.html und wird beim Start geladen, wenn der Browser noch keine Karten hat. */\nwindow.KARTENBOX_KARTEN = ' + JSON.stringify(data, null, 2) + ';\n';
  }
  function cfgText() {
    return '/* KarteiDeck – Einstellungen. Wird automatisch gespeichert. Werte lassen sich hier oder im Tab Optionen ändern. */\nwindow.KARTENBOX_EINSTELLUNGEN = ' + JSON.stringify(CFG, null, 2) + ';\n';
  }
  async function putFile(dir, name, text) {
    var fh = await dir.getFileHandle(name, { create: true });
    var w = await fh.createWritable();
    await w.write(text);
    await w.close();
  }
  async function writeFile() {
    try {
      await putFile(FL.handle, F_CARDS, JSON.stringify(db, null, 2));
      await putFile(FL.handle, F_JS, cardsJs(db));
      await putFile(FL.handle, F_CFG, cfgText());
      FL.state = 'ok';
    } catch (e) {
      FL.state = 'error';
      toast('Ordner konnte nicht beschrieben werden');
    }
    renderFile();
  }
  async function readText(dir, name) {
    try {
      var fh = await dir.getFileHandle(name);
      return await (await fh.getFile()).text();
    } catch (e) {
      if (e && e.name === 'NotFoundError') return null;
      throw e;
    }
  }
  async function readCards(dir) {
    var t = await readText(dir, F_CARDS);
    if (!t || !t.trim()) return null;
    return parseData(JSON.parse(t));
  }
  async function readCfg(dir) {
    var t = await readText(dir, F_CFG);
    if (!t) return null;
    return parseCfgJs(t);
  }
  /* Liest einstellungen.js als reine Daten, ohne etwas auszuführen: Kommentare, Schlüssel ohne Anführungszeichen,
     einfache Anführungszeichen und Komma am Ende sind erlaubt, alles andere (Funktionen, Aufrufe) wird abgelehnt. */
  function parseCfgJs(t) {
    var m = /KARTENBOX_EINSTELLUNGEN\s*=\s*/.exec(t);
    if (!m) return null;
    var s = t.slice(m.index + m[0].length), out = '', i = 0, n = s.length, depth = 0, started = false;
    while (i < n) {
      var c = s[i];
      if (c === '/' && s[i + 1] === '/') { while (i < n && s[i] !== '\n') i++; continue; }
      if (c === '/' && s[i + 1] === '*') { var e = s.indexOf('*/', i + 2); if (e < 0) return null; i = e + 2; continue; }
      if (c === '"' || c === "'") {
        var q = c, str = ''; i++;
        while (i < n && s[i] !== q) { if (s[i] === '\\') { str += s[i] + (s[i + 1] || ''); i += 2; } else { str += s[i++]; } }
        if (i >= n) return null;
        i++;
        out += q === '"' ? '"' + str + '"' : '"' + str.replace(/\\'/g, "'").replace(/"/g, '\\"') + '"';
        continue;
      }
      if (/[A-Za-z_$]/.test(c)) {
        var w = /^[A-Za-z_$][\w$]*/.exec(s.slice(i))[0];
        i += w.length;
        var k = i; while (k < n && /\s/.test(s[k])) k++;
        if (s[k] === ':') out += '"' + w + '"'; else if (w === 'true' || w === 'false' || w === 'null') out += w; else return null;
        continue;
      }
      if (c === '{' || c === '[') { depth++; started = true; }
      if (c === '}' || c === ']') depth--;
      out += c; i++;
      if (started && depth === 0) break;
    }
    if (!started || depth !== 0) return null;
    out = out.replace(/,(\s*[}\]])/g, '$1');
    try { var o = JSON.parse(out); return o && typeof o === 'object' && !Array.isArray(o) ? o : null; } catch (e) { return null; }
  }
  function takeCfg(o) {
    CFG = normalize(merge(DEFAULTS, o));
    FILECFG = clone(CFG);
    try { localStorage.setItem(SKEY, JSON.stringify(CFG)); } catch (e) {}
    applyCfg();
    studyDirty = true;
  }
  function takeData(data) {
    var cut = purgeDemo(data);
    db.cats = data.cats; db.cards = data.cards; db.log = data.log; db.colors = data.colors; fixColors();
    persist();
    if (cut) scheduleWrite();
    studyDirty = true;
    if (S.cat !== null && db.cats.indexOf(S.cat) < 0) S.cat = null;
    if (listCat !== null && db.cats.indexOf(listCat) < 0) listCat = null;
    show(current);
  }
  async function fileSync() {
    var o = await readCfg(FL.handle), data = await readCards(FL.handle);
    FL.state = 'ok';
    if (o) takeCfg(o);
    if (data) takeData(data); else { await writeFile(); show(current); }
  }
  async function fileRestore() {
    if (!FL.supported) return;
    try {
      var h = await idbDo('readonly', function (s) { return s.get('h'); });
      if (!h || h.kind !== 'directory') return;
      FL.handle = h; FL.name = h.name;
      var p = await h.queryPermission({ mode: 'readwrite' });
      if (p === 'granted') await fileSync(); else FL.state = 'needperm';
    } catch (e) { FL.state = 'error'; }
    renderFile();
  }
  async function fileGrant() {
    try {
      var p = await FL.handle.requestPermission({ mode: 'readwrite' });
      if (p === 'granted') { await fileSync(); toast('Ordner verbunden: ' + FL.name); }
    } catch (e) { toast('Zugriff nicht möglich'); }
    renderFile();
  }
  async function fileConnect() {
    var h, data, cfg;
    try {
      h = await window.showDirectoryPicker({ id: 'kartenbox', mode: 'readwrite' });
      data = await readCards(h);
      cfg = await readCfg(h);
    } catch (e) {
      if (!e || e.name !== 'AbortError') toast('Dieser Ordner geht nicht. Wähle den Ordner mit karteikarten.html.');
      return;
    }
    async function attach() {
      FL.handle = h; FL.name = h.name; FL.state = 'ok';
      await idbDo('readwrite', function (s) { return s.put(h, 'h'); });
      if (cfg) takeCfg(cfg);
      if (data) takeData(data); else show(current);
      await writeFile();
      toast('Ordner verbunden: ' + h.name);
    }
    if (data && db.cards.length) {
      confirmDlg('Ordner laden?', 'Im Ordner liegt karteikarten.json mit ' + data.cards.length + ' Karten. Die ' + db.cards.length + ' Karten im Browser werden dadurch ersetzt.', attach, 'Laden', false);
    } else attach();
  }
  async function fileDetach() {
    FL.handle = null; FL.state = 'none'; FL.name = '';
    try { await idbDo('readwrite', function (s) { return s.delete('h'); }); } catch (e) {}
    renderFile();
    toast('Ordner getrennt');
  }
  function renderFile() {
    var need = FL.state === 'needperm', bad = FL.state === 'error';   // Der Ordner steht unter Optionen; hier nur, wenn etwas nicht stimmt
    $('banner').hidden = !(need || bad);
    $('bannerBtn').textContent = bad ? 'Optionen' : 'Erlauben';
    if (need) $('bannerText').textContent = 'Zugriff auf den Ordner „' + FL.name + '“ erlauben, damit Karten und Einstellungen dort gespeichert werden.';
    if (bad) $('bannerText').textContent = 'Der Ordner lässt sich nicht beschreiben. Prüfe ihn unter Optionen.';
    if (current === 'opts') renderOptions();
  }
  $('bannerBtn').addEventListener('click', function () { if (FL.state === 'error') show('opts'); else fileGrant(); });

  /* ===== Chips und Dialoge ===== */
  function chips(host, opts, val, pick, extra) {
    host.textContent = '';
    opts.forEach(function (o) {
      var b = el('button', 'chip', o.label);
      b.type = 'button';
      if (o.color) { var dt = el('i', 'dot'); dt.style.background = o.color; b.insertBefore(dt, b.firstChild); }
      b.setAttribute('aria-pressed', String(o.v === val));
      if (o.n != null) b.appendChild(el('span', null, o.n));
      b.addEventListener('click', function () { pick(o.v); });
      host.appendChild(b);
    });
    if (extra) {
      var x = el('button', 'chip add', extra.label);
      x.type = 'button';
      x.addEventListener('click', extra.fn);
      host.appendChild(x);
    }
  }
  function catOpts(withAll) {
    var o = db.cats.map(function (c) { return { v: c, label: c, n: countIn(c), color: catColor(c) }; });
    return withAll ? [{ v: null, label: 'Alle', n: db.cards.length }].concat(o) : o;
  }

  var nameCb = null, confCb = null;
  var nameColor = '';
  function drawSwatches() {
    var host = $('nameColors'); host.textContent = '';
    PALETTE.forEach(function (c, i) {
      var b = el('button', 'sw'); b.type = 'button'; b.style.background = c;
      b.setAttribute('role', 'radio'); b.setAttribute('aria-label', PNAMES[i]); b.title = PNAMES[i];
      b.setAttribute('aria-checked', String(c === nameColor));
      b.addEventListener('click', function () { nameColor = c; drawSwatches(); });
      host.appendChild(b);
    });
  }
  function askName(title, initial, cb, color) {
    $('nameTitle').textContent = title;
    $('nameInput').value = initial || '';
    $('nameErr').textContent = '';
    nameCb = cb;
    nameColor = color || nextColor();
    drawSwatches();
    $('nameDlg').showModal();
    $('nameInput').focus();
    $('nameInput').select();
  }
  function submitName() {
    var v = $('nameInput').value.trim();
    if (!v) { $('nameErr').textContent = 'Bitte einen Namen eingeben.'; return; }
    var err = nameCb(v, nameColor);
    if (err) { $('nameErr').textContent = err; return; }
    $('nameDlg').close();
  }
  $('nameOk').addEventListener('click', submitName);
  $('nameCancel').addEventListener('click', function () { $('nameDlg').close(); });
  $('nameInput').addEventListener('keydown', function (e) { if (e.key === 'Enter') submitName(); });

  function confirmDlg(title, text, cb, okLabel, danger, cancelLabel) {
    $('confCancel').textContent = cancelLabel || 'Abbrechen';
    $('confTitle').textContent = title;
    $('confText').textContent = text;
    $('confOk').textContent = okLabel || 'Löschen';
    $('confOk').className = 'btn ' + (danger === false ? 'primary' : 'danger');
    confCb = cb;
    $('confDlg').showModal();
  }
  $('confCancel').addEventListener('click', function () { $('confDlg').close(); });
  $('confOk').addEventListener('click', function () { $('confDlg').close(); if (confCb) confCb(); });

  function createCat(n, color) {
    if (db.cats.some(function (c) { return sameName(c, n); })) return 'Diese Rubrik gibt es schon.';
    db.cats.push(n);
    db.colors[n] = PALETTE.indexOf(color) >= 0 ? color : nextColor();
    save();
    return '';
  }

  /* ===== Tabs ===== */
  /* "Neu"-Streifen in den Optionen: nur beim ersten Besuch nach dem Update, danach nie wieder */
  /* Zubehör (Notizzettel links, Taschenrechner rechts) rutscht 0,9 s nach dem Laden unter der Schreibunterlage hervor.
     Nur bei großen Fenstern, wo beides außerhalb der Unterlage liegt. Die Unterlage verdeckt es per clip-path, das mitwandert. */
  var accIntro = true, accTimer = 0, accAnims = [];
  function accOK() { return window.innerWidth >= 1340 && CFG.animation.an && !!(window.CSS && CSS.supports && CSS.supports('translate', '1px 0')); }
  function accStop() { clearTimeout(accTimer); accAnims.forEach(function (a) { try { a.cancel(); } catch (e) {} }); accAnims = []; $('dock').classList.remove('acc-wait'); $('player').classList.remove('acc-wait'); $('dock').style.clipPath = ''; $('pwrap').style.clipPath = ''; }
  /* Die Unterlage verdeckt das Zubehör: Der ruhende Behälter bekommt ein Loch in Größe der Unterlage. Nur das Zubehör wandert, so flackert nichts. */
  function accClip() {
    var dk = $('dock').getBoundingClientRect(), pad = document.querySelector('.wrap').getBoundingClientRect(), L = Math.round(pad.left - dk.left), R = Math.round(pad.right - dk.left);
    $('dock').style.clipPath = 'polygon(-5000px -5000px, ' + L + 'px -5000px, ' + L + 'px 5000px, ' + R + 'px 5000px, ' + R + 'px -5000px, 5000px -5000px, 5000px 6000px, -5000px 6000px)';
  }
  function accShift(e, left) {   // so weit schieben, dass es ganz unter der Unterlage liegt
    var pad = document.querySelector('.wrap').getBoundingClientRect(), r = e.getBoundingClientRect();
    return (left ? pad.left - r.left + 8 : pad.right - r.right - 8) + 'px 0';
  }
  function accRun(out) {   // out: zurück unter die Unterlage. Gibt ein Versprechen zurück, das am Ende erfüllt ist.
    var dk = $('dock'), T = CFG.animation.tempo, rnd = function (lo, hi) { return lo + Math.random() * (hi - lo); }, ease = 'cubic-bezier(.2, .8, .2, 1)', list = [];
    accClip();
    [['.steps', true], ['.controls', false]].forEach(function (p) {
      var e = dk.querySelector(p[0]); if (!e || e.hidden) return;
      var f = [{ translate: accShift(e, p[1]) }, { translate: '0 0' }];
      var an = e.animate(out ? [f[1], f[0]] : f, { duration: (out ? rnd(450, 650) : rnd(700, 950)) / T, easing: out ? 'cubic-bezier(.5, 0, .8, .4)' : ease, delay: (out ? rnd(0, 220) : rnd(0, 380)) / T, fill: out ? 'forwards' : 'backwards' });
      accAnims.push(an); list.push(an.finished);
    });
    var pl = $('player'), pw = $('pwrap');
    if (!pl.hidden && pl.offsetParent) {   // Player liegt rechts neben der Unterlage und rutscht unter ihr hervor. Nur er bewegt sich, das Loch in der Unterlage steht still.
      var pr = document.querySelector('.wrap').getBoundingClientRect(), wr = pw.getBoundingClientRect(), W = wr.width, D = Math.round(wr.left + W - pr.right) + 6;
      pw.style.clipPath = 'inset(-30px -30px -30px ' + Math.round(pr.right - wr.left) + 'px)';
      var pa = pl.animate([{ translate: -D + 'px 0' }, { translate: '0 0' }], { duration: (out ? rnd(550, 750) : rnd(800, 1000)) / T, easing: out ? 'cubic-bezier(.5, 0, .8, .4)' : 'cubic-bezier(.2, .8, .2, 1)', delay: rnd(0, out ? 220 : 380) / T, direction: out ? 'reverse' : 'normal', fill: out ? 'forwards' : 'backwards' });
      accAnims.push(pa); list.push(pa.finished);
    }
    var done = Promise.all(list);
    if (!out) done.then(function () { dk.style.clipPath = ''; pw.style.clipPath = ''; }, function () {});
    return done;
  }
  function accOut() { var dk = $('dock'); if (!accOK() || dk.hidden) return Promise.resolve(); accStop(); return accRun(true).catch(function () {}); }
  function tryAcc() {
    var dk = $('dock');
    if (!accIntro || dk.hidden || !accOK()) return;
    accIntro = false; accStop();
    dk.classList.add('acc-wait'); $('player').classList.add('acc-wait');
    accTimer = setTimeout(function () { dk.classList.remove('acc-wait'); $('player').classList.remove('acc-wait'); accRun(false); }, 900);
  }
  /* Die graue Unterlage wird sanft höher oder niedriger, statt zu springen */
  function padH() { return parseFloat(getComputedStyle(document.querySelector('.wrap')).height) || 0; }
  function padMorph(h0) {
    if (!CFG.animation.an) return;
    var w = document.querySelector('.wrap'), h1 = padH();
    if (Math.abs(h1 - h0) < 3) return;
    w.style.overflow = 'clip';
    var a = w.animate([{ height: h0 + 'px' }, { height: h1 + 'px' }], { duration: 550 / CFG.animation.tempo, easing: 'cubic-bezier(.2, .8, .2, 1)' });
    a.onfinish = a.oncancel = function () { w.style.overflow = ''; };
  }
  var NEU_IN = '1.1.0', NEU_KEY = 'kartenbox-neu-gesehen', neuNow = false;
  function neuSeen() { try { return localStorage.getItem(NEU_KEY) === NEU_IN; } catch (e) { return true; } }
  function show(view) {
    if (view !== 'study') autoStop();
    if (current === 'opts' && view !== 'opts') neuNow = false;
    current = view;
    document.querySelectorAll('.tab').forEach(function (t) { t.setAttribute('aria-selected', String(t.dataset.view === view)); });
    document.querySelectorAll('.view').forEach(function (v) { v.classList.toggle('active', v.id === 'view-' + view); });
    moveInd(true);
    if (view === 'study') { accIntro = true; if (studyDirty) rebuildStudy(); else if (!$('stage').hidden) layout(); syncPlayer(); tryAcc(); }
    if (view === 'add') { renderAddChips(); resetAdd(); $('newQ').focus(); }
    if (view === 'all') { renderListChips(); renderList(); }
    if (view === 'cats') renderCats();
    if (view === 'opts') {
      if (!neuNow && !neuSeen()) neuNow = true;
      if (neuNow) { try { localStorage.setItem(NEU_KEY, NEU_IN); } catch (e) {} }
      renderOptions();
    }
  }
  /* Lineal-Marke: gleitet unter den aktiven Tab */
  var prevTab = -1, indT = 0;
  function moveInd(anim) {
    var tabs = Array.prototype.slice.call(document.querySelectorAll('.tab')), t = document.querySelector('.tab[aria-selected="true"]'), i = $('tabInd');
    if (!t || !i) return;
    var idx = tabs.indexOf(t), a = tabs[prevTab];
    function rest() { i.style.width = t.offsetWidth + 'px'; i.style.transform = 'translateX(' + t.offsetLeft + 'px)'; i.classList.remove('moving'); }
    clearTimeout(indT);
    if (anim === true && a && prevTab !== idx && CFG.animation.an) {
      // ein Zug: Streifen, Linie und Stift gleiten gemeinsam zum neuen Tab
      i.classList.add('moving');
      i.style.width = t.offsetWidth + 'px'; i.style.transform = 'translateX(' + t.offsetLeft + 'px)';
      indT = setTimeout(function () { i.classList.remove('moving'); }, 520 / CFG.animation.tempo);
    } else rest();
    prevTab = idx;
  }
  /* Mouseover: das helle Kästchen wandert mit der Maus mit (weich nachgezogen) */
  (function () {
    var nav = document.querySelector('.tabs'), hv = $('tabHov');
    if (!nav || !hv || !window.matchMedia || !matchMedia('(hover: hover)').matches) return;
    var tabs = Array.prototype.slice.call(document.querySelectorAll('.tab'));
    function follow(e) {
      var r = nav.getBoundingClientRect(), x = e.clientX - r.left, t = null;
      tabs.forEach(function (o) { if (x >= o.offsetLeft && x < o.offsetLeft + o.offsetWidth) t = o; });
      if (!t) return;
      var w = t.offsetWidth, left = Math.max(0, Math.min(nav.clientWidth - w, x - w / 2));   // Kästchen sitzt mittig unter der Maus, bleibt aber in der Leiste
      if (!hv.classList.contains('on')) { hv.classList.add('nt'); hv.style.width = w + 'px'; hv.style.transform = 'translateX(' + left + 'px)'; void hv.offsetWidth; hv.classList.remove('nt'); hv.classList.add('on'); }
      hv.style.width = w + 'px'; hv.style.transform = 'translateX(' + left + 'px)';
      tabs.forEach(function (o) { o.classList.toggle('hot', o === t); });
    }
    nav.addEventListener('mousemove', follow);
    nav.addEventListener('mouseenter', follow);
    nav.addEventListener('mouseleave', function () {
      hv.classList.remove('on');
      tabs.forEach(function (o) { o.classList.remove('hot'); });
    });
  })();
  /* Logo und Name führen zur Startseite (Lernen) */
  $('homeBtn').addEventListener('click', function () {
    var b = this;
    b.classList.remove('hop'); void b.offsetWidth; b.classList.add('hop');
    setTimeout(function () { b.classList.remove('hop'); }, 700);
    show('study');
    window.scrollTo({ top: 0, behavior: CFG.animation.an ? 'smooth' : 'auto' });
  });
  /* Filterleiste klebt oben und rückt in die Mitte (FLIP-Animation), Rückweg umgekehrt */
  (function () {
    var f = document.querySelector('.filters'), sent = $('filtSent'), stuck = false, raf = 0, clr = 0;
    if (!f || !sent) return;
    function pos() { return Array.prototype.map.call(f.children, function (k) { var r = k.getBoundingClientRect(); return { x: r.left, y: r.top }; }); }
    var pinned = false, lastY = 0, up = false;
    function narrow() { return innerWidth < 760 && !matchMedia('(max-width: 340px), (max-height: 520px)').matches; }
    function pin(on) {   // Handy: Leiste wird sofort beim ersten Scrollen fest oben angeheftet (Platzhalter hält die Höhe)
      pinned = on;
      if (on) {
        var r = f.getBoundingClientRect(), cs = getComputedStyle(f);
        sent.style.height = (r.height + (parseFloat(cs.marginTop) || 0) + (parseFloat(cs.marginBottom) || 0)) + 'px';
        f.style.left = r.left + 'px'; f.style.width = r.width + 'px'; f.classList.add('pin');
      } else { f.classList.remove('pin'); f.style.left = f.style.width = ''; sent.style.height = ''; }
    }
    function set(on) {
      if (on === stuck) return;
      var kids = Array.prototype.slice.call(f.children), before = pos();
      stuck = on; f.classList.toggle('stuck', on);
      if (narrow() || pinned) pin(on && narrow());
      if (!CFG.animation.an) return;
      var after = pos();
      kids.forEach(function (k, i) { k.style.transition = 'none'; k.style.transform = 'translate(' + (before[i].x - after[i].x) + 'px,' + (before[i].y - after[i].y) + 'px)'; });
      void f.offsetWidth;
      kids.forEach(function (k) { k.style.transition = 'transform ' + (0.5 / CFG.animation.tempo) + 's cubic-bezier(.3, 1.15, .4, 1)'; k.style.transform = ''; });
      clearTimeout(clr);
      clr = setTimeout(function () { kids.forEach(function (k) { k.style.transition = ''; }); }, 700 / CFG.animation.tempo);
    }
    function check() {
      raf = 0;
      var nar = narrow(), active = current === 'study' && sent.offsetParent !== null && (nar || getComputedStyle(f).position === 'sticky');
      var y = window.scrollY; if (y !== lastY) { up = y < lastY; lastY = y; }
      if (nar) {   // runter: sofort anheften; hoch: sobald die Navigation wieder sichtbar wird zurück an den Platz
        var navB = document.querySelector('.tabs').getBoundingClientRect().bottom;
        set(active && (pinned ? !(up && navB > 0) && y > 2 : y > 10 && !up));
      }
      else set(active && sent.getBoundingClientRect().top < (parseFloat(getComputedStyle(f).top) || 0) - 1);
      if (!nar && pinned) pin(false);
      if (pinned) { var r = sent.parentNode.getBoundingClientRect(), g = getComputedStyle(sent.parentNode); f.style.left = (r.left + (parseFloat(g.paddingLeft) || 0)) + 'px'; f.style.width = (r.width - (parseFloat(g.paddingLeft) || 0) - (parseFloat(g.paddingRight) || 0)) + 'px'; }
    }
    function ask() { if (!raf) raf = requestAnimationFrame(check); }
    window.addEventListener('scroll', ask, { passive: true });
    window.addEventListener('resize', ask);
  })();
  window.addEventListener('resize', function () { moveInd(); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { moveInd(); });
  document.querySelectorAll('.tab').forEach(function (t) { t.addEventListener('click', function () { show(t.dataset.view); }); });
  document.querySelectorAll('[data-goto]').forEach(function (b) { b.addEventListener('click', function () { show(b.dataset.goto); }); });

  /* ===== Lernen: große Karte oben, Fächer immer sichtbar darunter, Stapel rechts ===== */
  var S = { shelf: [], demo: false, mode: 'alle', round: { ok: 0, bad: 0 }, marks: {}, cat: null, list: [], queue: [], total: 0, done: 0, els: {}, sel: null, gen: 0, rank: {}, rev: {}, exam: null, examNext: false, dcat: null };
  var stage = $('stage');
  var meas = $('measure');

  function textLines(text, innerW, lh) {
    meas.style.width = innerW + 'px';
    meas.textContent = text;
    return Math.max(1, Math.ceil(meas.offsetHeight / lh - 0.01));
  }
  var linesKey = '', linesVal = 0;
  function computeLines(g, list) {
    var K = CFG.karte;
    if (!K.automatischeHoehe) return K.zeilenMin;
    var key = [g.bw, g.fs, g.lh, CFG.schrift.art, S.gen, list.length].join('|');
    if (key === linesKey) return linesVal;
    meas.style.fontSize = g.fs + 'px';
    meas.style.lineHeight = g.lh + 'px';
    var inner = g.bw - 2 * g.padx, mx = 0;
    list.forEach(function (c) { mx = Math.max(mx, textLines(qShow(c), inner, g.lh), textLines(aShow(c), inner, g.lh)); });
    linesKey = key;
    linesVal = Math.min(K.zeilenMax, Math.max(K.zeilenMin, mx));
    return linesVal;
  }
  /* Größen der Karte aus den Einstellungen: Zeilenhöhe folgt der Schrift, die Karte der Zeilenzahl */
  /* Sehr große Bildschirme: alles wächst in Stufen mit (gleiche Schwellen wie --k in kartenbox.css). Die Einstellungen selbst bleiben unverändert. */
  var SK = window.innerWidth >= 3400 ? 1.75 : window.innerWidth >= 2800 ? 1.5 : window.innerWidth >= 2200 ? 1.25 : 1;
  function geom(W, list, maxL) {
    var T = CFG.schrift;
    var fs = Math.round(T.groesse * SK), lh = Math.round(fs * T.zeilenabstand);
    var g = {
      fs: fs, lh: lh,
      hd: Math.max(30, Math.round(lh * 1.3)),
      padx: Math.round(fs * 0.9),
      bw: Math.min(Math.round(CFG.karte.breite * SK), Math.max(200, W - 8))
    };
    g.L = computeLines(g, list);
    // Höhe deckeln: höchstens ca. 45 % des Fensters, längerer Text scrollt in der Karte
    var cap = Math.floor((Math.max(220, window.innerHeight * 0.45) - g.hd - 8) / lh);
    g.L = Math.max(2, Math.min(g.L, cap, maxL || 99));
    g.bh = g.hd + g.L * lh + 8;
    return g;
  }
  function fanSlots(n, cw, ch, W) {
    var out = [];
    if (n < 1) return out;
    var step = CFG.faecher.winkel;
    var amax = (n - 1) / 2 * step * Math.PI / 180;
    var maxdx = Math.max(0, (W - cw) / 2 - 10 - (ch / 2) * Math.sin(amax));
    var R = (n > 1 && amax > 0) ? Math.min(ch * 1.9, maxdx / Math.sin(amax)) : 0;
    for (var i = 0; i < n; i++) {
      var a = (i - (n - 1) / 2) * step, r = a * Math.PI / 180;
      out.push({ a: a, dx: R * Math.sin(r), dy: R * (1 - Math.cos(r)) });
    }
    return out;
  }
  function plan(W, maxL, fk) {
    var g = geom(W, S.list, maxL);
    var f = CFG.faecher.groesse * (fk || 1);
    var cw = g.bw * f, ch = g.bh * f;
    var nFull = Math.min(CFG.faecher.anzahl, S.queue.length);
    var ss = 0.36, sw = g.bw * ss, sh = g.bh * ss;
    var wide = W >= g.bw + 2 * (sw + 14);
    var bigTop = wide ? 18 : Math.round(sh + 14);
    var bigCy = bigTop + g.bh / 2;
    var pileTop = wide ? 8 : 4;   // Stapel und Ablage sitzen etwas höher als die große Karte, aber mit Abstand zu den Filtern
    var full = fanSlots(nFull, cw, ch, W), minTop = 0, maxBot = 0;
    full.forEach(function (s) {
      var r = s.a * Math.PI / 180;
      var half = cw / 2 * Math.abs(Math.sin(r)) + ch / 2 * Math.cos(r);
      minTop = Math.min(minTop, s.dy - half);
      maxBot = Math.max(maxBot, s.dy + half);
    });
    var fanCy = bigTop + g.bh + 10 - minTop;
    var H = Math.round(nFull ? fanCy + maxBot + 14 : bigTop + g.bh + 10);
    return { g: g, f: f, cw: cw, ch: ch, nFull: nFull, ss: ss, sw: sw, sh: sh, wide: wide, bigTop: bigTop, bigCy: bigCy, pileTop: pileTop, fanCy: fanCy, H: H };
  }
  function dims() {
    var W = stage.clientWidth;
    var r = plan(W, 99, 1);   // Größe der Karten bleibt immer wie eingestellt
    // Ist das Fenster zu niedrig für Karte, Fächer und untere Leiste, steht die Leiste nicht fest unten: nichts liegt dann über dem Fächer
    var dk = document.querySelector('.dock'), side = dk && getComputedStyle(dk).position === 'absolute';   // am Desktop liegt die Leiste neben dem Fächer und braucht keine Höhe
    var dockH = dk && !side ? dk.offsetHeight : 0;
    var need = stage.getBoundingClientRect().top + window.pageYOffset + r.H + 14 + dockH;
    if (dk) dk.classList.toggle('free', !side && window.innerWidth >= 760 && need > window.innerHeight);   // Handy: Leiste bleibt immer unten kleben
    var g = r.g, f = r.f, sw = r.sw, sh = r.sh, ss = r.ss, bigTop = r.bigTop, pileTop = r.pileTop, H = r.H;
    $('statsBar').style.padding = r.wide ? '0 ' + Math.round(sw + 20) + 'px' : '';
    var st = stage.style;
    st.setProperty('--bw', g.bw + 'px'); st.setProperty('--bh', g.bh + 'px'); st.setProperty('--top', bigTop + 'px');
    st.setProperty('--fs', g.fs + 'px'); st.setProperty('--lh', g.lh + 'px'); st.setProperty('--hd', g.hd + 'px');
    st.setProperty('--padx', g.padx + 'px'); st.setProperty('--blur', CFG.faecher.unschaerfe + 'px');
    st.height = H + 'px';
    var p = $('pile').style;
    p.left = (W - 4 - sw) + 'px'; p.top = pileTop + 'px'; p.width = sw + 'px'; p.height = sh + 'px';
    p.setProperty('--hd', (g.hd * ss) + 'px'); p.setProperty('--lh', (g.lh * ss) + 'px');
    p.setProperty('--plabel', Math.max(9, g.hd * ss * 0.5) + 'px');
    var h = $('shelf').style;
    h.left = '4px'; h.top = pileTop + 'px'; h.width = sw + 'px'; h.height = sh + 'px';
    h.setProperty('--hd', (g.hd * ss) + 'px'); h.setProperty('--plabel', Math.max(9, g.hd * ss * 0.5) + 'px');
    $('endBox').style.top = r.bigCy + 'px';
    return {
      hx: 4 + sw / 2, nFull: r.nFull, W: W, g: g, f: f, cw: r.cw, ch: r.ch, bigCy: r.bigCy, fanCy: r.fanCy, H: H, ss: ss,
      sx: W - 4 - sw / 2, sy: pileTop + sh / 2
    };
  }
  var BIGT = 'translate(0px,0px) rotate(0deg) scale(1)';
  function fanT(s, d) { return 'translate(' + s.dx + 'px,' + (d.fanCy + s.dy - d.bigCy) + 'px) rotate(' + s.a + 'deg) scale(' + d.f + ')'; }
  function stackT(d, rot) { return 'translate(' + (d.sx - d.W / 2) + 'px,' + (d.sy - d.bigCy) + 'px) rotate(' + rot + 'deg) scale(' + d.ss + ')'; }

  /* Lösung einer Lückenkarte: ganzer Satz, die gesuchten Wörter hervorgehoben */
  function clozeRender(node, c) {
    var re = /\{\{(.+?)\}\}/g, q = c.q, last = 0, m;
    while ((m = re.exec(q))) {
      node.appendChild(document.createTextNode(q.slice(last, m.index)));
      node.appendChild(el('mark', 'gap', m[1]));
      last = m.index + m[0].length;
    }
    node.appendChild(document.createTextNode(q.slice(last)));
    if (c.a && c.a !== clozeWords(q).join(', ')) node.appendChild(document.createTextNode('\n\n' + c.a));
  }
  function face(kind, label, text, img, card) {
    var f = el('div', 'face paper ' + kind);
    f.appendChild(el('span', 'tag', label));
    if (kind === 'front') {
      var tm = el('div', 'timer');
      tm.appendChild(el('span', 'tnum'));
      var tb = el('div', 'tbar');
      tb.appendChild(el('i'));
      tm.appendChild(tb);
      f.appendChild(tm);
      var g = el('div', 'txt ghost', text);
      g.setAttribute('aria-hidden', 'true');
      f.appendChild(g);
    }
    var sh = el('div', 'txt sharp', text);
    if (card && kind === 'back' && hasCloze(card.q) && text === aShow(card)) { sh.textContent = ''; clozeRender(sh, card); }
    if (img) { var im = el('img', 'cimg'); im.src = img; im.alt = ''; im.draggable = false; sh.insertBefore(im, sh.firstChild); }
    f.appendChild(sh);
    return f;
  }
  function shelfT(d, rot) { return 'translate(' + (d.hx - d.W / 2) + 'px,' + (d.sy - d.bigCy) + 'px) rotate(' + rot + 'deg) scale(' + d.ss + ')'; }
  function buildEl(c) {
    var e = el('div', 'fcard');
    e.dataset.id = c.id;
    e.style.setProperty('--cc', catColor(c.cat));
    e._flipped = false;
    var fl = el('div', 'flip');
    var rv = !!S.rev[c.id];   // rückwärts: erst die Lösung, dann die Frage. Das Bild gehört immer zur Frage.
    fl.appendChild(face('front', rv ? 'Lösung' : 'Frage', rv ? aShow(c) : qShow(c), rv ? '' : c.img));
    fl.appendChild(face('back', rv ? 'Frage' : 'Lösung', rv ? qShow(c) : aShow(c), rv ? c.img : '', c));
    e.appendChild(el('div', 'glow'));
    e.appendChild(fl);
    e.appendChild(el('div', 'mark'));
    e.appendChild(el('span', 'num'));
    {
      var pb = el('button', 'pinbtn'); pb.type = 'button'; pb.tabIndex = -1;
      pb.setAttribute('aria-label', 'Karte anheften');
      pb.innerHTML = PIN_SVG;
      pb.addEventListener('mousedown', function (ev) { ev.preventDefault(); });   // Fokus bleibt auf der Karte, Leertaste dreht weiter
      e.appendChild(pb);
      e.dataset.pin = c.pin ? '1' : '';
    }
    applyMark(e);
    return e;
  }
  /* Textmarker an der Karte: Nochmal (rosa) und Später (blau). Schwere Karten bleiben auch in späteren Runden markiert. */
  var PIN_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><g fill="currentColor"><path d="M8.5 3h7l-1 6.2 3 3V14H6.5v-1.8l3-3z"/><rect x="11.2" y="14" width="1.6" height="7.5" rx=".8"/></g></svg>';
  function markOf(id) {
    var c = byId(id);
    return S.marks[id] || (c && c.last === 'bad' ? 'bad' : '');
  }
  function applyMark(e) {
    var m = markOf(e.dataset.id);
    e.dataset.mark = m;
    e.querySelector('.mark').textContent = m === 'skip' ? 'Später' : m === 'bad' ? 'Nochmal' : '';
  }
  function togglePin(id) {
    var c = byId(id);
    if (!c) return;
    if (c.pin) delete c.pin; else c.pin = true;
    if (!S.demo) { persist(); scheduleWrite(); }   // Demo bleibt im Speicher und verschwindet beim Ausschalten
    var e = S.els[id];
    if (e) { e.dataset.pin = c.pin ? '1' : ''; e.querySelector('.pinbtn').setAttribute('aria-label', c.pin ? 'Anheftung lösen' : 'Karte anheften'); }
    toast(c.pin ? 'Angeheftet' : 'Anheftung gelöst');
    renderModes();
  }

  /* Umdrehen: Karte hebt sich beim Drehen leicht an; umkehrbar und unterbrechbar */
  function flipMs() { return CFG.animation.an ? Math.round(950 / CFG.animation.tempo) : 1; }
  function setFlip(e, on) {
    if (!!e._flipped === on) return;
    e._flipped = on;
    if (on) e._flippedAt = Date.now();
    if (!e._anim) {
      e._anim = e.querySelector('.flip').animate([
        { transform: 'translateZ(0px) rotateY(0deg)' },
        { transform: 'translateZ(110px) rotateY(90deg)', offset: 0.5 },
        { transform: 'translateZ(0px) rotateY(180deg)' }
      ], { duration: flipMs(), easing: 'cubic-bezier(.45, .05, .2, 1)', fill: 'both' });
      e._anim.pause();
      e._anim.currentTime = 0;
    }
    e._anim.playbackRate = on ? 1 : -1;
    e._anim.play();
  }

  function cardNo(id) {
    var r = S.rank[id];
    if (r === undefined) return S.queue.indexOf(id) + 1;
    var n = 1;
    S.queue.forEach(function (o) { if (o !== id && S.rank[o] !== undefined && S.rank[o] < r) n++; });
    return n;
  }
  function layout() {
    var d = dims();
    var ids = S.queue.slice(0, CFG.faecher.anzahl);
    var fan = ids.filter(function (id) { return id !== S.sel; });
    var slots = fanSlots(fan.length, d.cw, d.ch, d.W);
    ids.forEach(function (id) {
      var e = S.els[id];
      if (!e) return;
      var more = S.queue.length - CFG.faecher.anzahl, pos = S.queue.indexOf(id) + 1;
      // Die Zahl gehört zur Karte: Reihenfolge beim Start, ohne die schon gelernten. Nach dem Mischen stehen die Zahlen deshalb durcheinander
      e.querySelector('.num').textContent = pos === ids.length && more > 0 ? '+' + more : cardNo(id);
      if (id === S.sel) {
        e.classList.add('sel');
        e.style.zIndex = 40;
        e.style.transform = BIGT;
      } else {
        var i = fan.indexOf(id);
        e.classList.remove('sel');
        setFlip(e, false);
        e.style.zIndex = 10 + (fan.length - 1 - i);   // vorn im Stapel = oben
        e.style.transform = fanT(slots[i], d);
      }
    });
  }
  function fill(base) {
    var d = dims(), j = 0;
    var ids = S.queue.slice(0, CFG.faecher.anzahl);
    var fresh = !Object.keys(S.els).length;   // neue Runde: fliegt vom Stapel ein. Nachrücker kommen von hinten unter dem Fächer hervor.
    var back = fanT(fanSlots(ids.length, d.cw, d.ch, d.W).slice(-1)[0] || { dx: 0, dy: 0, a: 0 }, d);
    Object.keys(S.els).forEach(function (id) {
      if (ids.indexOf(id) < 0) { S.els[id].remove(); delete S.els[id]; }
    });
    ids.forEach(function (id) {
      if (S.els[id]) return;
      var e = buildEl(byId(id));
      S.els[id] = e;
      stage.appendChild(e);
      e.style.transition = 'none';
      e.style.transform = fresh ? stackT(d, 0) : back;
      e.style.zIndex = fresh ? 20 : 5;
      void e.offsetWidth;
      e.style.transition = '';
      e.style.transitionDelay = (base + j * 90) + 'ms';
      (function (x) { setTimeout(function () { x.style.transitionDelay = ''; x.style.transition = ''; }, base + 1600); })(e);
      j++;
    });
    layout();
  }
  function clearEls() {
    stopTimer();
    Object.keys(S.els).forEach(function (id) { S.els[id].remove(); });
    S.els = {};
  }

  /* Lernstand: Karteikasten mit 5 Fächern. Gewusst = ein Fach höher und später wieder dran, Nochmal = zurück in Fach 1 */
  var DAYS = [0, 0, 1, 3, 7, 14];
  function isDue(c) { return !c.n || (c.due || 0) <= Date.now(); }
  function isHard(c) { return c.last === 'bad'; }
  function baseList() { return S.demo ? demoCards().filter(function (c) { return S.dcat === null || c.cat === S.dcat; }) : catList(); }
  function catList() { return db.cards.filter(function (c) { return S.cat === null || c.cat === S.cat; }); }
  function dayKey(t) {
    var d = t ? new Date(t) : new Date();
    return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
  }
  function streak(lg) {
    lg = lg || db.log;
    var d = new Date(), n = 0;
    if (!lg[dayKey(d)]) d.setDate(d.getDate() - 1);   // heute noch nicht gelernt: Serie zählt ab gestern
    while (lg[dayKey(d)]) { n++; d.setDate(d.getDate() - 1); }
    return n;
  }
  function updateStats() {
    var bar = $('statsBar');
    if (S.demo || !db.cards.length) { bar.hidden = true; return; }
    bar.hidden = false; bar.textContent = '';
    var list = catList(), sit = list.filter(function (c) { return c.n && c.box >= 4; }).length;
    var w = el('div', 'sw');
    w.appendChild(el('span', null, sit + ' von ' + list.length + ' sitzen'));
    var b = el('div', 'sbar'), i = el('i');
    i.style.width = (list.length ? sit / list.length * 100 : 0) + '%';
    b.appendChild(i); w.appendChild(b); bar.appendChild(w);
    var t = (db.log[dayKey()] || {}).n || 0, g = CFG.lernen.tagesziel, hit = g > 0 && t >= g, st = streak();
    bar.appendChild(el('span', 'goal' + (hit ? ' hit' : ''), 'Heute ' + t + (g ? ' / ' + g : '') + (hit ? ' ✓' : '')));
    if (S.exam) bar.appendChild(el('span', 'goal hit', 'Prüfung'));
    var sb = el('button', 'btn statbtn', 'Serie ' + st + (st === 1 ? ' Tag' : ' Tage') + ' · Statistik'); sb.type = 'button'; sb.addEventListener('click', function () { openStats(); });
    bar.appendChild(sb);
  }
  /* Zusatzfunktionen (Statistik, Tippen, Vorlesen, Kassettenplayer, Prüfung, Richtung): Der Code liegt nicht in dieser Datei, er kommt nach der Anmeldung vom Server (api/inc/pro.js). Ohne ihn tun die Platzhalter nichts. */
  var PRO = {}, PRO_EMBED = null /*PRO_EMBED*/;
  function proNeed() { toast('Das gibt es mit Konto'); if (typeof openAcc === 'function') openAcc('login'); }
  function openStats(d) { if (PRO.openStats) PRO.openStats(d); else proNeed(); }
  function typeState() { if (PRO.typeState) PRO.typeState(); else { $('typeRow').hidden = true; $('bankRow').hidden = true; } }
  function speakCard(b) { if (PRO.speakCard) PRO.speakCard(b); }
  function syncPlayer() { if (PRO.syncPlayer) PRO.syncPlayer(); else $('player').hidden = true; }
  function autoStop() { if (PRO.autoStop) PRO.autoStop(); }
  function startExam() { if (PRO.startExam) PRO.startExam(); else proNeed(); }
  var AUTO = { on: false, rand: false, t: 0, keep: false, iv: 0, end: 0, ph: '' };
  window.__kbx = (function () {
    var X = Object.create(null);
    function d(n, g, s) { Object.defineProperty(X, n, { get: g, set: s, configurable: true }); }
    d('AUTO', function () { return AUTO; }, function (v) { AUTO = v; });
    d('CFG', function () { return CFG; }, function (v) { CFG = v; });
    d('PALETTE', function () { return PALETTE; }, function (v) { PALETTE = v; });
    d('REF', function () { return REF; }, function (v) { REF = v; });
    d('S', function () { return S; }, function (v) { S = v; });
    d('aShow', function () { return aShow; }, function (v) { aShow = v; });
    d('autoStop', function () { return autoStop; }, function (v) { autoStop = v; });
    d('byId', function () { return byId; }, function (v) { byId = v; });
    d('catColor', function () { return catColor; }, function (v) { catColor = v; });
    d('catList', function () { return catList; }, function (v) { catList = v; });
    d('clozeWords', function () { return clozeWords; }, function (v) { clozeWords = v; });
    d('current', function () { return current; }, function (v) { current = v; });
    d('dayKey', function () { return dayKey; }, function (v) { dayKey = v; });
    d('db', function () { return db; }, function (v) { db = v; });
    d('demoCards', function () { return demoCards; }, function (v) { demoCards = v; });
    d('deselect', function () { return deselect; }, function (v) { deselect = v; });
    d('el', function () { return el; }, function (v) { el = v; });
    d('fill', function () { return fill; }, function (v) { fill = v; });
    d('flip', function () { return flip; }, function (v) { flip = v; });
    d('grade', function () { return grade; }, function (v) { grade = v; });
    d('hasCloze', function () { return hasCloze; }, function (v) { hasCloze = v; });
    d('next', function () { return next; }, function (v) { next = v; });
    d('norm', function () { return norm; }, function (v) { norm = v; });
    d('openStats', function () { return openStats; }, function (v) { openStats = v; });
    d('qShow', function () { return qShow; }, function (v) { qShow = v; });
    d('rebuildStudy', function () { return rebuildStudy; }, function (v) { rebuildStudy = v; });
    d('renderOptions', function () { return renderOptions; }, function (v) { renderOptions = v; });
    d('seg', function () { return seg; }, function (v) { seg = v; });
    d('select', function () { return select; }, function (v) { select = v; });
    d('show', function () { return show; }, function (v) { show = v; });
    d('speakCard', function () { return speakCard; }, function (v) { speakCard = v; });
    d('stage', function () { return stage; }, function (v) { stage = v; });
    d('startExam', function () { return startExam; }, function (v) { startExam = v; });
    d('stepper', function () { return stepper; }, function (v) { stepper = v; });
    d('stopTimer', function () { return stopTimer; }, function (v) { stopTimer = v; });
    d('streak', function () { return streak; }, function (v) { streak = v; });
    d('syncPlayer', function () { return syncPlayer; }, function (v) { syncPlayer = v; });
    d('toast', function () { return toast; }, function (v) { toast = v; });
    d('typeState', function () { return typeState; }, function (v) { typeState = v; });
    d('$', function () { return $; }, function (v) { $ = v; });
    d('PRO', function () { return PRO; });
    return X;
  })();
  function isPinned(c) { return !!c.pin; }
  function renderModes() {
    var base = baseList();
    chips($('modeChips'), [
      { v: 'alle', label: 'Alle Karten', n: base.length },
      { v: 'faellig', label: 'Fällig', n: base.filter(isDue).length },
      { v: 'schwer', label: 'Schwere', n: base.filter(isHard).length },
      { v: 'pin', label: 'Angeheftet', n: base.filter(isPinned).length }
    ], S.mode, function (v) { S.mode = v; rebuildStudy(); });
  }
  function rebuildStudy() {
    if (!AUTO.keep) autoStop();
    studyDirty = false;
    S.gen++;
    clearEls();
    // Demo ist ein eigener Stapel: er liegt nicht in deinen Karten und stört deine Rubriken nicht
    if (S.demo) {   // Demo bringt ihre eigenen Rubriken mit, nach dem Ausschalten sind sie wieder weg
      var dc = {}; demoCards().forEach(function (c) { dc[c.cat] = (dc[c.cat] || 0) + 1; });
      chips($('studyChips'), [{ v: null, label: 'Alle', n: demoCards().length }].concat(DEMO.cats.map(function (n) { return { v: n, label: n, n: dc[n] || 0, color: catColor(n) }; })), S.dcat, function (v) { S.dcat = v; rebuildStudy(); });
    } else chips($('studyChips'), catOpts(true), S.cat, function (v) { S.cat = v; rebuildStudy(); });
    $('demoSw').setAttribute('aria-checked', String(S.demo));
    var base = baseList();
    renderModes();
    var mode = S.mode;
    S.list = mode === 'faellig' ? base.filter(isDue) : mode === 'schwer' ? base.filter(isHard) : mode === 'pin' ? base.filter(isPinned) : base;
    S.queue = S.list.map(function (c) { return c.id; });
    if (mode === 'faellig') S.queue.sort(function (x, y) { return (byId(x).box || 1) - (byId(y).box || 1); });
    if (CFG.lernen.mischen) shuffleArr(S.queue);
    if (S.examNext && !S.demo) {   // Prüfung: zufällige Karten, ohne Wiederholung, am Ende gibt es eine Note
      shuffleArr(S.queue); S.queue = S.queue.slice(0, CFG.lernen.pruefung);
      var inQ = {}; S.queue.forEach(function (id) { inQ[id] = 1; });
      S.list = S.list.filter(function (c) { return inQ[c.id]; });
      S.exam = { ok: 0, bad: 0, t0: Date.now() };
    } else S.exam = null;
    S.examNext = false;
    var dr = PRO.direction ? PRO.direction() : 'vor';
    S.rev = {};
    S.list.forEach(function (c) { S.rev[c.id] = !hasCloze(c.q) && (dr === 'rueck' || (dr === 'misch' && Math.random() < 0.5)); });
    S.total = S.list.length; S.done = 0; S.sel = null; S.round = { ok: 0, bad: 0 }; S.marks = {}; S.shelf = [];
    S.rank = {}; S.queue.forEach(function (id, i) { S.rank[id] = i; });
    var has = S.list.length > 0;
    var filtered = !has && base.length > 0;   // Karten gibt es, nur der Filter ist leer
    $('studyEmpty').hidden = has;
    $('emptyMsg').textContent = filtered ? (mode === 'faellig' ? 'Heute ist nichts mehr fällig. Alles sitzt.' : mode === 'pin' ? 'Noch keine Karte angeheftet. Tippe bei einer geöffneten Karte auf die Pinnadel.' : 'Keine schweren Karten. Gut gemacht.')
      : db.cards.length ? 'In dieser Rubrik gibt es noch keine Karten.' : 'Noch keine Karten. Lege deine erste an oder sieh dir die Demo an.';
    $('modeAllBtn').hidden = !filtered;
    $('studyEmpty').querySelectorAll('[data-goto], #demoBtn2').forEach(function (b) { b.hidden = filtered; });
    updateStats();
    stage.hidden = !has;
    typeState();
    if (has && $('dock').hidden) accIntro = true;   // Karten erscheinen (Demo oder erste Karte): Zubehör rutscht ein
    $('dock').hidden = !has;
    syncPlayer();
    $('steps').hidden = !has;
    $('keysHint').hidden = !has || !CFG.lernen.tastatur;
    $('studyControls').hidden = !has;
    $('endBox').hidden = true;
    if (!has) return;
    fill(0);
    renderPile(); renderShelf();
    updateUI();
    var dkf = document.querySelector('.dock');
    var phone = dkf && window.innerWidth < 760 && getComputedStyle(dkf).position === 'sticky';
    if (dkf && (dkf.classList.contains('free') || phone)) {   // niedriges Fenster: so weit scrollen, dass der Fächer ganz zu sehen ist (Handy: über der festen Leiste)
      var want = stage.getBoundingClientRect().bottom + window.pageYOffset + 16 + (phone ? dkf.offsetHeight : 0) - window.innerHeight;
      if (want > window.pageYOffset) window.scrollTo({ top: want, behavior: CFG.animation.an ? 'smooth' : 'auto' });
    }
  }
  function renderPile() {
    var p = $('pile');
    p.textContent = '';
    var L = Math.min(S.done, 3) + 1;
    for (var j = L - 1; j >= 0; j--) {
      var l = el('div', 'pl paper');
      if (j > 0) l.style.transform = 'translate(' + (-j * 3) + 'px,' + (j * 3) + 'px) rotate(' + ((j % 2 ? -1 : 1) * j * 1.5) + 'deg)';
      else l.appendChild(el('span', null, S.done + ' / ' + S.total));
      p.appendChild(l);
    }
  }
  /* Ablage links oben: Hier landen Karten mit Weiter und Nochmal. Ein Klick holt sie zurück in den Fächer. */
  function renderShelf() {
    var p = $('shelf');
    p.textContent = '';
    p.hidden = !S.shelf.length;
    var show = S.shelf.slice(-3);
    show.forEach(function (id, j) {   // Karten liegen gestapelt, ein Streifen Klebeband mit „Ablage“ klebt darüber
      var c = byId(id), sc = el('div', 'sc'), depth = show.length - 1 - j;
      sc.dataset.mark = S.marks[id] || '';
      sc.dataset.pin = c && c.pin ? '1' : '';
      if (depth > 0) sc.style.transform = 'translate(' + (-depth * 3) + 'px,' + (depth * 3) + 'px) rotate(' + ((depth % 2 ? -1 : 1) * depth * 1.5) + 'deg)';
      p.appendChild(sc);
    });
    p.appendChild(el('span', 'tape', 'Ablage ' + S.shelf.length));
    p.setAttribute('aria-label', 'Ablage mit ' + S.shelf.length + ' Karten, zurück in den Fächer holen');
  }
  /* Ablage zurück: Die Karten kommen vor den Rest der Runde */
  function recall() {
    if (!S.shelf.length) return;
    S.queue = S.shelf.concat(S.queue);
    S.shelf = [];
    S.sel = null; stopTimer();
    clearEls();
    $('endBox').hidden = true;
    renderShelf();
    fill(0);
    updateUI();
  }
  function updateUI() {
    var e = S.sel && S.els[S.sel];
    var run = !!(e && TM.id === S.sel);
    $('flipBtn').disabled = !e || run;
    $('nextBtn').disabled = !e;
    var fl = !!(e && e._flipped);
    $('nextBtn').hidden = fl; $('badBtn').hidden = !fl; $('okBtn').hidden = !fl;
    $('flipBtn').textContent = run ? 'Countdown läuft' : e && e._flipped ? 'Frage zeigen' : 'Lösung zeigen';
    var step = !e ? 0 : (e._flipped ? 2 : 1);
    document.querySelectorAll('#steps li').forEach(function (li, i) {
      li.classList.toggle('now', i === step);
      li.classList.toggle('done', i < step);
    });
    $('slot').classList.toggle('off', !!S.sel || !S.queue.length);
    $('lcdN').textContent = S.done + '/' + S.total;   // Anzeige des Taschenrechners
    typeState();
  }
  /* Countdown: läuft, solange die Frage gezeigt wird; bei 0 dreht sich die Karte zur Lösung */
  var TM = { id: null, end: 0, iv: 0 };
  function stopTimer() {
    clearInterval(TM.iv); TM.iv = 0;
    var e = TM.id && S.els[TM.id];
    if (e) e.classList.remove('timed');
    TM.id = null;
  }
  function tickTimer() {
    var e = TM.id && S.els[TM.id];
    if (!e) { stopTimer(); return; }
    var total = CFG.lernen.sekunden * 1000, left = Math.max(0, TM.end - Date.now());
    e.querySelector('.tnum').textContent = Math.ceil(left / 1000) + ' s';
    e.querySelector('.tbar i').style.width = (left / total * 100) + '%';
    e.querySelector('.timer').classList.toggle('low', left <= 5000);
    if (left <= 0) { stopTimer(); setFlip(e, true); updateUI(); speakCard(true); }
  }
  function startTimer(id) {
    stopTimer();
    var e = S.els[id];
    if (!CFG.lernen.timer || !e || e._flipped) return;
    TM.id = id; TM.end = Date.now() + CFG.lernen.sekunden * 1000;
    e.classList.add('timed');
    tickTimer();
    TM.iv = setInterval(tickTimer, 100);
  }
  function select(id) {
    var ae = document.activeElement;   // Fokus von Schaltern wie Demo löst, sonst schaltet die Leertaste statt die Karte zu drehen
    if (ae && ae !== document.body && ae.tagName === 'BUTTON' && !stage.contains(ae)) ae.blur();
    S.sel = id; layout(); startTimer(id);
    $('typeIn').value = ''; $('typeRes').textContent = ''; $('typeRes').className = '';
    updateUI();
    if (CFG.lernen.tippen && !(window.matchMedia && matchMedia('(pointer: coarse)').matches)) $('typeIn').focus();
    speakCard(false);
  }
  function deselect() { if (!S.sel) return; try { window.speechSynthesis && speechSynthesis.cancel(); } catch (e) {} stopTimer(); S.sel = null; layout(); updateUI(); }
  function flip() {
    if (!S.sel || TM.id === S.sel) return; // solange der Countdown läuft, dreht nur er die Karte
    var e = S.els[S.sel];
    setFlip(e, !e._flipped);
    if (e._flipped) stopTimer();
    updateUI();
    if (e._flipped) speakCard(true);
  }
  function next() {
    if (!S.sel) return;
    stopTimer();
    var id = S.sel, e = S.els[id], gen = S.gen;
    S.sel = null;
    S.queue = S.queue.filter(function (x) { return x !== id; });
    S.done++;
    delete S.els[id];
    var d = dims();
    e.classList.remove('sel');
    e.classList.add('leaving');
    e.style.zIndex = 20;
    e.style.transform = stackT(d, 7);
    fill(250);
    updateUI();
    var ms = CFG.animation.an ? Math.round(900 / CFG.animation.tempo) : 30;
    setTimeout(function () {
      e.remove();
      if (gen !== S.gen) return;
      renderPile();
      if (!S.queue.length && S.shelf.length) { recall(); return; }
      if (!S.queue.length) {
        $('endMsg').textContent = S.exam ? examText() : 'Alle Karten geschafft.' + (S.round.ok + S.round.bad ? ' Gewusst: ' + S.round.ok + ', Nochmal: ' + S.round.bad + '.' : '');
        $('examBtn').hidden = S.demo;
        $('endBox').hidden = false;
      }
      updateUI();
    }, ms);
  }
  /* Weiter ohne Lösung und Nochmal: Die Karte fliegt in die Ablage (links oben), nicht auf den Gewusst-Stapel. Ist die Runde leer, kommt die Ablage von selbst zurück. */
  /* Auto-Modus: Frage zeigen, drehen, weiter. Zählt nicht als Lernen, die Fächer bleiben unverändert. */
  function putBack(kind) {
    if (!S.sel) return;
    stopTimer();
    var id = S.sel, e = S.els[id], gen = S.gen, d = dims();
    S.sel = null;
    S.marks[id] = kind;
    S.queue = S.queue.filter(function (x) { return x !== id; });
    S.shelf.push(id);
    delete S.els[id];
    applyMark(e);
    e.classList.remove('sel');
    e.classList.add('leaving');
    e.style.zIndex = 20;
    e.style.transform = shelfT(d, -7);
    fill(250);
    updateUI();
    var ms = CFG.animation.an ? Math.round(900 / CFG.animation.tempo) : 30;
    setTimeout(function () {
      e.remove();
      if (gen !== S.gen) return;
      renderShelf();
      if (!S.queue.length) recall();
      updateUI();
    }, ms);
  }
  function examText() {
    var x = S.exam, n = x.ok + x.bad, p = n ? x.ok / n * 100 : 0, note = p >= 92 ? 1 : p >= 81 ? 2 : p >= 67 ? 3 : p >= 50 ? 4 : p >= 30 ? 5 : 6;
    var sec = Math.round((Date.now() - x.t0) / 1000);
    return 'Prüfung: ' + x.ok + ' von ' + n + ' richtig. Note ' + note + '. Zeit ' + Math.floor(sec / 60) + ':' + ('0' + sec % 60).slice(-2) + '.';
  }
  function rate(ok) {
    if (!S.sel || TM.id === S.sel) return;
    var id = S.sel, c = byId(id);
    if (c) {
      c.n = (c.n || 0) + 1;
      c.last = ok ? 'ok' : 'bad';
      c.miss = ok ? 0 : Math.min(99, (c.miss || 0) + 1);
      c.box = ok ? Math.min(5, (c.box || 1) + 1) : 1;
      c.due = ok ? Date.now() + DAYS[c.box] * 864e5 : 0;
    }
    if (c && !S.demo) {
      var k = dayKey(), L = db.log[k] || (db.log[k] = { n: 0, ok: 0 });
      L.n++; if (ok) L.ok++;
      (L.c || (L.c = [])).push([id, ok ? 1 : 0]); if (L.c.length > 400) L.c.shift();
      persist(); scheduleWrite();
      if (CFG.lernen.tagesziel && L.n === CFG.lernen.tagesziel) toast('Tagesziel erreicht');
    }
    S.round[ok ? 'ok' : 'bad']++;
    if (S.exam) S.exam[ok ? 'ok' : 'bad']++;
    if (ok || S.exam) { delete S.marks[id]; next(); } else putBack('bad');
    updateStats(); renderModes();
  }
  function shuffle() {
    if (S.queue.length < 2) return;
    shuffleArr(S.queue);
    S.sel = null;
    clearEls();
    fill(0);
    updateUI();
    toast('Gemischt');
  }

  stage.addEventListener('click', function (e) {
    if (e.target.closest('#endBox, #player')) return;
    var f = e.target.closest('.fcard');
    if (!f) { deselect(); return; }
    var id = f.dataset.id;
    if (!S.els[id]) return;
    if (e.target.closest('.pinbtn') && S.sel === id) { togglePin(id); return; }
    if (S.sel !== id) { select(id); return; }
    var c = S.els[id];
    if (TM.id === id) return;
    if (!c._flipped) flip();
    // Lösung angeklickt: Karte verschwindet hinter den Stapel (erst, wenn die Drehung fast fertig ist)
    else if (Date.now() - (c._flippedAt || 0) > flipMs() * 0.85) rate(true);
  });
  $('flipBtn').addEventListener('click', flip);
  $('nextBtn').addEventListener('click', function () { putBack('skip'); });
  $('okBtn').addEventListener('click', function () { rate(true); });
  $('badBtn').addEventListener('click', function () { rate(false); });
  $('modeAllBtn').addEventListener('click', function () { S.mode = 'alle'; rebuildStudy(); });
  $('shuffleBtn').addEventListener('click', shuffle);
  $('shelf').addEventListener('click', recall);
  $('newRound').addEventListener('click', rebuildStudy);
  $('examBtn').addEventListener('click', startExam);
  var resizeT = 0;
  window.addEventListener('resize', function () {   // gebündelt: höchstens ein Neuaufbau pro Frame
    cancelAnimationFrame(resizeT);
    resizeT = requestAnimationFrame(function () {
      if (current === 'study' && !stage.hidden) layout();
      if (current === 'opts') renderDrawing();
    });
  });
  document.addEventListener('keydown', function (e) {
    if (current !== 'study' || stage.hidden || !CFG.lernen.tastatur || document.querySelector('dialog[open]')) return;
    var t = e.target, tag = t.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    var onBtn = t.closest && t.closest('button');
    // Fokus auf einem Knopf: Leertaste/Enter lösen den Knopf selbst aus (außer bei den Tabs)
    if (onBtn && !t.closest('.tab') && (e.code === 'Space' || e.key === 'Enter')) return;
    if (onBtn && t.closest('.tab')) t.blur();
    if (e.code === 'Space') { e.preventDefault(); flip(); }
    else if (e.key === 'ArrowRight' || e.key === 'Enter') { var ce = S.sel && S.els[S.sel]; if (ce && ce._flipped) rate(true); else putBack('skip'); }
    else if (e.key === 'p' || e.key === 'P') { if (S.sel) togglePin(S.sel); }
    else if (e.key === 'ArrowLeft') { var cb = S.sel && S.els[S.sel]; if (cb && cb._flipped) rate(false); }
    else if (e.key === 'Escape') deselect();
    else if (e.key >= '1' && e.key <= '7') { var id = S.queue[Number(e.key) - 1]; if (id && S.els[id]) select(id); }
  });

  /* ===== Neue Karte ===== */
  var addCat = null;
  function renderAddChips() {
    if (db.cats.indexOf(addCat) < 0) addCat = (S.cat && db.cats.indexOf(S.cat) >= 0) ? S.cat : db.cats[0];
    chips($('addChips'), catOpts(false), addCat, function (v) { addCat = v; renderAddChips(); }, {
      label: '+ Neue Rubrik',
      fn: function () { askName('Neue Rubrik', '', function (n, col) { var e = createCat(n, col); if (!e) { addCat = n; renderAddChips(); } return e; }); }
    });
  }
  /* Bild zur Frage: wird auf höchstens 640 px verkleinert und als JPEG in der Karte gespeichert (nichts wird hochgeladen) */
  function imgFromFile(file, cb) {
    if (!file || !/^image\//.test(file.type)) { toast('Das ist kein Bild'); return; }
    var url = URL.createObjectURL(file), im = new Image();
    im.onload = function () {
      var k = Math.min(1, 640 / Math.max(im.width, im.height)), cv = document.createElement('canvas');
      cv.width = Math.max(1, Math.round(im.width * k)); cv.height = Math.max(1, Math.round(im.height * k));
      var cx = cv.getContext('2d'); cx.fillStyle = '#fff'; cx.fillRect(0, 0, cv.width, cv.height); cx.drawImage(im, 0, 0, cv.width, cv.height);
      URL.revokeObjectURL(url);
      var d = cv.toDataURL('image/jpeg', 0.78);
      if (okImg(d)) cb(d); else toast('Das Bild ist zu groß');
    };
    im.onerror = function () { URL.revokeObjectURL(url); toast('Das Bild konnte nicht gelesen werden'); };
    im.src = url;
  }
  var picks = {};
  function imgPicker(pre, ta) {   // pre: 'new' oder 'edit', ta: Textfeld, in das man ein Bild einfügen kann
    var p = picks[pre] = { img: '' };
    function show() {
      $(pre + 'ImgPrev').hidden = !p.img; $(pre + 'ImgDel').hidden = !p.img;
      if (p.img) $(pre + 'ImgPrev').src = p.img;
      $(pre + 'ImgBtn').textContent = p.img ? 'Bild ändern' : 'Bild zur Frage';
    }
    p.show = show;
    $(pre + 'ImgBtn').addEventListener('click', function () { $(pre + 'ImgFile').click(); });
    $(pre + 'ImgFile').addEventListener('change', function (e) {
      imgFromFile(e.target.files[0], function (d) { p.img = d; show(); });
      e.target.value = '';
    });
    $(pre + 'ImgDel').addEventListener('click', function () { p.img = ''; show(); });
    $(ta).addEventListener('paste', function (e) {
      var f = Array.prototype.filter.call((e.clipboardData && e.clipboardData.files) || [], function (x) { return /^image\//.test(x.type); })[0];
      if (f) { e.preventDefault(); imgFromFile(f, function (d) { p.img = d; show(); }); }
    });
  }
  imgPicker('new', 'newQ'); imgPicker('edit', 'editQ');
  function dupOf(q, exceptId) {
    var k = flat(hasCloze(q) ? q.replace(/\{\{(.+?)\}\}/g, '$1') : q);
    return db.cards.filter(function (c) { return c.id !== exceptId && flat(hasCloze(c.q) ? c.q.replace(/\{\{(.+?)\}\}/g, '$1') : c.q) === k; })[0] || null;
  }
  /* Lücke-Knopf: Wort markieren (oder nur antippen) und Knopf drücken. Das Wort wird in {{ }} gesetzt, darunter Vorschau der Vorderseite */
  function clozeTool(qId, btnId, prevId) {
    var q = $(qId), b = $(btnId), pv = $(prevId), WORD = /[\p{L}\p{N}_'’-]/u;
    function range() {
      var v = q.value, s = q.selectionStart, e = q.selectionEnd;
      if (s === e) {                       /* nur angetippt: Wort unter dem Cursor nehmen */
        while (s > 0 && WORD.test(v.charAt(s - 1))) s--;
        while (e < v.length && WORD.test(v.charAt(e))) e++;
      } else {                             /* markiert: Leerzeichen am Rand abschneiden */
        while (s < e && /\s/.test(v.charAt(s))) s++;
        while (e > s && /\s/.test(v.charAt(e - 1))) e--;
      }
      return e > s ? [s, e] : null;
    }
    function taken(v, r) {                 /* liegt die Auswahl in oder an einer bestehenden Lücke? */
      var re = /\{\{.+?\}\}/g, m;
      while ((m = re.exec(v))) if (r[0] < m.index + m[0].length && r[1] > m.index) return true;
      return /[{}]/.test(v.slice(r[0], r[1]));
    }
    function upd() {
      var v = q.value, r = range(), inCloze = !!r && taken(v, r);
      b.classList.toggle('primary', !!r && !inCloze);
      pv.hidden = !hasCloze(v); if (hasCloze(v)) pv.textContent = 'Vorderseite: ' + qShow({ q: v });
    }
    b.addEventListener('mousedown', function (e) { e.preventDefault(); });
    b.addEventListener('click', function () {
      var v = q.value, r = range();
      if (!r) { toast('Tippe auf ein Wort oder markiere es'); q.focus(); return; }
      var sel = v.slice(r[0], r[1]);
      if (taken(v, r)) { toast('Dieses Wort ist schon eine Lücke'); q.focus(); return; }
      q.value = v.slice(0, r[0]) + '{{' + sel + '}}' + v.slice(r[1]);
      var pos = r[0] + sel.length + 4; q.focus(); q.setSelectionRange(pos, pos); upd();
    });
    ['input', 'keyup', 'mouseup', 'touchend', 'select', 'focus'].forEach(function (ev) { q.addEventListener(ev, upd); });
    document.addEventListener('selectionchange', function () { if (document.activeElement === q) upd(); });
  }
  clozeTool('newQ', 'newClozeBtn', 'newClozePrev'); clozeTool('editQ', 'editClozeBtn', 'editClozePrev');

  /* Passwortfelder: Augen-Knopf zum Anzeigen. Das Feld bleibt dasselbe (id, Label, Passwortmanager), nur der Typ wechselt. */
  (function pwToggle() {
    var EYE = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>';
    var OFF = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.6-7 10-7c2 0 3.8.6 5.3 1.5M22 12s-3.6 7-10 7c-2 0-3.8-.6-5.3-1.5"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/><path d="M3 3l18 18"/></svg>';
    function set(inp, btn, show) {
      inp.type = show ? 'text' : 'password';
      btn.innerHTML = show ? OFF : EYE;
      btn.setAttribute('aria-pressed', show ? 'true' : 'false');
      btn.setAttribute('aria-label', show ? 'Passwort verbergen' : 'Passwort anzeigen');
      btn.title = show ? 'Passwort verbergen' : 'Passwort anzeigen';
    }
    var all = [];
    document.querySelectorAll('input[type="password"]').forEach(function (inp) {
      var box = document.createElement('span'); box.className = 'pwbox';
      var btn = document.createElement('button'); btn.type = 'button'; btn.className = 'pweye';
      inp.parentNode.insertBefore(box, inp); box.appendChild(inp); box.appendChild(btn);
      set(inp, btn, false);
      btn.addEventListener('click', function () { set(inp, btn, inp.type === 'password'); inp.focus(); });
      all.push([inp, btn]);
    });
    function hideAll() { all.forEach(function (x) { if (x[0].type !== 'password') set(x[0], x[1], false); }); }
    document.addEventListener('close', hideAll, true);   // Dialog zu: Passwörter wieder verdecken
    document.addEventListener('submit', hideAll, true);
  })();
  function resetAdd() {
    $('newQ').value = ''; $('newQ').dispatchEvent(new Event('input'));
    $('newA').value = '';
    $('newTags').value = '';
    picks.new.img = ''; picks.new.show();
    $('step1').hidden = false;
    $('step2').hidden = true;
    $('p1').classList.add('on');
    $('p2').classList.remove('on');
  }
  $('newQ').addEventListener('input', function () { $('toStep2').textContent = hasCloze($('newQ').value) ? 'Weiter' : 'Weiter zur Lösung'; });
  $('toStep2').addEventListener('click', function () {
    if (!$('newQ').value.trim()) { toast('Bitte zuerst eine Frage eingeben'); $('newQ').focus(); return; }
    var cz = hasCloze($('newQ').value);   // Lückentext: Die Lösung steckt in den Lücken, die App zeigt grün oder rot
    $('newA').hidden = cz; $('newA').placeholder = 'Die Lösung';
    $('step2Lbl').textContent = cz ? '2. Tags (kein Muss)' : '2. Lösung';
    $('step1').hidden = true;
    $('step2').hidden = false;
    $('p2').classList.add('on');
    (cz ? $('newTags') : $('newA')).focus();
  });
  $('backStep1').addEventListener('click', function () {
    $('step2').hidden = true;
    $('step1').hidden = false;
    $('p2').classList.remove('on');
    $('newQ').focus();
  });
  $('saveCard').addEventListener('click', function () {
    var q = $('newQ').value.trim(), a = hasCloze(q) ? '' : $('newA').value.trim();
    if (!a && !hasCloze(q)) { toast('Bitte eine Lösung eingeben'); $('newA').focus(); return; }
    function doSave() {
      var c = { id: uid(), q: q, a: a || clozeWords(q).join(', '), cat: addCat }, tg = parseTags($('newTags').value);
      if (tg.length) c.tags = tg;
      if (picks.new.img) c.img = picks.new.img;
      db.cards.push(c);
      save();
      renderAddChips();
      toast('Gespeichert in „' + addCat + '“');
      resetAdd();
      $('newQ').focus();
    }
    var d = dupOf(q);
    if (d) confirmDlg('Gibt es schon', 'Diese Frage steht schon in „' + d.cat + '“. Trotzdem speichern?', doSave, 'Speichern', false);
    else doSave();
  });
  $('newQ').addEventListener('keydown', function (e) { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) $('toStep2').click(); });
  $('newA').addEventListener('keydown', function (e) { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) $('saveCard').click(); });

  /* ===== Alle Karten ===== */
  var listCat = null;
  $('listSearch').addEventListener('input', function () { renderList(); });
  function renderListChips() {
    chips($('listChips'), catOpts(true), listCat, function (v) { listCat = v; renderListChips(); renderList(); });
  }
  function renderList() {
    var list = $('list');
    list.textContent = '';
    var term = flat($('listSearch').value);
    var items = db.cards.filter(function (c) {
      return (listCat === null || c.cat === listCat) && (!term || flat([c.q, c.a, c.cat].concat(c.tags || []).join(' ')).indexOf(term) >= 0);
    });
    if (!items.length) { list.appendChild(el('div', 'empty', term ? 'Nichts gefunden.' : 'Keine Karten.')); return; }
    items.forEach(function (c) {
      var item = el('div', 'item');
      var box = el('div', 'txtbox');
      var cp = el('p', 'cat', c.cat), cd = el('i', 'dot'); cd.style.background = catColor(c.cat); cp.insertBefore(cd, cp.firstChild);
      box.appendChild(cp);
      box.appendChild(el('p', 'q', c.q));
      box.appendChild(el('p', 'a', c.a));
      if (c.img) { var th = el('img', 'thumb'); th.src = c.img; th.alt = 'Bild zur Frage'; box.appendChild(th); }
      if (c.tags && c.tags.length) {
        var tl = el('p', 'tags');
        c.tags.forEach(function (t) {
          var tb = el('button', 'tagpill', '#' + t); tb.type = 'button';
          tb.addEventListener('click', function () { $('listSearch').value = t; renderList(); });
          tl.appendChild(tb);
        });
        box.appendChild(tl);
      }
      if (c.miss >= 3) box.appendChild(el('p', 'warn', 'Nochmal ×' + c.miss + ' in Folge. Karte überarbeiten?'));
      var acts = el('div', 'acts');
      var eb = el('button', 'btn', 'Ändern'); eb.type = 'button';
      eb.addEventListener('click', function () { openEdit(c.id); });
      var del = el('button', 'btn danger', 'Löschen'); del.type = 'button';
      del.addEventListener('click', function () {
        confirmDlg('Karte löschen?', c.q, function () {
          db.cards = db.cards.filter(function (x) { return x.id !== c.id; });
          save(); renderListChips(); renderList(); toast('Karte gelöscht');
        });
      });
      acts.appendChild(eb); acts.appendChild(del);
      item.appendChild(box); item.appendChild(acts);
      list.appendChild(item);
    });
  }

  var editId = null, editCat = null;
  function renderEditChips() {
    chips($('editChips'), catOpts(false), editCat, function (v) { editCat = v; renderEditChips(); });
  }
  function openEdit(id) {
    var c = byId(id);
    if (!c) return;
    editId = id; editCat = c.cat;
    renderEditChips();
    $('editQ').value = c.q; $('editQ').dispatchEvent(new Event('input'));
    $('editA').value = c.a; syncEditA();
    $('editTags').value = (c.tags || []).join(', ');
    picks.edit.img = c.img || ''; picks.edit.show();
    $('editDlg').showModal();
  }
  function syncEditA() { var cz = hasCloze($('editQ').value); $('editA').hidden = cz; $('editALbl').hidden = cz; }
  $('editQ').addEventListener('input', syncEditA);
  $('editCancel').addEventListener('click', function () { $('editDlg').close(); });
  $('editSave').addEventListener('click', function () {
    var q = $('editQ').value.trim(), a = hasCloze(q) ? '' : $('editA').value.trim();
    if (!q || (!a && !hasCloze(q))) { toast(hasCloze(q) ? 'Die Frage darf nicht leer sein' : 'Frage und Lösung dürfen nicht leer sein'); return; }
    var c = byId(editId);
    if (c) {
      c.q = q; c.a = a || clozeWords(q).join(', '); c.cat = editCat;
      var tg = parseTags($('editTags').value);
      if (tg.length) c.tags = tg; else delete c.tags;
      if (picks.edit.img) c.img = picks.edit.img; else delete c.img;
      save(); renderListChips(); renderList();
    }
    $('editDlg').close();
    toast('Karte geändert');
  });

  /* Demo: 10 Karten für Klasse 7 bis 10 (dieselben wie in demo-karten.json) */
  var DEMO = {"version": 2, "cats": ["Mathe", "Physik", "Chemie", "Biologie", "Geschichte", "Erdkunde"], "cards": [{"id": "demo01", "cat": "Mathe", "q": "Wie lautet der Satz des Pythagoras?", "a": "In einem rechtwinkligen Dreieck gilt a² + b² = c². c ist die Hypotenuse, also die Seite gegenüber dem rechten Winkel."}, {"id": "demo02", "cat": "Mathe", "q": "Löse die Gleichung 3x + 5 = 20.", "a": "Erst 5 abziehen: 3x = 15. Dann durch 3 teilen: x = 5."}, {"id": "demo03", "cat": "Mathe", "q": "Wie berechnet man den Flächeninhalt eines Kreises mit dem Radius r?", "a": "A = π · r². Beispiel: r = 3 cm ergibt etwa 28,3 cm²."}, {"id": "demo04", "cat": "Physik", "q": "Wie berechnet man die Geschwindigkeit?", "a": "v = s : t (Strecke geteilt durch Zeit). 120 km in 2 Stunden ergeben 60 km/h."}, {"id": "demo05", "cat": "Physik", "q": "Wie lautet das Ohmsche Gesetz?", "a": "U = R · I (Spannung = Widerstand mal Stromstärke). Bei 20 Ω und 0,5 A sind das 10 V."}, {"id": "demo06", "cat": "Chemie", "q": "Wie lauten die chemischen Formeln von Wasser und Kohlenstoffdioxid?", "a": "Wasser: H₂O. Kohlenstoffdioxid: CO₂."}, {"id": "demo07", "cat": "Biologie", "q": "Was passiert bei der Fotosynthese?", "a": "Pflanzen bilden mit Lichtenergie aus Wasser und Kohlenstoffdioxid Traubenzucker (Glucose) und Sauerstoff. Das geschieht in den Chloroplasten."}, {"id": "demo08", "cat": "Geschichte", "q": "Wann fiel die Berliner Mauer und wann wurde Deutschland wiedervereinigt?", "a": "Die Mauer fiel am 9. November 1989. Die Wiedervereinigung war am 3. Oktober 1990."}, {"id": "demo09", "cat": "Geschichte", "q": "Wann begann der Erste Weltkrieg und was war der Auslöser?", "a": "1914. Auslöser war das Attentat von Sarajevo auf den österreichischen Thronfolger Franz Ferdinand."}, {"id": "demo10", "cat": "Erdkunde", "q": "Wie heißt die Hauptstadt von Kanada?", "a": "Ottawa. Nicht Toronto und nicht Montreal."}]};
  var DEMOCARDS = null;
  function demoCards() {
    if (!DEMOCARDS) DEMOCARDS = parseData(DEMO).cards.map(function (c, i) { return { id: 'demo' + (i + 1), q: c.q, a: c.a, cat: c.cat }; });
    return DEMOCARDS;
  }
  /* Beim Wechseln fliegen die alten Karten nacheinander hinter den Stapel, danach kommen die neuen aus dem Stapel */
  var leaveTok = 0;
  function leaveAll(done) {
    var ids = Object.keys(S.els);
    if (!ids.length || !CFG.animation.an) { done(); return; }
    stopTimer(); S.sel = null;
    var d = dims();
    ids.forEach(function (id, i) {
      var e = S.els[id];
      e.classList.remove('sel');
      e.classList.add('leaving');
      e.style.transitionDelay = Math.round(i * 80 / CFG.animation.tempo) + 'ms';
      e.style.zIndex = 20;
      e.style.transform = stackT(d, (i % 2 ? -1 : 1) * 6);
    });
    updateUI();
    setTimeout(done, Math.round((900 + ids.length * 80) / CFG.animation.tempo));
  }
  function setDemo(on) {
    S.demo = on;
    S.mode = 'alle'; S.dcat = null;
    DEMOCARDS = null;   // Demo startet jedes Mal frisch ohne Pins und Marker
    $('demoSw').setAttribute('aria-checked', String(on));
    toast(on ? 'Demo an' : 'Demo aus');
    var tok = ++leaveTok;
    var go = function () { if (tok !== leaveTok) return; var h0 = padH(); studyDirty = true; show('study'); padMorph(h0); };
    if (current === 'study' && !stage.hidden) {   // Karten fliegen weg, das Zubehör rutscht unter die Unterlage, dann baut sich alles neu auf
      var open = 2, one = function () { if (--open === 0) go(); };
      leaveAll(one); accOut().then(one);
    } else go();
  }
  $('demoSw').addEventListener('click', function () { setDemo(!S.demo); });
  $('demoBtn2').addEventListener('click', function () { setDemo(true); });

  /* Sichern / Laden von Hand */
  /* Speichern: im verbundenen Ordner. Ohne Ordner fragt die Seite danach (Chrome, Edge) oder lädt die Datei mit dem richtigen Namen herunter. */
  function savedHint(names) {
    confirmDlg('Datei in den Ordner legen', names + ' liegt jetzt im Download-Ordner. Verschiebe sie in den Ordner, in dem karteikarten.html liegt. Nur dort findet die Seite sie.', function () {}, 'Verstanden', false);
  }
  function saveToFolder(kind) {
    var what = kind === 'cfg' ? 'Einstellungen' : 'Karten';
    if (FL.supported && FL.state === 'ok') {
      writeFile().then(function () { if (FL.state === 'ok') toast(what + ' gespeichert im Ordner „' + FL.name + '“'); });
    } else if (FL.supported) {
      confirmDlg(what + ' speichern', 'Wähle den Ordner, in dem karteikarten.html liegt. Dort speichert die Seite ' + (kind === 'cfg' ? 'einstellungen.js' : 'karteikarten.json und karteikarten.js') + ' und aktualisiert sie bei jeder Änderung.', fileConnect, 'Ordner wählen', false);
    } else if (kind === 'cfg') {
      download(F_CFG, cfgText(), 'text/javascript'); savedHint('einstellungen.js');
    } else {
      download(F_JS, cardsJs(db), 'text/javascript'); savedHint('karteikarten.js');
    }
  }
  $('exportBtn').addEventListener('click', function () { saveToFolder('cards'); });
  /* Teilen: nur Fragen, Antworten und Rubriken, ohne deinen Lernstand */
  function shareData() {
    var used = {};
    var cards = db.cards.map(function (c) { used[c.cat] = 1; var o = { cat: c.cat, q: c.q, a: c.a }; if (c.tags) o.tags = c.tags; if (c.img) o.img = c.img; return o; });
    var uc = db.cats.filter(function (c) { return used[c]; }), cl = {}; uc.forEach(function (c) { cl[c] = db.colors[c]; });
    return { version: 2, cats: uc, colors: cl, cards: cards };
  }
  function shareFallback(text) {
    download('karteikarten.json', text, 'application/json');
    confirmDlg('Datei teilen', 'karteikarten.json liegt jetzt im Download-Ordner. Hänge sie an eine E-Mail oder schicke sie per Discord. Wer sie bekommt, nutzt „Karten laden“.', function () {}, 'Verstanden', false);
  }
  $('shareBtn').addEventListener('click', function () {
    if (!db.cards.length) { toast('Noch keine Karten zum Teilen'); return; }
    var text = JSON.stringify(shareData(), null, 2), file = null;
    // Manche Handys teilen JSON nicht als Datei, Text geht überall: gleicher Name, anderer Typ
    try {
      [new File([text], 'karteikarten.json', { type: 'application/json' }), new File([text], 'karteikarten.json', { type: 'text/plain' })].some(function (f) {
        if (navigator.canShare && navigator.canShare({ files: [f] })) { file = f; return true; }
      });
    } catch (e) {}
    if (!file || !navigator.share) { shareFallback(text); return; }
    navigator.share({ files: [file], title: 'KarteiDeck Karten' })
      .catch(function (e) { if (!e || e.name !== 'AbortError') shareFallback(text); });
  });
  $('importBtn').addEventListener('click', function () { $('importFile').click(); });
  /* Tabellen lesen: CSV, Tab-getrennt (Anki "Notes in Plain Text", Quizlet). Trenner wird erkannt. */
  function parseTable(txt) {
    txt = txt.replace(/^﻿/, '');
    var lines = txt.split(/\r?\n/).filter(function (l) { return l.trim() !== '' && l.charAt(0) !== '#'; });
    if (!lines.length) return [];
    var first = lines[0], sep = first.indexOf('\t') >= 0 ? '\t' : first.indexOf(';') >= 0 ? ';' : ',';
    var rows = [], row = [], cell = '', q = false, i, ch, t = lines.join('\n');
    for (i = 0; i < t.length; i++) {
      ch = t[i];
      if (q) { if (ch === '"') { if (t[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += ch; }
      else if (ch === '"' && cell === '') q = true;
      else if (ch === sep) { row.push(cell); cell = ''; }
      else if (ch === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
      else cell += ch;
    }
    row.push(cell); rows.push(row);
    return rows;
  }
  function plain(t) {   // Anki speichert oft HTML
    return String(t).replace(/<br\s*\/?>/gi, '\n').replace(/<\/(p|div)>/gi, '\n').replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&amp;/g, '&')
      .replace(/\{\{c\d+::(.+?)(::.*?)?\}\}/g, '{{$1}}').replace(/\n{3,}/g, '\n\n').trim();
  }
  function tableToData(rows, name) {
    var cols = { q: 0, a: 1, cat: -1, tags: 2 }, head = rows[0] && rows[0].map(function (x) { return flat(x); }), hasHead = false;
    if (head && head.some(function (h) { return /^(frage|question|front|vorderseite|begriff|term)$/.test(h); })) {
      hasHead = true; cols = { q: -1, a: -1, cat: -1, tags: -1 };
      head.forEach(function (h, i) {
        if (/^(frage|question|front|vorderseite|begriff|term)$/.test(h)) cols.q = i;
        else if (/^(antwort|loesung|losung|answer|back|rueckseite|ruckseite|definition)$/.test(h)) cols.a = i;
        else if (/^(rubrik|kategorie|category|deck|cat)$/.test(h)) cols.cat = i;
        else if (/^(tags?|schlagworte)$/.test(h)) cols.tags = i;
      });
    }
    var base = String(name || '').replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim().slice(0, 40) || 'Importiert';
    var out = [];
    rows.slice(hasHead ? 1 : 0).forEach(function (r) {
      var qv = cols.q >= 0 ? plain(r[cols.q] || '') : '', av = cols.a >= 0 ? plain(r[cols.a] || '') : '';
      if (!qv || (!av && !hasCloze(qv))) return;
      var o = { q: qv, a: av, cat: (cols.cat >= 0 && isStr(r[cols.cat])) ? r[cols.cat].trim().slice(0, 40) : base };
      if (cols.tags >= 0 && r[cols.tags]) o.tags = String(r[cols.tags]).split(/[\s,;]+/).filter(Boolean);
      out.push(o);
    });
    return out;
  }
  function addCards(list, colors) {
    var have = {}, added = 0;
    db.cards.forEach(function (c) { have[c.cat + '\n' + c.q + '\n' + c.a] = 1; });
    list.forEach(function (c) {
      var k = c.cat + '\n' + c.q + '\n' + c.a;
      if (have[k]) return;
      have[k] = 1; added++;
      if (db.cats.indexOf(c.cat) < 0) { db.cats.push(c.cat); db.colors[c.cat] = (colors && PALETTE.indexOf(colors[c.cat]) >= 0) ? colors[c.cat] : nextColor(); }
      var o = { id: uid(), q: c.q, a: c.a || clozeWords(c.q).join(', '), cat: c.cat }, tg = cleanTags(c.tags);
      if (tg.length) o.tags = tg;
      if (okImg(c.img)) o.img = c.img;
      db.cards.push(o);
    });
    save(); renderListChips(); renderList();
    toast(added + ' Karten hinzugefügt' + (added < list.length ? ', ' + (list.length - added) + ' schon vorhanden' : ''));
  }
  $('importFile').addEventListener('change', function (e) {
    var f = e.target.files[0];
    if (!f) return;
    e.target.value = '';
    // Erst das Format prüfen, dann lesen: nur Tabellen (CSV, TSV, TXT) und Kartendateien (JSON, JS)
    var ext = (f.name.match(/\.([^.]+)$/) || [])[1];
    ext = ext ? ext.toLowerCase() : '';
    if (ext === 'apkg' || ext === 'colpkg') { toast('Anki-Pakete gehen nicht. In Anki „Notes in Plain Text“ (.txt) exportieren'); return; }
    if (['json', 'js', 'csv', 'tsv', 'txt'].indexOf(ext) < 0) { toast('Dateityp nicht erlaubt. Erlaubt: CSV, TSV, TXT, JSON'); return; }
    if (f.size > 5 * 1024 * 1024) { toast('Die Datei ist zu groß (höchstens 5 MB)'); return; }
    if (!f.size) { toast('Die Datei ist leer'); return; }
    var r = new FileReader();
    r.onload = function () {
      try {
        if (String(r.result).indexOf('\u0000') >= 0) { toast('Das ist keine Textdatei'); return; }   // Binärdatei mit falscher Endung
        var txt = String(r.result), t0 = txt.replace(/^﻿/, '').trimStart().charAt(0);
        if (/\.(csv|tsv|txt)$/i.test(f.name) && t0 !== '{' && t0 !== '[') {   // Tabelle
          var list = tableToData(parseTable(txt), f.name);
          if (!list.length) { toast('Keine Karten in der Tabelle gefunden'); return; }
          addCards(list);
          return;
        }
        var i = txt.indexOf('{'), j = txt.lastIndexOf('}');   // .json oder karteikarten.js
        var d = parseData(JSON.parse(txt.slice(i, j + 1)));
        addCards(d.cards, d.colors);
      } catch (err) { toast('Datei konnte nicht gelesen werden'); }
    };
    r.readAsText(f);
  });
  $('csvBtn').addEventListener('click', function () {
    if (!db.cards.length) { toast('Noch keine Karten'); return; }
    var esc = function (x) { return '"' + String(x == null ? '' : x).replace(/"/g, '""') + '"'; };
    var lines = ['Frage;Lösung;Rubrik;Tags'].concat(db.cards.map(function (c) { return [c.q, c.a, c.cat, (c.tags || []).join(' ')].map(esc).join(';'); }));
    download('karteikarten.csv', '﻿' + lines.join('\r\n') + '\r\n', 'text/csv');
    toast('karteikarten.csv gespeichert');
  });
  /* Drucken: Bogen mit Frage links und Lösung rechts, zum Ausschneiden oder als Spickzettel */
  $('printBtn').addEventListener('click', function () {
    var term = flat($('listSearch').value);
    var items = db.cards.filter(function (c) { return (listCat === null || c.cat === listCat) && (!term || flat([c.q, c.a, c.cat].concat(c.tags || []).join(' ')).indexOf(term) >= 0); });
    if (!items.length) { toast('Keine Karten zum Drucken'); return; }
    var host = $('printArea'); host.textContent = '';
    host.appendChild(el('h1', null, 'KarteiDeck' + (listCat ? ': ' + listCat : '')));
    items.forEach(function (c) {
      var row = el('div', 'prow');
      var q = el('div', 'pq', c.q); if (c.img) { var im = el('img'); im.src = c.img; im.alt = ''; q.appendChild(im); }
      row.appendChild(q); row.appendChild(el('div', 'pa', aShow(c)));
      host.appendChild(row);
    });
    var done = function () { host.textContent = ''; window.removeEventListener('afterprint', done); };
    window.addEventListener('afterprint', done);
    window.print();
  });

  /* ===== Rubriken ===== */
  function renameCat(old, n, color) {
    if (db.cats.some(function (c) { return c !== old && sameName(c, n); })) return 'Diese Rubrik gibt es schon.';
    db.cats = db.cats.map(function (c) { return c === old ? n : c; });
    var oc = db.colors[old]; delete db.colors[old]; db.colors[n] = PALETTE.indexOf(color) >= 0 ? color : (oc || nextColor());
    db.cards.forEach(function (c) { if (c.cat === old) c.cat = n; });
    if (S.cat === old) S.cat = n;
    if (listCat === old) listCat = n;
    if (addCat === old) addCat = n;
    save();
    renderCats();
    return '';
  }
  function renderCats() {
    var list = $('catList');
    list.textContent = '';
    db.cats.forEach(function (name) {
      var item = el('div', 'item');
      var box = el('div', 'txtbox');
      var qn = el('p', 'q', name), dt = el('i', 'dot'); dt.style.background = catColor(name); qn.insertBefore(dt, qn.firstChild);
      box.appendChild(qn);
      box.appendChild(el('p', 'a', countIn(name) + ' Karten'));
      var acts = el('div', 'acts');
      var rb = el('button', 'btn', 'Ändern'); rb.type = 'button';
      rb.addEventListener('click', function () { askName('Rubrik ändern', name, function (n, col) { return renameCat(name, n, col); }, catColor(name)); });
      var del = el('button', 'btn danger', 'Löschen'); del.type = 'button';
      del.disabled = db.cats.length < 2;
      del.addEventListener('click', function () {
        confirmDlg('Rubrik löschen?', '„' + name + '“ mit ' + countIn(name) + ' Karten wird gelöscht. Das lässt sich nicht rückgängig machen.', function () {
          db.cards = db.cards.filter(function (c) { return c.cat !== name; });
          db.cats = db.cats.filter(function (c) { return c !== name; }); delete db.colors[name];
          if (S.cat === name) S.cat = null;
          if (listCat === name) listCat = null;
          save(); renderCats(); toast('Rubrik gelöscht');
        });
      });
      acts.appendChild(rb); acts.appendChild(del);
      item.appendChild(box); item.appendChild(acts);
      list.appendChild(item);
    });
  }
  $('newCatBtn').addEventListener('click', function () {
    askName('Neue Rubrik', '', function (n, col) { var e = createCat(n, col); if (!e) renderCats(); return e; });
  });

  /* ===== Optionen ===== */
  /* Maßzeichnung: feste Größe (300 x 300), die Karte wird hineingepasst. Maße und Werte stehen als Zahlen dabei. */
  var NS = 'http://www.w3.org/2000/svg';
  function sv(parent, tag, attrs, text) {
    var n = document.createElementNS(NS, tag);
    Object.keys(attrs).forEach(function (k) { n.setAttribute(k, attrs[k]); });
    if (text != null) n.textContent = text;
    parent.appendChild(n);
    return n;
  }
  function arrow(p, x, y, dx, dy, len) {
    var px = -dy, py = dx, w = len * 0.36;
    sv(p, 'path', { class: 'dr-arr', d: 'M' + x + ',' + y + ' L' + (x - dx * len + px * w) + ',' + (y - dy * len + py * w) + ' L' + (x - dx * len - px * w) + ',' + (y - dy * len - py * w) + ' Z' });
  }
  function f1(x) { return String(Math.round(x * 10) / 10).replace('.', ','); }
  function renderDrawing() {
    var svg = $('drawSvg'), info = $('drawInfo');
    if (!svg || !info) return;
    var T = CFG.schrift, K = CFG.karte, F = CFG.faecher, L = CFG.lernen;
    var wrapW = document.querySelector('.wrap').clientWidth - 28;
    var lh = Math.round(T.groesse * T.zeilenabstand), hd = Math.max(30, Math.round(lh * 1.3));
    var bw = Math.min(K.breite, Math.max(200, wrapW - 8));
    var hMin = hd + K.zeilenMin * lh + 8, hMax = hd + K.zeilenMax * lh + 8;
    var H = K.automatischeHoehe ? hMax : hMin;
    var VW = 300, VH = 300, ml = 44, mr = 58, mt = 24, mb = 50;
    var aw = VW - ml - mr, ah = VH - mt - mb;
    var s = Math.min(aw / bw, ah / H);
    var cw = bw * s, c1 = hMin * s, c2 = H * s;
    var x0 = ml + (aw - cw) / 2, y0 = mt;
    svg.textContent = '';
    sv(svg, 'rect', { class: 'dr-frame', x: 3, y: 3, width: VW - 6, height: VH - 6 });
    sv(svg, 'rect', { class: 'dr-frame2', x: 8, y: 8, width: VW - 16, height: VH - 16 });
    sv(svg, 'text', { class: 'dr-small', x: VW - 14, y: 19, 'text-anchor': 'end' }, 'M 1:' + f1(1 / s));
    sv(svg, 'text', { class: 'dr-small', x: 14, y: 19 }, 'Große Karte');
    if (K.automatischeHoehe && hMax > hMin) sv(svg, 'rect', { class: 'dr-max', x: x0, y: y0, width: cw, height: c2, rx: 3 });
    sv(svg, 'rect', { class: 'dr-card', x: x0, y: y0, width: cw, height: c1, rx: 3 });
    if (lh * s >= 3) {
      for (var i = 1; i <= K.zeilenMin; i++) {
        var yy = y0 + (hd + i * lh) * s;
        sv(svg, 'line', { class: 'dr-rule', x1: x0 + 1, x2: x0 + cw - 1, y1: yy, y2: yy });
      }
    }
    sv(svg, 'line', { class: 'dr-head', x1: x0 + 1, x2: x0 + cw - 1, y1: y0 + hd * s, y2: y0 + hd * s });
    // Breite (unten)
    var dy = y0 + c2 + 14;
    sv(svg, 'line', { class: 'dr-ext', x1: x0, x2: x0, y1: y0 + c2 + 3, y2: dy + 5 });
    sv(svg, 'line', { class: 'dr-ext', x1: x0 + cw, x2: x0 + cw, y1: y0 + c2 + 3, y2: dy + 5 });
    sv(svg, 'line', { class: 'dr-dim', x1: x0, x2: x0 + cw, y1: dy, y2: dy });
    arrow(svg, x0, dy, -1, 0, 7); arrow(svg, x0 + cw, dy, 1, 0, 7);
    sv(svg, 'text', { class: 'dr-txt', x: x0 + cw / 2, y: dy + 15, 'text-anchor': 'middle' }, bw + ' px');
    // Höhe (links)
    var dx = x0 - 14;
    sv(svg, 'line', { class: 'dr-ext', x1: x0 - 3, x2: dx - 5, y1: y0, y2: y0 });
    sv(svg, 'line', { class: 'dr-ext', x1: x0 - 3, x2: dx - 5, y1: y0 + c1, y2: y0 + c1 });
    sv(svg, 'line', { class: 'dr-dim', x1: dx, x2: dx, y1: y0, y2: y0 + c1 });
    arrow(svg, dx, y0, 0, -1, 7); arrow(svg, dx, y0 + c1, 0, 1, 7);
    sv(svg, 'text', { class: 'dr-txt', x: dx - 5, y: y0 + c1 / 2, 'text-anchor': 'middle', transform: 'rotate(-90 ' + (dx - 5) + ' ' + (y0 + c1 / 2) + ')' }, hMin + ' px');
    // Zeilenhöhe (rechts)
    var rx = x0 + cw + 13, ya = y0 + hd * s, yb = y0 + (hd + lh) * s, al = Math.min(7, (yb - ya) * 0.45);
    sv(svg, 'line', { class: 'dr-ext', x1: x0 + cw + 3, x2: rx + 5, y1: ya, y2: ya });
    sv(svg, 'line', { class: 'dr-ext', x1: x0 + cw + 3, x2: rx + 5, y1: yb, y2: yb });
    sv(svg, 'line', { class: 'dr-dim', x1: rx, x2: rx, y1: ya - 5, y2: yb + 5 });
    arrow(svg, rx, ya, 0, 1, al); arrow(svg, rx, yb, 0, -1, al);
    sv(svg, 'text', { class: 'dr-txt', x: rx + 8, y: (ya + yb) / 2 + 4 }, lh + ' px');

    var rows = [
      ['Breite', bw + ' px'],
      ['Höhe', K.automatischeHoehe && hMax > hMin ? hMin + ' – ' + hMax + ' px' : hMin + ' px'],
      ['Zeilen', K.automatischeHoehe ? K.zeilenMin + ' – ' + K.zeilenMax + ' (auto)' : String(K.zeilenMin)],
      ['Schrift', T.groesse + ' px, ' + { serif: 'Serif', sans: 'Sans', hand: 'Handschrift' }[T.art]],
      ['Zeilenabstand', f1(T.zeilenabstand) + ' (' + lh + ' px)'],
      ['Fächer', F.anzahl + ' Karten, ' + Math.round(F.groesse * 100) + ' %, ' + F.winkel + '°'],
      ['Countdown', L.timer ? L.sekunden + ' s' : 'manuell'],
      ['Animation', CFG.animation.an ? 'Tempo ' + f1(CFG.animation.tempo) : 'aus']
    ];
    info.textContent = '';
    rows.forEach(function (r) {
      var d = el('div', 'di');
      d.appendChild(el('dt', null, r[0]));
      d.appendChild(el('dd', null, r[1]));
      info.appendChild(d);
    });
    svg.setAttribute('aria-label', 'Maßzeichnung: Karte ' + bw + ' mal ' + hMin + ' Pixel');
  }
  function stepper(path, min, max, step, fmt, en) {
    var w = el('div', 'stepper'), v = el('span', 'val');
    var dec = el('button', 'sbtn', '−'), inc = el('button', 'sbtn', '+');
    dec.type = 'button'; inc.type = 'button';
    dec.setAttribute('aria-label', 'weniger'); inc.setAttribute('aria-label', 'mehr');
    function refresh() {
      var x = getCfg(path);
      v.textContent = fmt(x);
      var off = en && !en();
      dec.disabled = off || x <= min + 1e-9;
      inc.disabled = off || x >= max - 1e-9;
    }
    function bump(dir) { setCfg(path, Math.round((getCfg(path) + dir * step) * 1000) / 1000); }
    dec.addEventListener('click', function () { bump(-1); });
    inc.addEventListener('click', function () { bump(1); });
    w.appendChild(dec); w.appendChild(v); w.appendChild(inc);
    REF.push(refresh); refresh();
    return w;
  }
  function seg(path, options) {
    var w = el('div', 'seg');
    function refresh() {
      var x = getCfg(path);
      w.querySelectorAll('.chip').forEach(function (b, i) { b.setAttribute('aria-pressed', String(options[i].v === x)); });
    }
    options.forEach(function (o) {
      var b = el('button', 'chip', o.label);
      b.type = 'button';
      b.addEventListener('click', function () { setCfg(path, o.v); });
      w.appendChild(b);
    });
    REF.push(refresh); refresh();
    return w;
  }
  var optLock = false;   // true: Zusatzoptionen sind verdeckt, weil Konten gehen, aber niemand angemeldet ist
  function renderOptions() {
    var host = $('optHost');
    host.textContent = '';
    REF = [];
    optLock = typeof K !== 'undefined' && !!K.on && !PRO.options;
    var lockBox = el('div', 'lockbox locked');
    function tape() { return el('span', 'neu', 'Neu'); }
    function group(title, neu) { var g = el('section', 'group'), h = el('h3', null, title); if (neu && neuNow) h.appendChild(tape()); g.appendChild(h); host.appendChild(g); return g; }
    function row(g, label, ctl, neu) { var r = el('div', 'set'), l = el('span', 'lab', label); if (neu && neuNow) l.appendChild(tape()); r.appendChild(l); r.appendChild(ctl); g.appendChild(r); }
    var px = function (x) { return x + ' px'; };
    var onOff = [{ v: true, label: 'An' }, { v: false, label: 'Aus' }];

    var g1 = group('Schrift');
    row(g1, 'Schriftgröße', stepper('schrift.groesse', 12, 40, 1, px));
    row(g1, 'Zeilenabstand', stepper('schrift.zeilenabstand', 1.2, 2.2, 0.1, function (x) { return x.toFixed(1); }));
    row(g1, 'Schriftart', seg('schrift.art', [{ v: 'serif', label: 'Serif' }, { v: 'sans', label: 'Sans' }, { v: 'hand', label: 'Handschrift' }]));

    var g2 = group('Große Karte');
    row(g2, 'Breite', stepper('karte.breite', 240, 720, 20, px));
    row(g2, 'Zeilen mindestens', stepper('karte.zeilenMin', 2, 20, 1, String));
    row(g2, 'Zeilen höchstens', stepper('karte.zeilenMax', 2, 30, 1, String));
    row(g2, 'Höhe automatisch', seg('karte.automatischeHoehe', onOff));

    var g3 = group('Fächer');
    row(g3, 'Karten im Fächer', stepper('faecher.anzahl', 3, 7, 1, String));
    row(g3, 'Größe', stepper('faecher.groesse', 0.35, 0.8, 0.05, function (x) { return Math.round(x * 100) + ' %'; }));
    row(g3, 'Winkel', stepper('faecher.winkel', 4, 16, 1, function (x) { return x + '°'; }));
    row(g3, 'Unschärfe der Fragen', stepper('faecher.unschaerfe', 3, 14, 1, px));

    var g4 = group('Ablauf');
    row(g4, 'Countdown bei der Frage', seg('lernen.timer', [{ v: true, label: 'An' }, { v: false, label: 'Manuell' }]));
    row(g4, 'Sekunden', stepper('lernen.sekunden', 10, 60, 5, function (x) { return x + ' s'; }, function () { return CFG.lernen.timer; }));
    row(g4, 'Tagesziel', stepper('lernen.tagesziel', 0, 200, 5, function (x) { return x ? x + ' Karten' : 'aus'; }));
    row(g4, 'Animation', seg('animation.an', onOff));
    row(g4, 'Tempo', seg('animation.tempo', [{ v: 0.6, label: 'Langsam' }, { v: 1, label: 'Normal' }, { v: 1.6, label: 'Schnell' }]));
    row(g4, 'Runde mischen', seg('lernen.mischen', onOff));
    row(g4, 'Tastatur', seg('lernen.tastatur', onOff));

    row(g4, 'Design', seg('design.thema', [{ v: 'auto', label: 'Auto' }, { v: 'hell', label: 'Hell' }, { v: 'dunkel', label: 'Dunkel' }]));

    if (optLock || PRO.options) { var sp = el('h2', 'optsep', 'Mit Konto'); host.appendChild(sp); }
    if (PRO.options) PRO.options({ group: group, row: row, onOff: onOff, px: px });
    else if (optLock) {
      var fake = [['Lernarten', ['Richtung', 'Antwort tippen', 'Wortbank', 'Vorlesen', 'Karten pro Prüfung']]];
      if (window.innerWidth >= 900) fake.unshift(['Kassettenplayer', ['Player auf dem Tisch', 'Sekunden pro Seite']]);
      var inner = el('div', 'lockin');
      fake.forEach(function (f) {
        var g = el('section', 'group'); g.appendChild(el('h3', null, f[0]));
        f[1].forEach(function (t) { var r = el('div', 'set'); r.appendChild(el('span', 'lab', t)); r.appendChild(el('span', 'fakectl', 'An')); g.appendChild(r); });
        inner.appendChild(g);
      });
      inner.setAttribute('aria-hidden', 'true'); inner.inert = true;
      lockBox.appendChild(inner);
      var ov = el('div', 'lockov'), card = el('div', 'lockcard');
      card.appendChild(el('strong', null, 'Mehr Optionen mit Konto'));
      card.appendChild(el('p', null, 'Lernarten, Player und Statistik gibt es nach der Anmeldung. Das Konto ist kostenlos.'));
      var lb = el('div', 'tools');
      var l1 = el('button', 'btn primary', 'Konto anlegen'); l1.type = 'button'; l1.addEventListener('click', function () { openAcc('register'); });
      var l2 = el('button', 'btn', 'Anmelden'); l2.type = 'button'; l2.addEventListener('click', function () { openAcc('login'); });
      lb.appendChild(l1); lb.appendChild(l2); card.appendChild(lb);
      ov.appendChild(card); lockBox.appendChild(ov);
      host.appendChild(lockBox);
    }
    var gl = group('Lernstand');
    gl.appendChild(el('p', null, 'Gewusste Karten rutschen ein Fach höher und kommen später wieder. Nochmal schickt sie zurück in Fach 1.'));
    if (PRO.statButtons) PRO.statButtons(gl);
    else if (optLock) { var sl = el('button', 'btn', 'Statistik (mit Konto)'); sl.type = 'button'; sl.addEventListener('click', proNeed); gl.appendChild(sl); }
    var rb = el('button', 'btn danger', 'Lernstand zurücksetzen'); rb.type = 'button';
    rb.addEventListener('click', function () {
      confirmDlg('Lernstand zurücksetzen?', 'Alle Karten gelten wieder als neu, Tagesziel und Serie starten bei null. Die Karten bleiben.', function () {
        db.cards.forEach(function (c) { delete c.n; delete c.box; delete c.due; delete c.last; });
        db.log = {};
        save(); toast('Lernstand zurückgesetzt');
      }, 'Zurücksetzen', true);
    });
    gl.appendChild(rb);

    var gi = group('App');
    gi.appendChild(el('p', null, INST.evt ? 'Installiere das KarteiDeck wie eine App. Sie läuft dann in einem eigenen Fenster, auch offline.'
      : INST.web ? 'Dein Browser bietet gerade keine Installation an. Sie ist vielleicht schon installiert.'
      : 'Als lokale Datei läuft das KarteiDeck offline, kann aber nicht installiert werden. Installieren geht, wenn die Seite über https läuft.'));
    if (INST.evt) { var ib = el('button', 'btn primary', 'App installieren'); ib.type = 'button'; ib.addEventListener('click', installApp); gi.appendChild(ib); }

    var gu = group('Version');
    gu.appendChild(el('p', null, 'KarteiDeck ' + VERSION));
    if (updEnabled()) {
      row(gu, 'Nach Updates suchen', seg('update.pruefen', onOff));
      gu.appendChild(el('p', null, 'Die Suche ruft GitHub auf, dabei sieht GitHub deine IP-Adresse. Ohne Verbindung passiert nichts, die App läuft immer offline.'));
      var ub = el('button', 'btn', 'Jetzt suchen'); ub.type = 'button'; ub.addEventListener('click', function () { checkUpdate(true); });
      gu.appendChild(ub);
    }

    var dsb = el('button', 'btn', 'Datenschutz'); dsb.type = 'button';
    dsb.addEventListener('click', function () { show('help'); var t = $('datenschutz'); if (t) t.scrollIntoView({ behavior: CFG.animation.an ? 'smooth' : 'auto', block: 'start' }); });
    gu.appendChild(dsb);

    var g5 = group('Speicherort');
    if (!FL.supported) {
      g5.appendChild(el('p', null, 'Dein Browser kann keinen Ordner beschreiben. Nutze „Karten speichern“ im Tab Karten und lege die Datei neben karteikarten.html. Chrome und Edge speichern direkt im Ordner.'));
    } else {
      var msg = FL.state === 'ok' ? 'Karten und Einstellungen liegen im Ordner „' + FL.name + '“ (karteikarten.json, einstellungen.js). Jede Änderung wird sofort dort gespeichert.'
        : FL.state === 'needperm' ? 'Zugriff auf den Ordner „' + FL.name + '“ muss neu erlaubt werden.'
        : FL.state === 'error' ? 'Der Ordner „' + FL.name + '“ lässt sich nicht beschreiben.'
        : 'Karten und Einstellungen liegen nur im Browser. Wähle den Ordner, in dem diese HTML liegt. Dann speichert die Seite dort.';
      g5.appendChild(el('p', null, msg));
      var br = el('div', 'tools');
      if (FL.state === 'needperm') { var gb = el('button', 'btn primary', 'Zugriff erlauben'); gb.type = 'button'; gb.addEventListener('click', fileGrant); br.appendChild(gb); }
      var nb = el('button', FL.handle ? 'btn' : 'btn primary', FL.handle ? 'Anderen Ordner wählen' : 'Ordner wählen'); nb.type = 'button'; nb.addEventListener('click', fileConnect);
      br.appendChild(nb);
      if (FL.handle) { var tb = el('button', 'btn danger', 'Trennen'); tb.type = 'button'; tb.addEventListener('click', fileDetach); br.appendChild(tb); }
      g5.appendChild(br);
    }


    var g6 = group('Einstellungen');
    g6.appendChild(el('p', null, 'Mit verbundenem Ordner stehen die Werte in einstellungen.js. Sonst gelten sie nur in diesem Browser.'));
    var sb = el('div', 'tools');
    var s1 = el('button', 'btn primary', 'Einstellungen speichern'); s1.type = 'button';
    s1.addEventListener('click', function () { saveToFolder('cfg'); });
    var s2 = el('button', 'btn', 'Auf Standardwerte zurücksetzen'); s2.type = 'button';
    s2.addEventListener('click', function () {
      confirmDlg('Zurücksetzen?', 'Alle Einstellungen gehen auf die Standardwerte zurück. Deine Karten bleiben.', function () {
        CFG = clone(DEFAULTS);
        saveCfg(); applyCfg(); studyDirty = true; renderOptions(); toast('Standardwerte gesetzt');
      }, 'Zurücksetzen', false);
    });
    sb.appendChild(s1); sb.appendChild(s2);
    g6.appendChild(sb);
    renderDrawing();
  }

  /* ===== Start ===== */
  applyCfg();
  /* ===== App installieren: geht nur, wenn die Seite über https oder localhost läuft. Als lokale Datei läuft sie einfach offline. ===== */
  var INST = { evt: null, web: /^https?:$/.test(location.protocol) };
  if (INST.web) {
    var ml = document.createElement('link'); ml.rel = 'manifest'; ml.href = 'manifest.webmanifest'; document.head.appendChild(ml);
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(function () {});
  }
  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault(); INST.evt = e;
    $('installBtn').hidden = false;
    if (current === 'opts') renderOptions();
  });
  window.addEventListener('appinstalled', function () {
    INST.evt = null; $('installBtn').hidden = true; toast('App installiert');
    if (current === 'opts') renderOptions();
  });
  function installApp() {
    if (!INST.evt) return;
    INST.evt.prompt();
    INST.evt.userChoice.then(function () { INST.evt = null; $('installBtn').hidden = true; if (current === 'opts') renderOptions(); });
  }
  $('installBtn').addEventListener('click', installApp);

  /* ===== Updates =====
     Die App läuft immer komplett offline. Dieser Teil ist ein Zusatz: Er fragt höchstens einmal am Tag bei GitHub nach einer neuen Version
     und tut nichts, wenn keine Verbindung da ist. Nach einem Klick ersetzt er auf Chrome/Edge am Computer nur die App-Dateien im Ordner.
     Karten, Einstellungen und Lernstand werden nie angefasst. */
  var VERSION = '__VERSION__';
  var UPDATE_REPO = 'Exulizer/Karteikarten', UPDATE_ZWEIG = 'main', UPDATE_ORDNER = '';   // hier dein GitHub-Repo eintragen, zum Beispiel 'meinname/kartenbox'
  var UPD_ALLOWED = ['karteikarten.html', 'sw.js', 'manifest.webmanifest', 'icon.svg', 'icon-192.png', 'icon-512.png'];   // nur diese Dateien darf ein Update schreiben
  var UPD_KEY = 'kartenbox-update-v1';
  function updEnabled() { return UPDATE_REPO !== 'KONTO/REPO' && /^[\w.-]+\/[\w.-]+$/.test(UPDATE_REPO) && /^[\w.\/-]+$/.test(UPDATE_ZWEIG) && !INST.web; }
  function updBase() { return 'https://raw.githubusercontent.com/' + UPDATE_REPO + '/' + UPDATE_ZWEIG + '/' + (UPDATE_ORDNER ? UPDATE_ORDNER.replace(/^\/+|\/+$/g, '') + '/' : ''); }
  function updPage() { return 'https://github.com/' + UPDATE_REPO; }
  function updCanWrite() { return FL.supported && !(window.matchMedia && matchMedia('(pointer: coarse)').matches); }
  function newer(a, b) {
    var x = a.split('.').map(Number), y = b.split('.').map(Number);
    for (var i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] > y[i];
    return false;
  }
  function cleanInfo(j) {
    if (!j || typeof j.version !== 'string' || !/^\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(j.version)) return null;
    var files = (Array.isArray(j.files) ? j.files : []).filter(function (f) {
      return f && UPD_ALLOWED.indexOf(f.pfad) >= 0 && /^[0-9a-f]{64}$/.test(f.sha256) && Number.isInteger(f.groesse) && f.groesse > 0 && f.groesse < 5e6;
    }).map(function (f) { return { pfad: f.pfad, sha256: f.sha256, groesse: f.groesse, optional: f.optional === true }; });
    if (!files.some(function (f) { return f.pfad === 'karteikarten.html' && !f.optional; })) return null;
    return { version: j.version, hinweis: typeof j.hinweis === 'string' ? j.hinweis.slice(0, 300) : '', files: files };
  }
  async function fetchInfo() {
    var ac = new AbortController(), t = setTimeout(function () { ac.abort(); }, 4000);
    try {
      var r = await fetch(updBase() + 'version.json?t=' + Date.now(), { cache: 'no-store', signal: ac.signal, credentials: 'omit', referrerPolicy: 'no-referrer' });
      return r.ok ? cleanInfo(await r.json()) : null;
    } catch (e) { return null; } finally { clearTimeout(t); }
  }
  function updSeen() { try { return Number(localStorage.getItem(UPD_KEY)) || 0; } catch (e) { return 0; } }
  var updTry = 0;
  async function checkUpdate(manual) {
    if (!updEnabled()) { if (manual) toast(INST.web ? 'Diese Seite aktualisiert sich selbst' : 'Update-Suche ist nicht eingerichtet'); return; }
    if (!manual) {
      if (document.querySelector('dialog[open]')) { if (updTry++ < 40) setTimeout(function () { checkUpdate(false); }, 10000); return; }   // Startseite oder anderer Dialog offen: später nochmal versuchen, statt den Hinweis zu verpassen
      if (!CFG.update.pruefen || navigator.onLine === false || Date.now() - updSeen() < 864e5) return;
      try { localStorage.setItem(UPD_KEY, String(Date.now())); } catch (e) {}
    }
    var info = await fetchInfo();
    if (!info) { if (manual) toast('Keine Verbindung zu GitHub'); return; }
    if (!newer(info.version, VERSION)) { if (manual) toast('Du hast die neueste Version ' + VERSION); return; }
    var txt = 'Version ' + info.version + ' ist da. Du nutzt ' + VERSION + '.' + (info.hinweis ? ' ' + info.hinweis : '');
    if (updCanWrite()) confirmDlg('Neue Version', txt + ' Die App-Dateien werden ersetzt, deine Karten bleiben.', function () { applyUpdate(info); }, 'Aktualisieren', false, 'Später');
    else confirmDlg('Neue Version', txt + ' Auf diesem Gerät lädst du sie von GitHub herunter.', function () { window.open(updPage(), '_blank', 'noopener'); }, 'Zu GitHub', false, 'Später');
  }
  function hex(buf) { return Array.prototype.map.call(new Uint8Array(buf), function (b) { return ('0' + b.toString(16)).slice(-2); }).join(''); }
  async function applyUpdate(info) {
    if (!window.crypto || !crypto.subtle) { toast('Prüfung nicht möglich, bitte von GitHub laden'); return; }
    var dir;
    try {
      if (FL.handle && (await FL.handle.queryPermission({ mode: 'readwrite' })) === 'granted') dir = FL.handle;
      else dir = await window.showDirectoryPicker({ id: 'kartenbox', mode: 'readwrite' });
      await dir.getFileHandle('karteikarten.html');
    } catch (e) {
      if (e && e.name === 'NotFoundError') toast('Dort liegt keine karteikarten.html. Wähle den App-Ordner.');
      else if (!e || e.name !== 'AbortError') toast('Ordner nicht verfügbar');
      return;
    }
    toast('Lade Update …');
    var got = [];
    try {   // erst alles laden und prüfen, noch wird nichts geschrieben
      for (var i = 0; i < info.files.length; i++) {
        var f = info.files[i];
        if (f.optional) { try { await dir.getFileHandle(f.pfad); } catch (e) { continue; } }   // optionale Dateien nur ersetzen, wenn sie schon da liegen
        var r = await fetch(updBase() + f.pfad + '?v=' + info.version, { cache: 'no-store', credentials: 'omit', referrerPolicy: 'no-referrer' });
        if (!r.ok) throw new Error('http');
        var buf = await r.arrayBuffer();
        if (buf.byteLength !== f.groesse || hex(await crypto.subtle.digest('SHA-256', buf)) !== f.sha256) throw new Error('pruefsumme');
        got.push({ f: f, buf: buf });
      }
      var main = got.filter(function (g) { return g.f.pfad === 'karteikarten.html'; })[0];
      var html = new TextDecoder().decode(main.buf);
      if (html.indexOf('name="kd-version" content="' + info.version + '"') < 0 || html.indexOf('KARTENBOX_EINSTELLUNGEN') < 0) throw new Error('inhalt');
    } catch (e) { toast('Update abgebrochen, nichts wurde geändert'); return; }
    got.sort(function (a, b) { return (a.f.pfad === 'karteikarten.html') - (b.f.pfad === 'karteikarten.html'); });   // die HTML kommt zuletzt
    var done = [];
    try {
      for (var k = 0; k < got.length; k++) {
        var name = got[k].f.pfad, old = null;
        try { old = await (await dir.getFileHandle(name)).getFile(); } catch (e) {}
        if (old) await putFile(dir, name + '.alt', await old.arrayBuffer());   // Sicherung der alten Datei
        done.push({ name: name, had: !!old });
        await putFile(dir, name, got[k].buf);
      }
    } catch (e) {
      for (var m = 0; m < done.length; m++) {   // zurückrollen, soweit möglich
        if (!done[m].had) continue;
        try { await putFile(dir, done[m].name, await (await (await dir.getFileHandle(done[m].name + '.alt')).getFile()).arrayBuffer()); } catch (e2) {}
      }
      toast('Update fehlgeschlagen, der alte Stand bleibt');
      return;
    }
    toast('Aktualisiert auf ' + info.version);
    setTimeout(function () { location.reload(); }, 1000);
  }
  if (UPDATE_REPO !== 'KONTO/REPO' && /^[\w.-]+\/[\w.-]+$/.test(UPDATE_REPO)) {   // Anbieter im Datenschutz: das GitHub-Konto des Repos
    $('anbieter').textContent = 'github.com/' + UPDATE_REPO.split('/')[0] + '. Fragen zum Datenschutz stellst du dort.';
  }
  setTimeout(function () { checkUpdate(false); }, 3000);


  /* ===== Konto: Abgleich mit dem Server (nur wenn die Konto-Schnittstelle antwortet) ===== */
  var NOSYNC = ['anbieter', 'start', 'konto', 'seite'];
  var K = { mock: false, on: false, csrf: '', ft: '', user: null, rev: 0, state: '', paused: false, pulling: false, busy: false, again: false, timer: null, resetTok: '' };
  function kurl(a) { return CFG.konto.api + '?a=' + a; }
  async function kapi(a, body, retried) {
    var opt = { credentials: 'same-origin', cache: 'no-store', referrerPolicy: 'no-referrer', headers: {} };
    if (body !== undefined) {
      opt.method = 'POST';
      opt.headers['Content-Type'] = 'application/json';
      opt.headers['X-CSRF-Token'] = K.csrf;
      opt.body = typeof body === 'string' ? body : JSON.stringify(body);
    }
    var r, j;
    if (K.mock) { j = await mockApi(a, body === undefined ? undefined : (typeof body === 'string' ? JSON.parse(body) : body)); r = { status: j.status }; }
    else try { r = await fetch(kurl(a), opt); j = await r.json(); } catch (e) { return { ok: false, status: 0, err: 'Keine Verbindung zum Server.' }; }
    if (!j || typeof j !== 'object') return { ok: false, status: r.status, err: 'Unerwartete Antwort.' };
    j.status = r.status;
    if (j.err === 'csrf' && !retried) { await kProbe(); return kapi(a, body, true); }
    if (j.csrf) K.csrf = j.csrf;
    if (j.code === 'auth' && K.user) { K.user = null; K.state = ''; clearTimeout(K.timer); K.timer = null; kUI(); toast('Bitte melde dich neu an.'); }
    return j;
  }
  /* Testmodus (konto.test): ersetzt den Server durch einen Speicher in diesem Browser, nur zum Ausprobieren der Oberfläche. Nichts davon ist sicher. */
  var MOCK_KEY = 'kartenbox-testkonto';
  async function sha(t) {
    try { var b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('kb:' + t)); return Array.prototype.map.call(new Uint8Array(b), function (x) { return ('0' + x.toString(16)).slice(-2); }).join(''); } catch (e) { return 'x:' + t; }
  }
  async function mockApi(a, b) {
    var d; try { d = JSON.parse(localStorage.getItem(MOCK_KEY)); } catch (e) {}
    if (!d || typeof d !== 'object') d = { users: {}, data: {}, sess: '' };
    b = b || {};
    var email = String(b.email || '').trim().toLowerCase();
    function put() { try { localStorage.setItem(MOCK_KEY, JSON.stringify(d)); } catch (e) {} }
    function ok(o) { return Object.assign({ ok: true, status: 200 }, o); }
    function no(st, m, x) { return Object.assign({ ok: false, status: st, err: m }, x || {}); }
    var me = d.sess && d.users[d.sess] ? d.sess : '';
    var needs = ['data', 'save', 'password', 'delete'];
    if (needs.indexOf(a) >= 0 && !me) return no(401, 'Bitte melde dich an.', { code: 'auth' });
    if (a === 'csrf') return ok({ csrf: 'test', ft: 'test', user: me ? { email: me } : null });
    if (a === 'register') {
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return no(400, 'Bitte eine gültige E-Mail-Adresse eingeben.');
      if (String(b.password || '').length < 10) return no(400, 'Das Passwort braucht mindestens 10 Zeichen.');
      if (!d.users[email]) { d.users[email] = { pw: await sha(b.password) }; put(); }
      return ok({ msg: 'Testmodus: Konto angelegt, die Bestätigung ist übersprungen. Du kannst dich anmelden.' });
    }
    if (a === 'login') {
      var u = d.users[email];
      if (!u || u.pw !== await sha(b.password || '')) return no(401, 'E-Mail oder Passwort stimmt nicht.');
      d.sess = email; put(); return ok({ csrf: 'test', user: { email: email } });
    }
    if (a === 'logout') { d.sess = ''; put(); return ok({ csrf: 'test' }); }
    if (a === 'verify') return ok({ msg: 'Testmodus: nichts zu bestätigen.' });
    if (a === 'reset-request') return ok({ msg: 'Testmodus: Es wird keine Mail gesendet. Melde dich an und nutze „Passwort ändern".' });
    if (a === 'reset') return no(400, 'Im Testmodus gibt es keinen Link.');
    if (a === 'contact') {
      if (!String(b.name || '').trim() || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(b.email || '').trim()) || String(b.message || '').trim().length < 10) return no(400, 'Bitte Name, gültige E-Mail und eine Nachricht mit mindestens 10 Zeichen eingeben.');
      return ok({ msg: 'Testmodus: Die Nachricht wurde nicht gesendet.' });
    }
    if (a === 'password') {
      if (d.users[me].pw !== await sha(b.old || '')) return no(401, 'Das alte Passwort stimmt nicht.');
      if (String(b.password || '').length < 10) return no(400, 'Das Passwort braucht mindestens 10 Zeichen.');
      d.users[me].pw = await sha(b.password); put(); return ok({ msg: 'Passwort geändert.' });
    }
    if (a === 'delete') {
      if (d.users[me].pw !== await sha(b.password || '')) return no(401, 'Das Passwort stimmt nicht.');
      delete d.users[me]; delete d.data[me]; d.sess = ''; put(); return ok({ csrf: 'test', msg: 'Dein Konto und alle Daten dazu sind gelöscht.' });
    }
    if (a === 'data') { var x = d.data[me]; return ok({ rev: x ? x.rev : 0, updated: 0, data: x ? JSON.parse(x.body) : null }); }
    if (a === 'save') {
      var cur = d.data[me] ? d.data[me].rev : 0;
      if ((b.rev | 0) !== cur) return no(409, 'conflict', { rev: cur });
      d.data[me] = { rev: cur + 1, body: JSON.stringify(b.data) }; put(); return ok({ rev: cur + 1 });
    }
    return no(404, 'unbekannt');
  }
  async function kProbe() {
    if (K.mock) { var m = await mockApi('csrf'); K.csrf = m.csrf; K.ft = m.ft; K.user = m.user; return m; }
    try {
      var r = await fetch(kurl('csrf'), { credentials: 'same-origin', cache: 'no-store', referrerPolicy: 'no-referrer' });
      var j = await r.json();
      if (!j || !j.ok || !j.csrf) return null;
      K.csrf = j.csrf; K.ft = j.ft || ''; K.user = j.user || null;
      return j;
    } catch (e) { return null; }
  }
  function hhmm() { var d = new Date(); return ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2); }
  function kUI() {
    var b = $('accBtn');
    b.hidden = !K.on;
    b.classList.toggle('on', !!K.user && !K.paused && !/fehlgeschlagen|Zu viele/.test(K.state));
    b.classList.toggle('warn', !!K.user && (K.paused || /fehlgeschlagen|Zu viele/.test(K.state)));
    $('accTest').hidden = !K.mock;
    b.title = K.user ? 'Konto: ' + K.user.email + (K.state ? '. ' + K.state : '') : 'Anmelden oder registrieren';
    ['ftKt', 'landKt'].forEach(function (id) { $(id).hidden = !K.on; });
    $('dsKonto').hidden = !K.on;
    $('dsNoK').hidden = K.on; $('dsNoK2').hidden = K.on;
    if (K.probed && K.on && !K.user && (PRO.options || proCached())) proDrop();
    if (K.user && !PRO.options) kProLoad();
    if (current === 'opts' && optLock !== (K.on && !PRO.options)) renderOptions();
    document.querySelectorAll('.lbadge').forEach(function (n) { n.hidden = K.on; });
    if ($('accDlg').open && K.user) { $('acState').textContent = K.paused ? 'Abgleich pausiert. Tippe auf „Jetzt abgleichen“.' : K.state; }
  }
  /* Dialog-Ansichten */
  var ACC_TITLE = { login: 'Anmelden', register: 'Konto anlegen', forgot: 'Passwort vergessen', newpw: 'Neues Passwort', account: 'Konto', chpw: 'Passwort ändern', del: 'Konto löschen', msg: 'Konto' };
  function accView(v, msg, err) {
    document.querySelectorAll('#accDlg [data-v]').forEach(function (n) { n.hidden = n.dataset.v !== v; });
    $('accErr').textContent = err || '';
    $('accMsg').textContent = msg || '';
    $('accTitle').textContent = ACC_TITLE[v];
    if (v === 'account') { $('acMail').textContent = K.user ? K.user.email : ''; kUI(); }
    var f = document.querySelector('#accDlg [data-v="' + v + '"] input:not(.hp)');
    if (f) setTimeout(function () { f.focus(); }, 30);
  }
  /* Formular-Fenster (Konto, Kontakt, Abgleich) ohne showModal: Ein modales Fenster liegt in der obersten Ebene des Browsers, und Passwortmanager
     (Bitwarden u. a.) können ihr Menü dann nicht darüber zeigen und melden "Diese Seite beeinträchtigt …". Hier bleibt das Fenster normal in der Seite,
     der Hintergrund wird mit inert gesperrt und abgedunkelt. */
  var NM = { bg: null, open: [] };
  function nmUpdate() {
    var on = NM.open.length > 0;
    if (on && !NM.bg) { NM.bg = document.createElement('div'); NM.bg.className = 'nmbg'; document.body.appendChild(NM.bg); }
    if (!on && NM.bg) { NM.bg.remove(); NM.bg = null; }
    ['.wrap', 'body > .foot'].forEach(function (s) { var n = document.querySelector(s); if (n) n.inert = on; });
  }
  function openNM(d) {
    if (d.open) return;
    var ld = $('landing'); if (ld.open) ld.close();   // die Startseite ist modal und würde das Fenster verdecken
    d.classList.add('nm'); d.show();
    NM.open.push(d); nmUpdate();
    var f = d.querySelector('input:not([type=hidden]):not(.hp), button, textarea');
    if (f && !d.querySelector('[autofocus]')) { try { f.focus({ preventScroll: true }); } catch (e) {} }
    if (!d.__nm) { d.__nm = true; d.addEventListener('close', function () { NM.open = NM.open.filter(function (x) { return x !== d; }); nmUpdate(); }); }
  }
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape' || !NM.open.length || document.querySelector('dialog[open]:modal')) return;
    NM.open[NM.open.length - 1].close();
  });
  function openAcc(v, msg, err) {
    accView(v || (K.user ? 'account' : 'login'), msg, err);
    openNM($('accDlg'));
  }
  function accForm(v, fn) {
    document.querySelector('#accDlg [data-v="' + v + '"]').addEventListener('submit', async function (e) {
      e.preventDefault();
      var btn = e.target.querySelector('[type=submit]');
      btn.disabled = true; $('accErr').textContent = '';
      try { await fn(); } finally { btn.disabled = false; }
    });
  }
  function accFail(j, dflt) { $('accErr').textContent = j.err || dflt; }
  accForm('login', async function () {
    var mail = $('lgMail').value.trim(), pw = $('lgPw').value;
    if (!mail || !pw) return accFail({}, 'Bitte E-Mail und Passwort eingeben.');
    var j = await kapi('login', { email: mail, password: pw });
    if (!j.ok) return accFail(j, 'Anmeldung fehlgeschlagen.');
    $('lgPw').value = ''; K.user = j.user; K.paused = false; K.rev = 0; K.state = '';
    accView('account', 'Angemeldet.'); kUI(); kPull();
  });
  accForm('register', async function () {
    var mail = $('rgMail').value.trim(), pw = $('rgPw').value;
    if (!mail || !pw) return accFail({}, 'Bitte E-Mail und Passwort eingeben.');
    if (pw !== $('rgPw2').value) return accFail({}, 'Die Passwörter sind nicht gleich.');
    var j = await kapi('register', { email: mail, password: pw, website: $('rgHp').value });
    if (!j.ok) return accFail(j, 'Registrierung fehlgeschlagen.');
    $('rgPw').value = ''; $('rgPw2').value = '';
    accView('msg', j.msg);
  });
  accForm('forgot', async function () {
    var mail = $('fgMail').value.trim();
    if (!mail) return accFail({}, 'Bitte E-Mail eingeben.');
    var j = await kapi('reset-request', { email: mail });
    if (!j.ok) return accFail(j, 'Das hat nicht geklappt.');
    accView('msg', j.msg);
  });
  accForm('newpw', async function () {
    var pw = $('npPw').value;
    if (pw !== $('npPw2').value) return accFail({}, 'Die Passwörter sind nicht gleich.');
    var j = await kapi('reset', { token: K.resetTok, password: pw });
    if (!j.ok) return accFail(j, 'Das hat nicht geklappt.');
    $('npPw').value = ''; $('npPw2').value = ''; K.resetTok = '';
    accView('msg', j.msg);
  });
  accForm('chpw', async function () {
    var j = await kapi('password', { old: $('cpOld').value, password: $('cpNew').value });
    if (!j.ok) return accFail(j, 'Das hat nicht geklappt.');
    $('cpOld').value = ''; $('cpNew').value = '';
    accView('account', j.msg);
  });
  accForm('del', async function () {
    var j = await kapi('delete', { password: $('dlPw').value });
    if (!j.ok) return accFail(j, 'Das hat nicht geklappt.');
    $('dlPw').value = ''; K.user = null; K.rev = 0; K.state = ''; clearTimeout(K.timer); K.timer = null;
    kUI(); accView('login', j.msg);
  });
  $('acOut').addEventListener('click', async function () {
    clearTimeout(K.timer); K.timer = null;
    if (K.user && !K.paused) await kPush(true);
    var wipe = $('acWipe').checked, synced = !K.paused && !/fehlgeschlagen|Zu viele/.test(K.state);
    await kapi('logout', {});
    K.user = null; K.rev = 0; K.state = ''; K.paused = false;
    var note = 'Abgemeldet. Deine Karten bleiben auf diesem Gerät.';
    if (wipe && synced) {
      db.cats = [DEF]; db.cards = []; db.log = {}; db.colors = {};
      persist(); scheduleWrite(); studyDirty = true; show(current);
      note = 'Abgemeldet. Die Karten sind von diesem Gerät entfernt.';
    } else if (wipe) note = 'Abgemeldet. Die Karten bleiben hier, weil der letzte Abgleich nicht geklappt hat.';
    $('acWipe').checked = false;
    kUI(); accView('login', note);
  });
  $('acSync').addEventListener('click', async function () { K.paused = false; K.state = 'Gleiche ab …'; kUI(); await kPull(); });
  $('accDlg').addEventListener('click', function (e) {
    var g = e.target.closest('[data-go]');
    if (g) { accView(g.dataset.go); return; }
    if (e.target.closest('[data-close]')) $('accDlg').close();
    if (e.target.closest('[data-ds]')) openLegal('dsDlg');
  });
  $('accBtn').addEventListener('click', function () { openAcc(); });

  /* Abgleich */
  function userCfg() { var o = clone(CFG); NOSYNC.forEach(function (k) { delete o[k]; }); return o; }
  function snapshot() { return { cards: db.cards, cats: db.cats, log: db.log, colors: db.colors, cfg: userCfg() }; }
  function hasLocal() { return db.cards.length > 0 || Object.keys(db.log).length > 0; }
  function norm(o) { return JSON.stringify(parseData({ cards: o.cards, cats: o.cats, log: o.log, colors: o.colors })); }
  function scheduleSync() {
    if (!K || !K.user || K.paused || K.pulling) return;
    clearTimeout(K.timer);
    K.state = 'Änderungen warten'; kUI();
    K.timer = setTimeout(function () { K.timer = null; kPush(); }, 2000);
  }
  async function kPush(quiet) {
    clearTimeout(K.timer); K.timer = null;
    if (!K.user || K.paused) return;
    if (K.busy) { K.again = true; return; }
    var body = JSON.stringify({ rev: K.rev, data: snapshot() });
    if (body.length > 7500000) { K.state = 'Zu viele Daten für das Konto. Bilder verkleinern oder Karten löschen.'; kUI(); return; }
    K.busy = true;
    var j = await kapi('save', body);
    K.busy = false;
    if (j.ok) { K.rev = j.rev; K.state = 'Gespeichert um ' + hhmm(); }
    else if (j.status === 409) { K.rev = j.rev; K.paused = true; if (!quiet) kAsk('conflict'); }
    else if (j.status === 401) { K.user = null; K.state = ''; toast('Bitte melde dich neu an.'); }
    else { K.state = 'Abgleich fehlgeschlagen: ' + (j.err || 'unbekannt'); K.timer = setTimeout(function () { K.timer = null; kPush(); }, 30000); }
    kUI();
    if (K.again) { K.again = false; scheduleSync(); }
  }
  function kTake(d) {
    K.pulling = true;
    try {
      takeData(parseData({ cards: d.cards, cats: d.cats, log: d.log, colors: d.colors }));
      var keep = {};
      NOSYNC.forEach(function (k) { keep[k] = CFG[k]; });
      CFG = normalize(merge(FILECFG, d.cfg || {}));
      NOSYNC.forEach(function (k) { CFG[k] = keep[k]; });
      saveCfg(); applyCfg();
      REF.forEach(function (f) { f(); });
      studyDirty = true; show(current);
    } finally { K.pulling = false; }
    K.state = 'Konto-Stand geladen um ' + hhmm(); kUI();
  }
  async function kPull() {
    var j = await kapi('data');
    if (!j.ok) { K.state = 'Abgleich fehlgeschlagen: ' + (j.err || 'unbekannt'); kUI(); return; }
    var d = j.data;
    if (!d) { K.rev = 0; if (hasLocal()) await kPush(); else { K.state = 'Das Konto ist noch leer.'; kUI(); } return; }
    if (!hasLocal()) { K.rev = j.rev; kTake(d); toast('Konto-Stand geladen'); return; }
    if (j.rev === K.rev) { await kPush(); return; }
    if (norm(d) === norm(snapshot())) { K.rev = j.rev; K.state = 'Alles aktuell um ' + hhmm(); kUI(); return; }
    K.rev = j.rev; K.paused = true; K.srvCount = d.cards.length;
    kAsk('first');
  }
  async function kPoll() {
    if (!K.user || K.paused || K.busy || K.pulling || document.hidden) return;
    var j = await kapi('data');
    if (!j.ok || !j.data || j.rev === K.rev) return;
    if (K.timer || !hasLocal()) { if (K.timer) { K.rev = j.rev; K.paused = true; K.srvCount = j.data.cards.length; kAsk('conflict'); } else { K.rev = j.rev; kTake(j.data); toast('Neuer Stand vom Konto geladen'); } return; }
    K.rev = j.rev; kTake(j.data); toast('Neuer Stand vom Konto geladen');
  }
  function kAsk(kind) {
    var n = K.srvCount, m = db.cards.length;
    $('syText').textContent = (kind === 'first'
      ? 'Auf dem Konto liegen ' + n + ' Karten, hier sind ' + m + '. Welcher Stand soll gelten?'
      : 'Auf dem Konto liegt ein neuerer Stand, zum Beispiel von einem anderen Gerät. Welcher soll gelten?')
      + ' Der andere wird überschrieben. Tipp: Sichere vorher mit „Karten speichern“.';
    openNM($('syncDlg'));
    kUI();
  }
  $('syServer').addEventListener('click', async function () {
    $('syncDlg').close();
    var j = await kapi('data');
    if (!j.ok || !j.data) { K.state = 'Abgleich fehlgeschlagen'; kUI(); return; }
    K.rev = j.rev; K.paused = false; kTake(j.data); toast('Konto-Stand geladen');
  });
  $('syLocal').addEventListener('click', function () { $('syncDlg').close(); K.paused = false; kPush(); });
  $('syLater').addEventListener('click', function () { $('syncDlg').close(); });
  document.addEventListener('visibilitychange', function () { if (!document.hidden) kPoll(); });
  setInterval(kPoll, 60000);

  /* Kontaktformular */
  async function openContact() {
    $('ctErr').textContent = '';
    openNM($('ctDlg'));
    await kProbe();
  }
  ['ftKt', 'landKt'].forEach(function (id) { $(id).addEventListener('click', openContact); });
  $('ctDlg').addEventListener('click', function (e) {
    if (e.target.closest('[data-close]')) $('ctDlg').close();
    if (e.target.closest('[data-ds]')) openLegal('dsDlg');
  });
  /* Rechenaufgabe vor dem Senden: Der Server gibt eine Aufgabe, der Browser sucht eine Zahl, deren SHA-256 mit genug Nullbits beginnt. Dauert ein bis zwei Sekunden, kostet Bots Zeit, kein Dienst von Dritten. */
  async function powSolve(c) {
    var bits = parseInt(c.split('.')[2], 10), enc = new TextEncoder(), n = 0, B = 128;
    while (true) {
      var jobs = [];
      for (var i = 0; i < B; i++) jobs.push(crypto.subtle.digest('SHA-256', enc.encode(c + ':' + (n + i))));
      var res = await Promise.all(jobs);
      for (var k = 0; k < B; k++) {
        var h = new Uint8Array(res[k]), z = 0;
        for (var q = 0; q < h.length; q++) { if (h[q] === 0) { z += 8; continue; } z += Math.clz32(h[q]) - 24; break; }
        if (z >= bits) return String(n + k);
      }
      n += B;
    }
  }
  $('ctForm').addEventListener('submit', async function (e) {
    e.preventDefault();
    var btn = $('ctSend'); btn.disabled = true; $('ctErr').textContent = '';
    var body = { name: $('ctName').value, email: $('ctMail').value, message: $('ctMsg').value, website: $('ctHp').value, ft: K.ft };
    if (!K.mock) {
      btn.textContent = 'Prüfung läuft';
      try {
        var ch = await kapi('ct-challenge');
        if (!ch.ok) { btn.disabled = false; btn.textContent = 'Senden'; $('ctErr').textContent = ch.err || 'Das hat nicht geklappt.'; return; }
        body.pow = { c: ch.c, n: await powSolve(ch.c) };
      } catch (x) { btn.disabled = false; btn.textContent = 'Senden'; $('ctErr').textContent = 'Dein Browser kann die Prüfung nicht ausführen. Bitte nutze https und einen aktuellen Browser.'; return; }
      btn.textContent = 'Senden';
    }
    var j = await kapi('contact', body);
    btn.disabled = false;
    if (!j.ok) { $('ctErr').textContent = j.err || 'Das hat nicht geklappt.'; if (j.status === 400) await kProbe(); return; }
    $('ctDlg').close(); $('ctMsg').value = ''; toast(j.msg);
  });

  var PROKEY = 'kartenbox-pro';
  function proCached() { try { return !!localStorage.getItem(PROKEY); } catch (e) { return false; } }
  function proInject(code) {
    if (PRO.options) return true;
    try { var sc = document.createElement('script'); sc.textContent = code; document.head.appendChild(sc); sc.remove(); } catch (e) { return false; }
    return !!PRO.options;
  }
  function proApply() {
    if (current === 'opts') renderOptions();
    typeState(); syncPlayer(); try { updateUI(); } catch (e) {}
  }
  /* Nach der ersten Anmeldung auf diesem Gerät: einmal kurz zeigen, wo die zusätzlichen Einstellungen sind */
  function proWelcome() {
    var key = 'kartenbox-konto-hinweis';
    try { if (localStorage.getItem(key)) return; localStorage.setItem(key, '1'); } catch (e) { return; }
    setTimeout(function () {
      confirmDlg('Dein Konto ist aktiv', 'Unter Optionen findest du jetzt Lernarten wie Antwort tippen, Wortbank und Vorlesen, dazu die Statistik. Damit lernst du gezielter.',
        function () { if ($('accDlg').open) $('accDlg').close(); show('opts'); }, 'Zu den Optionen', false, 'Später');
    }, 600);
  }
  async function kProLoad() {
    if (PRO.options || K.proBusy) return;
    K.proBusy = true;
    try {
      var code = '';
      if (K.mock) code = PRO_EMBED || '';
      else { var r = await fetch(kurl('pro'), { credentials: 'same-origin', cache: 'no-store', referrerPolicy: 'no-referrer' }); if (r.ok) code = await r.text(); }
      if (code && proInject(code)) { try { localStorage.setItem(PROKEY, code); } catch (e) {} proApply(); proWelcome(); }
    } catch (e) {}
    K.proBusy = false;
  }
  function proDrop() {
    var was = !!PRO.options;
    try { localStorage.removeItem(PROKEY); } catch (e) {}
    if (was) setTimeout(function () { location.reload(); }, 500);
  }
  function proBoot() {
    var code = '';
    if (PRO_EMBED && !CFG.konto.api && !CFG.konto.test) code = PRO_EMBED;
    else try { code = localStorage.getItem(PROKEY) || ''; } catch (e) {}
    if (code) proInject(code);
  }
  async function kStart() {
    proBoot();
    if (!CFG.konto.api && !CFG.konto.test) return;
    var j = CFG.konto.api && location.protocol.indexOf('http') === 0 ? await kProbe() : null;
    if (!j && CFG.konto.test) { K.mock = true; j = await kProbe(); }
    if (!j) return;
    K.on = true; K.probed = true; kUI();
    var m = location.search.match(/[?&](verify|reset)=([a-f0-9]{64})/);
    if (m) {
      history.replaceState(null, '', location.pathname + location.hash);
      if (m[1] === 'verify') {
        var v = await kapi('verify', { token: m[2] });
        openAcc('msg', v.ok ? v.msg : '', v.ok ? '' : v.err);
      } else { K.resetTok = m[2]; openAcc('newpw'); }
    }
    if (K.user) kPull();
  }

  /* Startseite: je nach Einstellung start.seite immer, einmal am Tag, nur beim ersten Mal oder nie */
  var LAND_KEY = 'kartenbox-start', landShown = false;
  function landing() {
    var m = CFG.start.seite;
    if (m === 'aus') return;
    if (/[?&](verify|reset)=/.test(location.search)) { landShown = true; return; }
    var today = dayKey(), seen = '';
    try { seen = localStorage.getItem(LAND_KEY) || ''; } catch (e) {}
    if ((m === 'einmal' && seen) || (m === 'taeglich' && seen === today)) return;
    try { localStorage.setItem(LAND_KEY, today); } catch (e) {}
    landShown = true;
    $('landing').showModal();
  }
  ['landGo', 'landGo2', 'landClose'].forEach(function (id) { $(id).addEventListener('click', function () { $('landing').close(); }); });
  $('landDemo').addEventListener('click', function () { $('landing').close(); if (!S.demo) setDemo(true); });

  /* Impressum und Datenschutz: Angaben stehen in einstellungen.js (anbieter), Texte werden nur als Text eingesetzt */
  function openLegal(id) {
    document.querySelectorAll('#' + id + ' .lf').forEach(function (s) {
      var v = CFG.anbieter[s.dataset.a];
      s.textContent = v || '[Angabe fehlt]';
      s.classList.toggle('miss', !v);
    });
    $(id).showModal();
    $(id).scrollTop = 0;
  }
  [['ftImp', 'impDlg'], ['landImp', 'impDlg'], ['ftDs', 'dsDlg'], ['landDs', 'dsDlg']].forEach(function (p) {
    $(p[0]).addEventListener('click', function (e) { if (e.ctrlKey || e.metaKey || e.shiftKey || e.button) return; e.preventDefault(); openLegal(p[1]); });
  });
  document.querySelectorAll('dialog.legal [data-close]').forEach(function (b) {
    b.addEventListener('click', function () { b.closest('dialog').close(); });
  });
  $('ftHome').addEventListener('click', function () { landShown = true; $('landing').showModal(); });

  /* Beim ersten Öffnen am Tag: kurzer Hinweis auf die Optionen (kein Muss) */
  var DAY_KEY = 'kartenbox-hinweis-tag';
  function dayHint() {
    var today = dayKey(), seen = '';
    try { seen = localStorage.getItem(DAY_KEY) || ''; } catch (e) { return; }
    if (landShown || seen === today || document.querySelector('dialog[open]')) return;
    try { localStorage.setItem(DAY_KEY, today); } catch (e) { return; }
    confirmDlg('Bereit für heute?', 'Ein Blick in die Optionen lohnt sich. Countdown, Vorlesen, Tagesziel und mehr machen das Lernen leichter. Du kannst aber auch gleich loslegen.', function () { show('opts'); }, 'Optionen ansehen', false, 'Gleich lernen');
  }
  setTimeout(dayHint, 2200);

  load();
  rebuildStudy();
  renderFile();
  fileRestore();
  landing();
  kStart();
})();
