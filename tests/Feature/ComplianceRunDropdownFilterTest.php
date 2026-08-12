<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\Client;
use App\Models\PayrollRun;
use App\Models\PfEcrBatch;
use App\Models\EsiMonthlyBatch;
use App\Models\PtChallanBatch;
use App\Models\Gstr1Batch;
use App\Models\Invoice;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;

class ComplianceRunDropdownFilterTest extends TestCase
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
            'company_name' => 'Compliance Test Corp ' . uniqid(),
            'client_code' => 'CTC' . rand(100, 999),
            'pf_establishment_code' => 'MH/BAN/1234567/000',
            'esi_code_number' => '31000123450000101',
            'tan_number' => 'MUMT01234B',
            'pan_number' => 'ABCDE1234F',
            'status' => 'active',
        ]);
    }

    public function test_pf_ecr_dropdown_filters_strictly_for_locked_ungenerated_runs()
    {
        // 1. Draft run -> must NOT appear
        $draftRun = PayrollRun::create([
            'client_id' => $this->client->id,
            'payroll_month' => '2026-08-01',
            'status' => 'draft',
        ]);

        // 2. Approved (not locked) run -> must NOT appear
        $approvedRun = PayrollRun::create([
            'client_id' => $this->client->id,
            'payroll_month' => '2026-09-01',
            'status' => 'approved',
        ]);

        // 3. Locked run without batch -> MUST appear
        $lockedRun = PayrollRun::create([
            'client_id' => $this->client->id,
            'payroll_month' => '2026-10-01',
            'status' => 'locked',
        ]);

        $response = $this->actingAs($this->admin)->getJson(route('compliance.pf_ecr.runs', [
            'client_id' => $this->client->id,
        ]));

        $response->assertStatus(200);
        $runIds = collect($response->json('runs'))->pluck('id')->toArray();

        $this->assertNotContains($draftRun->id, $runIds, 'Draft run should not appear in PF ECR dropdown');
        $this->assertNotContains($approvedRun->id, $runIds, 'Approved run should not appear in PF ECR dropdown');
        $this->assertContains($lockedRun->id, $runIds, 'Locked ungenerated run should appear in PF ECR dropdown');

        // 4. Generate batch for locked run -> must now be EXCLUDED
        $batch = PfEcrBatch::create([
            'client_id' => $this->client->id,
            'payroll_run_id' => $lockedRun->id,
            'pf_establishment_code' => 'MH/BAN/1234567/000',
            'wage_month' => '2026-10-01',
            'employee_count' => 5,
            'total_epf_wages' => 50000,
            'total_eps_wages' => 50000,
            'total_employee_epf' => 6000,
            'total_employer_epf' => 1825,
            'total_employer_eps' => 4175,
            'total_ncp_days' => 0,
            'status' => 'generated',
            'file_path' => 'dummy/path.txt',
            'file_name' => 'dummy.txt',
            'file_hash' => 'dummyhash',
        ]);

        $responseAfterGen = $this->actingAs($this->admin)->getJson(route('compliance.pf_ecr.runs', [
            'client_id' => $this->client->id,
        ]));

        $runIdsAfterGen = collect($responseAfterGen->json('runs'))->pluck('id')->toArray();
        $this->assertNotContains($lockedRun->id, $runIdsAfterGen, 'Locked run with existing PF batch must be excluded from dropdown');

        // 5. Delete batch -> locked run should reappear
        $batch->delete();

        $responseAfterDelete = $this->actingAs($this->admin)->getJson(route('compliance.pf_ecr.runs', [
            'client_id' => $this->client->id,
        ]));

        $runIdsAfterDelete = collect($responseAfterDelete->json('runs'))->pluck('id')->toArray();
        $this->assertContains($lockedRun->id, $runIdsAfterDelete, 'Locked run should reappear after batch deletion');
    }

    public function test_esi_monthly_dropdown_filters_strictly_for_locked_ungenerated_runs()
    {
        // 1. Draft run -> must NOT appear
        $draftRun = PayrollRun::create([
            'client_id' => $this->client->id,
            'payroll_month' => '2026-08-01',
            'status' => 'draft',
        ]);

        // 2. Locked run without batch -> MUST appear
        $lockedRun = PayrollRun::create([
            'client_id' => $this->client->id,
            'payroll_month' => '2026-09-01',
            'status' => 'locked',
        ]);

        $response = $this->actingAs($this->admin)->getJson(route('compliance.esi_monthly.runs', [
            'client_id' => $this->client->id,
        ]));

        $response->assertStatus(200);
        $runIds = collect($response->json('runs'))->pluck('id')->toArray();

        $this->assertNotContains($draftRun->id, $runIds, 'Draft run should not appear in ESI dropdown');
        $this->assertContains($lockedRun->id, $runIds, 'Locked ungenerated run should appear in ESI dropdown');

        // 3. Generate batch -> must be EXCLUDED
        EsiMonthlyBatch::create([
            'client_id' => $this->client->id,
            'payroll_run_id' => $lockedRun->id,
            'esi_code_number' => '31000123450000101',
            'wage_month' => '2026-09-01',
            'employee_count' => 3,
            'total_wages' => 30000,
            'status' => 'generated',
            'file_path' => 'dummy/esi.xls',
            'file_name' => 'esi.xls',
            'file_hash' => 'dummyhash',
        ]);

        $responseAfterGen = $this->actingAs($this->admin)->getJson(route('compliance.esi_monthly.runs', [
            'client_id' => $this->client->id,
        ]));

        $runIdsAfterGen = collect($responseAfterGen->json('runs'))->pluck('id')->toArray();
        $this->assertNotContains($lockedRun->id, $runIdsAfterGen, 'Locked run with existing ESI batch must be excluded from dropdown');
    }

    public function test_pt_challan_dropdown_filters_strictly_for_locked_ungenerated_runs()
    {
        // 1. Draft run -> must NOT appear
        $draftRun = PayrollRun::create([
            'client_id' => $this->client->id,
            'payroll_month' => '2026-08-01',
            'status' => 'draft',
        ]);

        // 2. Locked run without batch -> MUST appear
        $lockedRun = PayrollRun::create([
            'client_id' => $this->client->id,
            'payroll_month' => '2026-09-01',
            'status' => 'locked',
        ]);

        $response = $this->actingAs($this->admin)->getJson(route('compliance.pt_challan.runs'));

        $response->assertStatus(200);
        $runIds = collect($response->json('runs'))->pluck('id')->toArray();

        $this->assertNotContains($draftRun->id, $runIds, 'Draft run should not appear in PT dropdown');
        $this->assertContains($lockedRun->id, $runIds, 'Locked ungenerated run should appear in PT dropdown');

        // 3. Generate batch -> must be EXCLUDED
        PtChallanBatch::create([
            'client_id' => $this->client->id,
            'payroll_run_id' => $lockedRun->id,
            'wage_month' => '2026-09-01',
            'employee_count' => 3,
            'total_pt_amount' => 600,
            'status' => 'generated',
            'file_path' => 'dummy/pt.xlsx',
            'file_name' => 'pt.xlsx',
            'file_hash' => 'dummyhash',
        ]);

        $responseAfterGen = $this->actingAs($this->admin)->getJson(route('compliance.pt_challan.runs'));

        $runIdsAfterGen = collect($responseAfterGen->json('runs'))->pluck('id')->toArray();
        $this->assertNotContains($lockedRun->id, $runIdsAfterGen, 'Locked run with existing PT batch must be excluded from dropdown');
    }

    public function test_gstr1_available_months_excludes_already_generated_return_periods()
    {
        $branch = \App\Models\ClientBranch::create([
            'client_id' => $this->client->id,
            'branch_name' => 'Main Branch',
            'branch_code' => 'HO01',
            'state' => 'Maharashtra',
        ]);

        $run = PayrollRun::create([
            'client_id' => $this->client->id,
            'payroll_month' => '2026-11-01',
            'status' => 'locked',
        ]);

        // Create raised/finalized invoice for 2026-11
        Invoice::create([
            'client_id' => $this->client->id,
            'branch_id' => $branch->id,
            'payroll_run_id' => $run->id,
            'invoice_number' => 'INV-TEST-202611',
            'invoice_month' => '2026-11-01',
            'status' => 'raised',
            'agency_service_fee' => 10000,
            'gross_salary_passthrough' => 50000,
            'gst_amount' => 1800,
            'grand_total' => 61800,
            'due_date' => '2026-12-10',
            'gst_type' => 'cgst_sgst',
            'agency_gstin' => '27AAAAA0000A1Z5',
            'branch_gstin' => '27BBBBB1111B1Z2',
            'place_of_supply_state' => 'Maharashtra',
        ]);

        $response = $this->actingAs($this->admin)->getJson(route('compliance.gstr1.months'));
        $response->assertStatus(200);
        $months = $response->json('months');

        $this->assertContains('2026-11', $months, '2026-11 should be in available GSTR-1 months');

        // Create GSTR-1 batch for 2026-11
        Gstr1Batch::create([
            'return_period' => '2026-11',
            'invoice_count' => 1,
            'total_taxable_value' => 10000,
            'total_igst' => 0,
            'total_cgst' => 900,
            'total_sgst' => 900,
            'total_tax_liability' => 1800,
            'status' => 'generated',
            'json_file_path' => 'dummy.json',
            'json_file_name' => 'dummy.json',
            'xlsx_file_path' => 'dummy.xlsx',
            'xlsx_file_name' => 'dummy.xlsx',
            'file_hash' => 'dummyhash',
        ]);

        $responseAfterGen = $this->actingAs($this->admin)->getJson(route('compliance.gstr1.months'));
        $monthsAfterGen = $responseAfterGen->json('months');

        $this->assertNotContains('2026-11', $monthsAfterGen, '2026-11 must be excluded from available GSTR-1 months after generation');
    }
}
