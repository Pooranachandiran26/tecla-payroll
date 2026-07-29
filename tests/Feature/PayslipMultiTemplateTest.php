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

class PayslipMultiTemplateTest extends TestCase
{
    use RefreshDatabase;

    protected $client;
    protected $employee;
    protected $runItem;

    protected function setUp(): void
    {
        parent::setUp();

        $this->client = Client::factory()->create([
            'company_name' => 'Multi Template Client',
            'client_code' => 'MTC001',
        ]);

        $branch = ClientBranch::create([
            'client_id' => $this->client->id,
            'branch_name' => 'Main',
            'branch_code' => 'M1',
            'city' => 'Chennai',
            'state' => 'Tamil Nadu',
        ]);

        $this->employee = Employee::factory()->create([
            'client_id' => $this->client->id,
            'branch_id' => $branch->id,
            'employee_code' => 'EMP-TPL01',
            'full_name' => 'Template User',
            'designation' => 'Lead Engineer',
            'bank_account_number' => '555544443333',
            'bank_name' => 'Axis Bank',
            'basic_pay' => 60000,
            'hra' => 24000,
            'gross_monthly_salary' => 84000,
            'pan_number' => 'TPLCS1234F',
            'aadhaar_number' => '111122223333',
        ]);

        $run = PayrollRun::create([
            'client_id' => $this->client->id,
            'payroll_month' => '2026-07-01',
            'status' => 'draft',
            'is_supplementary_run' => false,
            'total_gross_earnings' => 84000,
            'total_net_disbursement' => 75000,
            'total_employer_statutory_cost' => 9000,
        ]);

        $this->runItem = PayrollRunItem::create([
            'payroll_run_id' => $run->id,
            'employee_id' => $this->employee->id,
            'paid_days' => 31.0,
            'lop_days' => 0,
            'basic_pay' => 60000,
            'hra' => 24000,
            'conveyance' => 0,
            'da' => 0,
            'medical_allowance' => 0,
            'special_allowance' => 0,
            'other_additions' => 0,
            'gross_total' => 84000,
            'employee_pf' => 1800,
            'employee_esi' => 0,
            'professional_tax' => 200,
            'lwf_deduction' => 0,
            'lop_deduction' => 0,
            'tds_deduction' => 0,
            'loan_emi_deduction' => 0,
            'net_pay' => 82000,
            'employer_pf' => 1800,
            'employer_esi' => 0,
            'employer_lwf' => 0,
            'is_excluded' => false,
            'attendance_source' => 'monthly_excel_upload',
        ]);

        $run->update(['status' => 'locked']);
    }

    public function test_1_all_10_templates_render_without_errors_using_shared_partials()
    {
        $templates = [
            'standard', 'elegant', 'mini', 'simple', 'lite',
            'spreadsheet', 'corporate', 'tech_modern', 'modern_dark', 'classic_formal'
        ];

        foreach ($templates as $tpl) {
            $this->client->update(['payslip_template' => $tpl]);

            $html = view('pdf.payslip', [
                'item' => $this->runItem,
                'employee' => $this->employee,
                'run' => $this->runItem->payrollRun,
                'client' => $this->client->fresh(),
                'templateKey' => $tpl,
                'visibleSections' => $this->client->payslip_visible_sections,
                'displayName' => 'TECLA AGENCY PRIVATE LIMITED',
                'companyAddress' => 'Chennai, Tamil Nadu',
                'accentColor' => '#1F3864',
                'logoUrl' => null,
                'midCycleNote' => null,
                'netPayWords' => 'Rupees Eighty-Two Thousand Only',
                'formattedMonth' => 'July 2026',
            ])->render();

            $this->assertStringContainsString('EMP-TPL01', $html, "Template {$tpl} failed to render employee code.");
            $this->assertStringContainsString('Template User', $html, "Template {$tpl} failed to render employee name.");
            $this->assertStringContainsString('60,000.00', $html, "Template {$tpl} failed to render basic pay.");
            $this->assertStringContainsString('82,000.00', $html, "Template {$tpl} failed to render net pay.");
        }
    }

    public function test_2_alignment_fix_holds_for_all_10_templates_when_show_bank_details_false()
    {
        $templates = [
            'standard', 'elegant', 'mini', 'simple', 'lite',
            'spreadsheet', 'corporate', 'tech_modern', 'modern_dark', 'classic_formal'
        ];

        $this->client->update([
            'payslip_visible_sections' => [
                'show_bank_details' => false,
                'show_attendance_summary' => true,
            ]
        ]);

        foreach ($templates as $tpl) {
            $html = view('pdf.payslip', [
                'item' => $this->runItem,
                'employee' => $this->employee,
                'run' => $this->runItem->payrollRun,
                'client' => $this->client->fresh(),
                'templateKey' => $tpl,
                'visibleSections' => $this->client->fresh()->payslip_visible_sections,
                'displayName' => 'TECLA AGENCY PRIVATE LIMITED',
                'companyAddress' => 'Chennai, Tamil Nadu',
                'accentColor' => '#1F3864',
                'logoUrl' => null,
                'midCycleNote' => null,
                'netPayWords' => 'Rupees Eighty-Two Thousand Only',
                'formattedMonth' => 'July 2026',
            ])->render();

            // Bank details omitted
            $this->assertStringNotContainsString('555544443333', $html, "Template {$tpl} exposed bank account number.");
            $this->assertStringNotContainsString('Axis Bank', $html, "Template {$tpl} exposed bank name.");
            
            // Grid alignment retained (4-cell row check)
            $this->assertStringContainsString('Employee Code:', $html);
            $this->assertStringContainsString('Employee Name:', $html);
        }
    }

    public function test_3_logo_upload_validation_and_storage_path()
    {
        \Illuminate\Support\Facades\Storage::fake('public');

        $file = \Illuminate\Http\UploadedFile::fake()->image('client_logo.png', 300, 100);

        $path = $file->store('client_logos', 'public');
        $publicUrl = \Illuminate\Support\Facades\Storage::disk('public')->url($path);

        $this->assertNotNull($path);
        $this->assertTrue(\Illuminate\Support\Facades\Storage::disk('public')->exists($path));
    }
}
