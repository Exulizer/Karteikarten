<?php
// Standardwerte. Eigene Werte kommen in config.local.php (gleicher Ordner, nicht ins Git).
return [
    'site_name'    => 'KarteiDeck',
    'site_url'     => '',            // z. B. https://beispiel.de  (für Links in Mails; leer = nur für lokale Tests aus dem Host-Header)
    'store'        => 'file',        // 'file' (Test) oder 'pdo' (MySQL/MariaDB, siehe schema.sql)
    'data_dir'     => __DIR__ . '/data',
    'pdo_dsn'      => '',            // z. B. mysql:host=localhost;dbname=kartenbox;charset=utf8mb4
    'pdo_user'     => '',
    'pdo_pass'     => '',
    'pdo_prefix'   => 'kd_',         // Präfix der Tabellen (kd_users …), damit eine geteilte Datenbank nicht kollidiert
    'mail_mode'    => 'log',         // 'log' schreibt Mails nur in data/mail.log, 'php' versendet über mail()
    'mail_from'    => '',            // z. B. noreply@beispiel.de
    'contact_to'   => 'info@karteideck.de',            // Empfänger des Kontaktformulars
    'session_days' => 30,
    'trust_proxy'  => false,         // true nur hinter einem eigenen Proxy, der X-Forwarded-For sauber setzt
    'max_body'     => 8 * 1048576,   // Bytes pro Anfrage (auch php.ini post_max_size beachten)
    'max_cards'    => 5000,
    'max_data'     => 5 * 1048576,   // Bytes gespeicherter Karten je Konto
    'contact_pow_bits' => 17,        // Rechenaufgabe vor dem Senden des Kontaktformulars (Bits, 14 bis 22). Höher = mehr Aufwand für Bots, aber auch für Besucher
];
