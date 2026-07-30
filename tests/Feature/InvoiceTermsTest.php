<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use App\Models\Client;
use App\Models\ClientBranch;
use App\Models\PayrollRun;
use App\Models\PayrollRunItem;
use App\Models\Employee;
use App\Models\Invoice;
use App\Services\InvoiceGenerationService;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class InvoiceTermsTest extends TestCase
{
    use RefreshDatabase;

    protected $client;
    protected $branch;
    protected $payrollRun;
    protected $employee;
    protected $service;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(\Database\Seeders\PtSlabSeeder::class);

        // Seed agency GSTIN
        DB::table('settings')->updateOrInsert(
            ['group' => 'company_profile', 'key' => 'agency_gstin'],
            ['value' => '27AABCM1234N1ZQ', 'type' => 'string']
        );

        $this->client = Client::factory()->create([
            'status' => 'active',
            'billing_model' => 'fixed_per_month',
            'fixed_fee_amount' => 1000.00,
            'gstin' => '27AABCT1234L1ZQ',
        ]);

        $this->branch = ClientBranch::create([
            'client_id' => $this->client->id,
            'branch_name' => 'HQ Branch',
            'gstin' => '27AABCT1234L1ZQ',
        ]);

        $this->employee = Employee::factory()->create([
            'client_id' => $this->client->id,
            'branch_id' => $this->branch->id,
            'basic_pay' => 10000.00,
            'hra' => 5000.00,
            'conveyance' => 0,
            'da' => 0,
            'medical_allowance' => 0,
            'special_allowance' => 0,
            'other_additions' => 0,
            'uan_mode' => 'new',
        ]);

        $this->payrollRun = PayrollRun::create([
            'client_id' => $this->client->id,
            'payroll_month' => '2026-07-01',
            'status' => 'draft',
        ]);

        PayrollRunItem::create([
            'payroll_run_id' => $this->payrollRun->id,
            'employee_id' => $this->employee->id,
            'paid_days' => 30,
            'lop_days' => 0,
            'basic_pay' => 10000.00,
            'hra' => 5000.00,
            'conveyance' => 0,
            'da' => 0,
            'medical_allowance' => 0,
            'special_allowance' => 0,
            'other_additions' => 0,
            'gross_total' => 15000.00,
            'employee_pf' => 0,
            'employee_esi' => 0,
            'professional_tax' => 0,
            'lwf_deduction' => 0,
            'lop_deduction' => 0,
            'tds_deduction' => 0,
            'loan_emi_deduction' => 0,
            'net_pay' => 13000.00,
            'employer_pf' => 0,
            'employer_esi' => 0,
            'is_excluded' => false,
            'employer_lwf' => 0,
            'deferred_loan_amount' => 0,
            'attendance_source' => 'live_punch',
        ]);

        $this->payrollRun->update(['status' => 'approved']);

        $this->service = new InvoiceGenerationService();
    }

    /**
     * Test 1: payment_net_terms = net30 correctly calculates due_date.
     */
    public function test_due_date_calculated_with_payment_net_terms_30()
    {
        $this->client->update(['payment_net_terms' => 'net30']);

        $invoices = $this->service->generateForRun($this->payrollRun);
        $this->assertCount(1, $invoices);
        
        $expected = Carbon::now()->addDays(30)->toDateString();
        $this->assertEquals($expected, $invoices[0]->due_date);
    }

    /**
     * Test 2: payment_net_terms = immediate correctly calculates due_date.
     */
    public function test_due_date_calculated_with_payment_net_terms_immediate()
    {
        $this->client->update(['payment_net_terms' => 'immediate']);

        $invoices = $this->service->generateForRun($this->payrollRun);
        $this->assertCount(1, $invoices);
        
        $expected = Carbon::now()->toDateString();
        $this->assertEquals($expected, $invoices[0]->due_date);
    }

    /**
     * Test 3: payment_net_terms = null defaults due_date to 30 days offset.
     */
    public function test_due_date_fallback_when_payment_net_terms_null()
    {
        $this->client->update(['payment_net_terms' => null]);

        $invoices = $this->service->generateForRun($this->payrollRun);
        $this->assertCount(1, $invoices);
        
        $expected = Carbon::now()->addDays(30)->toDateString();
        $this->assertEquals($expected, $invoices[0]->due_date);
    }

    /**
     * Test 4: invoice_cycle and invoice_raise_day changes have absolutely no effect on due_date.
     * We will check 3 different combinations and verify the outputs are identical.
     */
    public function test_invoice_cycle_and_raise_day_have_no_effect_on_due_date()
    {
        $combinations = [
            ['cycle' => 'weekly', 'raise_day' => '1'],
            ['cycle' => 'quarterly', 'raise_day' => '15'],
            ['cycle' => 'monthly', 'raise_day' => '28'],
        ];

        $expectedDueDate = Carbon::now()->addDays(15)->toDateString();

        foreach ($combinations as $combo) {
            // Reset DB invoices so generateForRun creates a new one each time
            Invoice::query()->delete();

            $this->client->update([
                'payment_net_terms' => 'net15',
                'invoice_cycle' => $combo['cycle'],
                'invoice_raise_day' => $combo['raise_day'],
            ]);

            $invoices = $this->service->generateForRun($this->payrollRun);
            $this->assertCount(1, $invoices);
            
            // Assert due_date is byte-for-byte identical to creation_date + 15 days
            $this->assertEquals($expectedDueDate, $invoices[0]->due_date);
        }
    }
}
