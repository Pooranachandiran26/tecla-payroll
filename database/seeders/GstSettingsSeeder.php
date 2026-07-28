<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Setting;

class GstSettingsSeeder extends Seeder
{
    public function run(): void
    {
        $defaultRates = [
            ['rate' => '18',     'label' => '18% (Standard Services)',                   'hsn_sac' => '998311', 'description' => 'Standard professional / staffing services'],
            ['rate' => '0',      'label' => '0% (SEZ / Export without payment of IGST)', 'hsn_sac' => '998311', 'description' => 'Exports / SEZ supplies under LUT'],
            ['rate' => 'exempt', 'label' => 'Exempt',                                    'hsn_sac' => '',       'description' => 'Exempt category supplies'],
        ];

        $settings = [
            ['key' => 'default_gst_rate',          'value' => '18',                            'type' => 'string'],
            ['key' => 'default_reverse_charge',    'value' => 'false',                         'type' => 'boolean'],
            ['key' => 'default_tds_on_agency_fee', 'value' => 'na',                            'type' => 'string'],
            ['key' => 'notes',                     'value' => '',                              'type' => 'string'],
            ['key' => 'gst_rates',                 'value' => json_encode($defaultRates),       'type' => 'json'],
        ];

        foreach ($settings as $setting) {
            Setting::firstOrCreate(
                ['group' => 'gst', 'key' => $setting['key']],
                ['value' => $setting['value'], 'type' => $setting['type'], 'is_locked' => false]
            );
        }
    }
}
