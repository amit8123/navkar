<?php
/**
 * Navkar City – lead endpoint.
 * Receives the enquiry form and the brochure popup, stores the lead in MySQL
 * and e-mails it to the sales inbox (SMTP via PHPMailer).
 * Returns JSON for AJAX calls, or redirects to thankyou.html for plain form posts.
 */
declare(strict_types=1);

use PHPMailer\PHPMailer\Exception as MailException;
use PHPMailer\PHPMailer\PHPMailer;

date_default_timezone_set('Asia/Kolkata');
$config = require __DIR__ . '/private/config.php';
$wantsJson = (($_SERVER['HTTP_X_REQUESTED_WITH'] ?? '') === 'XMLHttpRequest')
    || str_contains((string)($_SERVER['HTTP_ACCEPT'] ?? ''), 'application/json');

function respond(bool $ok, string $message, int $status = 200, array $extra = []): never
{
    global $wantsJson;
    if ($wantsJson) {
        http_response_code($status);
        header('Content-Type: application/json; charset=utf-8');
        header('Cache-Control: no-store');
        echo json_encode(['ok' => $ok, 'message' => $message] + $extra, JSON_UNESCAPED_UNICODE);
    } elseif ($ok) {
        header('Location: thankyou.html');
    } else {
        http_response_code($status);
        header('Content-Type: text/plain; charset=utf-8');
        echo $message;
    }
    exit;
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    header('Allow: POST');
    respond(false, 'Method not allowed.', 405);
}

/* honeypot: bots fill the hidden "website" field – pretend success, store nothing */
if (trim((string)($_POST['website'] ?? '')) !== '') {
    respond(true, 'Thank you!');
}

/* ---------- input ---------- */
$name        = trim((string)($_POST['name'] ?? ''));
$countryCode = preg_replace('/\D+/', '', (string)($_POST['country_code'] ?? '91')) ?: '91';
$phoneRaw    = trim((string)($_POST['phone'] ?? ''));
$email       = trim((string)($_POST['email'] ?? ''));
$message     = trim((string)($_POST['message'] ?? ''));
$source      = ($_POST['source'] ?? '') === 'brochure_popup' ? 'brochure_popup' : 'enquiry_form';
$consent     = (($_POST['consent'] ?? '') === '1') ? 1 : 0;
if ($source === 'brochure_popup' && $message === '') {
    $message = 'Brochure download request (website popup)';
}

if ($name === '' || mb_strlen($name) > 80 || !preg_match("/^[\p{L}\p{M} .'-]{2,80}$/u", $name)) {
    respond(false, 'Please enter a valid name.', 422);
}
$phone = preg_replace('/\D+/', '', $phoneRaw);
if (!preg_match('/^[0-9+() -]{7,20}$/', $phoneRaw) || strlen($phone) < 7 || strlen($phone) > 15) {
    respond(false, 'Please enter a valid phone number.', 422);
}
if (!filter_var($email, FILTER_VALIDATE_EMAIL) || mb_strlen($email) > 120) {
    respond(false, 'Please enter a valid email address.', 422);
}
if ($consent !== 1) {
    respond(false, $source === 'brochure_popup' ? 'Please tick the checkbox to receive your brochure.' : 'Please tick the checkbox to submit your enquiry.', 422);
}
if (mb_strlen($message) > 1000) {
    respond(false, 'Message is too long.', 422);
}
if (strlen($countryCode) > 5) {
    $countryCode = '91';
}

$ip   = substr((string)($_SERVER['REMOTE_ADDR'] ?? ''), 0, 45);
$ua   = substr((string)($_SERVER['HTTP_USER_AGENT'] ?? ''), 0, 255);
$page = substr((string)($_SERVER['HTTP_REFERER'] ?? ''), 0, 255);

/* ---------- database ---------- */
try {
    $pdo = new PDO(
        sprintf('mysql:host=%s;dbname=%s;charset=utf8mb4', $config['db']['host'], $config['db']['name']),
        $config['db']['user'],
        $config['db']['pass'],
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_EMULATE_PREPARES => false, PDO::ATTR_TIMEOUT => 5]
    );

    /* rate limit: 6 submissions / 10 min / IP */
    $q = $pdo->prepare('SELECT COUNT(*) FROM leads WHERE ip_address = ? AND created_at > (NOW() - INTERVAL 10 MINUTE)');
    $q->execute([$ip]);
    if ((int)$q->fetchColumn() >= 6) {
        respond(false, 'Too many requests. Please try again in a few minutes.', 429);
    }

    /* duplicate guard (double click / refresh): same phone + source in the last 2 minutes */
    $q = $pdo->prepare('SELECT id FROM leads WHERE phone = ? AND source = ? AND created_at > (NOW() - INTERVAL 2 MINUTE) LIMIT 1');
    $q->execute([$phone, $source]);
    if ($q->fetchColumn()) {
        respond(true, 'Thank you! We have your details.', 200, ['duplicate' => true]);
    }

    try {
        $ins = $pdo->prepare(
            'INSERT INTO leads (name, country_code, phone, email, message, source, page_url, ip_address, user_agent, consent, consented_at)
             VALUES (?,?,?,?,?,?,?,?,?,?,?)'
        );
        $ins->execute([$name, $countryCode, $phone, $email, $message ?: null, $source, $page ?: null, $ip ?: null, $ua ?: null, $consent, $consent ? date('Y-m-d H:i:s') : null]);
    } catch (PDOException $e) {
        if (stripos($e->getMessage(), 'Unknown column') === false) { throw $e; }
        /* table was created before the consent columns existed -> still save the lead */
        $ins = $pdo->prepare(
            'INSERT INTO leads (name, country_code, phone, email, message, source, page_url, ip_address, user_agent)
             VALUES (?,?,?,?,?,?,?,?,?)'
        );
        $ins->execute([$name, $countryCode, $phone, $email, $message ?: null, $source, $page ?: null, $ip ?: null, $ua ?: null]);
    }
    $leadId = (int)$pdo->lastInsertId();
} catch (Throwable $e) {
    error_log('[navkar] DB error: ' . $e->getMessage());
    respond(false, 'Sorry, we could not save your details right now. Please call us on +91 77239 98811.', 500);
}

/* ---------- CRM copy (best effort: a CRM problem must never lose the website lead) ---------- */
if (!empty($config['crm']['name'])) {
    try {
        $crm = new PDO(
            sprintf('mysql:host=%s;dbname=%s;charset=utf8mb4', $config['crm']['host'], $config['crm']['name']),
            $config['crm']['user'],
            $config['crm']['pass'],
            [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_EMULATE_PREPARES => false, PDO::ATTR_TIMEOUT => 5]
        );
        $crmNumber = $countryCode === '91' ? substr($phone, -10) : substr($countryCode . $phone, 0, 15);
        $crm->prepare('INSERT INTO google_lead (`date`, name, email, number) VALUES (?,?,?,?)')
            ->execute([date('Y-m-d'), mb_substr($name, 0, 100), mb_substr($email, 0, 50), $crmNumber]);
    } catch (Throwable $e) {
        error_log('[navkar] CRM save failed: ' . $e->getMessage());
    }
    $crm = null; /* release the CRM connection now, not after the (slow) e-mail step */
}

/* ---------- e-mail ---------- */
$emailStatus = 'pending';
$emailError  = null;
$mailCfg     = $config['mail'];

/* Sender address: must be on the website's own domain (SPF/DKIM pass -> inbox, not spam). */
$siteHost = strtolower(explode(':', (string)($_SERVER['HTTP_HOST'] ?? 'localhost'))[0]);
$siteHost = preg_replace('/^www\./', '', $siteHost);
if (!preg_match('/^[a-z0-9.-]+\.[a-z]{2,}$/', $siteHost)) { $siteHost = 'localhost.localdomain'; }
$fromEmail = $mailCfg['from_email'] !== '' ? $mailCfg['from_email'] : ($mailCfg['smtp_user'] !== '' ? $mailCfg['smtp_user'] : 'noreply@' . $siteHost);
$useSmtp   = $mailCfg['smtp_user'] !== '' && $mailCfg['smtp_pass'] !== '';

if (true) {
    try {
        require_once __DIR__ . '/PHPMailer/src/Exception.php';
        require_once __DIR__ . '/PHPMailer/src/PHPMailer.php';
        require_once __DIR__ . '/PHPMailer/src/SMTP.php';

        $mail = new PHPMailer(true);
        if ($useSmtp) {
            $mail->isSMTP();
            $mail->Host       = $mailCfg['smtp_host'];
            $mail->Port       = (int)$mailCfg['smtp_port'];
            $mail->SMTPAuth   = true;
            $mail->Username   = $mailCfg['smtp_user'];
            $mail->Password   = $mailCfg['smtp_pass'];
            $mail->SMTPSecure = $mailCfg['smtp_secure'] === 'ssl' ? PHPMailer::ENCRYPTION_SMTPS : ($mailCfg['smtp_secure'] === '' ? '' : PHPMailer::ENCRYPTION_STARTTLS);
            $mail->SMTPAutoTLS = $mailCfg['smtp_secure'] !== '';
            $mail->Timeout    = 8;
        } else {
            $mail->isMail();                       /* server's own mail system - no password needed */
            $mail->Sender = $fromEmail;            /* envelope sender (Return-Path) = same domain */
        }
        $mail->CharSet    = 'UTF-8';
        $mail->XMailer    = ' ';
        $mail->setFrom($fromEmail, $mailCfg['from_name']);
        foreach (preg_split('/[\s,;]+/', (string)$mailCfg['to_email'], -1, PREG_SPLIT_NO_EMPTY) as $to) { if (filter_var($to, FILTER_VALIDATE_EMAIL)) { $mail->addAddress($to); } }
        $mail->addReplyTo($email, $name);

        $label = $source === 'brochure_popup' ? 'Brochure download' : 'Site visit enquiry';
        $h = static function (string $s): string { return htmlspecialchars($s, ENT_QUOTES, 'UTF-8'); };
        $full = '+' . $countryCode . ' ' . $phone;
        $when = date('d M Y, h:i A');

        $mail->isHTML(true);
        $mail->Subject = "New lead #{$leadId} – {$label} – {$name}";
        $mail->Body = '<div style="font-family:Segoe UI,Arial,sans-serif;max-width:560px;margin:auto;border:1px solid #e8dfd2;border-radius:14px;overflow:hidden">'
            . '<div style="background:#a31f24;color:#fff;padding:18px 24px"><div style="font-size:12px;letter-spacing:.14em;text-transform:uppercase;opacity:.85">Navkar City · New lead</div>'
            . '<div style="font-size:22px;font-weight:600;margin-top:4px">' . $h($label) . '</div></div>'
            . '<table style="width:100%;border-collapse:collapse;font-size:15px;color:#14233a">'
            . '<tr><td style="padding:12px 24px;color:#5d6878;width:130px">Name</td><td style="padding:12px 24px;font-weight:600">' . $h($name) . '</td></tr>'
            . '<tr style="background:#faf6f0"><td style="padding:12px 24px;color:#5d6878">Phone</td><td style="padding:12px 24px;font-weight:600"><a style="color:#a31f24;text-decoration:none" href="tel:+' . $h($countryCode . $phone) . '">' . $h($full) . '</a></td></tr>'
            . '<tr><td style="padding:12px 24px;color:#5d6878">Email</td><td style="padding:12px 24px"><a style="color:#a31f24" href="mailto:' . $h($email) . '">' . $h($email) . '</a></td></tr>'
            . ($message !== '' ? '<tr style="background:#faf6f0"><td style="padding:12px 24px;color:#5d6878;vertical-align:top">Message</td><td style="padding:12px 24px">' . nl2br($h($message)) . '</td></tr>' : '')
            . '<tr style="background:#faf6f0"><td style="padding:12px 24px;color:#5d6878;vertical-align:top">Consent</td><td style="padding:12px 24px">' . ($consent ? 'Yes – agreed to be contacted via Email, SMS, WhatsApp and Call (overrides DND/NDNC)' : 'Not given') . '</td></tr>'
            . '<tr><td style="padding:12px 24px;color:#5d6878">Received</td><td style="padding:12px 24px">' . $h($when) . '</td></tr>'
            . '</table><div style="padding:14px 24px;background:#f4ede4;font-size:12px;color:#5d6878">Lead ID #' . $leadId . ' · stored in navkar_db.leads</div></div>';
        $mail->AltBody = "New lead #{$leadId} ({$label})\nName: {$name}\nPhone: {$full}\nEmail: {$email}\n"
            . ($message !== '' ? "Message: {$message}\n" : '')
            . 'Consent: ' . ($consent ? 'Yes - Email, SMS, WhatsApp, Call (overrides DND/NDNC)' : 'Not given') . "\n"
            . "Received: {$when}\n";
        $mail->send();
        $emailStatus = 'sent';
    } catch (Throwable $e) {
        $emailStatus = 'failed';
        $emailError  = substr($e instanceof MailException ? $e->getMessage() : get_class($e) . ': ' . $e->getMessage(), 0, 250);
        error_log('[navkar] mail error: ' . $emailError);
    }
}

try {
    $upd = $pdo->prepare('UPDATE leads SET email_status = ?, email_error = ?, emailed_at = IF(? = \'sent\', NOW(), NULL) WHERE id = ?');
    $upd->execute([$emailStatus, $emailError, $emailStatus, $leadId]);
} catch (Throwable $e) {
    error_log('[navkar] status update error: ' . $e->getMessage());
}

respond(true, 'Thank you, ' . $name . '! Our team will contact you shortly.', 200, ['id' => $leadId]);
