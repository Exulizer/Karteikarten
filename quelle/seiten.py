# Statische Seiten für Suchmaschinen und Menschen: Impressum, Datenschutz und fünf kurze Textseiten.
# bauen.py ruft build_pages() auf. Die Rechtstexte kommen aus vorlage.html (eine Quelle für App-Dialog und Seite).
import html, json, re, datetime

NAME = 'KarteiDeck'
APP = 'karteikarten.html'

PAGES = [
 dict(slug='karteikarten-ohne-anmeldung', title='Karteikarten ohne Anmeldung lernen – KarteiDeck',
  desc='Karteikarten schreiben und lernen, ohne Konto und ohne E-Mail-Adresse. Die Karten bleiben in deinem Browser. Kostenlos und ohne Werbung.',
  h1='Karteikarten ohne Anmeldung lernen', nav='Ohne Anmeldung', body='''
<p>Du brauchst weder ein Konto noch eine E-Mail-Adresse. Seite öffnen, Karte schreiben, lernen.</p>
<h2>So geht’s</h2>
<ol>
<li>Auf „Neu“ tippen und Frage und Lösung eintragen.</li>
<li>Unter „Lernen“ die Karte aufdecken und mit „Gewusst“ oder „Nochmal“ antworten.</li>
<li>Der Karteikasten legt die Karte später wieder vor.</li>
</ol>
<h2>Wo bleiben die Karten?</h2>
<p>Im Speicher deines Browsers, auf deinem Gerät. Sie gehen nicht an einen Server. Löschst du die Website-Daten, sind die Karten weg. Sichere sie darum ab und zu mit „Karten speichern“.</p>
<h2>Wann lohnt sich ein Konto?</h2>
<p>Mit dem kostenlosen Konto liegen Karten und Optionen auf jedem Gerät bereit. Dazu kommen Statistik, Antwort tippen, Vorlesen, Prüfung und der Kassettenplayer.</p>
'''),
 dict(slug='karteikarten-offline-lernen', title='Karteikarten offline lernen – KarteiDeck',
  desc='Karteikarten ohne Internet lernen: Nach dem ersten Laden läuft KarteiDeck offline, auch als App auf dem Handy oder Computer.',
  h1='Karteikarten offline lernen', nav='Offline', body='''
<p>Nach dem ersten Aufruf merkt sich der Browser die Seite. Danach öffnet sie auch ohne Netz, im Zug, im Flugzeug oder in der Bibliothek.</p>
<h2>Als App installieren</h2>
<p>Am Computer zeigt Chrome oder Edge in der Adressleiste „Installieren“. Auf dem iPhone: Teilen, dann „Zum Home-Bildschirm“. Die App öffnet in einem eigenen Fenster.</p>
<h2>Was ohne Netz geht</h2>
<ul>
<li>Karten schreiben, ändern und lernen</li>
<li>Rubriken, Suche, Hell und Dunkel</li>
<li>Vorlesen mit der Stimme des Geräts (mit Konto)</li>
</ul>
<h2>Was Netz braucht</h2>
<ul>
<li>Anmelden und der Abgleich mit dem Konto</li>
<li>Die Suche nach einer neuen Version (in den Optionen abschaltbar)</li>
</ul>
<p>Ohne Konto liegen die Karten nur in deinem Browser. Sichere sie mit „Karten speichern“.</p>
'''),
 dict(slug='leitner-system', title='Leitner-System: der Karteikasten erklärt – KarteiDeck',
  desc='Das Leitner-System erklärt: Karteikarten in Fächern wiederholen. Gewusste Karten rutschen ein Fach weiter, falsche zurück. So nutzt du es in KarteiDeck.',
  h1='Leitner-System: der Karteikasten erklärt', nav='Leitner-System', body='''
<p>Der Karteikasten ist eine Lernmethode mit Fächern. Sebastian Leitner hat sie 1972 in „So lernt man lernen“ beschrieben.</p>
<h2>Die Regel</h2>
<ul>
<li>Neue Karten starten in Fach 1.</li>
<li>Gewusst: Die Karte rutscht ein Fach höher.</li>
<li>Nicht gewusst: Die Karte geht zurück in Fach 1.</li>
<li>Karten in höheren Fächern kommen seltener dran.</li>
</ul>
<h2>Warum das hilft</h2>
<p>Du übst oft, was noch nicht sitzt, und selten, was du kannst. Vor dem Umdrehen holst du die Antwort aus dem Kopf. Das nennt man Active Recall.</p>
<h2>In KarteiDeck</h2>
<p>Gewusste Karten rutschen ein Fach höher und kommen später wieder. „Nochmal“ schickt sie zurück in Fach 1. Der Reiter „Fällig“ zeigt, was heute dran ist.</p>
'''),
 dict(slug='lueckentext-karteikarten', title='Lückentext-Karteikarten erstellen – KarteiDeck',
  desc='Lückentext-Karteikarten schreiben: Wort in doppelte geschweifte Klammern setzen, die Lücke erscheint auf der Vorderseite. So geht es in KarteiDeck.',
  h1='Lückentext-Karteikarten erstellen', nav='Lückentext', body='''
<p>Bei einer Lückenkarte fehlt ein Wort im Satz. Du musst es kennen, nicht nur wiedererkennen.</p>
<h2>So schreibst du sie</h2>
<p>Tippe beim Anlegen das gesuchte Wort an (oder markiere es) und drücke auf „Lücke“. Oder setze es selbst in doppelte geschweifte Klammern:</p>
<pre>Die Hauptstadt von Frankreich ist {{Paris}}.</pre>
<p>Auf der Vorderseite steht eine Lücke. Auf der Rückseite siehst du den vollen Satz.</p>
<h2>Mehrere Lücken</h2>
<p>Ein Satz darf mehrere Lücken haben, zum Beispiel <code>{{Paris}} liegt an der {{Seine}}.</code></p>
<h2>Wörter antippen</h2>
<p>Mit Konto gibt es die Wortbank: Unter der Karte liegen die gesuchten Wörter und zwei falsche. Du tippst sie der Reihe nach an. Das ist leichter als eintippen und passt für Kinder.</p>
<h2>Lücke eintippen</h2>
<p>Mit Konto kannst du die Wörter auch eintippen. KarteiDeck prüft die Eingabe. Groß- und Kleinschreibung, Akzente und kleine Tippfehler zählen nicht als falsch.</p>
'''),
 dict(slug='vokabeln-lernen-karteikarten', title='Vokabeln lernen mit Karteikarten – KarteiDeck',
  desc='Vokabeln mit Karteikarten lernen: Wort vorne, Übersetzung hinten, Vorlesen mit Gerätestimme, Import aus Anki, Quizlet und CSV. Kostenlos und ohne Werbung.',
  h1='Vokabeln lernen mit Karteikarten', nav='Vokabeln', body='''
<p>Wort auf die Vorderseite, Übersetzung auf die Rückseite. Mehr braucht eine gute Vokabelkarte nicht.</p>
<h2>Tipps für bessere Karten</h2>
<ul>
<li>Eine Vokabel pro Karte.</li>
<li>Ein kurzer Beispielsatz hilft mehr als eine lange Liste. Als Lückentext wird er zur Übung.</li>
<li>Für jede Sprache eine eigene Rubrik mit eigener Farbe.</li>
</ul>
<h2>Was KarteiDeck dafür kann</h2>
<ul>
<li>Import aus CSV, Anki und Quizlet</li>
<li>Richtung rückwärts oder gemischt, damit du in beide Richtungen übst (mit Konto)</li>
<li>Vorlesen mit der Gerätestimme auf Deutsch, Englisch, Französisch, Spanisch und Italienisch (mit Konto)</li>
<li>Antwort eintippen statt nur umdrehen (mit Konto)</li>
</ul>
'''),
]

_KT = False   # true, wenn das Konto-System und damit das Kontaktformular eingerichtet ist

def _esc(s): return html.escape(s, quote=True)

def _head(title, desc, robots, url, slug):
    h = ['<meta charset="utf-8">', '<meta name="viewport" content="width=device-width, initial-scale=1">',
         '<title>%s</title>' % _esc(title), '<meta name="description" content="%s">' % _esc(desc),
         '<meta name="robots" content="%s">' % robots, '<meta name="theme-color" content="#c9a676">',
         '<link rel="icon" href="icon.svg" type="image/svg+xml">', '<link rel="alternate icon" href="favicon.ico" sizes="48x48">',
         '<link rel="apple-touch-icon" href="apple-touch-icon.png">', '<link rel="stylesheet" href="seiten.css">',
         '<meta property="og:type" content="article">', '<meta property="og:site_name" content="%s">' % NAME, '<meta property="og:locale" content="de_DE">',
         '<meta property="og:title" content="%s">' % _esc(title), '<meta property="og:description" content="%s">' % _esc(desc),
         '<meta name="twitter:card" content="summary_large_image">']
    if url:
        h += ['<link rel="canonical" href="%s/%s.html">' % (url, slug), '<meta property="og:url" content="%s/%s.html">' % (url, slug),
              '<meta property="og:image" content="%s/vorschau.png">' % url, '<meta name="twitter:image" content="%s/vorschau.png">' % url]
        if robots.startswith('index'):
            h.append('<script type="application/ld+json">' + json.dumps({'@context': 'https://schema.org', '@type': 'BreadcrumbList', 'itemListElement': [
                {'@type': 'ListItem', 'position': 1, 'name': NAME, 'item': url + '/'},
                {'@type': 'ListItem', 'position': 2, 'name': title.split(' – ')[0].split(' | ')[0], 'item': '%s/%s.html' % (url, slug)}]}, ensure_ascii=False) + '</script>')
    return '\n'.join(h)

def _page(slug, title, desc, robots, url, h1, body, extra_nav=True):
    more = ''
    if extra_nav:
        links = ''.join('<li><a href="%s.html">%s</a></li>' % (p['slug'], _esc(p['nav'])) for p in PAGES if p['slug'] != slug)
        more = '<nav class="more" aria-label="Weitere Themen"><h2>Mehr zum Thema</h2><ul>%s</ul></nav>' % links
    cta = '<p class="cta"><a class="btn primary" href="%s">KarteiDeck öffnen</a></p>' % APP if extra_nav else ''
    return ('<!DOCTYPE html>\n<html lang="de">\n<head>\n' + _head(title, desc, robots, url, slug) + '\n</head>\n<body>\n'
      '<div class="sheet">\n<header><a class="brand" href="%s"><img src="logo.svg" width="40" height="40" alt=""><b>%s</b></a><a class="btn" href="%s">Zur App</a></header>\n'
      '<main>\n<h1>%s</h1>\n%s\n%s\n</main>\n%s\n'
      '<footer><a href="%s">Startseite</a><a href="impressum.html">Impressum</a>%s<a href="datenschutz.html">Datenschutz</a></footer>\n</div>\n%s</body>\n</html>\n'
      ) % (APP, NAME, APP, _esc(h1), body.strip(), cta, more, APP, '<a href="kontakt.html">Kontakt</a>' if _KT else '', '<script src="kontakt.js"></script>\n' if slug == 'kontakt' else '')

def _legal(vorlage, dlg, anb, konto_on):
    m = re.search(r'<dialog id="%s".*?</dialog>' % dlg, vorlage, re.S)
    t = m.group(0)
    t = re.sub(r'<dialog[^>]*>', '', t).replace('</dialog>', '')
    t = re.sub(r'<h2 id="\w+">.*?</h2>', '', t, count=1, flags=re.S)
    t = re.sub(r'<div class="row">.*?</div>', '', t, flags=re.S)
    def fill(mm):
        v = anb.get(mm.group(1), '').strip()
        return _esc(v) if v else '<span class="miss">[Angabe fehlt]</span>'
    t = re.sub(r'<span class="lf" data-a="(\w+)"></span>', fill, t)
    t = t.replace('<p class="lsub">', '<p class="sub">')
    if dlg == 'dsDlg':
        t = re.sub(r'<h3 id="dsNoK">Konto</h3>\s*<p id="dsNoK2">.*?</p>', '' if konto_on else '<h3>Konto</h3><p>Derzeit gibt es keine Konten.</p>', t, flags=re.S)
        t = t.replace('<div id="dsKonto" hidden>', '<div>') if konto_on else re.sub(r'<div id="dsKonto" hidden>.*?</div>', '', t, flags=re.S)
    return t.strip()

def _kontakt(api, mail):
    nos = ('<noscript><p>Für das Formular wird JavaScript gebraucht. Du erreichst uns auch per E-Mail: %s</p></noscript>' % _esc(mail)) if mail else '<noscript><p>Für das Formular wird JavaScript gebraucht.</p></noscript>'
    return ('<p>Frage, Fehler oder Idee? Schreib uns. Die Angaben gehen nur an uns und dienen der Antwort.</p>\n'
      '<form id="kf" data-api="%s" novalidate>\n'
      '<label for="kname">Name</label><input type="text" id="kname" autocomplete="name" placeholder="Dein Name" maxlength="80" required>\n'
      '<label for="kmail">E-Mail</label><input type="email" id="kmail" autocomplete="email" placeholder="Für die Antwort" maxlength="190" required>\n'
      '<label for="kmsg">Nachricht</label><textarea id="kmsg" placeholder="Was möchtest du uns sagen?" maxlength="2000" rows="7" required></textarea>\n'
      '<input type="text" id="khp" class="hp" tabindex="-1" autocomplete="off" aria-hidden="true" placeholder="Nicht ausfüllen">\n'
      '<p class="err" id="kerr" role="alert"></p>\n'
      '<p class="hint">Mehr dazu in der <a href="datenschutz.html">Datenschutzerklärung</a>.</p>\n'
      '<button class="btn primary" type="submit" id="ksend">Senden</button>\n</form>\n'
      '<p id="kdone" role="status" hidden></p>\n%s') % (_esc(api), nos)

def build_pages(root, vorlage, url, anbieter, konto_on, api=''):
    global _KT
    _KT = bool(konto_on and api)
    n = 0
    if _KT:
        (root / 'kontakt.html').write_text(_page('kontakt', 'Kontakt – KarteiDeck', 'Kontaktformular von KarteiDeck', 'noindex, follow', url, 'Kontakt', _kontakt(api, anbieter.get('email', '')), extra_nav=False), encoding='utf8'); n += 1
    for p in PAGES:
        (root / (p['slug'] + '.html')).write_text(_page(p['slug'], p['title'], p['desc'], 'index, follow, max-image-preview:large', url, p['h1'], p['body']), encoding='utf8'); n += 1
    for slug, dlg, title, h1 in [('impressum', 'impDlg', 'Impressum – KarteiDeck', 'Impressum'), ('datenschutz', 'dsDlg', 'Datenschutz – KarteiDeck', 'Datenschutz')]:
        (root / (slug + '.html')).write_text(_page(slug, title, title, 'noindex, follow', url, h1, _legal(vorlage, dlg, anbieter, konto_on), extra_nav=False), encoding='utf8'); n += 1
    return n

def sitemap(url):
    d = datetime.date.today().isoformat()
    urls = [url + '/'] + ['%s/%s.html' % (url, p['slug']) for p in PAGES]
    return '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + ''.join('  <url><loc>%s</loc><lastmod>%s</lastmod></url>\n' % (u, d) for u in urls) + '</urlset>\n'
