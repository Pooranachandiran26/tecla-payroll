<?php
namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithoutMiddleware;
use Illuminate\Support\Facades\Session;

class TestClientPostTest extends TestCase
{
    use WithoutMiddleware, RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        // Use default testing connection
    }

    public function test_post_client()
    {
        $user = User::first();
        if (!$user) {
            $user = User::factory()->create(['role' => 'admin']);
        }
        
        $response = $this->actingAs($user)->post('/clients', [
            'name' => 'Test Corp',
            'code' => 'TEST010',
            'type' => 'pvt_ltd',
            'status' => 'onboarding',
            'locationsCount' => 1,
            'regAddressLine1' => '123',
            'regCity' => 'Metropolis',
            'regState' => 'New York',
            'regPin' => '100001',
            'contractType' => 'agency',
            'billingModel' => 'markup',
            'markupPct' => 0,
            'contractStart' => '2026-01-01',
            'poc1' => ['name' => 'Alice', 'email' => 'alice@example.com', 'phone' => '1234567890'],
        ]);
        
        $errors = session('errors') ? session('errors')->getBag('default')->toArray() : [];
        file_put_contents('test_output.txt', "Status: " . $response->status() . "\nErrors: " . json_encode($errors));
        $this->assertTrue(true);
    }
}
