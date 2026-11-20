# Englische Seiten unter en/. Gleiche Gestaltung wie die deutschen, eigene Adressen für die Suche.
import html, json
NAME = 'KarteiDeck'
SLUG = {  # deutscher Name -> englischer Dateiname in en/
 'karteikarten-ohne-anmeldung': 'flashcards-without-signup', 'karteikarten-offline-lernen': 'flashcards-offline',
 'leitner-system': 'leitner-system', 'lueckentext-karteikarten': 'cloze-flashcards', 'vokabeln-lernen-karteikarten': 'vocabulary-flashcards',
 'hilfe': 'help', 'neu': 'whats-new', 'impressum': 'legal-notice', 'datenschutz': 'privacy', 'kontakt': 'contact'}
EN_SLUGS = {v: k for k, v in SLUG.items()}

PAGES = [
 dict(de='karteikarten-ohne-anmeldung', title='Create Flashcards Online Without Signing Up – KarteiDeck',
  desc='Create and study flashcards online with no sign-up, account or email. Free, no ads, your cards stay on your device. Start now.',
  h1='Create flashcards online, no sign-up', nav='No sign-up', body='''
<p>You can create flashcards online without signing up. You need no account and no email address: open the page, write a card, study. KarteiDeck is free and shows no ads.</p>
<h2>How to create flashcards online</h2>
<ol>
<li>Tap “New” and enter a question and an answer.</li>
<li>Under “Study”, reveal the card and answer with “Got it” or “Again”.</li>
<li>The card box shows the card again later.</li>
</ol>
<h2>Where do the cards stay?</h2>
<p>In your browser’s storage, on your device. They are not sent to a server. If you clear the website data, the cards are gone. So save them now and then with “Save cards”.</p>
<h2>Example: a card in 20 seconds</h2>
<p>Front: “Capital of Australia?” Back: “Canberra”. Save, done. Ten cards like this are enough for the first round. With “Demo” you can first look at 10 sample cards.</p>
<h2>What you get without an account</h2>
<ul>
<li>Card box with boxes (<a href="leitner-system.html">Leitner system</a>)</li>
<li><a href="cloze-flashcards.html">Cloze text</a>, images, tags and categories</li>
<li>Import from CSV, Anki and Quizlet</li>
<li>Studying <a href="flashcards-offline.html">offline too</a></li>
</ul>
<h2>When is an account worth it?</h2>
<p>With the free account your cards and options are available on every device. You also get progress by day, month and year, typing the answer, reading aloud, exams and the cassette player.</p>
'''),
 dict(de='karteikarten-offline-lernen', title='Study Flashcards Offline, Without Internet – KarteiDeck',
  desc='Study flashcards without internet: after the first load KarteiDeck runs offline, also as an app on phone and computer. Free and no sign-up.',
  h1='Study flashcards offline', nav='Offline', body='''
<p>After the first visit your browser remembers the page. From then on it opens without a network too: on the train, on a plane or in the library.</p>
<h2>Install it as an app</h2>
<p>On a computer, Chrome or Edge shows “Install” in the address bar. On an iPhone: Share, then “Add to Home Screen”. The app opens in its own window.</p>
<h2>What works without a network</h2>
<ul>
<li>Writing, editing and studying cards</li>
<li>Categories, search, light and dark</li>
<li>Reading aloud with your device’s voice (with an account)</li>
</ul>
<h2>Typical cases</h2>
<p>Studying on the train, in flight mode on a plane, in a library without Wi-Fi: you open KarteiDeck as usual. The cards are in the browser, nothing is loaded. All that matters is that you have opened the page once while online.</p>
<h2>Does it really work?</h2>
<p>Test it beforehand: open the page, switch on flight mode, reload the page. If your cards appear, you are ready.</p>
<h2>What needs a network</h2>
<ul>
<li>Logging in and syncing with the account</li>
<li>The check for a new version (can be switched off in the options)</li>
</ul>
<p>Without an account the cards only live in your browser. Back them up with “Save cards”.</p>
'''),
 dict(de='leitner-system', title='Leitner System: the Flashcard Box Explained – KarteiDeck',
  desc='The Leitner system explained: repeat flashcards in boxes. Cards you know move up a box, missed ones go back. Here is how to use it in KarteiDeck.',
  h1='Leitner system: the flashcard box explained', nav='Leitner system', body='''
<p>The card box is a learning method with boxes. Sebastian Leitner described it in 1972 in his book “So lernt man lernen” (“How to learn to learn”).</p>
<h2>The rule</h2>
<ul>
<li>New cards start in box 1.</li>
<li>Got it: the card moves up one box.</li>
<li>Missed: the card goes back to box 1.</li>
<li>Cards in higher boxes come up less often.</li>
</ul>
<h2>Why it helps</h2>
<p>You practise often what does not stick yet, and rarely what you know. Before turning the card you pull the answer out of your head. This is called active recall.</p>
<h2>Example with three cards</h2>
<p>You study the cards “dog”, “cat” and “horse”. You know “dog” and “cat”, they move to box 2. You do not know “horse”, the card stays in box 1. Tomorrow “horse” comes up again, “dog” and “cat” only later. So the gap grows with every hit.</p>
<h2>How many boxes?</h2>
<p>Classically there are five boxes. In KarteiDeck you see the status in the card box, and the tab “Due” shows what is up today. More in the article <a href="vocabulary-flashcards.html">Learning vocabulary</a>.</p>
<h2>In KarteiDeck</h2>
<p>Cards you got right move up a box and come back later. “Again” sends them back to box 1. The tab “Due” shows what is up today.</p>
'''),
 dict(de='lueckentext-karteikarten', title='Create Cloze Flashcards (Fill-in-the-Blank) – KarteiDeck',
  desc='Write cloze flashcards: put a word in double curly braces and the blank appears on the front. Here is how it works in KarteiDeck.',
  h1='Create cloze flashcards', nav='Cloze text', body='''
<p>On a cloze card a word is missing from the sentence. You have to know it, not just recognise it.</p>
<h2>How to write them</h2>
<p>When creating a card, tap the word you are after (or select it) and press “Blank”. Or put it in double curly braces yourself:</p>
<pre>The capital of France is {{Paris}}.</pre>
<p>The front shows a blank. On the back you see the full sentence.</p>
<h2>Several blanks</h2>
<p>A sentence may have several blanks, for example <code>{{Paris}} lies on the {{Seine}}.</code></p>
<h2>Good cloze cards</h2>
<ul>
<li>Hide only one key word, not half the sentence.</li>
<li>A whole sentence sticks better than a single word.</li>
<li>Examples: dates in history, technical terms in biology, formulas in physics.</li>
</ul>
<h2>Tap the words</h2>
<p>With an account there is the word bank: below the card lie the words you need plus two wrong ones. You tap them in order. That is easier than typing and suits children.</p>
<h2>Type the blank</h2>
<p>With an account you can also type the words. KarteiDeck checks the input. Capitalisation, accents and small typos do not count as wrong.</p>
'''),
 dict(de='vokabeln-lernen-karteikarten', title='Learn Vocabulary with Flashcards Online – KarteiDeck',
  desc='Learn vocabulary with flashcards: word on the front, translation on the back, read aloud with your device voice, import from Anki, Quizlet and CSV. Free and no ads.',
  h1='Learn vocabulary with flashcards', nav='Vocabulary', body='''
<p>Word on the front, translation on the back. A good vocabulary card needs nothing more.</p>
<h2>Tips for better cards</h2>
<ul>
<li>One word per card.</li>
<li>A short example sentence helps more than a long list. As a cloze text it becomes practice.</li>
<li>A category of its own, with its own colour, for each language.</li>
</ul>
<h2>Routine for new vocabulary</h2>
<ol>
<li>Create 10 to 15 new words per study session.</li>
<li>Study briefly every day. The <a href="leitner-system.html">card box</a> shows the words at the right time.</li>
<li>After a week switch direction and quiz the translation.</li>
</ol>
<h2>Cards from other programs</h2>
<p>If you already have lists in Anki, Quizlet or Excel, load them as a file. Duplicate cards are skipped. This works without signing up too. See <a href="flashcards-without-signup.html">Flashcards without sign-up</a>.</p>
<h2>What KarteiDeck offers for this</h2>
<ul>
<li>Import from CSV, Anki and Quizlet</li>
<li>Reverse or mixed direction, so you practise both ways (with an account)</li>
<li>Reading aloud with your device voice in German, English, French, Spanish and Italian (with an account)</li>
<li>Typing the answer instead of just flipping (with an account)</li>
</ul>
'''),
]

FAQ = {
 'karteikarten-ohne-anmeldung': [
  ('Where are my cards stored?', 'In the browser on your device. In Chrome or Edge on a computer you can pick a folder under Options, and the page then saves there after every change.'),
  ('How do I back up my cards?', 'In the “Cards” tab tap “Save cards”. You keep the file yourself. With “Load cards” you bring it back.'),
  ('What stays with me, what goes to a server?', 'Without an account everything stays on your device. There is no tracking, no cookies and no externally loaded fonts or scripts.'),
  ('Is there a demo?', 'Yes. The “Demo” switch at the top shows 10 sample cards for grades 7 to 10. They do not end up in your cards.'),
 ],
 'karteikarten-offline-lernen': [
  ('Do I need internet or a server?', 'Not after the first load. The page runs in the browser and sends nothing while you study.'),
  ('Can I install the app?', 'Yes, via the address bar (“Install”) or on an iPhone via Share and “Add to Home Screen”.'),
  ('How do I move to another device?', 'With an account your cards are available on every device. Without an account you save the cards, bring the file to the other device and load it there.'),
 ],
 'leitner-system': [
  ('How do I study?', 'Tap a card in the fan, “Show answer”, then “Got it” or “Again”. Cards you got right come back later, hard ones sooner.'),
  ('What does “Skip” do?', 'The card goes to the tray at the top left and gets a blue tab. A click on the tray brings it back.'),
  ('What are markers and the pin?', 'Pink means Again, blue means Later. With the pin (key P) you pin a card. The “Pinned” mode only practises these cards.'),
  ('Which study modes are there?', 'Reverse, type the answer, word bank for cloze text, reading aloud and an exam with a grade. You find them under Options, Study modes (with an account).'),
  ('Which keys are there?', 'Space flips the card, right arrow means Got it, left arrow Again. P pins, Esc puts back, 1 to 7 picks a card.'),
  ('What does Progress show?', 'In the “Progress” tab (with an account) you switch between day, month and year. You see how many cards you studied, sorted by category, how many you got right and which ones newly reached the top box. In the month view every study day gets a stamp.'),
 ],
 'lueckentext-karteikarten': [
  ('Do I need an answer of my own?', 'No. While studying, KarteiDeck shows green or red at once.'),
  ('How do I turn a sentence into a cloze text?', 'Write the sentence, tap or select the word and press “Blank”. “The moon orbits the Earth.” becomes “The {{moon}} orbits the Earth.” You do not need an answer of your own.'),
 ],
 'vokabeln-lernen-karteikarten': [
  ('How do I load cards from Anki, Quizlet or CSV?', 'In the “Cards” tab tap “Load cards”. KarteiDeck reads CSV, the Anki text export (Notes in Plain Text) and the Quizlet export. Duplicates are skipped.'),
  ('How do I use cards from other people?', 'Save the file, then in the “Cards” tab tap “Load cards”. The cards are added, your own stay.'),
  ('How do I share cards?', 'In the “Cards” tab tap “Share”. On a phone you choose email or Discord, on a computer a file is downloaded. Your progress stays with you.'),
  ('Can I use images and tags?', 'Yes. When creating a card you add an image to the question, also by pasting. Tags and search are in the “Cards” tab. “Table (CSV)” saves everything for Excel or other programs.'),
  ('How do categories get colours?', 'When you create a category you pick a colour. In the “Categories” tab you change it with “Edit”. It appears as a dot and as a stripe at the top of the card.'),
 ],
}
HILFE = dict(de='hilfe', title='Help and Frequently Asked Questions about KarteiDeck', desc='Help for KarteiDeck: studying, cloze text, saving, sharing and importing cards, using it offline. Short answers to the most common questions.', h1='Help and frequently asked questions', nav='Help')
def hilfe_groups():
    f = FAQ
    return [('Studying', f['leitner-system'] + f['lueckentext-karteikarten']),
            ('Cards and saving', f['vokabeln-lernen-karteikarten'] + f['karteikarten-ohne-anmeldung'][:2]),
            ('Offline, account and privacy', f['karteikarten-offline-lernen'] + f['karteikarten-ohne-anmeldung'][2:])]

HOME = dict(title='KarteiDeck – Create and Study Flashcards Online, Free', desc='Create and study flashcards online without signing up: Leitner system, cloze text, import from Anki and Quizlet. Free, no ads, works offline.',
 h1='Flashcards online, free and without sign-up', body='''
<p>KarteiDeck is a flashcard app for the browser. Question on the front, answer on the back, just like at the desk. You need no account, it shows no ads and it runs offline.</p>
<h2>How it works</h2>
<ol>
<li><b>Write a card.</b> Question on the front, answer on the back, with an image if you like.</li>
<li><b>Flip it.</b> Turn the card over and say honestly: Got it or Again.</li>
<li><b>Repeat.</b> The <a href="leitner-system.html">card box (Leitner system)</a> shows you cards again when it is time.</li>
</ol>
<h2>What is inside</h2>
<ul>
<li>Card box with boxes, categories with colours, tags and search</li>
<li><a href="cloze-flashcards.html">Cloze text</a> and images on cards</li>
<li>Import from CSV, Anki and Quizlet</li>
<li>Daily goal, streak, light and dark theme</li>
<li><a href="flashcards-offline.html">Works offline</a> and can be installed as an app</li>
<li>With a free account: progress by day, month and year, typing the answer, word bank, reading aloud, exams, cassette player, and your cards on every device</li>
</ul>
<h2>Your data</h2>
<p>Without an account the cards stay in your browser on your device. No tracking, no cookies without an account, no external fonts. More in <a href="flashcards-without-signup.html">Flashcards without sign-up</a>.</p>
<h2>More topics</h2>
<ul>
<li><a href="vocabulary-flashcards.html">Learn vocabulary with flashcards</a></li>
<li><a href="help.html">Help and frequently asked questions</a></li>
</ul>
''')

UI = dict(app='Open KarteiDeck', toapp='To the app', more='Mehr zum Thema', more_en='More on this topic', faq='Frequently asked questions',
          home='Home', whatsnew='What’s new', legal='Legal notice', privacy='Privacy', contact='Contact', german='Deutsch', navlabel='More topics')

def _esc(s): return html.escape(s, quote=True)

def _head(title, desc, robots, url, path, de_path, extra=''):
    h = ['<meta charset="utf-8">', '<meta name="viewport" content="width=device-width, initial-scale=1">',
         '<title>%s</title>' % _esc(title), '<meta name="description" content="%s">' % _esc(desc),
         '<meta name="robots" content="%s">' % robots, '<meta name="theme-color" content="#c9a676">',
         '<link rel="icon" href="../icon.svg" type="image/svg+xml">', '<link rel="alternate icon" href="../favicon.ico" sizes="48x48">',
         '<link rel="apple-touch-icon" href="../apple-touch-icon.png">', '<link rel="stylesheet" href="../seiten.css">',
         '<meta property="og:type" content="article">', '<meta property="og:site_name" content="%s">' % NAME, '<meta property="og:locale" content="en_GB">',
         '<meta property="og:title" content="%s">' % _esc(title), '<meta property="og:description" content="%s">' % _esc(desc),
         '<meta name="twitter:card" content="summary_large_image">']
    if url:
        me = '%s/en/%s' % (url, '' if path == 'index.html' else path); de = url + '/' + de_path
        h += ['<link rel="canonical" href="%s">' % me, '<meta property="og:url" content="%s">' % me,
              '<meta property="og:image" content="%s/vorschau.png">' % url, '<meta name="twitter:image" content="%s/vorschau.png">' % url,
              '<link rel="alternate" hreflang="en" href="%s">' % me, '<link rel="alternate" hreflang="de" href="%s">' % de, '<link rel="alternate" hreflang="x-default" href="%s">' % de]
    return '\n'.join(h) + extra

def faq_html(items):
    return ('<section class="faq" aria-labelledby="faqh"><h2 id="faqh">%s</h2>\n' % UI['faq'] + '\n'.join('<h3>%s</h3><p>%s</p>' % (_esc(q), _esc(a)) for q, a in items) + '\n</section>')

def faq_ld(items):
    return '<script type="application/ld+json">' + json.dumps({'@context': 'https://schema.org', '@type': 'FAQPage', 'mainEntity': [
        {'@type': 'Question', 'name': q, 'acceptedAnswer': {'@type': 'Answer', 'text': a}} for q, a in items]}, ensure_ascii=False) + '</script>'

def page(path, title, desc, robots, url, h1, body, de_path, app, kt, extra_nav=True, faq=None, extra_head=''):
    more = ''
    if faq: body = body.strip() + '\n' + faq_html(faq)
    if extra_nav:
        links = ''.join('<li><a href="%s.html">%s</a></li>' % (p_['slug'], _esc(p_['nav'])) for p_ in [dict(slug=SLUG[p['de']], nav=p['nav']) for p in PAGES] if p_['slug'] + '.html' != path)
        more = '<nav class="more" aria-label="%s"><h2>%s</h2><ul>%s</ul></nav>' % (UI['navlabel'], UI['more_en'], links)
    cta = '<p class="cta"><a class="btn primary" href="%s">%s</a></p>' % (app, UI['app']) if extra_nav else ''
    de_link = (url + '/' + de_path) if url else '../' + de_path
    return ('<!DOCTYPE html>\n<html lang="en">\n<head>\n' + _head(title, desc, robots, url, path, de_path, extra_head) + '\n</head>\n<body>\n'
      '<div class="sheet">\n<header><a class="brand" href="index.html"><img src="../logo.svg" width="40" height="40" alt=""><b>%s</b></a><span class="hr"><a class="btn" href="%s" hreflang="de" lang="de">%s</a><a class="btn" href="%s">%s</a></span></header>\n'
      '<main>\n<h1>%s</h1>\n%s\n%s\n</main>\n%s\n'
      '<footer><a href="index.html">%s</a><a href="legal-notice.html">%s</a>%s<a href="privacy.html">%s</a><a href="whats-new.html">%s</a></footer>\n</div>\n%s</body>\n</html>\n'
      ) % (NAME, de_link, UI['german'], app, UI['toapp'], _esc(h1), body.strip(), cta, more, UI['home'], UI['legal'],
           '<a href="contact.html">%s</a>' % UI['contact'] if kt else '', UI['privacy'], UI['whatsnew'], '<script src="../kontakt.js"></script>\n' if path == 'contact.html' else '')

# ---- Rechtstexte: dieselbe Quelle wie die deutschen (vorlage.html), Übersetzung über das Wörterbuch der App (en.json) ----
import re, pathlib
def _dict():
    return json.loads((pathlib.Path(__file__).parent / 'en.json').read_text(encoding='utf8'))['exact']
def _n(t): return re.sub(r'\s+', ' ', t).strip()
def translate_html(t):
    D = _dict(); miss = []
    def block(m):
        inner = m.group(3); k = _n(inner)
        if k in D: return '<%s%s>%s</%s>' % (m.group(1), m.group(2), D[k], m.group(1))
        def seg(s):
            x = s.group(1); kk = _n(x)
            if not kk: return s.group(0)
            if kk in D: return '>' + D[kk] + '<'
            if re.search(r'[A-Za-zÄÖÜäöüß]{3,}', kk): miss.append(kk)
            return s.group(0)
        return '<%s%s>%s</%s>' % (m.group(1), m.group(2), re.sub(r'>([^<>]+)<', seg, '>' + inner + '<')[1:-1], m.group(1))
    t = re.sub(r'<(p|li|h2|h3|dd|dt)([^>]*)>(.*?)</\1>', block, t, flags=re.S)
    return t, miss

def build(root, vorlage, url, anbieter, konto_on, api, seiten, kontakt_html=None):
    """Schreibt en/*.html. seiten ist das Modul seiten.py (Rechtstexte, Konto-Prüfung)."""
    en = pathlib.Path(root) / 'en'; en.mkdir(exist_ok=True)
    app = '../?lang=en' if url else '../karteikarten.html?lang=en'
    kt = bool(konto_on and api); n = 0; allmiss = []
    def put(name, **kw):
        nonlocal n
        (en / name).write_text(page(name, app=app, kt=kt, url=url, **kw), encoding='utf8'); n += 1
    put('index.html', title=HOME['title'], desc=HOME['desc'], robots='index, follow, max-image-preview:large', h1=HOME['h1'], body=HOME['body'], de_path='', extra_nav=False)
    for p in PAGES:
        put(SLUG[p['de']] + '.html', title=p['title'], desc=p['desc'], robots='index, follow, max-image-preview:large', h1=p['h1'], body=p['body'], de_path=p['de'] + '.html', faq=FAQ.get(p['de']),
            extra_head=''.join(['\n' + faq_ld(FAQ[p['de']])] if url and FAQ.get(p['de']) else []))
    hb = '\n'.join('<h2>%s</h2>\n%s' % (_esc(t), '\n'.join('<h3>%s</h3><p>%s</p>' % (_esc(q), _esc(a)) for q, a in items)) for t, items in hilfe_groups())
    put('help.html', title=HILFE['title'], desc=HILFE['desc'], robots='index, follow, max-image-preview:large', h1=HILFE['h1'], body=hb, de_path='hilfe.html',
        extra_head=('\n' + faq_ld([q for _, g in hilfe_groups() for q in g])) if url else '')
    import json
    MON = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
    def dat(d):
        if not d: return ''
        y, m, t = map(int, d.split('-')); return ' <small>%d %s %d</small>' % (t, MON[m - 1], y)
    L = json.loads((pathlib.Path(__file__).parent / 'neu.json').read_text(encoding='utf8'))
    nb = '\n'.join('<h2>Version %s%s</h2>\n<ul>%s</ul>' % (v['v'], dat(v['datum']), ''.join('<li>%s</li>' % _esc(x) for x in v['en'])) for v in L)
    put('whats-new.html', title='What’s new – KarteiDeck', desc='What’s new in KarteiDeck: every version with the most important changes.', robots='index, follow, max-image-preview:large', h1='What’s new', body=nb, de_path='neu.html', extra_nav=False)
    for de, dlg, title, h1 in [('impressum', 'impDlg', 'Legal Notice – KarteiDeck', 'Legal notice'), ('datenschutz', 'dsDlg', 'Privacy – KarteiDeck', 'Privacy')]:
        body, fill = seiten._legal(vorlage, dlg, anbieter, konto_on, raw=True)
        body, miss = translate_html(body); allmiss += miss
        body = re.sub(r'<span class="lf" data-a="(\w+)"></span>', fill, body)
        body = '<p class="sub">This is a translation for convenience. The German version is the binding one.</p>\n' + body
        put(SLUG[de] + '.html', title=title, desc=title, robots='noindex, follow', h1=h1, body=body, de_path=de + '.html', extra_nav=False)
    if kt and kontakt_html:
        put('contact.html', title='Contact – KarteiDeck', desc='Contact form of KarteiDeck', robots='noindex, follow', h1='Contact', body=kontakt_html, de_path='kontakt.html', extra_nav=False)
    return n, sorted(set(allmiss))

def kontakt(api, mail):
    nos = ('<noscript><p>The form needs JavaScript. You can also reach us by email: %s</p></noscript>' % _esc(mail)) if mail else '<noscript><p>The form needs JavaScript.</p></noscript>'
    return ('<p>Question, bug or idea? Write to us. The details go only to us and are used to reply.</p>\n'
      '<form id="kf" data-api="%s" data-lang="en" novalidate>\n'
      '<label for="kname">Name</label><input type="text" id="kname" autocomplete="name" placeholder="Your name" maxlength="80" required>\n'
      '<label for="kmail">Email</label><input type="email" id="kmail" autocomplete="email" placeholder="For the reply" maxlength="190" required>\n'
      '<label for="kmsg">Message</label><textarea id="kmsg" placeholder="What would you like to tell us?" maxlength="2000" rows="7" required></textarea>\n'
      '<input type="text" id="khp" class="hp" tabindex="-1" autocomplete="off" aria-hidden="true" placeholder="Do not fill in">\n'
      '<p class="err" id="kerr" role="alert"></p>\n'
      '<p class="hint">More in the <a href="privacy.html">privacy policy</a>.</p>\n'
      '<button class="btn primary" type="submit" id="ksend">Send</button>\n</form>\n'
      '<p id="kdone" role="status" hidden></p>\n%s') % (_esc(api), nos)
