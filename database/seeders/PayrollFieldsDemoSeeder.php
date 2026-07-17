<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Client;
use App\Models\ClientBranch;
use App\Models\Employee;
use App\Models\EmployeeDocument;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class PayrollFieldsDemoSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Clean up previous runs including soft deleted records
        $existingClient = Client::withTrashed()->where('client_code', 'DTC001')->first();
        if ($existingClient) {
            $employeeIds = Employee::withTrashed()->where('client_id', $existingClient->id)->pluck('id');
            EmployeeDocument::whereIn('employee_id', $employeeIds)->delete();
            DB::table('attendance_records')->whereIn('employee_id', $employeeIds)->delete();
            Employee::withTrashed()->where('client_id', $existingClient->id)->forceDelete();
            ClientBranch::where('client_id', $existingClient->id)->delete();
            $existingClient->forceDelete();
        }

        // 1. CREATE CLIENT
        $client = Client::create([
            'company_name' => 'Demo Test Corp',
            'client_code' => 'DTC001',
            'industry' => 'Testing Services',
            'contract_type' => 'agency',
            'contract_start_date' => '2025-01-01',
            'status' => 'active',
            'company_type' => 'pvt_ltd',
            'registered_address_line_1' => '123 Tech Park',
            'registered_city' => 'Mumbai',
            'registered_state' => 'Maharashtra',
            'registered_pin' => '400051',
            'pan_number' => 'DTCDE1234F',
            'gstin' => '27AABCT1234L1ZQ',
            
            // Required contact fields
            'primary_poc_name' => 'Demo Coordinator',
            'primary_poc_email' => 'demo.coordinator@example.com',
            'primary_poc_phone' => '9888877777',
            
            // Piece 1 Fields
            'credit_limit' => 3000,
            'late_payment_penalty_pct' => 2,
            'invoice_dispute_window_days' => 10,
            
            // Piece 2 Fields
            'payment_net_terms' => 'net15',
            'billing_model' => 'markup',
            'markup_percentage' => 10.0,
            
            // Piece 3 Fields
            'payroll_convention' => 'calendar_month',
            'payroll_lock_day' => '5',
            'salary_credit_day' => '10',
            
            'custom_cycle_start_day' => 1,
            'custom_cycle_end_day' => 28,
            'pt_state' => 'Maharashtra',
        ]);

        // Create head office branch
        $branch = ClientBranch::create([
            'client_id' => $client->id,
            'branch_name' => 'HQ - Mumbai',
            'location' => 'Mumbai',
            'state' => 'Maharashtra',
            'is_head_office' => true,
            'gstin' => '27AABCT1234L1ZQ',
            'is_primary_billing_branch' => true,
        ]);

        // 2. CREATE EMPLOYEE
        $employee = Employee::create([
            'client_id' => $client->id,
            'branch_id' => $branch->id,
            'employee_code' => 'TEC-DEMO',
            'full_name' => 'Demo Employee',
            'personal_email' => 'demo.employee@example.com',
            'phone_number' => '9988776600',
            'date_of_birth' => '1994-04-04',
            'date_of_joining' => Carbon::now()->subMonths(2)->toDateString(),
            'designation' => 'Demo Specialist',
            'employment_model' => 'agency_contract',
            'status' => 'active',
            'gender' => 'male',
            'marital_status' => 'single',
            'residential_address' => '123 Demo St, Mumbai, Maharashtra 400001',
            
            // Earnings components
            'basic_pay' => 25000,
            'hra' => 5000,
            'conveyance' => 1000,
            'da' => 1000,
            'medical_allowance' => 1000,
            'special_allowance' => 2000,
            'other_additions' => 1000,
            'gross_monthly_salary' => 36000,
            
            // Statutory
            'pf_applicable' => true,
            'esi_applicable' => true,
            'pt_applicable' => true,
            'lwf_applicable' => true,
            'gratuity_mode' => 'part_of_ctc',
            
            // Bank details
            'bank_account_number' => '98765432101234',
            'account_holder_name' => 'Demo Employee',
            'bank_ifsc' => 'SBIN0001234',
            'bank_name' => 'SBI',
            'bank_branch' => 'Main',
            
            'uan_mode' => 'new',
            'uan_number' => '100000000099',
            'pan_number' => 'ABCDE9999F',
            'aadhaar_number' => '999988887777',
            
            'declarations_accepted' => 1,
            'lop_basis_days' => '30',
        ]);

        // Create verified employee documents
        foreach ($employee->required_document_types as $type) {
            EmployeeDocument::create([
                'employee_id' => $employee->id,
                'document_type' => $type,
                'file_path' => 'demo_document.pdf',
                'status' => 'verified',
            ]);
        }

        // 3. CREATE ATTENDANCE RECORDS FOR CURRENT MONTH
        $startOfMonth = Carbon::now()->startOfMonth();
        $today = Carbon::now()->startOfDay();

        for ($date = $startOfMonth->copy(); $date->lte($today); $date->addDay()) {
            if (!$date->isWeekend()) {
                DB::table('attendance_records')->insert([
                    'employee_id' => $employee->id,
                    'attendance_date' => $date->toDateString(),
                    'status' => 'present',
                    'source' => 'live_punch',
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        }

        $this->command->info("PayrollFieldsDemoSeeder successfully completed.");
        $this->command->info("Client Created ID: " . $client->id);
        $this->command->info("Employee Created ID: " . $employee->id);
    }
}
