# Statische Seiten für Suchmaschinen und Menschen: Impressum, Datenschutz und fünf kurze Textseiten.
# bauen.py ruft build_pages() auf. Die Rechtstexte kommen aus vorlage.html (eine Quelle für App-Dialog und Seite).
import html, json, re, datetime

NAME = 'KarteiDeck'
APP = 'karteikarten.html'

PAGES = [
 dict(slug='karteikarten-ohne-anmeldung', title='Karteikarten online erstellen ohne Anmeldung – KarteiDeck',
  desc='Karteikarten online erstellen und lernen, ganz ohne Anmeldung, Konto oder E-Mail. Kostenlos, ohne Werbung, die Karten bleiben auf deinem Gerät. Jetzt starten.',
  h1='Karteikarten online erstellen, ohne Anmeldung', nav='Ohne Anmeldung', body='''
<p>Du kannst Karteikarten online erstellen, ohne dich anzumelden. Du brauchst weder ein Konto noch eine E-Mail-Adresse: Seite öffnen, Karte schreiben, lernen. KarteiDeck ist kostenlos und zeigt keine Werbung.</p>
<h2>Karteikarten online erstellen: So geht’s</h2>
<ol>
<li>Auf „Neu“ tippen und Frage und Lösung eintragen.</li>
<li>Unter „Lernen“ die Karte aufdecken und mit „Gewusst“ oder „Nochmal“ antworten.</li>
<li>Der Karteikasten legt die Karte später wieder vor.</li>
</ol>
<h2>Wo bleiben die Karten?</h2>
<p>Im Speicher deines Browsers, auf deinem Gerät. Sie gehen nicht an einen Server. Löschst du die Website-Daten, sind die Karten weg. Sichere sie darum ab und zu mit „Karten speichern“.</p>
<h2>Beispiel: eine Karte in 20 Sekunden</h2>
<p>Vorderseite: „Hauptstadt von Australien?“ Rückseite: „Canberra“. Speichern, fertig. Zehn solche Karten genügen für die erste Lernrunde. Mit „Demo“ siehst du vorher 10 Beispielkarten.</p>
<h2>Was du ohne Konto bekommst</h2>
<ul>
<li>Karteikasten mit Fächern (<a href="leitner-system.html">Leitner-System</a>)</li>
<li><a href="lueckentext-karteikarten.html">Lückentext</a>, Bilder, Tags und Rubriken</li>
<li>Import aus CSV, Anki und Quizlet</li>
<li>Lernen <a href="karteikarten-offline-lernen.html">auch offline</a></li>
</ul>
<h2>Wann lohnt sich ein Konto?</h2>
<p>Mit dem kostenlosen Konto liegen Karten und Optionen auf jedem Gerät bereit. Dazu kommen der Fortschritt mit Tag, Monat und Jahr, Antwort tippen, Vorlesen, Prüfung und der Kassettenplayer.</p>
'''),
 dict(slug='karteikarten-offline-lernen', title='Karteikarten offline lernen, ohne Internet – KarteiDeck',
  desc='Karteikarten ohne Internet lernen: Nach dem ersten Laden läuft KarteiDeck offline, auch als App auf Handy und Computer. Kostenlos und ohne Anmeldung.',
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
<h2>Typische Fälle</h2>
<p>Im Zug lernen, im Flugmodus im Flugzeug, in der Bibliothek ohne WLAN: Du öffnest KarteiDeck wie sonst. Die Karten liegen im Browser, nichts wird nachgeladen. Wichtig ist nur, die Seite einmal mit Netz zu öffnen.</p>
<h2>Funktioniert es wirklich?</h2>
<p>Teste es vorab: Seite öffnen, Flugmodus einschalten, Seite neu laden. Erscheinen deine Karten, bist du bereit.</p>
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
<h2>Beispiel mit drei Karten</h2>
<p>Du lernst die Karten „Hund“, „Katze“ und „Pferd“. „Hund“ und „Katze“ weißt du, sie rutschen in Fach 2. „Pferd“ weißt du nicht, die Karte bleibt in Fach 1. Morgen kommt „Pferd“ wieder dran, „Hund“ und „Katze“ erst später. So wächst der Abstand mit jedem Treffer.</p>
<h2>Wie viele Fächer?</h2>
<p>Klassisch sind fünf Fächer. In KarteiDeck siehst du den Stand im Karteikasten, der Reiter „Fällig“ zeigt, was heute dran ist. Mehr dazu im Beitrag <a href="vokabeln-lernen-karteikarten.html">Vokabeln lernen</a>.</p>
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
<h2>Gute Lückenkarten</h2>
<ul>
<li>Nur ein Schlüsselwort ausblenden, nicht den halben Satz.</li>
<li>Ein ganzer Satz bleibt besser haften als ein einzelnes Wort.</li>
<li>Beispiele: Jahreszahlen in Geschichte, Fachbegriffe in Biologie, Formeln in Physik.</li>
</ul>
<h2>Wörter antippen</h2>
<p>Mit Konto gibt es die Wortbank: Unter der Karte liegen die gesuchten Wörter und zwei falsche. Du tippst sie der Reihe nach an. Das ist leichter als eintippen und passt für Kinder.</p>
<h2>Lücke eintippen</h2>
<p>Mit Konto kannst du die Wörter auch eintippen. KarteiDeck prüft die Eingabe. Groß- und Kleinschreibung, Akzente und kleine Tippfehler zählen nicht als falsch.</p>
'''),
 dict(slug='vokabeln-lernen-karteikarten', title='Vokabeln lernen mit Karteikarten online – KarteiDeck',
  desc='Vokabeln mit Karteikarten lernen: Wort vorne, Übersetzung hinten, Vorlesen mit Gerätestimme, Import aus Anki, Quizlet und CSV. Kostenlos und ohne Werbung.',
  h1='Vokabeln lernen mit Karteikarten', nav='Vokabeln', body='''
<p>Wort auf die Vorderseite, Übersetzung auf die Rückseite. Mehr braucht eine gute Vokabelkarte nicht.</p>
<h2>Tipps für bessere Karten</h2>
<ul>
<li>Eine Vokabel pro Karte.</li>
<li>Ein kurzer Beispielsatz hilft mehr als eine lange Liste. Als Lückentext wird er zur Übung.</li>
<li>Für jede Sprache eine eigene Rubrik mit eigener Farbe.</li>
</ul>
<h2>Ablauf für neue Vokabeln</h2>
<ol>
<li>Pro Lerneinheit 10 bis 15 neue Wörter anlegen.</li>
<li>Jeden Tag kurz lernen. Der <a href="leitner-system.html">Karteikasten</a> legt die Wörter zum richtigen Zeitpunkt vor.</li>
<li>Nach einer Woche Richtung wechseln und die Übersetzung abfragen.</li>
</ol>
<h2>Karten aus anderen Programmen</h2>
<p>Hast du schon Listen in Anki, Quizlet oder Excel, lade sie als Datei. Doppelte Karten werden übersprungen. Ohne Anmeldung geht das auch. Siehe <a href="karteikarten-ohne-anmeldung.html">Karteikarten ohne Anmeldung</a>.</p>
<h2>Was KarteiDeck dafür kann</h2>
<ul>
<li>Import aus CSV, Anki und Quizlet</li>
<li>Richtung rückwärts oder gemischt, damit du in beide Richtungen übst (mit Konto)</li>
<li>Vorlesen mit der Gerätestimme auf Deutsch, Englisch, Französisch, Spanisch und Italienisch (mit Konto)</li>
<li>Antwort eintippen statt nur umdrehen (mit Konto)</li>
</ul>
'''),
]

# Häufige Fragen je Themenseite. Ersetzt die Hilfe der App auf der Online-Seite (bauen.py entfernt sie, sobald seite.url gesetzt ist).
# Der sichtbare Abschnitt und das FAQPage-JSON-LD entstehen aus derselben Liste.
FAQ = {
 'karteikarten-ohne-anmeldung': [
  ('Wo liegen meine Karten?', 'Im Browser auf deinem Gerät. In Chrome oder Edge am Computer kannst du unter Optionen einen Ordner wählen, dann speichert die Seite dort bei jeder Änderung.'),
  ('Wie sichere ich meine Karten?', 'Im Tab „Karten“ auf „Karten speichern“ tippen. Die Datei bewahrst du selbst auf. Mit „Karten laden“ holst du sie zurück.'),
  ('Was bleibt bei mir, was geht an einen Server?', 'Ohne Konto bleibt alles auf deinem Gerät. Es gibt kein Tracking, keine Cookies und keine nachgeladenen Schriften oder Skripte.'),
  ('Gibt es eine Demo?', 'Ja. Der Schalter „Demo“ oben zeigt 10 Beispielkarten für Klasse 7 bis 10. Sie landen nicht in deinen Karten.'),
 ],
 'karteikarten-offline-lernen': [
  ('Brauche ich Internet oder einen Server?', 'Nach dem ersten Laden nicht. Die Seite läuft im Browser und sendet beim Lernen nichts.'),
  ('Kann ich die App installieren?', 'Ja, über die Adressleiste („Installieren“) oder am iPhone über Teilen und „Zum Home-Bildschirm“.'),
  ('Wie ziehe ich auf ein anderes Gerät um?', 'Mit Konto liegen deine Karten auf jedem Gerät bereit. Ohne Konto speicherst du die Karten, bringst die Datei aufs andere Gerät und lädst sie dort.'),
 ],
 'leitner-system': [
  ('Wie lerne ich?', 'Im Fächer eine Karte antippen, „Lösung zeigen“, dann „Gewusst“ oder „Nochmal“. Gewusste Karten kommen später wieder, schwere früher.'),
  ('Was macht „Weiter“?', 'Die Karte geht in die Ablage links oben und bekommt einen blauen Reiter. Ein Klick auf die Ablage holt sie zurück.'),
  ('Was sind Marker und Pinnadel?', 'Rosa heißt Nochmal, Blau heißt Später. Mit der Pinnadel (Taste P) heftest du eine Karte an. Der Modus „Angeheftet“ übt nur diese Karten.'),
  ('Welche Lernarten gibt es?', 'Rückwärts, Antwort tippen, Wortbank bei Lückentext, Vorlesen und eine Prüfung mit Note. Du findest sie unter Optionen, Lernarten (mit Konto).'),
  ('Welche Tasten gibt es?', 'Leertaste dreht die Karte, Pfeil rechts heißt Gewusst, Pfeil links Nochmal. P heftet an, Esc legt zurück, 1 bis 7 wählt eine Karte.'),
  ('Was zeigt der Fortschritt?', 'Im Tab „Fortschritt“ (mit Konto) wechselst du zwischen Tag, Monat und Jahr. Du siehst, wie viele Karten du gelernt hast, nach Rubriken geordnet, wie viele du gewusst hast und welche neu im obersten Fach angekommen sind. Im Monat bekommt jeder Lerntag einen Stempel.'),
 ],
 'lueckentext-karteikarten': [
  ('Brauche ich eine eigene Lösung?', 'Nein. Beim Lernen zeigt KarteiDeck sofort grün oder rot.'),
  ('Wie mache ich aus einem Satz einen Lückentext?', 'Satz schreiben, das Wort antippen oder markieren und auf „Lücke“ drücken. Aus „Der Mond umkreist die Erde.“ wird „Der {{Mond}} umkreist die Erde.“'),
 ],
 'vokabeln-lernen-karteikarten': [
  ('Wie lade ich Karten aus Anki, Quizlet oder CSV?', 'Im Tab „Karten“ auf „Karten laden“. KarteiDeck liest CSV, den Anki-Textexport (Notes in Plain Text) und den Quizlet-Export. Doppelte werden übersprungen.'),
  ('Wie nutze ich Karten von anderen?', 'Die Datei speichern, dann im Tab „Karten“ auf „Karten laden“. Die Karten kommen dazu, deine eigenen bleiben.'),
  ('Wie teile ich Karten?', 'Im Tab „Karten“ auf „Teilen“. Am Handy wählst du E-Mail oder Discord, am Computer wird eine Datei heruntergeladen. Dein Lernstand bleibt bei dir.'),
  ('Kann ich Bilder und Tags nutzen?', 'Ja. Beim Anlegen fügst du ein Bild zur Frage hinzu, auch per Einfügen. Tags und Suche findest du im Tab „Karten“. „Tabelle (CSV)“ speichert alles für Excel oder Anki, „Drucken“ macht einen Bogen.'),
  ('Wie bekommen Rubriken Farben?', 'Beim Anlegen einer Rubrik wählst du eine Farbe. Im Tab „Rubriken“ änderst du sie mit „Ändern“. Sie erscheint als Punkt und als Streifen oben auf der Karte.'),
 ],
}

def _faq_html(items):
    return ('<section class="faq" aria-labelledby="faqh"><h2 id="faqh">Häufige Fragen</h2>\n'
            + '\n'.join('<h3>%s</h3><p>%s</p>' % (_esc(q), _esc(a)) for q, a in items) + '\n</section>')

def _faq_ld(items):
    return '<script type="application/ld+json">' + json.dumps({'@context': 'https://schema.org', '@type': 'FAQPage', 'mainEntity': [
        {'@type': 'Question', 'name': q, 'acceptedAnswer': {'@type': 'Answer', 'text': a}} for q, a in items]}, ensure_ascii=False) + '</script>'

def _hilfe_gruppen():
    f = FAQ
    return [('Lernen', f['leitner-system'] + f['lueckentext-karteikarten']),
            ('Karten und Speichern', f['vokabeln-lernen-karteikarten'] + f['karteikarten-ohne-anmeldung'][:2]),
            ('Offline, Konto und Datenschutz', f['karteikarten-offline-lernen'] + f['karteikarten-ohne-anmeldung'][2:])]

def _hilfe_body():
    return '\n'.join('<h2>%s</h2>\n%s' % (_esc(t), '\n'.join('<h3>%s</h3><p>%s</p>' % (_esc(q), _esc(a)) for q, a in items)) for t, items in _hilfe_gruppen())

HILFE = dict(slug='hilfe', title='Hilfe und häufige Fragen zu KarteiDeck', desc='Hilfe zu KarteiDeck: Lernen, Lückentext, Karten speichern, teilen und importieren, offline nutzen. Kurze Antworten auf die häufigsten Fragen.', h1='Hilfe und häufige Fragen', nav='Hilfe')

_KT = False   # true, wenn das Konto-System und damit das Kontaktformular eingerichtet ist

def _esc(s): return html.escape(s, quote=True)

def _en(slug):   # Slug der englischen Fassung (seiten_en.SLUG), None wenn es keine gibt; 'index' = Startseite
    import seiten_en
    return 'index' if slug == 'index' else seiten_en.SLUG.get(slug)

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
        if _en(slug):
            _e = '%s/en/%s.html' % (url, _en(slug)) if slug != 'index' else url + '/en/'
            _d = '%s/%s.html' % (url, slug)
            h += ['<link rel="alternate" hreflang="de" href="%s">' % _d, '<link rel="alternate" hreflang="en" href="%s">' % _e, '<link rel="alternate" hreflang="x-default" href="%s">' % _d]
        if robots.startswith('index'):
            h.append('<script type="application/ld+json">' + json.dumps({'@context': 'https://schema.org', '@type': 'BreadcrumbList', 'itemListElement': [
                {'@type': 'ListItem', 'position': 1, 'name': NAME, 'item': url + '/'},
                {'@type': 'ListItem', 'position': 2, 'name': title.split(' – ')[0].split(' | ')[0], 'item': '%s/%s.html' % (url, slug)}]}, ensure_ascii=False) + '</script>')
    return '\n'.join(h)

def _neu():
    import json, pathlib, datetime
    L = json.loads((pathlib.Path(__file__).parent / 'neu.json').read_text(encoding='utf8'))
    MON = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember']
    def dat(d):
        if not d: return ''
        y, m, t = map(int, d.split('-')); return ' <small>%d. %s %d</small>' % (t, MON[m - 1], y)
    return L, dat

def _neu_body():
    L, dat = _neu()
    return '\n'.join('<h2>Version %s%s</h2>\n<ul>%s</ul>' % (v['v'], dat(v['datum']), ''.join('<li>%s</li>' % _esc(x) for x in v['de'])) for v in L)

def _page(slug, title, desc, robots, url, h1, body, extra_nav=True, faq=None):
    more = ''
    if faq: body = body.strip() + '\n' + _faq_html(faq)
    if extra_nav:
        links = ''.join('<li><a href="%s.html">%s</a></li>' % (p['slug'], _esc(p['nav'])) for p in PAGES if p['slug'] != slug)
        more = '<nav class="more" aria-label="Weitere Themen"><h2>Mehr zum Thema</h2><ul>%s</ul></nav>' % links
    app = './' if url else APP   # online zeigt die Adresse nur die Domain, nicht karteikarten.html
    cta = '<p class="cta"><a class="btn primary" href="%s">KarteiDeck öffnen</a></p>' % app if extra_nav else ''
    return ('<!DOCTYPE html>\n<html lang="de">\n<head>\n' + _head(title, desc, robots, url, slug) + '\n</head>\n<body>\n'
      '<div class="sheet">\n<header><a class="brand" href="%s"><img src="logo.svg" width="40" height="40" alt=""><b>%s</b></a><span class="hr">%s<a class="btn" href="%s">Zur App</a></span></header>\n'
      '<main>\n<h1>%s</h1>\n%s\n%s\n</main>\n%s\n'
      '<footer><a href="%s">Startseite</a><a href="impressum.html">Impressum</a>%s<a href="datenschutz.html">Datenschutz</a><a href="neu.html">Was ist neu</a></footer>\n</div>\n%s</body>\n</html>\n'
      ) % (app, NAME, '<a class="btn" href="en/%s.html" hreflang="en" lang="en">English</a>' % _en(slug) if _en(slug) else '', app, _esc(h1), body.strip(), cta, more, app, '<a href="kontakt.html">Kontakt</a>' if _KT else '', '<script src="kontakt.js"></script>\n' if slug == 'kontakt' else '')

def _legal(vorlage, dlg, anb, konto_on, raw=False):   # raw: Platzhalter nicht füllen (die englische Fassung übersetzt zuerst)
    m = re.search(r'<dialog id="%s".*?</dialog>' % dlg, vorlage, re.S)
    t = m.group(0)
    t = re.sub(r'<dialog[^>]*>', '', t).replace('</dialog>', '')
    t = re.sub(r'<h2 id="\w+">.*?</h2>', '', t, count=1, flags=re.S)
    t = re.sub(r'<div class="row">.*?</div>', '', t, flags=re.S)
    def fill(mm):
        v = anb.get(mm.group(1), '').strip()
        return _esc(v) if v else '<span class="miss">[Angabe fehlt]</span>'
    if not raw: t = re.sub(r'<span class="lf" data-a="(\w+)"></span>', fill, t)
    t = t.replace('<p class="lsub">', '<p class="sub">')
    if dlg == 'dsDlg':
        t = re.sub(r'<h3 id="dsNoK">Konto</h3>\s*<p id="dsNoK2">.*?</p>', '' if konto_on else '<h3>Konto</h3><p>Derzeit gibt es keine Konten.</p>', t, flags=re.S)
        t = t.replace('<div id="dsKonto" hidden>', '<div>') if konto_on else re.sub(r'<div id="dsKonto" hidden>.*?</div>', '', t, flags=re.S)
    return (t.strip(), fill) if raw else t.strip()

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
    _items = [q for _, g in _hilfe_gruppen() for q in g]
    (root / 'hilfe.html').write_text(_page('hilfe', HILFE['title'], HILFE['desc'], 'index, follow, max-image-preview:large', url, HILFE['h1'], _hilfe_body()).replace('\n</head>', ('\n' + _faq_ld(_items) if url else '') + '\n</head>', 1), encoding='utf8'); n += 1
    (root / 'neu.html').write_text(_page('neu', 'Was ist neu – KarteiDeck', 'Neuerungen in KarteiDeck: alle Versionen mit den wichtigsten Änderungen.', 'index, follow, max-image-preview:large', url, 'Was ist neu', _neu_body(), extra_nav=False), encoding='utf8'); n += 1
    for p in PAGES:
        (root / (p['slug'] + '.html')).write_text(_page(p['slug'], p['title'], p['desc'], 'index, follow, max-image-preview:large', url, p['h1'], p['body'], faq=FAQ.get(p['slug'])), encoding='utf8'); n += 1
    for slug, dlg, title, h1 in [('impressum', 'impDlg', 'Impressum – KarteiDeck', 'Impressum'), ('datenschutz', 'dsDlg', 'Datenschutz – KarteiDeck', 'Datenschutz')]:
        (root / (slug + '.html')).write_text(_page(slug, title, title, 'noindex, follow', url, h1, _legal(vorlage, dlg, anbieter, konto_on), extra_nav=False), encoding='utf8'); n += 1
    return n

def sitemap(url, en=None):
    """en: Liste (deutscher Slug, englischer Pfad) der englischen Seiten. Jede Seite nennt beide Fassungen als hreflang-Alternativen."""
    import seiten_en
    d = datetime.date.today().isoformat()
    pairs = [(url + '/', url + '/en/')] + [('%s/%s.html' % (url, p['slug']), '%s/en/%s.html' % (url, seiten_en.SLUG[p['slug']])) for p in PAGES] + [('%s/hilfe.html' % url, '%s/en/help.html' % url), ('%s/neu.html' % url, '%s/en/whats-new.html' % url)]
    def ent(u, alts):
        a = ''.join('<xhtml:link rel="alternate" hreflang="%s" href="%s"/>' % (l, h) for l, h in alts)
        return '  <url><loc>%s</loc><lastmod>%s</lastmod>%s</url>\n' % (u, d, a)
    out = ''
    for de, en_ in pairs:
        alts = [('de', de), ('en', en_), ('x-default', de)]
        out += ent(de, alts) + ent(en_, alts)
    return ('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n' + out + '</urlset>\n')
