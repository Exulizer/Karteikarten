<?php
declare(strict_types=1);

/* Speicher für Konten. Die App-Logik kennt nur diese Schnittstelle.
   FileStore: eine JSON-Datei, gut für lokale Tests. PdoStore: MySQL/MariaDB (oder SQLite) über PDO. */
interface Store
{
    public function userByEmail(string $email): ?array;
    public function userById(int $id): ?array;
    public function createUser(string $email, string $pw, int $now, string $nickHash = '', string $nickEnc = ''): int;   // 0 = Adresse gibt es schon, -1 = Nickname vergeben
    public function nickFree(string $nickHash, int $exceptUid = 0): bool;
    public function setNick(int $uid, string $nickHash, string $nickEnc): bool;   // false = Nickname vergeben
    public function setUser(int $id, array $fields): void;                  // pw, pwv, verified
    public function deleteUser(int $id): void;
    public function putToken(string $kind, string $hash, int $uid, int $exp): void;
    public function takeToken(string $kind, string $hash, int $now): ?int;
    public function getData(int $uid): ?array;                              // rev, body, updated
    public function getRev(int $uid): int;                                  // nur die Revision, 0 = noch nichts gespeichert
    public function putData(int $uid, int $expectedRev, string $body, int $now): int;   // neue rev oder 0 bei Konflikt
    public function listVersions(int $uid): array;                          // frühere Stände, neueste zuerst: id, ts, cards, size
    public function restoreVersion(int $uid, int $versionId, int $now): ?array;   // setzt den Stand zurück (der jetzige wird vorher gesichert): rev, body, oder null
    public function hit(string $key, int $window, int $now): int;
    public function gc(int $now): void;
}

/* Frühere Stände: Beim Überschreiben wird der alte Stand gesichert, damit ein Fehler oder ein falscher Löschklick nie alles zerstört.
   Art 0 (Zeit): höchstens alle 6 Stunden, die letzten 4 bleiben. Art 1 (Schwund): sofort, wenn der neue Stand deutlich kleiner ist (weniger als 60 %), höchstens alle 10 Minuten, die letzten 4 bleiben.
   Beide Arten werden getrennt aufgehoben, damit eine Folge kleiner Löschungen die guten Stände nicht verdrängt. */
const KDV_EVERY = 21600, KDV_GAP = 600, KDV_KEEP = 4;
/** @param array<int,int> $last letzte Sicherung je Art (0 = Zeit, 1 = Schwund), fehlt = noch keine. Gibt die Art zurück oder null (nicht sichern). */
function kdv_kind(int $oldLen, int $newLen, array $last, int $now): ?int
{
    if ($oldLen <= 0) return null;
    if (!isset($last[0]) || $now - $last[0] >= KDV_EVERY) return 0;
    if ($oldLen >= 3000 && $newLen < $oldLen * 0.6 && (!isset($last[1]) || $now - $last[1] >= KDV_GAP)) return 1;
    return null;
}
function kdv_cards(string $body): int { return substr_count($body, '"q":'); }

final class FileStore implements Store
{
    private string $file;
    public function __construct(string $dir)
    {
        if (!is_dir($dir)) mkdir($dir, 0700, true);
        $this->file = $dir . '/store.json';
    }
    /** Liest, ändert und schreibt die Datei unter Sperre. */
    private function tx(callable $fn)
    {
        $h = fopen($this->file, 'c+');
        if (!$h) throw new RuntimeException('store open');
        flock($h, LOCK_EX);
        $raw = stream_get_contents($h);
        $db = $raw ? json_decode($raw, true) : null;
        if (!is_array($db)) $db = [];
        $db += ['next' => 1, 'users' => [], 'tokens' => [], 'data' => [], 'hits' => []];
        $res = $fn($db);
        ftruncate($h, 0); rewind($h);
        fwrite($h, json_encode($db, JSON_UNESCAPED_UNICODE));
        fflush($h); flock($h, LOCK_UN); fclose($h);
        @chmod($this->file, 0600);
        return $res;
    }
    public function userByEmail(string $email): ?array
    {
        return $this->tx(function (array &$db) use ($email) {
            foreach ($db['users'] as $u) if ($u['email'] === $email) return $u;
            return null;
        });
    }
    public function userById(int $id): ?array { return $this->tx(fn(array &$db) => $db['users'][$id] ?? null); }
    public function createUser(string $email, string $pw, int $now, string $nickHash = '', string $nickEnc = ''): int
    {
        return $this->tx(function (array &$db) use ($email, $pw, $now, $nickHash, $nickEnc) {
            foreach ($db['users'] as $u) if ($u['email'] === $email) return 0;
            if ($nickHash !== '') foreach ($db['users'] as $u) if (($u['nick_h'] ?? '') === $nickHash) return -1;
            $id = $db['next']++;
            $db['users'][$id] = ['id' => $id, 'email' => $email, 'pw' => $pw, 'pwv' => 1, 'verified' => 0, 'created' => $now, 'nick_h' => $nickHash, 'nick_e' => $nickEnc];
            return $id;
        });
    }
    public function nickFree(string $nickHash, int $exceptUid = 0): bool
    {
        return $this->tx(function (array &$db) use ($nickHash, $exceptUid) {
            foreach ($db['users'] as $u) if (($u['nick_h'] ?? '') === $nickHash && (int)$u['id'] !== $exceptUid) return false;
            return true;
        });
    }
    public function setNick(int $uid, string $nickHash, string $nickEnc): bool
    {
        return $this->tx(function (array &$db) use ($uid, $nickHash, $nickEnc) {
            if (!isset($db['users'][$uid])) return false;
            foreach ($db['users'] as $u) if (($u['nick_h'] ?? '') === $nickHash && (int)$u['id'] !== $uid) return false;
            $db['users'][$uid]['nick_h'] = $nickHash; $db['users'][$uid]['nick_e'] = $nickEnc;
            return true;
        });
    }
    public function setUser(int $id, array $f): void
    {
        $this->tx(function (array &$db) use ($id, $f) {
            if (isset($db['users'][$id])) foreach (['pw', 'pwv', 'verified'] as $k) if (array_key_exists($k, $f)) $db['users'][$id][$k] = $f[$k];
        });
    }
    public function deleteUser(int $id): void
    {
        $this->tx(function (array &$db) use ($id) {
            unset($db['users'][$id], $db['data'][$id], $db['kdv'][$id]);
            foreach ($db['tokens'] as $k => $t) if ($t['uid'] === $id) unset($db['tokens'][$k]);
        });
    }
    public function putToken(string $kind, string $hash, int $uid, int $exp): void
    {
        $this->tx(function (array &$db) use ($kind, $hash, $uid, $exp) {
            foreach ($db['tokens'] as $k => $t) if ($t['uid'] === $uid && $t['kind'] === $kind) unset($db['tokens'][$k]);
            $db['tokens'][$kind . ':' . $hash] = ['kind' => $kind, 'uid' => $uid, 'exp' => $exp];
        });
    }
    public function takeToken(string $kind, string $hash, int $now): ?int
    {
        return $this->tx(function (array &$db) use ($kind, $hash, $now) {
            $k = $kind . ':' . $hash;
            if (!isset($db['tokens'][$k])) return null;
            $t = $db['tokens'][$k];
            unset($db['tokens'][$k]);
            return $t['exp'] > $now && isset($db['users'][$t['uid']]) ? $t['uid'] : null;
        });
    }
    public function getData(int $uid): ?array { return $this->tx(fn(array &$db) => $db['data'][$uid] ?? null); }
    public function getRev(int $uid): int { return (int)($this->tx(fn(array &$db) => $db['data'][$uid]['rev'] ?? 0)); }
    public function putData(int $uid, int $expectedRev, string $body, int $now): int
    {
        return $this->tx(function (array &$db) use ($uid, $expectedRev, $body, $now) {
            $cur = $db['data'][$uid]['rev'] ?? 0;
            if ($cur !== $expectedRev) return 0;
            if ($cur > 0) {
                $last = [];
                foreach ($db['kdv'][$uid] ?? [] as $v) if (!isset($last[$v['kind']]) || $v['ts'] > $last[$v['kind']]) $last[$v['kind']] = $v['ts'];
                $k = kdv_kind(strlen($db['data'][$uid]['body']), strlen($body), $last, $now);
                if ($k !== null) $this->fileArchive($db, $uid, $k, $now);
            }
            $db['data'][$uid] = ['rev' => $cur + 1, 'body' => $body, 'updated' => $now];
            return $cur + 1;
        });
    }
    private function fileArchive(array &$db, int $uid, int $kind, int $now): void
    {
        $cur = $db['data'][$uid] ?? null;
        if (!$cur) return;
        $list = $db['kdv'][$uid] ?? [];
        $db['kdv'][$uid] = array_merge([['id' => ($db['kdvnext'] = ($db['kdvnext'] ?? 0) + 1), 'rev' => $cur['rev'], 'ts' => $now, 'kind' => $kind, 'body' => $cur['body']]], $list);
        $n = 0;
        $db['kdv'][$uid] = array_values(array_filter($db['kdv'][$uid], function ($v) use ($kind, &$n) { return $v['kind'] !== $kind || ++$n <= KDV_KEEP; }));
    }
    public function listVersions(int $uid): array
    {
        return $this->tx(function (array &$db) use ($uid) {
            $out = [];
            foreach ($db['kdv'][$uid] ?? [] as $v) $out[] = ['id' => (int)$v['id'], 'ts' => (int)$v['ts'], 'cards' => kdv_cards($v['body']), 'size' => strlen($v['body'])];
            return $out;
        });
    }
    public function restoreVersion(int $uid, int $versionId, int $now): ?array
    {
        return $this->tx(function (array &$db) use ($uid, $versionId, $now) {
            $hit = null;
            foreach ($db['kdv'][$uid] ?? [] as $v) if ((int)$v['id'] === $versionId) $hit = $v;
            if (!$hit) return null;
            $this->fileArchive($db, $uid, 1, $now);
            $rev = ($db['data'][$uid]['rev'] ?? 0) + 1;
            $db['data'][$uid] = ['rev' => $rev, 'body' => $hit['body'], 'updated' => $now];
            return ['rev' => $rev, 'body' => $hit['body']];
        });
    }
    public function hit(string $key, int $window, int $now): int
    {
        return $this->tx(function (array &$db) use ($key, $window, $now) {
            $list = array_values(array_filter($db['hits'][$key] ?? [], fn($t) => $t > $now - $window));
            $list[] = $now;
            $db['hits'][$key] = $list;
            return count($list);
        });
    }
    public function gc(int $now): void
    {
        $this->tx(function (array &$db) use ($now) {
            foreach ($db['tokens'] as $k => $t) if ($t['exp'] < $now) unset($db['tokens'][$k]);
            foreach ($db['hits'] as $k => $l) {
                $l = array_values(array_filter($l, fn($t) => $t > $now - 86400));
                if ($l) $db['hits'][$k] = $l; else unset($db['hits'][$k]);
            }
            foreach ($db['users'] as $id => $u) if (!$u['verified'] && $u['created'] < $now - 172800) {
                unset($db['users'][$id], $db['data'][$id]);
                foreach ($db['tokens'] as $k => $t) if ($t['uid'] === $id) unset($db['tokens'][$k]);
            }
        });
    }
}

final class PdoStore implements Store
{
    private PDO $db;
    private string $pre;
    public function __construct(string $dsn, string $user, string $pass, string $prefix = 'kd_')
    {
        $this->pre = preg_match('/^[A-Za-z0-9_]{0,20}$/', $prefix) ? $prefix : 'kd_';   // Tabellen-Präfix, damit eine geteilte Datenbank nicht kollidiert
        $this->db = new PDO($dsn, $user, $pass, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_EMULATE_PREPARES => false,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]);
    }
    private function q(string $sql, array $p = []): PDOStatement
    {
        $s = $this->db->prepare(preg_replace('/\b(FROM|INTO|UPDATE)\s+(users|tokens|kdata|kdv|hits)\b/', '$1 ' . $this->pre . '$2', $sql));
        $s->execute($p);
        return $s;
    }
    private function user(?array $r): ?array
    {
        return $r ? ['id' => (int)$r['id'], 'email' => $r['email'], 'pw' => $r['pw'], 'pwv' => (int)$r['pwv'], 'verified' => (int)$r['verified'], 'created' => (int)$r['created'], 'nick_h' => (string)($r['nick_h'] ?? ''), 'nick_e' => (string)($r['nick_e'] ?? '')] : null;
    }
    public function userByEmail(string $email): ?array { return $this->user($this->q('SELECT * FROM users WHERE email = ?', [$email])->fetch() ?: null); }
    public function userById(int $id): ?array { return $this->user($this->q('SELECT * FROM users WHERE id = ?', [$id])->fetch() ?: null); }
    public function createUser(string $email, string $pw, int $now, string $nickHash = '', string $nickEnc = ''): int
    {
        try {
            $this->q('INSERT INTO users (email, pw, pwv, verified, created, nick_h, nick_e) VALUES (?, ?, 1, 0, ?, ?, ?)', [$email, $pw, $now, $nickHash === '' ? null : $nickHash, $nickEnc === '' ? null : $nickEnc]);
            return (int)$this->db->lastInsertId();
        } catch (PDOException $e) {
            if ($this->userByEmail($email)) return 0;
            if ($nickHash !== '' && !$this->nickFree($nickHash)) return -1;
            throw $e;
        }
    }
    public function nickFree(string $nickHash, int $exceptUid = 0): bool
    {
        $r = $this->q('SELECT id FROM users WHERE nick_h = ?', [$nickHash])->fetch();
        return !$r || (int)$r['id'] === $exceptUid;
    }
    public function setNick(int $uid, string $nickHash, string $nickEnc): bool
    {
        if (!$this->nickFree($nickHash, $uid)) return false;
        try { $this->q('UPDATE users SET nick_h = ?, nick_e = ? WHERE id = ?', [$nickHash, $nickEnc, $uid]); return true; }
        catch (PDOException $e) { return false; }   // gleichzeitig vergeben: die UNIQUE-Sperre der Datenbank greift
    }
    public function setUser(int $id, array $f): void
    {
        foreach (['pw', 'pwv', 'verified'] as $k) if (array_key_exists($k, $f)) $this->q("UPDATE users SET $k = ? WHERE id = ?", [$f[$k], $id]);
    }
    public function deleteUser(int $id): void
    {
        $this->db->beginTransaction();
        $this->q('DELETE FROM tokens WHERE uid = ?', [$id]);
        $this->q('DELETE FROM kdata WHERE uid = ?', [$id]);
        try { $this->q('DELETE FROM kdv WHERE uid = ?', [$id]); } catch (Throwable $e) {}   // Tabelle für frühere Stände kann noch fehlen
        $this->q('DELETE FROM users WHERE id = ?', [$id]);
        $this->db->commit();
    }
    public function putToken(string $kind, string $hash, int $uid, int $exp): void
    {
        $this->q('DELETE FROM tokens WHERE uid = ? AND kind = ?', [$uid, $kind]);
        $this->q('INSERT INTO tokens (hash, kind, uid, exp) VALUES (?, ?, ?, ?)', [$hash, $kind, $uid, $exp]);
    }
    public function takeToken(string $kind, string $hash, int $now): ?int
    {
        $r = $this->q('SELECT uid, exp FROM tokens WHERE hash = ? AND kind = ?', [$hash, $kind])->fetch();
        if (!$r) return null;
        if ($this->q('DELETE FROM tokens WHERE hash = ? AND kind = ?', [$hash, $kind])->rowCount() !== 1) return null;   // wer zuerst löscht, bekommt den Link, auch bei zwei gleichzeitigen Aufrufen
        return (int)$r['exp'] > $now ? (int)$r['uid'] : null;
    }
    public function getData(int $uid): ?array
    {
        $r = $this->q('SELECT rev, body, updated FROM kdata WHERE uid = ?', [$uid])->fetch();
        return $r ? ['rev' => (int)$r['rev'], 'body' => $r['body'], 'updated' => (int)$r['updated']] : null;
    }
    public function getRev(int $uid): int
    {
        $r = $this->q('SELECT rev FROM kdata WHERE uid = ?', [$uid])->fetch();
        return $r ? (int)$r['rev'] : 0;
    }
    public function putData(int $uid, int $expectedRev, string $body, int $now): int
    {
        if ($expectedRev === 0) {
            try { $this->q('INSERT INTO kdata (uid, rev, body, updated) VALUES (?, 1, ?, ?)', [$uid, $body, $now]); return 1; }
            catch (PDOException $e) { return 0; }
        }
        $this->archive($uid, $expectedRev, strlen($body), $now);
        $n = $this->q('UPDATE kdata SET rev = rev + 1, body = ?, updated = ? WHERE uid = ? AND rev = ?', [$body, $now, $uid, $expectedRev])->rowCount();
        return $n === 1 ? $expectedRev + 1 : 0;
    }
    /* Sichert den jetzigen Stand, wenn die Regeln es verlangen. Das Sichern darf das Speichern nie verhindern: jeder Fehler wird verschluckt.
       Der Stand wird in der Datenbank kopiert (INSERT ... SELECT), er läuft nicht durch PHP. */
    private function archive(int $uid, int $rev, int $newLen, int $now, ?int $force = null, bool $again = false): void
    {
        try {
            $k = $force;
            if ($k === null) {
                $o = $this->q('SELECT rev, LENGTH(body) AS len FROM kdata WHERE uid = ?', [$uid])->fetch();
                if (!$o || (int)$o['rev'] !== $rev) return;
                $last = [];
                foreach ($this->q('SELECT kind, MAX(ts) AS t FROM kdv WHERE uid = ? GROUP BY kind', [$uid])->fetchAll() as $r) $last[(int)$r['kind']] = (int)$r['t'];
                $k = kdv_kind((int)$o['len'], $newLen, $last, $now);
            }
            if ($k === null) return;
            $this->q('INSERT INTO kdv (uid, rev, ts, kind, size, body) SELECT uid, rev, ?, ?, LENGTH(body), body FROM kdata WHERE uid = ? AND rev = ?', [$now, $k, $uid, $rev]);
            $this->q('DELETE FROM kdv WHERE uid = ? AND kind = ? AND id NOT IN (SELECT id FROM (SELECT id FROM kdv WHERE uid = ? AND kind = ? ORDER BY ts DESC, id DESC LIMIT ' . KDV_KEEP . ') t)', [$uid, $k, $uid, $k]);
        } catch (Throwable $e) {
            $this->makeKdv();   // Tabelle fehlt noch: anlegen und diese Sicherung einmal nachholen
            if (!$again) $this->archive($uid, $rev, $newLen, $now, $force, true);
        }
    }
    private function makeKdv(): void
    {
        try {
            $sqlite = $this->db->getAttribute(PDO::ATTR_DRIVER_NAME) === 'sqlite';
            $t = $this->pre . 'kdv';
            $this->db->exec("CREATE TABLE IF NOT EXISTS $t (id " . ($sqlite ? 'INTEGER PRIMARY KEY AUTOINCREMENT' : 'INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY')
                . ", uid INT NOT NULL, rev INT NOT NULL, ts INT NOT NULL, kind INT NOT NULL, size INT NOT NULL, body MEDIUMTEXT NOT NULL"
                . ($sqlite ? ')' : ', KEY ix_uid (uid, kind, ts)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4'));
            if ($sqlite) $this->db->exec("CREATE INDEX IF NOT EXISTS {$t}_u ON $t (uid, kind, ts)");
        } catch (Throwable $e) {
            error_log('kartenbox kdv: ' . $e->getMessage());
        }
    }
    public function listVersions(int $uid): array
    {
        try {
            $rows = $this->q('SELECT id, ts, size, (LENGTH(body) - LENGTH(REPLACE(body, \'"q":\', \'\'))) / 4 AS cards FROM kdv WHERE uid = ? ORDER BY ts DESC, id DESC', [$uid])->fetchAll();
        } catch (Throwable $e) { $this->makeKdv(); return []; }
        return array_map(fn($r) => ['id' => (int)$r['id'], 'ts' => (int)$r['ts'], 'cards' => (int)$r['cards'], 'size' => (int)$r['size']], $rows);
    }
    public function restoreVersion(int $uid, int $versionId, int $now): ?array
    {
        try { $v = $this->q('SELECT body FROM kdv WHERE id = ? AND uid = ?', [$versionId, $uid])->fetch(); } catch (Throwable $e) { return null; }
        if (!$v) return null;
        $cur = $this->q('SELECT rev FROM kdata WHERE uid = ?', [$uid])->fetch();
        if (!$cur) return null;
        $this->archive($uid, (int)$cur['rev'], 0, $now, 1);   // der jetzige Stand bleibt zurückholbar
        $this->q('UPDATE kdata SET rev = rev + 1, body = ?, updated = ? WHERE uid = ?', [$v['body'], $now, $uid]);
        $rev = (int)$this->q('SELECT rev FROM kdata WHERE uid = ?', [$uid])->fetch()['rev'];
        return ['rev' => $rev, 'body' => $v['body']];
    }
    public function hit(string $key, int $window, int $now): int
    {
        $this->q('INSERT INTO hits (k, ts) VALUES (?, ?)', [$key, $now]);
        return (int)$this->q('SELECT COUNT(*) AS n FROM hits WHERE k = ? AND ts > ?', [$key, $now - $window])->fetch()['n'];
    }
    public function gc(int $now): void
    {
        $this->q('DELETE FROM tokens WHERE exp < ?', [$now]);
        $this->q('DELETE FROM hits WHERE ts < ?', [$now - 86400]);
        $ids = $this->q('SELECT id FROM users WHERE verified = 0 AND created < ?', [$now - 172800])->fetchAll();
        foreach ($ids as $r) $this->deleteUser((int)$r['id']);
    }
}
