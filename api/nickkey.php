<?php
/* Einrichtung der Nicknames, einmalig. Aufruf: https://deine-domain/api/nickkey.php
   Die Seite zeigt zuerst nur den Stand (nichts wird geändert). Erst der Knopf „Jetzt einrichten“ schreibt:
   1. fehlende Spalten in der Datenbank anlegen (mit den Zugangsdaten aus config.local.php, kein eigenes Login nötig)
   2. einen Schlüssel in config.local.php eintragen (steht nur dort, wird nie angezeigt)
   Danach löscht sich diese Datei selbst. config.local.php mit sichern: ohne den Schlüssel sind Nicknames nicht lesbar. */
declare(strict_types=1);
header('Content-Type: text/html; charset=utf-8');
header('Cache-Control: no-store');
header("Content-Security-Policy: default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'");
$conf = __DIR__ . '/config.local.php';

function page(array $rows, string $foot = '', bool $button = false): never
{
    echo '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Nickname-Einrichtung</title>'
       . '<body style="font:16px/1.5 system-ui;max-width:40rem;margin:2rem auto;padding:0 1rem;color:#1b1f2a"><h1>Nickname-Einrichtung</h1><ul style="padding-left:1.2rem">';
    foreach ($rows as [$ok, $t]) echo '<li>' . ($ok === true ? '✔ ' : ($ok === false ? '✖ ' : '')) . htmlspecialchars($t) . '</li>';
    echo '</ul>';
    if ($foot !== '') echo '<p><b>' . htmlspecialchars($foot) . '</b></p>';
    if ($button) echo '<form method="post"><button style="font:inherit;font-weight:700;padding:.6rem 1.2rem;border-radius:8px;border:0;background:#1d3fc4;color:#fff;cursor:pointer">Jetzt einrichten</button></form>';
    exit;
}
function has_key(array $c): bool { return (bool)preg_match('/^[a-f0-9]{64}$/', (string)($c['nick_key'] ?? '')); }

if (!is_file($conf)) page([[false, 'config.local.php fehlt. Zuerst install.php ausführen.']]);
$c = array_merge(require __DIR__ . '/config.php', require $conf);
$pdo = ($c['store'] ?? '') === 'pdo';
$rows = [];
$db = null; $t = ''; $haveCols = true;
if ($pdo) {
    try {
        $db = new PDO((string)$c['pdo_dsn'], (string)$c['pdo_user'], (string)$c['pdo_pass'], [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
        $t = (string)$c['pdo_prefix'] . 'users';
        $cols = array_map('strtolower', $db->query("SHOW COLUMNS FROM `$t`")->fetchAll(PDO::FETCH_COLUMN));
        $haveCols = in_array('nick_h', $cols, true) && in_array('nick_e', $cols, true);
        $rows[] = [true, 'Datenbank erreichbar, Tabelle ' . $t . ' gefunden.'];
        $rows[] = [$haveCols, $haveCols ? 'Spalten für Nicknames sind da.' : 'Spalten für Nicknames fehlen. Sie werden angelegt.'];
    } catch (Throwable $e) {
        page([[false, 'Datenbank nicht erreichbar oder Tabelle fehlt: ' . $e->getMessage()]], 'Nichts geändert.');
    }
} else {
    $rows[] = [true, 'Speicher: Datei (keine Datenbank). Es sind keine Spalten nötig.'];
}
$haveKey = has_key($c);
$rows[] = [$haveKey, $haveKey ? 'Schlüssel ist schon eingetragen.' : 'Schlüssel fehlt. Er wird erzeugt und in config.local.php geschrieben.'];

if ($haveKey && $haveCols) { @unlink(__FILE__); page($rows, 'Alles schon eingerichtet. Diese Datei hat sich gelöscht.'); }
if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') page($rows, 'Bereit. Es wurde noch nichts geändert.', true);

/* Knopf gedrückt: nur von der eigenen Seite akzeptieren */
$o = $_SERVER['HTTP_ORIGIN'] ?? '';
if ($o !== '' && parse_url($o, PHP_URL_HOST) !== ($_SERVER['HTTP_HOST'] ?? '') && parse_url($o, PHP_URL_HOST) !== explode(':', (string)($_SERVER['HTTP_HOST'] ?? ''))[0]) page([[false, 'Anfrage von einer fremden Seite abgelehnt.']]);
$rows = [];
if ($pdo && !$haveCols) {
    try {
        $db->exec("ALTER TABLE `$t` ADD nick_h CHAR(64) NULL, ADD nick_e VARCHAR(255) NULL, ADD UNIQUE KEY uq_nick (nick_h)");
        $rows[] = [true, 'Spalten für Nicknames angelegt.'];
    } catch (Throwable $e) {
        page([[false, 'Spalten konnten nicht angelegt werden (fehlt dem Datenbank-Benutzer das ALTER-Recht?): ' . $e->getMessage()]], 'Nichts weiter geändert.');
    }
}
if (!$haveKey) {
    $src = (string)file_get_contents($conf);
    if (!preg_match('/\]\s*;\s*$/', $src)) page(array_merge($rows, [[false, 'config.local.php hat ein unerwartetes Format. Schlüssel nicht geschrieben.']]));
    $new = preg_replace('/\]\s*;\s*$/', "    'nick_key' => '" . bin2hex(random_bytes(32)) . "',   // Schlüssel für Nicknames. Nie ändern oder löschen, sonst sind sie unlesbar.\n];\n", $src, 1);
    if (file_put_contents($conf, $new, LOCK_EX) === false) page(array_merge($rows, [[false, 'config.local.php ist nicht beschreibbar (Rechte prüfen).']]));
    @chmod($conf, 0640);
    $rows[] = [true, 'Schlüssel in config.local.php geschrieben.'];
}
@unlink(__FILE__);
page($rows, 'Fertig. Diese Datei hat sich gelöscht. Jetzt config.local.php sichern und die Seite mit Strg+F5 neu laden.');
