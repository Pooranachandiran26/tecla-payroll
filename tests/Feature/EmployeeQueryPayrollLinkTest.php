<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\Client;
use App\Models\Employee;
use App\Models\PayrollRun;
use App\Models\PayrollRunItem;
use App\Models\EmployeeQuery;
use App\Services\PayrollCorrectionService;
use App\Mail\QueryResolvedWithPayrollAdjustmentMail;
use App\Mail\EmployeeQueryRespondedMail;
use App\Mail\SalaryReviewSummaryMail;
use App\Services\SettingsService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\DB;

class EmployeeQueryPayrollLinkTest extends TestCase
{
    use RefreshDatabase;

    protected $admin;
    protected $client;
    protected $employee;
    protected $parentRun;

    protected function setUp(): void
    {
        parent::setUp();
        \Carbon\Carbon::setTestNow(\Carbon\Carbon::parse('2026-08-01'));

        $this->admin = User::factory()->create(['role' => 'admin']);

        $this->client = Client::create([
            'company_name' => 'Query Link Test Client',
            'client_code' => 'QLT-CLIENT',
            'company_type' => 'pvt_ltd',
            'contract_type' => 'eor',
            'contract_start_date' => '2024-01-01',
            'billing_model' => 'markup',
            'registered_address_line_1' => '123',
            'registered_city' => 'City',
            'registered_state' => 'State',
            'registered_pin' => '400001',
            'primary_poc_name' => 'POC 1',
            'primary_poc_email' => 'poc1@example.com',
            'primary_poc_phone' => '9999999999',
            'status' => 'active',
        ]);

        $this->branch = \App\Models\ClientBranch::create([
            'client_id' => $this->client->id,
            'branch_name' => 'Main',
            'state' => 'Maharashtra',
            'gstin' => '27ABCDE1234F1ZH',
        ]);

        $this->employee = Employee::create([
            'client_id' => $this->client->id,
            'branch_id' => $this->branch->id,
            'full_name' => 'Query Test Employee',
            'personal_email' => 'qlt001@example.com',
            'phone_number' => '9988776654',
            'date_of_birth' => '1992-01-01',
            'date_of_joining' => '2024-01-01',
            'designation' => 'Software Engineer',
            'employment_model' => 'eor',
            'prior_employment_flag' => 0,
            'residential_address' => '456 St',
            'bank_account_number' => '1234567891',
            'bank_ifsc' => 'SBIN0001234',
            'bank_name' => 'SBI',
            'bank_branch' => 'Main',
            'account_holder_name' => 'Query Test Employee',
            'pan_number' => 'ABCDE1234G',
            'employee_code' => 'QLT-001',
            'status' => 'active',
            'basic_pay' => 30000,
            'uan_mode' => 'new',
            'tds_regime' => 'new',
            'gratuity_mode' => 'part_of_ctc',
            'lop_basis_days' => '30',
            'declarations_accepted' => 1,
            'pf_applicable' => true,
            'esi_applicable' => false,
            'pt_applicable' => true,
            'lwf_applicable' => false,
            'hra' => 0,
            'conveyance' => 0,
            'da' => 0,
            'medical_allowance' => 0,
            'special_allowance' => 0,
            'other_additions' => 0,
        ]);

        $this->parentRun = PayrollRun::create([
            'client_id' => $this->client->id,
            'payroll_month' => '2026-07-01',
            'status' => 'draft',
            'total_employees_processed' => 1,
            'total_employees_excluded' => 0,
            'total_gross_earnings' => 30000.00,
            'total_net_disbursement' => 28200.00,
            'total_employer_statutory_cost' => 1950.00,
        ]);

        PayrollRunItem::create([
            'payroll_run_id' => $this->parentRun->id,
            'employee_id' => $this->employee->id,
            'paid_days' => 30.00,
            'lop_days' => 0.00,
            'basic_pay' => 30000.00,
            'hra' => 0,
            'conveyance' => 0,
            'da' => 0,
            'medical_allowance' => 0,
            'special_allowance' => 0,
            'other_additions' => 0,
            'gross_total' => 30000.00,
            'employee_pf' => 1800.00,
            'employee_esi' => 0,
            'professional_tax' => 0,
            'lwf_deduction' => 0,
            'lop_deduction' => 0,
            'tds_deduction' => 0,
            'loan_emi_deduction' => 0,
            'net_pay' => 28200.00,
            'employer_pf' => 1950.00,
            'employer_esi' => 0,
            'employer_lwf' => 0,
            'is_excluded' => false,
            'attendance_source' => 'live_punch',
        ]);

        $this->parentRun->update([
            'status' => 'approved',
            'approved_by' => $this->admin->id,
            'approved_at' => now(),
        ]);

        app(\App\Services\InvoiceGenerationService::class)->generateForRun($this->parentRun);

        $this->parentRun->update([
            'status' => 'locked',
            'locked_at' => now(),
        ]);
    }

    /** @test */
    public function test_1_query_status_becomes_in_progress_not_resolved_immediately_after_draft_correction_creation()
    {
        $query = EmployeeQuery::create([
            'employee_id' => $this->employee->id,
            'client_id' => $this->client->id,
            'subject' => 'Incorrect LOP applied',
            'category' => 'payroll',
            'message' => 'I was present on July 15, please correct my LOP.',
            'status' => 'pending',
        ]);

        $service = app(PayrollCorrectionService::class);
        $preview = $service->calculateCorrectionPreview($this->employee, $this->parentRun, 29.0, 1.0);

        $service->applyCorrection(
            $this->employee,
            $this->parentRun,
            $preview,
            'Corrected July 15 attendance',
            $query->id
        );

        $freshQuery = $query->fresh();

        $this->assertEquals('in_progress', $freshQuery->status, "Query status must be in_progress immediately after draft creation.");
        $this->assertNull($freshQuery->resolved_at, "resolved_at must be null while correction is in draft.");
        $this->assertNotNull($freshQuery->correction_run_item_id, "correction_run_item_id must be populated.");
    }

    /** @test */
    public function test_2_query_with_linked_correction_resolves_and_sends_adjustment_email_on_lock()
    {
        Mail::fake();

        $query = EmployeeQuery::create([
            'employee_id' => $this->employee->id,
            'client_id' => $this->client->id,
            'subject' => 'Incorrect LOP applied',
            'category' => 'payroll',
            'message' => 'Please correct LOP.',
            'status' => 'pending',
        ]);

        $service = app(PayrollCorrectionService::class);
        $preview = $service->calculateCorrectionPreview($this->employee, $this->parentRun, 29.0, 1.0);

        $savedItem = $service->applyCorrection(
            $this->employee,
            $this->parentRun,
            $preview,
            'Corrected July 15 attendance',
            $query->id
        );

        $suppRun = $savedItem->payrollRun;

        $approveResp = $this->actingAs($this->admin)
            ->post(route('payroll.run.approve', ['id' => $suppRun->id]));
        $approveResp->assertSessionHas('success');

        // Lock the supplementary run
        $lockResp = $this->actingAs($this->admin)
            ->post(route('payroll.run.lock', ['id' => $suppRun->id]));
        $lockResp->assertSessionHas('success');

        $lockResp->assertRedirect();

        $freshQuery = $query->fresh();
        $this->assertEquals('resolved', $freshQuery->status, "Query status must transition to resolved on supplementary lock.");
        $this->assertNotNull($freshQuery->resolved_at, "resolved_at must be set when locked.");

        Mail::assertSent(QueryResolvedWithPayrollAdjustmentMail::class, function ($mail) {
            return $mail->hasTo('qlt001@example.com') &&
                   $mail->adjustmentSummary['corrected_paid_days'] == 29.0;
        });
    }

    /** @test */
    public function test_3_query_resolved_without_correction_sends_normal_responded_mail()
    {
        Mail::fake();

        $query = EmployeeQuery::create([
            'employee_id' => $this->employee->id,
            'client_id' => $this->client->id,
            'subject' => 'General Question',
            'category' => 'general',
            'message' => 'When is payday?',
            'status' => 'pending',
        ]);

        $response = $this->actingAs($this->admin)
            ->post(route('admin.employee-queries.respond', ['query' => $query->id]), [
                'admin_response' => 'Payday is the 1st of every month.',
            ]);

        $response->assertRedirect();

        $freshQuery = $query->fresh();
        $this->assertEquals('resolved', $freshQuery->status);
        $this->assertNull($freshQuery->correction_run_item_id);

        Mail::assertQueued(EmployeeQueryRespondedMail::class, function ($mail) {
            return $mail->hasTo('qlt001@example.com');
        });

        Mail::assertNotQueued(QueryResolvedWithPayrollAdjustmentMail::class);
    }

    /** @test */
    public function test_4_email_from_address_uses_settings_service_group()
    {
        DB::table('settings')->insert([
            'group' => 'email',
            'key' => 'from_address',
            'value' => 'custom-support@teclapayroll.com',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        DB::table('settings')->insert([
            'group' => 'email',
            'key' => 'from_name',
            'value' => 'Custom Tecla Support',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        DB::table('settings')->insert([
            'group' => 'email',
            'key' => 'smtp_host',
            'value' => 'smtp.mailtrap.io',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // Re-boot provider to apply settings
        $provider = new \App\Providers\MailConfigServiceProvider(app());
        $provider->boot();

        $this->assertEquals('custom-support@teclapayroll.com', config('mail.from.address'));
        $this->assertEquals('Custom Tecla Support', config('mail.from.name'));
    }

    /** @test */
    public function test_5_stage1_salary_review_email_fires_on_supplementary_run_lock()
    {
        Mail::fake();

        $service = app(PayrollCorrectionService::class);
        $preview = $service->calculateCorrectionPreview($this->employee, $this->parentRun, 28.0, 2.0);

        $savedItem = $service->applyCorrection(
            $this->employee,
            $this->parentRun,
            $preview,
            'Second correction'
        );

        $suppRun = $savedItem->payrollRun;

        $this->actingAs($this->admin)
            ->post(route('payroll.run.approve', ['id' => $suppRun->id]));

        $response = $this->actingAs($this->admin)
            ->post(route('payroll.run.lock', ['id' => $suppRun->id]));

        $response->assertRedirect();

        Mail::assertSent(SalaryReviewSummaryMail::class, function ($mail) {
            return $mail->hasTo('qlt001@example.com') &&
                   $mail->item->employee_id == $this->employee->id;
        });
    }
}
