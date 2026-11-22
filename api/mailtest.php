<?php
declare(strict_types=1);
if (!is_file(__DIR__ . '/mailtest.on')) { http_response_code(404); exit; }   // nur nutzbar, solange du die leere Datei mailtest.on im Ordner api/ angelegt hast
/* KarteiDeck: Mail-Test (einmalig). Verschickt eine Probemail wie die App und zeigt, was der Server dazu sagt.
   Danach löschen (Knopf unten oder per FTP). */
header('Cache-Control: no-store');
header('X-Robots-Tag: noindex, nofollow');
header('X-Frame-Options: DENY');
header('Referrer-Policy: no-referrer');

function h(string $s): string { return htmlspecialchars($s, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8'); }
function post(string $k, string $d = ''): string { return isset($_POST[$k]) && is_string($_POST[$k]) ? trim($_POST[$k]) : $d; }

$conf = __DIR__ . '/config.local.php';
$cfg = is_file($conf) ? (array)(require $conf) : [];
$https = !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off';
$tok = (isset($_COOKIE['kdm']) && is_string($_COOKIE['kdm']) && preg_match('/^[a-f0-9]{32}$/', $_COOKIE['kdm'])) ? $_COOKIE['kdm'] : bin2hex(random_bytes(16));
setcookie('kdm', $tok, ['path' => '/', 'httponly' => true, 'samesite' => 'Strict', 'secure' => $https]);

$msgs = [];
$from = post('from', (string)($cfg['mail_from'] ?? 'info@karteideck.de'));
$to = post('to', (string)($cfg['contact_to'] ?? ''));
$deleted = false;

if (!$cfg) {
    $msgs[] = ['bad', 'config.local.php fehlt. Erst install.php ausführen.'];
} elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $a = post('a');
    if (!hash_equals($tok, post('t'))) {
        $msgs[] = ['bad', 'Die Sitzung ist abgelaufen. Seite neu laden.'];
    } elseif ($a === 'del') {
        $deleted = @unlink(__FILE__);
        $msgs[] = $deleted ? ['ok', 'mailtest.php ist gelöscht.'] : ['bad', 'Löschen ging nicht. Bitte per FTP löschen.'];
    } elseif (!filter_var($from, FILTER_VALIDATE_EMAIL) || !filter_var($to, FILTER_VALIDATE_EMAIL)) {
        $msgs[] = ['bad', 'Bitte zwei gültige E-Mail-Adressen eintragen.'];
    } else {
        $sub = mb_encode_mimeheader('KarteiDeck: Probemail', 'UTF-8');
        $hdr = implode("\r\n", ['From: KarteiDeck <' . $from . '>', 'MIME-Version: 1.0', 'Content-Type: text/plain; charset=UTF-8', 'Content-Transfer-Encoding: 8bit']);
        $body = "Das ist eine Probemail von KarteiDeck.\nWenn du sie liest, funktioniert der Versand.\nZeit: " . date('c') . "\n";
        $err = '';
        set_error_handler(function ($n, $s) use (&$err) { $err = $s; return true; });
        $r1 = mail($to, $sub, $body, $hdr, '-f' . $from);
        restore_error_handler();
        if ($r1) {
            $msgs[] = ['ok', 'Der Server hat die Mail angenommen. Sie ist unterwegs. Schau auch im Spam-Ordner nach und warte bis zu fünf Minuten.'];
        } else {
            $msgs[] = ['bad', 'Der Server hat die Mail abgelehnt.' . ($err !== '' ? ' Meldung: ' . $err : '')];
            $msgs[] = ['info', 'Häufige Gründe: Die Absenderadresse gehört nicht zu einer Domain deines Hetzner-Kontos, oder für die Domain ist kein Mail-Dienst eingerichtet.'];
        }
        if (post('save') === '1' && $r1) {
            $php = @file_get_contents($conf);
            if ($php !== false && preg_match("/'mail_from'\s*=>\s*'[^']*'/", $php)) {
                $php = preg_replace("/'mail_from'\s*=>\s*'[^']*'/", "'mail_from' => " . var_export($from, true), $php, 1);
                $msgs[] = @file_put_contents($conf, $php, LOCK_EX) !== false ? ['ok', 'Absender in config.local.php auf ' . $from . ' gesetzt.'] : ['bad', 'config.local.php ließ sich nicht schreiben.'];
            }
        }
    }
}
$info = 'PHP ' . PHP_VERSION . ' · mail_mode: ' . (string)($cfg['mail_mode'] ?? '-') . ' · sendmail_path: ' . (string)ini_get('sendmail_path');
?><!doctype html>
<html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow"><title>KarteiDeck Mail-Test</title>
<style>
:root{--bg:#e9e2d4;--paper:#fffdf6;--ink:#1c2330;--mut:#4a5468;--line:#c9c2b0;--ac:#1d3fc4;--ok:#0b6b3a;--bad:#a4161a;--okb:#e3f4ea;--badb:#fbe5e5}
@media (prefers-color-scheme:dark){:root{--bg:#171b24;--paper:#212733;--ink:#f1f3f8;--mut:#b4bccd;--line:#3b4457;--ac:#8fb0ff;--ok:#7be0a8;--bad:#ff9a9d;--okb:#17372a;--badb:#451c1e}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:17px/1.5 system-ui,sans-serif;padding:24px 16px}
main{max-width:560px;margin:0 auto;background:var(--paper);border:1px solid var(--line);border-radius:10px;padding:24px}
h1{margin:0 0 4px;font-size:1.5rem}p{margin:.4em 0 1em;color:var(--mut)}
label{display:block;font-weight:700;margin:14px 0 4px}
input[type=email]{width:100%;min-height:46px;padding:8px 12px;font:inherit;color:var(--ink);background:var(--bg);border:2px solid var(--line);border-radius:8px}
.chk{display:flex;gap:10px;align-items:center;margin-top:14px;font-weight:600}.chk input{width:22px;height:22px}
.row{display:flex;gap:10px;flex-wrap:wrap;margin-top:20px}
button{flex:1 1 180px;min-height:48px;font:inherit;font-weight:700;border-radius:8px;border:2px solid var(--ac);cursor:pointer;background:transparent;color:var(--ac)}
button.main{background:var(--ac);color:#fff}@media (prefers-color-scheme:dark){button.main{color:#10151f}}
.m{padding:10px 14px;border-radius:8px;margin:10px 0;font-weight:600}.m.ok{background:var(--okb);color:var(--ok)}.m.bad{background:var(--badb);color:var(--bad)}.m.info{background:var(--bg)}
small{display:block;color:var(--mut);margin-top:16px;word-break:break-all}
</style></head><body><main>
<h1>Mail-Test</h1>
<?php foreach ($msgs as [$k, $t]) echo '<div class="m ', $k, '" role="status">', h($t), "</div>\n"; ?>
<?php if ($cfg && !$deleted): ?>
<p>Schickt eine Probemail so, wie es die App tut.</p>
<form method="post" autocomplete="off"><input type="hidden" name="t" value="<?= h($tok) ?>">
<label for="from">Absender</label><input id="from" name="from" type="email" value="<?= h($from) ?>" placeholder="info@karteideck.de" required>
<label for="to">Empfänger (deine Adresse)</label><input id="to" name="to" type="email" value="<?= h($to) ?>" placeholder="deine@adresse.de" required>
<label class="chk"><input type="checkbox" name="save" value="1"> Bei Erfolg diesen Absender in config.local.php speichern</label>
<div class="row"><button class="main" type="submit" name="a" value="send">Probemail senden</button>
<button type="submit" name="a" value="del">mailtest.php löschen</button></div></form>
<small><?= h($info) ?></small>
<?php endif; ?>
</main></body></html>
