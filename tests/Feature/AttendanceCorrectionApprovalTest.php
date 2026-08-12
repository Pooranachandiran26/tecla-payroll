<?php

namespace Tests\Feature;

use App\Models\AttendanceCorrectionRequest;
use App\Models\AttendanceRecord;
use App\Models\Client;
use App\Models\ClientBranch;
use App\Models\Employee;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AttendanceCorrectionApprovalTest extends TestCase
{
    use RefreshDatabase;

    public function test_manager_can_view_correction_requests_scoped_to_managed_clients()
    {
        $clientA = Client::factory()->create(['company_name' => 'Alpha Corp', 'status' => 'active']);
        $branchA = ClientBranch::factory()->create(['client_id' => $clientA->id]);

        $clientB = Client::factory()->create(['company_name' => 'Beta Corp', 'status' => 'active']);
        $branchB = ClientBranch::factory()->create(['client_id' => $clientB->id]);

        $empA = Employee::factory()->create([
            'client_id' => $clientA->id,
            'branch_id' => $branchA->id,
            'pan_number' => 'ABCDE1111A',
            'aadhaar_number' => '111122223331',
            'bank_account_number' => '100000000001',
        ]);

        $empB = Employee::factory()->create([
            'client_id' => $clientB->id,
            'branch_id' => $branchB->id,
            'pan_number' => 'ABCDE2222B',
            'aadhaar_number' => '111122223332',
            'bank_account_number' => '100000000002',
        ]);

        $reqA = AttendanceCorrectionRequest::create([
            'employee_id' => $empA->id,
            'attendance_date' => '2026-08-03',
            'requested_punch_in_time' => '2026-08-03 09:00:00',
            'requested_punch_out_time' => '2026-08-03 17:00:00',
            'reason_category' => 'forgot_to_punch_in',
            'reason_details' => 'Forgot to punch in during morning shift',
            'status' => 'pending',
        ]);

        $reqB = AttendanceCorrectionRequest::create([
            'employee_id' => $empB->id,
            'attendance_date' => '2026-08-03',
            'requested_punch_in_time' => '2026-08-03 09:00:00',
            'requested_punch_out_time' => '2026-08-03 17:00:00',
            'reason_category' => 'forgot_to_punch_in',
            'reason_details' => 'Forgot to punch in during morning shift',
            'status' => 'pending',
        ]);

        $manager = User::factory()->create([
            'role' => 'manager',
            'status' => 'active',
        ]);
        $manager->managedClients()->attach([$clientA->id]);

        $response = $this->actingAs($manager)->get(route('employees.attendance-corrections'));

        $response->assertStatus(200);
        $response->assertInertia(fn ($page) => $page
            ->component('Employees/AttendanceCorrectionQueue')
            ->has('requests.data', 1)
            ->where('requests.data.0.id', $reqA->id)
        );
    }

    public function test_manager_can_approve_attendance_correction_request()
    {
        $client = Client::factory()->create(['status' => 'active']);
        $branch = ClientBranch::factory()->create(['client_id' => $client->id]);
        $employee = Employee::factory()->create([
            'client_id' => $client->id,
            'branch_id' => $branch->id,
            'pan_number' => 'ABCDE3333C',
            'aadhaar_number' => '111122223333',
            'bank_account_number' => '100000000003',
        ]);

        $req = AttendanceCorrectionRequest::create([
            'employee_id' => $employee->id,
            'attendance_date' => '2026-08-03',
            'requested_punch_in_time' => '2026-08-03 09:00:00',
            'requested_punch_out_time' => '2026-08-03 17:00:00',
            'reason_category' => 'forgot_to_punch_in',
            'reason_details' => 'Forgot to punch in during morning shift',
            'status' => 'pending',
        ]);

        $manager = User::factory()->create([
            'role' => 'manager',
            'status' => 'active',
        ]);
        $manager->managedClients()->attach([$client->id]);

        $response = $this->actingAs($manager)->post(route('employees.attendance-corrections.approve', $req->id));

        $response->assertRedirect();
        $response->assertSessionHas('success');

        $req->refresh();
        $this->assertEquals('approved', $req->status);
        $this->assertEquals($manager->id, $req->reviewed_by);

        // Verify AttendanceRecord created
        $record = AttendanceRecord::where('employee_id', $employee->id)
            ->whereDate('attendance_date', '2026-08-03')
            ->first();

        $this->assertNotNull($record);
        $this->assertEquals('present', $record->status);
        $this->assertEquals(8.0, $record->hours_worked);
        $this->assertEquals('override', $record->source);
    }

    public function test_manager_can_reject_attendance_correction_request()
    {
        $client = Client::factory()->create(['status' => 'active']);
        $branch = ClientBranch::factory()->create(['client_id' => $client->id]);
        $employee = Employee::factory()->create([
            'client_id' => $client->id,
            'branch_id' => $branch->id,
            'pan_number' => 'ABCDE4444D',
            'aadhaar_number' => '111122223334',
            'bank_account_number' => '100000000004',
        ]);

        $req = AttendanceCorrectionRequest::create([
            'employee_id' => $employee->id,
            'attendance_date' => '2026-08-03',
            'requested_punch_in_time' => '2026-08-03 09:00:00',
            'requested_punch_out_time' => '2026-08-03 17:00:00',
            'reason_category' => 'forgot_to_punch_in',
            'reason_details' => 'Forgot to punch in during morning shift',
            'status' => 'pending',
        ]);

        $manager = User::factory()->create([
            'role' => 'manager',
            'status' => 'active',
        ]);
        $manager->managedClients()->attach([$client->id]);

        $response = $this->actingAs($manager)->post(route('employees.attendance-corrections.reject', $req->id), [
            'rejection_reason' => 'Mismatch with biometric entry logs'
        ]);

        $response->assertRedirect();
        $response->assertSessionHas('success');

        $req->refresh();
        $this->assertEquals('rejected', $req->status);
        $this->assertEquals('Mismatch with biometric entry logs', $req->rejection_reason);
    }
}
