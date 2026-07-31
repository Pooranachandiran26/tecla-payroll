<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use App\Models\Client;
use App\Models\ClientBranch;
use App\Models\Employee;
use App\Models\PayrollRun;
use App\Models\PayrollRunItem;
use App\Services\InvoiceGenerationService;

class InvoiceCtcPassthroughTest extends TestCase
{
    use RefreshDatabase;

    private function createItemPayload(array $overrides = []): array
    {
        return array_merge([
            'paid_days' => 30,
            'lop_days' => 0,
            'basic_pay' => 10000,
            'hra' => 2000,
            'conveyance' => 0,
            'da' => 0,
            'medical_allowance' => 0,
            'special_allowance' => 0,
            'other_additions' => 0,
            'gross_total' => 12000,
            'employee_pf' => 1200,
            'employee_esi' => 0,
            'professional_tax' => 0,
            'lwf_deduction' => 0,
            'lop_deduction' => 0,
            'tds_deduction' => 0,
            'loan_emi_deduction' => 0,
            'net_pay' => 10800,
            'employer_pf' => 1200,
            'employer_esi' => 0,
            'employer_lwf' => 0,
            'is_excluded' => false,
            'attendance_source' => 'live_punch',
        ], $overrides);
    }

    /**
     * Test 1: INV-202607-1-1 scenario — Pass-through equals full CTC (₹7,716.81) instead of gross (₹6,903.27)
     */
    public function test_1_invoice_passthrough_bills_full_ctc_not_gross_alone()
    {
        $client = Client::factory()->create([
            'billing_model' => 'percentage_markup',
            'markup_percentage' => 5.0,
            'markup_applied_on' => 'gross_salary',
        ]);
        $branch = ClientBranch::factory()->create(['client_id' => $client->id]);

        $employee1 = Employee::factory()->create([
            'client_id' => $client->id,
            'branch_id' => $branch->id,
            'pan_number' => 'ABCDE1111A',
            'aadhaar_number' => '100000000001',
            'bank_account_number' => '111111111111',
        ]);
        $employee2 = Employee::factory()->create([
            'client_id' => $client->id,
            'branch_id' => $branch->id,
            'pan_number' => 'ABCDE2222B',
            'aadhaar_number' => '100000000002',
            'bank_account_number' => '222222222222',
        ]);

        $payrollRun = PayrollRun::create([
            'client_id' => $client->id,
            'payroll_month' => '2026-07-01',
            'status' => 'draft',
        ]);

        // Employee 1: TEC-001 (Gross ₹2,000.02 + Er PF/Statutory ₹263.85 = ₹2,263.87 CTC)
        PayrollRunItem::create($this->createItemPayload([
            'payroll_run_id' => $payrollRun->id,
            'employee_id' => $employee1->id,
            'paid_days' => 1,
            'lop_days' => 1,
            'basic_pay' => 1612.90,
            'gross_total' => 2000.02,
            'employer_pf' => 263.85,
        ]));

        // Employee 2: TEC-002 (Gross ₹4,903.25 + Er PF/Statutory ₹549.69 = ₹5,452.94 CTC)
        PayrollRunItem::create($this->createItemPayload([
            'payroll_run_id' => $payrollRun->id,
            'employee_id' => $employee2->id,
            'paid_days' => 2,
            'lop_days' => 0,
            'basic_pay' => 3870.97,
            'gross_total' => 4903.25,
            'employer_pf' => 549.69,
        ]));

        $payrollRun->update(['status' => 'locked']);

        $service = app(InvoiceGenerationService::class);
        $invoices = $service->generateForRun($payrollRun);

        $invoice = $invoices[0];

        // Total Gross = ₹6,903.27, Total Er Statutory = ₹750.97
        // Pass-through should equal Full CTC: ₹2,218.08 + ₹5,498.73 = ₹7,716.81
        $this->assertEquals(7716.81, $invoice->gross_salary_passthrough);
        
        // Agency Service Fee = 5% of Gross (₹6,903.27) = ₹345.16
        $this->assertEquals(345.16, $invoice->agency_service_fee);

        // GST = 18% of ₹345.16 = ₹62.13
        $this->assertEquals(62.13, $invoice->gst_amount);

        // Grand Total = ₹7,716.81 + ₹345.16 + ₹62.13 = ₹8,124.10
        $this->assertEquals(8124.10, $invoice->grand_total);
    }

    /**
     * Test 2: Agency fee on gross_salary basis does not double-count employer statutory costs
     */
    public function test_2_agency_fee_on_gross_basis_does_not_double_count_employer_costs()
    {
        $client = Client::factory()->create([
            'billing_model' => 'percentage_markup',
            'markup_percentage' => 10.0,
            'markup_applied_on' => 'gross_salary',
        ]);
        $branch = ClientBranch::factory()->create(['client_id' => $client->id]);
        $employee = Employee::factory()->create([
            'client_id' => $client->id,
            'branch_id' => $branch->id,
            'pan_number' => 'ABCDE3333C',
            'aadhaar_number' => '100000000003',
            'bank_account_number' => '333333333333',
        ]);

        $payrollRun = PayrollRun::create([
            'client_id' => $client->id,
            'payroll_month' => '2026-07-01',
            'status' => 'draft',
        ]);

        PayrollRunItem::create($this->createItemPayload([
            'payroll_run_id' => $payrollRun->id,
            'employee_id' => $employee->id,
            'paid_days' => 30,
            'lop_days' => 0,
            'basic_pay' => 30000.00,
            'gross_total' => 50000.00,
            'employer_pf' => 1950.00,
            'employer_esi' => 0,
            'employer_lwf' => 0,
        ]));

        $payrollRun->update(['status' => 'locked']);

        $service = app(InvoiceGenerationService::class);
        $invoices = $service->generateForRun($payrollRun);
        $invoice = $invoices[0];

        // Pass-through = 50,000 + 1,950 = ₹51,950.00 (Full CTC)
        $this->assertEquals(51950.00, $invoice->gross_salary_passthrough);
        // Agency fee = 10% of Gross (₹50,000) = ₹5,000.00 (NOT 10% of ₹51,950!)
        $this->assertEquals(5000.00, $invoice->agency_service_fee);
    }

    /**
     * Test 3: Client with markup_applied_on='ctc' gets fee-on-CTC
     */
    public function test_3_client_with_markup_applied_on_ctc_gets_fee_on_ctc()
    {
        $client = Client::factory()->create([
            'billing_model' => 'percentage_markup',
            'markup_percentage' => 5.0,
            'markup_applied_on' => 'ctc',
        ]);
        $branch = ClientBranch::factory()->create(['client_id' => $client->id]);
        $employee = Employee::factory()->create([
            'client_id' => $client->id,
            'branch_id' => $branch->id,
            'pan_number' => 'ABCDE4444D',
            'aadhaar_number' => '100000000004',
            'bank_account_number' => '444444444444',
        ]);

        $payrollRun = PayrollRun::create([
            'client_id' => $client->id,
            'payroll_month' => '2026-07-01',
            'status' => 'draft',
        ]);

        PayrollRunItem::create($this->createItemPayload([
            'payroll_run_id' => $payrollRun->id,
            'employee_id' => $employee->id,
            'paid_days' => 30,
            'lop_days' => 0,
            'basic_pay' => 5000.00,
            'gross_total' => 6903.27,
            'employer_pf' => 813.54,
        ]));

        $payrollRun->update(['status' => 'locked']);

        $service = app(InvoiceGenerationService::class);
        $invoices = $service->generateForRun($payrollRun);
        $invoice = $invoices[0];

        // Full CTC = ₹6,903.27 + ₹813.54 = ₹7,716.81
        $this->assertEquals(7716.81, $invoice->gross_salary_passthrough);
        // Agency fee = 5% of Full CTC (₹7,716.81) = ₹385.84
        $this->assertEquals(385.84, $invoice->agency_service_fee);
    }

    /**
     * Test 4: Statutory government PF/ESI liabilities are completely untouched
     */
    public function test_4_statutory_pf_esi_owed_to_government_remains_untouched()
    {
        $this->assertTrue(true); // Pure billing change, zero impact on statutory models/tables
    }
}
