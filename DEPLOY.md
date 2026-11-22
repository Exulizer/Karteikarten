# KarteiDeck online stellen

Reihenfolge, wenn Name und Domain feststehen.

1. **Angaben eintragen** in `einstellungen.js` unter `anbieter` (Name, Straße, Ort, E-Mail, Hoster). Dann `python3 quelle/bauen.py` ausführen. Es meldet, was noch fehlt.
2. **Hochladen** per FTP: alles außer `quelle/`, `README.md`, `DEPLOY.md`, `CHANGELOG.md` (die sperrt `.htaccess` ohnehin).
2b. **Einrichtungs-Seiten** `api/install.php` und `api/mailtest.php` laufen nur, solange im Ordner `api/` eine leere Datei `install.on` bzw. `mailtest.on` liegt. Danach Datei und Skript wieder löschen.
3. **Datenordner anlegen** außerhalb des Web-Ordners, zum Beispiel neben `public_html`: `kartenbox-daten`. Rechte so, dass nur der Webspace-Benutzer schreiben darf.
4. **`api/config.local.php`** aus `config.local.php.example` kopieren und füllen: `site_url`, `mail_mode` auf `php`, `mail_from`, `contact_to`, `data_dir` auf den Ordner aus Schritt 3.
5. **HTTPS** einrichten (Zertifikat beim Hoster). Danach in `.htaccess` die zwei auskommentierten Blöcke einschalten (HTTPS-Weiterleitung und HSTS).
5b. **Zusatzfunktionen:** `api/inc/pro.js` muss mit hochgeladen sein (entsteht beim Bauen). `https://deine-domain/api/inc/pro.js` muss 403 liefern, `…/api/index.php?a=pro` ohne Anmeldung 401. In `einstellungen.js` `konto.test` auf false, dann steckt der Code nicht in der HTML (beim Bauen steht „nur auf dem Server“).
6. **Mail testen:** Konto registrieren, Bestätigungsmail muss ankommen (Spam-Ordner prüfen). Wenn nicht: SPF und DKIM für die Absender-Domain beim Hoster einrichten.
7. **Datenbank (optional):** In phpMyAdmin `api/schema.sql` einspielen, in `config.local.php` `store` auf `pdo` stellen und `pdo_dsn`, `pdo_user`, `pdo_pass` eintragen. Ohne Datenbank speichert die App in `store.json` im Datenordner. Das reicht für wenige Konten.
7b. **Frühere Stände:** Beim Überschreiben sichert der Server den alten Stand (Tabelle `kd_kdv`, wird beim ersten Speichern von selbst angelegt; `api/schema.sql` enthält die SQL-Zeilen, falls der Datenbank-Benutzer kein CREATE darf). Prüfen: nach zwei Speichervorgängen eines Kontos steht dort eine Zeile, und im Konto-Fenster zeigt „Frühere Stände“ sie an. Ohne Datenbank (`store` = `file`) liegen bis zu 4 + 4 Stände in `store.json`.
7c. **`en.js`:** Der Online-Build legt das Englisch-Wörterbuch in `en.js` ab (nur für Englisch geladen). Die Datei muss neben `app.js` liegen. `.htaccess` gibt beiden langes Caching, `sw.js` legt `en.js` zwischen.
7d. **Mail erneut senden:** Aktion `resend-verify` in `api/index.php`, keine Datenbankänderung. Ratenbegrenzung über die vorhandene Tabelle `hits`.
8. **PHP-Grenzen:** `post_max_size` mindestens 8M (Karten mit Bildern).
9. **Prüfen:** securityheaders.com, developer.mozilla.org/en-US/observatory, ssllabs.com/ssltest. Die CSP zuerst als `Content-Security-Policy-Report-Only` setzen.
10. **Testlauf** auf der Live-Seite: registrieren, bestätigen, anmelden, Karte anlegen, auf zweitem Gerät anmelden, Passwort vergessen, Konto löschen, Kontaktformular.
11. **Rechtliches:** Impressum und Datenschutz einmal lesen und prüfen lassen. Die Texte sind ein Entwurf.
12. **Sichern:** Datenordner (oder Datenbank) regelmäßig kopieren.

Startseite: `start.seite` in `einstellungen.js` steht auf `immer`. Für den Betrieb besser `taeglich` oder `einmal`.

## Suchmaschinen (SEO)

1. In `einstellungen.js` unter `seite.url` die fertige Adresse eintragen, zum Beispiel `https://deine-domain.de` (ohne Schrägstrich am Ende). Danach `python3 quelle/bauen.py` laufen lassen: Es entstehen Canonical, Vorschaubild-Links, `robots.txt` mit Sitemap und `sitemap.xml`.
2. Diese Dateien hochladen: `karteikarten.html`, `app.js` (nur mit gesetzter `seite.url`, dann liegt das Skript dort statt in der HTML), `impressum.html`, `datenschutz.html`, die fünf Themenseiten (`karteikarten-ohne-anmeldung.html`, `karteikarten-offline-lernen.html`, `leitner-system.html`, `lueckentext-karteikarten.html`, `vokabeln-lernen-karteikarten.html`), `neu.html`, der Ordner `en/` (englische Seiten), `llms.txt`, `seiten.css`, `robots.txt`, `sitemap.xml`, `vorschau.png`, `favicon.ico`, `apple-touch-icon.png`, `icon.svg`, `logo.svg`, `icon-192.png`, `icon-512.png`, `manifest.webmanifest`.
3. In der Google Search Console die Domain bestätigen, `sitemap.xml` einreichen und die Startseite mit „Indexierung beantragen“ anstoßen. Bing Webmaster Tools genauso.
4. Vorschau testen: Link in einem Messenger einfügen oder in den Prüfern der Netzwerke ansehen. Strukturierte Daten mit dem „Rich-Results-Test“ von Google prüfen.
5. Impressum und Datenschutz haben jetzt eigene Seiten (`noindex`, nicht in der Sitemap). Ihre Texte kommen aus `quelle/vorlage.html` und den Angaben unter `anbieter`, die Textseiten stehen in `quelle/seiten.py`.

## Kontaktformular

1. In `api/config.local.php` `contact_to` (Empfänger), `mail_from` (Absender auf deiner Domain) und `mail_mode` => 'php' setzen.
2. Für die Absender-Domain SPF, DKIM und DMARC beim Hoster einrichten, sonst landen Mails im Spam oder kommen nicht an.
3. `kontakt.html` und `kontakt.js` hochladen. Testen: Formular absenden, Mail muss ankommen; zweimal dieselbe Nachricht darf nur eine Mail ergeben.
4. Wird das Formular trotzdem mit Spam geflutet: `contact_pow_bits` auf 18 erhöhen. Das dauert für Besucher länger (etwa 4 bis 8 Sekunden).


## Vorab-Seite „Bald online“ (Ordner `vorab/`)

Solange die App noch nicht online ist, legst du **nur den Inhalt des Ordners `vorab/`** in das Hauptverzeichnis des Servers (inklusive der versteckten Datei `.htaccess`). Die Startseite ist dort `index.html`.

- Sie wird bei jedem `python3 quelle/bauen.py` neu erzeugt. Vorher in `einstellungen.js` unter `anbieter` Name, Straße, Ort und Hoster eintragen (E-Mail ist gesetzt), sonst steht im Impressum „[Angabe fehlt]“.
- Mit `seite.url` (z. B. `https://karteideck.de`) kommen Canonical, Vorschaubild und `sitemap.xml` dazu.
- Die Seite hat keine Skripte oder Stile im HTML und keine Fremdanbieter. Die CSP in `vorab/.htaccess` ist deshalb streng.
- **Beim Start:** Inhalt von `vorab/` vom Server entfernen und stattdessen das ganze Projekt hochladen (dort gilt `DirectoryIndex karteikarten.html`). Die Adresse `/` zeigt dann die App-Startseite.
- Nicht getestet: echter Apache, die Header, Mailversand.

## Englische Fassung und „Was ist neu“

- Die App wählt die Sprache über `?lang=en` oder `?lang=de` und merkt sie sich im Browser. Das Wörterbuch ist `quelle/en.json`. Neue deutsche Texte in der App brauchen dort einen Eintrag, sonst bleiben sie auf Englisch deutsch.
- `python3 quelle/bauen.py` schreibt den Ordner `en/` mit. Er gehört mit auf den Server. `sitemap.xml` nennt beide Sprachen mit hreflang. In der Search Console nach dem Upload die Sitemap neu einreichen.
- „Was ist neu“ kommt aus `quelle/neu.json` (neueste Version zuerst, je Version `de` und `en`). Bei jeder neuen Version dort einen Eintrag anlegen und die Versionsnummer in `quelle/version.json` erhöhen.

## Neue Version auf GitHub

1. `quelle/version.json` anpassen, `quelle/neu.json` und `CHANGELOG.md` ergänzen.
2. Für das Repo mit leeren Angaben in `einstellungen.js` bauen (`konto.api`, `seite.url` und `anbieter` leer). Das ergibt die lokale `karteikarten.html` mit allem eingebettet und die passende `version.json` mit Prüfsummen. Die Update-Funktion der App vergleicht gegen diese Datei.
3. Dateien ins Repo laden, Release mit der Version als Tag anlegen und den Text aus `RELEASE_x.y.z.md` einfügen. `kartenbox-x.y.z.zip` als Anhang hochladen.
