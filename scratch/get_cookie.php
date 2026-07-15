<?php

require 'D:/xampp/htdocs/tecla-payroll/vendor/autoload.php';
$app = require_once 'D:/xampp/htdocs/tecla-payroll/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\User;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Session;
use Illuminate\Support\Facades\Crypt;

$admin = User::where('role', 'admin')->first();
if (!$admin) {
    echo "No admin found\n";
    exit(1);
}

// Log in and start session
Auth::login($admin);
$session = $app->make('session.store');
$session->start();
$session->put(Auth::getName(), $admin->id);
$session->save();

$sessionCookieName = config('session.cookie');
$sessionId = $session->getId();

// Encrypt the session ID as Laravel's EncryptCookies middleware expects
$encrypter = $app->make('encrypter');
$encryptedSessionId = $encrypter->encrypt($sessionId, false);

echo "{$sessionCookieName}=" . $encryptedSessionId . "\n";
