<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use App\Models\User;
use App\Models\Client;
use App\Models\ClientBranch;
use App\Models\ClientContact;
use App\Models\Employee;
use App\Models\EmployeeQuery;
use App\Events\EmployeeQuerySubmitted;
use App\Mail\ClientQueryReceivedMail;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Mail;

class EmployeeQueryTest extends TestCase
{
    use RefreshDatabase;

    protected $admin;
    protected $managerAssigned;
    protected $managerUnassigned;
    protected $employeeA;
    protected $employeeB;
    protected $clientWithContact;
    protected $clientWithoutContact;

    protected function setUp(): void
    {
        parent::setUp();

        // 1. Create Admin
        $this->admin = User::factory()->create(['role' => 'admin', 'status' => 'active', 'must_change_password' => false]);

        // 2. Create Clients & Branches
        $this->clientWithContact = Client::factory()->create([
            'company_name' => 'Mahindra With Contact Corp',
            'status' => 'active',
        ]);

        $branchA = ClientBranch::create([
            'client_id' => $this->clientWithContact->id,
            'branch_name' => 'Branch A',
            'state' => 'Maharashtra',
            'gstin' => '27ABCDE1234F1Z5',
        ]);

        ClientContact::create([
            'client_id' => $this->clientWithContact->id,
            'full_name' => 'HR Primary Contact',
            'email' => 'hr.primary@mahindra.com',
            'contact_type' => 'primary',
            'phone' => '9876543210',
        ]);

        $this->clientWithoutContact = Client::factory()->create([
            'company_name' => 'Mahindra Corp (No Contact)',
            'status' => 'active',
        ]);

        $branchB = ClientBranch::create([
            'client_id' => $this->clientWithoutContact->id,
            'branch_name' => 'Branch B',
            'state' => 'Maharashtra',
            'gstin' => '27ABCDE1234F1Z6',
        ]);

        // 3. Create Managers
        $this->managerAssigned = User::factory()->create(['role' => 'manager', 'status' => 'active', 'must_change_password' => false]);
        $this->clientWithContact->update(['account_manager_id' => $this->managerAssigned->id]);

        $this->managerUnassigned = User::factory()->create(['role' => 'manager', 'status' => 'active', 'must_change_password' => false]);

        // 4. Create Employees & Linked User accounts
        $this->employeeA = Employee::factory()->create([
            'client_id' => $this->clientWithContact->id,
            'branch_id' => $branchA->id,
            'full_name' => 'John Doe',
            'employee_code' => 'EMP-001',
            'pan_number' => 'ABCDE1234F',
            'aadhaar_number' => '123456789012',
            'bank_account_number' => '111122223333',
        ]);
        $userEmpA = User::factory()->create(['role' => 'employee', 'employee_id' => $this->employeeA->id, 'status' => 'active', 'must_change_password' => false]);
        $this->employeeA->setRelation('user', $userEmpA);

        $this->employeeB = Employee::factory()->create([
            'client_id' => $this->clientWithoutContact->id,
            'branch_id' => $branchB->id,
            'full_name' => 'Jane Smith',
            'employee_code' => 'EMP-002',
            'pan_number' => 'FGHIJ5678K',
            'aadhaar_number' => '987654321098',
            'bank_account_number' => '444455556666',
        ]);
        $userEmpB = User::factory()->create(['role' => 'employee', 'employee_id' => $this->employeeB->id, 'status' => 'active', 'must_change_password' => false]);
        $this->employeeB->setRelation('user', $userEmpB);
    }

    public function test_1_employee_submits_query_dispatches_watcher_event_and_queues_client_email()
    {
        Event::fake([EmployeeQuerySubmitted::class]);
        Mail::fake();

        $user = User::where('employee_id', $this->employeeA->id)->first();

        $response = $this->actingAs($user)->post(route('employee.contact.store'), [
            'subject' => 'PF Deduction Query',
            'category' => 'payroll',
            'message' => 'Please explain why my PF deduction was ₹1,800 this month.',
        ]);

        $response->assertRedirect();
        $response->assertSessionHas('success');

        $this->assertDatabaseHas('employee_queries', [
            'employee_id' => $this->employeeA->id,
            'client_id' => $this->clientWithContact->id,
            'subject' => 'PF Deduction Query',
            'category' => 'payroll',
            'status' => 'pending',
        ]);

        // Assert watcher event dispatched
        Event::assertDispatched(EmployeeQuerySubmitted::class, function ($event) {
            return $event->watcherCategory() === 'employee' &&
                   str_contains($event->watcherSubject(), 'PF Deduction Query');
        });

        // Assert client primary contact email queued
        Mail::assertQueued(ClientQueryReceivedMail::class, function ($mail) {
            return $mail->hasTo('hr.primary@mahindra.com') &&
                   $mail->queryModel->subject === 'PF Deduction Query';
        });
    }

    public function test_2_employee_submits_query_with_missing_primary_contact_skips_client_email_gracefully()
    {
        Event::fake([EmployeeQuerySubmitted::class]);
        Mail::fake();

        $user = User::where('employee_id', $this->employeeB->id)->first();

        $response = $this->actingAs($user)->post(route('employee.contact.store'), [
            'subject' => 'Attendance Dispute',
            'category' => 'attendance',
            'message' => 'My clock-in was recorded 10 minutes late on July 20.',
        ]);

        $response->assertRedirect();
        $response->assertSessionHas('success');

        $this->assertDatabaseHas('employee_queries', [
            'employee_id' => $this->employeeB->id,
            'client_id' => $this->clientWithoutContact->id,
            'subject' => 'Attendance Dispute',
            'category' => 'attendance',
            'status' => 'pending',
        ]);

        // Assert watcher event dispatched cleanly
        Event::assertDispatched(EmployeeQuerySubmitted::class);

        // Assert no client email was queued (skipped gracefully without error)
        Mail::assertNothingQueued();
    }

    public function test_3_strict_manager_scoping_zero_default()
    {
        // Create query under clientWithContact (assigned to managerAssigned)
        $queryA = EmployeeQuery::create([
            'employee_id' => $this->employeeA->id,
            'client_id' => $this->clientWithContact->id,
            'subject' => 'Query for Client A',
            'category' => 'payroll',
            'message' => 'Message for Client A',
            'status' => 'pending',
        ]);

        // Create query under clientWithoutContact (unassigned)
        $queryB = EmployeeQuery::create([
            'employee_id' => $this->employeeB->id,
            'client_id' => $this->clientWithoutContact->id,
            'subject' => 'Query for Client B',
            'category' => 'attendance',
            'message' => 'Message for Client B',
            'status' => 'pending',
        ]);

        // 1. Unassigned Manager sees ZERO queries
        $responseUnassigned = $this->actingAs($this->managerUnassigned)->get(route('admin.employee-queries.index'));
        $responseUnassigned->assertOk();
        $responseUnassigned->assertInertia(fn ($page) => $page->component('Admin/EmployeeQueries')->has('queries', 0));

        // 2. Assigned Manager sees only Client A query
        $responseAssigned = $this->actingAs($this->managerAssigned)->get(route('admin.employee-queries.index'));
        $responseAssigned->assertOk();
        $responseAssigned->assertInertia(fn ($page) => $page
            ->component('Admin/EmployeeQueries')
            ->has('queries', 1)
            ->where('queries.0.id', $queryA->id)
        );

        // 3. Assigned Manager attempts to respond to queryB (unassigned client) -> 403 Forbidden
        $responseForbidden = $this->actingAs($this->managerAssigned)->post(route('admin.employee-queries.respond', $queryB->id), [
            'admin_response' => 'Trying unauthorized response',
        ]);
        $responseForbidden->assertStatus(403);
    }

    public function test_4_employee_can_only_view_own_queries()
    {
        $queryA = EmployeeQuery::create([
            'employee_id' => $this->employeeA->id,
            'client_id' => $this->clientWithContact->id,
            'subject' => 'Employee A Query',
            'category' => 'payroll',
            'message' => 'Message A',
            'status' => 'pending',
        ]);

        $userA = User::where('employee_id', $this->employeeA->id)->first();
        $userB = User::where('employee_id', $this->employeeB->id)->first();

        // Employee A visits contact page -> sees only queryA
        $responseEmpA = $this->actingAs($userA)->get(route('employee.contact'));
        $responseEmpA->assertOk();
        $responseEmpA->assertInertia(fn ($page) => $page
            ->component('EmployeePortal/ContactSupport')
            ->has('queries', 1)
            ->where('queries.0.id', $queryA->id)
        );

        // Employee B visits contact page -> sees 0 queries
        $responseEmpB = $this->actingAs($userB)->get(route('employee.contact'));
        $responseEmpB->assertOk();
        $responseEmpB->assertInertia(fn ($page) => $page
            ->component('EmployeePortal/ContactSupport')
            ->has('queries', 0)
        );
    }

    public function test_5_admin_views_all_queries_and_can_respond()
    {
        $queryA = EmployeeQuery::create([
            'employee_id' => $this->employeeA->id,
            'client_id' => $this->clientWithContact->id,
            'subject' => 'Query A',
            'category' => 'payroll',
            'message' => 'Message A',
            'status' => 'pending',
        ]);

        $queryB = EmployeeQuery::create([
            'employee_id' => $this->employeeB->id,
            'client_id' => $this->clientWithoutContact->id,
            'subject' => 'Query B',
            'category' => 'leave',
            'message' => 'Message B',
            'status' => 'pending',
        ]);

        // Admin sees all 2 queries
        $responseAdmin = $this->actingAs($this->admin)->get(route('admin.employee-queries.index'));
        $responseAdmin->assertOk();
        $responseAdmin->assertInertia(fn ($page) => $page
            ->component('Admin/EmployeeQueries')
            ->has('queries', 2)
        );

        // Admin responds to queryA
        $responseRespond = $this->actingAs($this->admin)->post(route('admin.employee-queries.respond', $queryA->id), [
            'admin_response' => 'Your PF deduction is correct as per standard 12% rules.',
        ]);

        $responseRespond->assertRedirect();
        $responseRespond->assertSessionHas('success');

        $this->assertDatabaseHas('employee_queries', [
            'id' => $queryA->id,
            'status' => 'resolved',
            'admin_response' => 'Your PF deduction is correct as per standard 12% rules.',
            'resolved_by' => $this->admin->id,
        ]);
    }
}
