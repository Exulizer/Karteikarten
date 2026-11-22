<?php
declare(strict_types=1);
require __DIR__ . '/store.php';

function cfg(string $k)
{
    static $c = null;
    if ($c === null) {
        $c = require __DIR__ . '/../config.php';
        if (is_file(__DIR__ . '/../config.local.php')) $c = array_merge($c, require __DIR__ . '/../config.local.php');
    }
    return $c[$k] ?? null;
}
function now(): int { return time(); }
function respond(array $body, int $code = 200): never
{
    http_response_code($code);
    echo json_encode($body, JSON_UNESCAPED_UNICODE);
    exit;
}
function fail(int $code, string $msg, array $extra = []): never { respond(['ok' => false, 'err' => $msg] + $extra, $code); }

function store(): Store
{
    static $s = null;
    if ($s) return $s;
    if (cfg('store') === 'pdo') return $s = new PdoStore((string)cfg('pdo_dsn'), (string)cfg('pdo_user'), (string)cfg('pdo_pass'), (string)cfg('pdo_prefix'));
    return $s = new FileStore((string)cfg('data_dir'));
}
function secret(): string
{
    static $k = null;
    if ($k) return $k;
    $dir = (string)cfg('data_dir');
    if (!is_dir($dir)) mkdir($dir, 0700, true);
    $f = $dir . '/secret.key';
    if (!is_file($f)) { file_put_contents($f, bin2hex(random_bytes(32)), LOCK_EX); @chmod($f, 0600); }
    return $k = trim((string)file_get_contents($f));
}
function is_https(): bool
{
    return (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
        || (cfg('trust_proxy') && ($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');
}
function client_ip(): string
{
    $ip = $_SERVER['REMOTE_ADDR'] ?? '0';
    if (cfg('trust_proxy') && !empty($_SERVER['HTTP_X_FORWARDED_FOR'])) $ip = trim(explode(',', $_SERVER['HTTP_X_FORWARDED_FOR'])[0]);
    if (strpos($ip, ':') !== false && ($b = @inet_pton($ip)) !== false && strlen($b) === 16) return bin2hex(substr($b, 0, 8)) . '::/64';   // IPv6: ein Anschluss hat ein ganzes /64, darum danach zählen
    return $ip;
}

/* ---- Sitzung, CSRF, Anfrage ---- */
function start_session(): void
{
    if (session_status() === PHP_SESSION_ACTIVE) return;
    $dir = cfg('data_dir') . '/sessions';
    if (!is_dir($dir)) mkdir($dir, 0700, true);
    $days = (int)cfg('session_days');
    ini_set('session.use_strict_mode', '1');
    ini_set('session.use_only_cookies', '1');
    ini_set('session.gc_maxlifetime', (string)($days * 86400));
    ini_set('session.gc_probability', '1');
    ini_set('session.gc_divisor', '50');
    if (PHP_VERSION_ID < 80400) { ini_set('session.sid_length', '48'); ini_set('session.sid_bits_per_character', '5'); }
    session_save_path($dir);
    session_name('kbsid');
    session_set_cookie_params(['lifetime' => $days * 86400, 'path' => '/', 'secure' => is_https(), 'httponly' => true, 'samesite' => 'Lax']);
    session_start();
    if (empty($_SESSION['csrf'])) $_SESSION['csrf'] = bin2hex(random_bytes(24));
}
function check_origin(): void
{
    $o = $_SERVER['HTTP_ORIGIN'] ?? '';
    if ($o !== '' && strcasecmp((string)parse_url($o, PHP_URL_HOST) . ((($p = parse_url($o, PHP_URL_PORT)) !== null) ? ':' . $p : ''), $_SERVER['HTTP_HOST'] ?? '') !== 0) fail(403, 'origin');
    $sf = $_SERVER['HTTP_SEC_FETCH_SITE'] ?? '';
    if ($sf !== '' && !in_array($sf, ['same-origin', 'none'], true)) fail(403, 'origin');
}
function check_csrf(): void
{
    $t = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
    if (!is_string($t) || empty($_SESSION['csrf']) || !hash_equals($_SESSION['csrf'], $t)) fail(403, 'csrf');
}
function body_json(): array
{
    if (stripos($_SERVER['CONTENT_TYPE'] ?? '', 'application/json') !== 0) fail(415, 'type');
    $max = (int)cfg('max_body');
    if ((int)($_SERVER['CONTENT_LENGTH'] ?? 0) > $max) fail(413, 'zu groß');
    $raw = stream_get_contents(fopen('php://input', 'r'), $max + 1);
    if ($raw === false || strlen($raw) > $max) fail(413, 'zu groß');
    $j = json_decode($raw, true, 32);
    if (!is_array($j)) fail(400, 'json');
    return $j;
}

/* ---- Rate-Limit: gespeichert wird nur ein Hash, nie die IP selbst ---- */
function limit(string $bucket, string $id, int $max, int $window): void
{
    $key = $bucket . ':' . hash_hmac('sha256', $id, secret());
    if (store()->hit($key, $window, now()) > $max) {
        header('Retry-After: ' . $window);
        fail(429, 'Zu viele Versuche. Bitte warte einen Moment.');
    }
}

/* ---- Eingaben ---- */
function s(array $a, string $k, int $max): string
{
    $v = $a[$k] ?? '';
    if (!is_string($v)) return '';
    $v = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', '', $v) ?? '';
    return mb_substr($v, 0, $max);
}
function norm_email(string $e): string { return mb_strtolower(trim($e)); }
function valid_email(string $e): bool { return $e !== '' && strlen($e) <= 190 && filter_var($e, FILTER_VALIDATE_EMAIL) !== false; }
function check_password(string $pw, string $email): ?string
{
    $n = mb_strlen($pw);
    if ($n < 10) return 'Das Passwort braucht mindestens 10 Zeichen.';
    if ($n > 200) return 'Das Passwort ist zu lang.';
    if (!defined('PASSWORD_ARGON2ID') && strlen($pw) > 72) return 'Das Passwort darf höchstens 72 Zeichen haben.';
    if (mb_strtolower($pw) === $email || count(array_unique(mb_str_split($pw))) < 4) return 'Bitte ein weniger leicht zu erratendes Passwort wählen.';
    $base = preg_replace('/[^a-z]/', '', mb_strtolower($pw));   // Buchstaben allein, ohne Zahlen und Zeichen
    $bad = ['passwort', 'password', 'kartenbox', 'qwertz', 'qwertzuiop', 'qwerty', 'abcdefgh', 'iloveyou', 'letmein', 'willkommen', 'hallo', 'halloween'];
    if (in_array($base, $bad, true) || preg_match('/^\d+$/', $pw)) return 'Dieses Passwort ist zu leicht zu erraten. Bitte ein anderes wählen.';
    return null;
}
function hash_pw(string $pw): string { return password_hash($pw, defined('PASSWORD_ARGON2ID') ? PASSWORD_ARGON2ID : PASSWORD_BCRYPT); }
function dummy_hash(): string { static $h = null; return $h ??= hash_pw('dummy-' . secret()); }

/* ---- Mail ---- */
function site_url(): string
{
    $u = rtrim((string)cfg('site_url'), '/');
    if ($u !== '') return $u;
    return (is_https() ? 'https://' : 'http://') . preg_replace('/[^A-Za-z0-9.:\-]/', '', $_SERVER['HTTP_HOST'] ?? 'localhost');
}
function send_mail(string $to, string $subject, string $text, string $replyTo = '', string $html = ''): void
{
    foreach ([$to, $subject, $replyTo, (string)cfg('mail_from')] as $v) if (preg_match('/[\r\n]/', $v)) throw new RuntimeException('header injection');
    if (cfg('mail_mode') === 'php') {
        $from = (string)cfg('mail_from');
        if (!valid_email($from)) throw new RuntimeException('mail_from fehlt');
        $h = ['From: ' . cfg('site_name') . ' <' . $from . '>', 'MIME-Version: 1.0'];
        if ($replyTo !== '') $h[] = 'Reply-To: ' . $replyTo;
        if ($html !== '') {   // Text und HTML: Mailprogramme zeigen die HTML-Fassung, der Text bleibt als Rückfall
            $bd = 'kd' . bin2hex(random_bytes(8));
            $h[] = 'Content-Type: multipart/alternative; boundary="' . $bd . '"';
            $body = '--' . $bd . "\r\nContent-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n" . chunk_split(base64_encode($text))
                  . '--' . $bd . "\r\nContent-Type: text/html; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n" . chunk_split(base64_encode($html))
                  . '--' . $bd . "--\r\n";
        } else {
            $h[] = 'Content-Type: text/plain; charset=UTF-8';
            $h[] = 'Content-Transfer-Encoding: 8bit';
            $body = $text;
        }
        if (!mail($to, mb_encode_mimeheader($subject, 'UTF-8'), $body, implode("\r\n", $h), '-f' . $from)) throw new RuntimeException('mail failed');   // -f: Absender im Umschlag, sonst nimmt der Server seinen eigenen und die Mail landet im Spam oder wird abgelehnt
        return;
    }
    $f = cfg('data_dir') . '/mail.log';
    file_put_contents($f, json_encode(['to' => $to, 'subject' => $subject, 'replyTo' => $replyTo, 'text' => $text, 'html' => $html !== ''], JSON_UNESCAPED_UNICODE) . "\n", FILE_APPEND | LOCK_EX);
    @chmod($f, 0600);
}
/* Mail im Look von KarteiDeck: Karteizettel wie im Konto-Fenster (cremefarbenes Papier, blaue Schreiblinien, roter Rand), Stempel-Knopf auf Textmarker, Blaugrau wie die App.
   Nur Inline-Stile, keine Bilder, keine fremden Server. Alle Abstände sind Vielfache von 28 px, damit der Text auf den Linien sitzt.
   Farben stehen als Farbe UND als Verlauf, weil Mailprogramme im Dunkelmodus reine Hintergrundfarben umfärben, Verläufe nicht. Dunkel gibt es nur dort, wo das Mailprogramm den Dunkelmodus meldet. */
function mail_html(string $title, array $paras, string $btn = '', string $url = '', string $foot = '', array $rows = [], string $note = 'Du bekommst diese Mail, weil jemand sie mit deiner Adresse bei KarteiDeck angefordert hat.', bool $showLink = true): string
{
    $e = fn(string $x): string => htmlspecialchars($x, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
    $serif = "Georgia,'Times New Roman',serif"; $sans = "'Segoe UI',Arial,Helvetica,sans-serif"; $mono = "'Courier New',Courier,monospace";
    $bg = fn(string $c): string => 'background:' . $c . ';background-image:linear-gradient(' . $c . ',' . $c . ');';
    $none = 'rgba(0,0,0,0)';
    $lines = 'linear-gradient(90deg,transparent 37px,#d4574a 37px,#d4574a 39px,transparent 39px),repeating-linear-gradient(' . $none . ' 0,' . $none . ' 27px,rgba(60,110,190,.26) 27px,rgba(60,110,190,.26) 28px)';
    $h1 = '<h1 class="kd-h" style="margin:0 0 28px;font:bold 24px/28px ' . $serif . ';color:#14202e;"><span class="kd-mk" style="background:linear-gradient(' . $none . ' 58%,#fbee9a 58%);">' . $e($title) . '</span></h1>';
    $p = '';
    foreach ($paras as $t) $p .= '<p class="kd-p" style="margin:0 0 28px;font:17px/28px ' . $serif . ';color:#14202e;">' . $e($t) . '</p>';
    $r = '';
    foreach ($rows as $k => $v) $r .= '<p class="kd-k" style="margin:0;font:bold 12px/28px ' . $sans . ';letter-spacing:.12em;text-transform:uppercase;color:#475a6b;">' . $e((string)$k) . '</p>'
        . '<p class="kd-p" style="margin:0 0 28px;font:17px/28px ' . $serif . ';color:#14202e;white-space:pre-line;word-break:break-word;overflow-wrap:anywhere;">' . $e((string)$v) . '</p>';
    $b = '';
    if ($btn !== '' && $url !== '') {
        $b = '<div style="margin:0 0 28px;height:56px;"><a class="kd-b" href="' . $e($url) . '" style="display:inline-block;box-sizing:border-box;height:56px;padding:0 22px;border:3px double #1f45c4;border-radius:6px;background:#fbee9a;background-image:linear-gradient(#fbee9a,#fbee9a);color:#1f45c4;font:bold 15px/50px ' . $serif . ';letter-spacing:.12em;text-transform:uppercase;text-decoration:none;">' . $e($btn) . '</a></div>';
        if ($showLink) $b .= '<p class="kd-m" style="margin:0;font:14px/28px ' . $sans . ';color:#475a6b;">Geht der Knopf nicht? Kopiere diesen Link in den Browser:</p>'
            . '<p class="kd-l" style="margin:0 0 28px;font:14px/28px ' . $mono . ';color:#1f45c4;word-break:break-all;">' . $e($url) . '</p>';
    }
    $f = $foot !== '' ? '<p class="kd-m" style="margin:0;font:14px/28px ' . $sans . ';color:#475a6b;">' . $e($foot) . '</p>' : '';
    $dark = '@media (prefers-color-scheme:dark){'
        . '.kd-w{background:#0f1922!important;background-image:linear-gradient(#0f1922,#0f1922)!important}'
        . '.kd-c{background-color:#1b2a37!important;border-color:#2b3d4e!important;background-image:linear-gradient(90deg,transparent 37px,#e0786c 37px,#e0786c 39px,transparent 39px),repeating-linear-gradient(' . $none . ' 0,' . $none . ' 27px,rgba(150,190,235,.14) 27px,rgba(150,190,235,.14) 28px)!important}'
        . '.kd-h,.kd-p,.kd-t{color:#e7eef5!important}.kd-m,.kd-k,.kd-n{color:#a3b3c1!important}.kd-l{color:#8fb0ff!important}'
        . '.kd-mk{background:linear-gradient(' . $none . ' 58%,rgba(251,238,154,.3) 58%)!important}'
        . '.kd-b{border-color:#8fb0ff!important;color:#8fb0ff!important;background:#243a4d!important;background-image:linear-gradient(#243a4d,#243a4d)!important}}';
    return '<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
        . '<meta name="color-scheme" content="light dark"><meta name="supported-color-schemes" content="light dark"><title>' . $e($title) . '</title>'
        . '<style>:root{color-scheme:light dark;supported-color-schemes:light dark}' . $dark . '</style></head>'
        . '<body class="kd-w" style="margin:0;padding:0;' . $bg('#e6ecf1') . '"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#e6ecf1" class="kd-w" style="' . $bg('#e6ecf1') . '"><tr><td align="center" style="padding:28px 16px 32px;">'
        . '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;"><tr><td class="kd-t" style="padding:0 4px 16px;font:bold 22px/28px ' . $serif . ';color:#14202e;">KarteiDeck</td></tr>'
        . '<tr><td class="kd-c" bgcolor="#fffdf2" style="background-color:#fffdf2;background-image:' . $lines . ';border:1px solid #b9c6d1;border-radius:6px;padding:28px 24px 28px 52px;">'
        . $h1 . $p . $r . $b . $f
        . '</td></tr><tr><td class="kd-n" style="padding:16px 4px 0;font:13px/20px ' . $sans . ';color:#475a6b;">' . $e($note) . '</td></tr></table>'
        . '</td></tr></table></body></html>';
}
function new_token(string $kind, int $uid, int $ttl): string
{
    $t = bin2hex(random_bytes(32));
    store()->putToken($kind, hash('sha256', $t), $uid, now() + $ttl);
    return $t;
}
function mail_verify(string $email, int $uid): void
{
    $t = new_token('verify', $uid, 172800);
    $u = site_url() . "/?verify=$t";
    send_mail($email, cfg('site_name') . ': E-Mail bestätigen', "Hallo,\n\nbitte bestätige deine E-Mail-Adresse:\n$u\n\nDer Link gilt 48 Stunden. Wenn du dich nicht registriert hast, ignoriere diese Mail.\n", '',
        mail_html('Fast geschafft', ['Schön, dass du da bist. Bestätige noch kurz deine E-Mail-Adresse, dann kannst du loslegen.'], 'E-Mail bestätigen', $u, 'Der Link gilt 48 Stunden. Warst du das nicht, ignoriere die Mail einfach.'));
}

/* ---- Anmeldung ---- */
function current_user(): ?array
{
    $id = (int)($_SESSION['uid'] ?? 0);
    if (!$id) return null;
    $u = store()->userById($id);
    if (!$u || !$u['verified'] || ($_SESSION['pwv'] ?? 0) !== $u['pwv']) { unset($_SESSION['uid'], $_SESSION['pwv']); return null; }
    return $u;
}
function require_user(): array { return current_user() ?? fail(401, 'Bitte melde dich an.', ['code' => 'auth']); }
function public_user(?array $u): ?array { return $u ? ['email' => $u['email'], 'nick' => nick_dec((string)($u['nick_e'] ?? '')), 'nickOn' => nick_ready()] : null; }
/* ---- Nickname: verschlüsselt gespeichert (AES-256-GCM), „schon vergeben?“ über einen HMAC-Wert, damit der Name nicht lesbar in der Datenbank steht ---- */
function nick_ready(): bool { return (bool)preg_match('/^[a-f0-9]{64}$/', (string)cfg('nick_key')); }
/* Der Schlüssel steht nur in config.local.php (nicht in der Datenbank, nicht im Datenordner, nicht im Git) und wird nie automatisch erzeugt.
   Fehlt er, bleibt die Nickname-Funktion gesperrt, statt Namen mit einem zufälligen neuen Schlüssel zu verschlüsseln. Einrichtung: nickkey.php einmal aufrufen. */
function nick_key(string $zweck): string
{
    if (!nick_ready()) fail(503, 'Nicknames sind gerade nicht verfügbar. Bitte versuche es später noch einmal.');
    return hash_hmac('sha256', 'karteideck-nick-' . $zweck, hex2bin((string)cfg('nick_key')), true);   // getrennte Teilschlüssel für Verschlüsselung und Suchwert
}
function nick_check(string $n): ?string
{
    $len = mb_strlen($n);
    if ($len < 3) return 'Der Nickname braucht mindestens 3 Zeichen.';
    if ($len > 20) return 'Der Nickname darf höchstens 20 Zeichen haben.';
    if (!preg_match('/^[\p{L}\p{N}][\p{L}\p{N}._-]*$/u', $n)) return 'Erlaubt sind Buchstaben, Zahlen sowie . _ - (nicht am Anfang).';
    $base = preg_replace('/[^a-z0-9]/', '', mb_strtolower($n));
    foreach (['admin', 'administrator', 'root', 'support', 'karteideck', 'team', 'moderator', 'system', 'info', 'service'] as $r) if ($base === $r) return 'Dieser Nickname ist reserviert.';
    return null;
}
function nick_hash(string $n): string { return hash_hmac('sha256', mb_strtolower($n), nick_key('index')); }
function nick_enc(string $n): string
{
    $iv = random_bytes(12); $tag = '';
    $ct = openssl_encrypt($n, 'aes-256-gcm', nick_key('enc'), OPENSSL_RAW_DATA, $iv, $tag);
    return base64_encode($iv . $tag . $ct);
}
function nick_dec(string $e): string
{
    if ($e === '' || !nick_ready()) return '';
    $b = base64_decode($e, true);
    if ($b === false || strlen($b) < 29) return '';
    $p = openssl_decrypt(substr($b, 28), 'aes-256-gcm', nick_key('enc'), OPENSSL_RAW_DATA, substr($b, 0, 12), substr($b, 12, 16));
    return $p === false ? '' : $p;
}
/* ---- Kontaktformular: Rechenaufgabe (Proof of Work), ohne Dienst von Dritten ---- */
function pow_challenge(): string
{
    $bits = max(14, min(22, (int)cfg('contact_pow_bits')));
    $t = now(); $r = bin2hex(random_bytes(8));
    return "$t.$r.$bits." . hash_hmac('sha256', "pow|$t|$r|$bits", secret());
}
function pow_ok(string $c, string $n): bool
{
    if (!preg_match('/^(\d{9,12})\.([a-f0-9]{16})\.(\d{2})\.([a-f0-9]{64})$/', $c, $m) || !preg_match('/^\d{1,12}$/', $n)) return false;
    if (!hash_equals(hash_hmac('sha256', "pow|$m[1]|$m[2]|$m[3]", secret()), $m[4])) return false;
    $age = now() - (int)$m[1];
    if ($age < 0 || $age > 900 || (int)$m[3] < (int)max(14, min(22, (int)cfg('contact_pow_bits')))) return false;
    $h = hash('sha256', $c . ':' . $n, true);
    $zero = 0;
    for ($i = 0; $i < 32; $i++) { $b = ord($h[$i]); if ($b === 0) { $zero += 8; continue; } $zero += 7 - (int)floor(log($b, 2)); break; }
    if ($zero < (int)$m[3]) return false;
    return store()->hit('powuse:' . hash('sha256', $c), 900, now()) === 1;   // jede Aufgabe nur einmal
}
function clean_text(string $v): string
{
    return trim(preg_replace('/[\x{200B}-\x{200F}\x{202A}-\x{202E}\x{2060}-\x{2069}\x{FEFF}]/u', '', $v) ?? '');   // unsichtbare und umkehrende Zeichen
}
function form_token(): string { $t = (string)now(); return $t . '.' . hash_hmac('sha256', 'ft' . $t, secret()); }
function form_token_ok(string $ft): bool
{
    [$t, $h] = array_pad(explode('.', $ft, 2), 2, '');
    if (!ctype_digit($t) || !hash_equals(hash_hmac('sha256', 'ft' . $t, secret()), $h)) return false;
    $age = now() - (int)$t;
    return $age >= 3 && $age <= 7200;
}

/* ---- Datenprüfung für den Sync ---- */
function clean_data($d): array
{
    if (!is_array($d)) fail(400, 'Daten ungültig');
    $max = (int)cfg('max_cards');
    $cards = $d['cards'] ?? [];
    if (!is_array($cards) || !array_is_list($cards) || count($cards) > $max) fail(400, 'Zu viele Karten oder ungültig.');
    foreach ($cards as $c) {
        if (!is_array($c) || !is_string($c['id'] ?? null) || !is_string($c['q'] ?? null) || !is_string($c['a'] ?? null)) fail(400, 'Karte ungültig');
        if (mb_strlen($c['id']) > 64 || mb_strlen($c['q']) > 8000 || mb_strlen($c['a']) > 8000) fail(400, 'Eine Karte ist zu lang (höchstens 8000 Zeichen pro Seite).');
        foreach ($c as $v) if (is_string($v) && strlen($v) > 700000) fail(400, 'Ein Feld der Karte ist zu groß.');
    }
    $cats = $d['cats'] ?? [];
    if (!is_array($cats) || !array_is_list($cats) || count($cats) > 300) fail(400, 'Rubriken ungültig');
    foreach ($cats as $c) if (!is_string($c) || mb_strlen($c) > 80) fail(400, 'Rubrik ungültig');
    foreach (['log', 'colors', 'cfg'] as $k) if (isset($d[$k]) && !is_array($d[$k])) fail(400, "$k ungültig");
    return ['cards' => $cards, 'cats' => $cats, 'log' => (object)($d['log'] ?? []), 'colors' => (object)($d['colors'] ?? []), 'cfg' => (object)($d['cfg'] ?? [])] ;
}
