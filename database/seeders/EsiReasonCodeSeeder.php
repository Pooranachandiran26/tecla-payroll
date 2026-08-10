<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\EsiReasonCode;

class EsiReasonCodeSeeder extends Seeder
{
    public function run(): void
    {
        $codes = [
            ['code' => 0,  'name' => 'Without Reason', 'requires_zero_days' => false, 'requires_last_working_day' => false],
            ['code' => 1,  'name' => 'On Leave', 'requires_zero_days' => true, 'requires_last_working_day' => false],
            ['code' => 2,  'name' => 'Left Service', 'requires_zero_days' => true, 'requires_last_working_day' => true],
            ['code' => 3,  'name' => 'Retired', 'requires_zero_days' => true, 'requires_last_working_day' => true],
            ['code' => 4,  'name' => 'Out of Coverage', 'requires_zero_days' => true, 'requires_last_working_day' => true],
            ['code' => 5,  'name' => 'Expired', 'requires_zero_days' => true, 'requires_last_working_day' => true],
            ['code' => 6,  'name' => 'Non Implemented Area', 'requires_zero_days' => true, 'requires_last_working_day' => true],
            ['code' => 7,  'name' => 'Compliance by Immediate Employer', 'requires_zero_days' => true, 'requires_last_working_day' => false],
            ['code' => 8,  'name' => 'Suspension of Work', 'requires_zero_days' => true, 'requires_last_working_day' => false],
            ['code' => 9,  'name' => 'Strike/Lockout', 'requires_zero_days' => true, 'requires_last_working_day' => false],
            ['code' => 10, 'name' => 'Retrenchment', 'requires_zero_days' => true, 'requires_last_working_day' => true],
            ['code' => 11, 'name' => 'No Work', 'requires_zero_days' => true, 'requires_last_working_day' => false],
            ['code' => 12, 'name' => "Doesn't Belong To This Employer", 'requires_zero_days' => true, 'requires_last_working_day' => false],
            ['code' => 13, 'name' => 'Duplicate IP', 'requires_zero_days' => true, 'requires_last_working_day' => false],
        ];

        foreach ($codes as $i => $c) {
            EsiReasonCode::updateOrCreate(
                ['code' => $c['code']],
                [
                    'name' => $c['name'],
                    'description' => null,
                    'requires_zero_days' => $c['requires_zero_days'],
                    'requires_last_working_day' => $c['requires_last_working_day'],
                    'is_active' => true,
                    'sort_order' => $i,
                ]
            );
        }
    }
}
