<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class PtSlabSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Truncate or clean existing to prevent duplicates during re-seeding
        DB::table('pt_slabs')->truncate();

        $slabs = [
            // =========================================================================
            // 1. MAHARASHTRA (MONTHLY basis)
            // Citation: Maharashtra State Tax on Professions, Trades, Callings and Employments Act, 1975
            // (Schedule I, Entry 1) as amended by Maharashtra Act No. VIII of 2023 (w.e.f. April 1, 2023)
            // =========================================================================
            [
                'state' => 'Maharashtra',
                'min_salary' => 0.00,
                'max_salary' => 7500.00,
                'deduction_amount' => 0.00,
                'deduction_note' => '/ month',
                'exceptions_text' => 'Exempted. Women earning ≤ ₹25,000 exempt per 2023 amendment.',
                'frequency' => 'monthly',
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'state' => 'Maharashtra',
                'min_salary' => 7501.00,
                'max_salary' => 10000.00,
                'deduction_amount' => 175.00,
                'deduction_note' => '/ month',
                'exceptions_text' => 'Standard male slab. Women earning ≤ ₹25,000 exempt.',
                'frequency' => 'monthly',
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'state' => 'Maharashtra',
                'min_salary' => 10001.00,
                'max_salary' => null, // No limit
                'deduction_amount' => 200.00,
                'deduction_note' => '/ month',
                'exceptions_text' => '₹300 deducted in February month. Women earning ≤ ₹25,000 exempt.',
                'frequency' => 'monthly',
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],

            // =========================================================================
            // 2. KARNATAKA (MONTHLY basis)
            // Citation: Karnataka Tax on Professions, Trades, Callings and Employments Act, 1976
            // (Schedule I) as amended by Karnataka Act No. 14 of 2023 (w.e.f. April 1, 2023)
            // =========================================================================
            [
                'state' => 'Karnataka',
                'min_salary' => 0.00,
                'max_salary' => 24999.00,
                'deduction_amount' => 0.00,
                'deduction_note' => '/ month',
                'exceptions_text' => 'Exempted per 2023 amendment (raised threshold to ₹25,000)',
                'frequency' => 'monthly',
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'state' => 'Karnataka',
                'min_salary' => 25000.00,
                'max_salary' => null, // No limit
                'deduction_amount' => 200.00,
                'deduction_note' => '/ month',
                'exceptions_text' => 'Standard slab',
                'frequency' => 'monthly',
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],

            // =========================================================================
            // 3. TAMIL NADU (HALF-YEARLY basis, monthly spread = total / 6)
            // Citation: Tamil Nadu Town Panchayats, Municipalities and Municipal Corporations
            // (Levy of Tax on Profession, Trade, Calling and Employment) Rules, 1992 (Schedule)
            // =========================================================================
            [
                'state' => 'Tamil Nadu',
                'min_salary' => 0.00,
                'max_salary' => 3500.00, // Monthly equivalent of ≤ ₹21,000 half-yearly
                'deduction_amount' => 0.00,
                'deduction_note' => '/ month (Half-yearly ₹0)',
                'exceptions_text' => 'Half-yearly slab up to ₹21,000 = ₹0',
                'frequency' => 'half_yearly',
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'state' => 'Tamil Nadu',
                'min_salary' => 3501.00,
                'max_salary' => 5000.00, // Monthly equivalent of ₹21,001–₹30,000 half-yearly
                'deduction_amount' => 30.00, // ₹180 / 6
                'deduction_note' => '/ month (Half-yearly ₹180)',
                'exceptions_text' => 'Half-yearly ₹180 spread over 6 months',
                'frequency' => 'half_yearly',
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'state' => 'Tamil Nadu',
                'min_salary' => 5001.00,
                'max_salary' => 7500.00, // Monthly equivalent of ₹30,001–₹45,000 half-yearly
                'deduction_amount' => 70.83, // ₹425 / 6
                'deduction_note' => '/ month (Half-yearly ₹425)',
                'exceptions_text' => 'Half-yearly ₹425 spread over 6 months',
                'frequency' => 'half_yearly',
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'state' => 'Tamil Nadu',
                'min_salary' => 7501.00,
                'max_salary' => 10000.00, // Monthly equivalent of ₹45,001–₹60,000 half-yearly
                'deduction_amount' => 155.00, // ₹930 / 6
                'deduction_note' => '/ month (Half-yearly ₹930)',
                'exceptions_text' => 'Half-yearly ₹930 spread over 6 months',
                'frequency' => 'half_yearly',
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'state' => 'Tamil Nadu',
                'min_salary' => 10001.00,
                'max_salary' => 12500.00, // Monthly equivalent of ₹60,001–₹75,000 half-yearly
                'deduction_amount' => 170.83, // ₹1025 / 6
                'deduction_note' => '/ month (Half-yearly ₹1,025)',
                'exceptions_text' => 'Half-yearly ₹1,025 spread over 6 months',
                'frequency' => 'half_yearly',
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'state' => 'Tamil Nadu',
                'min_salary' => 12501.00,
                'max_salary' => null, // No limit (> ₹75,000 half-yearly)
                'deduction_amount' => 208.33, // ₹1250 / 6
                'deduction_note' => '/ month (Half-yearly ₹1,250)',
                'exceptions_text' => 'Half-yearly ₹1,250 spread over 6 months',
                'frequency' => 'half_yearly',
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ];

        foreach ($slabs as $slab) {
            DB::table('pt_slabs')->insert($slab);
        }
    }
}
