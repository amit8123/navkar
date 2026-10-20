<?php
declare(strict_types=1);

use PHPMailer\PHPMailer\Exception;
use PHPMailer\PHPMailer\PHPMailer;

require __DIR__ . '/PHPMailer/src/Exception.php';
require __DIR__ . '/PHPMailer/src/PHPMailer.php';
require __DIR__ . '/PHPMailer/src/SMTP.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') { http_response_code(405); exit('Method not allowed.'); }
if (!empty($_POST['website'] ?? '')) { http_response_code(400); exit('Invalid request.'); }

$name = trim((string)($_POST['name'] ?? ''));
$phone = trim((string)($_POST['phone'] ?? ''));
$email = trim((string)($_POST['email'] ?? ''));
$message = trim((string)($_POST['message'] ?? ''));
$countryCode = preg_replace('/\D+/', '', (string)($_POST['country_code'] ?? '91'));

if ($name === '' || mb_strlen($name) > 80 || !preg_match("/^[\p{L}\p{M} .'-]+$/u", $name)) { http_response_code(422); exit('Please enter a valid name.'); }
if (!preg_match('/^[0-9+() -]{7,20}$/', $phone)) { http_response_code(422); exit('Please enter a valid phone number.'); }
if (!filter_var($email, FILTER_VALIDATE_EMAIL) || mb_strlen($email) > 120) { http_response_code(422); exit('Please enter a valid email address.'); }
if (mb_strlen($message) > 1000) { http_response_code(422); exit('Message is too long.'); }

// Configure these credentials on the server, preferably via environment variables.
$smtpUser = getenv('NAVKAR_SMTP_USER') ?: '';
$smtpPass = getenv('NAVKAR_SMTP_PASS') ?: '';
$toEmail  = getenv('NAVKAR_ENQUIRY_EMAIL') ?: '';

if ($smtpUser === '' || $smtpPass === '' || $toEmail === '') {
    error_log('Navkar Estate mail configuration is incomplete.');
    header('Location: thankyou.html'); exit;
}

try {
    $mail = new PHPMailer(true);
    $mail->isSMTP();
    $mail->Host = 'smtp.hostinger.com';
    $mail->SMTPAuth = true;
    $mail->Username = $smtpUser;
    $mail->Password = $smtpPass;
    $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
    $mail->Port = 587;
    $mail->CharSet = 'UTF-8';
    $mail->setFrom($smtpUser, 'Navkar Estate Website');
    $mail->addAddress($toEmail, 'Navkar Estate Enquiries');
    $mail->addReplyTo($email, $name);
    $mail->isHTML(true);
    $mail->Subject = 'New Navkar Estate Enquiry';
    $safe = fn(string $v): string => htmlspecialchars($v, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
    $mail->Body = '<h2>New Website Enquiry</h2><p><strong>Name:</strong> '.$safe($name).'</p><p><strong>Phone:</strong> +'.$safe($countryCode).' '.$safe($phone).'</p><p><strong>Email:</strong> '.$safe($email).'</p><p><strong>Message:</strong><br>'.nl2br($safe($message)).'</p>';
    $mail->AltBody = "New Website Enquiry\nName: {$name}\nPhone: +{$countryCode} {$phone}\nEmail: {$email}\nMessage: {$message}";
    $mail->send();
} catch (Exception $e) {
    error_log('Navkar Estate mail error: ' . $e->getMessage());
}
header('Location: thankyou.html', true, 303);
exit;
