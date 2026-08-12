<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\Client;
use App\Models\Setting;
use Illuminate\Foundation\Testing\RefreshDatabase;

class ClientPortalSecurityTest extends TestCase
{
    use RefreshDatabase;

    protected Client $client;
    protected User $clientUser;
    protected User $adminUser;
    protected User $managerUser;

    protected function setUp(): void
    {
        parent::setUp();

        // Create client
        $this->client = Client::create([
            'company_name' => 'Secure Corp',
            'client_code' => 'SEC001',
            'contract_type' => 'agency',
            'contract_start_date' => now()->subMonth()->toDateString(),
            'billing_model' => 'fixed_per_month',
            'fixed_fee_amount' => 50000,
            'primary_poc_name' => 'Alice Admin',
            'primary_poc_email' => 'alice@securecorp.com',
            'primary_poc_phone' => '9876543210',
            'company_type' => 'pvt_ltd',
            'registered_address_line_1' => '100 Tech Park',
            'registered_city' => 'Bengaluru',
            'registered_state' => 'Karnataka',
            'registered_pin' => '560001',
            'portal_require_2fa' => false,
            'portal_session_timeout' => 15,
        ]);

        // Create client user
        $this->clientUser = User::create([
            'name' => 'Alice Client',
            'email' => 'client@securecorp.com',
            'password' => bcrypt('password123'),
            'role' => 'client',
            'client_id' => $this->client->id,
            'status' => 'active',
        ]);

        // Create admin user
        $this->adminUser = User::create([
            'name' => 'Admin User',
            'email' => 'admin@tecla.com',
            'password' => bcrypt('password123'),
            'role' => 'admin',
            'status' => 'active',
        ]);

        // Create manager user
        $this->managerUser = User::create([
            'name' => 'Manager User',
            'email' => 'manager@tecla.com',
            'password' => bcrypt('password123'),
            'role' => 'manager',
            'status' => 'active',
        ]);

        // Seed global settings
        Setting::updateOrCreate(
            ['group' => 'auth_security', 'key' => 'otp_enabled'],
            ['type' => 'boolean', 'value' => true]
        );
    }

    /**
     * TEST 1: Real test: client with IP whitelist set, login attempt from a NON-whitelisted IP -> confirm 403.
     */
    public function test_client_with_ip_whitelist_blocks_non_whitelisted_ip(): void
    {
        $this->client->update(['portal_ip_whitelist' => '192.168.1.100, 10.0.0.0/24']);

        $response = $this->actingAs($this->clientUser)
            ->withServerVariables(['REMOTE_ADDR' => '203.0.113.5'])
            ->get('/client/dashboard');

        $response->assertStatus(403);
    }

    /**
     * TEST 2: Real test: client with IP whitelist set, login from a WHITELISTED IP (exact IP and CIDR match) -> confirm success.
     */
    public function test_client_with_ip_whitelist_allows_whitelisted_and_cidr_matched_ip(): void
    {
        $this->client->update(['portal_ip_whitelist' => '192.168.1.100, 10.0.0.0/24']);

        // Test exact IP match
        $responseExact = $this->actingAs($this->clientUser)
            ->withServerVariables(['REMOTE_ADDR' => '192.168.1.100'])
            ->get('/client/dashboard');

        $responseExact->assertStatus(200);

        // Test CIDR subnet match
        $responseCidr = $this->actingAs($this->clientUser)
            ->withServerVariables(['REMOTE_ADDR' => '10.0.0.45'])
            ->get('/client/dashboard');

        $responseCidr->assertStatus(200);
    }

    /**
     * TEST 3: Real test: client with NO whitelist configured -> confirm zero change, login works from any IP (regression safety).
     */
    public function test_client_with_no_ip_whitelist_allows_any_ip(): void
    {
        $this->client->update(['portal_ip_whitelist' => null]);

        $response = $this->actingAs($this->clientUser)
            ->withServerVariables(['REMOTE_ADDR' => '198.51.100.77'])
            ->get('/client/dashboard');

        $response->assertStatus(200);
    }

    /**
     * TEST 4: Real test: client with portal_require_2fa=true, global OTP OFF -> confirm 2FA still required (client-specific wins).
     */
    public function test_client_2fa_required_overrides_global_otp_off(): void
    {
        Setting::updateOrCreate(
            ['group' => 'auth_security', 'key' => 'otp_enabled'],
            ['type' => 'boolean', 'value' => false]
        );

        $this->client->update(['portal_require_2fa' => true]);

        $response = $this->post('/login', [
            'email' => $this->clientUser->email,
            'password' => 'password123',
        ]);

        $response->assertRedirect('/login/verify-otp');
        $this->assertEquals($this->clientUser->id, session('login_user_id'));
    }

    /**
     * TEST 5: Real test: client with portal_require_2fa=false, global OTP OFF -> confirm no 2FA required (unaffected).
     */
    public function test_client_2fa_disabled_with_global_otp_off_allows_direct_login(): void
    {
        Setting::updateOrCreate(
            ['group' => 'auth_security', 'key' => 'otp_enabled'],
            ['type' => 'boolean', 'value' => false]
        );

        $this->client->update(['portal_require_2fa' => false]);

        $response = $this->post('/login', [
            'email' => $this->clientUser->email,
            'password' => 'password123',
        ]);

        $response->assertRedirect('/');
        $this->assertAuthenticatedAs($this->clientUser);
    }

    /**
     * TEST 6: Real test: session timeout boundary cases (14 mins vs 16 mins for 15-min limit).
     */
    public function test_session_timeout_negative_boundary_case_within_limit(): void
    {
        $this->client->update(['portal_session_timeout' => 15]);

        // Last activity 14 minutes ago (within 15-minute timeout limit)
        session(['client_portal_last_activity' => now()->subMinutes(14)->timestamp]);

        $response = $this->actingAs($this->clientUser)
            ->get('/client/dashboard');

        $response->assertStatus(200);
        $this->assertAuthenticatedAs($this->clientUser);
    }

    public function test_session_timeout_positive_boundary_case_exceeds_limit(): void
    {
        $this->client->update(['portal_session_timeout' => 15]);

        // Last activity 16 minutes ago (exceeds 15-minute timeout limit)
        session(['client_portal_last_activity' => now()->subMinutes(16)->timestamp]);

        $response = $this->actingAs($this->clientUser)
            ->get('/client/dashboard');

        $response->assertRedirect('/login');
        $this->assertGuest();
    }

    /**
     * TEST 7: Full regression test: confirm zero impact on Admin/Manager login flows and routes.
     */
    public function test_admin_and_manager_login_flows_completely_unaffected(): void
    {
        // Admin route access with arbitrary IP
        $adminResponse = $this->actingAs($this->adminUser)
            ->withServerVariables(['REMOTE_ADDR' => '203.0.113.99'])
            ->get('/dashboard');

        $adminResponse->assertStatus(200);

        // Manager route access with arbitrary IP
        $managerResponse = $this->actingAs($this->managerUser)
            ->withServerVariables(['REMOTE_ADDR' => '198.51.100.88'])
            ->get('/dashboard');

        $managerResponse->assertStatus(200);
    }
}
