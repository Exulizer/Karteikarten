# Baut aus vorlage.html + kartenbox.css + kartenbox.js die App ../karteikarten.html und erzeugt ../version.json mit Prüfsummen.
# Version und Änderungstext stehen in quelle/version.json. Nach dem Bauen alles aus dem Ordner ins Repo laden.
import hashlib, json, pathlib
d = pathlib.Path(__file__).parent
root = d.parent
ver = json.loads((d/'version.json').read_text(encoding='utf8'))
h = (d/'vorlage.html').read_text(encoding='utf8')
css = (d/'kartenbox.css').read_text(encoding='utf8')
js = (d/'kartenbox.js').read_text(encoding='utf8')
assert '</script' not in js.lower() and '</style' not in css.lower()
assert js.count("'__VERSION__'") == 1
js = js.replace("'__VERSION__'", "'" + ver['version'] + "'")
h = h.replace('<link rel="stylesheet" href="kartenbox.css">', '<style>\n'+css+'</style>')
h = h.replace('<script src="kartenbox.js"></script>', '<script>\n'+js+'</script>')
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
print('gebaut:', ver['version'], [f['pfad'] for f in files])
