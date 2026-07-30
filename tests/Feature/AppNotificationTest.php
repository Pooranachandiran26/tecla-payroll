<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\Employee;
use App\Models\Client;
use App\Models\AppNotification;
use App\Services\NotificationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Log;

class AppNotificationTest extends TestCase
{
    use RefreshDatabase;

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    private function makeAdmin(array $overrides = []): User
    {
        return User::factory()->create(array_merge(['role' => 'admin', 'status' => 'active'], $overrides));
    }

    private function makeManager(array $overrides = []): User
    {
        return User::factory()->create(array_merge(['role' => 'manager', 'status' => 'active'], $overrides));
    }

    private function makeEmployee(array $overrides = []): User
    {
        return User::factory()->create(array_merge(['role' => 'employee', 'status' => 'active'], $overrides));
    }

    private function makeClient(array $overrides = []): User
    {
        return User::factory()->create(array_merge(['role' => 'client', 'status' => 'active'], $overrides));
    }

    // -------------------------------------------------------------------------
    // 1. Schema / Model: data column exists and is castable
    // -------------------------------------------------------------------------

    /** @test */
    public function it_creates_a_notification_with_all_columns_including_data()
    {
        $admin = $this->makeAdmin();

        AppNotification::create([
            'user_id' => $admin->id,
            'type'    => 'salary_revision',
            'title'   => 'Test Title',
            'body'    => 'Test body.',
            'url'     => '/payroll/revisions',
            'data'    => ['employee_id' => 42],
        ]);

        $this->assertDatabaseHas('app_notifications', [
            'user_id' => $admin->id,
            'type'    => 'salary_revision',
            'title'   => 'Test Title',
        ]);

        $notif = AppNotification::where('user_id', $admin->id)->first();
        $this->assertIsArray($notif->data);
        $this->assertEquals(42, $notif->data['employee_id']);
        $this->assertNull($notif->read_at);
    }

    /** @test */
    public function it_creates_a_notification_without_data_column()
    {
        $admin = $this->makeAdmin();

        NotificationService::send($admin->id, 'system', 'Hello', 'No data payload.');

        $notif = AppNotification::where('user_id', $admin->id)->first();
        $this->assertNotNull($notif);
        $this->assertNull($notif->data);
    }

    // -------------------------------------------------------------------------
    // 2. NotificationService::send — isolation check
    // -------------------------------------------------------------------------

    /** @test */
    public function notification_write_failure_does_not_propagate_exception()
    {
        // Simulate a DB failure by passing an invalid user_id (FK violation)
        // NotificationService must catch it and return silently.
        $exceptionThrown = false;

        try {
            NotificationService::send(
                userId: 999999, // Non-existent user — will cause FK violation
                type: 'salary_revision',
                title: 'Should not crash caller',
                body: 'Isolation test.',
            );
        } catch (\Throwable $e) {
            $exceptionThrown = true;
        }

        $this->assertFalse($exceptionThrown, 'NotificationService::send must never throw — it must catch and log silently.');
        $this->assertDatabaseCount('app_notifications', 0);
    }

    // -------------------------------------------------------------------------
    // 3. Fan-out: sendToAdmins creates one row per active admin
    // -------------------------------------------------------------------------

    /** @test */
    public function send_to_admins_creates_one_notification_per_active_admin()
    {
        $admin1 = $this->makeAdmin();
        $admin2 = $this->makeAdmin();
        // Inactive admin — should be skipped
        $inactiveAdmin = $this->makeAdmin(['status' => 'suspended']);
        // Manager — should NOT receive via sendToAdmins
        $manager = $this->makeManager();

        NotificationService::sendToAdmins(
            type: 'salary_revision',
            title: 'Pending Approval',
            body: 'An employee submitted a salary revision.',
            url: '/payroll/revisions',
            data: ['employee_id' => 1]
        );

        // Each active admin gets exactly one row
        $this->assertEquals(1, AppNotification::where('user_id', $admin1->id)->count());
        $this->assertEquals(1, AppNotification::where('user_id', $admin2->id)->count());

        // Inactive admin gets nothing
        $this->assertEquals(0, AppNotification::where('user_id', $inactiveAdmin->id)->count());

        // Manager gets nothing (sendToAdmins is admin-only)
        $this->assertEquals(0, AppNotification::where('user_id', $manager->id)->count());

        // Total: exactly 2 rows
        $this->assertEquals(2, AppNotification::count());
    }

    /** @test */
    public function send_to_admins_and_managers_fans_out_to_both_roles()
    {
        $admin   = $this->makeAdmin();
        $manager = $this->makeManager();
        $emp     = $this->makeEmployee();   // Must NOT receive
        $client  = $this->makeClient();     // Must NOT receive

        NotificationService::sendToAdminsAndManagers(
            type: 'leave_request',
            title: 'Leave Pending',
            body: 'An employee submitted a leave request.',
        );

        $this->assertEquals(1, AppNotification::where('user_id', $admin->id)->count());
        $this->assertEquals(1, AppNotification::where('user_id', $manager->id)->count());
        $this->assertEquals(0, AppNotification::where('user_id', $emp->id)->count());
        $this->assertEquals(0, AppNotification::where('user_id', $client->id)->count());
        $this->assertEquals(2, AppNotification::count());
    }

    // -------------------------------------------------------------------------
    // 4. Scope boundary: Employees and Clients get zero notifications (v1)
    // -------------------------------------------------------------------------

    /** @test */
    public function employee_and_client_users_never_receive_in_app_notifications_in_v1()
    {
        $emp    = $this->makeEmployee();
        $client = $this->makeClient();

        // Even if someone mistakenly calls send() for these roles, the data layer allows it —
        // but the SERVICE layer's sendToAdmins/sendToAdminsAndManagers filters ensure they
        // are never targeted. This test confirms the filter logic is correct.
        NotificationService::sendToAdmins(type: 'system', title: 'Admin note', body: 'Admins only.');
        NotificationService::sendToAdminsAndManagers(type: 'leave_request', title: 'Leave', body: 'Body');

        $this->assertEquals(0, AppNotification::where('user_id', $emp->id)->count());
        $this->assertEquals(0, AppNotification::where('user_id', $client->id)->count());
    }

    // -------------------------------------------------------------------------
    // 5. markRead / markAllRead
    // -------------------------------------------------------------------------

    /** @test */
    public function mark_read_updates_read_at_for_correct_owner_only()
    {
        $admin1 = $this->makeAdmin();
        $admin2 = $this->makeAdmin();

        $n1 = AppNotification::create(['user_id' => $admin1->id, 'type' => 'system', 'title' => 'A', 'body' => 'B']);
        $n2 = AppNotification::create(['user_id' => $admin2->id, 'type' => 'system', 'title' => 'C', 'body' => 'D']);

        // admin1 marks their own notification
        $result = NotificationService::markRead($n1->id, $admin1->id);
        $this->assertTrue($result);
        $this->assertNotNull($n1->fresh()->read_at);

        // admin1 tries to mark admin2's notification — must fail
        $result2 = NotificationService::markRead($n2->id, $admin1->id);
        $this->assertFalse($result2);
        $this->assertNull($n2->fresh()->read_at);
    }

    /** @test */
    public function mark_all_read_only_clears_the_requesting_users_notifications()
    {
        $admin1 = $this->makeAdmin();
        $admin2 = $this->makeAdmin();

        AppNotification::create(['user_id' => $admin1->id, 'type' => 'system', 'title' => 'A', 'body' => 'B']);
        AppNotification::create(['user_id' => $admin1->id, 'type' => 'system', 'title' => 'C', 'body' => 'D']);
        AppNotification::create(['user_id' => $admin2->id, 'type' => 'system', 'title' => 'E', 'body' => 'F']);

        NotificationService::markAllRead($admin1->id);

        $this->assertEquals(0, AppNotification::where('user_id', $admin1->id)->whereNull('read_at')->count());
        $this->assertEquals(1, AppNotification::where('user_id', $admin2->id)->whereNull('read_at')->count());
    }

    // -------------------------------------------------------------------------
    // 6. notificationCount shared prop: correct per role
    // -------------------------------------------------------------------------

    /** @test */
    public function notification_count_shared_prop_returns_unread_count_for_admin()
    {
        $admin = $this->makeAdmin();
        AppNotification::create(['user_id' => $admin->id, 'type' => 'system', 'title' => 'T', 'body' => 'B']);
        AppNotification::create(['user_id' => $admin->id, 'type' => 'system', 'title' => 'T2', 'body' => 'B2']);

        $response = $this->actingAs($admin)->get('/dashboard');
        $response->assertStatus(200);

        $props = $response->viewData('page')['props'] ?? [];
        $this->assertEquals(2, $props['notificationCount'] ?? null);
    }

    /** @test */
    public function notification_count_is_zero_for_employee_role()
    {
        $clientRecord = Client::factory()->create(['status' => 'active']);
        $branchRecord = \App\Models\ClientBranch::factory()->create(['client_id' => $clientRecord->id]);
        $employeeRecord = Employee::factory()->create(['client_id' => $clientRecord->id, 'branch_id' => $branchRecord->id]);
        $emp = $this->makeEmployee(['employee_id' => $employeeRecord->id]);

        $response = $this->actingAs($emp)->get('/employee/dashboard');
        $response->assertStatus(200);

        $props = $response->viewData('page')['props'] ?? [];
        $this->assertEquals(0, $props['notificationCount'] ?? -1);
    }

    /** @test */
    public function notification_count_is_zero_for_client_role()
    {
        $clientRecord = Client::factory()->create(['status' => 'active']);
        $clientUser = $this->makeClient(['client_id' => $clientRecord->id]);
        $clientUser->managedClients()->sync([$clientRecord->id]);

        $response = $this->actingAs($clientUser)->get('/client/dashboard');
        $response->assertStatus(200);

        $props = $response->viewData('page')['props'] ?? [];
        $this->assertEquals(0, $props['notificationCount'] ?? -1);
    }

    // -------------------------------------------------------------------------
    // 7. HTTP Endpoints
    // -------------------------------------------------------------------------

    /** @test */
    public function notifications_index_is_accessible_to_admin()
    {
        $admin = $this->makeAdmin();
        $response = $this->actingAs($admin)->get('/notifications');
        $response->assertStatus(200);
    }

    /** @test */
    public function mark_read_endpoint_returns_success_json()
    {
        $admin = $this->makeAdmin();
        $n = AppNotification::create(['user_id' => $admin->id, 'type' => 'system', 'title' => 'T', 'body' => 'B']);

        $response = $this->actingAs($admin)
            ->postJson("/notifications/{$n->id}/read");

        $response->assertStatus(200)->assertJson(['success' => true]);
        $this->assertNotNull($n->fresh()->read_at);
    }

    /** @test */
    public function read_all_endpoint_marks_all_as_read_and_redirects()
    {
        $admin = $this->makeAdmin();
        AppNotification::create(['user_id' => $admin->id, 'type' => 'system', 'title' => 'T', 'body' => 'B']);
        AppNotification::create(['user_id' => $admin->id, 'type' => 'system', 'title' => 'T2', 'body' => 'B2']);

        $response = $this->actingAs($admin)->post('/notifications/read-all');
        $response->assertRedirect();

        $this->assertEquals(0, AppNotification::where('user_id', $admin->id)->whereNull('read_at')->count());
    }
}
