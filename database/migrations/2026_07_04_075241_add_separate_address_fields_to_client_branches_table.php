<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('client_branches', function (Blueprint $table) {
            $table->string('address_line_1')->nullable()->after('branch_name');
            $table->string('city')->nullable()->after('address_line_1');
            $table->string('branch_code')->nullable()->after('city');
            $table->string('pin_code')->nullable()->after('state');
        });

        // Best effort data migration
        DB::table('client_branches')->whereNotNull('location')->orderBy('id')->chunk(100, function ($branches) {
            foreach ($branches as $branch) {
                $parts = array_map('trim', explode(',', $branch->location));
                $addressLine1 = $parts[0] ?? null;
                $city = $parts[1] ?? null;

                // If no city part exists in the comma split, we just leave city null
                DB::table('client_branches')->where('id', $branch->id)->update([
                    'address_line_1' => $addressLine1,
                    'city' => $city,
                ]);
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('client_branches', function (Blueprint $table) {
            $table->dropColumn(['address_line_1', 'city', 'branch_code', 'pin_code']);
        });
    }
};
