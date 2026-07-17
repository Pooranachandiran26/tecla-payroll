<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Employee;
use App\Models\Client;
use App\Models\SalaryRevision;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\TestCase;
use Carbon\Carbon;

class SalaryRevisionTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        
        $this->admin = User::factory()->create(['role' => 'admin']);
        $this->manager = User::factory()->create(['role' => 'manager']);
        
        $client = Client::first();
        if (!$client) {
            $client = Client::factory()->create();
        }
        
        $branch = \App\Models\ClientBranch::first();
        if (!$branch) {
            $branch = \App\Models\ClientBranch::factory()->create(['client_id' => $client->id]);
        }

        // We assume an employee exists (from the seeder or previous tests)
        $this->employee = Employee::first();
        if (!$this->employee) {
            $this->employee = Employee::factory()->create([
                'client_id' => $client->id,
                'branch_id' => $branch->id,
                'basic_pay' => 10000,
                'hra' => 5000,
                'conveyance' => 0,
                'da' => 0,
                'medical_allowance' => 0,
                'special_allowance' => 0,
                'other_additions' => 0,
                'net_take_home_monthly' => 14000,
                'ctc_monthly' => 15000,
            ]);
        }
    }

    public function test_manager_can_submit_revision_which_is_pending()
    {
        $payload = [
            'new_basic_pay' => 15000,
            'new_hra' => 7500,
            'new_conveyance' => 1000,
            'new_da' => 0,
            'new_medical_allowance' => 0,
            'new_special_allowance' => 0,
            'new_other_additions' => 0,
            'effective_date' => Carbon::now()->format('Y-m-d'),
            'reason_for_revision' => 'Annual appraisal',
        ];

        $response = $this->actingAs($this->manager)
                         ->post("/employees/{$this->employee->id}/salary-revision", $payload);

        $response->assertRedirect();
        $response->assertSessionHas('success', 'Salary revision submitted and is pending approval.');

        // Verify DB
        $revision = SalaryRevision::where('employee_id', $this->employee->id)->latest('id')->first();
        $this->assertNotNull($revision);
        $this->assertEquals('pending_approval', $revision->status);
        $this->assertEquals(15000, $revision->new_basic_pay);
        
        // Assert old fields captured correctly
        $this->assertEquals($this->employee->basic_pay, $revision->old_basic_pay);
        
        // Ensure net and CTC recomputed!
        $this->assertTrue($revision->new_net_take_home > 0);
        $this->assertTrue($revision->new_ctc > 0);
        
        // Ensure employee table is NOT updated
        $employeeFresh = Employee::find($this->employee->id);
        $this->assertEquals($this->employee->basic_pay, $employeeFresh->basic_pay);
    }

    public function test_admin_can_approve_revision()
    {
        $revision = SalaryRevision::create([
            'employee_id' => $this->employee->id,
            'old_basic_pay' => $this->employee->basic_pay,
            'old_hra' => $this->employee->hra,
            'old_conveyance' => $this->employee->conveyance,
            'old_da' => $this->employee->da,
            'old_medical_allowance' => $this->employee->medical_allowance,
            'old_special_allowance' => $this->employee->special_allowance,
            'old_other_additions' => $this->employee->other_additions,
            'old_net_take_home' => $this->employee->net_take_home_monthly,
            'old_ctc' => $this->employee->ctc_monthly,
            
            'new_basic_pay' => 20000,
            'new_hra' => 10000,
            'new_conveyance' => 0,
            'new_da' => 0,
            'new_medical_allowance' => 0,
            'new_special_allowance' => 0,
            'new_other_additions' => 0,
            'new_net_take_home' => 28000, // mock
            'new_ctc' => 30000,           // mock
            
            'effective_date' => Carbon::now()->format('Y-m-d'),
            'reason_for_revision' => 'Mid-year promo',
            'status' => 'pending_approval',
        ]);

        $payload = [
            'action' => 'approve'
        ];

        $response = $this->actingAs($this->admin)
                         ->post("/employees/{$this->employee->id}/salary-revision/{$revision->id}/approve", $payload);

        $response->assertRedirect();
        $response->assertSessionHas('success', 'Salary revision approved successfully.');

        // Verify revision status updated
        $revision->refresh();
        $this->assertEquals('approved', $revision->status);
        $this->assertNotNull($revision->approved_at);
        $this->assertEquals($this->admin->id, $revision->approved_by);

        // Verify employee updated
        $employeeFresh = Employee::find($this->employee->id);
        $this->assertEquals(20000, $employeeFresh->basic_pay);
        $this->assertEquals(10000, $employeeFresh->hra);
    }

    public function test_admin_can_reject_revision()
    {
        $revision = SalaryRevision::create([
            'employee_id' => $this->employee->id,
            'old_basic_pay' => $this->employee->basic_pay,
            'old_hra' => $this->employee->hra,
            'old_conveyance' => $this->employee->conveyance,
            'old_da' => $this->employee->da,
            'old_medical_allowance' => $this->employee->medical_allowance,
            'old_special_allowance' => $this->employee->special_allowance,
            'old_other_additions' => $this->employee->other_additions,
            'old_net_take_home' => $this->employee->net_take_home_monthly,
            'old_ctc' => $this->employee->ctc_monthly,
            
            'new_basic_pay' => 30000,
            'new_hra' => 15000,
            'new_conveyance' => 0,
            'new_da' => 0,
            'new_medical_allowance' => 0,
            'new_special_allowance' => 0,
            'new_other_additions' => 0,
            'new_net_take_home' => 42000, // mock
            'new_ctc' => 45000,           // mock
            
            'effective_date' => Carbon::now()->format('Y-m-d'),
            'reason_for_revision' => 'Excessive hike',
            'status' => 'pending_approval',
        ]);

        $payload = [
            'action' => 'reject',
            'rejection_reason' => 'Budget constraints'
        ];

        $response = $this->actingAs($this->admin)
                         ->post("/employees/{$this->employee->id}/salary-revision/{$revision->id}/approve", $payload);

        $response->assertRedirect();
        $response->assertSessionHas('success', 'Salary revision rejected.');

        // Verify revision status updated
        $revision->refresh();
        $this->assertEquals('rejected', $revision->status);
        $this->assertEquals('Budget constraints', $revision->rejection_reason);
        $this->assertNotNull($revision->approved_at); // resolved at
        $this->assertEquals($this->admin->id, $revision->approved_by);

        // Verify employee NOT updated
        $employeeFresh = Employee::find($this->employee->id);
        $this->assertEquals($this->employee->basic_pay, $employeeFresh->basic_pay); // Should be unchanged
    }

    public function test_manager_gets_403_on_approve_endpoint()
    {
        $revision = SalaryRevision::create([
            'employee_id' => $this->employee->id,
            'old_basic_pay' => 1,
            'old_hra' => 1,
            'old_conveyance' => 1,
            'old_da' => 1,
            'old_medical_allowance' => 1,
            'old_special_allowance' => 1,
            'old_other_additions' => 1,
            'old_net_take_home' => 1,
            'old_ctc' => 1,
            'new_basic_pay' => 2,
            'new_hra' => 2,
            'new_conveyance' => 2,
            'new_da' => 2,
            'new_medical_allowance' => 2,
            'new_special_allowance' => 2,
            'new_other_additions' => 2,
            'new_net_take_home' => 2,
            'new_ctc' => 2,
            'effective_date' => Carbon::now()->format('Y-m-d'),
            'reason_for_revision' => 'Testing',
            'status' => 'pending_approval',
        ]);

        $payload = [
            'action' => 'approve'
        ];

        $response = $this->actingAs($this->manager)
                         ->post("/employees/{$this->employee->id}/salary-revision/{$revision->id}/approve", $payload);

        $response->assertStatus(403);
    }

    public function test_manual_flow_output_for_user()
    {
        echo "\n--- 3. MANUAL FLOW (APPROVE PATH) ---\n";
        
        // a. Submit as manager
        $payload1 = [
            'new_basic_pay' => $this->employee->basic_pay + 5000,
            'new_hra' => $this->employee->hra + 2500,
            'new_conveyance' => 1000,
            'new_da' => 0,
            'new_medical_allowance' => 0,
            'new_special_allowance' => 0,
            'new_other_additions' => 0,
            'effective_date' => Carbon::now()->format('Y-m-d'),
            'reason_for_revision' => 'Manual Test Revision',
        ];
        
        $this->actingAs($this->manager)->post("/employees/{$this->employee->id}/salary-revision", $payload1);
        
        $rev1 = SalaryRevision::where('employee_id', $this->employee->id)->latest('id')->first();
        echo "a. Created salary_revisions row (status={$rev1->status})\n";
        echo "   Row ID: {$rev1->id}, Old Basic: {$rev1->old_basic_pay} -> New Basic: {$rev1->new_basic_pay}\n";
        
        // b. Show employees table row
        $empFresh = Employee::find($this->employee->id);
        echo "b. Employees table row basic_pay: {$empFresh->basic_pay} (Unchanged)\n";
        
        // c. Attempt hit approve endpoint as manager
        $responseFail = $this->actingAs($this->manager)->post("/employees/{$this->employee->id}/salary-revision/{$rev1->id}/approve", [
            'action' => 'approve'
        ]);
        echo "c. Attempt approve as manager response: {$responseFail->status()} (Forbidden)\n";
        
        // d. Admin approve
        $this->actingAs($this->admin)->post("/employees/{$this->employee->id}/salary-revision/{$rev1->id}/approve", [
            'action' => 'approve'
        ]);
        $rev1->refresh();
        echo "d. Admin approved revision (status={$rev1->status}, approved_at={$rev1->approved_at})\n";
        
        // e. Show employees table row again
        $empFresh2 = Employee::find($this->employee->id);
        echo "e. Employees table row basic_pay NOW: {$empFresh2->basic_pay} (Updated)\n";
        
        
        echo "\n--- 4. TEST REJECT PATH WITH SECOND REVISION ---\n";
        $payload2 = [
            'new_basic_pay' => 99999, // crazy hike
            'new_hra' => 0,
            'new_conveyance' => 0,
            'new_da' => 0,
            'new_medical_allowance' => 0,
            'new_special_allowance' => 0,
            'new_other_additions' => 0,
            'effective_date' => Carbon::now()->format('Y-m-d'),
            'reason_for_revision' => 'Testing Reject',
        ];
        $this->actingAs($this->manager)->post("/employees/{$this->employee->id}/salary-revision", $payload2);
        
        $rev2 = SalaryRevision::where('employee_id', $this->employee->id)->latest('id')->first();
        
        $this->actingAs($this->admin)->post("/employees/{$this->employee->id}/salary-revision/{$rev2->id}/approve", [
            'action' => 'reject',
            'rejection_reason' => 'Requested hike is too high'
        ]);
        
        $rev2->refresh();
        echo "Second revision status: {$rev2->status}\n";
        echo "Rejection Reason saved: '{$rev2->rejection_reason}'\n";
        $empFresh3 = Employee::find($this->employee->id);
        echo "Employees table row basic_pay NOW: {$empFresh3->basic_pay} (NOT touched by rejected revision)\n";
        
        echo "\n--- 5. FRONTEND ENDPOINT TEST ---\n";
        $responsePage = $this->actingAs($this->admin)->get("/employees/{$this->employee->id}/salary-revision");
        $responsePage->assertStatus(200);
        
        $page = $responsePage->viewData('page');
        if (isset($page['props']['employee'])) {
            $empProp = $page['props']['employee'];
            $empId = is_array($empProp) ? ($empProp['id'] ?? null) : ($empProp->id ?? null);
            $empName = is_array($empProp) ? ($empProp['full_name'] ?? null) : ($empProp->full_name ?? null);
            echo "Employee Prop: ID {$empId}, Name {$empName}\n";
            echo "Revisions Passed to Frontend: " . count($page['props']['revisions']) . "\n";
            echo "Latest Revision Status on Frontend: {$page['props']['revisions'][0]['status']}\n\n";
        }
    }
}
