<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class EmployeeSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $employees = [
            [
                'employee_code' => 'TEC-088',
                'client_id' => 1,
                'branch_id' => 1,
                'full_name' => 'Aarav Sharma',
                'personal_email' => 'aarav.s@example.com',
                'phone_number' => '9876543001',
                'date_of_birth' => '1990-05-15',
                'date_of_joining' => '2023-01-10',
                'designation' => 'Software Engineer',
                'employment_model' => 'agency_contract',
                'status' => 'active',
                'gender' => 'male',
                'marital_status' => 'single',
                'residential_address' => 'Andheri West, Mumbai, Maharashtra 400053',
                
                'basic_pay' => 25000,
                'hra' => 12500,
                'conveyance' => 0,
                'da' => 0,
                'medical_allowance' => 0,
                'special_allowance' => 12500,
                
                'gross_monthly_salary' => 50000,
                'employer_pf_monthly' => 1950,
                'employer_esi_monthly' => 0,
                'net_take_home_monthly' => 45000,
                'ctc_monthly' => 51950,
                
                'pf_applicable' => true,
                'esi_applicable' => false,
                'pt_applicable' => true,
                'lwf_applicable' => true,
                'gratuity_mode' => 'part_of_ctc',
                
                'bank_account_number' => '12345678901234',
                'account_holder_name' => 'Aarav Sharma',
                'bank_ifsc' => 'HDFC0001234',
                'bank_name' => 'HDFC Bank',
                'bank_branch' => 'Andheri',
                'uan_mode' => 'new',
                'uan_number' => '100000000088',
                'pan_number' => 'ABCDE1234F',
                'aadhaar_number' => '123456789012',
            ],
            [
                'employee_code' => 'TEC-121',
                'client_id' => 2,
                'branch_id' => 2,
                'full_name' => 'Neha Patil',
                'personal_email' => 'neha.p@example.com',
                'phone_number' => '9876543002',
                'date_of_birth' => '1992-08-20',
                'date_of_joining' => '2022-11-01',
                'designation' => 'Product Manager',
                'employment_model' => 'agency_contract',
                'status' => 'active',
                'gender' => 'female',
                'marital_status' => 'married',
                'residential_address' => 'Bandra East, Mumbai, Maharashtra 400051',
                
                'basic_pay' => 40000,
                'hra' => 20000,
                'conveyance' => 0,
                'da' => 0,
                'medical_allowance' => 0,
                'special_allowance' => 20000,
                
                'gross_monthly_salary' => 80000,
                'employer_pf_monthly' => 1800,
                'employer_esi_monthly' => 0,
                'net_take_home_monthly' => 74000,
                'ctc_monthly' => 81800,
                
                'pf_applicable' => true,
                'esi_applicable' => false,
                'pt_applicable' => true,
                'lwf_applicable' => true,
                'gratuity_mode' => 'part_of_ctc',
                
                'bank_account_number' => '98765432109876',
                'account_holder_name' => 'Neha Patil',
                'bank_ifsc' => 'ICIC0009876',
                'bank_name' => 'ICICI Bank',
                'bank_branch' => 'Bandra',
                'uan_mode' => 'new',
                'uan_number' => '100000000121',
                'pan_number' => 'FGHIJ5678K',
                'aadhaar_number' => '987654321098',
            ]
        ];

        foreach ($employees as $emp) {
            \App\Models\Employee::create($emp);
        }
    }
}
