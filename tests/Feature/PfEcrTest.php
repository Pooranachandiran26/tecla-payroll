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
use App\Models\PfEcrBatch;
use Illuminate\Support\Facades\Storage;

class PfEcrTest extends TestCase
{
    use RefreshDatabase;

    protected User $adminUser;
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

        $this->client = Client::factory()->create([
            'company_name' => 'Acme Technologies Pvt Ltd',
            'client_code' => 'ACME01',
            'contract_type' => 'eor',
            'pf_applicable' => true,
            'pf_establishment_code' => 'DLCPM0012345000',
            'pf_ceiling' => 15000,
            'status' => 'active',
        ]);

        $this->branch = ClientBranch::create([
            'client_id' => $this->client->id,
            'branch_name' => 'Head Office',
            'state' => 'Maharashtra',
        ]);
    }

    /** @test */
    public function draft_payroll_run_is_blocked_from_ecr_generation()
    {
        $draftRun = PayrollRun::create([
            'client_id' => $this->client->id,
            'payroll_month' => '2026-06-01',
            'status' => 'draft',
        ]);

        $response = $this->actingAs($this->adminUser)
            ->postJson(route('compliance.pf_ecr.preview'), [
                'payroll_run_id' => $draftRun->id,
            ]);

        $response->assertStatus(200)
            ->assertJson([
                'success' => false,
                'status' => 'blocked',
            ]);

        $this->assertStringContainsString('APPROVED or LOCKED', $response->json('errors.0'));
    }

    /** @test */
    public function missing_uan_blocks_ecr_generation_with_clear_error_message()
    {
        $run = PayrollRun::create([
            'client_id' => $this->client->id,
            'payroll_month' => '2026-06-01',
            'status' => 'draft',
        ]);

        $empNoUan = Employee::factory()->create([
            'employee_code' => 'TEC-002',
            'client_id' => $this->client->id,
            'branch_id' => $this->branch->id,
            'full_name' => 'Priya Patel',
            'pf_applicable' => true,
            'uan_number' => null,
            'pan_number' => 'ABCDE1111F',
            'aadhaar_number' => '111122223333',
            'bank_account_number' => '999900001111',
        ]);

        PayrollRunItem::create([
            'payroll_run_id' => $run->id,
            'employee_id' => $empNoUan->id,
            'paid_days' => 30.00,
            'lop_days' => 0.00,
            'basic_pay' => 15000.00,
            'hra' => 7500.00,
            'conveyance' => 1600.00,
            'da' => 0.00,
            'medical_allowance' => 1250.00,
            'special_allowance' => 2000.00,
            'other_additions' => 0.00,
            'gross_total' => 27350.00,
            'employee_pf' => 1800.00,
            'employee_esi' => 0.00,
            'professional_tax' => 200.00,
            'lwf_deduction' => 20.00,
            'lop_deduction' => 0.00,
            'tds_deduction' => 0.00,
            'loan_emi_deduction' => 0.00,
            'net_pay' => 25330.00,
            'employer_pf' => 1950.00,
            'employer_epf' => 550.50,
            'employer_eps' => 1249.50,
            'employer_esi' => 0.00,
            'attendance_source' => 'uploaded',
            'is_excluded' => false,
        ]);

        $run->update(['status' => 'locked']);

        $response = $this->actingAs($this->adminUser)
            ->postJson(route('compliance.pf_ecr.preview'), [
                'payroll_run_id' => $run->id,
            ]);

        $response->assertStatus(200)
            ->assertJson([
                'success' => false,
                'status' => 'has_errors',
            ]);

        $this->assertStringContainsString('PF ECR cannot be generated', $response->json('errors.0'));
        $this->assertStringContainsString('Priya Patel', $response->json('errors.0'));
        $this->assertStringContainsString('TEC-002', $response->json('errors.0'));
        $this->assertStringContainsString('Missing Field: UAN', $response->json('errors.0'));
    }

    /** @test */
    public function pf_member_id_is_optional_and_does_not_block_ecr_generation()
    {
        $run = PayrollRun::create([
            'client_id' => $this->client->id,
            'payroll_month' => '2026-06-01',
            'status' => 'draft',
        ]);

        $empWithoutMemberId = Employee::factory()->create([
            'employee_code' => 'TEC-271',
            'client_id' => $this->client->id,
            'branch_id' => $this->branch->id,
            'full_name' => 'Mani K',
            'pf_applicable' => true,
            'eps_applicable' => true,
            'uan_number' => '101299887766',
            'pf_member_id' => null,
            'pan_number' => 'ABCDE2222F',
            'aadhaar_number' => '222233334444',
            'bank_account_number' => '999900002222',
        ]);

        PayrollRunItem::create([
            'payroll_run_id' => $run->id,
            'employee_id' => $empWithoutMemberId->id,
            'paid_days' => 30.00,
            'lop_days' => 0.00,
            'basic_pay' => 15000.00,
            'hra' => 7500.00,
            'conveyance' => 1600.00,
            'da' => 0.00,
            'medical_allowance' => 1250.00,
            'special_allowance' => 2000.00,
            'other_additions' => 0.00,
            'gross_total' => 27350.00,
            'employee_pf' => 1800.00,
            'employee_esi' => 0.00,
            'professional_tax' => 200.00,
            'lwf_deduction' => 20.00,
            'lop_deduction' => 0.00,
            'tds_deduction' => 0.00,
            'loan_emi_deduction' => 0.00,
            'net_pay' => 25330.00,
            'employer_pf' => 1950.00,
            'employer_epf' => 550.50,
            'employer_eps' => 1249.50,
            'employer_esi' => 0.00,
            'attendance_source' => 'uploaded',
            'is_excluded' => false,
        ]);

        $run->update(['status' => 'locked']);

        $response = $this->actingAs($this->adminUser)
            ->postJson(route('compliance.pf_ecr.preview'), [
                'payroll_run_id' => $run->id,
            ]);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'status' => 'validated',
            ]);
    }

    /** @test */
    public function epfo_remitted_difference_rounding_rule_15000_base_yields_1800_1250_550()
    {
        $run = PayrollRun::create([
            'client_id' => $this->client->id,
            'payroll_month' => '2026-06-01',
            'status' => 'draft',
        ]);

        $emp = Employee::factory()->create([
            'employee_code' => 'EMP003',
            'client_id' => $this->client->id,
            'branch_id' => $this->branch->id,
            'full_name' => 'Mani K',
            'date_of_birth' => '1992-05-15',
            'date_of_joining' => '2021-06-01',
            'basic_pay' => 15000,
            'da' => 0,
            'pf_applicable' => true,
            'eps_applicable' => true,
            'uan_number' => '101299887768',
            'pan_number' => 'ABCDE3333F',
            'aadhaar_number' => '333344445555',
            'bank_account_number' => '999900003333',
        ]);

        PayrollRunItem::create([
            'payroll_run_id' => $run->id,
            'employee_id' => $emp->id,
            'paid_days' => 30.00,
            'lop_days' => 0.00,
            'basic_pay' => 15000.00,
            'hra' => 7500.00,
            'conveyance' => 1600.00,
            'da' => 0.00,
            'medical_allowance' => 1250.00,
            'special_allowance' => 2000.00,
            'other_additions' => 0.00,
            'gross_total' => 27350.00,
            'employee_pf' => 1800.00,
            'employee_esi' => 0.00,
            'professional_tax' => 200.00,
            'lwf_deduction' => 20.00,
            'lop_deduction' => 0.00,
            'tds_deduction' => 0.00,
            'loan_emi_deduction' => 0.00,
            'net_pay' => 25330.00,
            'employer_pf' => 1950.00,
            'employer_epf' => 550.50, // DB unrounded value
            'employer_eps' => 1249.50, // DB unrounded value
            'employer_esi' => 0.00,
            'attendance_source' => 'uploaded',
            'is_excluded' => false,
        ]);

        $run->update(['status' => 'locked']);

        $response = $this->actingAs($this->adminUser)
            ->postJson(route('compliance.pf_ecr.generate'), [
                'payroll_run_id' => $run->id,
            ]);

        $response->assertStatus(200)->assertJson(['success' => true]);

        $batchId = $response->json('batch_id');
        $batch = PfEcrBatch::find($batchId);
        $content = Storage::disk('local')->get($batch->file_path);
        
        $lines = explode("\r\n", trim($content));
        $this->assertCount(1, $lines);

        $fields = explode('#~#', $lines[0]);
        $this->assertCount(11, $fields); // Exactly 11 fields!

        $eeEpf = (int)$fields[6];   // Field 7: EE EPF Remitted
        $epsEr = (int)$fields[7];   // Field 8: EPS ER Remitted
        $erEpf = (int)$fields[8];   // Field 9: EPF ER Remitted (remitted difference)

        $this->assertEquals(1800, $eeEpf);
        $this->assertEquals(1250, $epsEr);
        $this->assertEquals(550, $erEpf); // Exactly 1800 - 1250 = 550! NOT 551!

        // Critical Statutory Assertion: Field 8 + Field 9 == Field 7
        $this->assertEquals($eeEpf, $epsEr + $erEpf);
    }

    /** @test */
    public function remitted_difference_rule_across_multiple_employees_and_edge_cases()
    {
        $run = PayrollRun::create([
            'client_id' => $this->client->id,
            'payroll_month' => '2026-06-01',
            'status' => 'draft',
        ]);

        // Helper array for common run item columns
        $defaults = [
            'paid_days' => 30.00,
            'lop_days' => 0.00,
            'hra' => 0.00,
            'conveyance' => 0.00,
            'da' => 0.00,
            'medical_allowance' => 0.00,
            'special_allowance' => 0.00,
            'other_additions' => 0.00,
            'employee_esi' => 0.00,
            'professional_tax' => 0.00,
            'lwf_deduction' => 0.00,
            'lop_deduction' => 0.00,
            'tds_deduction' => 0.00,
            'loan_emi_deduction' => 0.00,
            'net_pay' => 0.00,
            'employer_pf' => 0.00,
            'employer_esi' => 0.00,
            'attendance_source' => 'uploaded',
            'is_excluded' => false,
        ];

        // Case 1: Standard 15k base with .50 EPS rounding (1800 / 1250 / 550)
        $emp1 = Employee::factory()->create([
            'employee_code' => 'EMP-01',
            'client_id' => $this->client->id,
            'branch_id' => $this->branch->id,
            'full_name' => 'Rahul Sharma',
            'date_of_birth' => '1990-01-01',
            'pf_applicable' => true,
            'eps_applicable' => true,
            'uan_number' => '101299887701',
            'pan_number' => 'ABCDE4444F',
            'aadhaar_number' => '444455556666',
            'bank_account_number' => '999900004444',
        ]);
        PayrollRunItem::create(array_merge($defaults, [
            'payroll_run_id' => $run->id,
            'employee_id' => $emp1->id,
            'basic_pay' => 15000.00,
            'gross_total' => 25000.00,
            'employee_pf' => 1800.00,
            'employer_epf' => 550.50,
            'employer_eps' => 1249.50,
        ]));

        // Case 2: 12000 basic without .50 rounding (Basic 12000 -> EE EPF 1440, EPS 999.60 -> 1000, ER EPF 440)
        $emp2 = Employee::factory()->create([
            'employee_code' => 'EMP-02',
            'client_id' => $this->client->id,
            'branch_id' => $this->branch->id,
            'full_name' => 'Sneha Verma',
            'date_of_birth' => '1995-03-20',
            'pf_applicable' => true,
            'eps_applicable' => true,
            'uan_number' => '101299887702',
            'pan_number' => 'ABCDE5555F',
            'aadhaar_number' => '555566667777',
            'bank_account_number' => '999900005555',
        ]);
        PayrollRunItem::create(array_merge($defaults, [
            'payroll_run_id' => $run->id,
            'employee_id' => $emp2->id,
            'basic_pay' => 12000.00,
            'gross_total' => 18000.00,
            'employee_pf' => 1440.00,
            'employer_epf' => 440.40,
            'employer_eps' => 999.60,
        ]));

        // Case 3: EPS not applicable (eps_applicable = false)
        $emp3 = Employee::factory()->create([
            'employee_code' => 'EMP-03',
            'client_id' => $this->client->id,
            'branch_id' => $this->branch->id,
            'full_name' => 'Vikram Singh',
            'date_of_birth' => '1988-07-11',
            'pf_applicable' => true,
            'eps_applicable' => false,
            'uan_number' => '101299887703',
            'pan_number' => 'ABCDE6666F',
            'aadhaar_number' => '666677778888',
            'bank_account_number' => '999900006666',
        ]);
        PayrollRunItem::create(array_merge($defaults, [
            'payroll_run_id' => $run->id,
            'employee_id' => $emp3->id,
            'basic_pay' => 15000.00,
            'gross_total' => 25000.00,
            'employee_pf' => 1800.00,
            'employer_epf' => 1800.00,
            'employer_eps' => 0.00,
        ]));

        // Case 4: Employee Age >= 58 (EPS cutoff)
        $emp4 = Employee::factory()->create([
            'employee_code' => 'EMP-04',
            'client_id' => $this->client->id,
            'branch_id' => $this->branch->id,
            'full_name' => 'Senior Member',
            'date_of_birth' => '1965-01-01',
            'pf_applicable' => true,
            'eps_applicable' => true,
            'uan_number' => '101299887704',
            'pan_number' => 'ABCDE7777F',
            'aadhaar_number' => '777788889999',
            'bank_account_number' => '999900007777',
        ]);
        PayrollRunItem::create(array_merge($defaults, [
            'payroll_run_id' => $run->id,
            'employee_id' => $emp4->id,
            'basic_pay' => 15000.00,
            'gross_total' => 25000.00,
            'employee_pf' => 1800.00,
            'employer_epf' => 1800.00,
            'employer_eps' => 0.00,
        ]));

        // Case 5: Full LOP / Zero Contribution
        $emp5 = Employee::factory()->create([
            'employee_code' => 'EMP-05',
            'client_id' => $this->client->id,
            'branch_id' => $this->branch->id,
            'full_name' => 'Absent Employee',
            'date_of_birth' => '1992-10-10',
            'pf_applicable' => true,
            'eps_applicable' => true,
            'uan_number' => '101299887705',
            'pan_number' => 'ABCDE8888F',
            'aadhaar_number' => '888899990000',
            'bank_account_number' => '999900008888',
        ]);
        PayrollRunItem::create(array_merge($defaults, [
            'payroll_run_id' => $run->id,
            'employee_id' => $emp5->id,
            'paid_days' => 0.00,
            'lop_days' => 30.00,
            'basic_pay' => 0.00,
            'gross_total' => 0.00,
            'employee_pf' => 0.00,
            'employer_epf' => 0.00,
            'employer_eps' => 0.00,
        ]));

        $run->update(['status' => 'locked']);

        $response = $this->actingAs($this->adminUser)
            ->postJson(route('compliance.pf_ecr.generate'), [
                'payroll_run_id' => $run->id,
            ]);

        $response->assertStatus(200)->assertJson(['success' => true]);

        $batch = PfEcrBatch::find($response->json('batch_id'));
        $content = Storage::disk('local')->get($batch->file_path);
        
        $lines = explode("\r\n", trim($content));
        $this->assertCount(5, $lines);

        foreach ($lines as $lineIndex => $rawLine) {
            $fields = explode('#~#', $rawLine);
            $this->assertCount(11, $fields, "Line {$lineIndex} does not contain 11 fields!");

            $eeEpf = (int)$fields[6];
            $epsEr = (int)$fields[7];
            $erEpf = (int)$fields[8];

            // Mandatory Line Reconciliation Assertion: Field 8 + Field 9 == Field 7
            $this->assertEquals($eeEpf, $epsEr + $erEpf, "Reconciliation failed on line {$lineIndex}: EE ({$eeEpf}) != EPS ({$epsEr}) + ER EPF ({$erEpf})");
        }

        // Check specific cases
        $row1 = explode('#~#', $lines[0]);
        $this->assertEquals(1800, (int)$row1[6]);
        $this->assertEquals(1250, (int)$row1[7]);
        $this->assertEquals(550, (int)$row1[8]); // 1800 - 1250 = 550

        $row2 = explode('#~#', $lines[1]);
        $this->assertEquals(1440, (int)$row2[6]);
        $this->assertEquals(1000, (int)$row2[7]);
        $this->assertEquals(440, (int)$row2[8]); // 1440 - 1000 = 440

        $row3 = explode('#~#', $lines[2]); // EPS False
        $this->assertEquals(1800, (int)$row3[6]);
        $this->assertEquals(0, (int)$row3[7]);
        $this->assertEquals(1800, (int)$row3[8]);

        $row4 = explode('#~#', $lines[3]); // Age 58+
        $this->assertEquals(1800, (int)$row4[6]);
        $this->assertEquals(0, (int)$row4[7]);
        $this->assertEquals(1800, (int)$row4[8]);

        $row5 = explode('#~#', $lines[4]); // Full LOP
        $this->assertEquals(0, (int)$row5[6]);
        $this->assertEquals(0, (int)$row5[7]);
        $this->assertEquals(0, (int)$row5[8]);
        $this->assertEquals(30, (int)$row5[9]); // 30 NCP Days
    }
}
