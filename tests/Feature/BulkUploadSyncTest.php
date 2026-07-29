<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use App\Models\User;
use App\Models\Client;
use App\Models\ClientBranch;
use App\Models\Employee;
use App\Services\BulkUploadValidationService;
use App\Services\SalaryCalculationService;
use PHPUnit\Framework\Attributes\Test;

class BulkUploadSyncTest extends TestCase
{
    use RefreshDatabase;

    protected $validationService;

    protected function setUp(): void
    {
        parent::setUp();
        $this->validationService = app(BulkUploadValidationService::class);
    }

    /**
     * TEST 1: Bulk upload row with age 58+ correctly triggers EPS cutoff (₹0 EPS, full 12% EPF)
     * via single source of truth (SalaryCalculationService) and preview warning.
     */
    #[Test]
    public function test_bulk_upload_row_age_58_plus_triggers_eps_cutoff_and_warning(): void
    {
        $client = Client::factory()->create(['company_name' => 'Acme Corp', 'client_code' => 'ACM001']);
        ClientBranch::factory()->create(['client_id' => $client->id, 'branch_name' => 'Main']);

        $filename = 'test_age_58_' . time() . '.xlsx';
        $filePath = storage_path('app/temp_bulk_uploads/' . $filename);
        if (!is_dir(storage_path('app/temp_bulk_uploads'))) {
            mkdir(storage_path('app/temp_bulk_uploads'), 0755, true);
        }

        $writer = \Spatie\SimpleExcel\SimpleExcelWriter::create($filePath);
        $writer->nameCurrentSheet('Employee Data');
        $writer->addHeader([
            'employee_code', 'full_name', 'client_code', 'branch_name', 'personal_email', 'phone_number',
            'date_of_birth', 'date_of_joining', 'designation', 'employment_model', 'prior_employment_flag',
            'residential_address', 'bank_account_number', 'bank_ifsc', 'bank_name', 'bank_branch',
            'account_holder_name', 'pan_number', 'basic_pay', 'hra', 'conveyance', 'da',
            'medical_allowance', 'special_allowance', 'other_additions', 'pf_applicable', 'eps_applicable',
            'esi_applicable', 'pt_applicable', 'lwf_applicable', 'tds_applicable', 'uan_mode',
            'uan_number', 'esi_mode', 'esic_number', 'tds_regime', 'gratuity_mode', 'lop_basis_days',
            'declarations_accepted', 'reporting_manager_code'
        ]);

        $writer->addRow([
            'employee_code' => 'EMP580',
            'full_name' => 'Senior Employee',
            'client_code' => 'ACM001',
            'branch_name' => 'Main',
            'personal_email' => 'senior@example.com',
            'phone_number' => '9812345678',
            'date_of_birth' => '1960-01-01', // Age 66 (>58)
            'date_of_joining' => '2026-01-01',
            'designation' => 'Advisor',
            'employment_model' => 'eor',
            'prior_employment_flag' => '0',
            'residential_address' => '123 Senior Lane',
            'bank_account_number' => '998877665544',
            'bank_ifsc' => 'SBIN0001234',
            'bank_name' => 'SBI',
            'bank_branch' => 'Main',
            'account_holder_name' => 'Senior Employee',
            'pan_number' => 'ABCDE1234A',
            'basic_pay' => '15000',
            'hra' => '5000',
            'conveyance' => '0',
            'da' => '0',
            'medical_allowance' => '0',
            'special_allowance' => '0',
            'other_additions' => '0',
            'pf_applicable' => '1',
            'eps_applicable' => '1',
            'esi_applicable' => '0',
            'pt_applicable' => '1',
            'lwf_applicable' => '0',
            'tds_applicable' => '0',
            'uan_mode' => 'new',
            'uan_number' => '',
            'esi_mode' => 'new',
            'esic_number' => '',
            'tds_regime' => 'new',
            'gratuity_mode' => 'part_of_ctc',
            'lop_basis_days' => '30',
            'declarations_accepted' => '1',
            'reporting_manager_code' => ''
        ]);
        $writer->close();

        $results = $this->validationService->validateFile($filePath);
        @unlink($filePath);

        $this->assertEquals(1, $results['total_rows']);
        $row = $results['rows'][0];
        $this->assertEquals('warning', $row['status'], "Row validation failed with message: " . $row['message']);
        $this->assertStringContainsString('EPS auto-cut off to ₹0 (age 58+)', $row['message']);

        // Verify single source of truth calculation output
        $salaryCalc = app(SalaryCalculationService::class)->calculateStructuralSalary($row['db_payload']);
        $this->assertEquals(0.00, $salaryCalc['employer_eps_monthly']);
        $this->assertEquals(1800.00, $salaryCalc['employer_epf_monthly']);
    }

    /**
     * TEST 2: Backward Compatibility — OLD 39-column format file imports successfully with correct defaults.
     */
    #[Test]
    public function test_legacy_39_column_file_imports_with_default_values(): void
    {
        $client = Client::factory()->create(['company_name' => 'Legacy Corp', 'client_code' => 'LEG001']);
        ClientBranch::factory()->create(['client_id' => $client->id, 'branch_name' => 'Main']);

        $filename = 'test_legacy_39_' . time() . '.xlsx';
        $filePath = storage_path('app/temp_bulk_uploads/' . $filename);
        if (!is_dir(storage_path('app/temp_bulk_uploads'))) {
            mkdir(storage_path('app/temp_bulk_uploads'), 0755, true);
        }

        $writer = \Spatie\SimpleExcel\SimpleExcelWriter::create($filePath);
        $writer->nameCurrentSheet('Employee Data');
        $writer->addHeader([
            'employee_code', 'full_name', 'client_code', 'branch_name', 'personal_email', 'phone_number',
            'date_of_birth', 'date_of_joining', 'designation', 'employment_model', 'prior_employment_flag',
            'residential_address', 'bank_account_number', 'bank_ifsc', 'bank_name', 'bank_branch',
            'account_holder_name', 'pan_number', 'basic_pay', 'hra', 'conveyance', 'da',
            'medical_allowance', 'special_allowance', 'other_additions', 'pf_applicable',
            'esi_applicable', 'pt_applicable', 'lwf_applicable', 'tds_applicable', 'uan_mode',
            'uan_number', 'esi_mode', 'esic_number', 'tds_regime', 'gratuity_mode', 'lop_basis_days',
            'declarations_accepted', 'reporting_manager_code'
        ]);

        $writer->addRow([
            'employee_code' => 'LEG101',
            'full_name' => 'Legacy Employee',
            'client_code' => 'LEG001',
            'branch_name' => 'Main',
            'personal_email' => 'legacy@example.com',
            'phone_number' => '9822334455',
            'date_of_birth' => '1995-06-15',
            'date_of_joining' => '2026-02-01',
            'designation' => 'Engineer',
            'employment_model' => 'eor',
            'prior_employment_flag' => '0',
            'residential_address' => '123 Legacy St',
            'bank_account_number' => '112233445566',
            'bank_ifsc' => 'HDFC0000001',
            'bank_name' => 'HDFC',
            'bank_branch' => 'Main',
            'account_holder_name' => 'Legacy Employee',
            'pan_number' => 'ABCDE1234B',
            'basic_pay' => '15000',
            'hra' => '5000',
            'conveyance' => '0',
            'da' => '0',
            'medical_allowance' => '0',
            'special_allowance' => '0',
            'other_additions' => '0',
            'pf_applicable' => '1',
            'esi_applicable' => '1',
            'pt_applicable' => '1',
            'lwf_applicable' => '0',
            'tds_applicable' => '0',
            'uan_mode' => 'new',
            'uan_number' => '',
            'esi_mode' => 'new',
            'esic_number' => '',
            'tds_regime' => 'new',
            'gratuity_mode' => 'part_of_ctc',
            'lop_basis_days' => '30',
            'declarations_accepted' => '1',
            'reporting_manager_code' => ''
        ]);
        $writer->close();

        $results = $this->validationService->validateFile($filePath);
        @unlink($filePath);

        $this->assertEquals(0, $results['error_count'], "Errors found: " . json_encode($results['rows']));
        $row = $results['rows'][0];
        $this->assertTrue((bool)$row['db_payload']['eps_applicable']);
        $this->assertEquals('2026-02-01', $row['db_payload']['attendance_tracking_start_date']);
        $this->assertNull($row['db_payload']['health_insurance_provider']);
        $this->assertNull($row['db_payload']['probation_end_date']);
    }

    /**
     * TEST 3: Health Insurance fields import correctly when populated, and warn when omitted for non-ESI.
     */
    #[Test]
    public function test_health_insurance_fields_import_and_warn_when_omitted_for_non_esi(): void
    {
        $client = Client::factory()->create(['company_name' => 'Health Corp', 'client_code' => 'HLT001', 'health_insurance_enabled' => true]);
        ClientBranch::factory()->create(['client_id' => $client->id, 'branch_name' => 'Main']);

        $filename = 'test_health_ins_' . time() . '.xlsx';
        $filePath = storage_path('app/temp_bulk_uploads/' . $filename);
        if (!is_dir(storage_path('app/temp_bulk_uploads'))) {
            mkdir(storage_path('app/temp_bulk_uploads'), 0755, true);
        }

        $writer = \Spatie\SimpleExcel\SimpleExcelWriter::create($filePath);
        $writer->nameCurrentSheet('Employee Data');
        $writer->addHeader([
            'employee_code', 'full_name', 'client_code', 'branch_name', 'personal_email', 'phone_number',
            'date_of_birth', 'date_of_joining', 'designation', 'employment_model', 'prior_employment_flag',
            'residential_address', 'bank_account_number', 'bank_ifsc', 'bank_name', 'bank_branch',
            'account_holder_name', 'pan_number', 'basic_pay', 'hra', 'conveyance', 'da',
            'medical_allowance', 'special_allowance', 'other_additions', 'pf_applicable', 'eps_applicable',
            'esi_applicable', 'pt_applicable', 'lwf_applicable', 'tds_applicable', 'uan_mode',
            'uan_number', 'esi_mode', 'esic_number', 'tds_regime', 'gratuity_mode', 'lop_basis_days',
            'declarations_accepted', 'reporting_manager_code', 'health_insurance_provider',
            'health_insurance_policy_no', 'health_insurance_sum_insured'
        ]);

        // Row 1: Non-ESI with populated insurance
        $writer->addRow([
            'employee_code' => 'INS101',
            'full_name' => 'Insured Employee',
            'client_code' => 'HLT001',
            'branch_name' => 'Main',
            'personal_email' => 'insured@example.com',
            'phone_number' => '9899112233',
            'date_of_birth' => '1990-01-01',
            'date_of_joining' => '2026-01-01',
            'designation' => 'Manager',
            'employment_model' => 'eor',
            'prior_employment_flag' => '0',
            'residential_address' => '123 Health St',
            'bank_account_number' => '554433221100',
            'bank_ifsc' => 'ICIC0000001',
            'bank_name' => 'ICICI',
            'bank_branch' => 'Main',
            'account_holder_name' => 'Insured Employee',
            'pan_number' => 'ABCDE1234C',
            'basic_pay' => '30000',
            'hra' => '15000',
            'conveyance' => '0',
            'da' => '0',
            'medical_allowance' => '0',
            'special_allowance' => '0',
            'other_additions' => '0',
            'pf_applicable' => '1',
            'eps_applicable' => '1',
            'esi_applicable' => '0',
            'pt_applicable' => '1',
            'lwf_applicable' => '0',
            'tds_applicable' => '0',
            'uan_mode' => 'new',
            'uan_number' => '',
            'esi_mode' => 'new',
            'esic_number' => '',
            'tds_regime' => 'new',
            'gratuity_mode' => 'part_of_ctc',
            'lop_basis_days' => '30',
            'declarations_accepted' => '1',
            'reporting_manager_code' => '',
            'health_insurance_provider' => 'Star Health Corporate',
            'health_insurance_policy_no' => 'POL-STAR-88',
            'health_insurance_sum_insured' => '500000',
        ]);

        // Row 2: Non-ESI with blank insurance
        $writer->addRow([
            'employee_code' => 'INS102',
            'full_name' => 'Uninsured Non-ESI Employee',
            'client_code' => 'HLT001',
            'branch_name' => 'Main',
            'personal_email' => 'uninsured@example.com',
            'phone_number' => '9899112244',
            'date_of_birth' => '1992-01-01',
            'date_of_joining' => '2026-01-01',
            'designation' => 'Lead',
            'employment_model' => 'eor',
            'prior_employment_flag' => '0',
            'residential_address' => '124 Health St',
            'bank_account_number' => '554433221111',
            'bank_ifsc' => 'ICIC0000001',
            'bank_name' => 'ICICI',
            'bank_branch' => 'Main',
            'account_holder_name' => 'Uninsured Employee',
            'pan_number' => 'ABCDE1234D',
            'basic_pay' => '35000',
            'hra' => '15000',
            'conveyance' => '0',
            'da' => '0',
            'medical_allowance' => '0',
            'special_allowance' => '0',
            'other_additions' => '0',
            'pf_applicable' => '1',
            'eps_applicable' => '1',
            'esi_applicable' => '0',
            'pt_applicable' => '1',
            'lwf_applicable' => '0',
            'tds_applicable' => '0',
            'uan_mode' => 'new',
            'uan_number' => '',
            'esi_mode' => 'new',
            'esic_number' => '',
            'tds_regime' => 'new',
            'gratuity_mode' => 'part_of_ctc',
            'lop_basis_days' => '30',
            'declarations_accepted' => '1',
            'reporting_manager_code' => '',
            'health_insurance_provider' => '',
            'health_insurance_policy_no' => '',
            'health_insurance_sum_insured' => '',
        ]);
        $writer->close();

        $results = $this->validationService->validateFile($filePath);
        @unlink($filePath);

        $row1 = $results['rows'][0];
        $this->assertArrayHasKey('db_payload', $row1, "Row 1 failed validation: " . $row1['message']);
        $this->assertEquals('Star Health Corporate', $row1['db_payload']['health_insurance_provider']);
        $this->assertEquals('POL-STAR-88', $row1['db_payload']['health_insurance_policy_no']);
        $this->assertEquals(500000.00, $row1['db_payload']['health_insurance_sum_insured']);

        $row2 = $results['rows'][1];
        $this->assertEquals('warning', $row2['status'], "Row 2 failed validation: " . $row2['message']);
        $this->assertStringContainsString('Non-ESI member without Group Medical Insurance details', $row2['message']);
        $this->assertNull($row2['db_payload']['health_insurance_provider']);
    }

    /**
     * TEST 4: Probation and Attendance Tracking dates validation and defaulting.
     */
    #[Test]
    public function test_probation_and_attendance_tracking_dates_validation(): void
    {
        $client = Client::factory()->create(['company_name' => 'Date Corp', 'client_code' => 'DAT001']);
        ClientBranch::factory()->create(['client_id' => $client->id, 'branch_name' => 'Main']);

        $filename = 'test_dates_' . time() . '.xlsx';
        $filePath = storage_path('app/temp_bulk_uploads/' . $filename);
        if (!is_dir(storage_path('app/temp_bulk_uploads'))) {
            mkdir(storage_path('app/temp_bulk_uploads'), 0755, true);
        }

        $writer = \Spatie\SimpleExcel\SimpleExcelWriter::create($filePath);
        $writer->nameCurrentSheet('Employee Data');
        $writer->addHeader([
            'employee_code', 'full_name', 'client_code', 'branch_name', 'personal_email', 'phone_number',
            'date_of_birth', 'date_of_joining', 'designation', 'employment_model', 'prior_employment_flag',
            'residential_address', 'bank_account_number', 'bank_ifsc', 'bank_name', 'bank_branch',
            'account_holder_name', 'pan_number', 'basic_pay', 'hra', 'conveyance', 'da',
            'medical_allowance', 'special_allowance', 'other_additions', 'pf_applicable', 'eps_applicable',
            'esi_applicable', 'pt_applicable', 'lwf_applicable', 'tds_applicable', 'uan_mode',
            'uan_number', 'esi_mode', 'esic_number', 'tds_regime', 'gratuity_mode', 'lop_basis_days',
            'declarations_accepted', 'reporting_manager_code', 'probation_end_date', 'attendance_tracking_start_date'
        ]);

        // Row 1: Invalid probation end date earlier than DOJ
        $writer->addRow([
            'employee_code' => 'DAT101',
            'full_name' => 'Invalid Probation Employee',
            'client_code' => 'DAT001',
            'branch_name' => 'Main',
            'personal_email' => 'invprob@example.com',
            'phone_number' => '9711223344',
            'date_of_birth' => '1990-01-01',
            'date_of_joining' => '2026-01-01',
            'designation' => 'Dev',
            'employment_model' => 'eor',
            'prior_employment_flag' => '0',
            'residential_address' => '123 Date St',
            'bank_account_number' => '991122334455',
            'bank_ifsc' => 'AXIS0000001',
            'bank_name' => 'Axis',
            'bank_branch' => 'Main',
            'account_holder_name' => 'Inv Employee',
            'pan_number' => 'ABCDE1234E',
            'basic_pay' => '15000',
            'hra' => '5000',
            'conveyance' => '0',
            'da' => '0',
            'medical_allowance' => '0',
            'special_allowance' => '0',
            'other_additions' => '0',
            'pf_applicable' => '1',
            'eps_applicable' => '1',
            'esi_applicable' => '1',
            'pt_applicable' => '1',
            'lwf_applicable' => '0',
            'tds_applicable' => '0',
            'uan_mode' => 'new',
            'uan_number' => '',
            'esi_mode' => 'new',
            'esic_number' => '',
            'tds_regime' => 'new',
            'gratuity_mode' => 'part_of_ctc',
            'lop_basis_days' => '30',
            'declarations_accepted' => '1',
            'reporting_manager_code' => '',
            'probation_end_date' => '2025-12-31', // Before DOJ 2026-01-01
            'attendance_tracking_start_date' => '',
        ]);

        // Row 2: Valid probation end date and blank attendance date (defaulting to DOJ)
        $writer->addRow([
            'employee_code' => 'DAT102',
            'full_name' => 'Valid Probation Employee',
            'client_code' => 'DAT001',
            'branch_name' => 'Main',
            'personal_email' => 'valprob@example.com',
            'phone_number' => '9711223355',
            'date_of_birth' => '1990-01-01',
            'date_of_joining' => '2026-01-01',
            'designation' => 'Dev',
            'employment_model' => 'eor',
            'prior_employment_flag' => '0',
            'residential_address' => '124 Date St',
            'bank_account_number' => '991122334466',
            'bank_ifsc' => 'AXIS0000001',
            'bank_name' => 'Axis',
            'bank_branch' => 'Main',
            'account_holder_name' => 'Val Employee',
            'pan_number' => 'ABCDE1234F',
            'basic_pay' => '15000',
            'hra' => '5000',
            'conveyance' => '0',
            'da' => '0',
            'medical_allowance' => '0',
            'special_allowance' => '0',
            'other_additions' => '0',
            'pf_applicable' => '1',
            'eps_applicable' => '1',
            'esi_applicable' => '1',
            'pt_applicable' => '1',
            'lwf_applicable' => '0',
            'tds_applicable' => '0',
            'uan_mode' => 'new',
            'uan_number' => '',
            'esi_mode' => 'new',
            'esic_number' => '',
            'tds_regime' => 'new',
            'gratuity_mode' => 'part_of_ctc',
            'lop_basis_days' => '30',
            'declarations_accepted' => '1',
            'reporting_manager_code' => '',
            'probation_end_date' => '2026-07-01',
            'attendance_tracking_start_date' => '',
        ]);

        $writer->close();

        $results = $this->validationService->validateFile($filePath);
        @unlink($filePath);

        $row1 = $results['rows'][0];
        $this->assertEquals('error', $row1['status']);
        $this->assertStringContainsString('Probation end date cannot precede Date of Joining.', $row1['message']);

        $row2 = $results['rows'][1];
        $this->assertEquals('ready', $row2['status'], "Row 2 failed validation: " . $row2['message']);
        $this->assertEquals('2026-07-01', $row2['db_payload']['probation_end_date']);
        $this->assertEquals('2026-01-01', $row2['db_payload']['attendance_tracking_start_date']);
    }
}
