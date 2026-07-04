<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class ClientSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $clients = [
            [
                'company_name' => 'Mahindra Corp',
                'client_code' => 'MAH001',
                'industry' => 'Automotive',
                'contract_type' => 'agency',
                'contract_start_date' => '2023-01-01',
                'billing_model' => 'markup',
                'markup_percentage' => 10.5,
                'status' => 'active',
                'primary_poc_name' => 'Rahul Bajaj',
                'primary_poc_email' => 'rahul.b@mahindra.example.com',
                'primary_poc_phone' => '9876543210',
                'company_type' => 'pub_ltd',
                'registered_address_line_1' => 'Mahindra Towers',
                'registered_city' => 'Mumbai',
                'registered_state' => 'Maharashtra',
                'registered_pin' => '400018',
                'pan_number' => 'ABCDE1234F',
                'gstin' => '27ABCDE1234F1Z5',
            ],
            [
                'company_name' => 'TCS',
                'client_code' => 'TCS002',
                'industry' => 'IT Services',
                'contract_type' => 'hybrid',
                'contract_start_date' => '2022-05-15',
                'billing_model' => 'fixed_per_candidate',
                'fixed_fee_amount' => 5000,
                'status' => 'active',
                'primary_poc_name' => 'Anita Desai',
                'primary_poc_email' => 'anita.d@tcs.example.com',
                'primary_poc_phone' => '9876543211',
                'company_type' => 'pub_ltd',
                'registered_address_line_1' => 'TCS Banyan Park',
                'registered_city' => 'Mumbai',
                'registered_state' => 'Maharashtra',
                'registered_pin' => '400060',
                'pan_number' => 'FGHIJ5678K',
                'gstin' => '27FGHIJ5678K1Z5',
            ],
            [
                'company_name' => 'Reliance',
                'client_code' => 'REL003',
                'industry' => 'Conglomerate',
                'contract_type' => 'eor',
                'contract_start_date' => '2021-10-01',
                'billing_model' => 'markup',
                'markup_percentage' => 12.0,
                'status' => 'active',
                'primary_poc_name' => 'Mukesh S',
                'primary_poc_email' => 'mukesh.s@reliance.example.com',
                'primary_poc_phone' => '9876543212',
                'company_type' => 'pub_ltd',
                'registered_address_line_1' => 'Reliance Corporate Park',
                'registered_city' => 'Navi Mumbai',
                'registered_state' => 'Maharashtra',
                'registered_pin' => '400701',
                'pan_number' => 'KLMNO9012P',
                'gstin' => '27KLMNO9012P1Z5',
            ],
            [
                'company_name' => 'Wipro',
                'client_code' => 'WIP004',
                'industry' => 'IT Services',
                'contract_type' => 'agency',
                'contract_start_date' => '2024-02-01',
                'billing_model' => 'hourly',
                'status' => 'active',
                'primary_poc_name' => 'Azim K',
                'primary_poc_email' => 'azim.k@wipro.example.com',
                'primary_poc_phone' => '9876543213',
                'company_type' => 'pub_ltd',
                'registered_address_line_1' => 'Doddakannelli',
                'registered_city' => 'Bengaluru',
                'registered_state' => 'Karnataka',
                'registered_pin' => '560035',
                'pan_number' => 'QRSTU3456V',
                'gstin' => '29QRSTU3456V1Z5',
            ]
        ];

        foreach ($clients as $clientData) {
            $client = \App\Models\Client::create($clientData);
            
            \Illuminate\Support\Facades\DB::table('client_branches')->insert([
                'client_id' => $client->id,
                'branch_name' => 'HQ - ' . $client->registered_city,
                'location' => $client->registered_city,
                'state' => $client->registered_state,
                'is_head_office' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }
}
