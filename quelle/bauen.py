# Baut aus vorlage.html + kartenbox.css + kartenbox.js die App ../karteikarten.html und erzeugt ../version.json mit Prüfsummen.
# Version und Änderungstext stehen in quelle/version.json. Nach dem Bauen alles aus dem Ordner ins Repo laden.
import hashlib, json, pathlib, re
d = pathlib.Path(__file__).parent
root = d.parent
ver = json.loads((d/'version.json').read_text(encoding='utf8'))
h = (d/'vorlage.html').read_text(encoding='utf8')
css = (d/'kartenbox.css').read_text(encoding='utf8')
js = (d/'kartenbox.js').read_text(encoding='utf8')
assert '</script' not in js.lower() and '</style' not in css.lower()
assert js.count("'__VERSION__'") == 1
assert js.count('null /*EN_DICT*/') == 1
def _endict():   # Muster: längere zuerst, damit die genaueren gewinnen
    e = json.loads((d/'en.json').read_text(encoding='utf8'))
    e['pat'].sort(key=lambda p: -len(p[0]))
    return e
_ENJ = json.dumps(_endict(), ensure_ascii=False, separators=(',', ':')).replace('</', '<\\/')
assert js.count('null /*EN_SRC*/') == 1
js = js.replace('/*NEUV*/', ver['version'])
js = js.replace("'__VERSION__'", "'" + ver['version'] + "'")
# Zusatzfunktionen: liegen als api/inc/pro.js auf dem Server und werden nur nach der Anmeldung ausgeliefert.
# In die HTML kommen sie nur im Testmodus (konto.test) oder ohne Konto-System (keine api), sonst gäbe es dort keine Anmeldung.
pro = (d/'pro.js').read_text(encoding='utf8')
(root/'api'/'inc').mkdir(parents=True, exist_ok=True)
(root/'api'/'inc'/'pro.js').write_text(pro, encoding='utf8')
_es = (root/'einstellungen.js').read_text(encoding='utf8') if (root/'einstellungen.js').exists() else ''
_api = re.search(r'\bapi\s*:\s*"([^"]*)"', _es)
_embed = bool(re.search(r'\btest\s*:\s*true', _es)) or not (_api and _api.group(1))
assert js.count('null /*PRO_EMBED*/') == 1
js = js.replace('null /*PRO_EMBED*/', json.dumps(pro).replace('</', '<\\/') if _embed else 'null')
print('Zusatzfunktionen:', 'in der HTML eingebettet (Test/ohne Konto)' if _embed else 'nur auf dem Server (api/inc/pro.js)')
# SEO: Adresse aus einstellungen.js (seite.url). Ohne Adresse entfallen Canonical, Vorschaubild, robots.txt-Sitemap und sitemap.xml.
_url = re.search(r'\bseite\s*:\s*\{[^}]*?\burl\s*:\s*"([^"]*)"', _es)
_url = (_url.group(1).strip().rstrip('/') if _url else '')
_ld = {'@context': 'https://schema.org', '@type': 'WebApplication', 'name': 'KarteiDeck', 'applicationCategory': 'EducationalApplication', 'operatingSystem': 'Alle Geräte mit Browser', 'inLanguage': 'de',
       'description': 'Karteikarten online lernen und erstellen: Karteikasten nach Leitner-System, Lückentext, Prüfung und Fortschritt. Kostenlos, ohne Werbung, auch offline.',
       'featureList': ['Karteikarten erstellen und bearbeiten', 'Karteikasten nach Leitner-System', 'Lückentext', 'Prüfungsmodus', 'Fortschritt nach Tag, Monat und Jahr', 'Läuft offline'],
       'offers': {'@type': 'Offer', 'price': '0', 'priceCurrency': 'EUR'}}
_seo = ''
import sys; sys.path.insert(0, str(d)); import seiten
if _url:
    _ld['url'] = _url + '/'
    _seo = ('<link rel="canonical" href="%s/">\n<meta property="og:url" content="%s/">\n<meta property="og:image" content="%s/vorschau.png">\n<meta property="og:image:width" content="1200">\n<meta property="og:image:height" content="630">\n'
            '<meta property="og:image:alt" content="KarteiDeck: Karteikarten online lernen">\n<meta name="twitter:image" content="%s/vorschau.png">\n'
            '<link rel="alternate" hreflang="de" href="%s/">\n<link rel="alternate" hreflang="en" href="%s/en/">\n<link rel="alternate" hreflang="x-default" href="%s/">\n') % (_url, _url, _url, _url, _url, _url, _url)
    import seiten
    (root/'sitemap.xml').write_text(seiten.sitemap(_url), encoding='utf8')
    # llms.txt: kurze, saubere Übersicht für KI-Suchen und Antwortsysteme (Fakten, keine Werbung)
    _l = ['# KarteiDeck', '', '> Karteikarten online lernen und selbst erstellen. Kostenlos, ohne Werbung und ohne Anmeldung nutzbar, läuft auch offline im Browser. Die Karten bleiben im Browser. Lernen nach dem Leitner-System (Karteikasten mit Fächern), Lückentext, Antwort tippen, Prüfung mit Note, Import aus CSV, Anki und Quizlet. Mit kostenlosem Konto lassen sich Karten zwischen Geräten abgleichen.', '', '## Seiten', '', '- [KarteiDeck – App und Startseite](%s/): Karteikarten schreiben und lernen' % _url]
    _l += ['- [%s](%s/%s.html): %s' % (_p['nav'], _url, _p['slug'], _p['desc']) for _p in seiten.PAGES + [seiten.HILFE]]
    import seiten_en
    _l += ['- [Was ist neu](%s/neu.html): Neuerungen aller Versionen' % _url]
    _l += ['', '## English', '', '- [KarteiDeck – English home](%s/en/): create and study flashcards online, free, offline, no signup' % _url]
    _l += ['- [%s](%s/en/%s.html): %s' % (_p['nav'], _url, seiten_en.SLUG[_p['de']], _p['desc']) for _p in seiten_en.PAGES]
    _l += ['', '## Gut zu wissen', '', '- Anbieter und Kontakt: siehe [Impressum](%s/impressum.html)' % _url, '- Datenschutz: [Datenschutzerklärung](%s/datenschutz.html)' % _url, '- Quellcode (MIT-Lizenz): https://github.com/Exulizer/Karteikarten', '']
    (root/'llms.txt').write_text('\n'.join(_l), encoding='utf8')
import shutil; shutil.copyfile(d/'kontakt.js', root/'kontakt.js')
(root/'robots.txt').write_text('User-agent: *\nAllow: /\nDisallow: /api/\n' + ('Sitemap: %s/sitemap.xml\n' % _url if _url else ''), encoding='utf8')
_seo += '<script type="application/ld+json">' + json.dumps(_ld, ensure_ascii=False).replace('</', '<\\/') + '</script>'
def _anb(k):
    m = re.search(r'\banbieter\s*:\s*\{(.*?)\n\s*\}', _es, re.S)
    v = re.search(r'\b' + k + r'\s*:\s*"([^"]*)"', m.group(1)) if m else None
    return v.group(1) if v else ''
_konto_on = bool(re.search(r'\bapi\s*:\s*"[^"]+"', _es))
_anbd = {k: _anb(k) for k in ['name', 'strasse', 'ort', 'email', 'hoster']}
_apiurl = (re.search(r'\bapi\s*:\s*"([^"]+)"', _es) or [None, ''])[1]
import seiten_en
_kt_en = seiten_en.kontakt(_apiurl, _anbd.get('email', '')) if (_konto_on and _apiurl) else None
(root/'en').mkdir(exist_ok=True)
_n_en, _miss = seiten_en.build(root, h, _url, _anbd, _konto_on, _apiurl, seiten, _kt_en)
print('Englische Seiten:', _n_en, 'Dateien in en/')
assert not _miss, 'Englische Rechtstexte unvollständig: %s' % _miss[:5]
print('Seiten:', seiten.build_pages(root, h, _url, {k: _anb(k) for k in ['name', 'strasse', 'ort', 'email', 'hoster']}, _konto_on, (re.search(r'\bapi\s*:\s*"([^"]+)"', _es) or [None, ''])[1]), 'Dateien (Impressum, Datenschutz, Themenseiten)')
import vorab
print('Bald-online-Seite:', vorab.build(root, d, _url, {k: _anb(k) for k in ['name', 'strasse', 'ort', 'email', 'hoster']}), 'Dateien in vorab/')
# Online-Version (seite.url gesetzt): Die Hilfe der App entfällt, ihre Inhalte stehen als FAQ auf den Themenseiten (seiten.FAQ).
# Die lokale Datei ohne Adresse behält die Hilfe, dort gibt es keine Themenseiten.
if _url:
    _t0 = len(h)
    h = re.sub(r'[ \t]*<button class="tab"[^>]*data-view="help".*?</button>\n?', '', h, count=1, flags=re.S)
    h = re.sub(r'[ \t]*<!-- Hilfe -->\n\s*<section class="view" id="view-help">.*?</section>\n?', '', h, count=1, flags=re.S)
    assert 'view-help' not in h and 'data-view="help"' not in h, 'Hilfe konnte nicht entfernt werden'
    _f = '<button class="flink" id="ftHome" type="button">Startseite</button>\n'
    assert _f in h
    h = h.replace(_f, _f + '  <a class="flink" id="ftHilfe" href="hilfe.html">Hilfe</a>\n  <a class="flink" id="ftNeu" href="neu.html">Was ist neu</a>\n', 1)
    h = h.replace('<script src="karteikarten.js"></script>\n', '', 1)   # lokale Sicherungsdatei gibt es online nicht (sonst 404 in der Konsole)
    print('Online-Version: Hilfe entfernt (%d Zeichen)' % (_t0 - len(h)))
assert '<!--SEO-->' in h
h = h.replace('<!--SEO-->', _seo)
h = h.replace('content="__VERSION__"', 'content="' + ver['version'] + '"')
print('SEO: Adresse', _url or 'FEHLT (seite.url in einstellungen.js eintragen)')
# Verkleinern: Quellen in quelle/ bleiben lesbar, nur die gebaute Datei wird kleiner. Braucht esbuild (npm i -g esbuild). Fehlt es, bleibt der Build unverkleinert.
import shutil, subprocess
def _esb(code, kind):
    exe = shutil.which('esbuild') or next((x for x in ['/opt/npm-tools/node_modules/.bin/esbuild'] if pathlib.Path(x).exists()), None)
    if not exe: return code
    a = [exe, '--minify', '--loader=' + kind, '--legal-comments=none'] + (['--target=es2019'] if kind == 'js' else [])
    r = subprocess.run(a, input=code, capture_output=True, text=True, encoding='utf8')
    if r.returncode: print('Verkleinern von', kind, 'fehlgeschlagen:', r.stderr[:300]); return code
    return r.stdout.rstrip('\n') + '\n'
def _mini_html(t):   # Nur Kommentare und Einrückung, Inhalt von script, style, pre, textarea bleibt unberührt
    keep = []
    def hold(m): keep.append(m.group(0)); return '\x00%d\x00' % (len(keep) - 1)
    t = re.sub(r'<(script|style|pre|textarea)\b.*?</\1>', hold, t, flags=re.S | re.I)
    t = re.sub(r'<!--(?!\[if).*?-->', '', t, flags=re.S)
    t = re.sub(r'\n[ \t]+', '\n', t); t = re.sub(r'\n{2,}', '\n', t)
    return re.sub(r'\x00(\d+)\x00', lambda m: keep[int(m.group(1))], t)
_ext = bool(_url) and not _embed   # online: Skript als eigene Datei, damit die CSP ohne 'unsafe-inline' für Skripte auskommt
if _ext:   # Englisch-Wörterbuch als eigene Datei, nur für Englisch geladen
    _enjs = 'window.KB_EN=' + _ENJ + ';\n'
    (root/'en.js').write_text(_enjs, encoding='utf8')
    js = js.replace('null /*EN_SRC*/', "'en.js?v=" + hashlib.sha256(_enjs.encode('utf8')).hexdigest()[:10] + "'")
    js = js.replace('null /*EN_DICT*/', 'null')
else:
    js = js.replace('null /*EN_DICT*/', _ENJ)
_n0 = len(css) + len(js)
css, js = _esb(css, 'css'), _esb(js, 'js')
h = h.replace('<link rel="stylesheet" href="kartenbox.css">', '<style>\n'+css+'</style>')
if _ext:
    (root/'app.js').write_text(js, encoding='utf8')
    _v = hashlib.sha256(js.encode('utf8')).hexdigest()[:10]
    h = h.replace('<script src="einstellungen.js"></script>\n', '', 1)
    h = h.replace('<script src="kartenbox.js"></script>', '<script src="einstellungen.js"></script>\n<script src="app.js?v=%s"></script>' % _v)   # beide am Seitenende: blockieren den ersten Aufbau nicht, Reihenfolge bleibt (defer war im normalen Browser messbar schlechter)
    h = h.replace('</head>', '<link rel="preload" href="app.js?v=%s" as="script">\n</head>' % _v, 1)   # Laden beginnt mit dem HTML, nicht erst am Seitenende (schnellerer Start)
else:
    h = h.replace('<script src="kartenbox.js"></script>', '<script>\n'+js+'</script>')
h = _mini_html(h)
if _ext: assert not re.search(r'<script(?![^>]*\b(src=|type="application/ld\+json"))', h), 'Inline-Skript gefunden, die CSP würde es blocken'
print('Verkleinert: CSS+JS', _n0 // 1024, 'KB ->', (len(css) + len(js)) // 1024, 'KB')
(root/'karteikarten.html').write_text(h, encoding='utf8')
# Dateien, die ein Update ersetzen darf. Nutzerdaten (karteikarten.json, karteikarten.js, einstellungen.js) gehören nie dazu.
files = []
for name in ['karteikarten.html', 'sw.js', 'manifest.webmanifest', 'icon.svg', 'icon-192.png', 'icon-512.png']:
    p = root/name
    if not p.exists():
        continue
    b = p.read_bytes()
    files.append({'pfad': name, 'sha256': hashlib.sha256(b).hexdigest(), 'groesse': len(b), 'optional': name != 'karteikarten.html'})
out = {'version': ver['version'], 'hinweis': ver.get('hinweis', ''), 'files': files}
(root/'version.json').write_text(json.dumps(out, ensure_ascii=False, indent=2) + '\n', encoding='utf8')
import re
es = (root/'einstellungen.js').read_text(encoding='utf8') if (root/'einstellungen.js').exists() else ''
leer = [k for k in ['name', 'strasse', 'ort', 'email', 'hoster'] if not re.search(r'\b' + k + r':\s*"[^"]+"', es)]
if leer:
    print('ACHTUNG: Impressum/Datenschutz unvollständig, in einstellungen.js unter anbieter fehlt:', ', '.join(leer))
if re.search(r'\btest:\s*true', es):
    print('ACHTUNG: konto.test steht auf true (Test-Konto im Browser). Vor dem Livegang in einstellungen.js auf false setzen.')
print('gebaut:', ver['version'], [f['pfad'] for f in files])
