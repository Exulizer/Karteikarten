<?php
declare(strict_types=1);
if (!is_file(__DIR__ . '/install.on')) { http_response_code(404); exit; }   // nur nutzbar, solange du die leere Datei install.on im Ordner api/ angelegt hast
/* KarteiDeck: Einrichtung der Datenbank (einmalig).
   Ablauf: hochladen, im Browser öffnen, Passwort eingeben, Verbindung testen, installieren.
   Danach die Datei löschen (Knopf am Ende oder per FTP). Das Passwort wird nur in config.local.php geschrieben. */

header('Cache-Control: no-store');
header('X-Robots-Tag: noindex, nofollow');
header('X-Frame-Options: DENY');
header('Referrer-Policy: no-referrer');
/* CSP kommt aus api/.htaccess (überschreibt die Regeln des Hauptordners) */

const PRE = 'kd_';   // Präfix: die Datenbank von svender3d.de wird mitbenutzt, fremde Tabellen bleiben unberührt
const TABLES = ['kd_users', 'kd_tokens', 'kd_kdata', 'kd_hits'];
const SCHEMA = [
    'kd_users' => "CREATE TABLE kd_users (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(190) NOT NULL,
  pw VARCHAR(255) NOT NULL,
  pwv INT NOT NULL DEFAULT 1,
  verified TINYINT NOT NULL DEFAULT 0,
  created INT UNSIGNED NOT NULL,
  nick_h CHAR(64) NULL,
  nick_e VARCHAR(255) NULL,
  UNIQUE KEY uq_email (email),
  UNIQUE KEY uq_nick (nick_h)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",
    'kd_tokens' => "CREATE TABLE kd_tokens (
  hash CHAR(64) NOT NULL PRIMARY KEY,
  kind VARCHAR(16) NOT NULL,
  uid INT UNSIGNED NOT NULL,
  exp INT UNSIGNED NOT NULL,
  KEY ix_uid (uid)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",
    'kd_kdata' => "CREATE TABLE kd_kdata (
  uid INT UNSIGNED NOT NULL PRIMARY KEY,
  rev INT UNSIGNED NOT NULL,
  body MEDIUMTEXT NOT NULL,
  updated INT UNSIGNED NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",
    'kd_hits' => "CREATE TABLE kd_hits (
  k VARCHAR(100) NOT NULL,
  ts INT UNSIGNED NOT NULL,
  KEY ix_k (k, ts)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",
];

function h(string $s): string { return htmlspecialchars($s, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8'); }
function post(string $k, string $d = ''): string { return isset($_POST[$k]) && is_string($_POST[$k]) ? trim($_POST[$k]) : $d; }

$conf = __DIR__ . '/config.local.php';
$https = !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off';

/* CSRF: Cookie und Formularfeld müssen übereinstimmen */
$tok = (isset($_COOKIE['kdi']) && is_string($_COOKIE['kdi']) && preg_match('/^[a-f0-9]{32}$/', $_COOKIE['kdi'])) ? $_COOKIE['kdi'] : bin2hex(random_bytes(16));
setcookie('kdi', $tok, ['path' => '/', 'httponly' => true, 'samesite' => 'Strict', 'secure' => $https]);

$msgs = [];   // [ok|bad|info, Text]
$step = 'form';
$v = [
    'host' => post('host', 'junk.your-database.de'),
    'db'   => post('db', 'svende_db1'),
    'user' => post('user', 'svende_1'),
    'url'  => post('url', 'https://karteideck.de'),
    'from' => post('from', 'noreply@karteideck.de'),
    'to'   => post('to', 'info@karteideck.de'),
];
$action = post('a');

if (is_file($conf) && $action !== 'del') {
    $step = 'done-before';
} elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!hash_equals($tok, post('t'))) {
        $msgs[] = ['bad', 'Die Sitzung ist abgelaufen. Seite neu laden und noch einmal versuchen.'];
    } elseif ($action === 'del') {
        $ok = @unlink(__FILE__);
        $step = $ok ? 'deleted' : 'done';
        if (!$ok) $msgs[] = ['bad', 'Löschen ging nicht. Bitte install.php per FTP löschen.'];
    } else {
        $pass = isset($_POST['pass']) && is_string($_POST['pass']) ? $_POST['pass'] : '';
        $bad = [];
        if (!preg_match('/^[A-Za-z0-9.\-]{1,100}$/', $v['host'])) $bad[] = 'Server';
        if (!preg_match('/^[A-Za-z0-9_\-]{1,64}$/', $v['db'])) $bad[] = 'Datenbank';
        if ($v['user'] === '' || strlen($v['user']) > 64) $bad[] = 'Benutzer';
        if ($pass === '') $bad[] = 'Passwort';
        if (!preg_match('~^https://[a-z0-9.\-]+$~i', $v['url'])) $bad[] = 'Adresse der Seite (https://… ohne Schrägstrich am Ende)';
        if (!filter_var($v['from'], FILTER_VALIDATE_EMAIL)) $bad[] = 'Absender-E-Mail';
        if (!filter_var($v['to'], FILTER_VALIDATE_EMAIL)) $bad[] = 'Empfänger-E-Mail';
        if ($bad) {
            $msgs[] = ['bad', 'Bitte prüfen: ' . implode(', ', $bad) . '.'];
        } elseif (!extension_loaded('pdo_mysql')) {
            $msgs[] = ['bad', 'Auf diesem Server fehlt die PHP-Erweiterung pdo_mysql. Im Hosting-Panel die PHP-Einstellungen prüfen.'];
        } else {
            $dsn = 'mysql:host=' . $v['host'] . ';dbname=' . $v['db'] . ';charset=utf8mb4';
            try {
                $db = new PDO($dsn, $v['user'], $pass, [
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_TIMEOUT => 6,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                ]);
                $ver = (string)$db->query('SELECT VERSION()')->fetchColumn();
                $msgs[] = ['ok', 'Verbindung steht. Server: ' . $ver . '.'];
                $have = [];
                foreach ($db->query('SHOW TABLES')->fetchAll(PDO::FETCH_COLUMN) as $t) $have[] = strtolower((string)$t);
                $clash = array_values(array_intersect(TABLES, $have));
                $reuse = false;
                if ($clash && count($clash) < count(TABLES)) {
                    $msgs[] = ['bad', 'In dieser Datenbank gibt es nur einen Teil der KarteiDeck-Tabellen: ' . implode(', ', $clash) . '. Ich fasse sie nicht an. Lösche sie in phpMyAdmin (nur die mit kd_) und starte neu.'];
                } elseif ($clash) {
                    /* Alle vier da: prüfen, ob sie zu KarteiDeck passen, dann nur die Konfiguration schreiben */
                    $want = ['kd_users' => ['id', 'email', 'pw', 'pwv', 'verified', 'created'], 'kd_tokens' => ['hash', 'kind', 'uid', 'exp'], 'kd_kdata' => ['uid', 'rev', 'body', 'updated'], 'kd_hits' => ['k', 'ts']];
                    $okcols = true;
                    foreach ($want as $n => $cols) {
                        $got = array_map('strtolower', $db->query("SHOW COLUMNS FROM `$n`")->fetchAll(PDO::FETCH_COLUMN));
                        if (array_diff($cols, $got)) $okcols = false;
                    }
                    if ($okcols) {
                        $reuse = true;
                    } else {
                        $msgs[] = ['bad', 'Die Tabellen kd_… gibt es schon, aber sie passen nicht zu KarteiDeck. Ich fasse sie nicht an.'];
                    }
                }
                if ($clash && !$reuse) {
                    /* Meldung steht oben */
                } elseif (!is_writable(__DIR__)) {
                    $msgs[] = ['bad', 'Der Ordner api/ ist nicht beschreibbar. Dann kann config.local.php nicht angelegt werden (Rechte 755 und richtiger Besitzer prüfen).'];
                } elseif ($action === 'test') {
                    $msgs[] = $reuse ? ['ok', 'Die KarteiDeck-Tabellen sind schon da und passen. „Installieren“ übernimmt sie und schreibt nur die Konfiguration.'] : ['ok', 'Alles bereit. Die Tabellen ' . implode(', ', TABLES) . ' sind frei, andere Tabellen der Datenbank bleiben unberührt. Zum Anlegen auf „Installieren“ klicken.'];
                } else {
                    $made = [];
                    try {
                        if (!$reuse) foreach (SCHEMA as $n => $sql) { $db->exec($sql); $made[] = $n; }
                        foreach (TABLES as $n) $db->query("SELECT COUNT(*) FROM `$n`")->fetchColumn();
                    } catch (Throwable $e) {
                        foreach ($made as $n) { try { $db->exec("DROP TABLE `$n`"); } catch (Throwable $e2) {} }
                        throw $e;
                    }
                    $cfg = [
                        'site_url'   => $v['url'],
                        'store'      => 'pdo',
                        'pdo_dsn'    => $dsn,
                        'pdo_user'   => $v['user'],
                        'pdo_pass'   => $pass,
                        'pdo_prefix' => PRE,
                        'mail_mode'  => 'php',
                        'mail_from'  => $v['from'],
                        'contact_to' => $v['to'],
                        'nick_key'   => bin2hex(random_bytes(32)),   // Schlüssel für die Nicknames. Nur hier, nie in der Datenbank. Mit config.local.php sichern.
                    ];
                    $php = "<?php\n// Von install.php angelegt. Nicht ins Git, nicht weitergeben (enthält das Datenbank-Passwort).\nreturn " . var_export($cfg, true) . ";\n";
                    if (file_put_contents($conf, $php, LOCK_EX) === false) {
                        foreach ($made as $n) { try { $db->exec("DROP TABLE `$n`"); } catch (Throwable $e2) {} }
                        throw new RuntimeException('config.local.php konnte nicht geschrieben werden.');
                    }
                    @chmod($conf, 0640);
                    $step = 'done';
                    $msgs[] = ['ok', $reuse ? 'Vorhandene Tabellen übernommen.' : 'Tabellen angelegt: ' . implode(', ', $made) . '.'];
                    $msgs[] = ['ok', 'config.local.php ist geschrieben.'];
                }
            } catch (PDOException $e) {
                $c = (int)($e->errorInfo[1] ?? 0);
                $why = match (true) {
                    $c === 1045 => 'Benutzer oder Passwort stimmen nicht.',
                    $c === 1044 => 'Dieser Benutzer darf die Datenbank nicht nutzen.',
                    $c === 1049 => 'Die Datenbank „' . $v['db'] . '“ gibt es nicht. Name prüfen.',
                    $c === 2002 || $c === 2006 => 'Der Server „' . $v['host'] . '“ antwortet nicht. Servername prüfen.',
                    $c === 1142 => 'Der Benutzer darf keine Tabellen anlegen (CREATE fehlt).',
                    default => 'Fehler ' . ($c ?: $e->getCode()) . '.',
                };
                $msgs[] = ['bad', $why];
            } catch (Throwable $e) {
                $msgs[] = ['bad', $e->getMessage()];
            }
        }
    }
}
?><!doctype html>
<html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow"><title>KarteiDeck einrichten</title>
<style>
:root{--bg:#e9e2d4;--paper:#fffdf6;--ink:#1c2330;--mut:#4a5468;--line:#c9c2b0;--ac:#1d3fc4;--ok:#0b6b3a;--bad:#a4161a;--okb:#e3f4ea;--badb:#fbe5e5}
@media (prefers-color-scheme:dark){:root{--bg:#171b24;--paper:#212733;--ink:#f1f3f8;--mut:#b4bccd;--line:#3b4457;--ac:#8fb0ff;--ok:#7be0a8;--bad:#ff9a9d;--okb:#17372a;--badb:#451c1e}}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);font:17px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif;padding:24px 16px}
main{max-width:560px;margin:0 auto;background:var(--paper);border:1px solid var(--line);border-radius:10px;padding:24px;box-shadow:0 6px 20px #0003}
h1{margin:0 0 4px;font-size:1.5rem}p{margin:.4em 0 1em;color:var(--mut)}
label{display:block;font-weight:700;margin:14px 0 4px}
input{width:100%;min-height:46px;padding:8px 12px;font:inherit;color:var(--ink);background:var(--bg);border:2px solid var(--line);border-radius:8px}
input:focus{outline:3px solid var(--ac);outline-offset:1px}
small{display:block;color:var(--mut);margin-top:3px}
.row{display:flex;gap:10px;flex-wrap:wrap;margin-top:20px}
button{flex:1 1 180px;min-height:48px;font:inherit;font-weight:700;border-radius:8px;border:2px solid var(--ac);cursor:pointer;background:transparent;color:var(--ac)}
button.main{background:var(--ac);color:#fff}
@media (prefers-color-scheme:dark){button.main{color:#10151f}}
.m{padding:10px 14px;border-radius:8px;margin:10px 0;font-weight:600}
.m.ok{background:var(--okb);color:var(--ok)}.m.bad{background:var(--badb);color:var(--bad)}.m.info{background:var(--bg)}
fieldset{border:1px solid var(--line);border-radius:8px;margin:18px 0 0;padding:0 14px 14px}legend{font-weight:700;padding:0 6px}
</style></head><body><main>
<h1>KarteiDeck einrichten</h1>
<?php foreach ($msgs as [$k, $t]) echo '<div class="m ', $k, '" role="status">', h($t), "</div>\n"; ?>

<?php if ($step === 'done-before'): ?>
<p>Die Einrichtung ist schon gemacht (<code>config.local.php</code> ist da). Zum Neueinrichten diese Datei zuerst löschen.</p>
<form method="post"><input type="hidden" name="t" value="<?= h($tok) ?>"><input type="hidden" name="a" value="del">
<div class="row"><button class="main" type="submit">install.php jetzt löschen</button></div></form>

<?php elseif ($step === 'done'): ?>
<p>Fertig. Letzter Schritt: diese Einrichtungsdatei löschen, sonst könnte sie jemand anderes aufrufen.</p>
<form method="post"><input type="hidden" name="t" value="<?= h($tok) ?>"><input type="hidden" name="a" value="del">
<div class="row"><button class="main" type="submit">install.php jetzt löschen</button></div></form>
<p>Danach in der App registrieren und einloggen. In <code>api/data/</code> legt die App beim ersten Start ihren Schlüssel an.</p>

<?php elseif ($step === 'deleted'): ?>
<div class="m ok">install.php ist gelöscht. Die Einrichtung ist abgeschlossen.</div>

<?php else: ?>
<p>Trage das Passwort deiner Datenbank ein, teste die Verbindung und installiere dann die Tabellen.</p>
<form method="post" autocomplete="off">
<input type="hidden" name="t" value="<?= h($tok) ?>">
<fieldset><legend>Datenbank</legend>
<label for="host">Server</label><input id="host" name="host" value="<?= h($v['host']) ?>" placeholder="z. B. junk.your-database.de" required>
<label for="db">Datenbank</label><input id="db" name="db" value="<?= h($v['db']) ?>" placeholder="Name der Datenbank" required>
<label for="user">Benutzer</label><input id="user" name="user" value="<?= h($v['user']) ?>" placeholder="Datenbank-Benutzer" required>
<label for="pass">Passwort</label><input id="pass" name="pass" type="password" placeholder="Passwort der Datenbank eingeben" autocomplete="new-password" required>
<small>Wird nirgends angezeigt, nur in config.local.php gespeichert.</small>
</fieldset>
<fieldset><legend>Seite und Mail</legend>
<label for="url">Adresse der Seite</label><input id="url" name="url" value="<?= h($v['url']) ?>" placeholder="https://karteideck.de" required>
<label for="from">Absender der Mails</label><input id="from" name="from" type="email" value="<?= h($v['from']) ?>" placeholder="noreply@karteideck.de" required>
<label for="to">Kontaktformular geht an</label><input id="to" name="to" type="email" value="<?= h($v['to']) ?>" placeholder="info@karteideck.de" required>
</fieldset>
<div class="row">
<button type="submit" name="a" value="test">Verbindung testen</button>
<button type="submit" name="a" value="install" class="main">Installieren</button>
</div></form>
<?php endif; ?>
</main></body></html>
