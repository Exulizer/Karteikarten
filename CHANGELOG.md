# Änderungen

## 1.7.0 (2026-11-22): Löschschutz, Ladezeit, Fortschritt, Mail erneut senden

- **Fehler behoben (wichtig):** Zwei Variablen hießen `SKEY`. Dadurch landeten gespeicherte Einstellungen unter dem Schlüssel des Abgleich-Stands, und der Abgleich-Stand ging verloren (Folge: beim Start kein gemeinsamer Stand, gelöschte Karten konnten einmal zurückkommen, Einstellungen sprangen auf einen älteren Stand). Jetzt eigener Schlüssel `AKEY`. Browser, die schon betroffen sind, werden beim Start automatisch gerettet.
- Löschschutz: Fehlen hier plötzlich mehr als 60 % der Karten gegenüber dem letzten gemeinsamen Stand (mindestens 10 Karten), wird nicht still ins Konto geschrieben. Es erscheint eine Rückfrage: Konto-Stand laden oder im Konto auch löschen. Beim Schließen des Tabs wird in dem Fall nichts gesendet.
- Ladezeit: Das Englisch-Wörterbuch liegt im Online-Build in `en.js` und wird nur für Englisch geladen. `app.js` 194 → 132 KB. Offline-/GitHub-Build bleibt eine Datei.
- Fortschritt: Serie mit einem freien Tag pro Woche, Vorschau „Fällig in den nächsten 7 Tagen“, „Schwerste Karten“ je Rubrik (aus dem Lernprotokoll, mindestens 3 Versuche und 40 % falsch, Klick öffnet die Karte), Jahresraster in der Jahresansicht.
- Konto-Fenster: die vier Knöpfe stehen als Raster nebeneinander (ohne Überlappung). Die Statuszeile zeigt „Automatisch abgeglichen um …“, nach „Jetzt abgleichen“ „Abgeglichen um …“, und ist beim Öffnen sofort gefüllt.
- Anmeldung: Ist die Adresse nicht bestätigt, erscheint „Bestätigungsmail erneut senden“. Neue Aktion `resend-verify` (je Adresse 3 pro Stunde, je Anschluss 5 pro Stunde, Antwort immer gleich).

## Ausfallsicherheit bei vielen Nutzern

- Tab schließen bei großen Konten: nur die Änderungen gehen per neuer Aktion `patch` an den Server (vorher blieb der Stand lokal bis zum nächsten Start).
- Seitenstart fragt zuerst nur die Revision ab; der ganze Stand wird nur bei Abweichung geladen.
- Wartezeit vor dem Senden wächst mit der Kontogröße, `Retry-After` des Servers wird beachtet.
- Stempel „Neu“: auf der Seite „Was ist neu“ am neuesten Eintrag (`seiten.css` `.neu`), in der App am Fußzeilen-Link, bis er einmal angetippt wurde (`kb-neu-gesehen` in localStorage, Version kommt aus `version.json` über `/*NEUV*/`).

## 1.6.0 (2026-11-20)
- Profilbilder: 10 Stufen (Neuling, Leser, Dranbleiber, Sammler, Wochenstern, Meister, Profi, Eiserne Serie, Gelehrter, Legende). Berechnung in `pro.js` aus Lernprotokoll und Karten, nur die höchste erreichte Stufe liegt in `localStorage` (`kartenbox-profil`). Meister/Gelehrter/Legende zählen alternativ 50/65/80 % der eigenen Karten (mindestens 20 zählen).
- Anzeige: Karte in Fortschritt (mit Treppe und Galerie), Bild im Konto-Knopf, Bild und Stufe im Konto-Fenster, Zettel bei neuer Stufe.
- Abgleich: Kein Konflikt-Dialog mehr. Beim Abgleich werden Karten, Lernprotokoll, Rubriken und Optionen mit dem letzten gemeinsamen Stand (Prüfsummen in `localStorage` `kartenbox-abgleich`) zusammengeführt: Löschungen und Änderungen beider Geräte bleiben, Üben am selben Tag addiert sich, bei Änderung derselben Karte auf zwei Geräten bleiben beide Fassungen. Ungesendete Änderungen gehen beim Schließen nicht verloren, sie werden beim nächsten Start gesendet.
- Weniger Last auf Server und Datenbank: gesendet wird erst nach 20 Sekunden Ruhe (spätestens nach 2 Minuten), beim Wechsel des Tabs sofort, beim Schließen nur kleine Stände. Unveränderte Stände werden nicht gesendet. Die Nachfrage alle 60 Sekunden nutzt neu `?a=rev` (nur die Revisionsnummer, kein Schreiben in `hits`) und lädt den ganzen Stand nur bei Änderung. Vor jedem Senden merkt sich der Browser den Stand, so zählt eine verlorene Antwort nichts doppelt. Neu in `api/`: `index.php` (Aktion `rev`) und `inc/store.php` (`getRev`).
- Mails neu gestaltet (`mail_html()` in `api/inc/app.php`): Karteizettel wie im Konto-Fenster (blaue Linien, roter Rand) auf dem Blaugrau der App, Stempel-Knopf auf Textmarker, Link in Schreibmaschinenschrift; dunkle Fassung für Mailprogramme, die den Dunkelmodus melden. Die Nachricht aus dem Kontaktformular kommt jetzt auch im Zettel-Look (vorher nur Text), mit „Antworten“-Knopf. „Du hast schon ein Konto“ kürzer.
- Schneller und ruhiger laden (Lighthouse Handy: Layout-Verschiebung 0,14): Die Fußzeile erscheint erst, wenn die App aufgebaut ist, und springt nicht mehr nach unten. `app.js` wird schon im Kopf der Seite vorgeladen (`rel=preload`). `.htaccess`: Kompression (HTML, Stile, Skripte; spart etwa zwei Drittel der Übertragung) und langes Caching für `app.js` (Adresse trägt den Hash) und Bilder.
- Lighthouse: `einstellungen.js` steht nicht mehr im Kopf der Seite, sondern vor `app.js` am Seitenende (blockiert das erste Zeichnen nicht, Reihenfolge bleibt; `defer` war messbar schlechter). Hauptbereich als `<main>` ausgezeichnet (Barrierefreiheit).
- Startseite (Landing): Abschnitte außerhalb des Bildschirms werden erst beim Heranscrollen gerendert (`content-visibility: auto`), das senkt die Blockierzeit auf dem Handy (Labor: TBT Median 117 → 85 ms).
- `.htaccess`: `einstellungen.js` bekommt 4 Stunden Cache (Lighthouse „Use efficient cache lifetimes“).
- Lighthouse (Handy): Überschriften der Startseite folgen jetzt der Reihenfolge H1 → H2 → H3 (vorher H1 → H3). Die Tab-Marke liest erst die Maße und schreibt dann (kein erzwungenes Layout), beim Start und bei Größenänderung springt sie ohne Gleiten an ihren Platz (keine Breiten-Animation beim Laden). Der Fahnenglanz am Sprachknopf startet erst nach 12 s.
- `body { display: flow-root }`: der Außenabstand von `.wrap` kollabiert nicht mehr durch `body`, dadurch springt der Text beim Laden am Desktop nicht mehr um 24 px (CLS) und die Seite hat keine überflüssigen 24 px Scroll mehr.
- Abgleich ausfallsicherer: Nach einem Fehler wiederholt die App mit wachsendem Abstand (30 s, 1, 2, 4 … höchstens 10 Minuten, leicht gestreut) statt alle 30 s. Kommt das Netz zurück, wird sofort neu versucht. Die Statuszeile nennt den nächsten Versuch. Eine abgelaufene Anmeldung (401) wird nicht mehr endlos wiederholt, sondern fragt nach neuer Anmeldung. Änderungen während der Wartezeit warten auf den nächsten Versuch und umgehen den Abstand nicht.
- Frühere Stände (Ausfallschutz): Der Server sichert beim Überschreiben den alten Konto-Stand, nämlich höchstens alle 6 Stunden (die letzten 4) und sofort, wenn der neue Stand unter 60 % des alten schrumpft (höchstens alle 10 Minuten, die letzten 4, getrennt aufbewahrt, damit viele kleine Löschungen die guten Stände nicht verdrängen). Im Konto-Fenster: „Frühere Stände“ mit Datum und Kartenzahl, Zurückholen mit Rückfrage; der jetzige Stand wird dabei selbst gesichert. Die Sicherung kopiert in der Datenbank (`INSERT … SELECT`) und kann das Speichern nie verhindern (jeder Fehler wird verschluckt). Tabelle `kd_kdv` entsteht automatisch (SQL in `api/schema.sql`). Neu in `api/`: `index.php` (Aktionen `versions`, `restore`) und `inc/store.php`.
- Zu große Datenmenge (über 7,5 MB): Meldung mit Aufforderung, die Karten mit „Karten speichern“ zu sichern.
- Fix aus 1.5.0: Konto-Dialog blieb unter dem Footer hängen (`position: relative` entfernt).

## 1.5.0 (2026-11-20)
- Konto-Dialog (Anmelden, Registrieren, Konto, Passwort vergessen/ändern, Nickname, Löschen) als Karteikarte: rote Kopflinie, blaue Zeilen, Lochung, Reiter „Anmelden | Neu hier“, Stempel „Angemeldet“, Felder als Linien mit animierter Fokuslinie, Font-Awesome-Symbole an Titel und Feldnamen (per CSS-Maske, kein neues Markup außer Reiter und Stempel). Reine Darstellung, die Logik in `accView()` ist nur um Reiter und `data-view` ergänzt.
- Neue Texte in `en.json`: „Neu hier“, „Angemeldet“.

## 1.4.1 (2026-11-20)
- Farben: Neue Variable `--edge` für Ränder von Feldern, Knöpfen, Schaltern und Augen-Knopf (mindestens 3:1 in Hell und Dunkel). Trennlinien im Layout bleiben dezent (`--line`).
- Fortschritt nach Rubriken: „gewusst“ blau (`--p-ok`), „nochmal“ orange mit Streifen (`--p-bad`), auch in der Legende. Grün/Rot war bei Rot-Grün-Schwäche kaum zu trennen.
- Warntext (`--bad`) dunkler in Hell, heller in Dunkel.

## 1.4.0 (2026-11-20)
- Handy (bis 600 px): Die Leiste hat fünf Tabs. Nur der aktive zeigt seinen Namen und klappt animiert auf, die Tippflächen sind 48 px hoch. Rubriken liegen als Umschalter „Karten | Rubriken“ im Karten-Tab (`.catseg`, `syncTabs()` in `kartenbox.js`). Am Desktop und Tablet bleibt die Leiste wie bisher.
- Sprachknopf oben neben „Demo“ (`#hdLang`, EN/DE). Der Wechsel lädt neu, bleibt aber auf dem aktuellen Tab, öffnet die Startseite nicht und blendet kurz aus und ein. Ein durchsichtiger Fahnenverlauf läuft einmal pro Minute schräg durch den Knopf. Die Sprachknöpfe im Fußbereich entfallen.
- Fortschritt: „Demo ansehen (2 Minuten)“ gibt es auch mit eigenen Daten, „Demo beenden“ und „Zu meinem Fortschritt“ führen zurück. In der lokalen Datei ohne Konto-System ist der Fortschritt frei, die Konto-Info erscheint nur online.
- Optionen: Gruppenüberschriften mit Farbbalken, größerer Schrift und Trennlinie.
- Neue Seite „Was ist neu“ (`neu.html`, englisch `en/whats-new.html`). Die Einträge stehen in `quelle/neu.json` (Deutsch und Englisch), Link im Footer der App und der Themenseiten, in Sitemap und `llms.txt`. Nur online.
- Fortschritt-Titel, Monate und Wochentage in der englischen Fassung auf Englisch.

## 1.3.0 (2026-11-19)
- Neu: Tab „Fortschritt“ ersetzt die Statistik (nur mit Konto, Code in `quelle/pro.js`). Tag, Monat und Jahr mit Pfeilen, Tagesziel-Balken mit Siegel, Kalender mit Stempeln, Jahresbalken, Aufstellung nach Rubriken mit „gemeistert“. Neues Kartenfeld `mst` (Zeitpunkt, wann eine Karte Fach 5 erreicht). Ohne Konto eine Info, mit leerem Lernprotokoll eine Demo.
- Tagesziel-Leiste auf der Lernen-Seite.
- Komplett auf Englisch: Die App übersetzt sich über ein Wörterbuch (`quelle/en.json`, eingebettet beim Bauen), gewählt per `?lang=en` oder Sprachknopf. Eigene Karten bleiben unübersetzt. Englische Seiten liegen in `en/` (Start, fünf Themenseiten, Hilfe, Impressum, Datenschutz, Kontakt) und werden von `quelle/seiten_en.py` gebaut. hreflang-Verweise und Sitemap enthalten beide Sprachen. Die englischen Rechtstexte sind eine Übersetzung zur Orientierung, es gilt die deutsche Fassung.
- Kontaktformular: Meldungen auch auf Englisch (`data-lang="en"`).

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
