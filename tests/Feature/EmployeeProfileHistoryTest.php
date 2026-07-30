<?php

namespace Tests\Feature;

use App\Models\Client;
use App\Models\ClientBranch;
use App\Models\Employee;
use App\Models\SalaryRevision;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class EmployeeProfileHistoryTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;
    protected User $employeeUser;
    protected Employee $employee;
    protected Client $client;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::factory()->create(['role' => 'admin']);

        $this->client = Client::factory()->create();
        ClientBranch::factory()->create(['client_id' => $this->client->id]);

        $this->employee = Employee::factory()->create([
            'client_id' => $this->client->id,
            'first_name' => 'John',
            'last_name' => 'Doe',
            'father_name' => 'Father Doe',
            'basic_pay' => 20000,
            'hra' => 5000,
            'conveyance' => 1000,
            'da' => 0,
            'medical_allowance' => 0,
            'special_allowance' => 0,
            'other_additions' => 0,
        ]);

        $this->employeeUser = User::factory()->create([
            'role' => 'employee',
            'email' => 'john.doe@example.com',
            'employee_id' => $this->employee->id,
        ]);
    }

    #[Test]
    public function test_1_salary_revision_submission_creates_history_record_with_old_value_snapshot_prior_to_approval()
    {
        $this->actingAs($this->admin);

        $payload = [
            'effective_date' => now()->toDateString(),
            'new_basic_pay' => 25000,
            'new_hra' => 6000,
            'new_conveyance' => 1000,
            'new_da' => 0,
            'new_medical_allowance' => 0,
            'new_special_allowance' => 0,
            'new_other_additions' => 0,
            'reason_for_revision' => 'Annual performance raise',
        ];

        $response = $this->post(route('employees.salary-revision.store', $this->employee->id), $payload);
        $response->assertRedirect();

        // 1. Assert DB record created with status = pending_approval
        $this->assertDatabaseHas('salary_revisions', [
            'employee_id' => $this->employee->id,
            'status' => 'pending_approval',
            'old_basic_pay' => '20000.00',
            'new_basic_pay' => '25000.00',
            'reason_for_revision' => 'Annual performance raise',
        ]);

        // 2. Assert employee record has NOT been updated prior to approval (off-by-one audit check)
        $this->assertEquals(20000, $this->employee->fresh()->basic_pay);

        $revision = SalaryRevision::where('employee_id', $this->employee->id)->firstOrFail();

        // 3. Approve revision
        $approveResponse = $this->post(route('employees.salary-revision.approve', [
            'id' => $this->employee->id,
            'revisionId' => $revision->id,
        ]), [
            'action' => 'approve',
        ]);
        $approveResponse->assertRedirect();

        // 4. Assert employee record is updated now
        $this->assertEquals(25000, $this->employee->fresh()->basic_pay);

        // 5. Assert old snapshot remains preserved as 20000
        $this->assertEquals('20000.00', (string) $revision->fresh()->old_basic_pay);
        $this->assertEquals('approved', $revision->fresh()->status);
    }

    #[Test]
    public function test_2_history_records_are_ordered_by_effective_date_desc_and_created_at_desc()
    {
        $this->actingAs($this->admin);

        // Create older effective date revision
        $rev1 = SalaryRevision::create([
            'employee_id' => $this->employee->id,
            'old_basic_pay' => 18000,
            'old_hra' => 4000,
            'old_conveyance' => 0,
            'old_da' => 0,
            'old_medical_allowance' => 0,
            'old_special_allowance' => 0,
            'old_other_additions' => 0,
            'old_net_take_home' => 20000,
            'old_ctc' => 22000,
            'new_basic_pay' => 20000,
            'new_hra' => 5000,
            'new_conveyance' => 1000,
            'new_da' => 0,
            'new_medical_allowance' => 0,
            'new_special_allowance' => 0,
            'new_other_additions' => 0,
            'new_net_take_home' => 24000,
            'new_ctc' => 26000,
            'effective_date' => '2026-01-01',
            'reason_for_revision' => 'Joining hike',
            'status' => 'approved',
            'created_at' => now()->subDays(10),
        ]);

        // Create newer effective date revision
        $rev2 = SalaryRevision::create([
            'employee_id' => $this->employee->id,
            'old_basic_pay' => 20000,
            'old_hra' => 5000,
            'old_conveyance' => 1000,
            'old_da' => 0,
            'old_medical_allowance' => 0,
            'old_special_allowance' => 0,
            'old_other_additions' => 0,
            'old_net_take_home' => 24000,
            'old_ctc' => 26000,
            'new_basic_pay' => 25000,
            'new_hra' => 6000,
            'new_conveyance' => 1000,
            'new_da' => 0,
            'new_medical_allowance' => 0,
            'new_special_allowance' => 0,
            'new_other_additions' => 0,
            'new_net_take_home' => 29000,
            'new_ctc' => 32000,
            'effective_date' => '2026-08-01',
            'reason_for_revision' => 'Mid year hike',
            'status' => 'pending_approval',
            'created_at' => now(),
        ]);

        $response = $this->get(route('employees.show', $this->employee->id));
        $response->assertOk();

        $pageProps = $response->inertiaPage()['props'];
        $history = $pageProps['salaryRevisions'];

        $this->assertCount(2, $history);
        $this->assertEquals($rev2->id, $history[0]['id']); // 2026-08-01 effective date comes first
        $this->assertEquals($rev1->id, $history[1]['id']); // 2026-01-01 effective date comes second
    }

    #[Test]
    public function test_3_portal_user_can_view_their_own_history_and_is_forbidden_from_viewing_others()
    {
        // 1. Employee views own portal profile
        $this->actingAs($this->employeeUser);

        $portalResponse = $this->get(route('employee.profile'));
        $portalResponse->assertOk();
        $portalProps = $portalResponse->inertiaPage()['props'];
        $this->assertArrayHasKey('salaryRevisions', $portalProps);

        // 2. Create second employee & user
        $otherEmployee = Employee::factory()->create([
            'client_id' => $this->client->id,
            'first_name' => 'Jane',
            'last_name' => 'Smith',
            'father_name' => 'Father Smith',
            'personal_email' => 'jane.smith.unique@example.com',
            'phone_number' => '9988776655',
            'pan_number' => 'XYZPD9999Z',
            'aadhaar_number' => '999988887777',
            'bank_account_number' => '99998888777766',
        ]);
        $otherUser = User::factory()->create([
            'role' => 'employee',
            'email' => 'jane.smith@example.com',
            'employee_id' => $otherEmployee->id,
        ]);

        // Employee user attempts to access another employee's admin detail page -> 403 Forbidden
        $unauthorizedResponse = $this->get(route('employees.show', $otherEmployee->id));
        $unauthorizedResponse->assertForbidden();
    }
}
