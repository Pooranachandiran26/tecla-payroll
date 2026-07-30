<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use Tests\TestCase;
use App\Models\User;
use App\Models\Employee;
use App\Models\Client;
use App\Models\ClientBranch;
use Illuminate\Support\Facades\DB;


class UserStatusEnforcementTest extends TestCase
{
    use RefreshDatabase;

    public function test_suspended_user_mid_session_is_forced_out()
    {
        config(['session.driver' => 'database']);
        
        // 1. Setup active employee
        $client = Client::factory()->create();
        $branch = ClientBranch::factory()->create(['client_id' => $client->id]);
        $employee = Employee::factory()->create([
            'client_id' => $client->id,
            'branch_id' => $branch->id,
            'status' => 'active'
        ]);
        
        $user = User::factory()->create([
            'employee_id' => $employee->id,
            'role' => 'employee',
            'status' => 'active',
        ]);

        // Authenticate
        $this->actingAs($user);

        // Access dashboard to initialize session
        $response = $this->get('/employee/dashboard');
        $response->assertStatus(200);
        
        // Capture original session ID
        $originalSessionId = session()->getId();
        
        // Laravel will write the session to the database automatically when using the database driver.

        // 2. Suspend user mid-session
        $user->update(['status' => 'suspended']);

        // 3. Attempt action using the exact same session cookie
        $response = $this->withCookie(config('session.cookie'), $originalSessionId)
                         ->post('/employee/attendance/punch-in', []);

        // 4. Assert rejected and redirected
        $response->assertRedirect('/login');

        // 5. Assert validation error
        $response->assertSessionHasErrors(['email' => 'Account is locked. Please contact support.']);

        // 6. Assert original session no longer exists in DB
        $sessionExists = DB::table('sessions')->where('id', $originalSessionId)->exists();
        $this->assertFalse($sessionExists, "The original session row should have been deleted from the database.");
    }
}
