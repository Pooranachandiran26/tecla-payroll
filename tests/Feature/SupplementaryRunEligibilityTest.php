<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\Client;
use App\Models\ClientBranch;
use App\Models\Employee;
use App\Models\PayrollRun;
use App\Models\AttendanceRecord;
use Illuminate\Foundation\Testing\RefreshDatabase;

class SupplementaryRunEligibilityTest extends TestCase
{
    use RefreshDatabase;

    protected $admin;
    protected $client;
    protected $branch;
    protected $parentRun;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::factory()->create(['role' => 'admin']);
        
        $this->client = Client::factory()->create([
            'company_name' => 'Test Eligibility Client',
            'status' => 'active',
        ]);

        $this->branch = ClientBranch::create([
            'client_id' => $this->client->id,
            'branch_name' => 'Main Office',
            'state' => 'Tamil Nadu',
        ]);

        $this->parentRun = PayrollRun::create([
            'client_id' => $this->client->id,
            'payroll_month' => '2026-08-01',
            'status' => 'locked',
            'is_supplementary_run' => false,
            'processed_by' => $this->admin->id,
            'total_employees_processed' => 1,
            'total_employees_excluded' => 0,
            'total_gross_earnings' => 20000,
            'total_net_disbursement' => 18000,
            'total_employer_statutory_cost' => 1950,
        ]);
    }

    /**
     * Test 1: Supplementary run creation is BLOCKED when ALL candidate new hires have 0 attendance.
     */
    public function test_supplementary_run_creation_blocked_when_all_candidates_lack_attendance()
    {
        // Employee with DOJ inside period but NO attendance records
        $empNoAttendance = Employee::factory()->create([
            'client_id' => $this->client->id,
            'branch_id' => $this->branch->id,
            'employee_code' => 'TEC-901',
            'full_name' => 'No Attendance New Hire',
            'status' => 'active',
            'date_of_joining' => '2026-08-10',
            'pan_number' => 'ABCDE1001F',
            'bank_account_number' => '123456789012',
            'bank_ifsc' => 'SBIN0001234',
        ]);

        $initialRunCount = PayrollRun::count();

        $response = $this->actingAs($this->admin)
            ->post(route('payroll.run.supplementary', ['id' => $this->parentRun->id]));

        $response->assertRedirect();
        $response->assertSessionHas('error');
        $this->assertStringContainsString(
            'Cannot create supplementary run: None of the candidate employees have attendance',
            session('error')
        );

        // Assert NO new PayrollRun model was persisted in DB
        $this->assertEquals($initialRunCount, PayrollRun::count(), 'Zero supplementary PayrollRun records should be persisted');
    }

    /**
     * Test 2: Supplementary run processes eligible new hires (with attendance) and skips ineligible ones (no attendance).
     */
    public function test_supplementary_run_processes_eligible_new_hires_and_skips_ineligible()
    {
        // Eligible New Hire A (has attendance)
        $empWithAtt = Employee::factory()->create([
            'client_id' => $this->client->id,
            'branch_id' => $this->branch->id,
            'employee_code' => 'TEC-902',
            'full_name' => 'Valid Attendance New Hire',
            'status' => 'active',
            'date_of_joining' => '2026-08-01',
            'pan_number' => 'ABCDE1002F',
            'aadhaar_number' => '100000000012',
            'bank_account_number' => '123456789012',
            'bank_ifsc' => 'SBIN0001234',
        ]);

        foreach ($empWithAtt->required_document_types as $docType) {
            \App\Models\EmployeeDocument::create([
                'employee_id' => $empWithAtt->id,
                'document_type' => $docType,
                'file_path' => 'documents/test.pdf',
                'status' => 'verified',
            ]);
        }

        // Add 1 attendance record for empWithAtt
        AttendanceRecord::create([
            'employee_id' => $empWithAtt->id,
            'attendance_date' => '2026-08-05',
            'status' => 'present',
            'source' => 'live_punch',
        ]);

        // Ineligible New Hire B (no attendance)
        $empNoAtt = Employee::factory()->create([
            'client_id' => $this->client->id,
            'branch_id' => $this->branch->id,
            'employee_code' => 'TEC-903',
            'full_name' => 'No Attendance New Hire',
            'status' => 'active',
            'date_of_joining' => '2026-08-01',
            'pan_number' => 'ABCDE1003F',
            'aadhaar_number' => '100000000013',
            'bank_account_number' => '123456789013',
            'bank_ifsc' => 'SBIN0001234',
        ]);

        $response = $this->actingAs($this->admin)
            ->post(route('payroll.run.supplementary', ['id' => $this->parentRun->id]));

        $response->assertRedirect();
        $response->assertSessionHas('success', 'Supplementary payroll run processed successfully.');

        // Assert 1 supplementary run was created
        $supplementary = PayrollRun::where('parent_run_id', $this->parentRun->id)->first();
        $this->assertNotNull($supplementary);
        $this->assertEquals(1, $supplementary->total_employees_processed, 'Should process 1 eligible employee');
        $this->assertEquals(1, $supplementary->total_employees_excluded, 'Should exclude 1 ineligible employee');
    }

    /**
     * Test 3: Pending supplementary card receives run_type props and candidate list gets pre-flight eligibility.
     */
    public function test_pending_supplementary_card_type_badges_and_preflight_props()
    {
        // Candidate New Hire without attendance
        $empNoAtt = Employee::factory()->create([
            'client_id' => $this->client->id,
            'branch_id' => $this->branch->id,
            'employee_code' => 'TEC-904',
            'full_name' => 'Preflight Test Emp',
            'status' => 'active',
            'date_of_joining' => '2026-08-01',
            'pan_number' => 'ABCDE1004F',
            'bank_account_number' => '123456789012',
            'bank_ifsc' => 'SBIN0001234',
        ]);

        $response = $this->actingAs($this->admin)
            ->get(route('payroll.approval', [
                'client_id' => $this->client->id,
                'payroll_month' => '2026-08-01'
            ]));

        $response->assertOk();
        $newHiresProps = $response->viewData('page')['props']['newHires'];

        $this->assertNotEmpty($newHiresProps);
        $candidate = collect($newHiresProps)->firstWhere('employee_code', 'TEC-904');
        $this->assertNotNull($candidate);
        $this->assertFalse($candidate['is_eligible'], 'Candidate without attendance should be pre-validated as ineligible');
        $this->assertContains('No attendance data', $candidate['exclusions']);
    }
}
