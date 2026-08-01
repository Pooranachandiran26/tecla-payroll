<?php

namespace Tests\Feature;

use App\Models\Client;
use App\Models\PayrollRun;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ClientPayslipTemplateCheckTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;
    protected User $manager;
    protected User $unassignedManager;
    protected Client $client1;
    protected Client $client2;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::factory()->create(['role' => 'admin', 'status' => 'active']);
        $this->manager = User::factory()->create(['role' => 'manager', 'status' => 'active']);
        $this->unassignedManager = User::factory()->create(['role' => 'manager', 'status' => 'active']);

        $this->client1 = Client::factory()->create([
            'company_name' => 'Acme Corp Client 1',
            'payslip_template' => 'standard',
            'status' => 'active',
        ]);

        $this->client2 = Client::factory()->create([
            'company_name' => 'Stark Corp Client 2',
            'payslip_template' => 'corporate',
            'status' => 'active',
        ]);

        // Assign manager to client1 only
        $this->manager->managedClients()->attach($this->client1->id);
    }

    public function test_1_index_payslips_redirects_to_customizer_when_client_has_no_template()
    {
        $noTplClient = Client::factory()->create([
            'company_name' => 'No Tpl Client',
            'payslip_template' => '',
            'status' => 'active',
        ]);

        $response = $this->actingAs($this->admin)->get(route('payroll.payslips', [
            'client_id' => $noTplClient->id,
        ]));

        $response->assertRedirect(route('admin.payslip-templates', ['client_id' => $noTplClient->id]));
        $response->assertSessionHas('warning');
    }

    public function test_2_manager_cannot_view_or_configure_unassigned_client_template()
    {
        // Unassigned manager accessing client2 template page -> 403 Forbidden
        $response = $this->actingAs($this->unassignedManager)->get(route('admin.payslip-templates', [
            'client_id' => $this->client2->id,
        ]));

        $response->assertStatus(403);
    }

    public function test_3_manager_cannot_update_unassigned_client_template()
    {
        // Unassigned manager updating client2 template -> 403 Forbidden
        $response = $this->actingAs($this->unassignedManager)->post(route('admin.payslip-templates.update', $this->client2->id), [
            'payslip_template' => 'modern_dark',
            'payslip_visible_sections' => ['show_bank_details' => true],
        ]);

        $response->assertStatus(403);
    }

    public function test_4_assigned_manager_can_configure_and_update_assigned_client_template()
    {
        $response = $this->actingAs($this->manager)->get(route('admin.payslip-templates', [
            'client_id' => $this->client1->id,
        ]));

        $response->assertStatus(200);

        $updateResponse = $this->actingAs($this->manager)->post(route('admin.payslip-templates.update', $this->client1->id), [
            'payslip_template' => 'elegant',
            'payslip_visible_sections' => ['show_bank_details' => true],
        ]);

        $updateResponse->assertSessionHasNoErrors();
        $this->assertEquals('elegant', $this->client1->fresh()->payslip_template);
    }
}
