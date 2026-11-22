(function () {
  'use strict';
  /* Sprache: Deutsch ist die Quelle. Für Englisch setzt die App beim Anzeigen die Texte aus dem Wörterbuch ein (exakte Texte und Muster mit {}).
     Gewählt wird mit ?lang=en oder ?lang=de, die Wahl bleibt im Browser. Ohne Wahl gilt Deutsch. */
  var LANG = 'de', EN_DICT = null /*EN_DICT*/, LOC = 'de-DE';
  try {
    var lq = /[?&]lang=(de|en)\b/.exec(location.search);
    LANG = lq ? lq[1] : (localStorage.getItem('kartenbox-lang') === 'en' ? 'en' : 'de');
    if (lq) { localStorage.setItem('kartenbox-lang', LANG); history.replaceState(null, '', location.pathname + location.search.replace(/([?&])lang=(de|en)&?/, '$1').replace(/[?&]$/, '') + location.hash); }
  } catch (e) { if (lq) LANG = lq[1]; }
  /* Online-Build: Das Englisch-Wörterbuch liegt in einer eigenen Datei und wird nur für Englisch nachgeladen (deutsche Besucher sparen etwa 24 KB). Offline-Build: eingebettet. */
  var EN_SRC = null /*EN_SRC*/;
  function go() {
  try { if (sessionStorage.getItem('kartenbox-fade')) { sessionStorage.removeItem('kartenbox-fade'); document.documentElement.classList.add('lin'); setTimeout(function () { document.documentElement.classList.remove('lin'); }, 400); } } catch (e) {}
  var trs = function (t) { return t; };   // Text im Code übersetzen (für Texte, die nicht im DOM stehen)
  if (LANG === 'en' && EN_DICT) {
    LOC = 'en-GB'; document.documentElement.lang = 'en';
    var ED = EN_DICT.exact, EP = EN_DICT.pat.map(function (p) {
      var rx = p[0].split(/(\{n\}|\{\})/).map(function (x) {
        return x === '{}' ? '([\\s\\S]*?)' : x === '{n}' ? '([\\d.,]+)' : x.replace(/[.*+?^$()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
      }).join('');
      return { re: new RegExp('^' + rx + '$'), to: p[1] };
    });
    var enNorm = function (t) { return t.replace(/\s+/g, ' ').trim(); };
    var enStr = function (t, deep) {
      var r = ED[t];
      if (r !== undefined) return r;
      for (var i = 0; i < EP.length; i++) {
        var m = EP[i].re.exec(t);
        if (m) {
          var k = 0;
          return EP[i].to.replace(/\{\}/g, function () {
            var c = m[++k];
            if (deep) return c;
            var x = enStr(c, true);
            if (x === undefined && c.indexOf(', ') > 0) x = c.split(', ').map(function (y) { var z = enStr(y, true); return z === undefined ? y : z; }).join(', ');
            return x === undefined ? c : x;
          });
        }
      }
      return undefined;
    };
    var EN_ATTR = ['title', 'placeholder', 'aria-label', 'alt'], EN_INLINE = /^(A|B|EM|STRONG|SPAN|KBD|CODE|BR|SMALL|SUP|SUB|U|MARK)$/;
    var enNode = function (n) {
      if (n.nodeType === 3) {
        if (n.parentNode && n.parentNode.closest && n.parentNode.closest('[data-nt]')) return;
        var v = n.nodeValue, t = enNorm(v);
        if (t) { var r = enStr(t); if (r !== undefined) n.nodeValue = v.slice(0, v.indexOf(t.charAt(0))) + r + v.slice(v.lastIndexOf(t.charAt(t.length - 1)) + 1); }
        return;
      }
      if (n.nodeType !== 1 || /^(SCRIPT|STYLE)$/i.test(n.tagName) || n.closest('[data-nt], .face')) return;
      EN_ATTR.forEach(function (a) { var v = n.getAttribute(a); if (v) { var r = enStr(enNorm(v)); if (r !== undefined) n.setAttribute(a, r); } });
      if (/^(TEXTAREA|SVG)$/i.test(n.tagName)) return;
      var kids = n.children, mixed = kids.length > 0 && n.childNodes.length > kids.length, i;
      for (i = 0; mixed && i < kids.length; i++) if (!EN_INLINE.test(kids[i].tagName) || kids[i].children.length > 1) mixed = false;
      if (mixed) {
        var h = ED[enNorm(n.innerHTML)];
        if (h !== undefined) { n.innerHTML = h; return; }
      }
      for (i = 0; i < n.childNodes.length; i++) enNode(n.childNodes[i]);
    };
    trs = function (t) { var r = enStr(enNorm(String(t))); return r === undefined ? t : r; };
    enNode(document.body);
    var enObs = new MutationObserver(function (list) {
      enObs.disconnect();
      list.forEach(function (m) {
        if (m.type === 'childList') m.addedNodes.forEach(enNode);
        else if (m.type === 'characterData') enNode(m.target);
        else if (m.target.nodeType === 1) enNode(m.target);
      });
      enObs.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: EN_ATTR });
    });
    enObs.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: EN_ATTR });
    document.title = ED[enNorm(document.title)] || document.title;
  }
  var fh = document.getElementById('ftHilfe'); if (fh && LANG === 'en') fh.setAttribute('href', 'en/help.html');
  var fn = document.getElementById('ftNeu'); if (fn && LANG === 'en') fn.setAttribute('href', 'en/whats-new.html');
  if (fn) {
    var NEUV = '/*NEUV*/', seen = null;
    try { seen = localStorage.getItem('kb-neu-gesehen'); } catch (e) {}
    if (seen !== NEUV) fn.setAttribute('data-neu', LANG === 'en' ? 'New' : 'Neu');
    fn.addEventListener('click', function () { try { localStorage.setItem('kb-neu-gesehen', NEUV); } catch (e) {} fn.setAttribute('data-neu', ''); });
  }
  ['hdLang', 'landLang', 'landLang2'].forEach(function (id) {
    var b = document.getElementById(id); if (!b) return;
    b.textContent = LANG === 'en' ? 'Deutsch' : 'English'; b.lang = LANG === 'en' ? 'de' : 'en';
    if (id === 'hdLang') { b.textContent = LANG === 'en' ? 'DE' : 'EN'; b.title = b.getAttribute('aria-label') === null ? '' : (LANG === 'en' ? 'Deutsch' : 'English'); b.setAttribute('aria-label', b.title); }
    b.dataset.flag = LANG === 'en' ? 'de' : 'en';
    b.addEventListener('click', function () {
      var to = LANG === 'en' ? 'de' : 'en', land = $('landing') && $('landing').open;
      try { localStorage.setItem('kartenbox-lang', to); sessionStorage.setItem('kartenbox-neuladen', '1'); sessionStorage.setItem('kartenbox-sicht', land ? 'land' : (typeof current === 'string' ? current : '')); sessionStorage.setItem('kartenbox-fade', '1'); } catch (e) {}
      document.documentElement.classList.add('lsw');   // kurz ausblenden, dann neu laden: bleibt auf derselben Seite, kein Aufblitzen
      setTimeout(function () { location.href = location.pathname + '?lang=' + to; }, 180);
    });
  });
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
    lernen: { mischen: false, tastatur: true, timer: true, sekunden: 30, tagesziel: 10, richtung: 'vor', tippen: false, wortbank: true, vorlesen: 'aus', sprache: LANG === 'en' ? 'en-GB' : 'de-DE', pruefung: 10, auto: 6, player: false },
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
    /* Rettung: Eine frühere Fassung hat Einstellungen versehentlich unter dem Schlüssel des Abgleich-Stands gespeichert (doppelter Variablenname).
       Liegt dort ein Einstellungs-Objekt (kein Abgleich-Stand), ist es der neuere Stand: übernehmen und den Abgleich-Schlüssel freigeben. */
    var wrong = localStorage.getItem('kartenbox-abgleich');
    if (wrong) { var wo = JSON.parse(wrong); if (wo && !wo.base && !('u' in wo) && wo.schrift && wo.karte) { localStorage.setItem(SKEY, wrong); localStorage.removeItem('kartenbox-abgleich'); } }
  } catch (e) {}
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
    var tc = document.querySelector('meta[name="theme-color"]'); if (tc) tc.setAttribute('content', th === 'dark' ? '#3d2d22' : '#c9a676');   // Statusleiste von Safari passt zum Design
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
      if (c.mst > 0) o.mst = Math.round(Number(c.mst));   // seit wann im obersten Fach (für den Fortschritt)
      if (c.snz > 0) o.snz = Math.round(Number(c.snz));   // auf morgen geschoben: bis dahin nicht in der Runde
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
  function accStop() { clearTimeout(accTimer); accAnims.forEach(function (a) { try { a.cancel(); } catch (e) {} }); accAnims = []; $('dock').classList.remove('acc-wait'); $('dock').style.clipPath = ''; }
  /* Die Unterlage verdeckt das Zubehör: Der ruhende Behälter bekommt ein Loch in Größe der Unterlage. Nur das Zubehör wandert, so flackert nichts. */
  function accClip() {
    var dk = $('dock').getBoundingClientRect(), pad = document.querySelector('.wrap').getBoundingClientRect(), L = Math.round(pad.left - dk.left), R = Math.round(pad.right - dk.left);
    $('dock').style.clipPath = 'polygon(-5000px -5000px, ' + L + 'px -5000px, ' + L + 'px 5000px, ' + R + 'px 5000px, ' + R + 'px -5000px, 5000px -5000px, 5000px 6000px, -5000px 6000px)';
  }
  function accShift(e, left) {   // so weit schieben, dass es ganz unter der Unterlage liegt
    var pad = document.querySelector('.wrap').getBoundingClientRect(), r = e.getBoundingClientRect();
    return (left ? pad.left - r.left + 8 + 30 : pad.right - r.right - 8 - 30) + 'px 0';
  }
  function accRun(out) {   // out: zurück unter die Unterlage. Gibt ein Versprechen zurück, das am Ende erfüllt ist.
    var dk = $('dock'), T = CFG.animation.tempo, rnd = function (lo, hi) { return lo + Math.random() * (hi - lo); }, ease = 'cubic-bezier(.2, .8, .2, 1)', list = [];
    accClip();
    [['#accS', true], ['#accC', false]].forEach(function (p) {
      var e = dk.querySelector(p[0]); if (!e || !e.firstElementChild || e.firstElementChild.hidden) return;
      var f = [{ translate: accShift(e, p[1]) }, { translate: '0 0' }];
      var an = e.animate(out ? [f[1], f[0]] : f, { duration: (out ? rnd(450, 650) : rnd(700, 950)) / T, easing: out ? 'cubic-bezier(.5, 0, .8, .4)' : ease, delay: (out ? rnd(0, 220) : rnd(0, 380)) / T, fill: out ? 'forwards' : 'backwards' });
      accAnims.push(an); list.push(an.finished);
    });
    var done = Promise.all(list);
    if (!out) done.then(function () { dk.style.clipPath = ''; }, function () {});
    return done;
  }
  function accOut() { var dk = $('dock'); if (!accOK() || dk.hidden) return Promise.resolve(); accStop(); return accRun(true).catch(function () {}); }
  function tryAcc() {
    var dk = $('dock');
    if (!accIntro || dk.hidden || !accOK()) return;
    accIntro = false; accStop();
    dk.classList.add('acc-wait');
    accTimer = setTimeout(function () { dk.classList.remove('acc-wait'); accRun(false); }, 900);
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
  /* Handy: Rubriken hat keinen eigenen Tab, sondern liegt als Umschalter im Karten-Tab */
  var PHONE = window.matchMedia ? matchMedia('(max-width: 600px)') : { matches: false };
  function syncTabs() {
    var tv = current === 'cats' && PHONE.matches ? 'all' : current;
    document.querySelectorAll('.tab').forEach(function (t) { t.setAttribute('aria-selected', String(t.dataset.view === tv)); });
    document.querySelectorAll('.catseg button').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.go === current)); });
  }
  document.addEventListener('click', function (e) { var b = e.target.closest && e.target.closest('.catseg [data-go]'); if (b && b.dataset.go !== current) show(b.dataset.go); });
  if (PHONE.addEventListener) PHONE.addEventListener('change', function () { syncTabs(); moveInd(false); });
  function show(view) {
    if (view !== 'study') autoStop();
    if (current === 'opts' && view !== 'opts') neuNow = false;
    if (current === 'prog' && view !== 'prog' && PRO.progLeave) PRO.progLeave();
    current = view;
    syncTabs();
    document.querySelectorAll('.view').forEach(function (v) { v.classList.toggle('active', v.id === 'view-' + view); });
    moveInd(true);
    if (view === 'study') { accIntro = true; if (studyDirty) rebuildStudy(); else if (!$('stage').hidden) layout(); syncPlayer(); tryAcc(); }
    if (view === 'add') { renderAddChips(); resetAdd(); $('newQ').focus(); }
    if (view === 'all') { renderListChips(); renderList(); }
    if (view === 'cats') renderCats();
    if (view === 'prog') renderProg();
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
    function rest(q) {   // q: nur nachführen (Start, Größenänderung, Schrift geladen), ohne Gleiten
      var w = t.offsetWidth, l = t.offsetLeft;
      if (q) i.style.transition = 'none';
      i.style.width = w + 'px'; i.style.transform = 'translateX(' + l + 'px)'; i.classList.remove('moving');
      if (q) requestAnimationFrame(function () { requestAnimationFrame(function () { i.style.transition = ''; }); });
    }   // erst lesen, dann schreiben (kein erzwungenes Layout)
    clearTimeout(indT);
    if (anim === true && a && prevTab !== idx && CFG.animation.an) {
      // ein Zug: Streifen, Linie und Stift gleiten gemeinsam zum neuen Tab
      var w2 = t.offsetWidth, l2 = t.offsetLeft;
      i.classList.add('moving');
      i.style.width = w2 + 'px'; i.style.transform = 'translateX(' + l2 + 'px)';
      indT = setTimeout(function () { i.classList.remove('moving'); }, 520 / CFG.animation.tempo);
    } else rest(anim !== true);
    prevTab = idx;
    if (PHONE.matches) setTimeout(function () { rest(anim !== true); }, 400);   // der aktive Tab klappt auf: danach Marke an die endgültige Breite setzen
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
    var pinned = false, pmt = 0;
    function narrow() { return innerWidth < 760 && !matchMedia('(max-width: 340px), (max-height: 520px)').matches; }
    function pin(on) {   // Handy: Leiste wird sofort beim ersten Scrollen fest oben angeheftet (Platzhalter hält die Höhe)
      pinned = on;
      if (on) {
        var r = f.getBoundingClientRect(), cs = getComputedStyle(f);
        pmt = parseFloat(cs.marginTop) || 0;
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
      // Anheften erst, wenn die Leiste selbst oben ankommt. Vorher scrollen Kopfzeile und Reiter ganz normal weg.
      var top = nar ? 8 : (parseFloat(getComputedStyle(f).top) || 0);
      set(active && (nar && pinned ? sent.getBoundingClientRect().top + pmt : nar ? f.getBoundingClientRect().top : sent.getBoundingClientRect().top) < top - 1);
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
    // Zwei Ablagen (Später oben, Nochmal darunter) in der linken Spalte, wenn dort Platz ist. Sonst eine gemeinsame „Ablage“ (Handy).
    var two = r.wide && pileTop + 2 * sh + 12 <= H - 4;
    S.two = two;
    var h2 = $('shelf2').style;
    h2.left = '4px'; h2.top = (pileTop + sh + 12) + 'px'; h2.width = sw + 'px'; h2.height = sh + 'px';
    h2.setProperty('--hd', (g.hd * ss) + 'px'); h2.setProperty('--plabel', Math.max(9, g.hd * ss * 0.5) + 'px');
    $('endBox').style.top = r.bigCy + 'px';
    return {
      hx: 4 + sw / 2, sy2: pileTop + sh + 12 + sh / 2, nFull: r.nFull, W: W, g: g, f: f, cw: r.cw, ch: r.ch, bigCy: r.bigCy, fanCy: r.fanCy, H: H, ss: ss,
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
  /* Symbol „Karte hat ein Bild“: Font Awesome Free 7 (CC BY 4.0), lokal eingebettet, kein externer Link */
  var IMG_ICON = '<svg class="picico" viewBox="96 96 448 448" aria-hidden="true" focusable="false"><path fill="currentColor" d="M160 96C124.7 96 96 124.7 96 160L96 480C96 515.3 124.7 544 160 544L480 544C515.3 544 544 515.3 544 480L544 160C544 124.7 515.3 96 480 96L160 96zM224 176C250.5 176 272 197.5 272 224C272 250.5 250.5 272 224 272C197.5 272 176 250.5 176 224C176 197.5 197.5 176 224 176zM368 288C376.4 288 384.1 292.4 388.5 299.5L476.5 443.5C481 450.9 481.2 460.2 477 467.8C472.8 475.4 464.7 480 456 480L184 480C175.1 480 166.8 475 162.7 467.1C158.6 459.2 159.2 449.6 164.3 442.3L220.3 362.3C224.8 355.9 232.1 352.1 240 352.1C247.9 352.1 255.2 355.9 259.7 362.3L286.1 400.1L347.5 299.6C351.9 292.5 359.6 288.1 368 288.1z"/></svg>';
  /* Knopf unten rechts auf der Karte. Mit der Maus darüber erscheint ein Klebeband-Zettel mit Vorschau, ein Klick vergrößert das Bild. */
  function picBtn(src) {
    var b = el('button', 'picbtn');
    b.type = 'button'; b.setAttribute('aria-label', 'Bild zu dieser Karte vergrößern');
    b.insertAdjacentHTML('beforeend', IMG_ICON);
    var t = el('span', 'tape'), ti = el('span', 'tapein'), im = el('img'), l1 = el('b', null, 'Bild zur Karte'), l2 = el('small', null, 'Klicken zum Vergrößern');
    im.src = src; im.alt = ''; im.draggable = false;
    ti.appendChild(im); ti.appendChild(l1); ti.appendChild(l2);
    t.appendChild(ti); b.appendChild(t);
    b._src = src;
    return b;
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
    f.appendChild(sh);
    if (img) f.appendChild(picBtn(img));
    return f;
  }
  function shelfT(d, rot, second) { return 'translate(' + (d.hx - d.W / 2) + 'px,' + ((second ? d.sy2 : d.sy) - d.bigCy) + 'px) rotate(' + rot + 'deg) scale(' + d.ss + ')'; }
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
      e.style.transform = fresh ? ((S.origin && S.origin[id]) || stackT(d, 0)) : back;   // neue Runde: vom Stapel rechts. Aus der Ablage geholt: vom jeweiligen Ablagestapel links
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
  function isSnoozed(c) { return !!c.snz && c.snz > Date.now(); }
  function snoozedN() { return (S.demo ? demoCards().filter(function (c) { return S.dcat === null || c.cat === S.dcat; }) : catList()).filter(isSnoozed).length; }
  function isDue(c) { return !c.n || (c.due || 0) <= Date.now(); }
  function isHard(c) { return c.last === 'bad'; }
  function baseList() { return (S.demo ? demoCards().filter(function (c) { return S.dcat === null || c.cat === S.dcat; }) : catList()).filter(function (c) { return !isSnoozed(c); }); }
  function catList() { return db.cards.filter(function (c) { return S.cat === null || c.cat === S.cat; }); }
  function dayKey(t) {
    var d = t ? new Date(t) : new Date();
    return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
  }
  /* Serie: Tage in Folge mit Lernen. Ein freier Tag unterbricht sie nicht, aber höchstens einer je 7 Tage (der freie Tag selbst zählt nicht mit). */
  function streak(lg) {
    lg = lg || db.log;
    var d = new Date(), n = 0, since = 7;
    if (!lg[dayKey(d)]) d.setDate(d.getDate() - 1);   // heute noch nicht gelernt: Serie zählt ab gestern
    for (var g = 0; g < 4000; g++) {
      if (lg[dayKey(d)]) { n++; since++; }
      else {
        var p = new Date(d); p.setDate(p.getDate() - 1);
        if (since >= 7 && lg[dayKey(p)]) since = 0;   // ein freier Tag, davor wurde gelernt
        else break;
      }
      d.setDate(d.getDate() - 1);
    }
    return n;
  }
  /* Kleine Zeilen der Rechner-Anzeige: Fach der offenen Karte, richtig/nochmal in dieser Runde, Tagesziel */
  function lcdInfo() {
    var c = S.sel && byId(S.sel), g = CFG.lernen.tagesziel, t = (db.log[dayKey()] || {}).n || 0;
    $('lcdBox').textContent = 'FACH ' + (c ? (c.box || 1) : '–');
    $('lcdR').textContent = '+' + (S.round ? S.round.ok : 0) + ' −' + (S.round ? S.round.bad : 0);
    $('lcdG').textContent = 'HEUTE ' + t + (g ? '/' + g : '');
  }
  /* Begrüßung mit Nickname und Tagesdatum. Ohne Konto oder Nickname bleibt die Zeile weg. */
  function greet() {
    var g = $('greet'), nick = (typeof K !== 'undefined' && K.user && K.user.nick) || '';
    if (!nick) { g.hidden = true; return; }
    var d = new Date(), h = d.getHours();
    $('greetHi').textContent = (h >= 5 && h < 11 ? 'Guten Morgen' : h >= 11 && h < 17 ? 'Guten Tag' : h >= 17 && h < 22 ? 'Guten Abend' : 'Hallo') + ', ' + nick + '.';
    var n = S.demo ? 0 : db.cards.filter(function (c) { return isDue(c) && !isSnoozed(c); }).length, day = d.toLocaleDateString(LOC, { weekday: 'long', day: 'numeric', month: 'long' });
    $('greetSub').textContent = day + (S.demo || !db.cards.length ? '' : n ? ' · ' + n + (n === 1 ? ' Karte fällig' : ' Karten fällig') : ' · heute nichts fällig');
    g.hidden = false;
  }
  /* Tagesziel-Leiste oben auf der Lernen-Seite. Beim Erreichen drückt sich ein goldenes Siegel auf, fällt der Wert wieder darunter, verschwindet es. */
  var tgzHit = null;
  function goalStrip() {
    var g = CFG.lernen.tagesziel, box = $('tgz');
    if (S.demo || !g || !db.cards.length) { box.hidden = true; tgzHit = null; return; }
    var t = (db.log[dayKey()] || {}).n || 0, hit = t >= g, first = box.hidden, bar = $('tgzBar');
    box.hidden = false;
    $('tgzTxt').textContent = t + ' von ' + g;
    var w = Math.min(100, t / g * 100) + '%';
    if (first) { bar.style.width = '0'; void bar.offsetWidth; }
    bar.style.width = w;
    if (hit && tgzHit === false) { box.classList.add('fresh'); box.classList.remove('undo'); box.classList.add('done'); setTimeout(function () { box.classList.remove('fresh'); }, 1600); }
    else if (hit) box.classList.add('done');
    else if (tgzHit) { box.classList.add('undo'); box.classList.remove('fresh'); setTimeout(function () { box.classList.remove('done', 'undo'); }, 320 / CFG.animation.tempo); }
    else box.classList.remove('done', 'fresh', 'undo');
    tgzHit = hit;
  }
  function updateStats() {
    lcdInfo(); greet(); goalStrip();
    var bar = $('statsBar');
    if (S.demo || !db.cards.length) { bar.hidden = true; return; }
    bar.hidden = false; bar.textContent = '';
    var list = catList(), sit = list.filter(function (c) { return c.n && c.box >= 4; }).length;
    var w = el('div', 'sw');
    w.appendChild(el('span', null, sit + ' von ' + list.length + ' sitzen'));
    var b = el('div', 'sbar'), i = el('i');
    i.style.width = (list.length ? sit / list.length * 100 : 0) + '%';
    b.appendChild(i); w.appendChild(b); bar.appendChild(w);
    if (S.exam) bar.appendChild(el('span', 'goal hit', 'Prüfung'));
    var st = streak(), sb = el('button', 'btn statlink', 'Serie ' + st + (st === 1 ? ' Tag' : ' Tage') + ' · Fortschritt'); sb.type = 'button'; sb.addEventListener('click', function () { show('prog'); });
    bar.appendChild(sb);
  }
  /* Fortschritt: ohne Konto nur ein Hinweis, mit Konto kommt die Ansicht aus pro.js (Tag, Monat, Jahr, Demo). */
  function renderProg() {
    var r = $('fpRoot');
    r.textContent = '';
    if (!K.user && K.on) {   // ohne Konto-System (lokale Datei) ist der Fortschritt frei
      var g = el('section', 'group teaser');
      g.appendChild(el('h3', null, 'Fortschritt'));
      g.appendChild(el('p', null, 'Hier siehst du, wie viele Karten du gelernt hast, nach Rubriken geordnet, für Tag, Monat und Jahr. Das gibt es mit einem kostenlosen Konto.'));
      var row = el('div', 'row');
      var b1 = el('button', 'btn primary', 'Konto anlegen'); b1.type = 'button'; b1.addEventListener('click', function () { openAcc('register'); });
      var b2 = el('button', 'btn', 'Anmelden'); b2.type = 'button'; b2.addEventListener('click', function () { openAcc('login'); });
      row.appendChild(b1); row.appendChild(b2); g.appendChild(row); r.appendChild(g);
      return;
    }
    if (PRO.progress) { PRO.progress(r); return; }
    r.appendChild(el('p', 'hint', 'Wird geladen …'));
    proExt(function (ok) {
      if (current !== 'prog') return;
      if (ok && PRO.progress) PRO.progress(r); else { r.textContent = ''; r.appendChild(el('p', 'hint', 'Der Fortschritt konnte nicht geladen werden. Bitte lade die Seite neu.')); }
    });
  }
  /* Zusatzfunktionen (Fortschritt, Tippen, Vorlesen, Kassettenplayer, Prüfung, Richtung): Der Code liegt nicht in dieser Datei, er kommt nach der Anmeldung vom Server (api/inc/pro.js). Ohne ihn tun die Platzhalter nichts. */
  var PRO = {}, PRO_EMBED = null /*PRO_EMBED*/;
  function proNeed() { toast('Das gibt es mit Konto'); if (typeof openAcc === 'function') openAcc('login'); }
    function typeState() { if (PRO.typeState) PRO.typeState(); else { $('typeRow').hidden = true; $('bankRow').hidden = true; } }
  function speakCard(b) { if (PRO.speakCard) PRO.speakCard(b); }
  function playerOff() { $('playerOff').hidden = !(K.user && window.innerWidth >= 900 && $('player').hidden && !$('stage').hidden); }
  function syncPlayer() { if (PRO.syncPlayer) PRO.syncPlayer(); else $('player').hidden = true; playerOff(); }
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
    d('openEdit', function () { return openEdit; }, function (v) { openEdit = v; });
    d('LANG', function () { return LANG; });
    d('LOC', function () { return LOC; });
    d('tr', function () { return trs; });
    d('goalStrip', function () { return goalStrip; }, function (v) { goalStrip = v; });
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
    S.snzN = 0; S.total = S.list.length; S.done = 0; S.sel = null; S.round = { ok: 0, bad: 0 }; S.marks = {}; S.shelf = [];
    S.rank = {}; S.queue.forEach(function (id, i) { S.rank[id] = i; });
    var has = S.list.length > 0;
    var filtered = !has && (base.length > 0 || snoozedN() > 0);   // Karten gibt es, nur der Filter ist leer
    $('studyEmpty').hidden = has;
    $('emptyMsg').textContent = filtered ? (!base.length ? 'Alle Karten sind auf morgen geschoben.' : mode === 'faellig' ? 'Heute ist nichts mehr fällig. Alles sitzt.' : mode === 'pin' ? 'Noch keine Karte angeheftet. Tippe bei einer geöffneten Karte auf die Pinnadel.' : 'Keine schweren Karten. Gut gemacht.')
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
  /* Hauptstapel leer, aber Karten liegen noch in der Ablage: Nichts kommt von selbst zurück. Du holst Später und Nochmal einzeln und arbeitest sie ab.
     Erst wenn alles erledigt ist, erscheint „Alle Karten geschafft“ mit „Neue Runde“ (alle Karten wieder in den Stapel). */
  function showPiles() {
    var sk = shelfKind('skip').length, bd = shelfKind('bad').length, two = !!S.two, parts = [];
    if (two) { if (sk) parts.push('Später ' + sk); if (bd) parts.push('Nochmal ' + bd); } else parts.push('Ablage ' + S.shelf.length);
    $('endMsg').textContent = 'Stapel geschafft: ' + S.done + ' von ' + S.total + '. Noch offen: ' + parts.join(', ') + '.';
    $('endLater').textContent = two ? 'Später holen (' + sk + ')' : 'Ablage holen (' + S.shelf.length + ')';
    $('endLater').hidden = two ? !sk : false;
    $('endBad').textContent = 'Nochmal holen (' + bd + ')';
    $('endBad').hidden = !two || !bd;
    $('endAll').textContent = 'Alle holen (' + S.shelf.length + ')';
    $('endTomorrow').textContent = 'Später auf morgen (' + sk + ')'; $('endTomorrow').hidden = !sk;
    $('endAll').hidden = !(two && sk && bd);   // „Alle“ gibt es nur, wenn beide Stapel Karten haben
    $('newRound').hidden = true; $('examBtn').hidden = true;
    $('endBox').hidden = false;
  }
  /* Ablage: Mit Platz zwei Stapel nebeneinander, „Später“ (Weiter, blauer Reiter) und „Nochmal“ (rosa Reiter). Jeder holt nur seine Karten zurück.
     Ohne Platz (Handy) liegt alles in einer gemeinsamen „Ablage“. */
  function shelfPile(p, ids, label) {
    p.textContent = '';
    p.hidden = !ids.length;
    if (!ids.length) return;
    var show = ids.slice(-3);
    show.forEach(function (id, j) {   // Karten liegen gestapelt, ein Streifen Klebeband mit Aufschrift klebt darüber
      var c = byId(id), sc = el('div', 'sc'), depth = show.length - 1 - j;
      sc.dataset.mark = S.marks[id] || '';
      sc.dataset.pin = c && c.pin ? '1' : '';
      if (depth > 0) sc.style.transform = 'translate(' + (-depth * 3) + 'px,' + (depth * 3) + 'px) rotate(' + ((depth % 2 ? -1 : 1) * depth * 1.5) + 'deg)';
      p.appendChild(sc);
    });
    p.appendChild(el('span', 'tape', label + ' ' + ids.length));
    p.setAttribute('aria-label', label + ' mit ' + ids.length + ' Karten, zurück in den Fächer holen');
  }
  function shelfKind(kind) { return S.shelf.filter(function (id) { return kind === 'bad' ? S.marks[id] === 'bad' : S.marks[id] !== 'bad'; }); }
  function renderShelf() {
    if (S.two) { shelfPile($('shelf'), shelfKind('skip'), 'Später'); shelfPile($('shelf2'), shelfKind('bad'), 'Nochmal'); }
    else { shelfPile($('shelf'), S.shelf, 'Ablage'); shelfPile($('shelf2'), [], ''); }
  }
  /* Ablage zurück: Die Karten kommen vor den Rest der Runde. kind: 'skip' oder 'bad' holt nur diesen Stapel, sonst alles. */
  function recall(kind) {
    if (!S.shelf.length) return;
    var ids = kind ? shelfKind(kind) : S.shelf.slice();
    if (!ids.length) return;
    var d0 = dims(); S.origin = {};
    ids.forEach(function (id) { S.origin[id] = shelfT(d0, -7, !!S.two && S.marks[id] === 'bad'); });
    S.queue = ids.concat(S.queue);
    S.shelf = S.shelf.filter(function (id) { return ids.indexOf(id) < 0; });
    S.sel = null; stopTimer();
    clearEls();
    $('endBox').hidden = true;
    renderShelf();
    fill(0);
    S.origin = null;
    updateUI();
  }
  function updateUI() {
    var e = S.sel && S.els[S.sel];
    $('flipBtn').disabled = !e;
    $('nextBtn').disabled = !e;
    var fl = !!(e && e._flipped);
    $('nextBtn').hidden = fl; $('badBtn').hidden = !fl; $('okBtn').hidden = !fl;   // Handy und Tablet: nur die passenden Tasten. Am Rechner bleiben alle stehen (CSS), die unpassenden sind grau
    $('nextBtn').disabled = !e || fl; $('badBtn').disabled = !fl; $('okBtn').disabled = !fl;
    $('flipBtn').textContent = e && e._flipped ? 'Frage zeigen' : 'Lösung zeigen';
    var step = !e ? 0 : (e._flipped ? 2 : 1);
    document.querySelectorAll('#steps li').forEach(function (li, i) {
      li.classList.toggle('now', i === step);
      li.classList.toggle('done', i < step);
    });
    $('slot').classList.toggle('off', !!S.sel || !S.queue.length);
    $('lcdN').textContent = S.done + '/' + S.total;   // Anzeige des Taschenrechners
    lcdInfo();
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
    if (S.shuffling) return;
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
    if (!S.sel) return;   // auch während des Countdowns lässt sich die Karte sofort umdrehen (stopTimer unten)
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
      if (!S.queue.length && S.shelf.length) { showPiles(); updateUI(); return; }
      if (!S.queue.length) showEnd();
      updateUI();
    }, ms);
  }
  function showEnd() {
    $('endLater').hidden = true; $('endBad').hidden = true; $('endAll').hidden = true; $('endTomorrow').hidden = true; $('newRound').hidden = false;
    $('endMsg').textContent = S.exam ? examText() : 'Alle Karten geschafft.' + (S.round.ok + S.round.bad ? ' Gewusst: ' + S.round.ok + ', Nochmal: ' + S.round.bad + '.' : '') + (S.snzN ? ' Auf morgen geschoben: ' + S.snzN + '.' : '');
    $('examBtn').hidden = S.demo;
    $('endBox').hidden = false;
  }
  /* Später auf morgen: Die Karten verlassen die Runde und kommen morgen wieder (unter „Fällig“). Fach und Lernstand bleiben, es zählt nicht als Fehler. */
  function snoozeLater() {
    var ids = shelfKind('skip');
    if (!ids.length) return;
    var t = new Date(); t.setHours(24, 0, 0, 0); t = t.getTime();
    ids.forEach(function (id) {
      var c = byId(id); if (!c) return;
      c.snz = t;
      if (c.n && (c.due || 0) > t) c.due = t;
    });
    if (!S.demo) { persist(); scheduleWrite(); }
    S.shelf = S.shelf.filter(function (id) { return ids.indexOf(id) < 0; });
    S.total -= ids.length; S.snzN += ids.length;
    renderShelf(); renderModes(); updateUI();
    if (S.shelf.length) showPiles(); else showEnd();
    toast(ids.length + (ids.length === 1 ? ' Karte kommt' : ' Karten kommen') + ' morgen wieder');
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
    e.style.transform = shelfT(d, -7, !!S.two && kind === 'bad');
    fill(250);
    updateUI();
    var ms = CFG.animation.an ? Math.round(900 / CFG.animation.tempo) : 30;
    setTimeout(function () {
      e.remove();
      if (gen !== S.gen) return;
      renderShelf();
      if (!S.queue.length) showPiles();
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
      var ob = c.box || 1;
      c.box = ok ? Math.min(5, ob + 1) : 1;
      if (ok && c.box === 5 && ob < 5 && !S.demo) c.mst = Date.now();
      c.due = ok ? Date.now() + DAYS[c.box] * 864e5 : 0;
      delete c.snz;
    }
    if (c && !S.demo) {
      var k = dayKey(), L = db.log[k] || (db.log[k] = { n: 0, ok: 0 });
      L.n++; if (ok) L.ok++;
      (L.c || (L.c = [])).push([id, ok ? 1 : 0]); if (L.c.length > 400) L.c.shift();
      persist(); scheduleWrite();
      if (PRO.profile) try { PRO.profile(); } catch (e) {}
    }
    S.round[ok ? 'ok' : 'bad']++;
    if (S.exam) S.exam[ok ? 'ok' : 'bad']++;
    if (ok || S.exam) { delete S.marks[id]; next(); } else putBack('bad');
    updateStats(); renderModes();
  }
  /* Mischen: Nur die ausgelegten Karten werden gemischt, der Stapel bleibt wie er ist.
     Die Karten sammeln sich zu einem Päckchen, werden wie beim Kartenmischen gesplittet und ineinandergeschoben und fächern sich dann in neuer Reihenfolge wieder auf. */
  function shuffle() {
    if (S.shuffling) return;
    var n = Math.min(CFG.faecher.anzahl, S.queue.length);
    if (n < 2) return;
    var old = S.queue.slice(0, n), vis = old.slice(), t = 0;
    do { shuffleArr(vis); } while (vis.join() === old.join() && ++t < 8);
    if (vis.join() === old.join()) vis.push(vis.shift());
    S.queue = vis.concat(S.queue.slice(n));
    stopTimer();
    var d = dims();
    var els = old.map(function (id) { return S.els[id]; });
    if (!CFG.animation.an || els.indexOf(undefined) >= 0 || !stage.isConnected) {
      S.sel = null; clearEls(); fill(0); updateUI(); toast('Gemischt'); return;
    }
    S.shuffling = true;
    var k = 1 / (CFG.animation.tempo || 1), alive = function () { return els.every(function (e) { return e.isConnected; }); };
    function ph(ms, fn) { setTimeout(function () { if (alive()) fn(); else S.shuffling = false; }, ms * k); }
    function move(e, tr, dur, delay) { e.style.transition = 'transform ' + (dur * k) + 'ms cubic-bezier(.4,0,.2,1)'; e.style.transitionDelay = (delay * k) + 'ms'; e.style.transform = tr; }
    function pile(i, dx, a) { return fanT({ dx: dx, dy: -i * 0.6, a: a }, d); }
    var off = d.cw * 0.34;
    els.forEach(function (e) { e.classList.remove('sel'); setFlip(e, false); });
    S.sel = null;
    // 1. zum Päckchen
    els.forEach(function (e, i) { e.style.zIndex = 10 + (n - i); move(e, pile(i, 0, (i % 3 - 1) * 1.5), 340, i * 22); });
    // 2. Päckchen teilen: eine Hälfte nach links, die andere nach rechts
    ph(340 + n * 22 + 40, function () {
      els.forEach(function (e, i) { var l = i % 2 === 0; move(e, pile(i, l ? -off : off, l ? -5 : 5), 260, 0); });
    });
    // 3. ineinanderschieben: neue Reihenfolge, die Karten wechseln beim Zusammenrutschen die Lage
    ph(340 + n * 22 + 40 + 300, function () {
      vis.forEach(function (id, i) { var e = S.els[id]; e.style.zIndex = 10 + (n - i); move(e, pile(i, 0, (i % 3 - 1) * 1.5), 280, i * 30); });
    });
    // 4. neu auffächern
    ph(340 + n * 22 + 40 + 300 + 280 + n * 30 + 60, function () {
      S.shuffling = false;
      vis.forEach(function (id, i) { var e = S.els[id]; e.style.transition = ''; e.style.transitionDelay = (i * 60 * k) + 'ms'; });
      layout(); updateUI();
      setTimeout(function () { vis.forEach(function (id) { if (S.els[id]) S.els[id].style.transitionDelay = ''; }); }, (n * 60 + 900) * k);
      toast('Gemischt');
    });
  }

  stage.addEventListener('click', function (e) {
    if (e.target.closest('#endBox, #player')) return;
    var f = e.target.closest('.fcard');
    if (S.shuffling) return;
    if (!f) { deselect(); return; }
    var id = f.dataset.id;
    if (!S.els[id]) return;
    if (e.target.closest('.pinbtn') && S.sel === id) { togglePin(id); return; }
    if (S.sel !== id) { select(id); return; }
    var c = S.els[id];
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
  $('shelf').addEventListener('click', function () { recall(S.two ? 'skip' : null); });
  $('shelf2').addEventListener('click', function () { recall('bad'); });
  $('newRound').addEventListener('click', rebuildStudy);
  $('endLater').addEventListener('click', function () { recall(S.two ? 'skip' : null); });
  $('endBad').addEventListener('click', function () { recall('bad'); });
  $('endAll').addEventListener('click', function () { recall(); });
  $('endTomorrow').addEventListener('click', snoozeLater);
  $('examBtn').addEventListener('click', startExam);
  var resizeT = 0;
  window.addEventListener('resize', function () {   // gebündelt: höchstens ein Neuaufbau pro Frame
    cancelAnimationFrame(resizeT);
    resizeT = requestAnimationFrame(function () {
      if (current === 'study' && !stage.hidden) { var was = S.two; layout(); if (S.two !== was) renderShelf(); }
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
      var pos = r[0] + sel.length + 4; q.focus(); q.setSelectionRange(pos, pos); q.dispatchEvent(new Event('input'));   // input: Knopfbeschriftung und Lösungsfeld ziehen nach
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
      var cp = el('p', 'cat', c.cat === DEF ? trs(c.cat) : c.cat), cd = el('i', 'dot'); cd.style.background = catColor(c.cat); cp.insertBefore(cd, cp.firstChild);
      var qp = el('p', 'q', c.q), ap = el('p', 'a', c.a); cp.setAttribute('data-nt', ''); qp.setAttribute('data-nt', ''); ap.setAttribute('data-nt', '');
      box.appendChild(cp);
      box.appendChild(qp);
      box.appendChild(ap);
      if (c.img) { var th = el('img', 'thumb'); th.src = c.img; th.alt = 'Bild zur Frage'; box.appendChild(th); }
      if (c.tags && c.tags.length) {
        var tl = el('p', 'tags');
        tl.setAttribute('data-nt', '');
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
  var DEMO = {"version": 2, "cats": ["Mathe", "Physik", "Chemie", "Biologie", "Geschichte", "Erdkunde"], "cards": [{"id": "demo01", "cat": "Mathe", "q": "Im rechtwinkligen Dreieck gilt a² + b² = c². Die längste Seite c heißt {{Hypotenuse}}.", "a": ""}, {"id": "demo02", "cat": "Mathe", "q": "Löse die Gleichung 3x + 5 = 20.", "a": "Erst 5 abziehen: 3x = 15. Dann durch 3 teilen: x = 5."}, {"id": "demo03", "cat": "Mathe", "q": "Wie berechnet man den Flächeninhalt eines Kreises mit dem Radius r?", "a": "A = π · r². Beispiel: r = 3 cm ergibt etwa 28,3 cm²."}, {"id": "demo04", "cat": "Physik", "q": "Wie berechnet man die Geschwindigkeit?", "a": "v = s : t (Strecke geteilt durch Zeit). 120 km in 2 Stunden ergeben 60 km/h."}, {"id": "demo05", "cat": "Physik", "q": "Nach dem Ohmschen Gesetz ist die Spannung gleich Widerstand mal {{Stromstärke}}.", "a": ""}, {"id": "demo06", "cat": "Chemie", "q": "Die chemische Formel von Wasser ist {{H₂O}}, die von Kohlenstoffdioxid {{CO₂}}.", "a": ""}, {"id": "demo07", "cat": "Biologie", "q": "Bei der {{Fotosynthese}} bilden Pflanzen aus Wasser und Kohlenstoffdioxid Traubenzucker und {{Sauerstoff}}.", "a": ""}, {"id": "demo08", "cat": "Geschichte", "q": "Die Berliner Mauer fiel am 9. November {{1989}}.", "a": ""}, {"id": "demo09", "cat": "Geschichte", "q": "Wann begann der Erste Weltkrieg und was war der Auslöser?", "a": "1914. Auslöser war das Attentat von Sarajevo auf den österreichischen Thronfolger Franz Ferdinand."}, {"id": "demo10", "cat": "Erdkunde", "q": "Die Hauptstadt von Kanada heißt {{Ottawa}}, nicht Toronto und nicht Montreal.", "a": ""}]};
  var DEMOCARDS = null;
  function demoCards() {
    if (!DEMOCARDS) DEMOCARDS = parseData(DEMO).cards.map(function (c, i) { return { id: 'demo' + (i + 1), q: trs(c.q), a: trs(c.a), cat: trs(c.cat) }; });
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
      var qn = el('p', 'q', name === DEF ? trs(name) : name), dt = el('i', 'dot'); dt.style.background = catColor(name); qn.insertBefore(dt, qn.firstChild);
      qn.setAttribute('data-nt', '');
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
      card.appendChild(el('p', null, 'Lernarten, Player und Fortschritt gibt es nach der Anmeldung. Das Konto ist kostenlos.'));
      var lb = el('div', 'tools');
      var l1 = el('button', 'btn primary', 'Konto anlegen'); l1.type = 'button'; l1.addEventListener('click', function () { openAcc('register'); });
      var l2 = el('button', 'btn', 'Anmelden'); l2.type = 'button'; l2.addEventListener('click', function () { openAcc('login'); });
      lb.appendChild(l1); lb.appendChild(l2); card.appendChild(lb);
      ov.appendChild(card); lockBox.appendChild(ov);
      host.appendChild(lockBox);
    }
    var gl = group('Lernstand');
    gl.appendChild(el('p', null, 'Gewusste Karten rutschen ein Fach höher und kommen später wieder. Nochmal schickt sie zurück in Fach 1.'));
    var rb = el('button', 'btn danger', 'Lernstand zurücksetzen'); rb.type = 'button';
    rb.addEventListener('click', function () {
      confirmDlg('Lernstand zurücksetzen?', 'Alle Karten gelten wieder als neu, Tagesziel und Serie starten bei null. Die Karten bleiben.', function () {
        db.cards.forEach(function (c) { delete c.n; delete c.box; delete c.due; delete c.last; delete c.snz; delete c.mst; });
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
    dsb.addEventListener('click', function () { if (!$('view-help')) { openLegal('dsDlg'); return; } show('help'); var t = $('datenschutz'); if (t) t.scrollIntoView({ behavior: CFG.animation.an ? 'smooth' : 'auto', block: 'start' }); });
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
  if ($('anbieter') && UPDATE_REPO !== 'KONTO/REPO' && /^[\w.-]+\/[\w.-]+$/.test(UPDATE_REPO)) {   // Anbieter im Datenschutz: das GitHub-Konto des Repos
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
    var ra = !K.mock && r.headers && +r.headers.get('Retry-After');
    if (!j || typeof j !== 'object') return { ok: false, status: r.status, err: 'Unerwartete Antwort.' };
    j.status = r.status;
    if (ra > 0) j.retry = Math.min(ra, 3600);   // Der Server bittet um Pause (zu viele Anfragen): kRetry hält sich daran
    if (r.status === 404 && j.err === 'unbekannt') j.err = 'Das gibt es auf dem Server noch nicht. Die Serverdateien (api/) des Updates fehlen.';
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
    var needs = ['data', 'rev', 'save', 'versions', 'restore', 'password', 'delete'];
    if (needs.indexOf(a) >= 0 && !me) return no(401, 'Bitte melde dich an.', { code: 'auth' });
    if (d.fail && needs.indexOf(a) >= 0) return no(0, 'Keine Verbindung zum Server.');   // Testschalter: Netz weg
    var nk = function (e) { return d.users[e] && d.users[e].nick || ''; };
    var nickBad = function (n) { return n.length < 3 ? 'Der Nickname braucht mindestens 3 Zeichen.' : n.length > 20 ? 'Der Nickname darf höchstens 20 Zeichen haben.' : !/^[\p{L}\p{N}][\p{L}\p{N}._-]*$/u.test(n) ? 'Erlaubt sind Buchstaben, Zahlen sowie . _ - (nicht am Anfang).' : ''; };
    var nickTaken = function (n, except) { return Object.keys(d.users).some(function (e) { return e !== except && nk(e).toLowerCase() === n.toLowerCase(); }); };
    if (a.indexOf('nick-check') === 0) { var q = decodeURIComponent((a.split('&n=')[1] || '')).trim(), bad = nickBad(q); return ok(bad ? { valid: false, free: false, msg: bad } : { valid: true, free: !nickTaken(q, me), msg: '' }); }
    if (a === 'nick') { var nn = String(b.nick || '').trim(); if (!me) return no(401, 'Bitte melde dich an.', { code: 'auth' }); if (nickBad(nn)) return no(400, nickBad(nn)); if (nickTaken(nn, me)) return no(409, 'Dieser Nickname ist schon vergeben.'); d.users[me].nick = nn; put(); return ok({ nick: nn, msg: 'Nickname gespeichert.' }); }
    if (a === 'csrf') return ok({ csrf: 'test', ft: 'test', user: me ? { email: me, nick: nk(me) } : null });
    if (a === 'register') {
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return no(400, 'Bitte eine gültige E-Mail-Adresse eingeben.');
      if (String(b.password || '').length < 10) return no(400, 'Das Passwort braucht mindestens 10 Zeichen.');
      var rn = String(b.nick || '').trim(); if (nickBad(rn)) return no(400, nickBad(rn)); if (nickTaken(rn, '')) return no(409, 'Dieser Nickname ist schon vergeben.');
      if (!d.users[email]) { d.users[email] = { pw: await sha(b.password), nick: rn }; put(); }
      return ok({ msg: 'Testmodus: Konto angelegt, die Bestätigung ist übersprungen. Du kannst dich anmelden.' });
    }
    if (a === 'login') {
      var u = d.users[email];
      if (!u || u.pw !== await sha(b.password || '')) return no(401, 'E-Mail oder Passwort stimmt nicht.');
      d.sess = email; put(); return ok({ csrf: 'test', user: { email: email, nick: nk(email) } });
    }
    if (a === 'logout') { d.sess = ''; put(); return ok({ csrf: 'test' }); }
    if (a === 'verify') return ok({ msg: 'Testmodus: nichts zu bestätigen.' });
    if (a === 'resend-verify') return ok({ msg: 'Testmodus: Es wird keine Mail gesendet.' });
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
    if (a === 'rev') { var xr = d.data[me]; return ok({ rev: xr ? xr.rev : 0 }); }
    if (a === 'data') { var x = d.data[me]; return ok({ rev: x ? x.rev : 0, updated: 0, data: x ? JSON.parse(x.body) : null }); }
    if (a === 'save') {
      var cur = d.data[me] ? d.data[me].rev : 0;
      if ((b.rev | 0) !== cur) return no(409, 'conflict', { rev: cur });
      if (d.data[me]) { d.vers = d.vers || {}; (d.vers[me] = d.vers[me] || []).unshift({ id: (d.vn = (d.vn || 0) + 1), ts: Math.floor(Date.now() / 1000), body: d.data[me].body }); d.vers[me].length = Math.min(d.vers[me].length, 4); }   // Testkonto: jede Änderung sichert den alten Stand (vereinfacht)
      d.data[me] = { rev: cur + 1, body: JSON.stringify(b.data) }; put(); return ok({ rev: cur + 1 });
    }
    if (a === 'versions') return ok({ versions: ((d.vers || {})[me] || []).map(function (v) { var o = JSON.parse(v.body); return { id: v.id, ts: v.ts, cards: (o.cards || []).length, size: v.body.length }; }) });
    if (a === 'restore') {
      var vv = ((d.vers || {})[me] || []).filter(function (v) { return v.id === (b.id | 0); })[0];
      if (!vv) return no(404, 'Diesen Stand gibt es nicht mehr.');
      d.vers[me].unshift({ id: (d.vn = (d.vn || 0) + 1), ts: Math.floor(Date.now() / 1000), body: d.data[me].body });
      d.data[me] = { rev: d.data[me].rev + 1, body: vv.body }; put(); return ok({ rev: d.data[me].rev, data: JSON.parse(vv.body) });
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
    var b = $('accBtn'); playerOff();
    b.hidden = !K.on;
    b.classList.toggle('on', !!K.user && !K.paused && !/fehlgeschlagen|Zu viele/.test(K.state));
    b.classList.toggle('warn', !!K.user && (K.paused || /fehlgeschlagen|Zu viele/.test(K.state)));
    $('accTest').hidden = !K.mock;
    b.querySelector('.lbl').textContent = K.user && K.user.nick ? K.user.nick : 'Konto'; greet();
    b.title = K.user ? 'Konto: ' + K.user.email + (K.state ? '. ' + K.state : '') : 'Anmelden oder registrieren';
    ['ftKt', 'landKt'].forEach(function (id) { $(id).hidden = !K.on; });
    $('dsKonto').hidden = !K.on;
    $('dsNoK').hidden = K.on; $('dsNoK2').hidden = K.on;
    if (K.user && K.user.nickOn !== false && !K.user.nick && !K.nickAsked && K.probed) { K.nickAsked = true; setTimeout(function () { if (K.user && !K.user.nick) openAcc('nick'); }, 500); }   // ältere Konten: einmal pro Seitenaufruf nach dem Nickname fragen
    if (K.probed && K.on && !K.user && (PRO.options || proCached())) proDrop();
    if (K.user && !PRO.options) kProLoad();
    if (current === 'prog') renderProg();
    if (current === 'opts' && optLock !== (K.on && !PRO.options)) renderOptions();
    document.querySelectorAll('.lbadge').forEach(function (n) { n.hidden = K.on; });
    if ($('accDlg').open && K.user) { $('acState').textContent = K.paused ? 'Abgleich pausiert. Tippe auf „Jetzt abgleichen“.' : K.state; }
  }
  /* Dialog-Ansichten */
  var ACC_TITLE = { login: 'Anmelden', register: 'Konto anlegen', forgot: 'Passwort vergessen', newpw: 'Neues Passwort', account: 'Konto', chpw: 'Passwort ändern', del: 'Konto löschen', msg: 'Konto', nick: 'Nickname', versions: 'Frühere Stände' };
  /* Notizzettel (Anmelden / Neu hier) liegen außerhalb des Fensters und werden an dessen rechten Rand gesetzt */
  /* Konto-Fenster ohne Scrollbalken: Zeilenhöhe so lange verkleinern, bis alles passt (nicht unter 28 px) */
  function accFit() {
    var d = $('accDlg'); if (!d.open) return;
    d.style.removeProperty('--ln'); return;   // Verkleinern abgeschaltet: lieber großzügig und bei sehr kleinen Fenstern scrollen
    var base = parseFloat(getComputedStyle(d).getPropertyValue('--ln')) || 34;
    for (var l = base; l >= (innerHeight <= 640 ? 24 : 28) && d.scrollHeight > d.clientHeight + 1; l -= 1) d.style.setProperty('--ln', l + 'px');
  }
  window.addEventListener('resize', function () { accFit(); });
  function accNotes() {
    var d = $('accDlg'), t = $('accTabs'), v = d.dataset.view;
    if (!d.open || (v !== 'login' && v !== 'register')) { t.hidden = true; return; }
    t.hidden = false;
    var r = d.getBoundingClientRect(), ln = parseFloat(getComputedStyle(d).getPropertyValue('--ln')) || 30;
    t.style.setProperty('--x', Math.round(r.right) + 'px'); t.style.setProperty('--y', Math.round(r.top + ln * 3) + 'px');
  }
  window.addEventListener('resize', accNotes);
  if (window.ResizeObserver) new ResizeObserver(accNotes).observe($('accDlg'));
  $('accDlg').addEventListener('close', function () { $('accTabs').hidden = true; });
  $('accDlg').addEventListener('animationend', accNotes); $('accDlg').addEventListener('transitionend', accNotes);
  $('accTabs').addEventListener('click', function (e) { var g = e.target.closest('[data-go]'); if (g) accView(g.dataset.go); });
  function accView(v, msg, err) {
    document.querySelectorAll('#accDlg [data-v]').forEach(function (n) { n.hidden = n.dataset.v !== v; });
    $('accErr').textContent = err || '';
    $('accMsg').textContent = msg || '';
    $('accTitle').textContent = ACC_TITLE[v];
    $('accDlg').dataset.view = v;
    $('accTabs').querySelectorAll('button').forEach(function (t) { t.setAttribute('aria-selected', String(t.dataset.go === v)); });
    if (v === 'account' && PRO.profile) try { PRO.profile(true); } catch (e) {}
    if (v === 'account') { $('acState').textContent = K.paused ? 'Abgleich pausiert. Tippe auf „Jetzt abgleichen“.' : K.state; $('acMail').textContent = K.user ? K.user.email : ''; $('acNick').textContent = K.user && K.user.nick ? K.user.nick : 'noch keiner'; $('acNickEdit').textContent = K.user && K.user.nick ? 'ändern' : 'festlegen'; kUI(); }
    if (v === 'versions') kVers();
    if (v === 'nick') { $('nkIntro').textContent = K.user && K.user.nick ? 'Dein Nickname kann sich später ändern, er bleibt einmalig.' : 'Wähle einen Nickname. So heißt du in KarteiDeck.'; $('nkNick').value = K.user && K.user.nick ? K.user.nick : ''; nickLive($('nkNick'), $('nkNickSt'), true); $('nkLater').hidden = !!(K.user && K.user.nick); }
    accFit(); accNotes(); setTimeout(function () { accFit(); accNotes(); }, 150); setTimeout(function () { accFit(); accNotes(); }, 600);
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
  /* Passwort-Stärke: rechnet nur im Browser, das Passwort wird dafür nirgends hingeschickt. */
  function pwRate(pw, ctx) {
    var n = pw.length;
    if (!n) return { l: 0, t: 'Noch leer', h: 'Mindestens 10 Zeichen.' };
    var low = pw.toLowerCase(), letters = low.replace(/[^a-zäöüß]/g, '').replace(/ä/g, 'a').replace(/ö/g, 'o').replace(/ü/g, 'u');
    if (n < 10) return { l: 1, t: 'Zu kurz', h: 'Noch ' + (10 - n) + (10 - n === 1 ? ' Zeichen.' : ' Zeichen.') };
    var common = ['passwort', 'password', 'kartenbox', 'karteideck', 'qwertz', 'qwertzuiop', 'qwerty', 'abcdefgh', 'iloveyou', 'letmein', 'willkommen', 'hallo', 'halloween', 'fussball', 'schatz'];
    if (/^\d+$/.test(pw) || common.indexOf(letters) >= 0 || new Set(pw.split('')).size < 4) return { l: 1, t: 'Zu leicht', h: 'Das erraten andere sofort.' };
    var own = [];
    (ctx || []).forEach(function (x) { x = String(x || '').toLowerCase().split('@')[0]; if (x.length >= 4) own.push(x); });
    for (var i = 0; i < own.length; i++) if (low.indexOf(own[i]) >= 0) return { l: 1, t: 'Zu leicht', h: 'Kein Teil von Nickname oder E-Mail verwenden.' };
    var cls = (/[a-zäöüß]/.test(pw) ? 1 : 0) + (/[A-ZÄÖÜ]/.test(pw) ? 1 : 0) + (/\d/.test(pw) ? 1 : 0) + (/[^A-Za-z0-9äöüÄÖÜß]/.test(pw) ? 1 : 0);
    var p = cls + (n >= 12 ? 1 : 0) + (n >= 16 ? 1 : 0) + (n >= 20 ? 1 : 0);
    if (/(.)\1{2,}/.test(pw)) p -= 1;                                              // aaa
    if (/(0123|1234|2345|3456|4567|5678|6789|abcd|bcde|cdef|qwer|wert|asdf|yxcv)/.test(low)) p -= 1;   // Folgen
    if (new Set(pw.split('')).size < n * 0.5) p -= 1;                               // viele Wiederholungen
    var l = p <= 3 ? 2 : p <= 5 ? 3 : 4;
    var t = ['', '', 'Okay', 'Gut', 'Stark'][l];
    var h = l === 4 ? 'Sehr gut.' : n < 14 ? 'Länger macht es stärker: ab 14 Zeichen.' : cls < 3 ? 'Mische Groß- und Kleinbuchstaben, Zahlen, Zeichen.' : 'Noch etwas länger wäre besser.';
    return { l: l, t: t, h: h };
  }
  function pwMeter(inp, ctx) {
    var m = document.querySelector('.pwm[data-for="' + inp.id + '"]');
    function upd() { var r = pwRate(inp.value, typeof ctx === 'function' ? ctx() : ctx); m.dataset.l = r.l; m.querySelector('b').textContent = r.t; m.querySelector('span').textContent = r.h; inp.__lvl = r.l; }
    inp.addEventListener('input', upd); inp.__upd = upd; upd();
  }
  /* Nickname: prüft beim Tippen, ob der Name gültig und frei ist */
  function nickLive(inp, st, now) {
    var tmr, seq = 0, base = st.textContent;
    inp.__lastOk = false;
    function set(s, m) { st.dataset.s = s; st.textContent = m; }
    async function run() {
      var v = inp.value.trim(), my = ++seq;
      if (!v) { inp.__lastOk = false; set('', base); return; }
      if (v.length < 3) { inp.__lastOk = false; set('bad', 'Mindestens 3 Zeichen.'); return; }
      set('wait', 'Prüfe …');
      var j = await kapi('nick-check&n=' + encodeURIComponent(v));
      if (my !== seq) return;
      if (!j.ok) { inp.__lastOk = false; set('bad', j.status === 0 ? 'Keine Verbindung. Der Name wird später geprüft.' : (j.err || 'Das konnte nicht geprüft werden.')); return; }
      inp.__lastOk = !!(j.valid && j.free);
      set(j.valid && j.free ? 'ok' : 'bad', j.valid ? (j.free ? 'Frei, der Name gehört dir.' : 'Schon vergeben. Probier einen anderen.') : j.msg);
    }
    if (!inp.__nl) { inp.__nl = true; inp.addEventListener('input', function () { clearTimeout(tmr); inp.__lastOk = false; tmr = setTimeout(run, 350); }); }
    inp.__run = run;
    if (now) { seq++; if (inp.value.trim()) run(); else set('', base); }
  }
  nickLive($('rgNick'), $('rgNickSt'));
  pwMeter($('rgPw'), function () { return [$('rgNick').value, $('rgMail').value]; });
  pwMeter($('cpNew'), function () { return [K.user && K.user.nick, K.user && K.user.email]; });
  pwMeter($('npPw'), []);
  $('rgNick').addEventListener('input', function () { $('rgPw').__upd(); });
  $('rgMail').addEventListener('input', function () { $('rgPw').__upd(); });
  accForm('nick', async function () {
    var v = $('nkNick').value.trim();
    if (v.length < 3) return accFail({}, 'Bitte einen Nickname mit mindestens 3 Zeichen eingeben.');
    var j = await kapi('nick', { nick: v });
    if (!j.ok) return accFail(j, 'Das hat nicht geklappt.');
    K.user.nick = j.nick; kUI(); accView('account', j.msg);
  });
  $('nkLater').addEventListener('click', function () { $('accDlg').close(); });
  accForm('login', async function () {
    var mail = $('lgMail').value.trim(), pw = $('lgPw').value;
    if (!mail || !pw) return accFail({}, 'Bitte E-Mail und Passwort eingeben.');
    var j = await kapi('login', { email: mail, password: pw });
    resendRow(!j.ok && j.code === 'unverified');
    if (!j.ok) return accFail(j, 'Anmeldung fehlgeschlagen.');
    $('lgPw').value = ''; K.user = j.user; K.paused = false; K.rev = 0; K.state = '';
    accView('account', 'Angemeldet.'); kUI(); kPull();
  });
  /* Bestätigungsmail erneut senden: Der Knopf erscheint nur, wenn die Anmeldung wegen fehlender Bestätigung scheiterte. */
  function resendRow(on) {
    var r = $('lgResendRow'); r.classList.toggle('on', !!on); r.setAttribute('aria-hidden', String(!on)); $('lgResend').tabIndex = on ? 0 : -1;
  }
  $('lgMail').addEventListener('input', function () { resendRow(false); });
  $('lgResend').addEventListener('click', async function () {
    var b = $('lgResend'), mail = $('lgMail').value.trim();
    if (!mail || b.disabled) return;
    b.disabled = true;
    var j = await kapi('resend-verify', { email: mail });
    setTimeout(function () { b.disabled = false; }, 30000);   // nicht mehrfach hintereinander
    if (!j.ok) { b.disabled = false; return accFail(j, 'Das hat nicht geklappt.'); }
    resendRow(false); accView('msg', j.msg);
  });
  accForm('register', async function () {
    var mail = $('rgMail').value.trim(), pw = $('rgPw').value, nick = $('rgNick').value.trim();
    if (!nick || !mail || !pw) return accFail({}, 'Bitte Nickname, E-Mail und Passwort eingeben.');
    if (nick.length < 3) return accFail({}, 'Der Nickname braucht mindestens 3 Zeichen.');
    if ($('rgNickSt').dataset.s === 'bad') return accFail({}, 'Bitte einen anderen Nickname wählen.');
    if ($('rgPw').__lvl < 2) return accFail({}, 'Das Passwort ist noch zu schwach.');
    if (pw !== $('rgPw2').value) return accFail({}, 'Die Passwörter sind nicht gleich.');
    var j = await kapi('register', { nick: nick, email: mail, password: pw, website: $('rgHp').value });
    if (!j.ok) return accFail(j, 'Registrierung fehlgeschlagen.');
    $('rgPw').value = ''; $('rgPw2').value = ''; $('rgNick').value = ''; $('rgPw').__upd(); $('rgNickSt').dataset.s = '';
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
  $('acSync').addEventListener('click', async function () { K.paused = false; K.shrinkAsk = null; K.manual = true; setTimeout(function () { K.manual = false; }, 20000); K.state = 'Gleiche ab …'; kUI(); await kPull(); });
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
    if (K.fails && K.timer) return;   // nach einem Fehler gilt der Wiederholungs-Abstand, Änderungen warten darauf
    clearTimeout(K.timer);
    K.state = 'Änderungen warten'; kUI();
    /* Erst senden, wenn 20 Sekunden Ruhe ist, spätestens 2 Minuten nach der ersten Änderung: wenige, größere Schreibvorgänge statt einem pro Karte */
    /* Große Konten schreiben seltener (je größer der Stand, desto länger die Ruhe und die Höchstwartezeit): 20 s und 2 min bei kleinen Ständen, bis 90 s und 10 min bei sehr großen. Das schont die Datenbank. */
    if (K.len === undefined) { try { K.len = JSON.stringify(snapshot()).length; } catch (e) { K.len = 0; } }
    var quiet = 20000 + Math.min(70000, K.len * 0.1), maxw = 120000 + Math.min(480000, K.len * 0.2);
    var now = Date.now(); if (!K.since) K.since = now;
    K.timer = setTimeout(function () { K.timer = null; kPush(); }, Math.max(1000, Math.min(quiet, K.since + maxw - now)));
  }
  /* Zusammenführen statt Fragen: Pro Karte, Tag und Option wird mit dem letzten gemeinsamen Stand verglichen.
     Gespeichert wird nur eine kurze Prüfsumme je Karte, keine Kopie der Daten. */
  var AKEY = 'kartenbox-abgleich';
  function hsh(o) { var t = JSON.stringify(o), h = 5381, i; for (i = 0; i < t.length; i++) h = ((h << 5) + h + t.charCodeAt(i)) | 0; return h + ':' + t.length; }
  function cContent(c) { return hsh([c.q, c.a, c.cat, c.tags || null, c.img || null, !!c.pin]); }
  function cState(c) { return hsh([c.n || 0, c.box || 0, c.due || 0, c.last || '', c.miss || 0, c.mst || 0, c.snz || 0]); }
  function mkBase(d) {
    var b = { cards: {}, cats: d.cats.slice(), log: {}, colors: clone(d.colors || {}), cfg: {} };
    d.cards.forEach(function (c) { b.cards[c.id] = [cContent(c), cState(c)]; });
    Object.keys(d.log).forEach(function (k) { b.log[k] = [d.log[k].n, d.log[k].ok, (d.log[k].c || []).length]; });
    Object.keys(d.cfg || {}).forEach(function (k) { b.cfg[k] = hsh(d.cfg[k]); });
    return b;
  }
  function kBaseOf(snap) { var d = parseData({ cards: snap.cards, cats: snap.cats, log: snap.log, colors: snap.colors }); d.cfg = snap.cfg || {}; return mkBase(d); }
  function kStore() { try { localStorage.setItem(AKEY, JSON.stringify({ u: K.user && K.user.email, rev: K.rev, base: K.base, pend: K.pend || null })); } catch (e) {} }
  function kSave(base) { K.base = base; K.pend = null; K.fails = 0; kStore(); }
  /* Vor dem Senden merken, was gesendet wird. Kommt die Antwort nicht an (Netz weg, Seite zu), erkennt der nächste Abgleich, dass der Server das schon hat. */
  function kPend(snap) { K.pend = kBaseOf(snap); kStore(); }
  function kLoadBase() {
    try { var o = JSON.parse(localStorage.getItem(AKEY)); if (o && K.user && o.u === K.user.email && o.base) { K.base = o.base; K.pend = o.pend || null; return o.rev | 0; } } catch (e) {}
    K.base = null; K.pend = null; return 0;
  }
  function kMerge(L, S, B) {
    var out = { cards: [], cats: [], log: {}, colors: {}, cfg: {} }, lost = 0, id;
    var lm = {}, sm = {}, bc = B ? B.cards : {};
    L.cards.forEach(function (c) { lm[c.id] = c; }); S.cards.forEach(function (c) { sm[c.id] = c; });
    var ids = Object.keys(lm).concat(Object.keys(sm).filter(function (k) { return !lm[k]; }));
    ids.forEach(function (id) {
      var l = lm[id], s = sm[id], b = bc[id];
      if (l && !s) {   // nur lokal: neu, oder auf dem Konto gelöscht
        if (b && b[0] === cContent(l) && b[1] === cState(l)) return;   // lokal unverändert, anderswo gelöscht: löschen
        out.cards.push(l); return;
      }
      if (s && !l) {   // nur auf dem Konto: neu, oder hier gelöscht
        if (b && b[0] === cContent(s) && b[1] === cState(s)) return;
        out.cards.push(s); return;
      }
      var lc = cContent(l), sc = cContent(s), ls = cState(l), ss = cState(s), r = clone(l);
      if (lc !== sc) {
        var lcCh = !b || b[0] !== lc, scCh = !b || b[0] !== sc;
        if (scCh && !lcCh) { r.q = s.q; r.a = s.a; r.cat = s.cat; r.tags = s.tags; r.img = s.img; r.pin = s.pin; if (!s.tags) delete r.tags; if (!s.img) delete r.img; if (!s.pin) delete r.pin; }
        else if (scCh && lcCh) { var cp = clone(s); cp.id = uid(); out.cards.push(cp); lost++; }   // beide Seiten bearbeitet: beide Fassungen bleiben
      }
      if (ls !== ss) {
        var lsCh = !b || b[1] !== ls, ssCh = !b || b[1] !== ss;
        if ((ssCh && !lsCh) || (ssCh && lsCh && (s.n || 0) > (l.n || 0))) ['n', 'box', 'due', 'last', 'miss', 'mst', 'snz'].forEach(function (f) { if (s[f] === undefined) delete r[f]; else r[f] = s[f]; });
      }
      out.cards.push(r);
    });
    var gone = {}; if (B) B.cats.forEach(function (c) { if (L.cats.indexOf(c) < 0 || S.cats.indexOf(c) < 0) gone[c] = 1; });
    L.cats.concat(S.cats).forEach(function (c) { if (out.cats.indexOf(c) < 0) out.cats.push(c); });
    out.cards.forEach(function (c) { if (out.cats.indexOf(c.cat) < 0) out.cats.push(c.cat); });
    out.cats = out.cats.filter(function (c) { return !gone[c] || out.cards.some(function (x) { return x.cat === c; }); });
    if (!out.cats.length) out.cats.push(DEF);
    out.cats.forEach(function (c) { var v = (L.colors || {})[c] || (S.colors || {})[c]; if (v) out.colors[c] = v; });
    var days = Object.keys(L.log).concat(Object.keys(S.log).filter(function (k) { return !L.log[k]; }));
    days.forEach(function (k) {
      var l = L.log[k], s = S.log[k], b = B && B.log[k];
      if (!l || !s) { out.log[k] = clone(l || s); return; }
      if (l.n === s.n && l.ok === s.ok) { out.log[k] = clone(l); return; }   // gleicher Stand: nichts addieren
      var n, ok, c;
      if (B) {   // beide haben seit dem letzten Abgleich geübt: die Zuwächse addieren
        var bn = b ? b[0] : 0, bo = b ? b[1] : 0, bl = b ? b[2] : 0;
        n = bn + (l.n - bn) + (s.n - bn); ok = bo + (l.ok - bo) + (s.ok - bo);
        c = (s.c || []).concat((l.c || []).slice(bl));
      } else { n = Math.max(l.n, s.n); ok = Math.max(l.ok, s.ok); c = (l.c || []).length >= (s.c || []).length ? l.c : s.c; }
      out.log[k] = { n: Math.max(1, n), ok: Math.max(0, Math.min(ok, n)) };
      if (c && c.length) out.log[k].c = c.slice(-400);
    });
    var bf = B ? B.cfg : {}, keys = Object.keys(L.cfg || {}).concat(Object.keys(S.cfg || {}));
    keys.forEach(function (k) {
      if (out.cfg[k] !== undefined) return;
      var l = (L.cfg || {})[k], s = (S.cfg || {})[k];
      out.cfg[k] = (s !== undefined && bf[k] !== undefined && hsh(l) === bf[k]) ? s : (l !== undefined ? l : s);
    });
    out.lost = lost;
    return out;
  }
  /* Holt den Kontostand, führt zusammen und sendet das Ergebnis. Bis zu drei Anläufe, falls zwischendurch ein anderes Gerät speichert. */
  async function kSync(tries) {
    tries = tries || 0;
    if (!K.user || K.pulling) return;
    if (K.busy) { K.again = true; return; }
    if (K.base === undefined) kLoadBase();
    K.busy = true;
    /* Schnellweg: Ist die Revision auf dem Server unverändert und lokal nichts offen, braucht es den ganzen Stand nicht (spart dem Server das Lesen und Entschlüsseln der kompletten Daten bei jedem Seitenstart). */
    if (K.base && !K.pend && K.rev > 0 && !tries) {
      var q = await kapi('rev');
      if (q.ok && q.rev === K.rev) {
        try { if (JSON.stringify(kBaseOf(snapshot())) === JSON.stringify(K.base)) { K.fails = 0; K.state = kOkText(); K.busy = false; kUI(); if (K.again) { K.again = false; scheduleSync(); } return; } } catch (e) {}
      }
    }
    var j = await kapi('data'), done = false, took = false;
    try {
      if (!j.ok) { kRetry(kSync, j); return; }
      var d = j.data;
      if (!d) { K.rev = 0; K.busy = false; if (hasLocal()) await kPush(); else { K.state = 'Das Konto ist noch leer.'; kUI(); } return; }
      var mine = snapshot(), sd = parseData({ cards: d.cards, cats: d.cats, log: d.log, colors: d.colors });
      sd.cfg = d.cfg || {};
      if (K.pend && JSON.stringify(mkBase(sd)) === JSON.stringify(K.pend)) { K.base = K.pend; K.pend = null; K.rev = j.rev; kStore(); }   // der Server hat unseren letzten Stand schon
      if (!hasLocal()) { K.rev = j.rev; kTake(d); kSave(kBaseOf(snapshot())); return; }
      var ld = parseData({ cards: mine.cards, cats: mine.cats, log: mine.log, colors: mine.colors }); ld.cfg = mine.cfg;
      var m = kMerge(ld, sd, K.base);
      var same = norm(m) === norm(mine), cfgSame = JSON.stringify(m.cfg) === JSON.stringify(mine.cfg);
      if (!same || !cfgSame) {
        K.pulling = true;
        try { takeData(parseData({ cards: m.cards, cats: m.cats, log: m.log, colors: m.colors })); } finally { K.pulling = false; }
        if (!cfgSame) { var keep = {}; NOSYNC.forEach(function (k) { keep[k] = CFG[k]; }); CFG = normalize(merge(FILECFG, m.cfg)); NOSYNC.forEach(function (k) { CFG[k] = keep[k]; }); saveCfg(); applyCfg(); }
        REF.forEach(function (f) { f(); }); studyDirty = true; show(current); took = true;
      }
      var merged = snapshot();
      if (norm(merged) === norm(sd) && JSON.stringify(merged.cfg) === JSON.stringify(sd.cfg)) { K.rev = j.rev; K.sentHash = hsh(merged); kSave(kBaseOf(merged)); K.state = kOkText(); if (took) toast('Neuer Stand vom Konto geladen'); done = true; return; }
      K.busy = false; if (kShrinkStop(merged, false)) return; K.busy = true;
      var body = JSON.stringify({ rev: j.rev, data: merged });
      if (body.length > 7500000) { kTooBig(); return; }
      kPend(merged);
      var r = await kapi('save', body);
      if (r.ok) { K.rev = r.rev; K.sentHash = hsh(merged); kSave(kBaseOf(merged)); K.state = kOkText(); done = true; if (took) toast('Karten von beiden Geräten zusammengeführt'); if (m.lost) toast('Eine Karte wurde auf zwei Geräten geändert. Beide Fassungen sind da.'); return; }
      if (r.status === 409 && tries < 3) { K.busy = false; return await kSync(tries + 1); }
      kRetry(kSync, r);
    } finally { K.busy = false; kUI(); if (K.again) { K.again = false; scheduleSync(); } }
  }
  /* Frühere Stände: Liste vom Server, Zurückholen mit eigener Rückfrage. Der jetzige Stand wird vom Server vorher gesichert. */
  function vrDate(ts) { try { return new Date(ts * 1000).toLocaleString(document.documentElement.lang === 'en' ? 'en-GB' : 'de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }); } catch (e) { return String(ts); } }
  async function kVers() {
    var host = $('vrList'), note = $('vrNote');
    host.textContent = ''; note.textContent = 'Lade …';
    var j = await kapi('versions');
    if (!j.ok) { note.textContent = j.status === 0 ? 'Keine Verbindung zum Server.' : 'Das ging nicht: ' + (j.err || 'unbekannt'); return; }
    if (!j.versions || !j.versions.length) { note.textContent = 'Noch keine früheren Stände. Der erste entsteht, wenn sich dein Konto-Stand das nächste Mal ändert.'; return; }
    note.textContent = 'Tippe auf einen Stand, um ihn zurückzuholen. Der jetzige bleibt gesichert.';
    j.versions.forEach(function (v) {
      var b = el('button', 'vrit'); b.type = 'button'; b.dataset.id = v.id; b.dataset.n = v.cards; b.dataset.t = vrDate(v.ts);
      b.appendChild(el('b', null, vrDate(v.ts))); b.appendChild(el('span', null, v.cards + ' Karten'));
      host.appendChild(b);
    });
  }
  $('vrList').addEventListener('click', function (e) {
    var b = e.target.closest('.vrit'); if (!b) return;
    var id = +b.dataset.id;
    confirmDlg('Stand zurückholen', 'Der Stand vom ' + b.dataset.t + ' mit ' + b.dataset.n + ' Karten ersetzt den jetzigen auf dem Konto und auf diesem Gerät. Der jetzige Stand bleibt als früherer Stand erhalten.', async function () {
      if (K.busy) { toast('Der Abgleich läuft gerade. Bitte gleich noch einmal.'); return; }
      if (K.timer && !K.paused) await kPush(true);   // wartende Änderungen erst senden, damit sie in der Sicherung des jetzigen Standes stehen
      var r = await kapi('restore', { id: id });
      if (!r.ok) { toast(r.status === 0 ? 'Keine Verbindung zum Server.' : (r.err || 'Das ging nicht.')); return; }
      K.rev = r.rev; K.paused = false; kTake(r.data);
      K.sentHash = hsh(snapshot()); K.since = 0; kSave(kBaseOf(snapshot()));
      toast('Früherer Stand ist wieder da');
      accView('account', 'Der frühere Stand ist wieder da.');
    }, 'Zurückholen', false, 'Abbrechen');
  });
  /* Fehlgeschlagen: Wiederholen mit wachsendem Abstand (30 s, 1, 2, 4 … höchstens 10 Minuten, leicht gestreut), damit ein Ausfall den Server nicht zusätzlich belastet.
     Kommt das Netz zurück ('online'), wird sofort neu versucht. Eine abgelaufene Anmeldung (401) wird nicht ewig wiederholt. */
  function kRetry(fn, j) {
    if (j && j.status === 401) { K.user = null; K.state = ''; toast('Bitte melde dich neu an.'); return; }
    K.fails = (K.fails || 0) + 1;
    var d = Math.min(600000, 30000 * Math.pow(2, K.fails - 1)) * (0.8 + Math.random() * 0.4);
    if (j && j.retry) d = Math.max(d, j.retry * 1000 * (1 + Math.random() * 0.3));
    K.state = (j && j.status === 0 ? 'Keine Verbindung. ' : 'Abgleich fehlgeschlagen: ' + ((j && j.err) || 'unbekannt') + '. ') + 'Neuer Versuch in ' + (d < 90000 ? Math.round(d / 1000) + ' s' : Math.round(d / 60000) + ' min') + '.';
    clearTimeout(K.timer); K.timer = setTimeout(function () { K.timer = null; fn(); }, d);
  }
  window.addEventListener('online', function () {
    if (!K.user || K.paused || K.busy || !K.fails) return;
    K.fails = 0; clearTimeout(K.timer); K.timer = null; kSync();
  });
  /* Zu viele Daten: nicht still scheitern, sondern aktiv zum Sichern auffordern */
  /* Nur die Änderungen seit dem letzten gemeinsamen Stand (Karten, Löschungen, Protokolltage, Rubriken, Farben, Optionen).
     Gebraucht beim Schließen des Tabs, wenn der ganze Stand nicht in einen Hintergrund-Aufruf (höchstens 64 KB) passt. */
  function kPatch(snap) {
    var B = K.base; if (!B) return null;
    var d = parseData({ cards: snap.cards, cats: snap.cats, log: snap.log, colors: snap.colors }), p = { cards: [], del: [], log: {}, cfg: {} }, seen = {};
    d.cards.forEach(function (c) { seen[c.id] = 1; var b = B.cards[c.id]; if (!b || b[0] !== cContent(c) || b[1] !== cState(c)) p.cards.push(c); });
    Object.keys(B.cards).forEach(function (id) { if (!seen[id]) p.del.push(id); });
    Object.keys(d.log).forEach(function (k) { var l = d.log[k], b = B.log[k]; if (!b || b[0] !== l.n || b[1] !== l.ok || b[2] !== (l.c || []).length) p.log[k] = l; });
    if (JSON.stringify(d.cats) !== JSON.stringify(B.cats)) p.cats = d.cats;
    if (JSON.stringify(d.colors || {}) !== JSON.stringify(B.colors || {})) p.colors = d.colors || {};
    Object.keys(snap.cfg || {}).forEach(function (k) { if (B.cfg[k] !== hsh(snap.cfg[k])) p.cfg[k] = snap.cfg[k]; });
    return p;
  }
  function kTooBig() {
    K.state = 'Zu viele Daten für das Konto. Sichere deine Karten mit „Karten speichern“ und verkleinere Bilder.'; kUI();
    if (!K.bigShown) { K.bigShown = true; toast('Deine Karten sind zu groß fürs Konto. Bitte jetzt mit „Karten speichern“ sichern. Bilder verkleinern hilft.'); }
  }
  async function kPush(quiet) {
    clearTimeout(K.timer); K.timer = null;
    if (!K.user || K.paused) return;
    if (K.busy) { K.again = true; return; }
    K.since = 0;
    var snap = snapshot(), h = hsh(snap);
    if (h === K.sentHash) { K.state = kOkText(); kUI(); return; }   // seit dem letzten Senden nichts geändert
    if (kShrinkStop(snap, quiet)) return;
    var body = JSON.stringify({ rev: K.rev, data: snap });
    K.len = body.length;
    if (body.length > 7500000) { kTooBig(); return; }
    K.busy = true;
    kPend(snap);
    var j = await kapi('save', body);
    K.busy = false;
    if (j.ok) { K.rev = j.rev; K.sentHash = h; K.state = kOkText(); kSave(kBaseOf(snap)); }
    else if (j.status === 409) { K.rev = j.rev; kUI(); return kSync(); }
    else kRetry(kPush, j);
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
  async function kPull() { K.rev = kLoadBase(); K.sentHash = ''; K.since = 0; await kSync(); }
  async function kPoll() {
    if (!K.user || K.paused || K.busy || K.pulling || document.hidden) return;
    var j = await kapi('rev');   // nur die Nummer, nicht den ganzen Stand
    if (!j.ok || !j.rev || j.rev === K.rev) { if (j.ok && !K.timer) K.fails = 0; return; }
    await kSync();
  }
  /* Statuszeile nach erfolgreichem Abgleich: „Automatisch abgeglichen“, nur nach Klick auf „Jetzt abgleichen“ „Abgeglichen“. */
  function kOkText() { var t = (K.manual ? 'Abgeglichen um ' : 'Automatisch abgeglichen um ') + hhmm(); K.manual = false; return t; }
  /* Löschschutz: Fehlen hier plötzlich fast alle Karten gegenüber dem letzten gemeinsamen Stand (z. B. nach gelöschten Browserdaten oder einem Fehler),
     wird nicht still ins Konto geschrieben. Erst fragen. Der Konto-Stand bleibt als früherer Stand gesichert. */
  function kShrinkN(snap) {   // 0 = alles gut, sonst die Kartenzahl des letzten gemeinsamen Stands
    if (!K.base) return 0;
    var B = Object.keys(K.base.cards).length;
    return (B >= 10 && snap.cards.length < B * 0.4) ? B : 0;
  }
  function kShrinkStop(snap, quiet) {
    if (K.okShrink) { K.okShrink = false; return false; }
    var B = kShrinkN(snap); if (!B) return false;
    K.paused = true; K.state = 'Wartet auf deine Entscheidung'; K.shrinkAsk = [B, snap.cards.length]; kUI();
    if (!quiet && !document.hidden) kAskShrink(B, snap.cards.length);
    return true;
  }
  function kAskShrink(B, n) {
    $('syTitle').textContent = 'Viele Karten gelöscht?';
    $('syText').textContent = 'Hier sind ' + n + ' Karten, im Konto lagen ' + B + '. Soll das Konto auch kleiner werden, oder willst du den Konto-Stand laden? Der Konto-Stand bleibt unter „Frühere Stände“ gesichert.';
    $('syServer').textContent = 'Konto-Stand laden'; $('syLocal').textContent = 'Im Konto auch löschen'; $('syLater').textContent = 'Später';
    openNM($('syncDlg'));
  }
  function kAsk(kind) {
    $('syTitle').textContent = 'Welcher Stand gilt?'; $('syServer').textContent = 'Konto-Stand laden'; $('syLocal').textContent = 'Diesen Stand hochladen';
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
    K.rev = j.rev; K.paused = false; K.shrinkAsk = null; kTake(j.data); toast('Konto-Stand geladen');
  });
  $('syLocal').addEventListener('click', function () { $('syncDlg').close(); K.paused = false; K.okShrink = true; K.shrinkAsk = null; kPush(); });
  $('syLater').addEventListener('click', function () { $('syncDlg').close(); if (K.paused) toast('Abgleich pausiert, bis du entscheidest.'); });
  /* Tab im Hintergrund oder geschlossen: Wartendes sofort senden. Beim Schließen nur, wenn es klein genug für einen Sendevorgang im Hintergrund ist, sonst bleibt es lokal und geht beim nächsten Start raus. */
  document.addEventListener('visibilitychange', function () { if (document.hidden) { if (K.timer && K.user && !K.paused && !K.busy) kPush(true); } else { if (K.shrinkAsk && K.paused && !$('syncDlg').open) kAskShrink(K.shrinkAsk[0], K.shrinkAsk[1]); kPoll(); } });
  window.addEventListener('pagehide', function () {
    if (!K.timer || !K.user || K.paused || K.busy || K.mock) return;
    try {
      var snap = snapshot(), body = JSON.stringify({ rev: K.rev, data: snap }), act = 'save';
      if (hsh(snap) === K.sentHash || kShrinkN(snap)) return;   // und nicht senden, wenn fast alle Karten fehlen: erst fragen
      if (body.length > 60000) {   // zu groß für einen Hintergrund-Aufruf: nur die Änderungen senden
        var pt = K.rev > 0 && kPatch(snap);
        body = pt && JSON.stringify({ rev: K.rev, patch: pt }); act = 'patch';
        if (!body || body.length > 60000) return;   // auch das passt nicht: bleibt lokal und geht beim nächsten Start raus
      }
      kPend(snap);
      fetch(kurl(act), { method: 'POST', keepalive: true, credentials: 'same-origin', referrerPolicy: 'no-referrer', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': K.csrf }, body: body });
    } catch (e) {}
  });
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
    if (PRO.profile) try { PRO.profile(true); } catch (e) {}
  }
  /* Nach der ersten Anmeldung auf diesem Gerät: einmal kurz zeigen, wo die zusätzlichen Einstellungen sind */
  function proWelcome() {
    var key = 'kartenbox-konto-hinweis';
    try { if (localStorage.getItem(key)) return; localStorage.setItem(key, '1'); } catch (e) { return; }
    var tries = 0;
    setTimeout(function w() {
      if (K.user && !K.user.nick && $('accDlg').open && tries++ < 120) { setTimeout(w, 1000); return; }   // erst der Nickname, dann der Hinweis – nie zwei Dialoge übereinander
      confirmDlg('Dein Konto ist aktiv', 'Unter Optionen findest du jetzt Lernarten wie Antwort tippen, Wortbank und Vorlesen, dazu den Tab Fortschritt. Damit lernst du gezielter.',
        function () { if ($('accDlg').open) $('accDlg').close(); show('opts'); }, 'Zu den Optionen', false, 'Später');
    }, 600);
  }
  /* Online lädt die Seite die Zusatzfunktionen als eigenes Skript von der Schnittstelle. So braucht die Content-Security-Policy kein 'unsafe-inline'. Offline liefert der Service Worker die zuletzt geladene Fassung. */
  var proWait = null;   // läuft schon ein Ladevorgang, wartet der zweite darauf, statt das Skript noch einmal auszuführen (sonst hätte jede Taste im Player zwei Handler und jeder Klick würde sich selbst aufheben)
  function proExt(done) {
    if (PRO.options) { done(true); return; }
    if (proWait) { proWait.push(done); return; }
    proWait = [done];
    var sc = document.createElement('script');
    var fin = function (ok) { var w = proWait; proWait = null; sc.remove(); w.forEach(function (f) { f(ok); }); };
    sc.src = kurl('pro');
    sc.onload = function () { fin(!!PRO.options); };
    sc.onerror = function () { fin(false); };
    document.head.appendChild(sc);
  }
  async function kProLoad() {
    if (PRO.options || K.proBusy) return;
    K.proBusy = true;
    try {
      if (K.mock) {
        var code = PRO_EMBED || '';
        if (code && proInject(code)) { try { localStorage.setItem(PROKEY, code); } catch (e) {} proApply(); proWelcome(); }
      } else {
        var ok = await new Promise(function (res) { proExt(res); });
        if (ok) { try { localStorage.setItem(PROKEY, '1'); } catch (e) {} proApply(); proWelcome(); }
      }
    } catch (e) {}
    K.proBusy = false;
  }
  function proDrop() {
    var was = !!PRO.options;
    try { localStorage.removeItem(PROKEY); } catch (e) {}
    try { if (window.caches) caches.keys().then(function (ks) { ks.forEach(function (k) { caches.open(k).then(function (c) { c.keys().then(function (rs) { rs.forEach(function (r) { if (/[?&]a=pro(&|$)/.test(r.url)) c.delete(r); }); }); }); }); }); } catch (e) {}
    if (was) { try { sessionStorage.setItem('kartenbox-neuladen', '1'); } catch (e) {} setTimeout(function () { location.reload(); }, 500); }   // Neuladen nach dem Abmelden: danach nicht die Startseite zeigen
  }
  function proBoot() {
    var code = '';
    if (PRO_EMBED && !CFG.konto.api && !CFG.konto.test) code = PRO_EMBED;
    else try { code = localStorage.getItem(PROKEY) || ''; } catch (e) {}
    if (!code) return;
    if (PRO_EMBED || !CFG.konto.api) proInject(code);   // lokale Datei: eingebettet
    else proExt(function (ok) { if (ok) proApply(); });
  }
  /* Online soll die Adresse nur die Domain zeigen, nicht /karteikarten.html */
  try { if (CFG.seite && CFG.seite.url && location.protocol.indexOf('http') === 0 && /\/karteikarten\.html$/.test(location.pathname)) history.replaceState(null, '', location.pathname.replace(/karteikarten\.html$/, '') + location.search + location.hash); } catch (e) {}
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

  /* Startseite: Elemente setzen sich beim Hereinscrollen. Nur Deckkraft und Verschiebung, einmal pro Element.
     Bei reduzierter Bewegung (Windows, iOS, Android), ohne IntersectionObserver oder ohne Skript bleibt alles sofort sichtbar. */
  var landRv = false;
  function landReveal() {
    if (landRv) return; landRv = true;
    var L = $('landing');
    function sh() { L.querySelector('.ltop').classList.toggle('sh', L.scrollTop > 4); }
    L.addEventListener('scroll', sh, { passive: true }); sh();
    if (!('IntersectionObserver' in window)) return;
    var first = true, io = new IntersectionObserver(function (es) {
      var hit = es.filter(function (e) { return e.intersectionRatio >= 0.12; }).map(function (e) { return { el: e.target, r: e.target.getBoundingClientRect() }; });
      hit.forEach(function (h) {   // Spalte in der Reihe bestimmt die Verzögerung: links zuerst
        var rank = hit.filter(function (o) { return Math.abs(o.r.top - h.r.top) < 6 && o.r.left < h.r.left - 6; }).length;
        h.el.style.setProperty('--d', ((first ? .3 : 0) + rank * .08).toFixed(2) + 's');
        h.el.classList.add('rvin');
      });
      if (hit.length) first = false;
      es.forEach(function (e) {   // nur was unten wieder aus dem Bild läuft, baut sich ab; was oben fertig aufgebaut ist, bleibt stehen
        var rb = e.rootBounds;
        if (e.intersectionRatio < 0.12 && rb && e.boundingClientRect.top > rb.top + rb.height / 2) e.target.classList.remove('rvin');
      });
    }, { root: L, rootMargin: '0px 0px -8% 0px', threshold: [0, 0.12] });
    [].forEach.call(L.querySelectorAll('.lstep, .feat, .lnote, .lend .llead, .lend .lrow'), function (el) { el.classList.add('rv'); io.observe(el); });
  }

  /* Startseite: je nach Einstellung start.seite immer, einmal am Tag, nur beim ersten Mal oder nie */
  var LAND_KEY = 'kartenbox-start', landShown = false;
  function landing() {
    var m = CFG.start.seite;
    if (m === 'aus') return;
    if (/[?&](verify|reset|app)=/.test(location.search)) { landShown = true; return; }   // app=1: Link von den Infoseiten geht direkt zum Lernen
    try { if (sessionStorage.getItem('kartenbox-neuladen')) { sessionStorage.removeItem('kartenbox-neuladen'); landShown = true; return; } } catch (e) {}
    var today = dayKey(), seen = '';
    try { seen = localStorage.getItem(LAND_KEY) || ''; } catch (e) {}
    if ((m === 'einmal' && seen) || (m === 'taeglich' && seen === today)) return;
    try { localStorage.setItem(LAND_KEY, today); } catch (e) {}
    landShown = true;
    landReveal();
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
  $('ftHome').addEventListener('click', function () { landShown = true; landReveal(); $('landing').showModal(); });

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
  /* Bild vergrößern. Das Bild fliegt aus seiner Position (Vorschau oder Bild-Knopf) in die Mitte und beim Schließen zurück. */
  (function () {
    var dlg = $('zoomDlg'), big = $('zoomImg'), src = null, srcBtn = false, busy = false;
    function shown(im) {   // sichtbare Bildfläche (object-fit: contain) innerhalb des Elements
      var b = im.getBoundingClientRect(), w = im.naturalWidth || b.width, h = im.naturalHeight || b.height, k = Math.min(b.width / w, b.height / h);
      return { left: b.left + (b.width - w * k) / 2, top: b.top + (b.height - h * k) / 2, width: w * k, height: h * k };
    }
    function flip(from, uni) {   // Transform, der das große Bild auf die Fläche 'from' setzt; uni: gleichmäßig verkleinert, Mitte auf Mitte
      var to = big.getBoundingClientRect();
      if (uni) {
        var s = from.width / to.width, cx = from.left + from.width / 2, cy = from.top + from.height / 2;
        return 'translate(' + (cx - to.width * s / 2 - to.left) + 'px,' + (cy - to.height * s / 2 - to.top) + 'px) scale(' + s + ')';
      }
      return 'translate(' + (from.left - to.left) + 'px,' + (from.top - to.top) + 'px) scale(' + (from.width / to.width) + ',' + (from.height / to.height) + ')';
    }
    function area() { return srcBtn ? src.getBoundingClientRect() : shown(src); }
    function open(el, url, isBtn) {
      if (busy || !url) return;
      src = el; srcBtn = isBtn; busy = true;
      big.src = url; big.alt = 'Vergrößertes Bild';
      var from = area();
      dlg.showModal();
      void dlg.offsetWidth;
      dlg.classList.add('on');
      if (!from.width) { big.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 120 }); busy = false; $('zoomX').focus(); return; }
      if (!isBtn) el.style.visibility = 'hidden';
      big.animate([{ transform: flip(from, isBtn), opacity: isBtn ? .2 : 1 }, { transform: 'none', opacity: 1 }], { duration: 420, easing: 'cubic-bezier(.2,.8,.2,1)' }).onfinish = function () { busy = false; };
      $('zoomX').focus();
    }
    function close() {
      if (busy || !dlg.open) return;
      busy = true; dlg.classList.remove('on');
      var done = function () { dlg.close(); if (src && !srcBtn) src.style.visibility = ''; src = null; busy = false; };
      if (!src || !src.isConnected || !src.offsetWidth) { big.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 160 }).onfinish = done; return; }
      var a = big.animate([{ transform: 'none', opacity: 1 }, { transform: flip(area(), srcBtn), opacity: srcBtn ? .2 : 1 }], { duration: 340, easing: 'cubic-bezier(.5,0,.75,.2)', fill: 'forwards' });
      a.onfinish = function () { done(); a.cancel(); };
    }
    document.addEventListener('click', function (e) {
      var t = e.target.closest && e.target.closest('.fcard.sel .picbtn, img.thumb, #newImgPrev, #editImgPrev');
      if (!t || t.hidden) return;
      e.stopPropagation(); e.preventDefault();
      if (t.classList.contains('picbtn')) open(t, t._src, true); else open(t, t.src, false);
    }, true);
    dlg.addEventListener('click', close);
    dlg.addEventListener('cancel', function (e) { e.preventDefault(); close(); });
  })();

  rebuildStudy();
  renderFile();
  fileRestore();
  landing();
  document.body.classList.add('kd-ready');   // Fußzeile erst zeigen, wenn die Seite aufgebaut ist: sonst springt sie nach unten (Layout-Verschiebung)
  try {
    var sicht = sessionStorage.getItem('kartenbox-sicht'); sessionStorage.removeItem('kartenbox-sicht');   // nach dem Sprachwechsel dort weitermachen, wo man war
    if (sicht === 'land') { landShown = true; landReveal(); $('landing').showModal(); }
    else if (sicht && sicht !== 'study' && $('view-' + sicht)) show(sicht);
  } catch (e) {}
  kStart();
  }
  if (LANG === 'en' && !EN_DICT && EN_SRC) {
    var sc = document.createElement('script'); sc.src = EN_SRC;
    sc.onload = function () { EN_DICT = window.KB_EN || null; go(); };
    sc.onerror = function () { go(); };   // ohne Wörterbuch bleibt es Deutsch, die App läuft trotzdem
    document.head.appendChild(sc);
  } else go();
})();
