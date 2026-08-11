<?php
require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;

if (!Schema::hasColumn('employees', 'pf_validation_status')) {
    Schema::table('employees', function (Blueprint $table) {
        $table->string('pf_validation_status')->nullable()->after('pf_applicable');
    });
    echo "COLUMN_ADDED\n";
} else {
    echo "COLUMN_EXISTS\n";
}
