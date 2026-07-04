<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use Tests\TestCase;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Config;

class SessionTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        // Force database driver to write to sessions table
        Config::set('session.driver', 'database');
    }

    public function test_admin_can_revoke_session()
    {
        $this->seed();
        $admin = User::where('email', 'admin@tecla.in')->first();
        
        // Log in to create a session record
        $this->post('/login', [
            'email' => 'admin@tecla.in',
            'password' => 'password'
        ]);

        DB::table('otp_codes')
            ->where('user_id', $admin->id)
            ->where('purpose', 'login')
            ->update(['code_hash' => \Illuminate\Support\Facades\Hash::make('123456')]);
        
        $otp = '123456';

        $this->withSession(['login_user_id' => $admin->id])
             ->post('/login/verify-otp', ['code' => $otp]);
        
        // Save the active session manually as HTTP tests sometimes rebuild the session mid-request
        $sessionId = session()->getId();
        DB::table('sessions')->insert([
            'id' => $sessionId,
            'user_id' => $admin->id,
            'ip_address' => '127.0.0.1',
            'user_agent' => 'Test',
            'payload' => '',
            'last_activity' => time(),
        ]);

        $this->assertDatabaseHas('sessions', ['id' => $sessionId, 'user_id' => $admin->id]);

        // Revoke the session via admin endpoint
        $this->actingAs($admin)->delete("/admin/sessions/{$sessionId}")
             ->assertStatus(302);
        
        // Confirm it was deleted
        $this->assertDatabaseMissing('sessions', ['id' => $sessionId]);
    }
}
