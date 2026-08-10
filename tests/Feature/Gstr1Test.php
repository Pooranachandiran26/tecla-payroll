<?php

namespace Tests\Feature;

use App\Models\Client;
use App\Models\ClientBranch;
use App\Models\Invoice;
use App\Models\PayrollRun;
use App\Models\User;
use App\Models\Gstr1Batch;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class Gstr1Test extends TestCase
{
    use RefreshDatabase;

    protected User $adminUser;
    protected User $employeeUser;
    protected Client $client;
    protected ClientBranch $branch;
    protected PayrollRun $payrollRun;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('local');

        $this->adminUser = User::factory()->create([
            'role' => 'admin',
            'email' => 'admin_gstr1@example.com',
        ]);

        $this->employeeUser = User::factory()->create([
            'role' => 'employee',
            'email' => 'emp_gstr1@example.com',
        ]);

        $this->client = Client::factory()->create([
            'company_name' => 'Apex Tech Solutions',
            'client_code' => 'APEX01',
            'registered_state' => 'Maharashtra',
            'gstin' => '27AAAAA0000A1Z5',
            'status' => 'active',
        ]);

        $this->branch = ClientBranch::create([
            'client_id' => $this->client->id,
            'branch_name' => 'Mumbai Head Office',
            'state' => 'Maharashtra',
            'gstin' => '27AAAAA0000A1Z5',
        ]);

        $this->payrollRun = PayrollRun::create([
            'client_id' => $this->client->id,
            'payroll_month' => '2026-08-01',
            'status' => 'locked',
        ]);
    }

    /** @test */
    public function employee_role_cannot_access_gstr1_routes()
    {
        $this->actingAs($this->employeeUser)
            ->getJson(route('compliance.gstr1.months'))
            ->assertStatus(403);
    }

    /** @test */
    public function preview_returns_error_if_no_invoices_found()
    {
        $this->actingAs($this->adminUser)
            ->postJson(route('compliance.gstr1.preview'), ['return_period' => '2026-08'])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['gstr1']);
    }

    /** @test */
    public function generates_valid_gstr1_json_and_xlsx_files()
    {
        Invoice::create([
            'invoice_number' => 'INV-2026-08-001',
            'client_id' => $this->client->id,
            'branch_id' => $this->branch->id,
            'payroll_run_id' => $this->payrollRun->id,
            'invoice_month' => '2026-08-01',
            'agency_gstin' => '27AAACT1234A1Z5',
            'branch_gstin' => '27AAAAA0000A1Z5',
            'place_of_supply_state' => 'Maharashtra',
            'gst_type' => 'cgst_sgst',
            'gross_salary_passthrough' => 500000.00,
            'agency_service_fee' => 50000.00,
            'gst_amount' => 9000.00,
            'cgst_amount' => 4500.00,
            'sgst_amount' => 4500.00,
            'grand_total' => 559000.00,
            'status' => 'raised',
            'due_date' => '2026-08-15',
        ]);

        $response = $this->actingAs($this->adminUser)
            ->postJson(route('compliance.gstr1.generate'), ['return_period' => '2026-08']);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'return_period' => '2026-08',
                'invoice_count' => 1,
                'total_taxable_value' => 50000.00,
                'total_tax_liability' => 9000.00,
            ]);

        $batchId = $response->json('batch_id');
        $batch = Gstr1Batch::find($batchId);
        $this->assertNotNull($batch);

        // Assert JSON file exists and uses the stored cgst/sgst split, not gst_amount/2 approximation
        Storage::disk('local')->assertExists($batch->json_file_path);
        $jsonContent = json_decode(Storage::disk('local')->get($batch->json_file_path), true);

        $this->assertEquals('27AAACT1234A1Z5', $jsonContent['gstin']);
        $this->assertEquals('082026', $jsonContent['fp']);
        $this->assertCount(1, $jsonContent['b2b']);
        $this->assertEquals('27AAAAA0000A1Z5', $jsonContent['b2b'][0]['ctin']);
        $this->assertEquals('INV-2026-08-001', $jsonContent['b2b'][0]['inv'][0]['inum']);
        $this->assertEquals(4500.00, $jsonContent['b2b'][0]['inv'][0]['itms'][0]['itm_det']['camt']);
        $this->assertEquals(4500.00, $jsonContent['b2b'][0]['inv'][0]['itms'][0]['itm_det']['samt']);

        // Table 12 must be explicitly marked unavailable, not fabricated
        $this->assertFalse($jsonContent['table_12_available']);
        $this->assertArrayNotHasKey('hsn', $jsonContent);
        $this->assertArrayHasKey('disclaimer', $jsonContent);

        // Assert XLSX file exists
        Storage::disk('local')->assertExists($batch->xlsx_file_path);
    }

    /** @test */
    public function invoice_missing_gstin_is_excluded_not_fabricated()
    {
        Invoice::create([
            'invoice_number' => 'INV-2026-08-010',
            'client_id' => $this->client->id,
            'branch_id' => $this->branch->id,
            'payroll_run_id' => $this->payrollRun->id,
            'invoice_month' => '2026-08-01',
            'agency_gstin' => '27AAACT1234A1Z5',
            'branch_gstin' => '',
            'place_of_supply_state' => 'Maharashtra',
            'gst_type' => 'cgst_sgst',
            'gross_salary_passthrough' => 100000.00,
            'agency_service_fee' => 10000.00,
            'gst_amount' => 1800.00,
            'cgst_amount' => 900.00,
            'sgst_amount' => 900.00,
            'grand_total' => 111800.00,
            'status' => 'raised',
            'due_date' => '2026-08-15',
        ]);
        $this->client->update(['gstin' => null]);

        $response = $this->actingAs($this->adminUser)
            ->postJson(route('compliance.gstr1.preview'), ['return_period' => '2026-08']);

        $response->assertStatus(200);
        $this->assertEquals(0, $response->json('invoice_count'));
        $this->assertStringContainsString('no recipient GSTIN', $response->json('errors.0'));
        // No fabricated GSTIN anywhere in the response.
        $this->assertStringNotContainsString('27AAACT9999A1Z1', json_encode($response->json()));
    }

    /** @test */
    public function invoice_number_over_sixteen_characters_is_excluded_not_truncated()
    {
        Invoice::create([
            'invoice_number' => 'INV-2026-08-VERY-LONG-001',
            'client_id' => $this->client->id,
            'branch_id' => $this->branch->id,
            'payroll_run_id' => $this->payrollRun->id,
            'invoice_month' => '2026-08-01',
            'agency_gstin' => '27AAACT1234A1Z5',
            'branch_gstin' => '27AAAAA0000A1Z5',
            'place_of_supply_state' => 'Maharashtra',
            'gst_type' => 'cgst_sgst',
            'gross_salary_passthrough' => 100000.00,
            'agency_service_fee' => 10000.00,
            'gst_amount' => 1800.00,
            'cgst_amount' => 900.00,
            'sgst_amount' => 900.00,
            'grand_total' => 111800.00,
            'status' => 'raised',
            'due_date' => '2026-08-15',
        ]);

        $response = $this->actingAs($this->adminUser)
            ->postJson(route('compliance.gstr1.preview'), ['return_period' => '2026-08']);

        $response->assertStatus(200);
        $this->assertEquals(0, $response->json('invoice_count'));
        $this->assertStringContainsString('exceeds', $response->json('errors.0'));
        $this->assertStringContainsString('INV-2026-08-VERY-LONG-001', $response->json('errors.0'));
    }

    /** @test */
    public function missing_agency_gstin_blocks_generation_without_fabricating_one()
    {
        Invoice::create([
            'invoice_number' => 'INV-2026-08-020',
            'client_id' => $this->client->id,
            'branch_id' => $this->branch->id,
            'payroll_run_id' => $this->payrollRun->id,
            'invoice_month' => '2026-08-01',
            'agency_gstin' => '',
            'branch_gstin' => '27AAAAA0000A1Z5',
            'place_of_supply_state' => 'Maharashtra',
            'gst_type' => 'cgst_sgst',
            'gross_salary_passthrough' => 100000.00,
            'agency_service_fee' => 10000.00,
            'gst_amount' => 1800.00,
            'cgst_amount' => 900.00,
            'sgst_amount' => 900.00,
            'grand_total' => 111800.00,
            'status' => 'raised',
            'due_date' => '2026-08-15',
        ]);

        $response = $this->actingAs($this->adminUser)
            ->postJson(route('compliance.gstr1.generate'), ['return_period' => '2026-08']);

        $response->assertStatus(422);
        $this->assertStringContainsString('Agency GSTIN is not set', $response->json('errors.gstr1.0'));
        $this->assertDatabaseCount('gstr1_batches', 0);
    }

    /** @test */
    public function download_endpoint_streams_json_file()
    {
        Invoice::create([
            'invoice_number' => 'INV-2026-08-002',
            'client_id' => $this->client->id,
            'branch_id' => $this->branch->id,
            'payroll_run_id' => $this->payrollRun->id,
            'invoice_month' => '2026-08-01',
            'agency_gstin' => '27AAACT1234A1Z5',
            'branch_gstin' => '27AAAAA0000A1Z5',
            'place_of_supply_state' => 'Maharashtra',
            'gst_type' => 'cgst_sgst',
            'gross_salary_passthrough' => 200000.00,
            'agency_service_fee' => 20000.00,
            'gst_amount' => 3600.00,
            'grand_total' => 223600.00,
            'status' => 'raised',
            'due_date' => '2026-08-15',
        ]);

        $gen = $this->actingAs($this->adminUser)
            ->postJson(route('compliance.gstr1.generate'), ['return_period' => '2026-08']);

        $batchId = $gen->json('batch_id');

        $downloadResp = $this->actingAs($this->adminUser)
            ->get(route('compliance.gstr1.download', $batchId));

        $downloadResp->assertStatus(200)
            ->assertHeader('content-type', 'application/json');
    }
}
