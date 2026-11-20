/* KarteiDeck: Kontaktformular der Seite kontakt.html. Gleicher Ablauf wie im Dialog der App:
   Sitzung und Formular-Token holen, Rechenaufgabe lösen (ohne Dienst von Dritten), dann senden. */
(function () {
  var f = document.getElementById('kf');
  if (!f) return;
  var api = f.getAttribute('data-api'), csrf = '', ft = '';
  function $(id) { return document.getElementById(id); }
  var EN = f.getAttribute('data-lang') === 'en', TR = {"Keine Verbindung zum Server.": "No connection to the server.", "Senden": "Send", "Prüfung läuft": "Checking", "Das hat nicht geklappt.": "That did not work.", "Dein Browser kann die Prüfung nicht ausführen. Bitte nutze https und einen aktuellen Browser.": "Your browser cannot run the check. Please use https and a current browser.", "Danke, die Nachricht ist angekommen.": "Thanks, your message has arrived.", "Bitte Name, gültige E-Mail und eine Nachricht mit mindestens 10 Zeichen eingeben.": "Please enter a name, a valid email and a message of at least 10 characters.", "Bitte bestätige zuerst deine E-Mail-Adresse. Wir haben dir einen Link geschickt.": "Please confirm your email address first. We sent you a link.", "Bitte eine gültige E-Mail-Adresse eingeben.": "Please enter a valid email address.", "Bitte höchstens zwei Links in die Nachricht schreiben.": "Please include at most two links in the message.", "Bitte versuche es in ein paar Sekunden noch einmal.": "Please try again in a few seconds.", "Das Kontaktformular ist gerade nicht eingerichtet.": "The contact form is not set up right now.", "Die Prüfung im Browser hat nicht geklappt. Bitte lade die Seite neu und versuche es noch einmal.": "The check in your browser failed. Please reload the page and try again.", "Zu viele Versuche. Bitte warte einen Moment.": "Too many attempts. Please wait a moment."};
  function t(x) { return EN && TR[x] ? TR[x] : x; }
  function url(a) { return api + '?a=' + a; }
  function fail(x) { $('kerr').textContent = t(x); }
  async function probe() {
    try {
      var r = await fetch(url('csrf'), { credentials: 'same-origin', cache: 'no-store', referrerPolicy: 'no-referrer' });
      var j = await r.json();
      if (j && j.ok) { csrf = j.csrf; ft = j.ft || ''; return true; }
    } catch (e) {}
    return false;
  }
  async function call(a, body) {
    var opt = { credentials: 'same-origin', cache: 'no-store', referrerPolicy: 'no-referrer', headers: {} };
    if (body !== undefined) { opt.method = 'POST'; opt.headers['Content-Type'] = 'application/json'; opt.headers['X-CSRF-Token'] = csrf; opt.body = JSON.stringify(body); }
    try { var r = await fetch(url(a), opt); var j = await r.json(); j.status = r.status; return j; }
    catch (e) { return { ok: false, status: 0, err: 'Keine Verbindung zum Server.' }; }
  }
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
  probe();
  f.addEventListener('submit', async function (e) {
    e.preventDefault();
    var btn = $('ksend'); btn.disabled = true; fail('');
    function done(msg) { btn.disabled = false; btn.textContent = t('Senden'); if (msg) fail(msg); }
    if (!csrf && !(await probe())) return done('Keine Verbindung zum Server.');
    var body = { name: $('kname').value, email: $('kmail').value, message: $('kmsg').value, website: $('khp').value, ft: ft };
    btn.textContent = t('Prüfung läuft');
    var ch = await call('ct-challenge');
    if (!ch.ok) return done(ch.err || 'Das hat nicht geklappt.');
    try { body.pow = { c: ch.c, n: await powSolve(ch.c) }; }
    catch (x) { return done('Dein Browser kann die Prüfung nicht ausführen. Bitte nutze https und einen aktuellen Browser.'); }
    var j = await call('contact', body);
    if (!j.ok) { if (j.status === 400 || j.status === 403) await probe(); return done(j.err || 'Das hat nicht geklappt.'); }
    f.hidden = true; $('kdone').hidden = false; $('kdone').textContent = t(j.msg || 'Danke, die Nachricht ist angekommen.');
  });
})();
