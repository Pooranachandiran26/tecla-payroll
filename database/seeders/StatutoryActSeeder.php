<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\StatutoryAct;

class StatutoryActSeeder extends Seeder
{
    public function run(): void
    {
        $acts = [
            ['code' => 'factories_act', 'name' => 'Factories Act, 1948', 'description' => 'Operates a manufacturing factory / industrial plant'],
            ['code' => 'shops_establishment_act', 'name' => 'Shops & Establishments Act', 'description' => 'Registered commercial establishment, shop, or corporate office'],
            ['code' => 'contract_labour_act', 'name' => 'Contract Labour (R&A) Act, 1970', 'description' => 'Engages or deploys contract labour through contractors'],
            ['code' => 'catering_canteen_rules', 'name' => 'Catering / Canteen Rules (if applicable)', 'description' => 'Maintains an establishment canteen or catering facility'],
        ];

        foreach ($acts as $i => $act) {
            StatutoryAct::updateOrCreate(
                ['code' => $act['code']],
                [
                    'name' => $act['name'],
                    'description' => $act['description'],
                    'status' => 'active',
                    'sort_order' => $i,
                ]
            );
        }
    }
}
