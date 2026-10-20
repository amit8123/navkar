<?php
/**
 * Navkar City – private configuration. NEVER commit or expose this file.
 * (private/.htaccess blocks web access to this folder.)
 */
// Local XAMPP (localhost) uses its own databases; the live server keeps the cPanel ones below.
$isLocal = in_array(strtolower(explode(':', (string)($_SERVER['HTTP_HOST'] ?? ''))[0]), ['localhost', '127.0.0.1', '[', '[::1]'], true);

return [
    'db' => $isLocal ? [
        'host' => '127.0.0.1',
        'name' => 'navkar_db',
        'user' => 'root',
        'pass' => '',
    ] : [
        'host' => '127.0.0.1',
        'name' => 'navka15c_website',
        'user' => 'navka15c_website',
        'pass' => 'Gc?&l$&Mj419',
    ],
    // CRM database: every website lead is also copied into its google_lead table.
    // Live: the CRM has its own MySQL user (the same login the CRM app uses).
    'crm' => $isLocal ? [
        'host' => '127.0.0.1',
        'name' => 'navka15c_crm',
        'user' => 'root',
        'pass' => '',
    ] : [
        'host' => 'localhost',
        'name' => 'navka15c_crm',
        'user' => 'navka15c_crm',
        'pass' => '8W9[h)}F!jAp',
    ],
    'mail' => [
        // Where new leads are delivered
        'to_email'   => 'harshali.budget@gmail.com, noreply@navkarcityofficial.com',   // comma-separated: every address gets each lead
        'from_name'  => 'Navkar City Website',
        'from_email' => 'noreply@navkarcityofficial.com',

        // SMTP account that SENDS the mail. For Gmail: turn on 2-Step Verification, then create an
        // "App password" (Google Account > Security > App passwords) and paste the 16 letters below.
        'smtp_host'   => 'mail.navkarcityofficial.com',
        'smtp_port'   => 465,
        'smtp_secure' => 'ssl',             // 'tls' (587) | 'ssl' (465) | '' for none
        'smtp_user'   => 'noreply@navkarcityofficial.com',
        'smtp_pass'   => 'zS6w66LUe8OB',
    ],
];