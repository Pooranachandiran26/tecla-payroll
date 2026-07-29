<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use App\Models\User;
use App\Models\Client;
use App\Models\ClientBranch;
use App\Models\Employee;
use App\Models\PayrollRun;
use App\Models\PayrollRunItem;
use App\Services\PayrollCorrectionService;

class SupplementaryRunLockFlashTest extends TestCase
{
    use RefreshDatabase;

    protected $admin;
    protected $client;
    protected $branch;
    protected $parentRun;
    protected $employee;

    protected function setUp(): void
    {
        parent::setUp();

        \Illuminate\Support\Facades\Mail::fake();

        $this->admin = User::factory()->create(['role' => 'admin']);

        $this->client = Client::factory()->create([
            'status' => 'active',
            'registered_state' => 'Maharashtra',
            'pt_state' => 'Maharashtra',
        ]);
        $this->branch = ClientBranch::create([
            'client_id' => $this->client->id,
            'branch_name' => 'HQ',
            'state' => 'Maharashtra',
            'gstin' => '27AAACB1234C1Z1',
        ]);

        $this->employee = Employee::create([
            'client_id' => $this->client->id,
            'branch_id' => $this->branch->id,
            'full_name' => 'John Doe',
            'personal_email' => 'johndoe@example.com',
            'phone_number' => '9876543210',
            'date_of_birth' => '1990-01-01',
            'date_of_joining' => '2026-05-01',
            'designation' => 'Developer',
            'employment_model' => 'eor',
            'prior_employment_flag' => 0,
            'residential_address' => '123 Main St',
            'bank_account_number' => '1234567890',
            'bank_ifsc' => 'SBIN0001234',
            'bank_name' => 'SBI',
            'bank_branch' => 'Main',
            'account_holder_name' => 'John Doe',
            'pan_number' => 'ABCDE1234F',
            'employee_code' => 'TEC-FLASHTEST',
            'uan_mode' => 'new',
            'status' => 'active',
            'basic_pay' => 15000,
            'hra' => 5000,
            'conveyance' => 0,
            'da' => 0,
            'medical_allowance' => 0,
            'special_allowance' => 0,
            'other_additions' => 0,
            'tds_regime' => 'new',
            'gratuity_mode' => 'part_of_ctc',
            'lop_basis_days' => '30',
            'declarations_accepted' => 1,
        ]);

        $this->parentRun = PayrollRun::create([
            'client_id' => $this->client->id,
            'payroll_month' => '2026-06-01',
            'status' => 'draft',
            'total_employees_processed' => 1,
            'total_employees_excluded' => 0,
            'total_gross_earnings' => 20000,
            'total_net_disbursement' => 18000,
            'total_employer_statutory_cost' => 1950,
        ]);

        PayrollRunItem::create([
            'payroll_run_id' => $this->parentRun->id,
            'employee_id' => $this->employee->id,
            'paid_days' => 30,
            'lop_days' => 0,
            'basic_pay' => 15000,
            'hra' => 5000,
            'conveyance' => 0,
            'da' => 0,
            'medical_allowance' => 0,
            'special_allowance' => 0,
            'other_additions' => 0,
            'gross_total' => 20000,
            'employee_pf' => 1800,
            'employee_esi' => 0,
            'professional_tax' => 200,
            'lwf_deduction' => 0,
            'lop_deduction' => 0,
            'tds_deduction' => 0,
            'loan_emi_deduction' => 0,
            'net_pay' => 18000,
            'employer_pf' => 1950,
            'employer_esi' => 0,
            'is_excluded' => 0,
            'attendance_source' => 'uploaded',
        ]);
    }

    /**
     * Test 1: Locking parent run returns the original parent flash message.
     */
    public function test_locking_parent_run_still_returns_original_parent_message()
    {
        $this->parentRun->update(['status' => 'approved']);

        $response = $this->actingAs($this->admin)
            ->post(route('payroll.run.lock', $this->parentRun->id));

        $response->assertRedirect();
        $response->assertSessionHas('success', 'Payroll run locked, invoices generated, and salary summary emails dispatched successfully.');
    }

    /**
     * Test 2: Locking a New-Hire supplementary run returns the supplementary flash message.
     */
    public function test_locking_new_hire_supplementary_run_returns_single_correct_flash_message()
    {
        // First lock parent run
        $this->parentRun->update(['status' => 'locked']);

        // Create new hire
        $newHire = Employee::create([
            'client_id' => $this->client->id,
            'branch_id' => $this->branch->id,
            'full_name' => 'Jane NewHire',
            'personal_email' => 'janenew@example.com',
            'phone_number' => '9876543211',
            'date_of_birth' => '1992-02-02',
            'date_of_joining' => '2026-06-15',
            'designation' => 'Designer',
            'employment_model' => 'eor',
            'prior_employment_flag' => 0,
            'residential_address' => '456 St',
            'bank_account_number' => '9876543210',
            'bank_ifsc' => 'SBIN0001234',
            'bank_name' => 'SBI',
            'bank_branch' => 'Main',
            'account_holder_name' => 'Jane NewHire',
            'pan_number' => 'XYZDE1234F',
            'employee_code' => 'TEC-NEWHIRE1',
            'uan_mode' => 'new',
            'status' => 'active',
            'basic_pay' => 12000,
            'hra' => 4000,
            'conveyance' => 0, 'da' => 0, 'medical_allowance' => 0, 'special_allowance' => 0, 'other_additions' => 0,
            'tds_regime' => 'new', 'gratuity_mode' => 'part_of_ctc', 'lop_basis_days' => '30', 'declarations_accepted' => 1,
        ]);

        // Create supplementary run
        $this->actingAs($this->admin)->post(route('payroll.run.supplementary', $this->parentRun->id));

        $suppRun = PayrollRun::where('parent_run_id', $this->parentRun->id)
            ->where('is_supplementary_run', true)
            ->first();

        $this->assertNotNull($suppRun);

        // Approve & lock supplementary run
        $suppRun->update(['status' => 'approved']);
        $lockResponse = $this->actingAs($this->admin)->post(route('payroll.run.lock', $suppRun->id));

        $lockResponse->assertRedirect();
        $lockResponse->assertSessionHas('success', 'Supplementary run locked and invoices merged successfully.');
    }

    /**
     * Test 3: Locking a Single Correction supplementary run returns the supplementary flash message.
     */
    public function test_locking_single_correction_supplementary_run_returns_single_correct_flash_message()
    {
        $this->parentRun->update(['status' => 'locked']);

        $service = app(PayrollCorrectionService::class);
        $preview = $service->calculateCorrectionPreview($this->employee, $this->parentRun, 25, 5);
        $item = $service->applyCorrection($this->employee, $this->parentRun, $preview, 'Single correction test');

        $suppRun = PayrollRun::find($item->payroll_run_id);
        $this->assertNotNull($suppRun);

        $suppRun->update(['status' => 'approved']);
        $lockResponse = $this->actingAs($this->admin)->post(route('payroll.run.lock', $suppRun->id));

        $lockResponse->assertRedirect();
        $lockResponse->assertSessionHas('success', 'Supplementary run locked and invoices merged successfully.');
    }

    /**
     * Test 4: Locking a Batch Correction supplementary run returns the supplementary flash message.
     */
    public function test_locking_batch_correction_supplementary_run_returns_single_correct_flash_message()
    {
        $this->parentRun->update(['status' => 'locked']);

        $service = app(PayrollCorrectionService::class);
        $suppRun = $service->applyBatchCorrection(
            $this->parentRun,
            [
                [
                    'employee_id' => $this->employee->id,
                    'corrected_paid_days' => 20,
                    'corrected_lop_days' => 10,
                    'reason' => 'Batch correction test item',
                ]
            ],
            'Batch correction global reason'
        );

        $this->assertNotNull($suppRun);

        $suppRun->update(['status' => 'approved']);
        $lockResponse = $this->actingAs($this->admin)->post(route('payroll.run.lock', $suppRun->id));

        $lockResponse->assertRedirect();
        $lockResponse->assertSessionHas('success', 'Supplementary run locked and invoices merged successfully.');
    }
}
