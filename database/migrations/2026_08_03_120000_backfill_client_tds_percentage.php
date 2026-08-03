<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement("
            UPDATE clients 
            SET client_tds_percentage = CASE 
                WHEN tds_applicable_on_agency_fee = '1' THEN 1.00
                WHEN tds_applicable_on_agency_fee = '2' THEN 2.00
                WHEN tds_applicable_on_agency_fee = '10' THEN 10.00
                WHEN tds_applicable_on_agency_fee = 'na' THEN NULL
                WHEN tds_applicable_on_agency_fee REGEXP '^[0-9]+(\\\\.[0-9]+)?$' THEN CAST(tds_applicable_on_agency_fee AS DECIMAL(5,2))
                ELSE client_tds_percentage
            END
        ");
    }

    public function down(): void
    {
        // No-op
    }
};
