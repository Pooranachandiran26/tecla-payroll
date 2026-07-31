<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Client;
use App\Models\Employee;
use App\Models\User;
use App\Services\SalaryCalculationService;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;
use Faker\Factory as Faker;
use Carbon\Carbon;

class EmployeeSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        Schema::disableForeignKeyConstraints();

        // Clear existing employees and related data
        DB::table('users')->where('role', 'employee')->delete();
        DB::table('employees')->truncate();
        DB::table('employee_documents')->truncate();
        DB::table('employee_tax_declarations')->truncate();
        DB::table('salary_revisions')->truncate();
        DB::table('employee_exits')->truncate();
        DB::table('attendance_records')->truncate();
        DB::table('leave_requests')->truncate();
        DB::table('payroll_run_items')->truncate();
        DB::table('payroll_runs')->truncate();

        Schema::enableForeignKeyConstraints();

        $faker = Faker::create('en_IN');
        $salaryCalcService = app(SalaryCalculationService::class);

        $clients = Client::with('branches')->get();
        if ($clients->isEmpty()) {
            $this->command->warn('No clients found. Please run TenClientsSeeder first.');
            return;
        }

        $providedEmails = [
            'prem0572003@gmail.com',
            'rajesh2003778@gmail.com',
            'babu672677@gmail.com',
            'naveenkumar655782@gmail.com',
            'rajkumar7262681@gmail.com',
            'kishore30075@gmail.com',
            'eshwar66467@gmail.com',
            'm26502821@gmail.com',
        ];

        $globalEmpCount = 1;

        foreach ($clients as $clientIndex => $client) {
            $branchId = $client->branches->first() ? $client->branches->first()->id : null;
            
            for ($i = 0; $i < 20; $i++) {
                
                // Determine Email
                $email = null;
                if ($i === 0 && $clientIndex < count($providedEmails)) {
                    $email = $providedEmails[$clientIndex];
                } else {
                    $email = strtolower($faker->firstName . '.' . $faker->lastName . rand(100,999) . '@' . preg_replace('/[^a-zA-Z0-9]/', '', strtolower($client->company_name)) . '.com');
                }

                $firstName = $faker->firstName;
                $lastName = $faker->lastName;
                $fullName = $firstName . ' ' . $lastName;
                $gender = $faker->randomElement(['male', 'female']);
                
                // Base salary structure
                $baseMultiplier = rand(2, 8); // 20k to 80k base
                $basicPay = $baseMultiplier * 10000;
                $hra = $basicPay * 0.40;
                $conveyance = 1600;
                $medical = 1250;
                $special = rand(1000, 5000);
                
                // Prepare data for SalaryCalculationService
                $calcData = [
                    'client_id' => $client->id,
                    'basic_pay' => $basicPay,
                    'hra' => $hra,
                    'conveyance' => $conveyance,
                    'da' => 0,
                    'medical_allowance' => $medical,
                    'special_allowance' => $special,
                    'other_additions' => 0,
                    'date_of_birth' => $faker->dateTimeBetween('-40 years', '-22 years')->format('Y-m-d'),
                    'pf_applicable' => true,
                    'eps_applicable' => true,
                    'esi_applicable' => true,
                    'pt_applicable' => true,
                    'gender' => $gender,
                ];

                // Execute strict controller-matched service logic
                $computed = $salaryCalcService->calculateStructuralSalary($calcData);

                $doj = clone $faker->dateTimeBetween('-3 years', '-1 month');
                
                // Employee Creation
                $employee = Employee::create([
                    'employee_code' => 'TEC-' . str_pad($globalEmpCount++, 3, '0', STR_PAD_LEFT),
                    'client_id' => $client->id,
                    'branch_id' => $branchId,
                    'first_name' => $firstName,
                    'last_name' => $lastName,
                    'father_name' => $faker->name('male'),
                    'mother_name' => $faker->name('female'),
                    'spouse_name' => $faker->optional(0.5)->name,
                    'full_name' => $fullName,
                    'personal_email' => $email,
                    'phone_number' => '9' . $faker->numerify('#########'),
                    'date_of_birth' => $calcData['date_of_birth'],
                    'date_of_joining' => $doj->format('Y-m-d'),
                    'attendance_tracking_start_date' => $doj->format('Y-m-d'),
                    'designation' => $faker->jobTitle,
                    'employment_model' => $client->contract_type === 'eor' ? 'eor' : 'agency_contract',
                    'employment_type' => 'permanent',
                    'status' => ($i < 4) ? 'onboarding' : 'active',
                    'gender' => $gender,
                    'blood_group' => $faker->randomElement(['A+', 'O+', 'B+', 'AB+', 'A-', 'O-', 'B-', 'AB-']),
                    'marital_status' => $faker->randomElement(['single', 'married']),
                    'emergency_contact_name' => $faker->name,
                    'emergency_contact_phone' => '9' . $faker->numerify('#########'),
                    'residential_address' => $faker->address,
                    'previous_employer_name' => $faker->company,
                    'previous_employer_uan' => '100' . $faker->numerify('#########'),
                    
                    // Documents KYC
                    'aadhaar_number' => $faker->numerify('############'),
                    'pan_number' => strtoupper($faker->bothify('?????####?')),
                    'uan_mode' => 'existing_transfer',
                    'uan_number' => '101' . $faker->numerify('#########'),
                    'esic_number' => '31' . $faker->numerify('########'),
                    'health_insurance_provider' => 'Star Health',
                    'health_insurance_policy_no' => strtoupper($faker->bothify('POL-######')),
                    'health_insurance_sum_insured' => 500000.00,
                    
                    'probation_end_date' => Carbon::parse($doj)->addMonths(6)->format('Y-m-d'),
                    'prior_employment_flag' => true,
                    'declarations_accepted' => true,
                    
                    // Bank Details
                    'bank_account_number' => $faker->numerify('##########'),
                    'account_holder_name' => $fullName,
                    'bank_ifsc' => 'HDFC0001234',
                    'bank_name' => 'HDFC Bank',
                    'bank_branch' => 'Main Branch',
                    
                    // Base Earnings
                    'basic_pay' => $calcData['basic_pay'],
                    'hra' => $calcData['hra'],
                    'conveyance' => $calcData['conveyance'],
                    'da' => 0.00,
                    'medical_allowance' => $calcData['medical_allowance'],
                    'special_allowance' => $calcData['special_allowance'],
                    'other_additions' => 0.00,
                    
                    // Computed Overrides
                    'gross_monthly_salary' => $computed['gross_monthly_salary'],
                    'net_take_home_monthly' => $computed['net_take_home_monthly'],
                    'employer_pf_monthly' => $computed['employer_pf_monthly'],
                    'employer_esi_monthly' => $computed['employer_esi_monthly'],
                    'ctc_monthly' => $computed['ctc_monthly'],
                    
                    // Statutory 
                    'pf_applicable' => $client->pf_applicable ?? true,
                    'eps_applicable' => true,
                    'esi_applicable' => $client->esi_applicable ?? true,
                    'pt_applicable' => true,
                    'lwf_applicable' => $client->lwf_applicable ?? true,
                    'tds_applicable' => $client->tds_applicable ?? true,
                    
                    // Overrides 
                    'lop_basis_days' => 30,
                    'weekly_off_pattern' => 'sat,sun',
                    'notice_period_days' => 30,
                    'bonus_toggle' => true,
                ]);

                // Create User Login
                User::create([
                    'name' => $fullName,
                    'email' => $email,
                    'password' => Hash::make('Password@123'),
                    'role' => 'employee',
                    'employee_id' => $employee->id,
                    'status' => 'active',
                ]);

                if ($i >= 4) {
                    $docs = ['pan_card', 'aadhaar_card', 'bank_passbook', 'offer_letter', 'photo'];
                    foreach ($docs as $doc) {
                        \App\Models\EmployeeDocument::create([
                            'employee_id' => $employee->id,
                            'document_type' => $doc,
                            'file_path' => 'employee_documents/dummy_' . $doc . '_' . $employee->id . '.pdf',
                            'status' => 'verified',
                            'verified_at' => now()
                        ]);
                    }
                }
            }
        }
    }
}
