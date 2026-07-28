<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\Client;
use App\Models\Employee;
use App\Models\SalaryRevision;
use Illuminate\Foundation\Testing\RefreshDatabase;

class SalaryRevisionPromotionTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;
    protected Employee $employee;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::factory()->create([
            'role' => 'admin',
        ]);

        $client = Client::factory()->create([
            'company_name' => 'Acme Corporation',
            'status' => 'active',
        ]);

        $branch = \App\Models\ClientBranch::create([
            'client_id' => $client->id,
            'branch_name' => 'Head Office',
            'state' => 'Maharashtra',
        ]);

        $this->employee = Employee::factory()->create([
            'client_id' => $client->id,
            'branch_id' => $branch->id,
            'full_name' => 'John Doe',
            'designation' => 'Software Engineer',
            'basic_pay' => 30000,
            'hra' => 10000,
            'conveyance' => 2000,
            'da' => 0,
            'medical_allowance' => 0,
            'special_allowance' => 5000,
            'other_additions' => 0,
            'status' => 'active',
        ]);
    }

    /** @test */
    public function test_1_regression_submitting_with_is_promotion_false_behaves_identically_to_before()
    {
        $response = $this->actingAs($this->admin)->post(
            route('employees.salary-revision.store', $this->employee->id),
            [
                'is_promotion' => false,
                'new_basic_pay' => 35000,
                'new_hra' => 12000,
                'new_conveyance' => 2000,
                'new_da' => 0,
                'new_medical_allowance' => 0,
                'new_special_allowance' => 5000,
                'new_other_additions' => 0,
                'effective_date' => now()->toDateString(),
                'reason_for_revision' => 'Annual Performance Appraisal',
            ]
        );

        $response->assertRedirect();

        $revision = SalaryRevision::where('employee_id', $this->employee->id)->latest('id')->first();
        $this->assertNotNull($revision);
        $this->assertFalse((bool)$revision->is_promotion);
        $this->assertNull($revision->old_designation);
        $this->assertNull($revision->new_designation);
        $this->assertEquals('pending_approval', $revision->status);

        // Employee designation remains unchanged
        $this->employee->refresh();
        $this->assertEquals('Software Engineer', $this->employee->designation);
    }

    /** @test */
    public function test_2_submitting_with_is_promotion_true_and_valid_new_designation_creates_pending_record_with_old_designation_captured()
    {
        $response = $this->actingAs($this->admin)->post(
            route('employees.salary-revision.store', $this->employee->id),
            [
                'is_promotion' => true,
                'new_designation' => 'Senior Software Engineer',
                'new_basic_pay' => 45000,
                'new_hra' => 15000,
                'new_conveyance' => 2000,
                'new_da' => 0,
                'new_medical_allowance' => 0,
                'new_special_allowance' => 8000,
                'new_other_additions' => 0,
                'effective_date' => now()->toDateString(),
                'reason_for_revision' => 'promotion',
            ]
        );

        $response->assertRedirect();

        $revision = SalaryRevision::where('employee_id', $this->employee->id)->latest('id')->first();
        $this->assertNotNull($revision);
        $this->assertTrue((bool)$revision->is_promotion);
        $this->assertEquals('Software Engineer', $revision->old_designation);
        $this->assertEquals('Senior Software Engineer', $revision->new_designation);
        $this->assertEquals('pending_approval', $revision->status);

        // Employee designation must NOT change upon submit
        $this->employee->refresh();
        $this->assertEquals('Software Engineer', $this->employee->designation);
    }

    /** @test */
    public function test_3_validation_rejects_new_designation_equal_to_current_designation()
    {
        $response = $this->actingAs($this->admin)->post(
            route('employees.salary-revision.store', $this->employee->id),
            [
                'is_promotion' => true,
                'new_designation' => 'Software Engineer', // Same as current designation
                'new_basic_pay' => 35000,
                'new_hra' => 12000,
                'new_conveyance' => 2000,
                'new_da' => 0,
                'new_medical_allowance' => 0,
                'new_special_allowance' => 5000,
                'new_other_additions' => 0,
                'effective_date' => now()->toDateString(),
                'reason_for_revision' => 'promotion',
            ]
        );

        $response->assertSessionHasErrors(['new_designation']);
    }

    /** @test */
    public function test_4_approval_updates_employee_designation_only_when_is_promotion_true()
    {
        // 1. Plain Salary Revision (is_promotion = false)
        $plainRevision = SalaryRevision::create([
            'employee_id' => $this->employee->id,
            'is_promotion' => false,
            'old_designation' => null,
            'new_designation' => null,
            'old_basic_pay' => 30000,
            'new_basic_pay' => 35000,
            'old_hra' => 10000,
            'new_hra' => 12000,
            'old_conveyance' => 2000,
            'new_conveyance' => 2000,
            'old_da' => 0,
            'new_da' => 0,
            'old_medical_allowance' => 0,
            'new_medical_allowance' => 0,
            'old_special_allowance' => 5000,
            'new_special_allowance' => 5000,
            'old_other_additions' => 0,
            'new_other_additions' => 0,
            'old_net_take_home' => 43000,
            'new_net_take_home' => 49000,
            'old_ctc' => 47000,
            'new_ctc' => 54000,
            'effective_date' => now()->toDateString(),
            'reason_for_revision' => 'appraisal',
            'status' => 'pending_approval',
        ]);

        $this->actingAs($this->admin)->post(
            route('employees.salary-revision.approve', ['id' => $this->employee->id, 'revisionId' => $plainRevision->id]),
            ['action' => 'approve']
        );

        $this->employee->refresh();
        $this->assertEquals(35000, (float)$this->employee->basic_pay);
        $this->assertEquals('Software Engineer', $this->employee->designation); // Designation unchanged!

        // 2. Promotion Revision (is_promotion = true)
        $promotionRevision = SalaryRevision::create([
            'employee_id' => $this->employee->id,
            'is_promotion' => true,
            'old_designation' => 'Software Engineer',
            'new_designation' => 'Lead Engineer',
            'old_basic_pay' => 35000,
            'new_basic_pay' => 50000,
            'old_hra' => 12000,
            'new_hra' => 18000,
            'old_conveyance' => 2000,
            'new_conveyance' => 2000,
            'old_da' => 0,
            'new_da' => 0,
            'old_medical_allowance' => 0,
            'new_medical_allowance' => 0,
            'old_special_allowance' => 5000,
            'new_special_allowance' => 10000,
            'old_other_additions' => 0,
            'new_other_additions' => 0,
            'old_net_take_home' => 49000,
            'new_net_take_home' => 70000,
            'old_ctc' => 54000,
            'new_ctc' => 80000,
            'effective_date' => now()->toDateString(),
            'reason_for_revision' => 'promotion',
            'status' => 'pending_approval',
        ]);

        $this->actingAs($this->admin)->post(
            route('employees.salary-revision.approve', ['id' => $this->employee->id, 'revisionId' => $promotionRevision->id]),
            ['action' => 'approve']
        );

        $this->employee->refresh();
        $this->assertEquals(50000, (float)$this->employee->basic_pay);
        $this->assertEquals('Lead Engineer', $this->employee->designation); // Designation updated to Lead Engineer!
    }

    /** @test */
    public function test_5_db_tinker_verification_showing_old_and_new_designation_and_approval_gating()
    {
        // Submit promotion
        $this->actingAs($this->admin)->post(
            route('employees.salary-revision.store', $this->employee->id),
            [
                'is_promotion' => true,
                'new_designation' => 'Principal Architect',
                'new_basic_pay' => 60000,
                'new_hra' => 20000,
                'new_conveyance' => 2000,
                'new_da' => 0,
                'new_medical_allowance' => 0,
                'new_special_allowance' => 10000,
                'new_other_additions' => 0,
                'effective_date' => now()->toDateString(),
                'reason_for_revision' => 'promotion',
            ]
        );

        $revision = SalaryRevision::where('employee_id', $this->employee->id)->latest('id')->first();
        
        // Assert DB state before approval
        $this->assertEquals('Software Engineer', $revision->old_designation);
        $this->assertEquals('Principal Architect', $revision->new_designation);
        $this->assertTrue((bool)$revision->is_promotion);

        $this->employee->refresh();
        $this->assertEquals('Software Engineer', $this->employee->designation); // STILL Software Engineer before approval!

        // Approve
        $this->actingAs($this->admin)->post(
            route('employees.salary-revision.approve', ['id' => $this->employee->id, 'revisionId' => $revision->id]),
            ['action' => 'approve']
        );

        $this->employee->refresh();
        $this->assertEquals('Principal Architect', $this->employee->designation); // Updated after approval!
    }

    /** @test */
    public function test_6_approval_sends_promotion_revision_approved_email_and_can_be_manually_triggered()
    {
        \Illuminate\Support\Facades\Mail::fake();

        $this->employee->update(['personal_email' => 'john.doe@example.com']);

        $revision = SalaryRevision::create([
            'employee_id' => $this->employee->id,
            'old_basic_pay' => 30000,
            'old_hra' => 10000,
            'old_conveyance' => 2000,
            'old_da' => 0,
            'old_medical_allowance' => 0,
            'old_special_allowance' => 5000,
            'old_other_additions' => 0,
            'old_net_take_home' => 42000,
            'old_ctc' => 47000,
            'new_basic_pay' => 50000,
            'new_hra' => 20000,
            'new_conveyance' => 2000,
            'new_da' => 0,
            'new_medical_allowance' => 0,
            'new_special_allowance' => 10000,
            'new_other_additions' => 0,
            'new_net_take_home' => 75000,
            'new_ctc' => 82000,
            'effective_date' => now()->toDateString(),
            'reason_for_revision' => 'promotion',
            'is_promotion' => true,
            'old_designation' => 'Software Engineer',
            'new_designation' => 'Tech Lead',
            'status' => 'pending_approval',
        ]);

        // 1. Test auto email send on approval
        $this->actingAs($this->admin)->post(
            route('employees.salary-revision.approve', ['id' => $this->employee->id, 'revisionId' => $revision->id]),
            ['action' => 'approve']
        );

        \Illuminate\Support\Facades\Mail::assertSent(\App\Mail\PromotionRevisionApprovedMail::class, function ($mail) {
            return $mail->hasTo('john.doe@example.com') &&
                   $mail->employee->id === $this->employee->id &&
                   $mail->revision->is_promotion === true &&
                   $mail->revision->new_designation === 'Tech Lead';
        });

        // 2. Test manual send-email trigger with custom subject and note
        $this->actingAs($this->admin)->post(
            route('employees.salary-revision.send-email', ['id' => $this->employee->id, 'revisionId' => $revision->id]),
            [
                'subject' => 'Customized Promotion Letter Subject',
                'custom_note' => 'Thank you for your exceptional contributions and hard work!',
                'recipient_email' => 'john.custom@example.com'
            ]
        )->assertRedirect();

        \Illuminate\Support\Facades\Mail::assertSent(\App\Mail\PromotionRevisionApprovedMail::class, function ($mail) {
            return $mail->hasTo('john.custom@example.com') &&
                   $mail->customSubject === 'Customized Promotion Letter Subject' &&
                   $mail->customNote === 'Thank you for your exceptional contributions and hard work!';
        });
    }

    /** @test */
    public function test_8_promotion_rejected_with_warning_if_probation_end_date_has_not_passed()
    {
        // 1. Set probation end date in the future
        $futureProbationDate = now()->addMonths(3)->toDateString();
        $this->employee->update(['probation_end_date' => $futureProbationDate]);

        // 2. Attempt to promote employee under active probation
        $response = $this->actingAs($this->admin)->post(
            route('employees.salary-revision.store', $this->employee->id),
            [
                'is_promotion' => true,
                'new_designation' => 'Senior Lead Architect',
                'new_basic_pay' => 60000,
                'new_hra' => 20000,
                'new_conveyance' => 2000,
                'new_da' => 0,
                'new_medical_allowance' => 0,
                'new_special_allowance' => 10000,
                'new_other_additions' => 0,
                'effective_date' => now()->toDateString(),
                'reason_for_revision' => 'promotion',
            ]
        );

        $response->assertSessionHasErrors(['new_designation']);
        
        // 3. Clear probation or set in past
        $pastProbationDate = now()->subMonth()->toDateString();
        $this->employee->update(['probation_end_date' => $pastProbationDate]);

        // 4. Attempt promotion again after probation ended -> Success!
        $response2 = $this->actingAs($this->admin)->post(
            route('employees.salary-revision.store', $this->employee->id),
            [
                'is_promotion' => true,
                'new_designation' => 'Senior Lead Architect',
                'new_basic_pay' => 60000,
                'new_hra' => 20000,
                'new_conveyance' => 2000,
                'new_da' => 0,
                'new_medical_allowance' => 0,
                'new_special_allowance' => 10000,
                'new_other_additions' => 0,
                'effective_date' => now()->toDateString(),
                'reason_for_revision' => 'promotion',
            ]
        );

        $response2->assertSessionHasNoErrors();
    }
}
