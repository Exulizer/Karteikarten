<?php
declare(strict_types=1);
error_reporting(E_ALL);
ini_set('display_errors', '0');
require __DIR__ . '/inc/app.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
header('X-Robots-Tag: noindex');
header('Referrer-Policy: no-referrer');
header("Content-Security-Policy: default-src 'none'; frame-ancestors 'none'");

set_exception_handler(function (Throwable $e) {
    error_log('kartenbox api: ' . $e->getMessage() . ' @' . $e->getFile() . ':' . $e->getLine());
    if (!headers_sent()) http_response_code(500);
    echo json_encode(['ok' => false, 'err' => 'Technischer Fehler. Bitte später noch einmal versuchen.']);
});

$a = (string)($_GET['a'] ?? '');
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$read = ['csrf' => 'GET', 'data' => 'GET', 'rev' => 'GET', 'versions' => 'GET', 'pro' => 'GET', 'ct-challenge' => 'GET', 'nick-check' => 'GET'];
$write = ['register', 'verify', 'login', 'logout', 'reset-request', 'reset', 'password', 'delete', 'contact', 'save', 'patch', 'restore', 'nick', 'resend-verify'];
if (isset($read[$a])) { if ($method !== $read[$a]) fail(405, 'method'); }
elseif (in_array($a, $write, true)) { if ($method !== 'POST') fail(405, 'method'); }
else fail(404, 'unbekannt');

if (mt_rand(1, 50) === 1) store()->gc(now());
start_session();
if ($method === 'POST') { check_origin(); check_csrf(); }
$ip = client_ip();

switch ($a) {
    case 'pro': {   // Zusatzfunktionen als Skript, nur mit gültiger Anmeldung. Der Code liegt in inc/pro.js und ist sonst nicht abrufbar.
        require_user();
        limit('pro', $ip, 60, 600);
        $f = __DIR__ . '/inc/pro.js';
        if (!is_file($f)) fail(404, 'nicht vorhanden');
        header('Content-Type: application/javascript; charset=utf-8');
        header('Cache-Control: no-store');
        readfile($f);
        exit;
    }
    case 'csrf':
        limit('csrf', $ip, 120, 600);
        respond(['ok' => true, 'csrf' => $_SESSION['csrf'], 'ft' => form_token(), 'user' => public_user(current_user())]);

    case 'nick-check': {   // Live-Prüfung beim Tippen: gültig? frei?
        limit('nickc', $ip, 60, 600);
        $n = trim((string)($_GET['n'] ?? ''));
        if ($e = nick_check($n)) respond(['ok' => true, 'valid' => false, 'free' => false, 'msg' => $e]);
        $u = current_user();
        $free = store()->nickFree(nick_hash($n), $u ? (int)$u['id'] : 0);
        respond(['ok' => true, 'valid' => true, 'free' => $free, 'msg' => $free ? 'Frei.' : 'Schon vergeben.']);
    }

    case 'nick': {   // Nickname setzen oder ändern (für angemeldete Konten, auch ältere ohne Nickname)
        $u = require_user(); $j = body_json();
        limit('nick', (string)$u['id'], 20, 3600);
        $n = trim(s($j, 'nick', 60));
        if ($e = nick_check($n)) fail(400, $e);
        if (!store()->setNick((int)$u['id'], nick_hash($n), nick_enc($n))) fail(409, 'Dieser Nickname ist schon vergeben.');
        respond(['ok' => true, 'nick' => $n, 'msg' => 'Nickname gespeichert.']);
    }

    case 'register': {
        $j = body_json();
        limit('reg', $ip, 5, 3600);
        $email = norm_email(s($j, 'email', 190)); $pw = s($j, 'password', 400); $nick = trim(s($j, 'nick', 60));
        $ok = ['ok' => true, 'msg' => 'Fast fertig. Wenn die Adresse passt, haben wir dir eine Mail geschickt.'];
        if (s($j, 'website', 200) !== '') respond($ok);                       // Honeypot
        if (!valid_email($email)) fail(400, 'Bitte eine gültige E-Mail-Adresse eingeben.');
        if ($e = nick_check($nick)) fail(400, $e);
        if ($e = check_password($pw, $email)) fail(400, $e);
        limit('regu', $email, 2, 3600);                                       // je Zieladresse höchstens zwei Mails pro Stunde (kein Mail-Bombing)
        limit('regall', 'all', 500, 86400);                                   // nur gültige Anfragen zählen, ungültige sperren niemanden aus
        $hash = hash_pw($pw);                                                 // immer hashen, damit die Zeit gleich bleibt
        $uid = store()->createUser($email, $hash, now(), nick_hash($nick), nick_enc($nick));
        if ($uid === -1) fail(409, 'Dieser Nickname ist schon vergeben.');
        if ($uid) mail_verify($email, $uid);
        else {
            $u = store()->userByEmail($email);
            if ($u && !$u['verified']) mail_verify($email, $u['id']);
            elseif ($u) send_mail($email, cfg('site_name') . ': Du hast schon ein Konto', "Hallo,\n\njemand hat sich mit dieser Adresse registriert. Du hast aber schon ein Konto.\nPasswort vergessen? Nutze auf " . site_url() . " „Passwort vergessen“.\n\nWar das nicht du, tu nichts.\n", '',
                mail_html('Schon dabei', ['Jemand hat sich mit dieser Adresse registriert. Du hast aber schon ein Konto.', 'Passwort vergessen? Dann setze ein neues.'], 'Zu KarteiDeck', site_url() . '/', 'Dort findest du „Passwort vergessen“ im Anmelde-Fenster. War das nicht du, tu nichts.', [], 'Du bekommst diese Mail, weil jemand sie mit deiner Adresse bei KarteiDeck angefordert hat.', false));
        }
        respond($ok);
    }

    case 'resend-verify': {   // Bestätigungsmail erneut senden. Antwort immer gleich: so lässt sich nicht herausfinden, welche Adressen ein Konto haben.
        $j = body_json();
        limit('rsv', $ip, 5, 3600);
        $email = norm_email(s($j, 'email', 190));
        $ok = ['ok' => true, 'msg' => 'Wenn dieses Konto noch nicht bestätigt ist, haben wir dir eine neue Mail geschickt. Schau auch im Spam-Ordner.'];
        if (!valid_email($email)) respond($ok);
        limit('rsvu', $email, 3, 3600);                                       // je Adresse höchstens drei Mails pro Stunde
        limit('regall', 'all', 500, 86400);
        $u = store()->userByEmail($email);
        if ($u && !$u['verified']) mail_verify($email, $u['id']);
        respond($ok);
    }

    case 'verify': {
        $j = body_json();
        limit('ver', $ip, 20, 3600);
        $t = s($j, 'token', 100);
        $uid = preg_match('/^[a-f0-9]{64}$/', $t) ? store()->takeToken('verify', hash('sha256', $t), now()) : null;
        if (!$uid) fail(400, 'Der Link ist ungültig oder abgelaufen.');
        store()->setUser($uid, ['verified' => 1]);
        respond(['ok' => true, 'msg' => 'Deine Adresse ist bestätigt. Du kannst dich jetzt anmelden.']);
    }

    case 'login': {
        $j = body_json();
        $email = norm_email(s($j, 'email', 190)); $pw = s($j, 'password', 400);
        limit('login', $ip, 10, 900);
        limit('loginu', $email . '|' . $ip, 8, 900);                          // je Adresse UND Anschluss: Fremde können ein Konto nicht sperren
        limit('loginall', $email, 40, 900);                                   // grobe Obergrenze gegen verteiltes Raten
        $u = store()->userByEmail($email);
        $good = password_verify($pw, $u['pw'] ?? dummy_hash()) && $u;
        if (!$good) fail(401, 'E-Mail oder Passwort stimmt nicht.');
        if (!$u['verified']) fail(403, 'Bitte bestätige zuerst deine E-Mail-Adresse. Wir haben dir einen Link geschickt.', ['code' => 'unverified']);
        if (password_needs_rehash($u['pw'], defined('PASSWORD_ARGON2ID') ? PASSWORD_ARGON2ID : PASSWORD_BCRYPT)) store()->setUser($u['id'], ['pw' => hash_pw($pw)]);
        session_regenerate_id(true);
        $_SESSION['uid'] = $u['id']; $_SESSION['pwv'] = $u['pwv']; $_SESSION['csrf'] = bin2hex(random_bytes(24));
        respond(['ok' => true, 'csrf' => $_SESSION['csrf'], 'user' => public_user($u)]);
    }

    case 'logout':
        $_SESSION = [];
        session_regenerate_id(true);
        $_SESSION['csrf'] = bin2hex(random_bytes(24));
        respond(['ok' => true, 'csrf' => $_SESSION['csrf']]);

    case 'reset-request': {
        $j = body_json();
        limit('rsq', $ip, 5, 3600);
        $email = norm_email(s($j, 'email', 190));
        $ok = ['ok' => true, 'msg' => 'Wenn es ein Konto gibt, haben wir dir eine Mail geschickt.'];
        if (!valid_email($email)) respond($ok);
        limit('rsqu', $email, 3, 3600);
        $u = store()->userByEmail($email);
        if ($u && $u['verified']) {
            $t = new_token('reset', $u['id'], 3600);
            $ru = site_url() . "/?reset=$t";
            send_mail($email, cfg('site_name') . ': Passwort zurücksetzen', "Hallo,\n\nhier kannst du ein neues Passwort setzen:\n$ru\n\nDer Link gilt 1 Stunde. Wenn du das nicht angefordert hast, ignoriere diese Mail.\n", '',
                mail_html('Neues Passwort', ['Hier kannst du ein neues Passwort für dein KarteiDeck-Konto setzen.'], 'Passwort setzen', $ru, 'Der Link gilt 1 Stunde. Hast du das nicht angefordert, ignoriere die Mail einfach.'));
        }
        respond($ok);
    }

    case 'reset': {
        $j = body_json();
        limit('rs', $ip, 10, 3600);
        $t = s($j, 'token', 100); $pw = s($j, 'password', 400);
        if (!preg_match('/^[a-f0-9]{64}$/', $t)) fail(400, 'Der Link ist ungültig oder abgelaufen.');
        $tokHash = hash('sha256', $t);
        // Passwort zuerst prüfen, ohne den Link zu verbrauchen
        $probe = store()->takeToken('reset', $tokHash, now());
        if (!$probe) fail(400, 'Der Link ist ungültig oder abgelaufen.');
        $u = store()->userById($probe);
        if (!$u) fail(400, 'Der Link ist ungültig oder abgelaufen.');
        if ($e = check_password($pw, $u['email'])) {
            store()->putToken('reset', $tokHash, $probe, now() + 3600);       // Link bleibt gültig, bis ein brauchbares Passwort kommt
            fail(400, $e);
        }
        store()->setUser($probe, ['pw' => hash_pw($pw), 'pwv' => $u['pwv'] + 1, 'verified' => 1]);
        respond(['ok' => true, 'msg' => 'Das neue Passwort ist gesetzt. Du kannst dich jetzt anmelden.']);
    }

    case 'password': {
        $u = require_user(); $j = body_json();
        limit('pwc', (string)$u['id'], 5, 900);
        if (!password_verify(s($j, 'old', 400), $u['pw'])) fail(401, 'Das alte Passwort stimmt nicht.');
        $new = s($j, 'password', 400);
        if ($e = check_password($new, $u['email'])) fail(400, $e);
        $pwv = $u['pwv'] + 1;
        store()->setUser($u['id'], ['pw' => hash_pw($new), 'pwv' => $pwv]);
        $_SESSION['pwv'] = $pwv;
        respond(['ok' => true, 'msg' => 'Passwort geändert. Andere Geräte sind abgemeldet.']);
    }

    case 'delete': {
        $u = require_user(); $j = body_json();
        limit('del', (string)$u['id'], 5, 900);
        if (!password_verify(s($j, 'password', 400), $u['pw'])) fail(401, 'Das Passwort stimmt nicht.');
        store()->deleteUser($u['id']);
        $_SESSION = [];
        session_regenerate_id(true);
        $_SESSION['csrf'] = bin2hex(random_bytes(24));
        respond(['ok' => true, 'csrf' => $_SESSION['csrf'], 'msg' => 'Dein Konto und alle Daten dazu sind gelöscht.']);
    }

    case 'data': {
        $u = require_user();
        limit('dget', (string)$u['id'], 120, 600);
        $d = store()->getData($u['id']);
        respond(['ok' => true, 'rev' => $d['rev'] ?? 0, 'updated' => $d['updated'] ?? 0, 'data' => $d ? json_decode($d['body']) : null]);
    }

    /* Nur die Revisionsnummer: eine einzige Abfrage über den Schlüssel, kein Schreiben, kein Zählen in hits. Der Browser fragt damit alle 60 Sekunden, ob sich etwas geändert hat. */
    case 'rev': {
        $u = require_user();
        respond(['ok' => true, 'rev' => store()->getRev($u['id'])]);
    }

    case 'save': {
        $u = require_user(); $j = body_json();
        limit('dput', (string)$u['id'], 120, 600);
        $rev = (int)($j['rev'] ?? 0);
        $body = json_encode(clean_data($j['data'] ?? null), JSON_UNESCAPED_UNICODE);
        if ($body === false || strlen($body) > min((int)cfg('max_body'), (int)cfg('max_data'))) fail(413, 'Zu viele Daten. Pro Konto sind etwa 5 MB möglich.');
        $new = store()->putData($u['id'], $rev, $body, now());
        if (!$new) fail(409, 'conflict', ['rev' => store()->getData($u['id'])['rev'] ?? 0]);
        respond(['ok' => true, 'rev' => $new]);
    }

    case 'patch': {   // Nur die Änderungen seit dem letzten gemeinsamen Stand (für das Schließen des Tabs bei großen Konten, wo der ganze Stand nicht mehr in einen Hintergrund-Aufruf passt)
        $u = require_user(); $j = body_json();
        limit('dput', (string)$u['id'], 120, 600);
        $rev = (int)($j['rev'] ?? 0); $p = $j['patch'] ?? null;
        if ($rev < 1 || !is_array($p)) fail(400, 'Daten ungültig');
        $cur = store()->getData($u['id']);
        if (!$cur || (int)$cur['rev'] !== $rev) fail(409, 'conflict', ['rev' => $cur['rev'] ?? 0]);   // der Stand hat sich geändert: kein Zusammenführen hier, der Browser macht das beim nächsten Start
        $d = json_decode($cur['body'], true);
        if (!is_array($d)) fail(409, 'conflict', ['rev' => $rev]);
        $cards = [];
        foreach (($d['cards'] ?? []) as $c) if (is_array($c) && is_string($c['id'] ?? null)) $cards[$c['id']] = $c;
        foreach ((is_array($p['del'] ?? null) ? $p['del'] : []) as $id) unset($cards[(string)$id]);
        foreach ((is_array($p['cards'] ?? null) ? $p['cards'] : []) as $c) if (is_array($c) && is_string($c['id'] ?? null)) $cards[$c['id']] = $c;
        $d['cards'] = array_values($cards);
        foreach ((is_array($p['log'] ?? null) ? $p['log'] : []) as $k => $l) if (is_array($l)) $d['log'][(string)$k] = $l;
        if (is_array($p['cats'] ?? null)) $d['cats'] = $p['cats'];
        if (is_array($p['colors'] ?? null)) $d['colors'] = $p['colors'];
        foreach ((is_array($p['cfg'] ?? null) ? $p['cfg'] : []) as $k => $v) $d['cfg'][(string)$k] = $v;
        $body = json_encode(clean_data($d), JSON_UNESCAPED_UNICODE);
        if ($body === false || strlen($body) > min((int)cfg('max_body'), (int)cfg('max_data'))) fail(413, 'Zu viele Daten. Pro Konto sind etwa 5 MB möglich.');
        $new = store()->putData($u['id'], $rev, $body, now());
        if (!$new) fail(409, 'conflict', ['rev' => store()->getData($u['id'])['rev'] ?? 0]);
        respond(['ok' => true, 'rev' => $new]);
    }
    case 'versions': {   // frühere Stände des Kontos (Datum, Zahl der Karten)
        $u = require_user();
        limit('dget', (string)$u['id'], 120, 600);
        respond(['ok' => true, 'versions' => store()->listVersions($u['id'])]);
    }
    case 'restore': {    // einen früheren Stand zurückholen; der jetzige wird vorher gesichert
        $u = require_user(); $j = body_json();
        limit('dput', (string)$u['id'], 120, 600);
        $r = store()->restoreVersion($u['id'], (int)($j['id'] ?? 0), now());
        if (!$r) fail(404, 'Diesen Stand gibt es nicht mehr.');
        respond(['ok' => true, 'rev' => $r['rev'], 'data' => json_decode($r['body'])]);
    }

    case 'ct-challenge':
        limit('ctc', $ip, 30, 600);
        respond(['ok' => true, 'c' => pow_challenge()]);
    case 'contact': {
        $j = body_json();
        limit('ctx', $ip, 15, 3600);                    // jeder Versuch zählt, auch ein fehlerhafter
        if (s($j, 'website', 200) !== '') respond(['ok' => true, 'msg' => 'Danke, die Nachricht ist angekommen.']);   // Honeypot: Bots merken nichts
        if (!form_token_ok(s($j, 'ft', 120))) fail(400, 'Bitte versuche es in ein paar Sekunden noch einmal.');
        $pw = is_array($j['pow'] ?? null) ? $j['pow'] : [];
        if (!pow_ok(s($pw, 'c', 120), s($pw, 'n', 14))) fail(400, 'Die Prüfung im Browser hat nicht geklappt. Bitte lade die Seite neu und versuche es noch einmal.');
        $name = clean_text(s($j, 'name', 80)); $email = norm_email(s($j, 'email', 190)); $msg = clean_text(s($j, 'message', 2000));
        $name = trim(preg_replace('/\s+/u', ' ', $name) ?? '');
        if ($name === '' || !valid_email($email) || mb_strlen($msg) < 10) fail(400, 'Bitte Name, gültige E-Mail und eine Nachricht mit mindestens 10 Zeichen eingeben.');
        if (preg_match_all('~https?://|www\.~i', $msg) > 2) fail(400, 'Bitte höchstens zwei Links in die Nachricht schreiben.');
        $to = (string)cfg('contact_to');
        if (!valid_email($to)) { error_log('kartenbox api: contact_to fehlt'); fail(503, 'Das Kontaktformular ist gerade nicht eingerichtet.'); }
        if (store()->hit('ctd:' . hash_hmac('sha256', $email . '|' . $msg, secret()), 86400, now()) > 1) respond(['ok' => true, 'msg' => 'Danke, die Nachricht ist angekommen.']);   // gleiche Nachricht zweimal: nur einmal senden
        limit('ct', $ip, 3, 3600);                      // gesendete Nachrichten je IP
        limit('ctm', $email, 3, 86400);                 // und je E-Mail-Adresse
        limit('ctall', 'all', 40, 86400);               // und insgesamt am Tag
        send_mail($to, cfg('site_name') . ': Nachricht von ' . $name, "Name: $name\nE-Mail: $email\n\n$msg\n", $email,
            mail_html('Neue Nachricht', [], 'Antworten', 'mailto:' . $email, 'Die Antwort geht direkt an die Adresse oben.', ['Name' => $name, 'E-Mail' => $email, 'Nachricht' => $msg], 'Gesendet über das Kontaktformular auf ' . parse_url(site_url(), PHP_URL_HOST) . '.', false));
        respond(['ok' => true, 'msg' => 'Danke, die Nachricht ist angekommen.']);
    }
}
