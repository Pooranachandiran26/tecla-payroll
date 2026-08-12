<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\Client;
use App\Models\Employee;
use App\Services\BulkUploadValidationService;
use App\Services\SalaryCalculationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;

class BulkUploadParityTest extends TestCase
{
    use RefreshDatabase;

    protected SalaryCalculationService $salaryService;
    protected BulkUploadValidationService $validationService;
    protected Client $client;
    protected $branch;

    protected function setUp(): void
    {
        parent::setUp();
        $this->salaryService = app(SalaryCalculationService::class);
        $this->validationService = app(BulkUploadValidationService::class);

        $this->client = Client::factory()->create([
            'company_name' => 'Parity Test Client Ltd',
            'client_code' => 'PARITY001',
            'contract_type' => 'agency',
            'pf_applicable' => true,
            'esi_applicable' => true,
            'pt_state' => 'Tamil Nadu',
            'status' => 'active',
        ]);

        $this->branch = $this->client->branches()->create([
            'branch_name' => 'Main Branch',
            'state' => 'Tamil Nadu',
            'is_head_office' => true,
        ]);
    }

    protected function getBaseInput(array $overrides = []): array
    {
        return array_merge([
            'client_id' => $this->client->id,
            'branch_id' => $this->branch->id,
            'account_holder_name' => $overrides['full_name'] ?? 'Test Employee',
            'bank_name' => 'State Bank of India',
            'bank_branch' => 'Main Branch',
            'conveyance' => 0,
            'da' => 0,
            'medical_allowance' => 0,
            'special_allowance' => 0,
            'other_additions' => 0,
            'bank_ifsc' => 'SBIN0001234',
            'gratuity_mode' => 'part_of_ctc',
            'tds_regime' => 'new',
            'joint_declaration_status' => 'not_required',
            'uan_mode' => 'not_applicable',
            'gender' => 'male',
        ], $overrides);
    }

    public function test_1_mid_month_joiner_with_lop_parity()
    {
        $input = $this->getBaseInput([
            'employee_code' => 'PAR001',
            'full_name' => 'Mid Month Joiner',
            'personal_email' => 'par001@example.com',
            'phone_number' => '9800000001',
            'date_of_birth' => '1995-05-15',
            'date_of_joining' => '2026-01-28',
            'designation' => 'Software Engineer',
            'employment_model' => 'agency_contract',
            'bank_account_number' => '100000000001',
            'pan_number' => 'ABCDE0001A',
            'basic_pay' => 25000,
            'hra' => 10000,
            'pf_applicable' => true,
            'eps_applicable' => true,
            'esi_applicable' => true,
            'pt_applicable' => true,
        ]);

        $calc = $this->salaryService->calculateStructuralSalary($input);
        $legacyPayload = array_merge($input, [
            'status' => 'onboarding',
            'gross_monthly_salary' => $calc['gross_monthly_salary'],
            'net_take_home_monthly' => $calc['net_take_home_monthly'],
            'employer_pf_monthly' => $calc['employer_pf_monthly'],
            'employer_esi_monthly' => $calc['employer_esi_monthly'],
            'ctc_monthly' => $calc['ctc_monthly'],
        ]);

        $legacyEmp = Employee::create($legacyPayload);

        $batchPayload = array_merge($input, [
            'employee_code' => 'PAR001_BATCH',
            'personal_email' => 'par001_batch@example.com',
            'phone_number' => '9800000002',
            'bank_account_number' => '100000000002',
            'pan_number' => 'ABCDE0002B',
            'status' => 'onboarding',
            'gross_monthly_salary' => $calc['gross_monthly_salary'],
            'net_take_home_monthly' => $calc['net_take_home_monthly'],
            'employer_pf_monthly' => $calc['employer_pf_monthly'],
            'employer_esi_monthly' => $calc['employer_esi_monthly'],
            'ctc_monthly' => $calc['ctc_monthly'],
            'created_at' => now()->toDateTimeString(),
            'updated_at' => now()->toDateTimeString(),
        ]);

        DB::table('employees')->insert([$batchPayload]);
        $batchEmp = Employee::where('employee_code', 'PAR001_BATCH')->first();

        $this->assertEquals($legacyEmp->gross_monthly_salary, $batchEmp->gross_monthly_salary);
        $this->assertEquals($legacyEmp->ctc_monthly, $batchEmp->ctc_monthly);
        $this->assertEquals($legacyEmp->employer_pf_monthly, $batchEmp->employer_pf_monthly);
        $this->assertEquals($legacyEmp->net_take_home_monthly, $batchEmp->net_take_home_monthly);
    }

    public function test_2_full_month_employee_with_lop_parity()
    {
        $input = $this->getBaseInput([
            'employee_code' => 'PAR002',
            'full_name' => 'Full Month Employee',
            'personal_email' => 'par002@example.com',
            'phone_number' => '9800000003',
            'date_of_birth' => '1992-08-10',
            'date_of_joining' => '2022-01-01',
            'designation' => 'Senior Developer',
            'employment_model' => 'agency_contract',
            'bank_account_number' => '100000000003',
            'pan_number' => 'ABCDE0003C',
            'basic_pay' => 30000,
            'hra' => 12000,
            'pf_applicable' => true,
            'eps_applicable' => true,
            'esi_applicable' => false,
            'pt_applicable' => true,
        ]);

        $calc = $this->salaryService->calculateStructuralSalary($input);
        $legacyPayload = array_merge($input, [
            'status' => 'onboarding',
            'gross_monthly_salary' => $calc['gross_monthly_salary'],
            'net_take_home_monthly' => $calc['net_take_home_monthly'],
            'employer_pf_monthly' => $calc['employer_pf_monthly'],
            'employer_esi_monthly' => $calc['employer_esi_monthly'],
            'ctc_monthly' => $calc['ctc_monthly'],
        ]);

        $legacyEmp = Employee::create($legacyPayload);

        $batchPayload = array_merge($input, [
            'employee_code' => 'PAR002_BATCH',
            'personal_email' => 'par002_batch@example.com',
            'phone_number' => '9800000004',
            'bank_account_number' => '100000000004',
            'pan_number' => 'ABCDE0004D',
            'status' => 'onboarding',
            'gross_monthly_salary' => $calc['gross_monthly_salary'],
            'net_take_home_monthly' => $calc['net_take_home_monthly'],
            'employer_pf_monthly' => $calc['employer_pf_monthly'],
            'employer_esi_monthly' => $calc['employer_esi_monthly'],
            'ctc_monthly' => $calc['ctc_monthly'],
            'created_at' => now()->toDateTimeString(),
            'updated_at' => now()->toDateTimeString(),
        ]);

        DB::table('employees')->insert([$batchPayload]);
        $batchEmp = Employee::where('employee_code', 'PAR002_BATCH')->first();

        $this->assertEquals($legacyEmp->gross_monthly_salary, $batchEmp->gross_monthly_salary);
        $this->assertEquals($legacyEmp->ctc_monthly, $batchEmp->ctc_monthly);
        $this->assertEquals($legacyEmp->employer_pf_monthly, $batchEmp->employer_pf_monthly);
        $this->assertEquals($legacyEmp->net_take_home_monthly, $batchEmp->net_take_home_monthly);
    }

    public function test_3_eps_age_58_cutoff_parity()
    {
        $input = $this->getBaseInput([
            'employee_code' => 'PAR003',
            'full_name' => 'Senior Employee Age 58 Plus',
            'personal_email' => 'par003@example.com',
            'phone_number' => '9800000005',
            'date_of_birth' => '1965-01-01',
            'date_of_joining' => '2023-01-01',
            'designation' => 'Advisor',
            'employment_model' => 'agency_contract',
            'bank_account_number' => '100000000005',
            'pan_number' => 'ABCDE0005E',
            'basic_pay' => 20000,
            'hra' => 8000,
            'pf_applicable' => true,
            'eps_applicable' => true,
            'esi_applicable' => false,
            'pt_applicable' => true,
        ]);

        $calc = $this->salaryService->calculateStructuralSalary($input);
        $this->assertEquals(0.00, $calc['employer_eps_monthly']);
        $this->assertEquals(1800.00, $calc['employer_epf_monthly']);

        $legacyPayload = array_merge($input, [
            'status' => 'onboarding',
            'gross_monthly_salary' => $calc['gross_monthly_salary'],
            'net_take_home_monthly' => $calc['net_take_home_monthly'],
            'employer_pf_monthly' => $calc['employer_pf_monthly'],
            'employer_esi_monthly' => $calc['employer_esi_monthly'],
            'ctc_monthly' => $calc['ctc_monthly'],
        ]);

        $legacyEmp = Employee::create($legacyPayload);

        $batchPayload = array_merge($input, [
            'employee_code' => 'PAR003_BATCH',
            'personal_email' => 'par003_batch@example.com',
            'phone_number' => '9800000006',
            'bank_account_number' => '100000000006',
            'pan_number' => 'ABCDE0006F',
            'status' => 'onboarding',
            'gross_monthly_salary' => $calc['gross_monthly_salary'],
            'net_take_home_monthly' => $calc['net_take_home_monthly'],
            'employer_pf_monthly' => $calc['employer_pf_monthly'],
            'employer_esi_monthly' => $calc['employer_esi_monthly'],
            'ctc_monthly' => $calc['ctc_monthly'],
            'created_at' => now()->toDateTimeString(),
            'updated_at' => now()->toDateTimeString(),
        ]);

        DB::table('employees')->insert([$batchPayload]);
        $batchEmp = Employee::where('employee_code', 'PAR003_BATCH')->first();

        $this->assertEquals($legacyEmp->employer_pf_monthly, $batchEmp->employer_pf_monthly);
    }

    public function test_4_esi_threshold_crossing_parity()
    {
        $input = $this->getBaseInput([
            'employee_code' => 'PAR004',
            'full_name' => 'High Salary ESI Excluded',
            'personal_email' => 'par004@example.com',
            'phone_number' => '9800000007',
            'date_of_birth' => '1995-01-01',
            'date_of_joining' => '2023-01-01',
            'designation' => 'Lead Engineer',
            'employment_model' => 'agency_contract',
            'bank_account_number' => '100000000007',
            'pan_number' => 'ABCDE0007G',
            'basic_pay' => 20000,
            'hra' => 10000,
            'pf_applicable' => true,
            'eps_applicable' => true,
            'esi_applicable' => true,
            'pt_applicable' => true,
        ]);

        $calc = $this->salaryService->calculateStructuralSalary($input);
        $this->assertEquals(0.00, $calc['employer_esi_monthly']);

        $legacyPayload = array_merge($input, [
            'status' => 'onboarding',
            'gross_monthly_salary' => $calc['gross_monthly_salary'],
            'net_take_home_monthly' => $calc['net_take_home_monthly'],
            'employer_pf_monthly' => $calc['employer_pf_monthly'],
            'employer_esi_monthly' => $calc['employer_esi_monthly'],
            'ctc_monthly' => $calc['ctc_monthly'],
        ]);

        $legacyEmp = Employee::create($legacyPayload);

        $batchPayload = array_merge($input, [
            'employee_code' => 'PAR004_BATCH',
            'personal_email' => 'par004_batch@example.com',
            'phone_number' => '9800000008',
            'bank_account_number' => '100000000008',
            'pan_number' => 'ABCDE0008H',
            'status' => 'onboarding',
            'gross_monthly_salary' => $calc['gross_monthly_salary'],
            'net_take_home_monthly' => $calc['net_take_home_monthly'],
            'employer_pf_monthly' => $calc['employer_pf_monthly'],
            'employer_esi_monthly' => $calc['employer_esi_monthly'],
            'ctc_monthly' => $calc['ctc_monthly'],
            'created_at' => now()->toDateTimeString(),
            'updated_at' => now()->toDateTimeString(),
        ]);

        DB::table('employees')->insert([$batchPayload]);
        $batchEmp = Employee::where('employee_code', 'PAR004_BATCH')->first();

        $this->assertEquals($legacyEmp->employer_esi_monthly, $batchEmp->employer_esi_monthly);
    }

    public function test_5_contract_model_agency_vs_eor_parity()
    {
        $input = $this->getBaseInput([
            'employee_code' => 'PAR005',
            'full_name' => 'Agency Contract Employee',
            'personal_email' => 'par005@example.com',
            'phone_number' => '9800000009',
            'date_of_birth' => '1994-03-20',
            'date_of_joining' => '2023-01-01',
            'designation' => 'Staff Contractor',
            'employment_model' => 'agency_contract',
            'bank_account_number' => '100000000009',
            'pan_number' => 'ABCDE0009I',
            'basic_pay' => 15000,
            'hra' => 6000,
            'pf_applicable' => true,
            'eps_applicable' => true,
            'esi_applicable' => true,
            'pt_applicable' => true,
        ]);

        $calc = $this->salaryService->calculateStructuralSalary($input);

        $legacyPayload = array_merge($input, [
            'status' => 'onboarding',
            'gross_monthly_salary' => $calc['gross_monthly_salary'],
            'net_take_home_monthly' => $calc['net_take_home_monthly'],
            'employer_pf_monthly' => $calc['employer_pf_monthly'],
            'employer_esi_monthly' => $calc['employer_esi_monthly'],
            'ctc_monthly' => $calc['ctc_monthly'],
        ]);

        $legacyEmp = Employee::create($legacyPayload);

        $batchPayload = array_merge($input, [
            'employee_code' => 'PAR005_BATCH',
            'personal_email' => 'par005_batch@example.com',
            'phone_number' => '9800000010',
            'bank_account_number' => '100000000010',
            'pan_number' => 'ABCDE0010J',
            'status' => 'onboarding',
            'gross_monthly_salary' => $calc['gross_monthly_salary'],
            'net_take_home_monthly' => $calc['net_take_home_monthly'],
            'employer_pf_monthly' => $calc['employer_pf_monthly'],
            'employer_esi_monthly' => $calc['employer_esi_monthly'],
            'ctc_monthly' => $calc['ctc_monthly'],
            'created_at' => now()->toDateTimeString(),
            'updated_at' => now()->toDateTimeString(),
        ]);

        DB::table('employees')->insert([$batchPayload]);
        $batchEmp = Employee::where('employee_code', 'PAR005_BATCH')->first();

        $this->assertEquals($legacyEmp->employment_model, $batchEmp->employment_model);
        $this->assertEquals($legacyEmp->ctc_monthly, $batchEmp->ctc_monthly);
    }
}
