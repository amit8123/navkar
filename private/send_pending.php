<?php
/**
 * Re-send lead e-mails that are still "pending" or "failed" (e.g. after you add the SMTP password).
 *   php private/send_pending.php
 * Run from the command line (or a Windows scheduled task / cron). Not reachable from the web.
 */
declare(strict_types=1);
if (PHP_SAPI !== 'cli') { http_response_code(403); exit('CLI only.'); }
date_default_timezone_set('Asia/Kolkata');
$config = require __DIR__ . '/config.php';
$m = $config['mail'];
$useSmtp = $m['smtp_user'] !== '' && $m['smtp_pass'] !== '';
require_once dirname(__DIR__) . '/PHPMailer/src/Exception.php';
require_once dirname(__DIR__) . '/PHPMailer/src/PHPMailer.php';
require_once dirname(__DIR__) . '/PHPMailer/src/SMTP.php';
use PHPMailer\PHPMailer\PHPMailer;

$pdo = new PDO(sprintf('mysql:host=%s;dbname=%s;charset=utf8mb4', $config['db']['host'], $config['db']['name']), $config['db']['user'], $config['db']['pass'], [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
$rows = $pdo->query("SELECT * FROM leads WHERE email_status IN ('pending','failed') ORDER BY id LIMIT 200")->fetchAll(PDO::FETCH_ASSOC);
echo count($rows) . " lead(s) to send\n";
$ok = 0;
foreach ($rows as $r) {
    try {
        $mail = new PHPMailer(true);
        $mail->isSMTP(); $mail->Host = $m['smtp_host']; $mail->Port = (int)$m['smtp_port']; $mail->SMTPAuth = true;
        $mail->Username = $m['smtp_user']; $mail->Password = $m['smtp_pass']; $mail->Timeout = 10; $mail->CharSet = 'UTF-8';
        $mail->SMTPSecure = $m['smtp_secure'] === 'ssl' ? PHPMailer::ENCRYPTION_SMTPS : ($m['smtp_secure'] === '' ? '' : PHPMailer::ENCRYPTION_STARTTLS);
        $mail->setFrom($m['from_email'] ?: $m['smtp_user'], $m['from_name']); foreach (preg_split('/[\s,;]+/', (string)$m['to_email'], -1, PREG_SPLIT_NO_EMPTY) as $to) { if (filter_var($to, FILTER_VALIDATE_EMAIL)) { $mail->addAddress($to); } } $mail->addReplyTo($r['email'], $r['name']);
        $label = $r['source'] === 'brochure_popup' ? 'Brochure download' : 'Site visit enquiry';
        $mail->Subject = "New lead #{$r['id']} – {$label} – {$r['name']} (delayed)";
        $mail->Body = "New lead #{$r['id']} ({$label})\nName: {$r['name']}\nPhone: +{$r['country_code']} {$r['phone']}\nEmail: {$r['email']}\n"
            . ($r['message'] ? "Message: {$r['message']}\n" : '') . "Received: {$r['created_at']}\n";
        $mail->send();
        $pdo->prepare("UPDATE leads SET email_status='sent', email_error=NULL, emailed_at=NOW() WHERE id=?")->execute([$r['id']]);
        echo "  sent #{$r['id']}\n"; $ok++;
    } catch (Throwable $e) {
        $pdo->prepare("UPDATE leads SET email_status='failed', email_error=? WHERE id=?")->execute([substr($e->getMessage(), 0, 250), $r['id']]);
        echo "  FAILED #{$r['id']}: " . $e->getMessage() . "\n";
    }
}
echo "done: {$ok}/" . count($rows) . " sent\n";