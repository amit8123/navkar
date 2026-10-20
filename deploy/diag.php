<?php
/* TEMPORARY diagnostic – upload, open once, then DELETE this file. */
declare(strict_types=1);
header('Content-Type: text/plain; charset=utf-8');
header('Cache-Control: no-store');
if (!hash_equals('q3t0vfer1sx7aynz', (string)($_GET['k'] ?? ''))) { http_response_code(404); exit('Not found'); }
error_reporting(E_ALL); ini_set('display_errors', '1');

$cfgFile = __DIR__ . '/private/config.php';
echo "PHP " . PHP_VERSION . "\n";
echo "config.php: " . (is_file($cfgFile) ? 'found' : 'MISSING at ' . $cfgFile) . "\n";
if (!is_file($cfgFile)) exit;
$cfg = require $cfgFile;
$db = $cfg['db']; $m = $cfg['mail'];
echo "db name=" . $db['name'] . "  user=" . $db['user'] . "  host=" . $db['host'] . "  pass_len=" . strlen($db['pass']) . "\n";
echo "pdo_mysql: " . (extension_loaded('pdo_mysql') ? 'yes' : 'NO') . "\n\n";

echo "== DATABASE ==\n";
$pdo = null;
foreach (array_unique([$db['host'], 'localhost', '127.0.0.1']) as $host) {
    try {
        $pdo = new PDO("mysql:host=$host;dbname={$db['name']};charset=utf8mb4", $db['user'], $db['pass'], [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_TIMEOUT => 5]);
        echo "connect via $host: OK\n"; break;
    } catch (Throwable $e) { echo "connect via $host: FAILED - " . $e->getMessage() . "\n"; }
}
if ($pdo) {
    $tables = $pdo->query('SHOW TABLES')->fetchAll(PDO::FETCH_COLUMN);
    echo "tables: " . ($tables ? implode(', ', $tables) : '(none - import navkar-database.sql)') . "\n";
    if (in_array('leads', $tables, true)) {
        echo "leads rows: " . $pdo->query('SELECT COUNT(*) FROM leads')->fetchColumn() . "\n";
        foreach ($pdo->query('SELECT id, source, email_status, LEFT(COALESCE(email_error,\'\'),160) AS err, created_at FROM leads ORDER BY id DESC LIMIT 5') as $r) {
            echo "  #{$r['id']} {$r['source']} email={$r['email_status']} {$r['created_at']} {$r['err']}\n";
        }
        try {
            $pdo->prepare('INSERT INTO leads (name,country_code,phone,email,message,source) VALUES (?,?,?,?,?,?)')->execute(['DIAG TEST','91','9999999999','diag@example.com','diagnostic row','enquiry_form']);
            echo "test INSERT: OK (row id " . $pdo->lastInsertId() . " - delete it in phpMyAdmin)\n";
        } catch (Throwable $e) { echo "test INSERT: FAILED - " . $e->getMessage() . "\n"; }
    }
}

echo "\n== MAIL ==\n";
echo "smtp_host={$m['smtp_host']} port={$m['smtp_port']} secure={$m['smtp_secure']} user={$m['smtp_user']} pass_len=" . strlen($m['smtp_pass']) . "\n";
require_once __DIR__ . '/PHPMailer/src/Exception.php';
require_once __DIR__ . '/PHPMailer/src/PHPMailer.php';
require_once __DIR__ . '/PHPMailer/src/SMTP.php';
$tries = [
    [$m['smtp_host'], (int)$m['smtp_port'], $m['smtp_secure']],
    [$m['smtp_host'], 587, 'tls'],
    ['localhost', 465, 'ssl'],
    ['localhost', 587, 'tls'],
    ['localhost', 25, ''],
];
$good = null;
foreach ($tries as [$host, $port, $sec]) {
    $mail = new PHPMailer\PHPMailer\PHPMailer(true);
    try {
        $mail->isSMTP(); $mail->Host = $host; $mail->Port = $port; $mail->SMTPAuth = true; $mail->Username = $m['smtp_user']; $mail->Password = $m['smtp_pass'];
        $mail->SMTPSecure = $sec === 'ssl' ? 'ssl' : ($sec === 'tls' ? 'tls' : ''); $mail->SMTPAutoTLS = $sec !== ''; $mail->Timeout = 8;
        $mail->SMTPOptions = ['ssl' => ['verify_peer' => false, 'verify_peer_name' => false, 'allow_self_signed' => true]];
        $ok = $mail->smtpConnect();
        echo "smtp $host:$port " . ($sec ?: 'plain') . " -> " . ($ok ? 'LOGIN OK' : 'failed') . "\n";
        if ($ok) { $good = [$host, $port, $sec]; $mail->smtpClose(); break; }
    } catch (Throwable $e) { echo "smtp $host:$port " . ($sec ?: 'plain') . " -> FAILED: " . $e->getMessage() . "\n"; }
}
if ($good && isset($_GET['send'])) {
    $mail = new PHPMailer\PHPMailer\PHPMailer(true);
    try {
        $mail->isSMTP(); $mail->Host = $good[0]; $mail->Port = $good[1]; $mail->SMTPAuth = true; $mail->Username = $m['smtp_user']; $mail->Password = $m['smtp_pass'];
        $mail->SMTPSecure = $good[2] === 'ssl' ? 'ssl' : ($good[2] === 'tls' ? 'tls' : ''); $mail->Timeout = 10;
        $mail->SMTPOptions = ['ssl' => ['verify_peer' => false, 'verify_peer_name' => false, 'allow_self_signed' => true]];
        $mail->setFrom($m['from_email'] ?: $m['smtp_user'], $m['from_name']); foreach (preg_split('/[\s,;]+/', (string)$m['to_email'], -1, PREG_SPLIT_NO_EMPTY) as $to) { $mail->addAddress($to); }
        $mail->Subject = 'Navkar City - test mail'; $mail->Body = "Test mail sent from the website server.\n";
        $mail->send(); echo "test mail sent to {$m['to_email']}: OK\n";
    } catch (Throwable $e) { echo "test mail: FAILED - " . $e->getMessage() . "\n"; }
} else { echo "(add &send=1 to the URL to send a test mail)\n"; }
echo "\nDONE - now delete diag.php from the server.\n";