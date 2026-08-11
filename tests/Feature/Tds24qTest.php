<?php

namespace Tests\Feature;

use App\Models\Client;
use App\Models\ClientBranch;
use App\Models\Employee;
use App\Models\PayrollRun;
use App\Models\PayrollRunItem;
use App\Models\Tds24qBatch;
use App\Models\TdsChallan;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class Tds24qTest extends TestCase
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
            'email' => 'admin_tds24q@example.com',
        ]);

        $this->employeeUser = User::factory()->create([
            'role' => 'employee',
            'email' => 'emp_tds24q@example.com',
        ]);

        $this->client = Client::factory()->create([
            'company_name' => 'Apex Staffing Solutions',
            'client_code' => 'APEX24Q',
            'registered_state' => 'Maharashtra',
            'tan_number' => 'MUMT01234B',
            'pan_number' => 'AAACA1234A',
            'status' => 'active',
        ]);

        $this->branch = ClientBranch::create([
            'client_id' => $this->client->id,
            'branch_name' => 'Mumbai HO',
            'state' => 'Maharashtra',
        ]);
    }

    private static int $piiSeq = 0;

    protected function makeEmployee(array $overrides = []): Employee
    {
        self::$piiSeq++;
        $seq = str_pad((string) self::$piiSeq, 6, '0', STR_PAD_LEFT);

        return Employee::factory()->create(array_merge([
            'client_id' => $this->client->id,
            'branch_id' => $this->branch->id,
            'employee_code' => 'EMP-TD' . $seq,
            'first_name' => 'John',
            'last_name' => 'Doe',
            'gender' => 'male',
            'status' => 'active',
            'basic_pay' => 50000.00,
            'gross_monthly_salary' => 100000.00,
            'pan_number' => 'ABCDE' . substr($seq, 0, 4) . 'F',
            'tds_applicable' => true,
            'tds_regime' => 'new',
        ], $overrides));
    }

    protected function baseRunItemAttrs(): array
    {
        return [
            'paid_days' => 30.00,
            'lop_days' => 0.00,
            'basic_pay' => 50000.00,
            'hra' => 20000.00,
            'conveyance' => 1600.00,
            'da' => 0.00,
            'medical_allowance' => 1250.00,
            'special_allowance' => 27150.00,
            'other_additions' => 0.00,
            'gross_total' => 100000.00,
            'employee_pf' => 1800.00,
            'employee_esi' => 0.00,
            'professional_tax' => 200.00,
            'lwf_deduction' => 0.00,
            'lop_deduction' => 0.00,
            'tds_deduction' => 5000.00,
            'loan_emi_deduction' => 0.00,
            'net_pay' => 93000.00,
            'employer_pf' => 1950.00,
            'employer_epf' => 550.00,
            'employer_eps' => 1400.00,
            'employer_esi' => 0.00,
            'attendance_source' => 'uploaded',
            'is_excluded' => false,
        ];
    }

    protected function createLockedRun(string $month, ?Employee $emp = null): PayrollRun
    {
        $run = PayrollRun::create([
            'client_id' => $this->client->id,
            'payroll_month' => $month,
            'status' => 'draft',
        ]);

        if (!$emp) {
            $emp = $this->makeEmployee();
        }

        PayrollRunItem::create(array_merge($this->baseRunItemAttrs(), [
            'payroll_run_id' => $run->id,
            'employee_id' => $emp->id,
        ]));

        $run->update(['status' => 'locked']);

        return $run;
    }

    protected function saveValidChallan(string $fy = '2026-2027', string $quarter = 'Q1'): TdsChallan
    {
        return TdsChallan::create([
            'client_id' => $this->client->id,
            'financial_year' => $fy,
            'quarter' => $quarter,
            'bsr_code' => '0210001',
            'deposit_date' => '2026-07-07',
            'challan_serial_number' => '00101',
            'tax_amount' => 5000.00,
            'surcharge' => 0.00,
            'cess' => 0.00,
            'interest' => 0.00,
            'fee_234e' => 0.00,
            'total_deposited' => 5000.00,
        ]);
    }

    /** @test */
    public function employee_role_cannot_access_tds_routes()
    {
        $this->actingAs($this->employeeUser)
            ->getJson(route('compliance.tds_24q.metadata'))
            ->assertStatus(403);
    }

    /** @test */
    public function missing_tan_blocks_24q_generation()
    {
        $this->client->update(['tan_number' => null]);
        $this->createLockedRun('2026-04-01');
        $this->saveValidChallan('2026-2027', 'Q1');

        $this->actingAs($this->adminUser)
            ->postJson(route('compliance.tds_24q.generate'), [
                'client_id' => $this->client->id,
                'financial_year' => '2026-2027',
                'quarter' => 'Q1',
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['tds']);
    }

    /** @test */
    public function invalid_tan_format_blocks_24q_generation()
    {
        $this->client->update(['tan_number' => 'INVALID123']);
        $this->createLockedRun('2026-04-01');
        $this->saveValidChallan('2026-2027', 'Q1');

        $this->actingAs($this->adminUser)
            ->postJson(route('compliance.tds_24q.generate'), [
                'client_id' => $this->client->id,
                'financial_year' => '2026-2027',
                'quarter' => 'Q1',
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['tds']);
    }

    /** @test */
    public function missing_treasury_challan_blocks_24q_generation()
    {
        $this->createLockedRun('2026-04-01');

        $this->actingAs($this->adminUser)
            ->postJson(route('compliance.tds_24q.generate'), [
                'client_id' => $this->client->id,
                'financial_year' => '2026-2027',
                'quarter' => 'Q1',
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['tds']);
    }

    /** @test */
    public function invalid_bsr_code_blocks_challan_saving()
    {
        $this->actingAs($this->adminUser)
            ->postJson(route('compliance.tds_24q.save_challan'), [
                'client_id' => $this->client->id,
                'financial_year' => '2026-2027',
                'quarter' => 'Q1',
                'bsr_code' => '123', // Invalid short length
                'deposit_date' => '2026-07-07',
                'challan_serial_number' => '101',
                'tax_amount' => 5000.00,
            ])
            ->assertStatus(422);
    }

    /** @test */
    public function draft_unlocked_payroll_run_is_excluded_from_24q()
    {
        // Create draft run
        $run = PayrollRun::create([
            'client_id' => $this->client->id,
            'payroll_month' => '2026-04-01',
            'status' => 'draft',
        ]);
        $emp = $this->makeEmployee();
        PayrollRunItem::create(array_merge($this->baseRunItemAttrs(), [
            'payroll_run_id' => $run->id,
            'employee_id' => $emp->id,
        ]));
        $this->saveValidChallan('2026-2027', 'Q1');

        $this->actingAs($this->adminUser)
            ->postJson(route('compliance.tds_24q.generate'), [
                'client_id' => $this->client->id,
                'financial_year' => '2026-2027',
                'quarter' => 'Q1',
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['tds']);
    }

    /** @test */
    public function q1_q2_q3_generates_valid_txt_file_with_fh_bh_cd_dd_records()
    {
        $this->createLockedRun('2026-04-01');
        $this->saveValidChallan('2026-2027', 'Q1');

        $response = $this->actingAs($this->adminUser)
            ->postJson(route('compliance.tds_24q.generate'), [
                'client_id' => $this->client->id,
                'financial_year' => '2026-2027',
                'quarter' => 'Q1',
            ]);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'financial_year' => '2026-2027',
                'quarter' => 'Q1',
                'employee_count' => 1,
                'total_taxable_salary' => 100000.00,
                'total_tds_deducted' => 5000.00,
            ]);

        $batchId = $response->json('batch_id');
        $batch = Tds24qBatch::find($batchId);
        $this->assertNotNull($batch);

        // Verify TXT file structure
        Storage::disk('local')->assertExists($batch->txt_file_path);
        $content = Storage::disk('local')->get($batch->txt_file_path);
        $lines = explode("\r\n", trim($content));

        $this->assertGreaterThanOrEqual(4, count($lines));
        $this->assertStringStartsWith('FH^SL^R^', $lines[0]);
        $this->assertStringStartsWith('BH^1^1^24Q^R^202627^202728^Q1^', $lines[1]);
        $this->assertStringStartsWith('CD^1^00101^1^0210001^07072026^', $lines[2]);
        $this->assertStringStartsWith('DD^1^00101^1^', $lines[3]);

        // Q1 return must NOT contain SD records
        $this->assertStringNotContainsString('SD^', $content);

        // Verify 4-sheet XLSX exists
        Storage::disk('local')->assertExists($batch->xlsx_file_path);
    }

    /** @test */
    public function q4_generates_valid_txt_file_with_mandatory_sd_annexure2_records()
    {
        // Create 2 locked runs in FY 2026-2027 for Q4 annual aggregation
        $emp = $this->makeEmployee(['pan_number' => 'XYZPD9876Q']);
        
        $runApr = PayrollRun::create(['client_id' => $this->client->id, 'payroll_month' => '2026-04-01', 'status' => 'draft']);
        PayrollRunItem::create(array_merge($this->baseRunItemAttrs(), ['payroll_run_id' => $runApr->id, 'employee_id' => $emp->id, 'gross_total' => 100000.00, 'tds_deduction' => 5000.00]));
        $runApr->update(['status' => 'locked']);

        $runJan = PayrollRun::create(['client_id' => $this->client->id, 'payroll_month' => '2027-01-01', 'status' => 'draft']);
        PayrollRunItem::create(array_merge($this->baseRunItemAttrs(), ['payroll_run_id' => $runJan->id, 'employee_id' => $emp->id, 'gross_total' => 100000.00, 'tds_deduction' => 5000.00]));
        $runJan->update(['status' => 'locked']);

        $this->saveValidChallan('2026-2027', 'Q4');

        $response = $this->actingAs($this->adminUser)
            ->postJson(route('compliance.tds_24q.generate'), [
                'client_id' => $this->client->id,
                'financial_year' => '2026-2027',
                'quarter' => 'Q4',
            ]);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'financial_year' => '2026-2027',
                'quarter' => 'Q4',
            ]);

        $batch = Tds24qBatch::find($response->json('batch_id'));
        $content = Storage::disk('local')->get($batch->txt_file_path);

        // Q4 return MUST contain SD records
        $this->assertStringContainsString('SD^1^1^XYZPD9876Q^John Doe^G^01042026^310327^200000.00^', $content);
    }

    /** @test */
    public function missing_employee_pan_is_flagged_as_pannotavbl_with_reason_c()
    {
        $emp = $this->makeEmployee(['pan_number' => 'PANNOTAVBL']);
        $this->createLockedRun('2026-04-01', $emp);

        $this->saveValidChallan('2026-2027', 'Q1');

        $response = $this->actingAs($this->adminUser)
            ->postJson(route('compliance.tds_24q.generate'), [
                'client_id' => $this->client->id,
                'financial_year' => '2026-2027',
                'quarter' => 'Q1',
            ]);

        $response->assertStatus(200);

        $batch = Tds24qBatch::find($response->json('batch_id'));
        $content = Storage::disk('local')->get($batch->txt_file_path);

        // PAN must be PANNOTAVBL and reason code C
        $this->assertStringContainsString('DD^1^00101^1^PANNOTAVBL^John Doe^', $content);
        $this->assertStringContainsString('^C', $content);
    }

    /** @test */
    public function download_endpoint_streams_txt_file()
    {
        $this->createLockedRun('2026-04-01');
        $this->saveValidChallan('2026-2027', 'Q1');

        $gen = $this->actingAs($this->adminUser)
            ->postJson(route('compliance.tds_24q.generate'), [
                'client_id' => $this->client->id,
                'financial_year' => '2026-2027',
                'quarter' => 'Q1',
            ]);

        $batchId = $gen->json('batch_id');

        $response = $this->actingAs($this->adminUser)
            ->get(route('compliance.tds_24q.download', $batchId));

        $response->assertStatus(200)
            ->assertHeader('content-type', 'text/plain; charset=UTF-8');
    }
}
