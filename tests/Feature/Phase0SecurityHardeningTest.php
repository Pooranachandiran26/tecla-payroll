<?php

namespace Tests\Feature;

use App\Models\Client;
use App\Models\ClientBranch;
use App\Models\ClientDocument;
use App\Models\Employee;
use App\Models\PayrollRun;
use App\Models\PtChallanBatch;
use App\Models\Tds24qBatch;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Regression coverage for the 8 confirmed tenant-isolation/security gaps from
 * docs/audits/multitenant-auditor-report.md. Each test proves the gap is closed by
 * asserting a manager scoped to Client A cannot read/act on Client B's data, and that
 * a manager with zero assignments gets zero access rather than "every client."
 */
class Phase0SecurityHardeningTest extends TestCase
{
    use RefreshDatabase;

    protected Client $clientA;
    protected Client $clientB;
    protected User $managerAOnly;
    protected User $managerNoAssignment;
    protected User $admin;

    protected function setUp(): void
    {
        parent::setUp();

        $this->clientA = Client::factory()->create(['status' => 'active']);
        $this->clientB = Client::factory()->create(['status' => 'active']);

        $this->admin = User::factory()->create(['role' => 'admin', 'status' => 'active']);

        $this->managerAOnly = User::factory()->create(['role' => 'manager', 'status' => 'active']);
        $this->managerAOnly->managedClients()->attach([$this->clientA->id]);

        $this->managerNoAssignment = User::factory()->create(['role' => 'manager', 'status' => 'active']);
    }

    // -----------------------------------------------------------------
    // GAP-1: User::getManagedClientIds() empty-assignment fallback
    // -----------------------------------------------------------------

    public function test_manager_with_no_assignment_gets_empty_managed_client_ids()
    {
        $ids = $this->managerNoAssignment->getManagedClientIds();

        $this->assertIsArray($ids);
        $this->assertEmpty($ids, 'A manager with zero explicit assignments must see zero clients, not every active client.');
    }

    public function test_manager_with_no_assignment_is_not_authorized_for_any_client()
    {
        $this->assertFalse($this->managerNoAssignment->isManagerForClient($this->clientA->id));
        $this->assertFalse($this->managerNoAssignment->isManagerForClient($this->clientB->id));
    }

    public function test_manager_with_assignment_still_scoped_correctly()
    {
        $ids = $this->managerAOnly->getManagedClientIds();

        $this->assertContains($this->clientA->id, $ids);
        $this->assertNotContains($this->clientB->id, $ids);
    }

    // -----------------------------------------------------------------
    // GAP-2 / GAP-2b: ClientPolicy::update()/view() and verifyDocument()
    // -----------------------------------------------------------------

    public function test_manager_cannot_view_unassigned_client()
    {
        $this->actingAs($this->managerAOnly)
            ->get(route('clients.show', $this->clientB->id))
            ->assertStatus(403);
    }

    public function test_manager_cannot_edit_unassigned_client()
    {
        $this->actingAs($this->managerAOnly)
            ->get(route('clients.edit', $this->clientB->id))
            ->assertStatus(403);

        $this->actingAs($this->managerAOnly)
            ->put(route('clients.update', $this->clientB->id), [])
            ->assertStatus(403);
    }

    public function test_manager_can_edit_assigned_client()
    {
        $this->actingAs($this->managerAOnly)
            ->get(route('clients.edit', $this->clientA->id))
            ->assertStatus(200);
    }

    public function test_manager_cannot_verify_document_of_unassigned_client()
    {
        $document = ClientDocument::create([
            'client_id' => $this->clientB->id,
            'document_type' => 'gst_certificate',
            'file_path' => 'client_documents/dummy.pdf',
            'file_name' => 'dummy.pdf',
            'file_size_kb' => 10,
            'uploaded_by' => $this->admin->id,
            'verification_status' => 'pending',
        ]);

        $this->actingAs($this->managerAOnly)
            ->put(route('clients.documents.verify', ['client' => $this->clientB->id, 'document' => $document->id]), [
                'status' => 'verified',
            ])
            ->assertStatus(403);
    }

    public function test_manager_cannot_verify_document_id_mismatched_to_client_in_url()
    {
        // A document that genuinely belongs to Client A, referenced through Client A's own
        // (assigned) URL — but the document itself belongs to Client B. Must 404, not succeed,
        // since the document/client pairing is never trusted without cross-checking the DB.
        $document = ClientDocument::create([
            'client_id' => $this->clientB->id,
            'document_type' => 'gst_certificate',
            'file_path' => 'client_documents/dummy.pdf',
            'file_name' => 'dummy.pdf',
            'file_size_kb' => 10,
            'uploaded_by' => $this->admin->id,
            'verification_status' => 'pending',
        ]);

        $this->actingAs($this->managerAOnly)
            ->put(route('clients.documents.verify', ['client' => $this->clientA->id, 'document' => $document->id]), [
                'status' => 'verified',
            ])
            ->assertStatus(404);
    }

    // -----------------------------------------------------------------
    // GAP-3/4/5: PayrollController approve()/lock()/runSupplementary()
    // -----------------------------------------------------------------

    private function makeLockableRun(Client $client, string $status = 'draft'): PayrollRun
    {
        return PayrollRun::create([
            'client_id' => $client->id,
            'payroll_month' => '2026-06-01',
            'status' => $status,
            'total_gross_earnings' => 1000,
            'total_net_disbursement' => 900,
            'total_employer_statutory_cost' => 100,
        ]);
    }

    public function test_manager_cannot_approve_unassigned_clients_payroll_run()
    {
        $run = $this->makeLockableRun($this->clientB, 'draft');

        $this->actingAs($this->managerAOnly)
            ->post(route('payroll.run.approve', $run->id))
            ->assertStatus(403);

        $this->assertDatabaseHas('payroll_runs', ['id' => $run->id, 'status' => 'draft']);
    }

    public function test_manager_cannot_lock_unassigned_clients_payroll_run()
    {
        $run = $this->makeLockableRun($this->clientB, 'approved');

        $this->actingAs($this->managerAOnly)
            ->post(route('payroll.run.lock', $run->id))
            ->assertStatus(403);

        $this->assertDatabaseHas('payroll_runs', ['id' => $run->id, 'status' => 'approved']);
    }

    public function test_manager_cannot_trigger_supplementary_run_for_unassigned_client()
    {
        $run = $this->makeLockableRun($this->clientB, 'locked');

        $this->actingAs($this->managerAOnly)
            ->post(route('payroll.run.supplementary', $run->id))
            ->assertStatus(403);
    }

    public function test_manager_can_approve_assigned_clients_payroll_run()
    {
        $run = $this->makeLockableRun($this->clientA, 'draft');

        $this->actingAs($this->managerAOnly)
            ->post(route('payroll.run.approve', $run->id))
            ->assertSessionHas('success');

        $this->assertDatabaseHas('payroll_runs', ['id' => $run->id, 'status' => 'approved']);
    }

    // -----------------------------------------------------------------
    // GAP-3 sibling: indexProcessing() / indexApproval() read-side scoping
    // -----------------------------------------------------------------

    public function test_manager_cannot_read_unassigned_clients_data_via_processing_query_string()
    {
        $this->actingAs($this->managerAOnly)
            ->get(route('payroll.processing', ['client_id' => $this->clientB->id, 'payroll_month' => '2026-06-01']))
            ->assertStatus(403);
    }

    public function test_manager_cannot_read_unassigned_clients_data_via_approval_query_string()
    {
        $this->actingAs($this->managerAOnly)
            ->get(route('payroll.approval', ['client_id' => $this->clientB->id, 'payroll_month' => '2026-06-01']))
            ->assertStatus(403);
    }

    public function test_manager_client_dropdown_excludes_unassigned_clients_on_processing_page()
    {
        $response = $this->actingAs($this->managerAOnly)
            ->get(route('payroll.processing'));

        $response->assertStatus(200);
        $clientIds = collect($response->inertiaProps()['clients'])->pluck('id')->toArray();

        $this->assertContains($this->clientA->id, $clientIds);
        $this->assertNotContains($this->clientB->id, $clientIds);
    }

    // -----------------------------------------------------------------
    // GAP-6: PtChallanController
    // -----------------------------------------------------------------

    private function makePtChallanBatch(Client $client, PayrollRun $run): PtChallanBatch
    {
        return PtChallanBatch::create([
            'client_id' => $client->id,
            'payroll_run_id' => $run->id,
            'wage_month' => '2026-06',
            'employee_count' => 1,
            'total_pt_amount' => 200,
            'status' => 'generated',
            'file_path' => 'pt_challan/dummy.xlsx',
            'file_name' => 'dummy.xlsx',
            'generated_by' => $this->admin->id,
            'generated_at' => now(),
        ]);
    }

    public function test_manager_cannot_preview_pt_challan_for_unassigned_client()
    {
        $run = $this->makeLockableRun($this->clientB, 'locked');

        $this->actingAs($this->managerAOnly)
            ->postJson(route('compliance.pt_challan.preview'), ['payroll_run_id' => $run->id])
            ->assertStatus(403);
    }

    public function test_manager_cannot_generate_pt_challan_for_unassigned_client()
    {
        $run = $this->makeLockableRun($this->clientB, 'locked');

        $this->actingAs($this->managerAOnly)
            ->postJson(route('compliance.pt_challan.generate'), ['payroll_run_id' => $run->id])
            ->assertStatus(403);
    }

    public function test_manager_cannot_download_pt_challan_for_unassigned_client()
    {
        $run = $this->makeLockableRun($this->clientB, 'locked');
        $batch = $this->makePtChallanBatch($this->clientB, $run);

        $this->actingAs($this->managerAOnly)
            ->get(route('compliance.pt_challan.download', $batch->id))
            ->assertStatus(403);
    }

    public function test_manager_cannot_update_status_of_pt_challan_for_unassigned_client()
    {
        $run = $this->makeLockableRun($this->clientB, 'locked');
        $batch = $this->makePtChallanBatch($this->clientB, $run);

        $this->actingAs($this->managerAOnly)
            ->postJson(route('compliance.pt_challan.update_status', $batch->id), ['status' => 'filed'])
            ->assertStatus(403);

        $this->assertDatabaseHas('pt_challan_batches', ['id' => $batch->id, 'status' => 'generated']);
    }

    public function test_manager_cannot_delete_pt_challan_for_unassigned_client()
    {
        $run = $this->makeLockableRun($this->clientB, 'locked');
        $batch = $this->makePtChallanBatch($this->clientB, $run);

        $this->actingAs($this->managerAOnly)
            ->deleteJson(route('compliance.pt_challan.destroy', $batch->id))
            ->assertStatus(403);

        // PtChallanBatch is a hard-delete model (no SoftDeletes) — the row must still exist at all.
        $this->assertDatabaseHas('pt_challan_batches', ['id' => $batch->id]);
    }

    public function test_manager_with_no_assignment_sees_no_pt_challan_runs_or_batches()
    {
        $run = $this->makeLockableRun($this->clientA, 'locked');
        $this->makePtChallanBatch($this->clientB, $this->makeLockableRun($this->clientB, 'locked'));

        $response = $this->actingAs($this->managerNoAssignment)
            ->getJson(route('compliance.pt_challan.runs'));

        $response->assertStatus(200);
        $this->assertCount(0, $response->json('runs'));
        $this->assertCount(0, $response->json('batches'));
    }

    // -----------------------------------------------------------------
    // GAP-7: Tds24qController
    // -----------------------------------------------------------------

    private function makeTds24qBatch(Client $client): Tds24qBatch
    {
        return Tds24qBatch::create([
            'client_id' => $client->id,
            'financial_year' => '2026-2027',
            'assessment_year' => '2027-2028',
            'quarter' => 'Q1',
            'employee_count' => 1,
            'total_taxable_salary' => 50000,
            'total_tds_deducted' => 5000,
            'total_tax_deposited' => 5000,
            'status' => 'generated',
            'txt_file_path' => 'tds_24q/dummy.txt',
            'txt_file_name' => 'dummy.txt',
            'generated_by' => $this->admin->id,
            'generated_at' => now(),
        ]);
    }

    public function test_manager_cannot_preview_tds_24q_for_unassigned_client()
    {
        $this->actingAs($this->managerAOnly)
            ->postJson(route('compliance.tds_24q.preview'), [
                'client_id' => $this->clientB->id,
                'financial_year' => '2026-2027',
                'quarter' => 'Q1',
            ])
            ->assertStatus(403);
    }

    public function test_manager_cannot_save_challan_for_unassigned_client()
    {
        $this->actingAs($this->managerAOnly)
            ->postJson(route('compliance.tds_24q.save_challan'), [
                'client_id' => $this->clientB->id,
                'financial_year' => '2026-2027',
                'quarter' => 'Q1',
                'bsr_code' => '1234567',
                'deposit_date' => '2026-07-07',
                'challan_serial_number' => '12345',
                'tax_amount' => 5000,
            ])
            ->assertStatus(403);
    }

    public function test_manager_cannot_generate_tds_24q_for_unassigned_client()
    {
        $this->actingAs($this->managerAOnly)
            ->postJson(route('compliance.tds_24q.generate'), [
                'client_id' => $this->clientB->id,
                'financial_year' => '2026-2027',
                'quarter' => 'Q1',
            ])
            ->assertStatus(403);
    }

    public function test_manager_cannot_download_tds_24q_for_unassigned_client()
    {
        $batch = $this->makeTds24qBatch($this->clientB);

        $this->actingAs($this->managerAOnly)
            ->get(route('compliance.tds_24q.download', $batch->id))
            ->assertStatus(403);

        $this->actingAs($this->managerAOnly)
            ->get(route('compliance.tds_24q.download_xlsx', $batch->id))
            ->assertStatus(403);
    }

    public function test_manager_with_no_assignment_sees_no_tds_24q_clients_or_batches()
    {
        $this->makeTds24qBatch($this->clientA);
        $this->makeTds24qBatch($this->clientB);

        $response = $this->actingAs($this->managerNoAssignment)
            ->getJson(route('compliance.tds_24q.metadata'));

        $response->assertStatus(200);
        $this->assertCount(0, $response->json('clients'));
        $this->assertCount(0, $response->json('batches'));
    }

    // -----------------------------------------------------------------
    // GAP-8: EmployeePortalController::getEmployee()
    // -----------------------------------------------------------------

    public function test_employee_user_with_no_link_and_no_matching_email_fails_closed()
    {
        // An unrelated, genuinely unlinked employee exists in the system — this must never be
        // silently handed to an unrelated user just because it's the first unlinked row.
        $branch = ClientBranch::factory()->create(['client_id' => $this->clientA->id]);
        Employee::factory()->create([
            'client_id' => $this->clientA->id,
            'branch_id' => $branch->id,
            'personal_email' => 'genuinely.unlinked@example.com',
        ]);

        $orphanUser = User::factory()->create([
            'role' => 'employee',
            'status' => 'active',
            'employee_id' => null,
            'client_id' => null,
            'email' => 'no-matching-employee-record@example.com',
        ]);

        $this->actingAs($orphanUser)
            ->get(route('employee.dashboard'))
            ->assertStatus(403);

        $this->assertNull($orphanUser->fresh()->employee_id, 'An unrelated employee must never be auto-bound.');
        // No employee record should be auto-created with a guessed client — still just the one.
        $this->assertDatabaseCount('employees', 1);
    }

    public function test_employee_user_binds_correctly_via_exact_email_match_only()
    {
        $branch = ClientBranch::factory()->create(['client_id' => $this->clientA->id]);
        $employee = Employee::factory()->create([
            'client_id' => $this->clientA->id,
            'branch_id' => $branch->id,
            'personal_email' => 'real.employee@example.com',
        ]);

        $user = User::factory()->create([
            'role' => 'employee',
            'status' => 'active',
            'employee_id' => null,
            'client_id' => null,
            'email' => 'real.employee@example.com',
        ]);

        $this->actingAs($user)
            ->get(route('employee.dashboard'))
            ->assertStatus(200);

        $this->assertEquals($employee->id, $user->fresh()->employee_id);
    }

    // -----------------------------------------------------------------
    // GAP-A (follow-up): Payroll correction methods
    // -----------------------------------------------------------------

    public function test_manager_cannot_preview_correction_for_unassigned_clients_run()
    {
        $run = $this->makeLockableRun($this->clientB, 'locked');
        $branch = ClientBranch::factory()->create(['client_id' => $this->clientB->id]);
        $employee = Employee::factory()->create(['client_id' => $this->clientB->id, 'branch_id' => $branch->id]);

        $this->actingAs($this->managerAOnly)
            ->postJson(route('payroll.correction.preview'), [
                'parent_run_id' => $run->id,
                'employee_id' => $employee->id,
                'corrected_paid_days' => 20,
                'corrected_lop_days' => 1,
            ])
            ->assertStatus(403);
    }

    public function test_manager_cannot_download_correction_template_for_unassigned_clients_run()
    {
        $run = $this->makeLockableRun($this->clientB, 'locked');

        $this->actingAs($this->managerAOnly)
            ->get(route('payroll.correction.template', ['parent_run_id' => $run->id]))
            ->assertStatus(403);
    }

    public function test_manager_cannot_import_batch_correction_for_unassigned_clients_run()
    {
        $run = $this->makeLockableRun($this->clientB, 'locked');
        $file = \Illuminate\Http\UploadedFile::fake()->create('correction.csv', 10, 'text/csv');

        $this->actingAs($this->managerAOnly)
            ->post(route('payroll.correction.batch-import'), [
                'parent_run_id' => $run->id,
                'file' => $file,
            ])
            ->assertStatus(403);
    }

    public function test_manager_cannot_preview_batch_correction_for_unassigned_clients_run()
    {
        $run = $this->makeLockableRun($this->clientB, 'locked');

        $this->actingAs($this->managerAOnly)
            ->postJson(route('payroll.correction.batch-preview'), [
                'parent_run_id' => $run->id,
            ])
            ->assertStatus(403);
    }

    public function test_manager_cannot_store_correction_for_unassigned_clients_run()
    {
        $run = $this->makeLockableRun($this->clientB, 'locked');
        $branch = ClientBranch::factory()->create(['client_id' => $this->clientB->id]);
        $employee = Employee::factory()->create(['client_id' => $this->clientB->id, 'branch_id' => $branch->id]);

        $this->actingAs($this->managerAOnly)
            ->post(route('payroll.correction.store'), [
                'parent_run_id' => $run->id,
                'employee_id' => $employee->id,
                'corrected_paid_days' => 20,
                'corrected_lop_days' => 1,
            ])
            ->assertStatus(403);

        // The write path must not have touched anything — no supplementary run created.
        $this->assertDatabaseMissing('payroll_runs', ['parent_run_id' => $run->id]);
    }

    public function test_manager_cannot_store_batch_correction_for_unassigned_clients_run()
    {
        $run = $this->makeLockableRun($this->clientB, 'locked');
        $branch = ClientBranch::factory()->create(['client_id' => $this->clientB->id]);
        $employee = Employee::factory()->create(['client_id' => $this->clientB->id, 'branch_id' => $branch->id]);

        $this->actingAs($this->managerAOnly)
            ->post(route('payroll.correction.batch-store'), [
                'parent_run_id' => $run->id,
                'items' => [
                    ['employee_id' => $employee->id, 'corrected_paid_days' => 20, 'corrected_lop_days' => 1],
                ],
            ])
            ->assertStatus(403);

        $this->assertDatabaseMissing('payroll_runs', ['parent_run_id' => $run->id]);
    }

    public function test_manager_with_assigned_client_can_reach_correction_endpoints()
    {
        $run = $this->makeLockableRun($this->clientA, 'locked');

        // Proves the request gets past the authorization gate for an assigned client — the
        // batch-preview endpoint returns 200 with an empty preview when the run has no items,
        // which is sufficient to prove authorization succeeded without needing a full payroll
        // calculation fixture.
        $this->actingAs($this->managerAOnly)
            ->postJson(route('payroll.correction.batch-preview'), [
                'parent_run_id' => $run->id,
            ])
            ->assertStatus(200);
    }

    public function test_manager_with_no_assignment_cannot_reach_correction_endpoints()
    {
        $run = $this->makeLockableRun($this->clientA, 'locked');

        $this->actingAs($this->managerNoAssignment)
            ->postJson(route('payroll.correction.batch-preview'), [
                'parent_run_id' => $run->id,
            ])
            ->assertStatus(403);
    }

    // -----------------------------------------------------------------
    // GAP-B (follow-up): PayrollController::indexPayslips()
    // -----------------------------------------------------------------

    public function test_manager_cannot_view_unassigned_clients_payslips_via_query_string()
    {
        $this->actingAs($this->managerAOnly)
            ->get(route('payroll.payslips', ['client_id' => $this->clientB->id, 'payroll_month' => '2026-06-01']))
            ->assertStatus(403);
    }

    public function test_manager_payslip_client_dropdown_excludes_unassigned_clients()
    {
        $response = $this->actingAs($this->managerAOnly)
            ->get(route('payroll.payslips'));

        $response->assertStatus(200);
        $clientIds = collect($response->inertiaProps()['clients'])->pluck('id')->toArray();

        $this->assertContains($this->clientA->id, $clientIds);
        $this->assertNotContains($this->clientB->id, $clientIds);
    }

    public function test_manager_can_view_assigned_clients_payslips()
    {
        $this->actingAs($this->managerAOnly)
            ->get(route('payroll.payslips', ['client_id' => $this->clientA->id, 'payroll_month' => '2026-06-01']))
            ->assertStatus(200);
    }

    public function test_manager_with_no_assignment_gets_no_payslip_client_access()
    {
        $response = $this->actingAs($this->managerNoAssignment)
            ->get(route('payroll.payslips'));

        $response->assertStatus(200);
        $clientIds = collect($response->inertiaProps()['clients'])->pluck('id')->toArray();

        $this->assertEmpty($clientIds);
    }

    // -----------------------------------------------------------------
    // PayrollController::process() tenant-isolation gap (third audit pass)
    // -----------------------------------------------------------------

    public function test_manager_cannot_process_unassigned_clients_payroll()
    {
        $this->actingAs($this->managerAOnly)
            ->post(route('payroll.run.process'), [
                'client_id' => $this->clientB->id,
                'payroll_month' => '2026-06-01',
            ])
            ->assertStatus(403);

        $this->assertDatabaseMissing('payroll_runs', [
            'client_id' => $this->clientB->id,
            'payroll_month' => '2026-06-01',
        ]);
    }

    public function test_manager_can_process_assigned_clients_payroll()
    {
        $this->actingAs($this->managerAOnly)
            ->post(route('payroll.run.process'), [
                'client_id' => $this->clientA->id,
                'payroll_month' => '2026-06-01',
            ])
            ->assertSessionHas('success');

        $this->assertDatabaseHas('payroll_runs', [
            'client_id' => $this->clientA->id,
            'payroll_month' => '2026-06-01',
            'status' => 'draft',
        ]);
    }

    public function test_manager_with_no_assignment_cannot_process_any_clients_payroll()
    {
        $this->actingAs($this->managerNoAssignment)
            ->post(route('payroll.run.process'), [
                'client_id' => $this->clientA->id,
                'payroll_month' => '2026-06-01',
            ])
            ->assertStatus(403);

        $this->actingAs($this->managerNoAssignment)
            ->post(route('payroll.run.process'), [
                'client_id' => $this->clientB->id,
                'payroll_month' => '2026-06-01',
            ])
            ->assertStatus(403);

        $this->assertDatabaseCount('payroll_runs', 0);
    }

    public function test_admin_retains_unrestricted_process_access_across_clients()
    {
        // Platform/admin-level users are unconditionally authorized by isManagerForClient()
        // (User.php:195-197) — this must remain unchanged by the fix.
        $this->actingAs($this->admin)
            ->post(route('payroll.run.process'), [
                'client_id' => $this->clientA->id,
                'payroll_month' => '2026-06-01',
            ])
            ->assertSessionHas('success');

        $this->actingAs($this->admin)
            ->post(route('payroll.run.process'), [
                'client_id' => $this->clientB->id,
                'payroll_month' => '2026-07-01',
            ])
            ->assertSessionHas('success');

        $this->assertDatabaseHas('payroll_runs', ['client_id' => $this->clientA->id, 'payroll_month' => '2026-06-01']);
        $this->assertDatabaseHas('payroll_runs', ['client_id' => $this->clientB->id, 'payroll_month' => '2026-07-01']);
    }

    public function test_authorized_process_still_produces_correct_run_attributes()
    {
        // Proves the fix only added an authorization gate — it did not touch the underlying
        // run-creation/calculation logic. Same assertions that would have applied pre-fix.
        $this->actingAs($this->managerAOnly)
            ->post(route('payroll.run.process'), [
                'client_id' => $this->clientA->id,
                'payroll_month' => '2026-06-01',
            ])
            ->assertSessionHas('success');

        $run = PayrollRun::where('client_id', $this->clientA->id)
            ->where('payroll_month', '2026-06-01')
            ->first();

        $this->assertNotNull($run);
        $this->assertSame('draft', $run->status);
        $this->assertSame(0, $run->total_employees_processed);
        $this->assertSame(0, $run->total_employees_excluded);
        $this->assertEquals(0, (float)$run->total_gross_earnings);
        $this->assertEquals(0, (float)$run->total_net_disbursement);
    }
}
