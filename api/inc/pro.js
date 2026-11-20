/* KarteiDeck Zusatzfunktionen: kommen nur auf Anfrage vom Server (angemeldetes Konto), stehen nicht in karteikarten.html. */
(function () {
var X = window.__kbx;
with (X) {

  /* Fortschritt: Tag, Monat, Jahr. Gezählt wird aus dem Lernprotokoll (db.log), geordnet nach den Rubriken der Karten.
     Ohne Lernprotokoll gibt es eine Demo mit Beispieldaten, die nach 2 Minuten abläuft. */
  var FPSTAMP = '<svg viewBox="0 0 512 512" aria-hidden="true"><path fill="currentColor" d="M312 201.8c0-17.4 9.2-33.2 19.9-47 12.6-16.2 20.1-36.6 20.1-58.8 0-53-43-96-96-96s-96 43-96 96c0 22.1 7.5 42.5 20.1 58.8 10.7 13.8 19.9 29.6 19.9 47 0 29.9-24.3 54.2-54.2 54.2L112 256c-61.9 0-112 50.1-112 112 0 26.5 21.5 48 48 48l416 0c26.5 0 48-21.5 48-48 0-61.9-50.1-112-112-112l-33.8 0c-29.9 0-54.2-24.3-54.2-54.2zM56 464c-13.3 0-24 10.7-24 24s10.7 24 24 24l400 0c13.3 0 24-10.7 24-24s-10.7-24-24-24L56 464z"/></svg>';
  var EN = LANG === 'en';
  var MON = EN ? ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'] : ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
  var MONK = EN ? ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] : ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
  var WDK = EN ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] : ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'], WDS = EN ? ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] : ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
  var FP = { mode: 'tag', off: 0, demo: false, over: false, end: 0, iv: 0, root: null };
  function fpFmt(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }
  function fpPad(n) { return ('0' + n).slice(-2); }
  function stampEl(cls) { var s = el('span', cls); s.innerHTML = FPSTAMP; return s; }
  /* Demo-Daten: Beispiele, nichts davon landet in deinen Daten. */
  var DEMOST = null;
  function demoStat() {
    if (DEMOST) return DEMOST;
    var seed = 7, rnd = function () { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; }, base = demoCards(), log = {}, i, k;
    for (i = 0; i < 32; i++) {
      if (i % 4 === 3 || i === 5) continue;
      var d = new Date(); d.setDate(d.getDate() - i);
      var n = 6 + Math.floor(rnd() * 11), c = [];
      for (k = 0; k < n; k++) c.push([base[Math.floor(rnd() * base.length)].id, rnd() < 0.42 + 0.017 * (32 - i) ? 1 : 0]);
      log[dayKey(d)] = { n: n, ok: c.reduce(function (a, e) { return a + e[1]; }, 0), c: c };
    }
    DEMOST = { log: log, cards: base.map(function (c, n) { return { id: c.id, q: c.q, a: c.a, cat: c.cat, n: 1, box: 1 + (n * 3) % 5, miss: 0 }; }) };
    return DEMOST;
  }
  function fpSrc() { return FP.demo || FP.over ? demoStat() : { log: db.log, cards: db.cards }; }
  function fpGoal() { return FP.demo || FP.over ? (CFG.lernen.tagesziel || 10) : CFG.lernen.tagesziel; }
  function fpPeriod() {
    var now = new Date(), o = FP.off, d;
    if (FP.mode === 'tag') { d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + o); return { prefix: dayKey(d), date: d, title: EN ? WDS[d.getDay()] + ', ' + d.getDate() + ' ' + MONK[d.getMonth()] + ' ' + d.getFullYear() : WDS[d.getDay()] + ', ' + d.getDate() + '. ' + MONK[d.getMonth()] + ' ' + d.getFullYear() }; }
    if (FP.mode === 'monat') { d = new Date(now.getFullYear(), now.getMonth() + o, 1); return { prefix: d.getFullYear() + '-' + fpPad(d.getMonth() + 1) + '-', date: d, title: MON[d.getMonth()] + ' ' + d.getFullYear() }; }
    d = new Date(now.getFullYear() + o, 0, 1); return { prefix: d.getFullYear() + '-', date: d, title: String(d.getFullYear()) };
  }
  /* Karten im Zeitraum: gesamt, gewusst, Lerntage, je Rubrik. Gelöschte Karten fallen aus der Rubrikenliste. */
  function fpAgg(src, prefix) {
    var byId2 = {}, cats = {}, A = { n: 0, ok: 0, days: 0, rows: [] };
    src.cards.forEach(function (c) { byId2[c.id] = c; });
    Object.keys(src.log).forEach(function (k) {
      if (k.indexOf(prefix) !== 0) return;
      var L = src.log[k], seen = 0, seenOk = 0;
      if (!L.n) return;
      A.n += L.n; A.ok += L.ok; A.days++;
      (L.c || []).forEach(function (e) {
        seen++; if (e[1]) seenOk++;
        var c = byId2[e[0]]; if (!c) return;
        var g = cats[c.cat] || (cats[c.cat] = { cat: c.cat, color: catColor(c.cat), n: 0, ok: 0, ms: 0 });
        g.n++; if (e[1]) g.ok++;
      });
      if (L.n > seen) {   // ältere Tage ohne Kartenliste
        var g2 = cats['\0'] || (cats['\0'] = { cat: 'Ältere Einträge', color: '#8b94a3', n: 0, ok: 0, ms: 0 });
        g2.n += L.n - seen; g2.ok += Math.max(0, L.ok - seenOk);
      }
    });
    /* Gemeistert: Karte ist in diesem Zeitraum in Fach 5 angekommen. Ohne Datum gilt der letzte richtige Tag im Protokoll. */
    var lastOk = {};
    Object.keys(src.log).sort().forEach(function (k) { (src.log[k].c || []).forEach(function (e) { if (e[1]) lastOk[e[0]] = k; }); });
    src.cards.forEach(function (c) {
      if (c.box !== 5 || !c.n) return;
      var k = c.mst ? dayKey(c.mst) : lastOk[c.id];
      if (!k || k.indexOf(prefix) !== 0) return;
      var g = cats[c.cat] || (cats[c.cat] = { cat: c.cat, color: catColor(c.cat), n: 0, ok: 0, ms: 0 });
      g.ms++;
    });
    A.rows = Object.keys(cats).map(function (k) { return cats[k]; }).filter(function (g) { return g.n || g.ms; }).sort(function (a, b) { return b.n - a.n; });
    return A;
  }
  function fpWeek(date, goal, log) {
    var mon = new Date(date.getFullYear(), date.getMonth(), date.getDate() - (date.getDay() + 6) % 7), t = new Date(), hit = 0, tot = 0, i;
    t = new Date(t.getFullYear(), t.getMonth(), t.getDate());
    for (i = 0; i < 7; i++) {
      var d = new Date(mon.getFullYear(), mon.getMonth(), mon.getDate() + i);
      if (d > t) break;
      tot++; var L = log[dayKey(d)]; if (L && L.n >= goal) hit++;
    }
    return [hit, tot];
  }
  function fpVisual(A, P, src) {
    var box = el('div'), now = new Date(), i;
    if (FP.mode === 'tag') {
      var goal = fpGoal();
      if (!goal) { box.appendChild(el('p', 'hint', 'Kein Tagesziel gesetzt. Unter Optionen kannst du eins festlegen.')); return box; }
      var w = el('div', 'pgoal'), bar = el('div', 'bar'), fi = el('i'), lab = el('div', 'lab'), wk = fpWeek(P.date, goal, src.log);
      fi.style.width = '0'; bar.appendChild(fi); w.appendChild(bar);
      lab.appendChild(el('b', null, 'Tagesziel ' + A.n + ' von ' + goal));
      lab.appendChild(el('span', null, 'In dieser Woche ' + wk[0] + ' von ' + wk[1] + (wk[1] === 1 ? ' Tag' : ' Tagen') + ' geschafft'));
      w.appendChild(lab); w.appendChild(stampEl('seal'));
      box.appendChild(w);
      requestAnimationFrame(function () { requestAnimationFrame(function () {
        fi.style.width = Math.min(100, A.n / goal * 100) + '%';
        if (A.n >= goal) setTimeout(function () { w.classList.add('done'); }, 750 / CFG.animation.tempo);
      }); });
      return box;
    }
    if (FP.mode === 'monat') {
      var cal = el('div', 'mcal'), y = P.date.getFullYear(), m = P.date.getMonth(), days = new Date(y, m + 1, 0).getDate(), lead = (new Date(y, m, 1).getDay() + 6) % 7;
      WDK.forEach(function (d) { cal.appendChild(el('div', 'h', d)); });
      for (i = 0; i < lead; i++) cal.appendChild(el('div'));
      var today = dayKey();
      for (i = 1; i <= days; i++) {
        var k = y + '-' + fpPad(m + 1) + '-' + fpPad(i), L = src.log[k], c = el('div', 'd' + (L && L.n ? ' on' : '') + (k === today ? ' today' : '') + (k > today ? ' fut' : ''));
        c.appendChild(document.createTextNode(String(i)));
        if (L && L.n) { c.appendChild(el('span', 'n', String(L.n))); c.appendChild(stampEl('st')); c.title = L.n + (L.n === 1 ? ' Karte' : ' Karten'); }
        cal.appendChild(c);
      }
      box.appendChild(cal);
      return box;
    }
    var vals = [], mx = 1, yy = P.date.getFullYear();
    for (i = 0; i < 12; i++) {
      var pre = yy + '-' + fpPad(i + 1) + '-', t = 0;
      Object.keys(src.log).forEach(function (k) { if (k.indexOf(pre) === 0) t += src.log[k].n || 0; });
      vals.push(t); if (t > mx) mx = t;
    }
    var yb = el('div', 'ybars');
    vals.forEach(function (v, n) {
      var col = el('div', yy === now.getFullYear() ? (n === now.getMonth() ? 'cur' : n > now.getMonth() ? 'fut' : '') : yy > now.getFullYear() ? 'fut' : ''), b = el('i');
      b.style.height = '0'; b.title = v + (v === 1 ? ' Karte' : ' Karten');
      col.appendChild(b); col.appendChild(el('span', null, MONK[n])); yb.appendChild(col);
      requestAnimationFrame(function () { requestAnimationFrame(function () { b.style.height = Math.max(2, Math.round(v / mx * 100)) + '%'; }); });
    });
    box.appendChild(yb);
    return box;
  }
  function fpRows(A) {
    var box = el('div');
    if (!A.rows.length) { box.appendChild(el('p', 'hint', 'In diesem Zeitraum hast du nichts gelernt.')); return box; }
    var mx = A.rows[0].n || 1, rubs = el('div', 'rubs');
    A.rows.forEach(function (r) {
      var row = el('div', 'rr'), nm = el('span', 'nm'), dot = el('i');
      dot.style.background = r.color; nm.appendChild(dot); nm.appendChild(document.createTextNode(r.cat)); row.appendChild(nm);
      row.appendChild(el('span', 'k', fpFmt(r.n)));
      var bw = el('div', 'bw'), inn = el('div', 'in'), pc = r.n ? Math.round(r.ok / r.n * 100) : 0, ok = el('span', 'ok'), bad = el('span', 'bad');
      inn.style.width = Math.max(3, Math.round(r.n / mx * 100)) + '%'; ok.style.width = pc + '%'; bad.style.width = (100 - pc) + '%';
      inn.appendChild(ok); inn.appendChild(bad); bw.appendChild(inn); row.appendChild(bw);
      row.appendChild(el('span', 'pc', r.n ? pc + ' % gewusst' : ''));
      row.appendChild(el('span', 'ms' + (r.ms ? '' : ' none'), r.ms ? '+' + r.ms + ' gemeistert' : '.'));
      rubs.appendChild(row);
    });
    box.appendChild(rubs);
    var lg = el('p', 'leg'), a = el('span', null, 'gewusst'), b = el('span', null, 'nochmal'), c = el('span', null, 'gemeistert = neu im obersten Fach');
    [[a, 'var(--good)'], [b, '#d9695f']].forEach(function (x) { var s = el('i'); s.style.background = x[1]; x[0].insertBefore(s, x[0].firstChild); });
    lg.appendChild(a); lg.appendChild(b); lg.appendChild(c); box.appendChild(lg);
    return box;
  }
  function fpBody(anim) {
    var b = $('fpBody'), src = fpSrc(), P = fpPeriod(), A = fpAgg(src, P.prefix), pc = A.n ? Math.round(A.ok / A.n * 100) : 0;
    b.textContent = '';
    var s1 = el('section', 'group' + (anim ? ' swap' : '')), s2 = el('section', 'group' + (anim ? ' swap' : '')), sum = el('div', 'sum');
    sum.appendChild(el('b', null, fpFmt(A.n) + (A.n === 1 ? ' Karte' : ' Karten')));
    sum.appendChild(el('span', null, !A.n ? 'nichts gelernt' : FP.mode === 'tag' ? A.ok + ' gewusst (' + pc + ' %)' : 'an ' + A.days + (A.days === 1 ? ' Lerntag' : ' Lerntagen') + ' · ' + pc + ' % gewusst'));
    s1.appendChild(sum); s1.appendChild(fpVisual(A, P, src));
    s2.appendChild(el('h3', null, 'Nach Rubriken')); s2.appendChild(fpRows(A));
    b.appendChild(s1); b.appendChild(s2);
    $('fpTitle').textContent = P.title;
    $('fpNext').disabled = FP.off >= 0;
    root2().querySelectorAll('[data-m]').forEach(function (x) { x.setAttribute('aria-pressed', String(x.dataset.m === FP.mode)); });
  }
  function root2() { return FP.root; }
  function fpMm(s) { return Math.floor(s / 60) + ':' + fpPad(s % 60); }
  function fpTick() {
    var l = Math.max(0, Math.round((FP.end - Date.now()) / 1000)), t = $('tm'), dr = $('drain');
    if (t) t.textContent = fpMm(l);
    if (dr) dr.style.width = (l / 120 * 100) + '%';
    if (l <= 0) { clearInterval(FP.iv); FP.iv = 0; FP.demo = false; FP.over = true; if (current === 'prog' && FP.root) PRO.progress(FP.root); }
  }
  function fpDemo() {
    clearInterval(FP.iv);
    FP.demo = true; FP.over = false; FP.mode = 'tag'; FP.off = 0; FP.end = Date.now() + 120000;
    FP.iv = setInterval(fpTick, 500);
    PRO.progress(FP.root);
  }
  PRO.progLeave = function () { clearInterval(FP.iv); FP.iv = 0; FP.demo = false; FP.over = false; FP.off = 0; };
  PRO.progress = function (root) {
    FP.root = root; root.textContent = '';
    var real = Object.keys(db.log).length > 0;
    if (!FP.demo && !FP.over && !real) {
      var g = el('section', 'group teaser'), row = el('div', 'row');
      g.appendChild(el('h3', null, 'Fortschritt'));
      g.appendChild(el('p', null, 'Noch nichts gelernt. Sobald du Karten mit Gewusst oder Nochmal bewertest, steht hier dein Fortschritt für Tag, Monat und Jahr. So sieht er aus:'));
      var d1 = el('button', 'btn primary', 'Demo ansehen (2 Minuten)'); d1.type = 'button'; d1.addEventListener('click', fpDemo);
      var d2 = el('button', 'btn', 'Jetzt lernen'); d2.type = 'button'; d2.addEventListener('click', function () { document.querySelector('.tab[data-view="study"]').click(); });
      row.appendChild(d1); row.appendChild(d2); g.appendChild(row); root.appendChild(g);
      return;
    }
    if (FP.demo || FP.over) {
      var db1 = el('div', 'demobar'), dl = el('span', 'left');
      db1.appendChild(el('span', 'neu', 'Demo')); dl.textContent = 'Beispieldaten, nicht deine Karten'; db1.appendChild(dl);
      var tm = el('span', 'tm', fpMm(FP.over ? 0 : Math.max(0, Math.round((FP.end - Date.now()) / 1000)))); tm.id = 'tm'; db1.appendChild(tm);
      if (real && !FP.over) { var bx = el('button', 'btn', 'Demo beenden'); bx.type = 'button'; bx.addEventListener('click', function () { PRO.progLeave(); PRO.progress(root); }); db1.appendChild(bx); }
      root.appendChild(db1);
      var dw = el('div', 'drainbar'), di = el('i'); di.id = 'drain'; di.style.width = FP.over ? '0' : Math.round(Math.max(0, FP.end - Date.now()) / 1200) + '%'; dw.appendChild(di); root.appendChild(dw);
    }
    var wrap = el('div'); wrap.style.cssText = 'display:grid;gap:14px';
    if (FP.over) wrap.className = 'gone';
    var tools = el('section', 'group'), tl = el('div', 'tools2'), sg = el('div', 'seg3'), nv = el('div', 'pnav');
    sg.setAttribute('role', 'group'); sg.setAttribute('aria-label', 'Zeitraum');
    [['tag', 'Tag'], ['monat', 'Monat'], ['jahr', 'Jahr']].forEach(function (p) {
      var b = el('button', null, p[1]); b.type = 'button'; b.dataset.m = p[0];
      b.addEventListener('click', function () { if (FP.mode === p[0]) return; FP.mode = p[0]; FP.off = 0; fpBody(true); });
      sg.appendChild(b);
    });
    var pv = el('button', null, '‹'), nx = el('button', null, '›'), tt = el('b', null, '');
    pv.type = nx.type = 'button'; pv.setAttribute('aria-label', 'Zurück'); nx.setAttribute('aria-label', 'Weiter'); tt.id = 'fpTitle'; nx.id = 'fpNext'; tt.setAttribute('aria-live', 'polite');
    pv.addEventListener('click', function () { FP.off--; fpBody(true); });
    nx.addEventListener('click', function () { if (FP.off < 0) { FP.off++; fpBody(true); } });
    nv.appendChild(pv); nv.appendChild(tt); nv.appendChild(nx);
    tl.appendChild(sg); tl.appendChild(nv); tools.appendChild(tl); wrap.appendChild(tools);
    if (real && !FP.demo && !FP.over) {   // wer schon Daten hat, kann die Demo trotzdem ansehen
      var dr0 = el('div', 'row'), db0 = el('button', 'btn', 'Demo ansehen (2 Minuten)'); db0.type = 'button'; db0.addEventListener('click', fpDemo);
      dr0.appendChild(db0); tools.appendChild(dr0);
    }
    var body = el('div'); body.id = 'fpBody'; body.style.cssText = 'display:grid;gap:14px'; wrap.appendChild(body);
    root.appendChild(wrap);
    fpBody(false);
    if (FP.over) {
      var ec = el('div', 'endcard'), r2 = el('div', 'row');
      ec.appendChild(el('h3', null, 'Demo beendet'));
      ec.appendChild(el('p', null, real ? 'Das waren Beispieldaten, nicht deine Karten.' : 'Das waren Beispieldaten. Sobald du eigene Karten lernst, steht hier dein Fortschritt.'));
      var e1 = el('button', 'btn primary', real ? 'Zu meinem Fortschritt' : 'Jetzt lernen'); e1.type = 'button'; e1.addEventListener('click', function () { PRO.progLeave(); if (real) PRO.progress(root); else document.querySelector('.tab[data-view="study"]').click(); });
      var e2 = el('button', 'btn', 'Demo noch einmal'); e2.type = 'button'; e2.addEventListener('click', fpDemo);
      r2.appendChild(e1); r2.appendChild(e2); ec.appendChild(r2); root.appendChild(ec);
    }
  };

  /* Tippen: Antwort eintragen, die Karte dreht sich und zeigt, ob es gestimmt hat */
  /* Wortbank (Lückentext): Wörter antippen statt eintippen. Neben den gesuchten Wörtern liegen zwei falsche bereit, passend aus deinen anderen Karten gewählt. */
  var BK = { id: null, words: [], filled: [], chips: [], miss: 0, done: false };
  function bankFor(c) { return !stage.hidden && CFG.lernen.wortbank && c && hasCloze(c.q); }
  function bnorm(w) { return String(w).trim().toLowerCase(); }
  function bshuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  /* Falsche Wörter: aus den eigenen Karten, passend zum gesuchten Wort. Nichts aus dem sichtbaren Satz (das wäre sofort ausgeschlossen),
     keine Füllwörter, keine Beinahe-Tippfehler. Bevorzugt: gleiche Rubrik und Tags, Lückenwörter anderer Karten, gleiche Groß-/Kleinschreibung, Länge und Endung. */
  var BSTOP = {}; ('der die das den dem des ein eine einen einem einer eines und oder aber ist sind war waren wird werden hat haben nicht kein keine zu zum zur mit von vom auf in im an am aus bei nach für über unter vor durch um als wie auch es er sie wir ihr du ich man sich wenn dass weil the a an and or of to on at for with is are was were be by from that this it as').split(' ').forEach(function (w) { BSTOP[w] = 1; });
  /* Wortgruppen: gleichartige Begriffe (Städte, Flüsse, Elemente, Monate ...). Kommt das gesuchte Wort in einer Gruppe vor, kommen die falschen Wörter von dort. */
  var BGROUPS = [
    'Berlin Paris Madrid Rom Wien Bern London Lissabon Warschau Prag Budapest Athen Amsterdam Brüssel Kopenhagen Stockholm Oslo Helsinki Dublin Moskau Kiew Ankara Kairo Washington Ottawa Canberra Tokio Peking Neu-Delhi Brasília Bukarest Sofia Zagreb Belgrad Bratislava Ljubljana Vilnius Riga Tallinn Reykjavik Luxemburg Valletta Lima Santiago Bogotá Havanna Nairobi Pretoria Teheran Bagdad Seoul Bangkok Hanoi Jakarta Manila Wellington Hamburg München Köln Frankfurt Stuttgart Düsseldorf Dresden Leipzig Hannover Nürnberg Essen Dortmund Zürich Genf Salzburg Graz Innsbruck Mailand Venedig Florenz Neapel Barcelona Valencia Sevilla Marseille Lyon Nizza Toronto Montreal Sydney Melbourne Istanbul Mumbai Shanghai Dubai',
    'Deutschland Frankreich Spanien Italien Österreich Schweiz Polen Tschechien Ungarn Griechenland Portugal Niederlande Belgien Dänemark Schweden Norwegen Finnland Irland Island Russland Ukraine Türkei Ägypten Kanada Mexiko Brasilien Argentinien Australien China Japan Indien Indonesien Südafrika Kenia Marokko Peru Chile Kolumbien Kuba Rumänien Bulgarien Kroatien Serbien Slowakei Slowenien Litauen Lettland Estland Luxemburg England Schottland Iran Irak Israel Pakistan Vietnam Thailand Nigeria Äthiopien Neuseeland',
    'Rhein Elbe Donau Weser Oder Main Neckar Mosel Spree Isar Inn Ems Saale Havel Lahn Ruhr Lech Wolga Seine Themse Loire Rhone Po Tiber Tajo Ebro Weichsel Dnepr Nil Kongo Niger Sambesi Amazonas Mississippi Missouri Jangtse Ganges Indus Euphrat Tigris Mekong',
    'Alpen Anden Himalaya Pyrenäen Karpaten Apennin Ural Kaukasus Harz Schwarzwald Eifel Taunus Erzgebirge Zugspitze Matterhorn Montblanc Großglockner Kilimandscharo Vesuv Ätna Fujiyama',
    'Nordsee Ostsee Mittelmeer Atlantik Pazifik Arktis Nordpol Südpol Karibik Adria Ägäis Nordmeer',
    'Europa Asien Afrika Nordamerika Südamerika Australien Antarktis Ozeanien',
    'Bayern Sachsen Hessen Berlin Hamburg Bremen Brandenburg Thüringen Saarland Niedersachsen Schleswig-Holstein Rheinland-Pfalz Mecklenburg-Vorpommern Sachsen-Anhalt Nordrhein-Westfalen Baden-Württemberg',
    'Norden Osten Süden Westen Nordosten Nordwesten Südosten Südwesten',
    'Euro Dollar Pfund Franken Yen Rubel Krone Zloty Forint Lira Yuan Rupie',
    'Merkur Venus Erde Mars Jupiter Saturn Uranus Neptun Pluto Mond Sonne Komet Asteroid Galaxie',
    'Granit Basalt Sandstein Kalkstein Marmor Schiefer Gneis Tuff Obsidian Bimsstein Erdkruste Erdmantel Erdkern Vulkan Erdbeben Tsunami Gletscher',
    'Regen Schnee Hagel Nebel Gewitter Sturm Wind Orkan Tau Frost Dürre Hochwasser',
    'Wasserstoff Sauerstoff Stickstoff Kohlenstoff Helium Neon Argon Chlor Fluor Schwefel Phosphor Eisen Kupfer Zink Zinn Blei Gold Silber Quecksilber Aluminium Natrium Kalium Calcium Magnesium Lithium Silizium Jod Uran Platin Nickel Chrom',
    'H₂O CO₂ O₂ N₂ H₂ O₃ NaCl CH₄ NH₃ HCl NaOH H₂SO₄ HNO₃ CaCO₃ SiO₂ SO₂ NO₂ C₆H₁₂O₆ Fe₂O₃',
    'Stromstärke Spannung Widerstand Leistung Arbeit Energie Kraft Masse Geschwindigkeit Beschleunigung Druck Temperatur Frequenz Dichte Impuls Ladung Wellenlänge Gewicht Zeit Strecke',
    'Volt Ampere Ohm Watt Joule Newton Pascal Hertz Kelvin Coulomb Meter Sekunde Kilogramm Liter Gramm Kilometer Celsius',
    'Wärmeenergie Bewegungsenergie Lageenergie Spannenergie Kernenergie Windenergie Solarenergie Wasserkraft Biomasse Geothermie Elektrizität',
    'schmelzen verdampfen kondensieren erstarren sublimieren resublimieren sieden gefrieren',
    'Zellkern Chloroplasten Mitochondrien Zellwand Zellmembran Vakuole Ribosomen Zellplasma Zytoplasma Chromosomen',
    'Fotosynthese Zellatmung Gärung Verdauung Fortpflanzung Evolution Vererbung Photosynthese Atmung Stoffwechsel Befruchtung Zellteilung Mutation',
    'Herz Lunge Leber Niere Magen Darm Gehirn Milz Bauchspeicheldrüse Gallenblase Blase Schilddrüse Haut Zunge Auge Ohr Nase',
    'Blut Lymphe Speichel Galle Urin Schweiß Plasma Magensaft Tränen',
    'Kopf Hals Schulter Arm Ellenbogen Hand Finger Bauch Rücken Hüfte Bein Knie Fuß Zeh',
    'Schädel Wirbelsäule Rippe Oberschenkelknochen Elle Speiche Schienbein Wadenbein Schlüsselbein Becken Brustbein Kniescheibe',
    'Holz Stein Metall Glas Kunststoff Papier Stoff Leder Beton Keramik Gummi Ton',
    'Wurzel Stängel Spross Blatt Blüte Frucht Samen Knospe Stamm Rinde Pollen',
    'Apfel Birne Banane Orange Zitrone Kirsche Erdbeere Himbeere Traube Pflaume Pfirsich Ananas Melone',
    'Karotte Kartoffel Tomate Gurke Zwiebel Paprika Kohl Salat Spinat Erbse Bohne Lauch Sellerie',
    'Hund Katze Pferd Kuh Schwein Schaf Ziege Esel Hase Huhn Ente Gans',
    'Elefant Löwe Tiger Giraffe Zebra Nashorn Nilpferd Bär Wolf Fuchs Hirsch Reh Wildschwein Dachs Igel Biber Delfin Wal',
    'Amsel Spatz Meise Storch Adler Falke Eule Taube Rabe Krähe Schwalbe Specht Kuckuck Pinguin Möwe',
    'Forelle Hecht Karpfen Lachs Hering Thunfisch Aal Barsch Zander Hai',
    'Biene Wespe Ameise Fliege Mücke Käfer Schmetterling Libelle Heuschrecke Spinne Floh Hummel',
    'Glucose Fructose Saccharose Stärke Cellulose Eiweiß Fett Vitamin Protein Kohlenhydrate Enzym',
    'Dreieck Viereck Quadrat Rechteck Kreis Raute Trapez Parallelogramm Drachen Fünfeck Sechseck Ellipse',
    'Kugel Würfel Quader Zylinder Kegel Pyramide Prisma',
    'Hypotenuse Kathete Radius Durchmesser Umfang Fläche Volumen Diagonale Höhe Winkel Sehne Tangente Mittelpunkt Scheitelpunkt Seite Kante Ecke',
    'Summe Differenz Produkt Quotient Faktor Potenz Wurzel Bruch Zähler Nenner Dividend Divisor Summand Exponent Basis Term Gleichung Variable Funktion Mittelwert Median',
    'Primzahl Quadratzahl Kubikzahl Bruchzahl Dezimalzahl Ganzzahl Prozent Promille',
    'Nomen Verb Adjektiv Artikel Pronomen Adverb Präposition Konjunktion Numerale Interjektion Substantiv',
    'Nominativ Genitiv Dativ Akkusativ',
    'Präsens Präteritum Perfekt Plusquamperfekt Futur',
    'Deutsch Englisch Französisch Spanisch Italienisch Latein Russisch Türkisch Polnisch Griechisch Portugiesisch Niederländisch Arabisch Chinesisch Japanisch',
    'Mathematik Deutsch Englisch Biologie Chemie Physik Geschichte Erdkunde Geografie Musik Kunst Sport Religion Ethik Informatik Politik Latein Französisch',
    'Januar Februar März April Mai Juni Juli August September Oktober November Dezember',
    'Montag Dienstag Mittwoch Donnerstag Freitag Samstag Sonntag',
    'Frühling Sommer Herbst Winter',
    'rot blau grün gelb orange violett braun schwarz weiß grau rosa türkis lila',
    'January February March April May June July August September October November December',
    'Monday Tuesday Wednesday Thursday Friday Saturday Sunday',
    'red blue green yellow orange purple brown black white grey pink',
    'mother father sister brother grandmother grandfather aunt uncle cousin daughter son',
    'Steinzeit Bronzezeit Eisenzeit Antike Mittelalter Neuzeit Renaissance Aufklärung Reformation Industrialisierung Romantik Barock Moderne',
    'Demokratie Monarchie Diktatur Republik Oligarchie Anarchie Aristokratie Föderalismus',
    'Bundestag Bundesrat Bundesregierung Bundeskanzler Bundespräsident Grundgesetz Bundesverfassungsgericht Landtag Gemeinderat',
    'Legislative Exekutive Judikative',
    'Napoleon Cäsar Augustus Bismarck Luther Gutenberg Kolumbus Magellan Cortés Hannibal',
    'Einstein Newton Galilei Kepler Kopernikus Darwin Curie Pasteur Röntgen Planck Pythagoras Euklid Gauß Archimedes Faraday Ohm Volta Humboldt Mendel Koch Edison',
    'Goethe Schiller Lessing Fontane Heine Brecht Kafka Böll Grass Kleist Hesse Storm Hauptmann',
    'Bach Mozart Beethoven Haydn Schubert Brahms Wagner Händel Chopin Vivaldi Mendelssohn Schumann Strauss Telemann',
    'Geige Klavier Gitarre Flöte Trompete Schlagzeug Cello Harfe Posaune Klarinette Oboe Saxofon Orgel Bratsche Kontrabass Horn',
    'Fußball Handball Basketball Volleyball Tennis Schwimmen Turnen Leichtathletik Hockey Rugby Golf Judo Boxen Rudern Skifahren'
  ];
  var BG = null;
  function bgroups(t) {
    if (!BG) { BG = {}; BGROUPS.forEach(function (g, i) { g.split(' ').forEach(function (w) { var k = w.toLowerCase(); (BG[k] = BG[k] || []).push(i); }); }); }
    return BG[t.toLowerCase()] || [];
  }
  function bclean(w) { return w.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, ''); }
  function bedit(a, b) {
    var p = [], i, j, t, q;
    for (j = 0; j <= b.length; j++) p[j] = j;
    for (i = 1; i <= a.length; i++) { q = [i]; for (j = 1; j <= b.length; j++) { t = a[i - 1] === b[j - 1] ? 0 : 1; q[j] = Math.min(p[j] + 1, q[j - 1] + 1, p[j - 1] + t); } p = q; }
    return p[b.length];
  }
  function bscore(w, t, cat, tags, src) {   // w: Kandidat, t: gesuchtes Wort, src: Herkunft des Kandidaten
    var sc = src.lst ? 7 : src.gen ? 4 : src.gap ? 3 : 0, lw = w.length, lt = t.length, d = Math.abs(lw - lt), cw = /^\p{Lu}/u.test(w), ct = /^\p{Lu}/u.test(t), nw = /\d/.test(w), nt = /\d/.test(t);
    if (nw !== nt) sc -= 3; else if (nw) sc += 2;
    if (!src.first) sc += cw === ct ? 2 : -2;   // erstes Wort eines Satzes: Großschreibung sagt nichts
    sc += d <= 1 ? 2 : d <= 3 ? 1 : d > 6 ? -2 : 0;
    var lo = w.toLowerCase(), lt2 = t.toLowerCase();
    if (lw > 4 && lt > 4) sc += lo.slice(-3) === lt2.slice(-3) ? 2 : lo.slice(-2) === lt2.slice(-2) ? 1 : 0;
    if (cat && src.cat === cat) sc += 3;
    (src.tags || []).forEach(function (g) { if (tags.indexOf(g) >= 0) sc += 2; });
    return sc;
  }
  function bankStart(c) {
    var words = clozeWords(c.q).map(function (w) { return w.trim(); }), have = {}, seen = {}, pool = [], tags = c.tags || [], all = S.demo ? demoCards() : db.cards;
    words.forEach(function (w) { have[bnorm(w)] = 1; });
    c.q.replace(/\{\{.+?\}\}/g, ' ').split(/\s+/).forEach(function (w) { w = bnorm(bclean(w)); if (w) have[w] = 1; });   // steht schon im Satz
    function add(raw, src) {
      var w = bclean(raw), k = bnorm(w);
      if (w.length < 3 || have[k] || seen[k] || (BSTOP[k] && !words.some(function (x) { return BSTOP[bnorm(x)]; }))) return;
      for (var i = 0; i < words.length; i++) { var t = bnorm(words[i]); if (bedit(k, t) <= (t.length > 4 ? 2 : 1)) return; }   // Beinahe-Tippfehler oder Beugungsform
      seen[k] = 1; pool.push({ w: w, k: k, src: src });
    }
    function scan(fromGaps) {
      all.forEach(function (o) {
        if (o.id === c.id) return;
        var src = { gap: fromGaps, cat: o.cat, tags: o.tags };
        if (fromGaps) { if (hasCloze(o.q)) clozeWords(o.q).forEach(function (w) { add(w, src); }); return; }
        [o.q.replace(/\{\{(.+?)\}\}/g, '$1'), o.a || ''].forEach(function (txt) {
          txt.split(/[\s]+/).forEach(function (w, i) { add(w, { gap: false, cat: o.cat, tags: o.tags, first: i === 0 }); });
        });
      });
    }
    scan(true);
    var gi = {};
    words.forEach(function (t) { bgroups(bclean(t)).forEach(function (i) { gi[i] = 1; }); });
    Object.keys(gi).forEach(function (i) { BGROUPS[i].split(' ').forEach(function (w) { add(w, { lst: true }); }); });
    words.forEach(function (t) {   // Zahlen und Jahre: glaubhafte Nachbarwerte statt Wörter
      if (!/^\d{1,6}$/.test(t)) return;
      var n = +t, year = t.length === 4 && n >= 1000 && n <= 2100, d = year ? [-1, 1, -2, 2, -5, 5, -10, 10, -11, 11] : [-1, 1, -10, 10, -2, 2], g = [];
      d.forEach(function (x) { if (n + x > 0) g.push(String(n + x)); });
      if (!year && n >= 4) { g.push(String(n * 2)); g.push(String(Math.round(n / 2))); }
      g.forEach(function (w) { if (!have[w] && !seen[w]) { seen[w] = 1; pool.push({ w: w, k: w, src: { gen: true } }); } });
    });
    if (pool.length < 6) scan(false);   // wenige Lückenkarten: auch Wörter aus Fragen und Antworten anderer Karten
    var scored = pool.map(function (x) {
      var best = -99; words.forEach(function (t) { best = Math.max(best, bscore(x.w, t, c.cat, tags, x.src)); });
      return { w: x.w, k: x.k, gen: !!x.src.gen, v: best + Math.random() * 1.5 };
    }).sort(function (a, b) { return b.v - a.v; });
    var pick = [];
    scored.forEach(function (x) { if (pick.length < 2 && pick.every(function (y) { return (x.gen && y.gen) || bedit(x.k, y.k) > 2; })) pick.push(x); });
    var chips = words.map(function (w) { return { w: w, used: false, real: true }; });
    pick.forEach(function (x) { chips.push({ w: x.w, used: false, real: false }); });
    for (var n = 0; n < 5; n++) { bshuffle(chips); if (chips.length < 2 || chips[0].real === false || chips[0].w !== words[0]) break; }
    BK = { id: c.id, words: words, filled: words.map(function () { return false; }), chips: chips, miss: 0, done: false };
  }
  function bankPaint(e, c) {   /* Vorderseite mit den bisher richtig gesetzten Wörtern */
    Array.prototype.forEach.call(e.querySelectorAll('.face.front .txt'), function (node) {
      var img = node.querySelector('.cimg'), re = /\{\{(.+?)\}\}/g, q = c.q, last = 0, m, i = 0;
      node.textContent = ''; if (img) node.appendChild(img);
      while ((m = re.exec(q))) {
        node.appendChild(document.createTextNode(q.slice(last, m.index)));
        node.appendChild(el('span', BK.filled[i] ? 'wbfill' : 'wbgap', BK.filled[i] ? m[1] : '[ … ]'));
        last = m.index + m[0].length; i++;
      }
      node.appendChild(document.createTextNode(q.slice(last)));
    });
  }
  function bankInfo() {
    var k = BK.filled.filter(Boolean).length, n = BK.words.length, e = S.sel && S.els[S.sel];
    $('bankInfo').textContent = BK.done ? (BK.miss ? 'Geschafft, mit ' + BK.miss + (BK.miss === 1 ? ' Fehlversuch' : ' Fehlversuchen') + '. Jetzt „Gewusst“ oder „Nochmal“.' : 'Alles richtig. Jetzt „Gewusst“ drücken.')
      : n > 1 ? 'Tippe Wort ' + (k + 1) + ' von ' + n + ' an.' : 'Tippe das passende Wort an.';
    $('bankInfo').className = BK.done ? (BK.miss ? 'g1' : 'g2') : '';
  }
  function bankRender() {
    var host = $('bankWords'), off = BK.done || !(S.els[BK.id] && !S.els[BK.id]._flipped);
    host.textContent = '';
    BK.chips.forEach(function (ch, i) {
      var b = el('button', 'bankchip' + (ch.used ? ' used' : ''), ch.w);
      b.type = 'button'; b.dataset.i = i; b.disabled = off || ch.used;
      host.appendChild(b);
    });
    bankInfo();
  }
  $('bankWords').addEventListener('click', function (ev) {
    var b = ev.target.closest('.bankchip'), e = S.els[BK.id], c = byId(BK.id);
    if (!b || b.disabled || !e || e._flipped || !c || BK.done) return;
    var ch = BK.chips[+b.dataset.i], k = BK.filled.indexOf(false);
    if (k < 0) return;
    if (bnorm(ch.w) === bnorm(BK.words[k])) {
      ch.used = true; BK.filled[k] = true;
      if (BK.filled.indexOf(false) < 0) BK.done = true;
      bankPaint(e, c); bankRender();
      if (BK.done) { var id = BK.id; setTimeout(function () { if (S.sel === id && S.els[id] && !S.els[id]._flipped) { stopTimer(); flip(); } }, 650); }
    } else {
      BK.miss++; bankInfo();
      b.classList.remove('bad'); void b.offsetWidth; b.classList.add('bad');
    }
  });
  function typeState() {
    var e = S.sel && S.els[S.sel], c = e && byId(S.sel), bank = !!(e && bankFor(c));
    $('bankRow').hidden = !bank;
    if (bank) { if (BK.id !== c.id) bankStart(c); bankPaint(e, c); bankRender(); }
    var row = $('typeRow'), on = CFG.lernen.tippen && !stage.hidden && S.list.length > 0 && !bank;
    row.hidden = !on;
    if (!on) return;
    var e = S.sel && S.els[S.sel], can = !!(e && !e._flipped);
    $('typeIn').disabled = !can; $('typeBtn').disabled = !can;
  }
  function typeCheck() {
    var e = S.sel && S.els[S.sel];
    if (!e || e._flipped) return;
    var c = byId(S.sel), want = hasCloze(c.q) ? clozeWords(c.q).join(' ') : (S.rev[c.id] ? c.q : c.a);
    var g = grade($('typeIn').value, want), r = $('typeRes');
    r.textContent = g === 2 ? 'Richtig' : g === 1 ? 'Fast richtig' : 'Nicht ganz';
    r.className = 'g' + g;
    stopTimer(); flip();
  }
  $('typeBtn').addEventListener('click', typeCheck);
  $('typeIn').addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); typeCheck(); } });

  /* Vorlesen mit der Stimme des Geräts (offline). Vorderseite beim Wählen, Rückseite beim Drehen. */
  function speakCard(back) {
    var m = CFG.lernen.vorlesen;
    if (m === 'aus' || !window.speechSynthesis || !S.sel) return;
    if (back ? m === 'frage' : m === 'loesung') return;
    var c = byId(S.sel); if (!c) return;
    var rv = !!S.rev[c.id], front = rv ? aShow(c) : qShow(c), txt = back ? (rv ? qShow(c) : aShow(c)) : front;
    try {
      speechSynthesis.cancel();
      say(txt.replace(/\[ … \]/g, 'Lücke'), true);
    } catch (err) {}
  }
  var LANGN = { 'de-DE': 'Deutsch', 'en-GB': 'Englisch', 'fr-FR': 'Französisch', 'es-ES': 'Spanisch', 'it-IT': 'Italienisch' };
  var LANGT = { 'de-DE': 'Hallo, das ist ein Test.', 'en-GB': 'Hello, this is a test.', 'fr-FR': 'Bonjour, ceci est un test.', 'es-ES': 'Hola, esto es una prueba.', 'it-IT': 'Ciao, questo è un test.' };
  function voiceFor(lang) {
    var v = []; try { v = speechSynthesis.getVoices() || []; } catch (e) {}
    var l = lang.toLowerCase(), pre = l.slice(0, 2);
    function norm(x) { return String(x.lang).replace('_', '-').toLowerCase(); }
    return v.filter(function (x) { return norm(x) === l; })[0] || v.filter(function (x) { return norm(x).indexOf(pre) === 0; })[0] || null;
  }
  var warnedVoice = false;
  function say(text, quiet) {
    var lang = CFG.lernen.sprache, u = new SpeechSynthesisUtterance(text), v = voiceFor(lang), n = 0;
    try { n = (speechSynthesis.getVoices() || []).length; } catch (e) {}
    u.lang = lang;
    if (v) u.voice = v;
    else if (n && !warnedVoice) { warnedVoice = true; toast('Keine ' + LANGN[lang] + 'e Stimme auf diesem Gerät. Siehe Optionen.'); }
    speechSynthesis.speak(u);
  }
  if (window.speechSynthesis && speechSynthesis.addEventListener) speechSynthesis.addEventListener('voiceschanged', function () { if (current === 'opts') renderOptions(); });

  function playerOn() { return CFG.lernen.player && window.innerWidth >= 900; }
  function syncPlayer() { var on = playerOn() && !stage.hidden && !S.exam; $('player').hidden = !on; if (!on) autoStop(); }
  function autoUI() {
    $('autoBtn').setAttribute('aria-pressed', String(AUTO.on));
    $('autoTxt').textContent = AUTO.on ? 'Stopp' : 'Auto';
    $('player').classList.toggle('on', AUTO.on);
    $('autoMode').textContent = AUTO.rand ? 'Zufall' : 'Reihe';
  }
  function autoStop() {
    clearTimeout(AUTO.t); clearInterval(AUTO.iv); AUTO.iv = 0;
    $('autoLcd').textContent = '––';
    if (!AUTO.on) return;
    AUTO.on = false; autoUI();
  }
  /* Anzeige im Player: Seite und Sekunden, die noch laufen */
  function autoLcd() { var l = Math.max(0, Math.ceil((AUTO.end - Date.now()) / 1000)); $('autoLcd').textContent = AUTO.ph ? AUTO.ph + ' ' + l : '––'; }
  function autoPhase(ph, ms) { AUTO.ph = ph; AUTO.end = Date.now() + ms; autoLcd(); if (!AUTO.iv) AUTO.iv = setInterval(autoLcd, 200); }
  /* Karte fertig: normale Karten gehen auf den Stapel oben rechts. Eine angeheftete bleibt im Spiel: sie geht zurück in den Fächer ans Ende der Reihe und kommt in der nächsten Runde wieder. */
  function autoDone() {
    var id = S.sel, c = id && byId(id);
    if (c && c.pin) {
      deselect();   // die Karte legt sich in den Fächer zurück, danach rückt sie ans Ende der Reihe
      setTimeout(function () { S.queue = S.queue.filter(function (x) { return x !== id; }).concat(id); fill(0); }, Math.round(650 / CFG.animation.tempo));
    } else next();
  }
  function autoStep() {
    if (!AUTO.on || current !== 'study') return;
    if (!S.queue.length) {   // Durchlauf fertig: neu mischen und weiter, bis jemand stoppt
      AUTO.keep = true; rebuildStudy(); AUTO.keep = false;
      if (!S.queue.length) { autoStop(); return; }
    }
    var id = AUTO.rand ? S.queue[Math.floor(Math.random() * S.queue.length)] : S.queue[0], ms = CFG.lernen.auto * 1000;
    if (!S.els[id]) { S.queue = [id].concat(S.queue.filter(function (x) { return x !== id; })); fill(0); }   // nur die vorderen Karten haben ein Element, die gewählte holen wir nach vorn
    if (!S.els[id]) { autoStop(); return; }
    select(id); stopTimer(); autoPhase('Frage', ms);
    AUTO.t = setTimeout(function () {
      if (!AUTO.on) return;
      flip(); autoPhase('Lösung', ms);
      AUTO.t = setTimeout(function () {
        if (!AUTO.on) return;
        autoDone(); AUTO.ph = ''; autoLcd();
        AUTO.t = setTimeout(autoStep, Math.round(1100 / CFG.animation.tempo));
      }, ms);
    }, ms);
  }
  $('autoBtn').addEventListener('click', function () {
    if (AUTO.on) { autoStop(); return; }
    if (!S.queue.length) return;
    AUTO.on = true; autoUI(); deselect(); autoStep();
  });
  $('autoMode').addEventListener('click', function () { AUTO.rand = !AUTO.rand; autoUI(); });
  $('view-study').addEventListener('pointerdown', function (e) { if (AUTO.on && !e.target.closest('#player, #studyControls, .pinbtn')) autoStop(); }, true);
  /* Tasten am Rechner (Gewusst, Nochmal, Weiter, Lösung, Mischen) stoppen den Player nicht: er macht danach mit der nächsten Karte weiter */
  $('studyControls').addEventListener('click', function (e) {
    var b = e.target.closest('button');
    if (!AUTO.on || !b || b.closest('#player')) return;
    clearTimeout(AUTO.t);
    var ms = CFG.lernen.auto * 1000, tempo = CFG.animation.tempo;
    if (b.id === 'flipBtn') {
      autoPhase('Lösung', ms);
      AUTO.t = setTimeout(function () { if (!AUTO.on) return; autoDone(); AUTO.ph = ''; autoLcd(); AUTO.t = setTimeout(autoStep, Math.round(1100 / tempo)); }, ms);
    } else {
      AUTO.ph = ''; autoLcd();
      AUTO.t = setTimeout(autoStep, Math.round((b.id === 'shuffleBtn' ? 1800 : 1100) / tempo));
    }
  });
  document.addEventListener('keydown', function (e) { if (AUTO.on && !e.target.closest('#player')) autoStop(); }, true);
  autoUI();

  function startExam() {
    if (S.demo) { toast('Prüfung geht mit deinen eigenen Karten'); return; }
    if (catList().length < 3) { toast('Für eine Prüfung brauchst du mindestens 3 Karten'); return; }
    S.examNext = true; S.mode = 'alle';
    show('study');
    rebuildStudy();
  }

PRO.typeState = typeState; PRO.speakCard = speakCard; PRO.syncPlayer = syncPlayer; PRO.autoStop = autoStop; PRO.startExam = startExam;
PRO.direction = function () { return CFG.lernen.richtung; };
PRO.options = function (C) {
var group = C.group, row = C.row, onOff = C.onOff, px = C.px;
    if (window.innerWidth >= 900) {   // am Handy gibt es keinen Player, dort wäre kein Platz
      var gp = group('Kassettenplayer', true);
      row(gp, 'Player auf dem Tisch', seg('lernen.player', onOff));
      row(gp, 'Sekunden pro Seite', stepper('lernen.auto', 3, 30, 1, function (x) { return x + ' s'; }, function () { return CFG.lernen.player; }));
      gp.appendChild(el('p', 'hint', 'Spielt Fragen und Lösungen immer wieder ab, zum Einprägen. Nur am Computer.'));
    }
    var g5 = group('Lernarten', true);
    row(g5, 'Richtung', seg('lernen.richtung', [{ v: 'vor', label: 'Normal' }, { v: 'rueck', label: 'Rückwärts' }, { v: 'misch', label: 'Gemischt' }]), true);
    row(g5, 'Antwort tippen', seg('lernen.tippen', onOff), true);
    row(g5, 'Wortbank bei Lückentext', seg('lernen.wortbank', onOff), true);
    if (window.speechSynthesis) {
      row(g5, 'Vorlesen', seg('lernen.vorlesen', [{ v: 'aus', label: 'Aus' }, { v: 'frage', label: 'Frage' }, { v: 'loesung', label: 'Lösung' }, { v: 'beides', label: 'Beides' }]), true);
      row(g5, 'Sprache', seg('lernen.sprache', [{ v: 'de-DE', label: 'DE' }, { v: 'en-GB', label: 'EN' }, { v: 'fr-FR', label: 'FR' }, { v: 'es-ES', label: 'ES' }, { v: 'it-IT', label: 'IT' }]), true);
    }
    if (window.speechSynthesis) {
      var nv = 0; try { nv = (speechSynthesis.getVoices() || []).length; } catch (e) {}
      var vp = el('p', 'hint'); g5.appendChild(vp);
      var vtext = function () {
        var vf = voiceFor(CFG.lernen.sprache);
        vp.textContent = !nv ? 'Dein Browser meldet keine Stimmen. Vorlesen geht dann nicht.' : vf ? 'Stimme: ' + vf.name : 'Keine ' + LANGN[CFG.lernen.sprache] + 'e Stimme gefunden. Installiere sie in den Systemeinstellungen unter Sprache.';
      };
      vtext(); REF.push(vtext);
      var tb = el('button', 'btn', 'Stimme testen'); tb.type = 'button';
      tb.addEventListener('click', function () { try { speechSynthesis.cancel(); say(LANGT[CFG.lernen.sprache], false); } catch (e) { toast('Vorlesen geht hier nicht'); } });
      tb.disabled = !nv; g5.appendChild(tb);
    }
    row(g5, 'Karten pro Prüfung', stepper('lernen.pruefung', 5, 50, 5, String), true);
    var eb = el('button', 'btn primary', 'Prüfung starten'); eb.type = 'button'; eb.addEventListener('click', startExam);
    g5.appendChild(eb);
};
}
})();
