<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Restricts contract_type to only 'agency' and 'eor'.
     * Any existing 'hybrid' records are migrated to 'agency'.
     * Any existing 'consulting' records are migrated to 'eor'.
     */
    public function up(): void
    {
        // First, migrate any existing data to valid values
        DB::table('clients')
            ->where('contract_type', 'hybrid')
            ->update(['contract_type' => 'agency']);
        
        DB::table('clients')
            ->where('contract_type', 'consulting')
            ->update(['contract_type' => 'eor']);

        // Alter the enum — MySQL uses MODIFY, SQLite doesn't support ENUM changes
        // but SQLite also doesn't enforce ENUMs, so the data migration above is sufficient.
        $driver = DB::connection()->getDriverName();
        if ($driver === 'mysql' || $driver === 'mariadb') {
            DB::statement("ALTER TABLE clients MODIFY contract_type ENUM('agency', 'eor') NOT NULL DEFAULT 'agency'");
        }
        // For SQLite (used in tests): no column alter needed — SQLite ignores enum constraints.
        // The data migration above ensures all values are valid.
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        $driver = DB::connection()->getDriverName();
        if ($driver === 'mysql' || $driver === 'mariadb') {
            DB::statement("ALTER TABLE clients MODIFY contract_type ENUM('agency', 'eor', 'hybrid', 'consulting') NOT NULL DEFAULT 'agency'");
        }
    }
};
