<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use App\Models\User;
use App\Models\Client;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class BulkUploadSessionPersistenceTest extends TestCase
{
    use RefreshDatabase;

    protected $admin;
    protected $client;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::factory()->create([
            'role' => 'admin',
            'status' => 'active',
        ]);

        $this->client = Client::factory()->create([
            'company_name' => 'Session Test Corp',
            'client_code' => 'SESS-CORP-01',
            'status' => 'active',
        ]);
    }

    public function test_validated_upload_persists_in_cache_for_10_minutes()
    {
        $batchId = (string) Str::uuid();

        // Create staging row via DB::table
        DB::table('bulk_upload_staging_rows')->insert([
            'batch_id' => $batchId,
            'row_no' => 2,
            'employee_code' => 'SESS_EMP_01',
            'full_name' => 'Session Employee 1',
            'client_code' => $this->client->client_code,
            'status' => 'ready',
            'raw_data' => json_encode(['full_name' => 'Session Employee 1']),
            'db_payload' => json_encode(['ctc_monthly' => 45000, 'pf_applicable' => true]),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $sessionData = [
            'batch_id' => $batchId,
            'file_name' => 'Session_Test.xlsx',
            'file_size' => 12345,
            'total_rows' => 1,
            'valid_count' => 1,
            'error_count' => 0,
            'warning_count' => 0,
            'expires_at' => now()->addMinutes(10)->timestamp,
        ];

        Cache::put('bulk_upload_session_' . $this->admin->id, $sessionData, now()->addMinutes(10));

        $this->assertTrue(Cache::has('bulk_upload_session_' . $this->admin->id));

        // Visit upload page as admin
        $response = $this->actingAs($this->admin)->get(route('employees.bulk-upload'));

        $response->assertStatus(200);
        $response->assertInertia(fn ($page) => $page
            ->component('Employees/BulkUpload')
            ->has('active_session_batch')
            ->where('active_session_batch.batch_id', $batchId)
            ->where('active_session_batch.valid_count', 1)
        );
    }

    public function test_clear_session_route_purges_cache_and_staging_rows()
    {
        $batchId = (string) Str::uuid();

        DB::table('bulk_upload_staging_rows')->insert([
            'batch_id' => $batchId,
            'row_no' => 2,
            'employee_code' => 'SESS_EMP_02',
            'full_name' => 'Session Employee 2',
            'client_code' => $this->client->client_code,
            'status' => 'ready',
            'raw_data' => json_encode([]),
            'db_payload' => json_encode(['ctc_monthly' => 50000]),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        Cache::put('bulk_upload_session_' . $this->admin->id, [
            'batch_id' => $batchId,
            'file_name' => 'Session_Test2.xlsx',
        ], 600);

        $response = $this->actingAs($this->admin)->post(route('employees.bulk-upload.clear-session'));

        $response->assertStatus(200);
        $this->assertFalse(Cache::has('bulk_upload_session_' . $this->admin->id));
        $this->assertDatabaseMissing('bulk_upload_staging_rows', ['batch_id' => $batchId]);
    }
}
