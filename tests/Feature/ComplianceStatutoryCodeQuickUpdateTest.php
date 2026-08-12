<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\Client;
use App\Models\Employee;
use App\Models\PayrollRun;
use App\Models\PayrollRunItem;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;

class ComplianceStatutoryCodeQuickUpdateTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;
    protected Client $client;

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('local');

        $this->admin = User::factory()->create([
            'role' => 'admin',
            'status' => 'active',
            'must_change_password' => false,
        ]);

        $this->client = Client::factory()->create([
            'company_name' => 'Infosys Quick Setup Test',
            'client_code' => 'INF' . rand(100, 999),
            'pf_establishment_code' => null, // Initially missing!
            'esi_code_number' => null,       // Initially missing!
            'status' => 'active',
        ]);
    }

    public function test_quick_update_statutory_code_endpoint_updates_client_pf_and_esi_codes()
    {
        // 1. Update PF Establishment Code
        $pfResponse = $this->actingAs($this->admin)->postJson(route('compliance.client.update_statutory_code'), [
            'client_id' => $this->client->id,
            'pf_establishment_code' => 'MH/BAN/9998887/000',
        ]);

        $pfResponse->assertStatus(200)
            ->assertJson([
                'success' => true,
                'client' => [
                    'id' => $this->client->id,
                    'pf_establishment_code' => 'MH/BAN/9998887/000',
                ]
            ]);

        $this->assertEquals('MH/BAN/9998887/000', $this->client->fresh()->pf_establishment_code);

        // 2. Update ESI Code Number
        $esiResponse = $this->actingAs($this->admin)->postJson(route('compliance.client.update_statutory_code'), [
            'client_id' => $this->client->id,
            'esi_code_number' => '31000999990000101',
        ]);

        $esiResponse->assertStatus(200)
            ->assertJson([
                'success' => true,
                'client' => [
                    'id' => $this->client->id,
                    'esi_code_number' => '31000999990000101',
                ]
            ]);

        $this->assertEquals('31000999990000101', $this->client->fresh()->esi_code_number);
    }

    public function test_pf_ecr_preview_unblocks_immediately_after_quick_code_save()
    {
        $branch = \App\Models\ClientBranch::create([
            'client_id' => $this->client->id,
            'branch_name' => 'Main Branch',
            'branch_code' => 'HO01',
            'state' => 'Maharashtra',
        ]);

        $employee = Employee::factory()->create([
            'client_id' => $this->client->id,
            'branch_id' => $branch->id,
            'pf_applicable' => true,
            'uan_number' => '100123456789',
        ]);

        $run = PayrollRun::create([
            'client_id' => $this->client->id,
            'payroll_month' => '2026-08-01',
            'status' => 'draft',
        ]);

        PayrollRunItem::create([
            'payroll_run_id' => $run->id,
            'employee_id' => $employee->id,
            'attendance_source' => 'manual',
            'paid_days' => 30,
            'lop_days' => 0,
            'basic_pay' => 15000,
            'hra' => 3000,
            'conveyance' => 0,
            'da' => 0,
            'medical_allowance' => 0,
            'special_allowance' => 0,
            'other_additions' => 0,
            'gross_total' => 18000,
            'employee_pf' => 1800,
            'employee_esi' => 0,
            'professional_tax' => 200,
            'lwf_deduction' => 0,
            'lop_deduction' => 0,
            'tds_deduction' => 0,
            'loan_emi_deduction' => 0,
            'net_pay' => 16000,
            'employer_pf' => 1800,
            'employer_epf' => 550,
            'employer_eps' => 1250,
            'employer_esi' => 0,
            'employer_lwf' => 0,
            'is_excluded' => false,
        ]);

        $run->update(['status' => 'locked']);

        // 1. Preview initially blocked due to missing PF Establishment Code
        $initialPreview = $this->actingAs($this->admin)->postJson(route('compliance.pf_ecr.preview'), [
            'payroll_run_id' => $run->id,
        ]);

        $initialPreview->assertStatus(200)
            ->assertJson([
                'success' => false,
                'status' => 'blocked',
                'missing_pf_est_code' => true,
            ]);

        // 2. Set PF Establishment Code via quick-update endpoint
        $this->actingAs($this->admin)->postJson(route('compliance.client.update_statutory_code'), [
            'client_id' => $this->client->id,
            'pf_establishment_code' => 'MH/BAN/1234567/000',
        ])->assertStatus(200);

        // 3. Re-run preview -> now succeeds!
        $updatedPreview = $this->actingAs($this->admin)->postJson(route('compliance.pf_ecr.preview'), [
            'payroll_run_id' => $run->id,
        ]);

        $updatedPreview->assertStatus(200)
            ->assertJson([
                'success' => true,
                'status' => 'validated',
            ]);
    }
}
