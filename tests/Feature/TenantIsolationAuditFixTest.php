<?php

namespace Tests\Feature;

use App\Models\Client;
use App\Models\Employee;
use App\Models\EmployeeLoan;
use App\Models\EmployeeTaxDeclaration;
use App\Models\Holiday;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TenantIsolationAuditFixTest extends TestCase
{
    use RefreshDatabase;

    private $companyA;
    private $companyB;
    private $managerA;
    private $managerNoAssignment;
    private $admin;
    private $employeeA;
    private $employeeB;

    protected function setUp(): void
    {
        parent::setUp();

        $this->companyA = Client::factory()->create(['company_name' => 'Company A', 'status' => 'active']);
        $branchA = \App\Models\ClientBranch::factory()->create(['client_id' => $this->companyA->id, 'is_head_office' => true]);

        $this->companyB = Client::factory()->create(['company_name' => 'Company B', 'status' => 'active']);
        $branchB = \App\Models\ClientBranch::factory()->create(['client_id' => $this->companyB->id, 'is_head_office' => true]);

        $this->employeeA = Employee::factory()->create([
            'client_id' => $this->companyA->id,
            'branch_id' => $branchA->id,
            'status' => 'active',
            'pan_number' => 'ABCDE1234F',
            'aadhaar_number' => '123456789012',
            'bank_account_number' => '1234567890',
            'personal_email' => 'empA@example.com'
        ]);
        $this->employeeB = Employee::factory()->create([
            'client_id' => $this->companyB->id,
            'branch_id' => $branchB->id,
            'status' => 'active',
            'pan_number' => 'FGHIJ5678K',
            'aadhaar_number' => '987654321098',
            'bank_account_number' => '0987654321',
            'personal_email' => 'empB@example.com'
        ]);

        $this->managerA = User::factory()->create([
            // 'admin' is included because the live 'compliance/mark-filed' route is
            // actually gated by module:admin (a duplicate route-name registration in
            // routes/web.php silently overrides the intended module:compliance gate —
            // see final report). Without it, markFiled() 403s before the tenant check
            // ever runs, for every manager regardless of company.
            'role' => 'manager',
            'module_permissions' => ['candidates', 'clients', 'compliance', 'admin']
        ]);
        $this->managerA->managedClients()->attach($this->companyA->id);

        $this->managerNoAssignment = User::factory()->create([
            'role' => 'manager',
            'module_permissions' => ['candidates', 'clients', 'compliance', 'admin']
        ]);

        $this->admin = User::factory()->create([
            'role' => 'admin',
        ]);
    }

    public function test_manager_a_can_access_company_a_loans()
    {
        $response = $this->actingAs($this->managerA)
            ->get("/employees/{$this->employeeA->id}/loans");
        $response->assertStatus(200);
    }

    public function test_manager_a_cannot_access_company_b_loans()
    {
        $response = $this->actingAs($this->managerA)
            ->get("/employees/{$this->employeeB->id}/loans");
        $response->assertStatus(403);
    }

    public function test_manager_a_cannot_create_company_b_loans()
    {
        $response = $this->actingAs($this->managerA)
            ->post("/employees/{$this->employeeB->id}/loans", [
                'loan_type' => 'salary_advance',
                'principal_amount' => 1000,
                'monthly_emi' => 100,
                'start_date' => now()->toDateString()
            ]);
        $response->assertStatus(403);
    }

    public function test_manager_a_cannot_update_company_b_loans()
    {
        $loanB = EmployeeLoan::create([
            'employee_id' => $this->employeeB->id,
            'loan_number' => 'LN-B-001',
            'loan_type' => 'salary_advance',
            'principal_amount' => 1000,
            'monthly_emi' => 100,
            'total_repaid' => 0,
            'remaining_balance' => 1000,
            'start_date' => now()->toDateString(),
            'status' => 'active',
            'created_by' => $this->admin->id,
            'updated_by' => $this->admin->id,
        ]);

        $response = $this->actingAs($this->managerA)
            ->patch("/employees/loans/{$loanB->id}/status", [
                'status' => 'paused'
            ]);
        $response->assertStatus(403);
    }

    public function test_manager_a_can_store_company_a_holidays()
    {
        $response = $this->actingAs($this->managerA)
            ->post("/clients/{$this->companyA->id}/holidays", [
                'name' => 'Company A Holiday',
                'holiday_date' => now()->toDateString()
            ]);
        $response->assertRedirect();
        $response->assertSessionHasNoErrors();
    }

    public function test_manager_a_cannot_store_company_b_holidays()
    {
        $response = $this->actingAs($this->managerA)
            ->post("/clients/{$this->companyB->id}/holidays", [
                'name' => 'Company B Holiday',
                'holiday_date' => now()->toDateString()
            ]);
        $response->assertStatus(403);
    }

    public function test_manager_a_cannot_delete_company_b_holidays()
    {
        $holidayB = Holiday::create([
            'client_id' => $this->companyB->id,
            'name' => 'Company B Holiday',
            'holiday_date' => now()->toDateString()
        ]);

        $response = $this->actingAs($this->managerA)
            ->delete("/clients/{$this->companyB->id}/holidays/{$holidayB->id}");
        $response->assertStatus(403);
    }

    public function test_manager_a_can_view_company_a_tax_declarations()
    {
        $response = $this->actingAs($this->managerA)
            ->get("/employees/{$this->employeeA->id}/tax-declarations");
        $response->assertStatus(200);
    }

    public function test_manager_a_cannot_view_company_b_tax_declarations()
    {
        $response = $this->actingAs($this->managerA)
            ->get("/employees/{$this->employeeB->id}/tax-declarations");
        $response->assertStatus(403);
    }

    public function test_manager_a_cannot_store_company_b_tax_declarations()
    {
        $response = $this->actingAs($this->managerA)
            ->post("/employees/{$this->employeeB->id}/tax-declarations", [
                'regime' => 'new'
            ]);
        $response->assertStatus(403);
    }

    public function test_manager_a_cannot_verify_company_b_tax_declarations()
    {
        $declarationB = EmployeeTaxDeclaration::create([
            'employee_id' => $this->employeeB->id,
            'financial_year' => '2026-2027',
            'regime' => 'old',
            'status' => 'submitted'
        ]);

        $response = $this->actingAs($this->managerA)
            ->post("/employees/{$this->employeeB->id}/tax-declarations/{$declarationB->id}/verify", [
                'status' => 'verified'
            ]);
        $response->assertStatus(403);
    }

    // =========================================================================
    // Gemini-audit follow-up: SalaryRevisionController
    // =========================================================================

    private function makeSalaryRevision($employeeId, $status = 'pending_approval'): \App\Models\SalaryRevision
    {
        return \App\Models\SalaryRevision::create([
            'employee_id' => $employeeId,
            'old_basic_pay' => 15000, 'old_hra' => 5000, 'old_conveyance' => 0, 'old_da' => 0,
            'old_medical_allowance' => 0, 'old_special_allowance' => 0, 'old_other_additions' => 0,
            'old_net_take_home' => 18000, 'old_ctc' => 22600,
            'new_basic_pay' => 18000, 'new_hra' => 6000, 'new_conveyance' => 0, 'new_da' => 0,
            'new_medical_allowance' => 0, 'new_special_allowance' => 0, 'new_other_additions' => 0,
            'new_net_take_home' => 21000, 'new_ctc' => 26000,
            'effective_date' => now()->toDateString(),
            'reason_for_revision' => 'Annual increment',
            'status' => $status,
            'created_by' => $this->admin->id,
            'updated_by' => $this->admin->id,
        ]);
    }

    public function test_manager_a_cannot_view_company_b_salary_revision_create_page()
    {
        $this->actingAs($this->managerA)
            ->get("/employees/{$this->employeeB->id}/salary-revision")
            ->assertStatus(403);
    }

    public function test_manager_a_can_view_company_a_salary_revision_create_page()
    {
        $this->actingAs($this->managerA)
            ->get("/employees/{$this->employeeA->id}/salary-revision")
            ->assertStatus(200);
    }

    public function test_manager_no_assignment_cannot_view_company_a_salary_revision_create_page()
    {
        $this->actingAs($this->managerNoAssignment)
            ->get("/employees/{$this->employeeA->id}/salary-revision")
            ->assertStatus(403);
    }

    public function test_manager_a_cannot_store_company_b_salary_revision()
    {
        $response = $this->actingAs($this->managerA)
            ->post("/employees/{$this->employeeB->id}/salary-revision", [
                'new_basic_pay' => 20000, 'new_hra' => 6000, 'new_conveyance' => 0, 'new_da' => 0,
                'new_medical_allowance' => 0, 'new_special_allowance' => 0, 'new_other_additions' => 0,
                'effective_date' => now()->toDateString(),
                'reason_for_revision' => 'Malicious cross-tenant attempt',
            ]);
        $response->assertStatus(403);
        $this->assertDatabaseMissing('salary_revisions', ['employee_id' => $this->employeeB->id]);
    }

    public function test_manager_a_cannot_approve_company_b_salary_revision()
    {
        // Blocked by two independent gates: ApproveSalaryRevisionRequest::authorize()
        // is admin-only (pre-existing, unrelated to this fix), and the new tenant
        // check in SalaryRevisionController::approve() would also reject it. Either
        // way the cross-tenant request must never succeed.
        $revisionB = $this->makeSalaryRevision($this->employeeB->id);

        $response = $this->actingAs($this->managerA)
            ->post("/employees/{$this->employeeB->id}/salary-revision/{$revisionB->id}/approve", [
                'action' => 'approve',
            ]);
        $response->assertStatus(403);
        $this->assertDatabaseHas('salary_revisions', ['id' => $revisionB->id, 'status' => 'pending_approval']);
    }

    public function test_manager_a_cannot_approve_company_a_salary_revision_admin_only_action()
    {
        // Pre-existing, unrelated business rule: ApproveSalaryRevisionRequest::authorize()
        // returns true only for role === 'admin', so no manager can ever call approve(),
        // even for their own company's employee. Documented here so this constraint is
        // not mistaken for a tenant-isolation gap.
        $revisionA = $this->makeSalaryRevision($this->employeeA->id);

        $response = $this->actingAs($this->managerA)
            ->post("/employees/{$this->employeeA->id}/salary-revision/{$revisionA->id}/approve", [
                'action' => 'approve',
            ]);
        $response->assertStatus(403);
        $this->assertDatabaseHas('salary_revisions', ['id' => $revisionA->id, 'status' => 'pending_approval']);
    }

    public function test_admin_can_approve_company_a_salary_revision()
    {
        $revisionA = $this->makeSalaryRevision($this->employeeA->id);

        $response = $this->actingAs($this->admin)
            ->post("/employees/{$this->employeeA->id}/salary-revision/{$revisionA->id}/approve", [
                'action' => 'approve',
            ]);
        $response->assertSessionHas('success');
        $this->assertDatabaseHas('salary_revisions', ['id' => $revisionA->id, 'status' => 'approved']);
    }

    public function test_admin_can_approve_company_b_salary_revision()
    {
        $revisionB = $this->makeSalaryRevision($this->employeeB->id);

        $response = $this->actingAs($this->admin)
            ->post("/employees/{$this->employeeB->id}/salary-revision/{$revisionB->id}/approve", [
                'action' => 'approve',
            ]);
        $response->assertSessionHas('success');
        $this->assertDatabaseHas('salary_revisions', ['id' => $revisionB->id, 'status' => 'approved']);
    }

    public function test_manager_a_cannot_send_email_for_company_b_salary_revision()
    {
        $revisionB = $this->makeSalaryRevision($this->employeeB->id);

        $response = $this->actingAs($this->managerA)
            ->post("/employees/{$this->employeeB->id}/salary-revision/{$revisionB->id}/send-email", []);
        $response->assertStatus(403);
    }

    // =========================================================================
    // Gemini-audit follow-up: EmployeeController (activate/deactivate/storeDocument)
    // =========================================================================

    public function test_manager_a_cannot_deactivate_company_b_employee()
    {
        $response = $this->actingAs($this->managerA)
            ->post("/employees/{$this->employeeB->id}/deactivate");
        $response->assertStatus(403);
        $this->assertDatabaseHas('employees', ['id' => $this->employeeB->id, 'status' => 'active']);
    }

    public function test_manager_a_can_deactivate_company_a_employee()
    {
        $response = $this->actingAs($this->managerA)
            ->post("/employees/{$this->employeeA->id}/deactivate");
        $response->assertSessionHas('success');
        $this->assertDatabaseHas('employees', ['id' => $this->employeeA->id, 'status' => 'suspended']);
    }

    public function test_manager_no_assignment_cannot_deactivate_company_a_employee()
    {
        $this->actingAs($this->managerNoAssignment)
            ->post("/employees/{$this->employeeA->id}/deactivate")
            ->assertStatus(403);
    }

    public function test_manager_a_cannot_activate_company_b_employee()
    {
        $this->employeeB->update(['status' => 'suspended']);

        $response = $this->actingAs($this->managerA)
            ->post("/employees/{$this->employeeB->id}/activate");
        $response->assertStatus(403);
        $this->assertDatabaseHas('employees', ['id' => $this->employeeB->id, 'status' => 'suspended']);
    }

    public function test_manager_a_can_activate_company_a_employee()
    {
        $this->employeeA->update(['status' => 'suspended']);

        $response = $this->actingAs($this->managerA)
            ->post("/employees/{$this->employeeA->id}/activate");
        $response->assertSessionHas('success');
        $this->assertDatabaseHas('employees', ['id' => $this->employeeA->id, 'status' => 'active']);
    }

    public function test_manager_a_cannot_store_document_for_company_b_employee()
    {
        $response = $this->actingAs($this->managerA)
            ->post("/employees/{$this->employeeB->id}/documents", [
                'document_type' => 'pan_card',
                'file' => \Illuminate\Http\UploadedFile::fake()->create('pan.pdf', 100, 'application/pdf'),
            ]);
        $response->assertStatus(403);
        $this->assertDatabaseMissing('employee_documents', ['employee_id' => $this->employeeB->id]);
    }

    // =========================================================================
    // Gemini-audit follow-up: BulkUploadController::downloadTemplate (+ siblings)
    // =========================================================================

    public function test_manager_a_cannot_download_company_b_bulk_upload_template()
    {
        $this->actingAs($this->managerA)
            ->get("/employees/bulk-upload/template?client_id={$this->companyB->id}")
            ->assertStatus(403);
    }

    public function test_manager_a_can_download_company_a_bulk_upload_template()
    {
        $this->actingAs($this->managerA)
            ->get("/employees/bulk-upload/template?client_id={$this->companyA->id}")
            ->assertStatus(200);
    }

    public function test_manager_no_assignment_cannot_download_company_a_bulk_upload_template()
    {
        $this->actingAs($this->managerNoAssignment)
            ->get("/employees/bulk-upload/template?client_id={$this->companyA->id}")
            ->assertStatus(403);
    }

    public function test_manager_a_bulk_upload_form_client_dropdown_excludes_company_b()
    {
        $response = $this->actingAs($this->managerA)->get('/employees/bulk-upload');
        $response->assertStatus(200);
        $clientIds = collect($response->inertiaProps()['clients'])->pluck('id')->toArray();
        $this->assertContains($this->companyA->id, $clientIds);
        $this->assertNotContains($this->companyB->id, $clientIds);
    }

    // =========================================================================
    // Gemini-audit follow-up: ComplianceController::markFiled
    // (ComplianceController::updateStatus does not exist anywhere in the codebase —
    // independently verified via grep; not testable/fixable because it isn't real.)
    // =========================================================================

    public function test_manager_a_cannot_mark_company_b_filing_as_filed()
    {
        $response = $this->actingAs($this->managerA)
            ->post('/compliance/mark-filed', [
                'client_id' => $this->companyB->id,
                'statute' => 'pf',
                'period' => now()->format('Y-m'),
                'status' => 'filed',
            ]);
        $response->assertStatus(403);
        $this->assertDatabaseMissing('compliance_filings', ['client_id' => $this->companyB->id, 'statute' => 'pf']);
    }

    public function test_manager_a_can_mark_company_a_filing_as_filed()
    {
        $response = $this->actingAs($this->managerA)
            ->post('/compliance/mark-filed', [
                'client_id' => $this->companyA->id,
                'statute' => 'pf',
                'period' => now()->format('Y-m'),
                'status' => 'filed',
            ]);
        $response->assertSessionHas('success');
        $this->assertDatabaseHas('compliance_filings', ['client_id' => $this->companyA->id, 'statute' => 'pf', 'status' => 'filed']);
    }

    public function test_manager_no_assignment_cannot_mark_company_a_filing_as_filed()
    {
        $this->actingAs($this->managerNoAssignment)
            ->post('/compliance/mark-filed', [
                'client_id' => $this->companyA->id,
                'statute' => 'pf',
                'period' => now()->format('Y-m'),
                'status' => 'filed',
            ])
            ->assertStatus(403);
    }

    // =========================================================================
    // Gemini-audit follow-up: BankChangeRequestController (approve/reject)
    // =========================================================================

    private function makeBankChangeRequest($employeeId): \App\Models\BankChangeRequest
    {
        return \App\Models\BankChangeRequest::create([
            'employee_id' => $employeeId,
            'status' => 'pending',
            'new_bank_account_number' => '999888777666',
            'new_bank_ifsc' => 'HDFC0009999',
            'new_bank_name' => 'New Bank',
            'new_bank_branch' => 'New Branch',
            'new_account_holder_name' => 'Test Holder',
            'reason' => 'Switched banks',
            'created_by' => $this->admin->id,
            'updated_by' => $this->admin->id,
        ]);
    }

    public function test_manager_a_cannot_approve_company_b_bank_change_request()
    {
        $reqB = $this->makeBankChangeRequest($this->employeeB->id);

        $response = $this->actingAs($this->managerA)
            ->post("/bank-change-requests/{$reqB->id}/approve");
        $response->assertStatus(403);
        $this->assertDatabaseHas('bank_change_requests', ['id' => $reqB->id, 'status' => 'pending']);
    }

    public function test_manager_a_can_approve_company_a_bank_change_request()
    {
        $reqA = $this->makeBankChangeRequest($this->employeeA->id);

        $response = $this->actingAs($this->managerA)
            ->post("/bank-change-requests/{$reqA->id}/approve");
        $response->assertSessionHas('success');
        $this->assertDatabaseHas('bank_change_requests', ['id' => $reqA->id, 'status' => 'approved']);
    }

    public function test_manager_a_cannot_reject_company_b_bank_change_request()
    {
        $reqB = $this->makeBankChangeRequest($this->employeeB->id);

        $response = $this->actingAs($this->managerA)
            ->post("/bank-change-requests/{$reqB->id}/reject", ['rejection_reason' => 'Not verified']);
        $response->assertStatus(403);
        $this->assertDatabaseHas('bank_change_requests', ['id' => $reqB->id, 'status' => 'pending']);
    }

    public function test_manager_no_assignment_cannot_approve_company_a_bank_change_request()
    {
        $reqA = $this->makeBankChangeRequest($this->employeeA->id);

        $this->actingAs($this->managerNoAssignment)
            ->post("/bank-change-requests/{$reqA->id}/approve")
            ->assertStatus(403);
    }

    // =========================================================================
    // Gemini-audit follow-up: EmployeeExitController (show/previewSettlement/storeStage)
    // =========================================================================

    public function test_manager_a_cannot_view_company_b_exit_page()
    {
        $this->actingAs($this->managerA)
            ->get("/employees/{$this->employeeB->id}/exit")
            ->assertStatus(403);
    }

    public function test_manager_a_can_view_company_a_exit_page()
    {
        $this->actingAs($this->managerA)
            ->get("/employees/{$this->employeeA->id}/exit")
            ->assertStatus(200);
    }

    public function test_manager_no_assignment_cannot_view_company_a_exit_page()
    {
        $this->actingAs($this->managerNoAssignment)
            ->get("/employees/{$this->employeeA->id}/exit")
            ->assertStatus(403);
    }

    public function test_manager_a_cannot_preview_settlement_for_company_b_employee()
    {
        $this->actingAs($this->managerA)
            ->post("/employees/{$this->employeeB->id}/exit/preview-settlement", [])
            ->assertStatus(403);
    }

    public function test_manager_a_cannot_store_exit_stage_for_company_b_employee()
    {
        $response = $this->actingAs($this->managerA)
            ->post("/employees/{$this->employeeB->id}/exit/stage/1", [
                'exit_type' => 'voluntary',
                'reason_category' => 'personal',
                'submission_date' => now()->toDateString(),
            ]);
        $response->assertStatus(403);
        $this->assertDatabaseMissing('employee_exits', ['employee_id' => $this->employeeB->id]);
    }

    public function test_manager_a_can_store_exit_stage_for_company_a_employee()
    {
        $response = $this->actingAs($this->managerA)
            ->post("/employees/{$this->employeeA->id}/exit/stage/1", [
                'exit_type' => 'voluntary',
                'reason_category' => 'personal',
                'submission_date' => now()->toDateString(),
            ]);
        $response->assertStatus(200);
        $this->assertDatabaseHas('employee_exits', ['employee_id' => $this->employeeA->id]);
    }

    // =========================================================================
    // Gemini-audit follow-up: ExportController::exportEmployeeData
    // =========================================================================

    public function test_manager_a_cannot_export_company_b_employee_data()
    {
        $this->actingAs($this->managerA)
            ->post('/export/employees', [
                'client_id' => $this->companyB->id,
                'confirm_unmasked_export' => 1,
            ])
            ->assertStatus(403);
    }

    public function test_manager_a_can_export_company_a_employee_data()
    {
        $this->actingAs($this->managerA)
            ->post('/export/employees', [
                'client_id' => $this->companyA->id,
                'confirm_unmasked_export' => 1,
            ])
            ->assertStatus(200);
    }

    public function test_manager_no_assignment_cannot_export_company_a_employee_data()
    {
        $this->actingAs($this->managerNoAssignment)
            ->post('/export/employees', [
                'client_id' => $this->companyA->id,
                'confirm_unmasked_export' => 1,
            ])
            ->assertStatus(403);
    }

    // =========================================================================
    // Final-sweep follow-up: EmployeePolicy::viewDocuments, EmployeeController::store()/update(),
    // BulkUploadController batch_id fast-paths (sibling gaps found during the closing IDOR sweep,
    // not on Gemini's original list, but within the same audited controllers).
    // =========================================================================

    private function makeEmployeeDocument($employeeId): \App\Models\EmployeeDocument
    {
        return \App\Models\EmployeeDocument::create([
            'employee_id' => $employeeId,
            'document_type' => 'pan',
            'file_path' => 'employee_documents/test-doc.pdf',
            'status' => 'pending',
        ]);
    }

    public function test_manager_a_cannot_view_company_b_employee_document()
    {
        $doc = $this->makeEmployeeDocument($this->employeeB->id);

        $this->actingAs($this->managerA)
            ->get("/employees/{$this->employeeB->id}/documents/{$doc->id}/view")
            ->assertStatus(403);
    }

    public function test_manager_a_can_view_company_a_employee_document()
    {
        \Illuminate\Support\Facades\Storage::fake('local');
        \Illuminate\Support\Facades\Storage::disk('local')->put('employee_documents/test-doc.pdf', 'dummy content');
        $doc = $this->makeEmployeeDocument($this->employeeA->id);

        $this->actingAs($this->managerA)
            ->get("/employees/{$this->employeeA->id}/documents/{$doc->id}/view")
            ->assertStatus(200);
    }

    private function validEmployeePayload(int $clientId, string $emailSuffix): array
    {
        return [
            'clientPartner' => $clientId,
            'branch_id' => \App\Models\ClientBranch::where('client_id', $clientId)->value('id'),
            'firstName' => 'New',
            'lastName' => 'Hire',
            'fatherName' => 'Father Name',
            'fullName' => 'New Hire',
            'personalEmail' => "newhire{$emailSuffix}@test.com",
            'phone' => "9{$emailSuffix}",
            'dob' => '1990-01-01',
            'doj' => '2023-01-01',
            'designation' => 'Dev',
            'empType' => 'eor',
            'priorEmploymentFlag' => false,
            'address' => 'Address',
            'bankName' => 'HDFC Bank',
            'bankBranch' => 'Main',
            'accountNo' => "BANK{$emailSuffix}",
            'ifsc' => 'HDFC0000060',
            'accountHolder' => 'Name',
            'pan' => 'ZZTES' . str_pad(substr($emailSuffix, -4), 4, '0', STR_PAD_LEFT) . 'Z',
            'uanMode' => 'existing_transfer',
            'uan' => "10000{$emailSuffix}",
            'esiNo' => "123{$emailSuffix}",
            'pfToggle' => true,
            'esiToggle' => true,
            'tdsToggle' => true,
            'ptToggle' => true,
            'lwfToggle' => true,
            'bonusToggle' => true,
            'taxRegime' => 'new',
            'declarations' => 'yes',
            'gratuityMode' => 'part_of_ctc',
            'lopBasis' => '26',
            'basicSal' => 25000,
            'hraSal' => 0,
            'conveyanceSal' => 0,
            'daSal' => 0,
            'medicalSal' => 0,
            'specialSal' => 0,
            'otherSal' => 0,
        ];
    }

    public function test_manager_a_cannot_create_employee_under_company_b()
    {
        $response = $this->actingAs($this->managerA)
            ->post('/employees', $this->validEmployeePayload($this->companyB->id, '9990001'));

        $response->assertStatus(403);
        $this->assertDatabaseMissing('employees', ['personal_email' => 'newhire9990001@test.com']);
    }

    public function test_manager_a_can_create_employee_under_company_a()
    {
        $response = $this->actingAs($this->managerA)
            ->post('/employees', $this->validEmployeePayload($this->companyA->id, '9990002'));

        $response->assertRedirect('/employees');
        $this->assertDatabaseHas('employees', ['personal_email' => 'newhire9990002@test.com', 'client_id' => $this->companyA->id]);
    }

    public function test_manager_no_assignment_cannot_create_employee_under_company_a()
    {
        $response = $this->actingAs($this->managerNoAssignment)
            ->post('/employees', $this->validEmployeePayload($this->companyA->id, '9990003'));

        $response->assertStatus(403);
        $this->assertDatabaseMissing('employees', ['personal_email' => 'newhire9990003@test.com']);
    }

    public function test_manager_a_cannot_reassign_company_a_employee_to_company_b()
    {
        $payload = $this->validEmployeePayload($this->companyA->id, '9990004');
        $payload['personalEmail'] = $this->employeeA->personal_email;
        $payload['phone'] = $this->employeeA->phone_number;
        $payload['pan'] = $this->employeeA->pan_number;
        $payload['clientPartner'] = $this->companyB->id; // attempted cross-tenant reassignment

        $response = $this->actingAs($this->managerA)
            ->put("/employees/{$this->employeeA->id}", $payload);

        $response->assertStatus(403);
        $this->assertDatabaseHas('employees', ['id' => $this->employeeA->id, 'client_id' => $this->companyA->id]);
    }

    private function makeStagingRow(string $batchId, int $clientId): void
    {
        \Illuminate\Support\Facades\DB::table('bulk_upload_staging_rows')->insert([
            'batch_id' => $batchId,
            'row_no' => 1,
            'client_id' => $clientId,
            'status' => 'ready',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    public function test_manager_a_cannot_execute_bulk_import_batch_for_company_b()
    {
        $batchId = 'test-batch-' . uniqid();
        $this->makeStagingRow($batchId, $this->companyB->id);

        $response = $this->actingAs($this->managerA)
            ->post('/employees/bulk-upload/execute', ['batch_id' => $batchId]);

        $response->assertStatus(403);
    }

    public function test_manager_a_cannot_execute_bulk_import_batch_via_async_for_company_b()
    {
        $batchId = 'test-batch-' . uniqid();
        $this->makeStagingRow($batchId, $this->companyB->id);

        $response = $this->actingAs($this->managerA)
            ->post('/employees/bulk-upload/async', ['batch_id' => $batchId]);

        $response->assertStatus(403);
    }

    // =========================================================================
    // Admin cross-check (spot checks — admin must retain unrestricted access)
    // =========================================================================

    public function test_admin_can_deactivate_and_activate_any_company_employee()
    {
        $this->actingAs($this->admin)->post("/employees/{$this->employeeB->id}/deactivate")->assertSessionHas('success');
        $this->actingAs($this->admin)->post("/employees/{$this->employeeB->id}/activate")->assertSessionHas('success');
    }

    public function test_admin_can_mark_any_company_filing_as_filed()
    {
        $this->actingAs($this->admin)
            ->post('/compliance/mark-filed', [
                'client_id' => $this->companyB->id,
                'statute' => 'esi',
                'period' => now()->format('Y-m'),
                'status' => 'filed',
            ])
            ->assertSessionHas('success');
    }

    public function test_admin_can_approve_any_company_bank_change_request()
    {
        $reqB = $this->makeBankChangeRequest($this->employeeB->id);
        $this->actingAs($this->admin)
            ->post("/bank-change-requests/{$reqB->id}/approve")
            ->assertSessionHas('success');
    }
}
