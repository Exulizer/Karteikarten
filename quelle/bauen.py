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
       'description': 'Karteikarten online lernen und erstellen: Karteikasten nach Leitner-System, Lückentext, Prüfung und Statistik. Kostenlos, ohne Werbung, auch offline.',
       'featureList': ['Karteikarten erstellen und bearbeiten', 'Karteikasten nach Leitner-System', 'Lückentext', 'Prüfungsmodus', 'Lernstatistik', 'Läuft offline'],
       'offers': {'@type': 'Offer', 'price': '0', 'priceCurrency': 'EUR'}}
_seo = ''
import sys; sys.path.insert(0, str(d)); import seiten
if _url:
    _ld['url'] = _url + '/'
    _seo = ('<link rel="canonical" href="%s/">\n<meta property="og:url" content="%s/">\n<meta property="og:image" content="%s/vorschau.png">\n<meta property="og:image:width" content="1200">\n<meta property="og:image:height" content="630">\n'
            '<meta property="og:image:alt" content="KarteiDeck: Karteikarten online lernen">\n<meta name="twitter:image" content="%s/vorschau.png">\n') % (_url, _url, _url, _url)
    import seiten
    (root/'sitemap.xml').write_text(seiten.sitemap(_url), encoding='utf8')
import shutil; shutil.copyfile(d/'kontakt.js', root/'kontakt.js')
(root/'robots.txt').write_text('User-agent: *\nAllow: /\nDisallow: /api/\n' + ('Sitemap: %s/sitemap.xml\n' % _url if _url else ''), encoding='utf8')
_seo += '<script type="application/ld+json">' + json.dumps(_ld, ensure_ascii=False).replace('</', '<\\/') + '</script>'
def _anb(k):
    m = re.search(r'\banbieter\s*:\s*\{(.*?)\n\s*\}', _es, re.S)
    v = re.search(r'\b' + k + r'\s*:\s*"([^"]*)"', m.group(1)) if m else None
    return v.group(1) if v else ''
_konto_on = bool(re.search(r'\bapi\s*:\s*"[^"]+"', _es))
print('Seiten:', seiten.build_pages(root, h, _url, {k: _anb(k) for k in ['name', 'strasse', 'ort', 'email', 'hoster']}, _konto_on, (re.search(r'\bapi\s*:\s*"([^"]+)"', _es) or [None, ''])[1]), 'Dateien (Impressum, Datenschutz, Themenseiten)')
import vorab
print('Bald-online-Seite:', vorab.build(root, d, _url, {k: _anb(k) for k in ['name', 'strasse', 'ort', 'email', 'hoster']}), 'Dateien in vorab/')
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
_n0 = len(css) + len(js)
css, js = _esb(css, 'css'), _esb(js, 'js')
h = h.replace('<link rel="stylesheet" href="kartenbox.css">', '<style>\n'+css+'</style>')
h = h.replace('<script src="kartenbox.js"></script>', '<script>\n'+js+'</script>')
h = _mini_html(h)
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
