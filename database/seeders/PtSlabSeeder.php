<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class PtSlabSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $slabs = [
            [
                'state' => 'Maharashtra',
                'min_salary' => 0,
                'max_salary' => 7500,
                'deduction_amount' => 0.00,
                'deduction_note' => null,
                'exceptions_text' => 'Exempted',
                'is_active' => true,
            ],
            [
                'state' => 'Maharashtra',
                'min_salary' => 7501,
                'max_salary' => 10000,
                'deduction_amount' => 175.00,
                'deduction_note' => '/ month',
                'exceptions_text' => 'Standard slab',
                'is_active' => true,
            ],
            [
                'state' => 'Maharashtra',
                'min_salary' => 10001,
                'max_salary' => null, // No Limit
                'deduction_amount' => 200.00,
                'deduction_note' => '/ month',
                'exceptions_text' => '₹300 deducted in February month',
                'is_active' => true,
            ]
        ];

        foreach ($slabs as $slab) {
            \Illuminate\Support\Facades\DB::table('pt_slabs')->insert($slab);
        }
    }
}
