<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\Client;
use App\Models\Employee;
use App\Services\FastBulkUploadService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;

class FastBulkUploadPerformanceTest extends TestCase
{
    use RefreshDatabase;

    protected FastBulkUploadService $fastService;
    protected Client $client;

    protected function setUp(): void
    {
        parent::setUp();
        $this->fastService = app(FastBulkUploadService::class);

        $this->client = Client::factory()->create([
            'company_name' => 'Benchmark Client Ltd',
            'client_code' => 'BENCH001',
            'contract_type' => 'agency',
            'pf_applicable' => true,
            'esi_applicable' => true,
            'status' => 'active',
        ]);

        $this->client->branches()->create([
            'branch_name' => 'Main Branch',
            'state' => 'Karnataka',
            'is_head_office' => true,
        ]);
    }

    public function test_10k_employee_bulk_upload_performance()
    {
        $batchId = (string) Str::uuid();
        $csvPath = storage_path('app/temp_bulk_uploads/benchmark_10k.csv');

        if (!is_dir(dirname($csvPath))) {
            mkdir(dirname($csvPath), 0755, true);
        }

        $fp = fopen($csvPath, 'w');
        fputcsv($fp, [
            'employee_code', 'full_name', 'client_code', 'branch_name', 'personal_email', 'phone_number',
            'date_of_birth', 'date_of_joining', 'designation', 'employment_model', 'prior_employment_flag',
            'residential_address', 'bank_account_number', 'bank_ifsc', 'bank_name', 'bank_branch',
            'account_holder_name', 'pan_number', 'basic_pay', 'hra', 'conveyance', 'da',
            'medical_allowance', 'special_allowance', 'other_additions', 'pf_applicable', 'eps_applicable',
            'esi_applicable', 'pt_applicable', 'lwf_applicable', 'tds_applicable', 'uan_mode',
            'uan_number', 'esi_mode', 'esic_number', 'tds_regime', 'gratuity_mode', 'lop_basis_days',
            'declarations_accepted', 'reporting_manager_code'
        ]);

        for ($i = 1; $i <= 10000; $i++) {
            $panChar = chr(65 + (int)floor($i / 1000) % 26);
            $panNum = sprintf('%04d', $i % 10000);
            $pan = 'BENCH' . $panNum . $panChar;

            fputcsv($fp, [
                "BENCH-{$i}", "Benchmark Employee {$i}", "BENCH001", "Main Branch", "bench_{$i}@example.com", "97" . sprintf("%08d", $i),
                "1992-05-15", "2024-01-01", "Software Engineer", "agency_contract", "0",
                "Plot {$i}, Tech Park, Bengaluru", sprintf("990088%06d", $i), "SBIN0001234", "State Bank of India", "Main Branch",
                "Benchmark Employee {$i}", $pan, "25000", "10000", "2000", "0",
                "1250", "5000", "0", "1", "1", "0", "1", "1", "1", "new",
                "", "new", "", "new", "part_of_ctc", "30", "1", ""
            ]);
        }
        fclose($fp);

        $startTime = microtime(true);
        $res = $this->fastService->processUpload($csvPath, $batchId);
        $validateDuration = microtime(true) - $startTime;

        $this->assertEquals(10000, $res['total_rows']);
        $this->assertEquals(10000, $res['valid_count']);
        $this->assertEquals(0, $res['error_count']);

        $importStartTime = microtime(true);
        $importRes = $this->fastService->executeBatchImport($batchId);
        $importDuration = microtime(true) - $importStartTime;

        $totalDuration = $validateDuration + $importDuration;

        @unlink($csvPath);

        $this->assertTrue($importRes['success']);
        $this->assertEquals(10000, $importRes['imported_count']);
        $this->assertEquals(10000, Employee::count());

        // Assert total execution under 30 seconds for 10,000 records in local test environment
        $this->assertLessThan(30.0, $totalDuration, "10k bulk upload should finish in under 30.0 seconds (took {$totalDuration}s)");
    }
}
