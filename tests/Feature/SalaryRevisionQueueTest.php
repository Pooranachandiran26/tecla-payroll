<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\Client;
use App\Models\ClientBranch;
use App\Models\Employee;
use App\Models\SalaryRevision;
use Illuminate\Foundation\Testing\RefreshDatabase;

class SalaryRevisionQueueTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_view_salary_revisions_queue_page_with_client_filter()
    {
        $admin = User::factory()->create(['role' => 'admin', 'status' => 'active']);

        $client1 = Client::factory()->create(['company_name' => 'Alpha Corp', 'status' => 'active']);
        $client2 = Client::factory()->create(['company_name' => 'Beta Tech', 'status' => 'active']);

        $branch1 = ClientBranch::factory()->create(['client_id' => $client1->id]);
        $branch2 = ClientBranch::factory()->create(['client_id' => $client2->id]);

        $emp1 = Employee::factory()->create([
            'client_id' => $client1->id, 
            'branch_id' => $branch1->id, 
            'full_name' => 'John Doe',
            'pan_number' => 'ABCDE1234F',
            'aadhaar_number' => '123456789012',
            'bank_account_number' => '111122223333'
        ]);
        $emp2 = Employee::factory()->create([
            'client_id' => $client2->id, 
            'branch_id' => $branch2->id, 
            'full_name' => 'Jane Smith',
            'pan_number' => 'XYZDE5678G',
            'aadhaar_number' => '987654321098',
            'bank_account_number' => '444455556666'
        ]);

        SalaryRevision::create([
            'employee_id' => $emp1->id,
            'effective_date' => '2026-08-01',
            'old_basic_pay' => 20000,
            'new_basic_pay' => 25000,
            'old_hra' => 10000,
            'new_hra' => 12500,
            'old_conveyance' => 0,
            'new_conveyance' => 0,
            'old_da' => 0,
            'new_da' => 0,
            'old_medical_allowance' => 0,
            'new_medical_allowance' => 0,
            'old_special_allowance' => 0,
            'new_special_allowance' => 0,
            'old_other_additions' => 0,
            'new_other_additions' => 0,
            'old_net_take_home' => 27000,
            'new_net_take_home' => 34000,
            'old_ctc' => 40000,
            'new_ctc' => 50000,
            'reason_for_revision' => 'Annual appraisal',
            'status' => 'pending_approval',
        ]);

        SalaryRevision::create([
            'employee_id' => $emp2->id,
            'effective_date' => '2026-08-01',
            'old_basic_pay' => 30000,
            'new_basic_pay' => 35000,
            'old_hra' => 15000,
            'new_hra' => 17500,
            'old_conveyance' => 0,
            'new_conveyance' => 0,
            'old_da' => 0,
            'new_da' => 0,
            'old_medical_allowance' => 0,
            'new_medical_allowance' => 0,
            'old_special_allowance' => 0,
            'new_special_allowance' => 0,
            'old_other_additions' => 0,
            'new_other_additions' => 0,
            'old_net_take_home' => 40000,
            'new_net_take_home' => 47000,
            'old_ctc' => 60000,
            'new_ctc' => 70000,
            'reason_for_revision' => 'Promotion',
            'status' => 'pending_approval',
        ]);

        $response = $this->actingAs($admin)->get(route('employees.salary-revisions-queue', ['client_id' => $client1->id]));

        $response->assertStatus(200);
        $response->assertInertia(fn ($page) => $page
            ->component('Employees/SalaryRevisionsQueue')
            ->has('revisions.data', 1)
            ->where('revisions.data.0.employee_id', $emp1->id)
            ->has('clients')
            ->has('stats')
        );
    }
}
