<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use App\Models\User;
use App\Models\Client;
use App\Models\ClientBranch;
use App\Models\Employee;
use App\Models\PayrollRun;
use App\Models\PayrollRunItem;
use App\Models\EsiMonthlyBatch;
use Illuminate\Support\Facades\Storage;
use PhpOffice\PhpSpreadsheet\IOFactory;

class EsiMonthlyContributionTest extends TestCase
{
    use RefreshDatabase;

    protected User $adminUser;
    protected User $employeeUser;
    protected Client $client;
    protected ClientBranch $branch;

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('local');

        $this->adminUser = User::factory()->create([
            'role' => 'admin',
            'status' => 'active',
            'must_change_password' => false,
        ]);

        $this->employeeUser = User::factory()->create([
            'role' => 'employee',
            'status' => 'active',
            'must_change_password' => false,
        ]);

        $this->client = Client::factory()->create([
            'company_name' => 'Acme Technologies Pvt Ltd',
            'client_code' => 'ACMEESI01',
            'contract_type' => 'eor',
            'esi_applicable' => true,
            'esi_code_number' => '31002233440001999',
            'status' => 'active',
        ]);

        $this->branch = ClientBranch::create([
            'client_id' => $this->client->id,
            'branch_name' => 'Head Office',
            'state' => 'Maharashtra',
        ]);
    }

    private static int $piiSeq = 0;

    private function makeEmployee(array $overrides = []): Employee
    {
        self::$piiSeq++;
        $seq = str_pad((string) self::$piiSeq, 6, '0', STR_PAD_LEFT);

        return Employee::factory()->create(array_merge([
            'client_id' => $this->client->id,
            'branch_id' => $this->branch->id,
            'pan_number' => 'ESIPN' . $seq . 'X',
            'aadhaar_number' => '9' . $seq . '000000',
            'bank_account_number' => '88' . $seq . '11223344',
        ], $overrides));
    }

    private function baseRunItemAttrs(): array
    {
        return [
            'paid_days' => 30.00,
            'lop_days' => 0.00,
            'basic_pay' => 15000.00,
            'hra' => 7500.00,
            'conveyance' => 1600.00,
            'da' => 0.00,
            'medical_allowance' => 1250.00,
            'special_allowance' => 2000.00,
            'other_additions' => 0.00,
            'gross_total' => 20000.00,
            'employee_pf' => 1800.00,
            'employee_esi' => 150.00,
            'professional_tax' => 200.00,
            'lwf_deduction' => 20.00,
            'lop_deduction' => 0.00,
            'tds_deduction' => 0.00,
            'loan_emi_deduction' => 0.00,
            'net_pay' => 17830.00,
            'employer_pf' => 1950.00,
            'employer_epf' => 550.50,
            'employer_eps' => 1249.50,
            'employer_esi' => 650.00,
            'attendance_source' => 'uploaded',
            'is_excluded' => false,
        ];
    }

    /** @test */
    public function draft_payroll_run_is_blocked_from_esi_generation()
    {
        $run = PayrollRun::create([
            'client_id' => $this->client->id,
            'payroll_month' => '2026-06-01',
            'status' => 'draft',
        ]);

        $response = $this->actingAs($this->adminUser)
            ->postJson(route('compliance.esi_monthly.generate'), [
                'payroll_run_id' => $run->id,
            ]);

        $response->assertStatus(422);
        $this->assertStringContainsString('LOCKED', $response->json('errors.esi.0'));
        $this->assertDatabaseCount('esi_monthly_batches', 0);
    }

    /** @test */
    public function approved_but_not_locked_payroll_run_is_blocked_from_esi_generation()
    {
        $run = PayrollRun::create([
            'client_id' => $this->client->id,
            'payroll_month' => '2026-06-01',
            'status' => 'approved',
        ]);

        $response = $this->actingAs($this->adminUser)
            ->postJson(route('compliance.esi_monthly.generate'), [
                'payroll_run_id' => $run->id,
            ]);

        $response->assertStatus(422);
        $this->assertStringContainsString('LOCKED', $response->json('errors.esi.0'));
    }

    /** @test */
    public function locked_run_with_no_esi_eligible_employees_is_blocked()
    {
        $run = PayrollRun::create([
            'client_id' => $this->client->id,
            'payroll_month' => '2026-06-01',
            'status' => 'draft',
        ]);

        $emp = $this->makeEmployee(['esi_applicable' => false]);
        PayrollRunItem::create(array_merge($this->baseRunItemAttrs(), [
            'payroll_run_id' => $run->id,
            'employee_id' => $emp->id,
            'employee_esi' => 0.00,
        ]));
        $run->update(['status' => 'locked']);

        $response = $this->actingAs($this->adminUser)
            ->postJson(route('compliance.esi_monthly.generate'), [
                'payroll_run_id' => $run->id,
            ]);

        $response->assertStatus(422);
        $this->assertStringContainsString('No ESI-eligible employees', $response->json('errors.esi.0'));
    }

    /** @test */
    public function locked_run_generates_xls_file_with_exactly_six_columns_and_no_header()
    {
        $run = PayrollRun::create([
            'client_id' => $this->client->id,
            'payroll_month' => '2026-06-01',
            'status' => 'draft',
        ]);

        $emp1 = $this->makeEmployee([
            'employee_code' => 'ESI-001',
            'full_name' => 'Rahul Sharma',
            'esi_applicable' => true,
            'esic_number' => '3100223344000101',
        ]);
        $emp2 = $this->makeEmployee([
            'employee_code' => 'ESI-002',
            'full_name' => 'Priya Patel',
            'esi_applicable' => true,
            'esic_number' => '3100223344000102',
        ]);

        PayrollRunItem::create(array_merge($this->baseRunItemAttrs(), [
            'payroll_run_id' => $run->id,
            'employee_id' => $emp1->id,
        ]));
        PayrollRunItem::create(array_merge($this->baseRunItemAttrs(), [
            'payroll_run_id' => $run->id,
            'employee_id' => $emp2->id,
        ]));
        $run->update(['status' => 'locked']);

        $response = $this->actingAs($this->adminUser)
            ->postJson(route('compliance.esi_monthly.generate'), [
                'payroll_run_id' => $run->id,
            ]);

        $response->assertStatus(200)->assertJson([
            'success' => true,
            'employee_count' => 2,
        ]);

        $batchId = $response->json('batch_id');
        $batch = EsiMonthlyBatch::find($batchId);
        $this->assertNotNull($batch);
        $this->assertEquals('generated', $batch->status);
        $this->assertEquals(2, $batch->employee_count);
        $this->assertStringEndsWith('.xls', $batch->file_name);

        $absolutePath = Storage::disk('local')->path($batch->file_path);
        $spreadsheet = IOFactory::load($absolutePath);
        $sheet = $spreadsheet->getActiveSheet();

        // Exactly one file, one sheet, containing all eligible employees.
        $this->assertEquals(2, $sheet->getHighestDataRow());
        $this->assertEquals('F', $sheet->getHighestDataColumn());

        // No header: row 1 is real employee data, not a column label.
        $ipNumberCell = (string) $sheet->getCell('A1')->getValue();
        $this->assertNotEquals('IP Number', $ipNumberCell);
        $this->assertContains($ipNumberCell, ['3100223344000101', '3100223344000102']);

        // Exactly 6 columns per row.
        for ($row = 1; $row <= 2; $row++) {
            $rowData = $sheet->rangeToArray("A{$row}:G{$row}")[0];
            $this->assertNotEmpty($rowData[0], "Row {$row} column A (IP Number) should not be empty");
            $this->assertNull($rowData[6] ?? null, "Row {$row} must not have a 7th column");
        }
    }

    /** @test */
    public function non_esi_applicable_employee_is_excluded_from_the_file()
    {
        $run = PayrollRun::create([
            'client_id' => $this->client->id,
            'payroll_month' => '2026-06-01',
            'status' => 'draft',
        ]);

        $eligible = $this->makeEmployee([
            'employee_code' => 'ESI-010',
            'full_name' => 'Eligible Employee',
            'esi_applicable' => true,
        ]);
        $ineligible = $this->makeEmployee([
            'employee_code' => 'ESI-011',
            'full_name' => 'Ineligible Employee',
            'esi_applicable' => false,
        ]);

        PayrollRunItem::create(array_merge($this->baseRunItemAttrs(), [
            'payroll_run_id' => $run->id,
            'employee_id' => $eligible->id,
        ]));
        PayrollRunItem::create(array_merge($this->baseRunItemAttrs(), [
            'payroll_run_id' => $run->id,
            'employee_id' => $ineligible->id,
            'employee_esi' => 0.00,
        ]));
        $run->update(['status' => 'locked']);

        $response = $this->actingAs($this->adminUser)
            ->postJson(route('compliance.esi_monthly.generate'), [
                'payroll_run_id' => $run->id,
            ]);

        $response->assertStatus(200)->assertJson(['success' => true, 'employee_count' => 1]);
    }

    /** @test */
    public function excluded_payroll_items_are_not_included_in_the_file()
    {
        $run = PayrollRun::create([
            'client_id' => $this->client->id,
            'payroll_month' => '2026-06-01',
            'status' => 'draft',
        ]);

        $included = $this->makeEmployee(['employee_code' => 'ESI-020', 'esi_applicable' => true]);
        $excluded = $this->makeEmployee(['employee_code' => 'ESI-021', 'esi_applicable' => true]);

        PayrollRunItem::create(array_merge($this->baseRunItemAttrs(), [
            'payroll_run_id' => $run->id,
            'employee_id' => $included->id,
        ]));
        PayrollRunItem::create(array_merge($this->baseRunItemAttrs(), [
            'payroll_run_id' => $run->id,
            'employee_id' => $excluded->id,
            'is_excluded' => true,
        ]));
        $run->update(['status' => 'locked']);

        $response = $this->actingAs($this->adminUser)
            ->postJson(route('compliance.esi_monthly.generate'), [
                'payroll_run_id' => $run->id,
            ]);

        $response->assertStatus(200)->assertJson(['success' => true, 'employee_count' => 1]);
    }

    /** @test */
    public function download_endpoint_streams_the_generated_file()
    {
        $run = PayrollRun::create([
            'client_id' => $this->client->id,
            'payroll_month' => '2026-06-01',
            'status' => 'draft',
        ]);
        $emp = $this->makeEmployee(['employee_code' => 'ESI-030', 'esi_applicable' => true]);
        PayrollRunItem::create(array_merge($this->baseRunItemAttrs(), [
            'payroll_run_id' => $run->id,
            'employee_id' => $emp->id,
        ]));
        $run->update(['status' => 'locked']);

        $generateResponse = $this->actingAs($this->adminUser)
            ->postJson(route('compliance.esi_monthly.generate'), ['payroll_run_id' => $run->id]);

        $batchId = $generateResponse->json('batch_id');

        $downloadResponse = $this->actingAs($this->adminUser)
            ->get(route('compliance.esi_monthly.download', $batchId));

        $downloadResponse->assertStatus(200);
        $downloadResponse->assertHeader('content-type', 'application/vnd.ms-excel');

        $this->assertEquals('downloaded', EsiMonthlyBatch::find($batchId)->status);
    }

    /** @test */
    public function employee_role_cannot_access_esi_monthly_routes()
    {
        $run = PayrollRun::create([
            'client_id' => $this->client->id,
            'payroll_month' => '2026-06-01',
            'status' => 'locked',
        ]);

        $response = $this->actingAs($this->employeeUser)
            ->postJson(route('compliance.esi_monthly.generate'), [
                'payroll_run_id' => $run->id,
            ]);

        // Blocked either by the compliance module route middleware or the
        // controller's own role check — either way must not succeed.
        $this->assertContains($response->status(), [403, 302]);
        $this->assertDatabaseCount('esi_monthly_batches', 0);
    }

    /** @test */
    public function regenerating_for_the_same_payroll_run_updates_the_existing_batch_not_a_duplicate()
    {
        $run = PayrollRun::create([
            'client_id' => $this->client->id,
            'payroll_month' => '2026-06-01',
            'status' => 'draft',
        ]);
        $emp = $this->makeEmployee(['employee_code' => 'ESI-040', 'esi_applicable' => true]);
        PayrollRunItem::create(array_merge($this->baseRunItemAttrs(), [
            'payroll_run_id' => $run->id,
            'employee_id' => $emp->id,
        ]));
        $run->update(['status' => 'locked']);

        $first = $this->actingAs($this->adminUser)
            ->postJson(route('compliance.esi_monthly.generate'), ['payroll_run_id' => $run->id]);
        $second = $this->actingAs($this->adminUser)
            ->postJson(route('compliance.esi_monthly.generate'), ['payroll_run_id' => $run->id]);

        $this->assertEquals($first->json('batch_id'), $second->json('batch_id'));
        $this->assertDatabaseCount('esi_monthly_batches', 1);
    }
}
