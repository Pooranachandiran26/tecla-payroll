<?php

require 'D:/xampp/htdocs/tecla-payroll/vendor/autoload.php';
$app = require_once 'D:/xampp/htdocs/tecla-payroll/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\User;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Session;

$admin = User::where('role', 'admin')->first();
if (!$admin) {
    echo "No admin found\n";
    exit(1);
}

// Find the latest active admin session in the database
use Illuminate\Support\Facades\DB;
$sessionRow = DB::table('sessions')->where('user_id', $admin->id)->orderBy('last_activity', 'desc')->first();

if (!$sessionRow) {
    echo "No active admin session found in the DB. Let's create one:\n";
    Auth::login($admin);
    $session = $app->make('session.store');
    $session->start();
    $session->put(Auth::getName(), $admin->id);
    $session->save();
    $sessionId = $session->getId();
} else {
    $sessionId = $sessionRow->id;
    echo "Using existing active DB session ID: {$sessionId}\n";
}

$sessionCookieName = config('session.cookie');

// Encrypt the session ID as Laravel expects
$encrypter = $app->make('encrypter');
$encryptedSessionId = $encrypter->encrypt($sessionId, false);

$cookieString = "{$sessionCookieName}=" . urlencode($encryptedSessionId);

echo "Generated Cookie String: {$cookieString}\n";

// Set up the Curl request
$url = 'http://127.0.0.1:8000/payroll/live-monitor?client_id=1&date=2026-07-14';
echo "Curling: {$url}\n";

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_COOKIE, $cookieString);
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);

$output = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

echo "HTTP Code: {$httpCode}\n";
echo "Output length: " . strlen($output) . "\n";

file_put_contents('scratch/live_monitor_output.html', $output);
echo "Written output to scratch/live_monitor_output.html\n";
