<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AccountProfileTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::factory()->create([
            'name' => 'Admin User',
            'email' => 'admin.profile@test.com',
            'password' => Hash::make('OldPassword123'),
            'role' => 'admin',
            'status' => 'active',
        ]);
    }

    public function test_1_profile_page_renders_successfully()
    {
        $res = $this->actingAs($this->user)->get('/account/profile');
        $res->assertStatus(200);
    }

    public function test_2_profile_information_update()
    {
        $res = $this->actingAs($this->user)->put('/account/profile', [
            'name' => 'Updated Admin Name',
            'email' => 'updated.admin@test.com',
        ]);

        $res->assertRedirect();
        $this->assertDatabaseHas('users', [
            'id' => $this->user->id,
            'name' => 'Updated Admin Name',
            'email' => 'updated.admin@test.com',
        ]);
    }

    public function test_3_password_update_success()
    {
        $res = $this->actingAs($this->user)->post('/account/change-password', [
            'current_password' => 'OldPassword123',
            'password' => 'NewPassword456',
            'password_confirmation' => 'NewPassword456',
        ]);

        $res->assertRedirect();
        $this->user->refresh();
        $this->assertTrue(Hash::check('NewPassword456', $this->user->password));
    }

    public function test_4_password_update_rejects_invalid_current_password()
    {
        $res = $this->actingAs($this->user)->post('/account/change-password', [
            'current_password' => 'WrongPassword',
            'password' => 'NewPassword456',
            'password_confirmation' => 'NewPassword456',
        ]);

        $res->assertSessionHasErrors('current_password');
    }
}
