<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\Client;
use App\Models\Employee;
use App\Models\AttendanceRecord;
use App\Models\AttendanceUploadBatch;
use App\Models\ClientAttendanceVerification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Carbon\Carbon;
use Inertia\Testing\AssertableInertia as Assert;

class AttendanceReviewTest extends TestCase
{
    use RefreshDatabase;

    protected $admin;
    protected $clientA;
    protected $clientB;
    protected $employeeA;
    protected $employeeB;
    protected $branchA;
    protected $branchB;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(\Database\Seeders\AuthSecuritySettingsSeeder::class);

        $this->admin = User::factory()->create(['role' => 'admin', 'status' => 'active']);

        $this->clientA = Client::factory()->create(['company_name' => 'Client A', 'status' => 'active']);
        $this->clientB = Client::factory()->create(['company_name' => 'Client B', 'status' => 'active']);

        $this->branchA = \App\Models\ClientBranch::create([
            'client_id' => $this->clientA->id,
            'branch_name' => 'Branch A',
            'state' => 'Maharashtra',
            'gstin' => '27ABCDE1234F1Z5',
        ]);

        $this->branchB = \App\Models\ClientBranch::create([
            'client_id' => $this->clientB->id,
            'branch_name' => 'Branch B',
            'state' => 'Karnataka',
            'gstin' => '29ABCDE1234F1Z5',
        ]);

        $this->employeeA = Employee::factory()->create([
            'client_id' => $this->clientA->id,
            'branch_id' => $this->branchA->id,
            'employee_code' => 'EMP-A01',
            'full_name' => 'Employee A',
            'status' => 'active',
            'uan_mode' => 'new',
            'personal_email' => 'empa@example.com',
            'bank_account_number' => '9999000011',
            'pan_number' => 'ABCDE1111A',
            'aadhaar_number' => '100020003001',
        ]);

        $this->employeeB = Employee::factory()->create([
            'client_id' => $this->clientB->id,
            'branch_id' => $this->branchB->id,
            'employee_code' => 'EMP-B01',
            'full_name' => 'Employee B',
            'status' => 'active',
            'uan_mode' => 'new',
            'personal_email' => 'empb@example.com',
            'bank_account_number' => '9999000022',
            'pan_number' => 'ABCDE1111B',
            'aadhaar_number' => '100020003002',
        ]);
    }

    /**
     * 1. Index page loads: check sources resolution.
     */
    public function test_index_page_loads_with_correct_sources()
    {
        // Client A: No Data Yet
        // Client B: Biometric (has attendance records but no upload batch)
        AttendanceRecord::create([
            'employee_id' => $this->employeeB->id,
            'attendance_date' => '2026-07-02',
            'status' => 'present',
            'source' => 'live_punch'
        ]);

        $response = $this->actingAs($this->admin)->get('/payroll/attendance-review?month=2026-07');

        $response->assertStatus(200);
        $response->assertInertia(fn (Assert $page) => $page
            ->component('Payroll/AttendanceReview')
            ->has('initialBatches', 2)
            ->where('initialBatches.0.client', 'Client B')
            ->where('initialBatches.0.source', 'Biometric portal / Punch-in')
            ->where('initialBatches.1.client', 'Client A')
            ->where('initialBatches.1.source', 'No Data Yet')
        );

        // Client A now gets a spreadsheet upload batch
        AttendanceUploadBatch::create([
            'client_id' => $this->clientA->id,
            'target_month' => '2026-07-01',
            'uploaded_file_name' => 'test.csv',
            'total_rows' => 1,
            'matched_rows' => 1,
            'status' => 'pending_verification',
            'uploaded_by' => $this->admin->id
        ]);

        $response2 = $this->actingAs($this->admin)->get('/payroll/attendance-review?month=2026-07');
        $response2->assertInertia(fn (Assert $page) => $page
            ->component('Payroll/AttendanceReview')
            ->where('initialBatches.1.client', 'Client A')
            ->where('initialBatches.1.source', 'Spreadsheet Upload')
        );
    }

    /**
     * 2. Verify logs endpoint returning correct eligibility checks.
     */
    public function test_verify_logs_endpoint_returns_correct_checklist()
    {
        // Clear bank details for employee A to make them ineligible
        $this->employeeA->update([
            'bank_ifsc' => ''
        ]);

        $response = $this->actingAs($this->admin)->get("/payroll/attendance-review/{$this->clientA->id}/verify?month=2026-07");

        $response->assertStatus(200);
        $response->assertJsonPath('total_checked', 1);
        $response->assertJsonPath('eligible_count', 0);
        $exclusions = $response->json('exclusions');
        $hasBankExclusion = collect($exclusions)->contains(fn($e) => str_contains($e, 'Incomplete bank details'));
        $this->assertTrue($hasBankExclusion, 'Exclusions list should contain "Incomplete bank details".');
    }

    /**
     * 3. Save verification status.
     */
    public function test_save_verification_status_successfully()
    {
        $response = $this->actingAs($this->admin)->post("/payroll/attendance-review/{$this->clientA->id}/verify", [
            'month' => '2026-07'
        ]);

        $response->assertStatus(200);
        $response->assertJson(['success' => true]);

        $this->assertDatabaseHas('client_attendance_verifications', [
            'client_id' => $this->clientA->id,
            'target_month' => '2026-07-01 00:00:00',
            'verified_by' => $this->admin->id,
        ]);
    }

    /**
     * 4. Verification display: returns verification details.
     */
    public function test_verification_metadata_returned_in_page_props()
    {
        ClientAttendanceVerification::create([
            'client_id' => $this->clientA->id,
            'target_month' => '2026-07-01',
            'verified_by' => $this->admin->id,
            'verified_at' => Carbon::now()
        ]);

        $response = $this->actingAs($this->admin)->get('/payroll/attendance-review?month=2026-07');

        $response->assertInertia(fn (Assert $page) => $page
            ->component('Payroll/AttendanceReview')
            ->where('initialBatches.1.status', 'verified')
            ->where('initialBatches.1.verifiedText', fn ($text) => 
                str_contains($text, 'Verified') && str_contains($text, $this->admin->name)
            )
        );
    }

    /**
     * 5. Invalidate verification: confirm Eloquent listener works.
     */
    public function test_invalidation_mechanism_on_attendance_change()
    {
        ClientAttendanceVerification::create([
            'client_id' => $this->clientA->id,
            'target_month' => '2026-07-01',
            'verified_by' => $this->admin->id,
            'verified_at' => Carbon::now()
        ]);

        // Assert verified row exists in DB
        $this->assertDatabaseHas('client_attendance_verifications', [
            'client_id' => $this->clientA->id,
            'target_month' => '2026-07-01 00:00:00',
        ]);

        // Create new punch in July 2026
        AttendanceRecord::create([
            'employee_id' => $this->employeeA->id,
            'attendance_date' => '2026-07-15',
            'status' => 'present',
            'source' => 'live_punch'
        ]);

        // Assert verification row is AUTOMATICALLY DELETED (invalidated)
        $this->assertDatabaseMissing('client_attendance_verifications', [
            'client_id' => $this->clientA->id,
            'target_month' => '2026-07-01 00:00:00',
        ]);
    }

    /**
     * 6. Payroll execution is not bypassed by verified state.
     */
    public function test_payroll_execution_ignores_stale_verified_badge()
    {
        // 1. Client verified
        ClientAttendanceVerification::create([
            'client_id' => $this->clientA->id,
            'target_month' => '2026-07-01',
            'verified_by' => $this->admin->id,
            'verified_at' => Carbon::now()
        ]);

        // 2. Make employee ineligible AFTER verification (direct DB edit to bypass validation observers)
        // Set bank IFSC to empty
        $this->employeeA->update(['bank_ifsc' => '']);

        // Provide attendance data so it doesn't fail on that check
        AttendanceRecord::create([
            'employee_id' => $this->employeeA->id,
            'attendance_date' => '2026-07-15',
            'status' => 'present',
            'source' => 'live_punch'
        ]);

        // 3. Initiate payroll run for Client A in July 2026
        $response = $this->actingAs($this->admin)->post('/payroll/runs', [
            'client_id' => $this->clientA->id,
            'payroll_month' => '2026-07',
        ]);

        $response->assertRedirect();
        
        // Retrieve processed run item for Employee A
        $runItem = \App\Models\PayrollRunItem::where('employee_id', $this->employeeA->id)->first();
        
        // Assert Employee A was EXCLUDED because verification doesn't bypass the live check at process time
        $this->assertNotNull($runItem);
        $this->assertEquals(1, $runItem->is_excluded);
        $this->assertStringContainsString('Incomplete bank details', $runItem->exclusion_reason);
    }
}
