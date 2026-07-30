<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$req = Illuminate\Http\Request::create('/employees/1/edit', 'GET');
$req->headers->set('X-Inertia', 'true');
// skip middleware for auth
$req->setUserResolver(function() {
    return App\Models\User::first();
});
$res = app()->handle($req);
echo $res->getContent();
