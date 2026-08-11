<?php

namespace Tests\Feature;

use App\Models\Client;
use App\Models\ClientBranch;
use App\Models\Employee;
use App\Models\PayrollRun;
use App\Models\PayrollRunItem;
use App\Models\PtChallanBatch;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class PtChallanTest extends TestCase
{
    use RefreshDatabase;

    private static int $empSeq = 0;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('local');
    }

    protected function createAdminUser(): User
    {
        return User::factory()->create([
            'role' => 'admin',
            'status' => 'active',
        ]);
    }

    protected function createClientAndBranch(): array
    {
        $client = Client::factory()->create([
            'company_name' => 'Acme Corp',
            'client_code' => 'ACMEPT' . sprintf('%03d', ++self::$empSeq),
            'contract_type' => 'eor',
            'pt_state' => 'Karnataka',
            'status' => 'active',
        ]);

        $branch = ClientBranch::create([
            'client_id' => $client->id,
            'branch_name' => 'Headquarters',
            'state' => 'Karnataka',
            'pt_registration_number' => 'KARPT12345',
        ]);

        return [$client, $branch];
    }

    protected function createTestEmployee(Client $client, ClientBranch $branch, array $overrides = []): Employee
    {
        $seq = ++self::$empSeq;
        $panChar = chr(65 + ($seq % 26));

        return Employee::factory()->create(array_merge([
            'client_id' => $client->id,
            'branch_id' => $branch->id,
            'employee_code' => 'PTEMP' . sprintf('%04d', $seq),
            'full_name' => 'Test Employee ' . $seq,
            'pan_number' => 'ABCDE' . sprintf('%04d', $seq) . $panChar,
            'aadhaar_number' => '9999' . sprintf('%08d', $seq),
            'bank_account_number' => 'ACC' . sprintf('%08d', $seq),
            'pt_applicable' => true,
        ], $overrides));
    }

    protected function createTestRunItem(PayrollRun $run, Employee $emp, float $gross = 30000.00, float $pt = 200.00, bool $isExcluded = false): PayrollRunItem
    {
        return PayrollRunItem::create([
            'payroll_run_id' => $run->id,
            'employee_id' => $emp->id,
            'paid_days' => 30,
            'lop_days' => 0.00,
            'basic_pay' => round($gross * 0.5, 2),
            'hra' => round($gross * 0.25, 2),
            'conveyance' => 1600.00,
            'da' => 0.00,
            'medical_allowance' => 1250.00,
            'special_allowance' => round($gross * 0.25 - 2850, 2),
            'other_additions' => 0.00,
            'gross_total' => $gross,
            'employee_pf' => 1800.00,
            'employee_esi' => 0.00,
            'professional_tax' => $pt,
            'lwf_deduction' => 0.00,
            'lop_deduction' => 0.00,
            'tds_deduction' => 0.00,
            'loan_emi_deduction' => 0.00,
            'net_pay' => $gross - 1800 - $pt,
            'employer_pf' => 1950.00,
            'employer_epf' => 550.00,
            'employer_eps' => 1400.00,
            'employer_esi' => 0.00,
            'attendance_source' => 'uploaded',
            'is_excluded' => $isExcluded,
        ]);
    }

    public function test_draft_payroll_run_is_blocked_from_pt_generation()
    {
        $admin = $this->createAdminUser();
        [$client, $branch] = $this->createClientAndBranch();

        $run = PayrollRun::create([
            'client_id' => $client->id,
            'payroll_month' => '2026-08',
            'status' => 'draft',
        ]);

        $response = $this->actingAs($admin)
            ->postJson(route('compliance.pt_challan.generate'), [
                'payroll_run_id' => $run->id,
            ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['pt']);
    }

    public function test_locked_run_generates_xlsx_file_with_state_summary_and_employee_register()
    {
        $admin = $this->createAdminUser();
        [$client, $branch] = $this->createClientAndBranch();

        $run = PayrollRun::create([
            'client_id' => $client->id,
            'payroll_month' => '2026-08',
            'status' => 'processing',
        ]);

        $emp1 = $this->createTestEmployee($client, $branch, ['gender' => 'male']);
        $emp2 = $this->createTestEmployee($client, $branch, ['gender' => 'female']);

        $this->createTestRunItem($run, $emp1, 30000.00, 200.00);
        $this->createTestRunItem($run, $emp2, 28000.00, 200.00);

        $run->update(['status' => 'locked']);

        $response = $this->actingAs($admin)
            ->postJson(route('compliance.pt_challan.generate'), [
                'payroll_run_id' => $run->id,
            ]);

        $response->assertStatus(200);
        $response->assertJson([
            'success' => true,
            'employee_count' => 2,
            'total_pt_amount' => 400.00,
        ]);

        $batch = PtChallanBatch::where('payroll_run_id', $run->id)->first();
        $this->assertNotNull($batch);
        $this->assertEquals(2, $batch->employee_count);
        $this->assertEquals(400.00, $batch->total_pt_amount);

        Storage::disk('local')->assertExists($batch->file_path);
    }

    public function test_non_pt_employee_is_excluded_from_pt_report()
    {
        $admin = $this->createAdminUser();
        [$client, $branch] = $this->createClientAndBranch();

        $run = PayrollRun::create([
            'client_id' => $client->id,
            'payroll_month' => '2026-08',
            'status' => 'processing',
        ]);

        $empPt = $this->createTestEmployee($client, $branch, ['pt_applicable' => true]);
        $empNoPt = $this->createTestEmployee($client, $branch, ['pt_applicable' => false]);

        $this->createTestRunItem($run, $empPt, 30000.00, 200.00);
        $this->createTestRunItem($run, $empNoPt, 15000.00, 0.00);

        $run->update(['status' => 'locked']);

        $response = $this->actingAs($admin)
            ->postJson(route('compliance.pt_challan.generate'), [
                'payroll_run_id' => $run->id,
            ]);

        $response->assertStatus(200);
        $response->assertJson([
            'success' => true,
            'employee_count' => 1,
            'total_pt_amount' => 200.00,
        ]);
    }

    public function test_download_endpoint_streams_generated_xlsx_file()
    {
        $admin = $this->createAdminUser();
        [$client, $branch] = $this->createClientAndBranch();

        $run = PayrollRun::create([
            'client_id' => $client->id,
            'payroll_month' => '2026-08',
            'status' => 'processing',
        ]);

        $emp = $this->createTestEmployee($client, $branch);
        $this->createTestRunItem($run, $emp, 30000.00, 200.00);

        $run->update(['status' => 'locked']);

        $genResponse = $this->actingAs($admin)
            ->postJson(route('compliance.pt_challan.generate'), [
                'payroll_run_id' => $run->id,
            ]);

        $batchId = $genResponse->json('batch_id');

        $downResponse = $this->actingAs($admin)
            ->get(route('compliance.pt_challan.download', $batchId));

        $downResponse->assertStatus(200);
        $downResponse->assertHeader('content-type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

        $batch = PtChallanBatch::find($batchId);
        $this->assertEquals('downloaded', $batch->status);
    }
}
