-- Tabellen für den PDO-Speicher (MySQL/MariaDB), Präfix kd_ (siehe pdo_prefix). install.php legt sie selbst an; von Hand: einmal einspielen, wenn Datenbank und Name feststehen.
CREATE TABLE kd_users (
  id        INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  email     VARCHAR(190) NOT NULL,
  pw        VARCHAR(255) NOT NULL,
  pwv       INT NOT NULL DEFAULT 1,
  verified  TINYINT NOT NULL DEFAULT 0,
  created   INT UNSIGNED NOT NULL,
  nick_h    CHAR(64) NULL,          -- HMAC des Nicknames (für „schon vergeben?“), der Name selbst steht nur verschlüsselt in nick_e
  nick_e    VARCHAR(255) NULL,
  UNIQUE KEY uq_email (email),
  UNIQUE KEY uq_nick (nick_h)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE kd_tokens (
  hash CHAR(64) NOT NULL PRIMARY KEY,
  kind VARCHAR(16) NOT NULL,
  uid  INT UNSIGNED NOT NULL,
  exp  INT UNSIGNED NOT NULL,
  KEY ix_uid (uid)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE kd_kdata (
  uid     INT UNSIGNED NOT NULL PRIMARY KEY,
  rev     INT UNSIGNED NOT NULL,
  body    MEDIUMTEXT NOT NULL,
  updated INT UNSIGNED NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE kd_hits (
  k  VARCHAR(100) NOT NULL,
  ts INT UNSIGNED NOT NULL,
  KEY ix_k (k, ts)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Frühere Stände (Sicherung beim Überschreiben). Die Tabelle wird beim ersten Speichern automatisch angelegt, wenn der Datenbank-Benutzer CREATE darf.
-- Darf er es nicht, hier einmal von Hand einspielen (Präfix kd_ anpassen, falls pdo_prefix geändert wurde):
CREATE TABLE IF NOT EXISTS kd_kdv (
  id   INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  uid  INT NOT NULL,
  rev  INT NOT NULL,
  ts   INT NOT NULL,
  kind INT NOT NULL,          -- 0 = Zeit (höchstens alle 6 Stunden), 1 = Schwund (neuer Stand unter 60 %, höchstens alle 10 Minuten)
  size INT NOT NULL,
  body MEDIUMTEXT NOT NULL,
  KEY ix_uid (uid, kind, ts)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

