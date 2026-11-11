# KarteiDeck: Platzhalter-Seite "Bald online". Wird von bauen.py in den Ordner vorab/ geschrieben.
# Der Ordner ist eigenständig: Er wird auf den Server gelegt, solange die App noch nicht online ist.
import html, re, datetime, shutil, pathlib

NAME = 'KarteiDeck'
TITLE = 'KarteiDeck – Karteikarten online lernen, bald online'
DESC = 'KarteiDeck öffnet bald: Karteikarten schreiben und mit dem Karteikasten nach Leitner lernen. Kostenlos, ohne Werbung, auch offline. Schau bald wieder vorbei.'
def _e(s): return html.escape(s, quote=True)

CSS = r'''/* KarteiDeck: Seite "Bald online". Eigene Datei, keine Fremdschriften, keine Inline-Stile. */
@font-face { font-family: "Patrick Hand"; src: url(patrick-hand.woff) format("woff"); font-weight: 400; font-style: normal; font-display: swap; }
:root { --desk: #c9a676; --desk2: #bf9b68; --bar: #1b2530; --bg: #e6ecf1; --panel: #f6f9fb; --ink: #14202e; --muted: #475a6b; --line: #b9c6d1; --accent: #1f45c4; --accent-ink: #fff;
  --grid: rgba(31, 69, 140, .08); --shadow: 0 14px 30px -16px rgba(20, 32, 46, .6); --note: #fff1a0; --card: #fbee9a; --card-ink: #2a2619; --red: #c2402f; --blue: #5b86c9;
  --slab: Rockwell, "Roboto Slab", "Courier New", monospace; --hand: "Patrick Hand", "Segoe Print", "Comic Sans MS", system-ui, sans-serif; --font: Georgia, "Iowan Old Style", "Palatino Linotype", serif; }
@media (prefers-color-scheme: dark) { :root { --desk: #4a3a28; --desk2: #43341f; --bar: #0b1118; --bg: #0f1922; --panel: #16232f; --ink: #e7eef5; --muted: #a3b3c1; --line: #2b3d4e; --accent: #8fb0ff; --accent-ink: #0b1118;
  --grid: rgba(143, 176, 255, .07); --shadow: 0 14px 30px -14px rgba(0, 0, 0, .8); } }
* { box-sizing: border-box; }
html { -webkit-text-size-adjust: 100%; }
body { margin: 0; min-height: 100vh; color: var(--ink); font: 1.08rem/1.65 var(--font); background-color: var(--desk);
  background-image: repeating-linear-gradient(90deg, rgba(0,0,0,.035) 0 2px, transparent 2px 9px, rgba(255,255,255,.04) 9px 10px, transparent 10px 23px); overflow-x: hidden; }
a { color: var(--accent); text-underline-offset: 3px; }
a:focus-visible, button:focus-visible { outline: 3px solid var(--accent); outline-offset: 3px; }
.skip { position: absolute; left: -9999px; top: 8px; background: var(--panel); color: var(--ink); padding: 6px 12px; border-radius: 6px; z-index: 10; }
.skip:focus { left: 8px; }

.bar { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 10px 18px; background: var(--bar); color: #f4efe6; box-shadow: 0 3px 0 rgba(0,0,0,.18); }
.brand { display: flex; align-items: center; gap: 10px; color: inherit; text-decoration: none; font: 700 1.25rem var(--slab); }
.brand img { display: block; }
.pill { font: 400 1.05rem var(--hand); padding: 3px 12px; border-radius: 999px; background: #fbee9a; color: #2a2619; border: 1.5px solid #2a2619; }

.stage { position: relative; max-width: 54rem; margin: 26px auto 0; padding: 0 14px 40px; }
.ring { position: absolute; right: 2%; top: -6px; width: 120px; height: 120px; border-radius: 50%; pointer-events: none; z-index: 0;
  background: radial-gradient(circle, transparent 52%, rgba(70,40,15,.22) 54%, rgba(70,40,15,.12) 60%, transparent 63%); transform: scale(1.1); }
.pencil { position: absolute; left: -26px; top: 150px; width: 170px; height: 16px; border-radius: 3px 8px 8px 3px; transform: rotate(-24deg); pointer-events: none; z-index: 2; box-shadow: 0 6px 8px -4px rgba(0,0,0,.4);
  background: linear-gradient(90deg, #e6b8a2 0 8%, #b9bec6 8% 14%, #2f6bd8 14% 88%, #f1dcb6 88% 94%, #2a2619 94%); }
.sheet { position: relative; z-index: 1; padding: 30px 30px 26px; background-color: var(--bg); border-radius: 4px; box-shadow: var(--shadow);
  background-image: linear-gradient(var(--grid) 1px, transparent 1px), linear-gradient(90deg, var(--grid) 1px, transparent 1px); background-size: 24px 24px; }

.hero { text-align: center; padding-top: 6px; }
.hero .logo { display: block; margin: 0 auto 4px; width: 110px; height: 110px; transition: transform .35s; }
.hero .logo:hover { transform: rotate(-6deg) scale(1.06); }
h1 { margin: 4px 0 0; font: 700 clamp(2.2rem, 7vw, 3.3rem)/1.1 var(--slab); letter-spacing: -.01em; }
.tag { margin: 6px 0 0; color: var(--muted); font: 400 1.2rem var(--hand); }

.note { position: relative; display: block; width: fit-content; max-width: 100%; margin: 30px auto 6px; padding: 36px 30px 6px; background: var(--note); color: #2a2619; border-radius: 3px; text-align: center;
  transform: rotate(-1.8deg); box-shadow: 0 12px 18px -12px rgba(0,0,0,.55), 0 1px 0 rgba(0,0,0,.08);
  background-image: repeating-linear-gradient(transparent 0 35px, rgba(91,134,201,.5) 35px 36px); }
.note::before { content: ""; position: absolute; left: 50%; top: -13px; width: 110px; height: 28px; margin-left: -55px; transform: rotate(2deg); background: rgba(194,64,47,.62);
  background-image: repeating-linear-gradient(90deg, transparent 0 8px, rgba(255,255,255,.22) 8px 16px); box-shadow: 0 1px 2px rgba(0,0,0,.2); }
.note p { margin: 0; position: relative; top: 4px; }
.note .big { font: 400 clamp(1.5rem, 4.8vw, 2.1rem)/36px var(--hand); }
.note .small { font: 400 1.2rem/36px var(--hand); }

.intro { max-width: 36rem; margin: 26px auto 0; text-align: center; }
.intro p { margin: 10px 0; }

.fun { display: grid; grid-template-columns: 1fr 1fr; gap: 22px; align-items: start; margin: 34px 0 6px; }
.fun h2 { margin: 0 0 8px; font: 400 1.3rem var(--hand); text-align: center; color: var(--muted); }
.fun .hint { margin: 8px 0 0; text-align: center; font-size: .92rem; color: var(--muted); }

.flip { display: block; width: 100%; padding: 0; border: 0; background: none; color: var(--card-ink); font: inherit; cursor: pointer; perspective: 900px; }
.flip .in { position: relative; display: block; min-height: 190px; transform-style: preserve-3d; transition: transform .6s; }
.flip .f { position: absolute; inset: 0; display: block; padding: 0 16px; border: 1.5px solid var(--card-ink); border-radius: 8px; background: var(--card); box-shadow: var(--shadow);
  backface-visibility: hidden; -webkit-backface-visibility: hidden; text-align: left;
  background-image: linear-gradient(var(--red), var(--red)), repeating-linear-gradient(transparent 0 27px, rgba(91,134,201,.6) 27px 28px); background-size: 100% 2px, 100% 100%; background-position: 0 54px, 0 0; background-repeat: no-repeat; }
.flip .b { transform: rotateY(180deg); }
.flip .k { display: block; position: relative; top: 4px; height: 56px; line-height: 56px; font: 400 1.15rem var(--hand); text-transform: uppercase; letter-spacing: .05em; }
.flip .t { display: block; position: relative; top: 4px; line-height: 28px; font: 400 1.2rem/28px var(--hand); }
.flip.on .in { transform: rotateY(180deg); }
@media (hover: hover) { .flip:hover .in { transform: rotateY(180deg); } }
.nojs .flip:focus .in { transform: rotateY(180deg); }

.boxes { position: relative; padding-top: 38px; }
.fach { display: grid; grid-template-columns: repeat(5, 1fr); gap: 6px; align-items: end; }
.fach span { display: block; text-align: center; padding: 22px 0 6px; border: 1.5px solid #2a2619; border-top-width: 5px; border-radius: 3px 3px 6px 6px; background: #d9b985; color: #2a2619; font: 400 .95rem var(--hand); box-shadow: inset 0 -10px 0 rgba(0,0,0,.08); }
.fach span:nth-child(2) { padding-top: 30px; } .fach span:nth-child(3) { padding-top: 38px; } .fach span:nth-child(4) { padding-top: 46px; } .fach span:nth-child(5) { padding-top: 54px; }
.wander { position: absolute; top: 4px; left: 3%; width: 14%; height: 36px; border: 1.5px solid #2a2619; border-radius: 4px; background: var(--card); box-shadow: 0 5px 8px -4px rgba(0,0,0,.5); animation: hop 10s ease-in-out infinite; }
.wander::before { content: ""; position: absolute; left: 5px; right: 5px; top: 10px; height: 2px; background: var(--red); box-shadow: 0 7px 0 var(--blue), 0 14px 0 var(--blue); }
@keyframes hop { 0%, 8% { left: 3%; top: 4px; } 20%, 28% { left: 23%; top: -4px; } 40%, 48% { left: 43%; top: 4px; } 60%, 68% { left: 63%; top: -4px; } 80%, 96% { left: 83%; top: 4px; } 100% { left: 3%; top: 4px; } }

.kommt { margin-top: 38px; }
.kommt h2 { margin: 0 0 14px; text-align: center; font: 400 1.8rem var(--hand); }
.cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; padding: 0; margin: 0; list-style: none; }
.cards li { --hd: 56px; padding: 0 12px 12px; border: 1.5px solid #2a2619; border-radius: 6px; background: var(--card); color: #2a2619; box-shadow: var(--shadow);
  background-image: linear-gradient(var(--red), var(--red)), repeating-linear-gradient(transparent 0 27px, rgba(91,134,201,.6) 27px 28px); background-size: 100% 2px, 100% 100%; background-position: 0 calc(var(--hd) - 2px), 0 0; background-repeat: no-repeat; }
.cards li:nth-child(1) { transform: rotate(-1.2deg); } .cards li:nth-child(2) { transform: rotate(.8deg); } .cards li:nth-child(3) { transform: rotate(-.6deg); } .cards li:nth-child(4) { transform: rotate(1deg); }
.cards h3 { margin: 0; position: relative; top: 4px; height: var(--hd); line-height: var(--hd); font: 400 1.25rem var(--hand); }
.cards p { margin: 0; position: relative; top: 4px; font: 400 1.08rem/28px var(--hand); }
.finePrint { margin: 22px auto 0; max-width: 34rem; text-align: center; color: var(--muted); font-size: .95rem; }
.fragen { font: 400 1.3rem var(--hand); }

footer { position: relative; z-index: 1; display: flex; flex-wrap: wrap; justify-content: center; gap: 4px 20px; margin-top: 26px; padding-top: 12px; border-top: 1.5px dashed var(--line); }
footer { gap: 12px 16px; border-top: 0; padding-top: 4px; }
footer a { display: inline-block; min-height: 44px; padding: 8px 20px 6px; border: 1.5px solid #2a2619; border-radius: 8px 8px 4px 4px; background: var(--card); color: #2a2619; text-decoration: none;
  font: 400 1.25rem/1.4 var(--hand); box-shadow: 0 8px 10px -8px rgba(0,0,0,.6); transition: transform .2s; }
footer a:nth-child(odd) { transform: rotate(-1.2deg); } footer a:nth-child(even) { transform: rotate(1deg); }
footer a:hover { transform: rotate(0) translateY(-2px); text-decoration: underline; text-underline-offset: 3px; }
footer a:focus-visible { outline-color: #fff; outline-offset: 3px; box-shadow: 0 0 0 5px #2a2619; }

/* Impressum und Datenschutz: Zettel */
.hero.slim { padding-top: 0; } .hero.slim h1 { font-size: clamp(2rem, 6vw, 2.8rem); }
.zettel { margin: 22px 0; padding: 0 20px 14px; border: 1.5px solid #2a2619; border-radius: 6px; background-color: var(--card); color: #2a2619; box-shadow: var(--shadow);
  background-image: linear-gradient(var(--red), var(--red)); background-size: 100% 2px; background-position: 0 52px; background-repeat: no-repeat; }
.zettel:nth-of-type(odd) { transform: rotate(-.35deg); } .zettel:nth-of-type(even) { transform: rotate(.3deg); }
.zettel h2 { margin: 0 0 8px; height: 54px; line-height: 54px; font: 400 1.5rem/54px var(--hand); }
.zettel p { margin: 0 0 10px; font-size: 1.05rem; line-height: 1.6; }
.zettel a { color: #1f45c4; }
.miss { background: #ffd9d4; color: #7a1c10; padding: 0 5px; border-radius: 3px; font-weight: 700; }
.back { margin: 26px 0 0; text-align: center; }
.btn { display: inline-block; padding: 6px 22px; border: 1.5px solid var(--ink); border-radius: 8px; background: var(--panel); color: var(--ink); text-decoration: none; font: 400 1.25rem var(--hand); }
.btn:hover { background: var(--ink); color: var(--bg); }
@media (max-width: 760px) { .fun { grid-template-columns: 1fr; } .cards { grid-template-columns: 1fr 1fr; } .sheet { padding: 22px 16px 20px; } .pencil, .ring { display: none; } }
@media (max-width: 440px) { .zettel { transform: none !important; } .cards { grid-template-columns: 1fr; } .cards li { transform: none !important; } .pill { font-size: .72rem; padding: 3px 9px; } .brand { font-size: 1.1rem; } .note { padding: 36px 16px 6px; } }
/* Kartendrehen und wandernde Karte laufen auch bei "Bewegung reduzieren" (Handys haben das oft an). Beides ist klein und gedämpft. */
@media (prefers-reduced-motion: reduce) { footer a { transition: none; } .hero .logo { transition: none; } }
'''

JS = '''/* KarteiDeck: Seite "Bald online". Nur das Umdrehen der Karte. */
(function () {
  var b = document.getElementById('flip');
  if (!b) return;
  document.documentElement.classList.remove('nojs');
  b.addEventListener('click', function () {
    var on = b.classList.toggle('on');
    b.setAttribute('aria-pressed', on ? 'true' : 'false');
  });
})();
'''

HTACCESS = '''# KarteiDeck: Ordner "Bald online" (Apache). Bewusst einfach gehalten: nur Standard-Anweisungen, jede in IfModule.
# Lade die Datei mit Rechten 644 hoch. Bei 403/500 zuerst umbenennen (.htaccess_aus) und das Error-Log lesen.
DirectoryIndex index.html
Options -Indexes
ServerSignature Off

<IfModule mod_headers.c>
  Header always set X-Content-Type-Options "nosniff"
  Header always set Referrer-Policy "strict-origin-when-cross-origin"
  Header always set Permissions-Policy "camera=(), microphone=(), geolocation=(), payment=(), usb=()"
  Header always set Cross-Origin-Opener-Policy "same-origin"
  Header always set Content-Security-Policy "default-src 'none'; script-src 'self'; style-src 'self'; font-src 'self'; img-src 'self' data:; base-uri 'none'; form-action 'none'; frame-ancestors 'none'; object-src 'none'"
  # Nach dem Einrichten von HTTPS einschalten:
  # Header always set Strict-Transport-Security "max-age=31536000; includeSubDomains"
</IfModule>

# Nie ausliefern: versteckte Dateien (.git, .env), Backups, Quelltexte, Logs, Schlüssel
<FilesMatch "^\\.|\\.(md|py|bak|old|log|sql|zip|key|lock|ini|sh)$">
  <IfModule mod_authz_core.c>
    Require all denied
  </IfModule>
  <IfModule !mod_authz_core.c>
    Order allow,deny
    Deny from all
  </IfModule>
</FilesMatch>
'''

def _head(title, desc, robots, url, slug, css='vorab.css', og=True):
    h = ['<meta charset="utf-8">', '<meta name="viewport" content="width=device-width, initial-scale=1">',
         '<title>%s</title>' % _e(title), '<meta name="description" content="%s">' % _e(desc),
         '<meta name="robots" content="%s">' % robots, '<meta name="theme-color" content="#c9a676">',
         '<link rel="icon" href="icon.svg" type="image/svg+xml">', '<link rel="alternate icon" href="favicon.ico" sizes="48x48">',
         '<link rel="apple-touch-icon" href="apple-touch-icon.png">'] + (['<link rel="preload" href="patrick-hand.woff" as="font" type="font/woff" crossorigin>'] if css == 'vorab.css' else []) + ['<link rel="stylesheet" href="%s">' % css]
    if og:
        h += ['<meta property="og:type" content="website">', '<meta property="og:site_name" content="%s">' % NAME, '<meta property="og:locale" content="de_DE">',
              '<meta property="og:title" content="%s">' % _e(title), '<meta property="og:description" content="%s">' % _e(desc), '<meta name="twitter:card" content="summary_large_image">']
        if url:
            h += ['<link rel="canonical" href="%s/">' % url, '<meta property="og:url" content="%s/">' % url,
                  '<meta property="og:image" content="%s/vorschau-bald.png">' % url, '<meta property="og:image:width" content="1200">', '<meta property="og:image:height" content="630">',
                  '<meta property="og:image:alt" content="KarteiDeck: Bald online">', '<meta name="twitter:image" content="%s/vorschau-bald.png">' % url]
    return '\n'.join(h)

def index_html(url, mail=''):
    mail = (mail or '').strip()
    ld = {'@context': 'https://schema.org', '@type': 'WebSite', 'name': NAME, 'inLanguage': 'de', 'description': DESC}
    if url: ld['url'] = url + '/'
    import json
    ldj = json.dumps(ld, ensure_ascii=False).replace('</', '<\\/')
    cards = [('Karten schreiben', 'Vorderseite, Rückseite, fertig. Mit Bildern und Lückentext.'),
             ('Karteikasten', 'Wiederholen nach dem Leitner-System: Was sitzt, rückt ein Fach weiter.'),
             ('Mitbringen', 'Karten aus Anki, Quizlet oder CSV übernehmen.'),
             ('Kostenlos', 'Ohne Werbung und ohne Zwang zum Konto. Offline lernen geht auch.')]
    li = ''.join('<li><h3>%s</h3><p>%s</p></li>' % (_e(a), _e(b)) for a, b in cards)
    return ('<!DOCTYPE html>\n<html lang="de">\n<head>\n' + _head(TITLE, DESC, 'index, follow, max-image-preview:large', url, '') +
      '\n<script type="application/ld+json">' + ldj + '</script>\n</head>\n<body class="nojs">\n'
      '<a class="skip" href="#inhalt">Zum Inhalt</a>\n'
      '<div class="bar"><a class="brand" href="./" aria-label="KarteiDeck, Startseite"><img src="logo.svg" width="36" height="36" alt=""><span>KarteiDeck</span></a><span class="pill">Bald online</span></div>\n'
      '<div class="stage">\n<div class="ring" aria-hidden="true"></div><div class="pencil" aria-hidden="true"></div>\n'
      '<main class="sheet" id="inhalt">\n'
      '<header class="hero"><img class="logo" src="logo.svg" width="110" height="110" alt="Logo von KarteiDeck: drei Karteikarten"><h1>KarteiDeck</h1><p class="tag">Karteikarten online lernen</p></header>\n'
      '<div class="note"><p class="big">Noch nicht online. Aber bald!</p><p class="small">Wir räumen noch den Schreibtisch auf.</p></div>\n'
      '<section class="intro"><p>Hier öffnet bald KarteiDeck. Du schreibst deine Karteikarten und lernst sie im Karteikasten, ganz ohne Werbung und kostenlos.</p>'
      '<p>Ein festes Datum haben wir noch nicht. Schau einfach in den nächsten Tagen wieder vorbei.</p>' + ('<p class="fragen">Fragen? Schreib an <a href="mailto:%s">%s</a></p>' % (_e(mail), _e(mail)) if mail else '') + '</section>\n'
      '<section class="fun" aria-label="Kleine Spielereien">\n'
      '<div><h2>Eine Frage, eine Karte</h2><button type="button" class="flip" id="flip" aria-pressed="false" aria-label="Karte umdrehen"><span class="in">'
      '<span class="f"><span class="k">Frage</span><span class="t">Wann geht KarteiDeck online?</span></span>'
      '<span class="f b"><span class="k">Antwort</span><span class="t">Bald. Ein genaues Datum folgt, sobald es steht.' + (' Fragen? ' + _e(mail) if mail else '') + '</span></span></span></button>'
      '<p class="hint">Tippen oder mit der Maus darüberfahren zum Umdrehen.</p></div>\n'
      '<div><h2>So wandert eine Karte</h2><div class="boxes" role="img" aria-label="Eine Karteikarte wandert vom ersten bis zum fünften Fach des Karteikastens"><div class="wander"></div>'
      '<div class="fach"><span>Fach 1</span><span>Fach 2</span><span>Fach 3</span><span>Fach 4</span><span>Fach 5</span></div></div>'
      '<p class="hint">Je besser du eine Karte kennst, desto weiter rückt sie.</p></div>\n</section>\n'
      '<section class="kommt" aria-labelledby="kommt"><h2 id="kommt">Das kommt</h2><ul class="cards">' + li + '</ul>'
      '<p class="finePrint">Alles hier beschreibt, was KarteiDeck zum Start können soll. Heute kannst du es noch nicht benutzen.</p></section>\n'
      '</main>\n'
      '<footer><a href="impressum.html">Impressum</a><a href="datenschutz.html">Datenschutz</a></footer>\n</div>\n'
      '<script src="vorab.js"></script>\n</body>\n</html>\n')

def _legal_page(slug, title, h1, sub, sections, url):
    cards = ''.join('<section class="zettel"><h2>%s</h2>%s</section>\n' % (h, body) for h, body in sections)
    return ('<!DOCTYPE html>\n<html lang="de">\n<head>\n' + _head(title, title, 'noindex, follow', url, slug, css='vorab.css', og=False) + '\n</head>\n<body class="nojs legal">\n'
      '<a class="skip" href="#inhalt">Zum Inhalt</a>\n'
      '<div class="bar"><a class="brand" href="./" aria-label="KarteiDeck, Startseite"><img src="logo.svg" width="36" height="36" alt=""><span>KarteiDeck</span></a><span class="pill">Bald online</span></div>\n'
      '<div class="stage">\n<div class="ring" aria-hidden="true"></div>\n<main class="sheet" id="inhalt">\n'
      '<header class="hero slim"><h1>%s</h1><p class="tag">%s</p></header>\n%s'
      '</main>\n'
      '<footer><a href="./">Startseite</a><a href="impressum.html">Impressum</a><a href="datenschutz.html">Datenschutz</a></footer>\n</div>\n</body>\n</html>\n') % (h1, sub, cards)

def _fill(a):
    def f(k):
        v = a.get(k, '').strip()
        return _e(v) if v else '<span class="miss">[Angabe fehlt]</span>'
    return f

def _imp(a):
    f = _fill(a)
    return [('Anbieter', '<p>%s<br>%s<br>%s</p>' % (f('name'), f('strasse'), f('ort'))),
            ('Kontakt', '<p>E-Mail: %s</p>' % f('email'))]

def _ds(a):
    f = _fill(a)
    return [('Verantwortlich', '<p>%s, %s, %s<br>E-Mail: %s</p>' % (f('name'), f('strasse'), f('ort'), f('email'))),
      ('Aufruf der Seite', '<p>Beim Aufruf verarbeitet der Hoster %s technisch nötige Daten (IP-Adresse, Zeit, abgerufene Datei) in Server-Logs, um die Seite auszuliefern und sicher zu betreiben. Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO.</p>' % f('hoster')),
      ('Was es nicht gibt', '<p>Diese Seite hat kein Formular, kein Konto, kein Tracking, keine Werbung und setzt keine Cookies. Es werden keine Schriften oder Skripte von anderen Servern geladen.</p>'),
      ('Deine Rechte', '<p>Du kannst Auskunft, Berichtigung, Löschung und Einschränkung der Verarbeitung verlangen und der Verarbeitung widersprechen. Du kannst dich außerdem bei einer Datenschutz-Aufsichtsbehörde beschweren. Schreib uns dafür an die oben genannte E-Mail-Adresse.</p>')]

def build(root, src, url, anbieter):
    """root: Projektordner, src: quelle/. Schreibt root/vorab/."""
    out = pathlib.Path(root) / 'vorab'
    out.mkdir(exist_ok=True)
    (out / 'index.html').write_text(index_html(url, anbieter.get('email', '')), encoding='utf8')
    (out / 'vorab.css').write_text(CSS, encoding='utf8')
    (out / 'vorab.js').write_text(JS, encoding='utf8')
    (out / '.htaccess').write_text(HTACCESS, encoding='utf8')
    (out / 'impressum.html').write_text(_legal_page('impressum', 'Impressum – KarteiDeck', 'Impressum', 'Angaben nach § 5 DDG', _imp(anbieter), url), encoding='utf8')
    (out / 'datenschutz.html').write_text(_legal_page('datenschutz', 'Datenschutz – KarteiDeck', 'Datenschutz', 'Stand: %s' % datetime.date.today().strftime('%d.%m.%Y'), _ds(anbieter), url), encoding='utf8')
    for f in ['patrick-hand.woff', 'schrift-lizenz.txt']:
        shutil.copyfile(pathlib.Path(src) / f, out / f)
    for f in ['logo.svg', 'icon.svg', 'favicon.ico', 'apple-touch-icon.png']:
        shutil.copyfile(pathlib.Path(root) / f, out / f)
    if (pathlib.Path(root) / 'vorschau-bald.png').exists():
        shutil.copyfile(pathlib.Path(root) / 'vorschau-bald.png', out / 'vorschau-bald.png')
    (out / 'robots.txt').write_text('User-agent: *\nAllow: /\n' + ('Sitemap: %s/sitemap.xml\n' % url if url else ''), encoding='utf8')
    if url:
        d = datetime.date.today().isoformat()
        (out / 'sitemap.xml').write_text('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>%s/</loc><lastmod>%s</lastmod></url>\n</urlset>\n' % (url, d), encoding='utf8')
    elif (out / 'sitemap.xml').exists():
        (out / 'sitemap.xml').unlink()
    return len(list(out.iterdir()))
