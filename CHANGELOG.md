# Änderungen

## 1.2.0 (2026-11-11)
- Import: Dateiformat wird vor dem Lesen geprüft (nur CSV, TSV, TXT, JSON, höchstens 5 MB). Anki-Pakete (.apkg), leere Dateien und Binärdateien werden mit einem klaren Hinweis abgelehnt.
- Große Bildschirme (ab 2200 px) skalieren Blatt, Karten, Stifte und Zubehör mit.
- Vorabseite: Kartendrehung und wandernde Karte laufen auch bei „Bewegung reduzieren“.
- Startseite: Titel „KarteiDeck – Karteikarten online lernen, kostenlos“, genau eine H1, Breadcrumb-Daten auf den Themenseiten.
- Build verkleinert CSS, JS und HTML (esbuild, falls vorhanden). Die Quellen in `quelle/` bleiben lesbar.
- Ohne GitHub-Anfragen auf der Webseite: `connect-src 'self'` in der `.htaccess`. Die Update-Suche gibt es nur in der lokalen Datei.
- Lückentext: Knopf „Lücke“ im Anlegen- und Bearbeiten-Formular (Wort antippen oder markieren), Vorschau der Vorderseite, Lösung mit hervorgehobenen Wörtern.
- Neu mit Konto: Wortbank bei Lückentext (Optionen, Lernarten). Wörter antippen statt eintippen, zwei falsche Wörter zur Auswahl, Fehlversuche werden gezählt. Code in `quelle/pro.js`. Die Wortbank ist standardmäßig an (Optionen → Lernarten) und liegt am Computer unter den Zetteln, ohne etwas zu überdecken.
- Neu: Seite „Bald online“ im Ordner `vorab/` (Schreibtisch-Stil, Logo, umdrehbare Karte, wandernde Karteikarte, SEO, eigenes Impressum und Datenschutz).
- Kontakt-E-Mail info@karteideck.de eingetragen.
- Vorab-Seite: Schrift „Patrick Hand“ (SIL OFL, Lizenz `schrift-lizenz.txt`) wird lokal als `patrick-hand.woff` geladen, `font-src 'self'` in der `.htaccess`.

## 1.1.0

- Kontaktformular gehärtet: Rechenaufgabe im Browser (ohne Dienst von Dritten, `contact_pow_bits`), jede Aufgabe nur einmal gültig, Limits je IP, je E-Mail und am Tag, Duplikate werden nicht doppelt gesendet, höchstens zwei Links, unsichtbare und umkehrende Zeichen entfernt, Zeilenumbrüche in Mail-Kopfzeilen abgelehnt; eigene Seite `kontakt.html` (`kontakt.js`)
- Neuer Name KarteiDeck mit neuem Logo (fächerförmiger Kartenstapel): `icon.svg`, `logo.svg`, `logo-quer.svg`, App-Icons, `favicon.ico`, `apple-touch-icon.png`, Vorschaubild `vorschau.png`
- Eigene Seiten für Impressum und Datenschutz sowie fünf Themenseiten (ohne Anmeldung, offline, Leitner-System, Lückentext, Vokabeln), erzeugt von `bauen.py` aus `quelle/seiten.py`; Startseite mit H1 „Karteikarten online lernen“, Textlinks und `noscript`-Block; Hinweise „mit Konto“ bei Funktionen, die ein Konto brauchen
- SEO: Titel, Beschreibung, Open Graph, Twitter Card, JSON-LD (WebApplication), `robots.txt`, `sitemap.xml` (beim Bauen aus `seite.url` in `einstellungen.js`), Canonical; `/` liefert die App (`DirectoryIndex`), `api/` wird nicht indexiert
- Zusatzfunktionen (Statistik, Antwort tippen, Vorlesen, Kassettenplayer, Prüfung, Richtung) nur mit Konto: Der Code steht nicht in karteikarten.html, `api/index.php?a=pro` liefert ihn nur an angemeldete Konten (`api/inc/pro.js`, Quelle `quelle/pro.js`). Ohne Anmeldung sind die Funktionen aus, auch wenn jemand die Einstellungen von Hand ändert
- Konto und Abgleich (PHP, optional): Registrieren, E-Mail bestätigen, Anmelden, Passwort ändern und zurücksetzen, Konto löschen; Karten, Lernstand und Optionen werden pro Konto gespeichert; Konflikt-Dialog; Kontaktformular; `api/`, `.htaccess`
- Impressum und Datenschutz als Dialoge (Fußzeile und Startseite), Angaben in `einstellungen.js` unter `anbieter`; Startseite nennt das geplante Konto
- Startseite als Blatt auf dem Schreibtisch mit Ablauf, Funktionen, Datenhinweis und Fragen; Einstellung `start.seite`: immer, taeglich, einmal, aus
- Lückentext mit `{{Wort}}`
- Antwort tippen mit Prüfung (Groß/Klein, Akzente und kleine Tippfehler egal)
- Rückwärts und gemischt lernen
- Prüfungsmodus mit Note und Zeit
- Vorlesen mit der Gerätestimme (offline)
- Bilder zur Frage, Tags, Suche in allen Karten
- Doppelte Fragen werden gemeldet
- Import von CSV, Anki-Textexport und Quizlet, Export als CSV
- Drucken als Bogen mit Frage und Lösung
- Statistik mit 14-Tage-Diagramm, Kalender mit Stempeln, Karteikasten, schwersten Karten
- Rubriken haben eigene Farben (beim Anlegen wählbar, später änderbar): Punkt an Rubrik und Karten, Streifen oben auf der Karte
- Vorlesen sucht die passende Stimme und zeigt in den Optionen, ob eine da ist; „Stimme testen“
- Notizzettel und Taschenrechner rutschen am großen Bildschirm 0,9 s nach dem Laden unter der Unterlage hervor, bei „Demo aus“ rutschen sie wieder hinein und die Unterlage gleitet sanft nach oben (ohne Flackern an der Kante); Notizzettel und Rechner starten dabei zeitlich versetzt (zufällig)
- Statistik-Demo (Optionen > Lernstand): Beispieldaten, schließt nach 2 Minuten von selbst, eigene Daten bleiben unberührt
- Beim ersten Öffnen am Tag: kurzer Hinweis „Bereit für heute?“ mit Weg zu den Optionen (kein Muss)
- Auto-Modus: Kassettenplayer (Optionen, nur am Computer, Standard aus). Am großen Bildschirm rutscht er beim Lernen rechts unter der Unterlage hervor und bleibt auf dem Tisch (kleiner: neben der großen Karte); spielt Fragen und Lösungen endlos in Reihe oder per Zufall ab, zum Einprägen; Sekunden pro Seite einstellbar, das Display zählt die Zeit herunter
- Statistik neu: nur Lerntage mit Daten, bunt nach Rubrik, Tage antippbar (zeigt die gelernten Karten mit Gewusst/Nochmal), Lernkurve, auch über Optionen > Lernstand erreichbar. Die Karten pro Tag werden ab jetzt mitgespeichert, ältere Tage zeigen nur Zahlen
- Demo bringt eigene Rubriken mit Farben mit (Mathe, Physik …) und lässt sich danach filtern; mit „Demo aus“ sind sie wieder weg
- Mehr Abstand zwischen Schaltern
- Hinweis bei Karten, die dreimal in Folge „Nochmal“ waren

## 1.0.1

- Navigation mit Symbolen und gleitender Markierung, Logo führt zur Startseite
- Am großen Bildschirm: Notizzettel und Taschenrechner als Zubehör neben dem Feld
- Filterleiste klebt oben und rückt in die Mitte, auch am Handy
- Untere Leiste bleibt am Handy fest unten
- Nummern am Fächer gehören zur Karte und stimmen nach Mischen
- Sehr schmale Fenster ohne Überlauf

## 1.0.0

Erste Version.

- Karteikarten im Fächer auf dem Schreibtisch, Fächer, Lernstand, Demo
- Gewusst, Nochmal mit Ablage, Anheften, Marker
- Karten speichern, laden, teilen
- Hilfe mit FAQ und Datenschutz
- Läuft offline als einzelne HTML-Datei, auch auf dem Handy
- Update-Hinweis über GitHub (Desktop: Aktualisieren, sonst Link), abschaltbar
