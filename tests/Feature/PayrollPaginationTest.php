<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use Tests\TestCase;
use App\Models\User;
use App\Models\Client;
use App\Models\ClientBranch;
use App\Models\Employee;
use App\Models\Invoice;
use App\Models\PayrollRun;
use App\Models\PayrollRunItem;
use App\Models\AttendanceRecord;
use Carbon\Carbon;
use Inertia\Testing\AssertableInertia as Assert;

class PayrollPaginationTest extends TestCase
{
    use RefreshDatabase;

    protected $admin;

    protected function setUp(): void
    {
        parent::setUp();
        $this->admin = User::factory()->create(['role' => 'admin', 'status' => 'active']);
    }

    public function test_invoices_list_paginates_correctly()
    {
        $client = Client::factory()->create(['status' => 'active']);
        $branch = ClientBranch::create([
            'client_id' => $client->id,
            'branch_name' => 'Test Branch',
            'state' => 'Test State',
            'gstin' => '12ABCDE3456F7GH'
        ]);
        
        $run = new PayrollRun();
        $run->client_id = $client->id;
        $run->payroll_month = '2026-07-01';
        $run->status = 'locked';
        $run->total_employees_processed = 25;
        $run->save();

        for ($i = 0; $i < 25; $i++) {
            $invoice = new Invoice();
            $invoice->payroll_run_id = $run->id;
            $invoice->client_id = $client->id;
            $invoice->branch_id = $branch->id;
            $invoice->invoice_number = 'INV-' . str_pad($i, 4, '0', STR_PAD_LEFT);
            $invoice->invoice_month = '2026-07-01';
            $invoice->status = 'draft';
            $invoice->due_date = '2026-07-15';
            $invoice->agency_gstin = '27AABCM1234N1ZQ';
            $invoice->branch_gstin = '12ABCDE3456F7GH';
            $invoice->place_of_supply_state = 'Maharashtra';
            $invoice->gst_type = 'cgst_sgst';
            $invoice->gross_salary_passthrough = 10000;
            $invoice->agency_service_fee = 1000;
            $invoice->gst_amount = 180;
            $invoice->grand_total = 11180;
            $invoice->save();
        }

        $response = $this->actingAs($this->admin)->get(route('invoices.index'));
        $response->assertStatus(200);

        $response->assertInertia(fn (Assert $page) => $page
            ->component('Invoicing/InvoicesList')
            ->has('invoices.data', 15) // Page 1 length
            ->where('invoices.total', 25)
        );

        $responsePage2 = $this->actingAs($this->admin)->get(route('invoices.index', ['page' => 2]));
        $responsePage2->assertInertia(fn (Assert $page) => $page
            ->component('Invoicing/InvoicesList')
            ->has('invoices.data', 10) // Page 2 length
        );
    }

    public function test_payslips_paginates_correctly()
    {
        $client = Client::factory()->create(['status' => 'active']);
        
        $run = new PayrollRun();
        $run->client_id = $client->id;
        $run->payroll_month = '2026-07-01';
        $run->status = 'draft';
        $run->total_employees_processed = 25;
        $run->save();

        $branch = ClientBranch::create([
            'client_id' => $client->id,
            'branch_name' => 'Test Branch',
            'state' => 'Test State',
            'gstin' => '12ABCDE3456F7GH'
        ]);

        for ($i = 0; $i < 25; $i++) {
            $emp = Employee::factory()->create([
                'client_id' => $client->id, 
                'branch_id' => $branch->id,
                'bank_account_number' => 'ACC' . str_pad($i, 10, '0', STR_PAD_LEFT),
                'pan_number' => 'ABCDE' . str_pad($i, 4, '0', STR_PAD_LEFT) . 'A',
                'aadhaar_number' => '12341234' . str_pad($i, 4, '0', STR_PAD_LEFT),
            ]);
            $item = new PayrollRunItem();
            $item->payroll_run_id = $run->id;
            $item->employee_id = $emp->id;
            $item->paid_days = 30;
            $item->lop_days = 0;
            $item->basic_pay = 25000;
            $item->hra = 10000;
            $item->conveyance = 1000;
            $item->da = 0;
            $item->medical_allowance = 0;
            $item->special_allowance = 0;
            $item->other_additions = 0;
            $item->gross_total = 36000;
            $item->employee_pf = 1800;
            $item->employee_esi = 0;
            $item->professional_tax = 200;
            $item->lwf_deduction = 0;
            $item->lop_deduction = 0;
            $item->tds_deduction = 0;
            $item->loan_emi_deduction = 0;
            $item->net_pay = 34000;
            $item->employer_pf = 1950;
            $item->employer_esi = 0;
            $item->employer_lwf = 0;
            $item->is_excluded = false;
            $item->attendance_source = 'live_punch';
            $item->save();
        }

        $run->status = 'locked';
        $run->save();

        $response = $this->actingAs($this->admin)->get(route('payroll.payslips', ['client_id' => $client->id, 'payroll_month' => '2026-07-01']));
        $response->assertStatus(200);

        $response->assertInertia(fn (Assert $page) => $page
            ->component('Payroll/Payslip')
            ->has('items.data', 15)
            ->where('items.total', 25)
        );

        $responsePage2 = $this->actingAs($this->admin)->get(route('payroll.payslips', ['client_id' => $client->id, 'payroll_month' => '2026-07-01', 'page' => 2]));
        $responsePage2->assertInertia(fn (Assert $page) => $page
            ->component('Payroll/Payslip')
            ->has('items.data', 10)
        );
    }

    public function test_live_monitor_paginates_correctly_without_client_filter()
    {
        // Crucial danger test: Seed 25+ employees across MULTIPLE clients. No client filter selected.
        for ($i = 0; $i < 30; $i++) {
            $client = Client::factory()->create(['status' => 'active']);
            $branch = ClientBranch::create([
                'client_id' => $client->id,
                'branch_name' => 'Test Branch',
                'state' => 'Test State',
                'gstin' => '12ABCDE3456F7GH'
            ]);
            $emp = Employee::factory()->create([
                'client_id' => $client->id, 
                'branch_id' => $branch->id, 
                'status' => 'active',
                'bank_account_number' => 'LMACC' . str_pad($i, 8, '0', STR_PAD_LEFT),
                'pan_number' => 'LMCDE' . str_pad($i, 4, '0', STR_PAD_LEFT) . 'A',
                'aadhaar_number' => '99991234' . str_pad($i, 4, '0', STR_PAD_LEFT),
            ]);
            
            $record = new AttendanceRecord();
            $record->employee_id = $emp->id;
            $record->attendance_date = Carbon::today()->toDateString();
            $record->status = 'present';
            $record->punch_in_time = Carbon::today()->setTime(9, 0, 0);
            $record->save();
        }

        // Hit the live monitor route without passing client_id
        $response = $this->actingAs($this->admin)->get(route('payroll.live-monitor'));
        $response->assertStatus(200);

        $response->assertInertia(fn (Assert $page) => $page
            ->component('Payroll/LiveAttendanceMonitor')
            ->has('punches.data', 20) // Live monitor paginates at 20
            ->where('punches.total', 30)
        );

        // Page 2
        $responsePage2 = $this->actingAs($this->admin)->get(route('payroll.live-monitor', ['page' => 2]));
        $responsePage2->assertInertia(fn (Assert $page) => $page
            ->component('Payroll/LiveAttendanceMonitor')
            ->has('punches.data', 10)
        );
    }
}
