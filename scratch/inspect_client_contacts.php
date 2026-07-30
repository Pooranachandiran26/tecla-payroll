<?php

putenv('DB_CONNECTION=sqlite');
putenv('DB_DATABASE=' . dirname(__DIR__) . '/database/database.sqlite');
$_ENV['DB_CONNECTION'] = 'sqlite';
$_ENV['DB_DATABASE'] = dirname(__DIR__) . '/database/database.sqlite';

require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

echo "=== CLIENTS & CONTACTS INVESTIGATION ===" . PHP_EOL;
echo "Total Clients: " . \App\Models\Client::count() . PHP_EOL;
echo "Total Contacts: " . \App\Models\ClientContact::count() . PHP_EOL . PHP_EOL;

foreach (\App\Models\Client::with('contacts')->get() as $c) {
    echo "Client #{$c->id} - {$c->company_name}:" . PHP_EOL;
    echo "  - Client Table primary_poc_name: " . ($c->primary_poc_name ?? 'NULL') . PHP_EOL;
    echo "  - Client Table primary_poc_email: " . ($c->primary_poc_email ?? 'NULL') . PHP_EOL;
    echo "  - ClientContacts count: " . $c->contacts->count() . PHP_EOL;
    foreach ($c->contacts as $cnt) {
        echo "    * Contact #{$cnt->id}: name={$cnt->name}, email={$cnt->email}, is_primary=" . ($cnt->is_primary ? '1' : '0') . ", cc_on_invoice=" . ($cnt->cc_on_invoice ? '1' : '0') . PHP_EOL;
    }
    echo PHP_EOL;
}
