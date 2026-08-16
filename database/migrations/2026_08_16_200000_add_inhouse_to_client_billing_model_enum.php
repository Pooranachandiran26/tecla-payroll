<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        $driver = DB::connection()->getDriverName();
        if ($driver === 'mysql' || $driver === 'mariadb') {
            DB::statement("ALTER TABLE clients MODIFY billing_model ENUM('markup','fixed_per_candidate','fixed_per_month','lumpsum','hourly','inhouse') NOT NULL DEFAULT 'markup'");
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        $driver = DB::connection()->getDriverName();
        if ($driver === 'mysql' || $driver === 'mariadb') {
            DB::statement("ALTER TABLE clients MODIFY billing_model ENUM('markup','fixed_per_candidate','fixed_per_month','lumpsum','hourly') NOT NULL DEFAULT 'markup'");
        }
    }
};
