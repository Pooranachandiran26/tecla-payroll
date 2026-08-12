<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $driver = DB::connection()->getDriverName();
        if ($driver === 'sqlite') {
            $clients = DB::table('clients')->get();
            foreach ($clients as $c) {
                $val = $c->tds_applicable_on_agency_fee ?? null;
                $pct = match ($val) {
                    '1' => 1.00,
                    '2' => 2.00,
                    '10' => 10.00,
                    'na' => null,
                    default => is_numeric($val) ? (float) $val : $c->client_tds_percentage,
                };
                DB::table('clients')->where('id', $c->id)->update(['client_tds_percentage' => $pct]);
            }
        } else {
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
    }

    public function down(): void
    {
        // No-op
    }
};
