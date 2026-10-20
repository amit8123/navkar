<?php
/* TEMPORARY CRM diagnostic – upload to public_html, open once, then DELETE this file.
   Written to run on old PHP too, and to print fatal errors even when the host hides them. */
header('Content-Type: text/plain; charset=utf-8');
header('Cache-Control: no-store');
if (!isset($_GET['k']) || $_GET['k'] !== '0qkwszh2d5ynt73c') { http_response_code(404); exit('Not found'); }
error_reporting(E_ALL); ini_set('display_errors', '1');
register_shutdown_function(function () {
    $e = error_get_last();
    if ($e && in_array($e['type'], array(E_ERROR, E_PARSE, E_COMPILE_ERROR, E_CORE_ERROR), true)) {
        http_response_code(200);
        echo "\n!! FATAL: {$e['message']}\n   in {$e['file']} line {$e['line']}\n";
    }
});

echo "PHP " . PHP_VERSION . (version_compare(PHP_VERSION, '8.1', '<') ? "  <-- TOO OLD: lead.php needs PHP 8.1+ (cPanel > MultiPHP Manager)\n" : "  OK\n");

$leadFile = __DIR__ . '/lead.php';
echo "lead.php: " . (is_file($leadFile) ? (strpos((string)file_get_contents($leadFile), 'google_lead') !== false ? 'NEW version (has CRM copy)' : 'OLD version - upload the new lead.php') : 'MISSING in ' . __DIR__) . "\n";

$cfgFile = __DIR__ . '/private/config.php';
if (!is_file($cfgFile)) exit("config.php: MISSING at $cfgFile\n");
echo "config.php: loading...\n"; flush();
$cfg = require $cfgFile;
if (empty($cfg['crm']['name'])) exit("config.php: OLD version (no 'crm' section) - upload the new private/config.php\n");
$c = $cfg['crm'];
echo "crm config: name={$c['name']} user={$c['user']} host={$c['host']} pass_len=" . strlen($c['pass']) . "\n";
echo "pdo_mysql: " . (extension_loaded('pdo_mysql') ? 'yes' : 'NO') . "\n\n";

echo "== CRM DATABASE ==\n"; flush();
try {
    $crm = new PDO("mysql:host={$c['host']};dbname={$c['name']};charset=utf8mb4", $c['user'], $c['pass'], array(PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_TIMEOUT => 5));
    echo "connect: OK\n";
} catch (Exception $e) {
    echo "connect: FAILED - " . $e->getMessage() . "\n";
    echo "-> cPanel > MySQL Databases > Add User To Database: user {$c['user']} + database {$c['name']}, ALL PRIVILEGES.\n";
    exit;
}
try { foreach ($crm->query('SHOW GRANTS') as $g) echo "grant: " . reset($g) . "\n"; } catch (Exception $e) { echo "grants: " . $e->getMessage() . "\n"; }
try {
    $row = $crm->query('SHOW CREATE TABLE google_lead')->fetch(PDO::FETCH_NUM);
    echo "\n" . $row[1] . "\n\n";
    echo "google_lead rows: " . $crm->query('SELECT COUNT(*) FROM google_lead')->fetchColumn() . "\n";
} catch (Exception $e) { exit("google_lead table: FAILED - " . $e->getMessage() . "\n"); }

/* same INSERT as lead.php, inside a transaction that is rolled back -> nothing is left in the table */
try {
    $crm->beginTransaction();
    $crm->prepare('INSERT INTO google_lead (`date`, name, email, number) VALUES (?,?,?,?)')
        ->execute(array(date('Y-m-d'), 'DIAG TEST', 'diag@example.com', '9999999999'));
    echo "test INSERT: OK (rolled back, nothing saved)\n";
    $crm->rollBack();
} catch (Exception $e) {
    if ($crm->inTransaction()) $crm->rollBack();
    echo "test INSERT: FAILED - " . $e->getMessage() . "\n";
}

echo "\n== LAST CRM ERRORS IN LOG ==\n";
$found = false;
foreach (array_unique(array_filter(array((string)ini_get('error_log'), __DIR__ . '/error_log'))) as $log) {
    if (!is_readable($log)) continue;
    $all = file($log); $lines = preg_grep('/\[navkar\]|PHP Fatal/', array_slice($all ? $all : array(), -400));
    foreach (array_slice($lines, -8) as $l) { echo rtrim($l) . "\n"; $found = true; }
}
if (!$found) echo "(no [navkar] lines found)\n";
echo "\nDONE - now delete crm-diag.php from the server.\n";
