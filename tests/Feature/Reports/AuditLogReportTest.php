<?php

namespace Tests\Feature\Reports;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use App\Models\User;
use App\Models\AuditLog;
use App\Services\Reports\AuditLogReportService;

class AuditLogReportTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;
    protected User $manager;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::factory()->create(['name' => 'Admin User', 'email' => 'admin@tecla.com', 'role' => 'admin', 'status' => 'active']);
        $this->manager = User::factory()->create(['name' => 'Manager User', 'email' => 'manager@tecla.com', 'role' => 'manager', 'status' => 'active']);

        AuditLog::create([
            'user_id' => $this->admin->id,
            'action' => 'payroll_locked',
            'auditable_type' => 'App\\Models\\PayrollRun',
            'auditable_id' => 1,
            'ip_address' => '192.168.1.1',
        ]);

        AuditLog::create([
            'user_id' => $this->manager->id,
            'action' => 'invoice_emailed',
            'auditable_type' => 'App\\Models\\Invoice',
            'auditable_id' => 1,
            'ip_address' => '192.168.1.2',
        ]);
    }

    /**
     * Test 1: Admin sees all user activity audit logs
     */
    public function test_1_admin_sees_audit_logs()
    {
        $svc = new AuditLogReportService();
        $rows = $svc->runForExport([], $this->admin);

        $this->assertCount(2, $rows);
        $this->assertTrue($rows->pluck('action')->contains('Payroll locked'));
        $this->assertTrue($rows->pluck('action')->contains('Invoice emailed'));
    }

    /**
     * Test 2: Manager blocked with HTTP 403 Forbidden across all actions
     */
    public function test_2_manager_blocked_with_403_forbidden()
    {
        $this->actingAs($this->manager)->get('/admin/reports/audit_log_report')->assertStatus(403);
        $this->actingAs($this->manager)->get('/admin/reports/audit_log_report/export')->assertStatus(403);
        $this->actingAs($this->manager)->get('/admin/reports/audit_log_report/pdf')->assertStatus(403);
    }

    /**
     * Test 3: CSV Export Response
     */
    public function test_3_csv_export_response()
    {
        $res = $this->actingAs($this->admin)->get('/admin/reports/audit_log_report/export');
        $res->assertStatus(200);
        $res->assertHeader('content-type', 'text/csv; charset=UTF-8');
    }

    /**
     * Test 4: PDF Export Response
     */
    public function test_4_pdf_export_response()
    {
        $res = $this->actingAs($this->admin)->get('/admin/reports/audit_log_report/pdf');
        $res->assertStatus(200);
        $res->assertHeader('content-type', 'application/pdf');
    }
}
