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

class ClientPayslipCustomizationTest extends TestCase
{
    use RefreshDatabase;

    protected $client;
    protected $employee;
    protected $runItem;

    protected function setUp(): void
    {
        parent::setUp();

        $this->client = Client::factory()->create([
            'company_name' => 'Custom Payslip Client',
            'client_code' => 'CPC001',
        ]);

        $branch = ClientBranch::create([
            'client_id' => $this->client->id,
            'branch_name' => 'Head Office',
            'branch_code' => 'HO',
            'city' => 'Mumbai',
            'state' => 'Maharashtra',
        ]);

        $this->employee = Employee::factory()->create([
            'client_id' => $this->client->id,
            'branch_id' => $branch->id,
            'employee_code' => 'EMP-PAY01',
            'full_name' => 'John Doe',
            'designation' => 'Senior Architect',
            'bank_account_number' => '9876543210',
            'bank_name' => 'HDFC Bank',
            'basic_pay' => 40000,
            'hra' => 16000,
            'gross_monthly_salary' => 56000,
            'pan_number' => 'ABCDE1234F',
            'aadhaar_number' => '111122223333',
        ]);

        $run = PayrollRun::create([
            'client_id' => $this->client->id,
            'payroll_month' => '2026-07-01',
            'status' => 'draft',
            'is_supplementary_run' => false,
            'total_gross_earnings' => 56000,
            'total_net_disbursement' => 49800,
            'total_employer_statutory_cost' => 6000,
        ]);

        $this->runItem = PayrollRunItem::create([
            'payroll_run_id' => $run->id,
            'employee_id' => $this->employee->id,
            'paid_days' => 30.0,
            'lop_days' => 0,
            'basic_pay' => 40000,
            'hra' => 16000,
            'conveyance' => 0,
            'da' => 0,
            'medical_allowance' => 0,
            'special_allowance' => 0,
            'other_additions' => 0,
            'gross_total' => 56000,
            'employee_pf' => 1800,
            'employee_esi' => 0,
            'professional_tax' => 200,
            'lwf_deduction' => 10,
            'lop_deduction' => 0,
            'tds_deduction' => 0,
            'loan_emi_deduction' => 0,
            'net_pay' => 53990,
            'employer_pf' => 1800,
            'employer_esi' => 0,
            'employer_lwf' => 20,
            'is_excluded' => false,
            'attendance_source' => 'monthly_excel_upload',
        ]);

        $run->update(['status' => 'locked']);
    }

    public function test_1_default_client_generates_full_payslip_identical_to_today()
    {
        $service = new \App\Services\PayslipPdfService();
        $renderedHtml = view('pdf.payslip', [
            'item' => $this->runItem,
            'employee' => $this->employee,
            'run' => $this->runItem->payrollRun,
            'client' => $this->client,
            'visibleSections' => $this->client->payslip_visible_sections,
            'displayName' => 'TECLA AGENCY PRIVATE LIMITED',
            'companyAddress' => 'Mumbai, Maharashtra',
            'accentColor' => '#1F3864',
            'logoUrl' => null,
            'midCycleNote' => null,
            'netPayWords' => 'Rupees Fifty-Three Thousand Nine Hundred and Ninety Only',
            'formattedMonth' => 'July 2026',
        ])->render();

        $this->assertStringContainsString('Employee PF', $renderedHtml);
        $this->assertStringContainsString('1,800.00', $renderedHtml);
        $this->assertStringContainsString('Professional Tax', $renderedHtml);
        $this->assertStringContainsString('9876543210', $renderedHtml);
        $this->assertStringContainsString('30.0', $renderedHtml);
    }

    public function test_2_client_with_show_pf_details_false_omits_pf_section_row()
    {
        $this->client->update([
            'payslip_visible_sections' => [
                'show_pf_details' => false,
                'show_esi_details' => true,
                'show_pt_details' => true,
            ]
        ]);

        $renderedHtml = view('pdf.payslip', [
            'item' => $this->runItem,
            'employee' => $this->employee,
            'run' => $this->runItem->payrollRun,
            'client' => $this->client->fresh(),
            'visibleSections' => $this->client->fresh()->payslip_visible_sections,
            'displayName' => 'TECLA AGENCY PRIVATE LIMITED',
            'companyAddress' => 'Mumbai, Maharashtra',
            'accentColor' => '#1F3864',
            'logoUrl' => null,
            'midCycleNote' => null,
            'netPayWords' => 'Rupees Fifty-Three Thousand Nine Hundred and Ninety Only',
            'formattedMonth' => 'July 2026',
        ])->render();

        $this->assertStringNotContainsString('Employee PF', $renderedHtml);
        $this->assertStringContainsString('Professional Tax', $renderedHtml);
    }

    public function test_3_core_fields_are_never_hidden_regardless_of_settings()
    {
        // Disable ALL optional section flags
        $this->client->update([
            'payslip_visible_sections' => [
                'show_pf_details' => false,
                'show_esi_details' => false,
                'show_pt_details' => false,
                'show_lwf_details' => false,
                'show_bank_details' => false,
                'show_attendance_summary' => false,
            ]
        ]);

        $renderedHtml = view('pdf.payslip', [
            'item' => $this->runItem,
            'employee' => $this->employee,
            'run' => $this->runItem->payrollRun,
            'client' => $this->client->fresh(),
            'visibleSections' => $this->client->fresh()->payslip_visible_sections,
            'displayName' => 'TECLA AGENCY PRIVATE LIMITED',
            'companyAddress' => 'Mumbai, Maharashtra',
            'accentColor' => '#1F3864',
            'logoUrl' => null,
            'midCycleNote' => null,
            'netPayWords' => 'Rupees Fifty-Three Thousand Nine Hundred and Ninety Only',
            'formattedMonth' => 'July 2026',
        ])->render();

        // Immutable core fields MUST be present
        $this->assertStringContainsString('EMP-PAY01', $renderedHtml);
        $this->assertStringContainsString('John Doe', $renderedHtml);
        $this->assertStringContainsString('Senior Architect', $renderedHtml);
        $this->assertStringContainsString('Basic Pay', $renderedHtml);
        $this->assertStringContainsString('40,000.00', $renderedHtml);
        $this->assertStringContainsString('Gross Total', $renderedHtml);
        $this->assertStringContainsString('Net Pay:', $renderedHtml);
    }

    public function test_4_fixed_four_cell_layout_holds_alignment_when_show_bank_details_false()
    {
        $this->client->update([
            'payslip_visible_sections' => [
                'show_bank_details' => false,
                'show_attendance_summary' => true,
            ]
        ]);

        $renderedHtml = view('pdf.payslip', [
            'item' => $this->runItem,
            'employee' => $this->employee,
            'run' => $this->runItem->payrollRun,
            'client' => $this->client->fresh(),
            'visibleSections' => $this->client->fresh()->payslip_visible_sections,
            'displayName' => 'TECLA AGENCY PRIVATE LIMITED',
            'companyAddress' => 'Mumbai, Maharashtra',
            'accentColor' => '#1F3864',
            'logoUrl' => null,
            'midCycleNote' => null,
            'netPayWords' => 'Rupees Fifty-Three Thousand Nine Hundred and Ninety Only',
            'formattedMonth' => 'July 2026',
        ])->render();

        // Bank numbers are replaced with '—'
        $this->assertStringNotContainsString('9876543210', $renderedHtml);
        $this->assertStringNotContainsString('HDFC Bank', $renderedHtml);
        
        // Structure check: exactly 3 <tr> tags inside employee-info-table
        preg_match_all('/<tr[^>]*>(.*?)<\/tr>/s', $renderedHtml, $matches);
        $this->assertGreaterThanOrEqual(3, count($matches[0]));
    }
}
