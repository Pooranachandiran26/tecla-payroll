<?php

namespace Tests\Feature;

use App\Mail\OfficialPayslipReleasedMail;
use App\Mail\SalaryReviewSummaryMail;
use App\Models\AttendanceRecord;
use App\Models\Client;
use App\Models\ClientBranch;
use App\Models\Employee;
use App\Models\PayrollRun;
use App\Models\PayrollRunItem;
use App\Models\SalaryRevision;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class PayslipTimingRedesignTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;
    protected User $assignedManager;
    protected User $unassignedManager;
    protected Client $client;
    protected Client $otherClient;
    protected Employee $emp1;
    protected Employee $emp2;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::factory()->create(['role' => 'admin']);
        $this->assignedManager = User::factory()->create(['role' => 'manager']);
        $this->unassignedManager = User::factory()->create(['role' => 'manager']);

        $this->client = Client::factory()->create([
            'company_name' => 'Acme Corp',
            'client_code' => 'ACME',
            'status' => 'active',
            'account_manager_id' => $this->assignedManager->id,
        ]);

        $this->branch = ClientBranch::create([
            'client_id' => $this->client->id,
            'branch_name' => 'Main Branch',
            'city' => 'Mumbai',
            'state' => 'Maharashtra',
            'gstin' => '27ABCDE1234F1Z5',
        ]);

        $this->otherClient = Client::factory()->create([
            'company_name' => 'Beta Industries',
            'client_code' => 'BETA',
            'status' => 'active',
        ]);

        $this->emp1 = Employee::factory()->create([
            'client_id' => $this->client->id,
            'branch_id' => $this->branch->id,
            'employee_code' => 'ACME-001',
            'first_name' => 'Aarav',
            'last_name' => 'Sharma',
            'full_name' => 'Aarav Sharma',
            'status' => 'active',
            'personal_email' => 'aarav@example.com',
            'date_of_joining' => '2025-01-01',
            'pan_number' => 'ABCDE1111A',
            'aadhaar_number' => '111122223333',
            'bank_account_number' => '1111111111',
            'basic_pay' => 15000,
            'hra' => 5000,
            'employment_model' => 'peo',
        ]);

        $this->emp2 = Employee::factory()->create([
            'client_id' => $this->client->id,
            'branch_id' => $this->branch->id,
            'employee_code' => 'ACME-002',
            'first_name' => 'Priya',
            'last_name' => 'Patel',
            'full_name' => 'Priya Patel',
            'status' => 'active',
            'personal_email' => 'priya@example.com',
            'date_of_joining' => '2025-01-01',
            'pan_number' => 'ABCDE2222B',
            'aadhaar_number' => '222233334444',
            'bank_account_number' => '2222222222',
            'basic_pay' => 20000,
            'hra' => 6000,
            'employment_model' => 'peo',
        ]);
    }

    protected function createApprovedRun(): PayrollRun
    {
        $run = PayrollRun::create([
            'client_id' => $this->client->id,
            'payroll_month' => '2026-07-01',
            'status' => 'draft',
            'total_employees_processed' => 2,
            'total_employees_excluded' => 0,
            'total_gross_earnings' => 46000,
            'total_net_disbursement' => 41400,
        ]);

        PayrollRunItem::create([
            'payroll_run_id' => $run->id,
            'employee_id' => $this->emp1->id,
            'paid_days' => 31.00,
            'lop_days' => 0.00,
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
            'is_excluded' => false,
            'attendance_source' => 'live_punch',
        ]);

        PayrollRunItem::create([
            'payroll_run_id' => $run->id,
            'employee_id' => $this->emp2->id,
            'paid_days' => 31.00,
            'lop_days' => 0.00,
            'basic_pay' => 20000,
            'hra' => 6000,
            'conveyance' => 0,
            'da' => 0,
            'medical_allowance' => 0,
            'special_allowance' => 0,
            'other_additions' => 0,
            'gross_total' => 26000,
            'employee_pf' => 2400,
            'employee_esi' => 0,
            'professional_tax' => 200,
            'lwf_deduction' => 0,
            'lop_deduction' => 0,
            'tds_deduction' => 0,
            'loan_emi_deduction' => 0,
            'net_pay' => 23400,
            'employer_pf' => 2600,
            'employer_esi' => 0,
            'is_excluded' => false,
            'attendance_source' => 'live_punch',
        ]);

        $run->update([
            'status' => 'approved',
            'approved_by' => $this->admin->id,
            'approved_at' => now(),
        ]);

        return $run;
    }

    /** @test */
    public function test_1_locking_payroll_run_sends_salary_review_email_without_pdf_or_payslip_wording()
    {
        Mail::fake();

        $run = $this->createApprovedRun();

        $response = $this->actingAs($this->admin)->post(route('payroll.run.lock', $run->id));
        $response->assertRedirect();

        $run->refresh();
        $this->assertEquals('locked', $run->status);
        $this->assertNotNull($run->review_email_sent_at);

        // Assert SalaryReviewSummaryMail was sent to active employees
        Mail::assertSent(SalaryReviewSummaryMail::class, function ($mail) {
            $hasCorrectRecipient = $mail->hasTo('aarav@example.com') || $mail->hasTo('priya@example.com');
            $subject = $mail->envelope()->subject;

            // Must NOT contain the word "payslip" in subject
            $subjectNoPayslip = !str_contains(strtolower($subject), 'payslip');
            
            // Must contain "Payroll Summary" or "Salary Review"
            $subjectHasSummary = str_contains($subject, 'Payroll Summary') || str_contains($subject, 'Salary Review');

            // Must NOT have any PDF attachments
            $noAttachments = count($mail->attachments()) === 0;

            return $hasCorrectRecipient && $subjectNoPayslip && $subjectHasSummary && $noAttachments;
        });
    }

    /** @test */
    public function test_2_salary_review_breakdown_correctly_resolves_incomplete_punches()
    {
        Mail::fake();

        // Create an incomplete punch scenario on July 14
        AttendanceRecord::create([
            'employee_id' => $this->emp1->id,
            'attendance_date' => '2026-07-14',
            'punch_in_time' => '2026-07-14 09:00:00',
            'punch_out_time' => null,
            'status' => null,
            'source' => 'live_punch',
        ]);

        $run = $this->createApprovedRun();

        $this->actingAs($this->admin)->post(route('payroll.run.lock', $run->id));

        Mail::assertSent(SalaryReviewSummaryMail::class, function ($mail) {
            if ($mail->hasTo('aarav@example.com')) {
                // Verify breakdown array has present_days, weekly_off_days, etc. without dropping unclassified days
                $this->assertArrayHasKey('present_days', $mail->breakdown);
                $this->assertArrayHasKey('weekly_off_days', $mail->breakdown);
                $this->assertArrayHasKey('lop_days', $mail->breakdown);
                return true;
            }
            return false;
        });
    }

    /** @test */
    public function test_3_stage2_release_payslips_enforces_manager_client_scoping_and_locked_status()
    {
        $run = $this->createApprovedRun(); // Status is 'approved' (not locked)

        // 1. Unlocked run fails
        $response = $this->actingAs($this->admin)->post(route('payroll.run.release-payslips', $run->id));
        $response->assertSessionHas('error');

        // Lock the run
        $run->update(['status' => 'locked', 'locked_at' => now()]);

        // 2. Unassigned manager fails with 403 Forbidden
        $response2 = $this->actingAs($this->unassignedManager)->post(route('payroll.run.release-payslips', $run->id));
        $response2->assertForbidden();

        // 3. Assigned manager succeeds
        Mail::fake();
        $response3 = $this->actingAs($this->assignedManager)->post(route('payroll.run.release-payslips', $run->id));
        $response3->assertRedirect();

        $run->refresh();
        $this->assertNotNull($run->payslip_released_at);
        $this->assertEquals($this->assignedManager->id, $run->payslip_released_by);
    }

    /** @test */
    public function test_4_stage2_release_payslips_generates_pdf_and_queues_official_mail()
    {
        Mail::fake();

        $run = $this->createApprovedRun();
        $run->update(['status' => 'locked', 'locked_at' => now()]);

        $response = $this->actingAs($this->admin)->post(route('payroll.run.release-payslips', $run->id));
        $response->assertRedirect();

        $run->refresh();
        $this->assertNotNull($run->payslip_released_at);

        Mail::assertSent(OfficialPayslipReleasedMail::class, function ($mail) {
            $hasPdfAttachment = count($mail->attachments()) > 0;
            $subjectHasOfficial = str_contains($mail->envelope()->subject, 'Official Salary Payslip');
            return $hasPdfAttachment && $subjectHasOfficial;
        });
    }

    /** @test */
    public function test_5_supplementary_run_stage1_and_stage2_only_target_supplementary_items_and_leave_parent_employees_untouched()
    {
        Mail::fake();

        $parentRun = $this->createApprovedRun();
        $parentRun->update(['status' => 'locked', 'locked_at' => now()]);

        // Create supplementary employee
        $suppEmp = Employee::factory()->create([
            'client_id' => $this->client->id,
            'branch_id' => $this->branch->id,
            'employee_code' => 'ACME-003',
            'first_name' => 'Kiran',
            'last_name' => 'Kumar',
            'full_name' => 'Kiran Kumar',
            'status' => 'active',
            'personal_email' => 'kiran@example.com',
            'date_of_joining' => '2025-01-01',
            'pan_number' => 'ABCDE3333C',
            'aadhaar_number' => '333344445555',
            'bank_account_number' => '3333333333',
            'basic_pay' => 18000,
            'employment_model' => 'peo',
        ]);

        $suppRun = PayrollRun::create([
            'client_id' => $this->client->id,
            'payroll_month' => '2026-07-01',
            'status' => 'draft',
            'is_supplementary_run' => true,
            'parent_run_id' => $parentRun->id,
        ]);

        PayrollRunItem::create([
            'payroll_run_id' => $suppRun->id,
            'employee_id' => $suppEmp->id,
            'paid_days' => 31.00,
            'lop_days' => 0.00,
            'basic_pay' => 18000,
            'hra' => 5000,
            'conveyance' => 0,
            'da' => 0,
            'medical_allowance' => 0,
            'special_allowance' => 0,
            'other_additions' => 0,
            'gross_total' => 23000,
            'employee_pf' => 1800,
            'employee_esi' => 0,
            'professional_tax' => 200,
            'lwf_deduction' => 0,
            'lop_deduction' => 0,
            'tds_deduction' => 0,
            'loan_emi_deduction' => 0,
            'net_pay' => 21000,
            'employer_pf' => 1950,
            'employer_esi' => 0,
            'is_excluded' => false,
            'attendance_source' => 'live_punch',
        ]);

        $suppRun->update(['status' => 'approved', 'approved_at' => now(), 'approved_by' => $this->admin->id]);

        // Lock supplementary run (Stage 1)
        $this->actingAs($this->admin)->post(route('payroll.run.lock', $suppRun->id));

        // Assert Stage 1 sent to suppEmp
        Mail::assertSent(SalaryReviewSummaryMail::class, fn($mail) => $mail->hasTo('kiran@example.com'));
        // EXPLICIT NEGATIVE ASSERTION FOR PARENT EMPLOYEES:
        Mail::assertNotSent(SalaryReviewSummaryMail::class, fn($mail) => $mail->hasTo('aarav@example.com'));
        Mail::assertNotSent(SalaryReviewSummaryMail::class, fn($mail) => $mail->hasTo('priya@example.com'));

        Mail::fake(); // Reset mail fake

        // Release supplementary run (Stage 2)
        $this->actingAs($this->admin)->post(route('payroll.run.release-payslips', $suppRun->id));

        // Assert Stage 2 sent to suppEmp
        Mail::assertSent(OfficialPayslipReleasedMail::class, fn($mail) => $mail->hasTo('kiran@example.com'));
        // EXPLICIT NEGATIVE ASSERTION FOR PARENT EMPLOYEES:
        Mail::assertNotSent(OfficialPayslipReleasedMail::class, fn($mail) => $mail->hasTo('aarav@example.com'));
        Mail::assertNotSent(OfficialPayslipReleasedMail::class, fn($mail) => $mail->hasTo('priya@example.com'));
    }

    /** @test */
    public function test_6_selective_resend_targets_only_specified_employee()
    {
        Mail::fake();

        $run = $this->createApprovedRun();
        $run->update(['status' => 'locked', 'locked_at' => now(), 'payslip_released_at' => now()]);

        // Trigger selective resend for emp1 ONLY
        $response = $this->actingAs($this->admin)->post(route('payroll.run.release-payslips', $run->id), [
            'employee_id' => $this->emp1->id,
        ]);
        $response->assertRedirect();

        // Assert OfficialPayslipReleasedMail sent ONLY to emp1
        Mail::assertSent(OfficialPayslipReleasedMail::class, fn($mail) => $mail->hasTo('aarav@example.com'));
        Mail::assertNotSent(OfficialPayslipReleasedMail::class, fn($mail) => $mail->hasTo('priya@example.com'));
    }
}
