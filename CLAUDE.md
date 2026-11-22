# CLAUDE.md – KarteiDeck (karteideck.de)

Offline-Karteikarten-App: eine HTML-Datei plus PHP-Backend (Konto, Abgleich, Kontaktformular, Mails). Repo: https://github.com/Exulizer/Karteikarten. Antworten und Texte auf Deutsch, kurz, ohne KI-Floskeln.

Zusätzlich gilt die Karpathy-CLAUDE.md: erst denken und Annahmen nennen, einfach halten, nur das Nötige ändern (chirurgisch), Ziele mit einer Prüfung belegen.

## Aufbau

- `quelle/` ist die Wahrheit: `vorlage.html`, `kartenbox.css`, `kartenbox.js`, `pro.js`, `en.json`, `neu.json`, `bauen.py`, `seiten.py`, `seiten_en.py`. Gebaute Dateien (`karteikarten.html`, `app.js`, `sw.js`, `version.json`, `en/`, statische Seiten) nie von Hand ändern.
- `python3 quelle/bauen.py` baut alles. Online-Build (mit `seite.url`): `app.js?v=hash` extern, weil die CSP Inline-Skripte verbietet. Offline-/GitHub-Build: alles in einer HTML-Datei.
- `einstellungen.js` gehört dem Betreiber (Impressum, Konto-Schalter) und wird auf dem Server direkt bearbeitet. Nie in `app.js` einbacken, nie überschreiben.
- Backend: `api/index.php` (Aktionen), `api/inc/app.php` (Mail, Helfer), `api/inc/store.php` (`FileStore`, `PdoStore`). Schlüssel `config.local.php` und `.htaccess`-Sperren nie ausliefern.

## Auslieferung

- Änderungen immer als ZIP `karteideck/` mit **nur den geänderten Dateien** in ihrer Ordnerstruktur. Der Betreiber lädt 1:1 per FTP hoch und lädt mit Strg+F5 neu. Dazu sagen, was wohin kommt.
- Nach einer Änderung an `quelle/`: neu bauen, geänderte Dateien (`karteikarten.html`, `app.js`, `version.json`, `sw.js`, ggf. `api/…`, `.htaccess`) ins ZIP. Zusätzlich GitHub-Stand neu bauen und als `github-<version>.zip` liefern. `CHANGELOG.md` pflegen.
- Datenbankänderungen nennen und die SQL-Zeilen für phpMyAdmin dazulegen.

## Harte Regeln für die Oberfläche

- Keine Browser-Popups (`alert`, `confirm`, `prompt`). Meldungen und Bestätigungen als eigene Dialoge im Seitendesign.
- Nichts überlappt, auch nicht auf Handy und Tablet. Responsiv, ohne überladen zu wirken.
- Öffnen/Schließen und Mouseover/Mouseout sind animiert, in beide Richtungen. Nichts „ploppt“ auf. Ausnahme: die Aufkleber im linken Feld bleiben statisch.
- Alles selbst gehostet: keine CDNs, keine Google Fonts, keine Fremdskripte.
- Icons von Menschen gestaltet (z. B. Font Awesome Free als Open-Source-Set), keine KI-Icons.
- Formularfelder und Dropdowns sehen nie leer aus: Platzhalter oder Hinweis. Browser-Standard-Dropdowns nur gestaltet.
- Scrollbalken nur dort, wo wirklich gescrollt wird (Listen, lange Panels), nicht bei Tab-Reihen und Werkzeugleisten.
- Kontrast in Hell und Dunkel prüfen (Text in Buttons, Feldern, Dropdowns).
- Wichtige Schritte und Hinweise sichtbar im Ablauf, nicht in zugeklappten Bereichen oder kleinem Grautext.
- Texte kurz. SEO-tauglich bleiben.

## Abgleich mit dem Konto (nicht kaputt machen)

- Lokal: `localStorage` `karteikarten-v2`. Abgleich-Stand: `kartenbox-abgleich` (Prüfsummen je Karte, kein Datenabzug).
- Kein Konflikt-Dialog. Dreiwege-Zusammenführung (`kMerge`): Löschungen bleiben, bei Änderung derselben Karte auf zwei Geräten bleiben beide Fassungen, Lernstand: höheres `n` gewinnt, Protokoll: Summe der Änderungen.
- Last auf der Datenbank niedrig halten: Senden erst nach 20 s Ruhe (spätestens 2 min), sofort beim Tab-Wechsel, beim Schließen nur ≤ 60 KB. Unveränderte Stände nicht senden (`K.sentHash`). Nachfrage alle 60 s nur mit `?a=rev`, nur bei sichtbarem Tab.
- Fehler: Wiederholen mit wachsendem Abstand (`kRetry`, 30 s bis 10 min), `online`-Ereignis löst sofort neuen Versuch aus, 401 wird nicht wiederholt. Daten über 7,5 MB: aktiv zum Export auffordern, nie still scheitern.
- Tab schließen (`pagehide`): Stand ≤ 60 KB als `save`, größer als `patch` (nur geänderte Karten, Löschungen, Protokolltage, Rubriken, Farben, Optionen; Revisionsprüfung wie `save`). Passt auch das nicht: bleibt lokal, geht beim nächsten Start raus. Start: erst `rev`, den ganzen Stand nur bei Abweichung. Wartezeit wächst mit der Größe (20 s/2 min bis 90 s/10 min). `Retry-After` wird beachtet.
- Löschschutz (`kShrinkN`, `kShrinkStop`): bei < 40 % der Karten des letzten gemeinsamen Stands (ab 10 Karten) nicht senden, erst fragen (Dialog `syncDlg`). Gilt für `kPush`, den Abgleich beim Start und `pagehide`.
- localStorage-Schlüssel nie doppelt benennen: `SKEY` = Einstellungen, `AKEY` = Abgleich-Stand. Ein Test muss belegen, dass beide nach dem Neustart getrennt bleiben (`/tmp/t/key.js`).
- Server: Revisionsprüfung, bei Abweichung 409. Ratenbegrenzung `dget`/`dput` je 120 pro 600 s.
- Frühere Stände (`kd_kdv`, `kdv_kind()` in `api/inc/store.php`): Sicherung beim Überschreiben, nie blockierend (Fehler werden verschluckt). Aktionen `versions` und `restore`. Neue Speicher-Logik muss `FileStore` und `PdoStore` gleich bedienen und mit `php /tmp/t/kdv_test.php`-artigen Tests (SQLite für `PdoStore`) belegt werden.

## Sprache und Skripte

- Online-Build: `en.js` (Wörterbuch, nur für Englisch geladen, `window.KB_EN`), `app.js`, `einstellungen.js`. `bauen.py` ersetzt die Platzhalter (`/*EN_DICT*/`, `/*EN_SRC*/`) **vor** dem Verkleinern. Neue deutsche Texte immer in `en.json` ergänzen (exakt oder Muster mit `{n}`/`{}`).
- Fortschritt liegt in `pro.js` (kommt als `api/inc/pro.js` vom Server). Änderungen dort gehören mit ins ZIP.

## Mails

`mail_html()` in `api/inc/app.php`: Tabellenlayout, Inline-Styles, 28-px-Zeilenraster, Farben als Farbe plus Verlauf (Gmail-Dunkelmodus), dunkle Fassung per `prefers-color-scheme`, keine Bilder, keine Drehung. Neue Mails über diese Funktion bauen.

## Leistung und Lighthouse

- Gemessen wird **im Inkognito-Fenster oder auf pagespeed.web.dev**. Im normalen Browser verfälschen Erweiterungen (Autofill, Passwort-Manager) TBT, „Minify“ und „Unused JS“ massiv. Ein Einzellauf sagt wenig: mindestens drei Läufe.
- Stand 22.11.2026 (PageSpeed Insights): Handy 100, Desktop 100.
- Bewährt: Footer erst bei `kd-ready` zeigen (CLS), Kompression und Caching in `.htaccess`, `<main>`, `body { display: flow-root }`, `content-visibility: auto` für Landing-Abschnitte, `app.js` vorladen, Überschriften ohne übersprungene Ebene, Tab-Marke erst lesen dann schreiben.
- Gemessen und verworfen: `defer` auf `app.js`/`einstellungen.js` (im normalen Browser schlechter, im Labor ohne Gewinn), Aufgaben in der Initialisierung zerlegen (kein Gewinn).

## Prüfen vor der Lieferung

1. Bauen und Syntax prüfen (`node -e "new Function(...)"` für JS, `php -l` für PHP, JSON laden).
2. Regressionstest der Oberfläche und der Konto-Abläufe (Testkonto über den Mock im Browser, `konto.test`).
3. Neue Funktion mit einem eigenen Test belegen (Zahl vorher/nachher), nicht nur „sieht gut aus“.
4. Sichtprüfung per Screenshot auf Handy- und Desktop-Breite, Hell und Dunkel.
5. Ehrlich trennen: **unabhängig belegt** (Google, echtes Postfach, echter Server) gegen **selbst getestet** (Labor, Mock). Was nicht geprüft wurde (echte Datenbank, echte Mailprogramme, echtes Handy, englische eingeloggte Abläufe), ausdrücklich sagen.

## Die vier Fragen (bei jeder Aufgabe)

1. Was würde ein Top-Profi hier tun, worum nicht gebeten wurde?
2. Mit welchem Rohmaterial würde er anfangen?
3. Welche Werkzeuge würde er benutzen?
4. Was beweist, außer Claude, dass das Ergebnis stimmt?

## Offene Punkte beim Betreiber

Zweigeräte-Test mit echten Konten, Test beim Tab-Schließen auf einem großen Deck, Mails in echten Mailprogrammen (Gmail-Dunkelmodus), `api/install.php` und `api/mailtest.php` löschen, Sicherung von `config.local.php`, altes DB-Passwort tauschen.
