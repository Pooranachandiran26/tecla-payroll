<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use App\Models\User;
use App\Models\Client;
use App\Models\ClientBranch;
use App\Models\PayrollRun;
use App\Models\PfEcrBatch;
use App\Models\EsiMonthlyBatch;
use App\Models\PtChallanBatch;
use App\Models\Tds24qBatch;
use App\Models\ClientAuditPackBatch;
use Illuminate\Support\Facades\Storage;
use ZipArchive;

class ClientAuditPackTest extends TestCase
{
    use RefreshDatabase;

    protected User $adminUser;
    protected User $employeeUser;
    protected Client $client;
    protected Client $otherClient;
    protected PayrollRun $lockedRun;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('local');

        $this->adminUser = User::factory()->create(['role' => 'admin']);
        $this->employeeUser = User::factory()->create(['role' => 'employee']);

        $this->client = Client::factory()->create([
            'company_name' => 'Audit Test Client',
            'client_code' => 'AUD01',
            'gstin' => '27AAAAA0000A1Z5',
            'status' => 'active',
        ]);
        $this->otherClient = Client::factory()->create([
            'company_name' => 'Other Client',
            'client_code' => 'AUD02',
            'status' => 'active',
        ]);

        $this->lockedRun = PayrollRun::create([
            'client_id' => $this->client->id,
            'payroll_month' => '2026-06-01',
            'status' => 'locked',
        ]);

        // Real files under storage, matching each service's own path convention.
        Storage::disk('local')->put("pf_ecr/{$this->client->id}/PF_TEST.txt", 'pf-content');
        Storage::disk('local')->put("esi_monthly/{$this->client->id}/ESI_TEST.xls", 'esi-content');
        Storage::disk('local')->put("pt_challan/{$this->client->id}/PT_TEST.xls", 'pt-content');
        Storage::disk('local')->put("tds_24q/{$this->client->id}/TDS_TEST.txt", 'tds-content');

        PfEcrBatch::create([
            'client_id' => $this->client->id, 'payroll_run_id' => $this->lockedRun->id,
            'pf_establishment_code' => 'X', 'wage_month' => '2026-06-01', 'status' => 'generated',
            'file_path' => "pf_ecr/{$this->client->id}/PF_TEST.txt", 'file_name' => 'PF_TEST.txt',
        ]);
        EsiMonthlyBatch::create([
            'client_id' => $this->client->id, 'payroll_run_id' => $this->lockedRun->id,
            'wage_month' => '2026-06-01', 'status' => 'generated',
            'file_path' => "esi_monthly/{$this->client->id}/ESI_TEST.xls", 'file_name' => 'ESI_TEST.xls',
        ]);
        PtChallanBatch::create([
            'client_id' => $this->client->id, 'payroll_run_id' => $this->lockedRun->id,
            'wage_month' => '2026-06', 'status' => 'generated',
            'file_path' => "pt_challan/{$this->client->id}/PT_TEST.xls", 'file_name' => 'PT_TEST.xls',
        ]);
        Tds24qBatch::create([
            'client_id' => $this->client->id, 'financial_year' => '2026-2027', 'assessment_year' => '2027-2028',
            'quarter' => 'Q1', 'status' => 'generated',
            'txt_file_path' => "tds_24q/{$this->client->id}/TDS_TEST.txt", 'txt_file_name' => 'TDS_TEST.txt',
        ]);
    }

    private function openZip(string $path): ZipArchive
    {
        $zip = new ZipArchive();
        $zip->open(Storage::disk('local')->path($path));
        return $zip;
    }

    /** @test */
    public function generates_zip_with_correct_structure_manifest_and_readme()
    {
        $response = $this->actingAs($this->adminUser)
            ->postJson(route('compliance.audit_pack.generate'), [
                'client_id' => $this->client->id, 'period' => '2026-06',
            ]);

        $response->assertStatus(200)->assertJson(['success' => true, 'included_count' => 4]);

        $batch = ClientAuditPackBatch::find($response->json('batch_id'));
        Storage::disk('local')->assertExists($batch->file_path);

        $zip = $this->openZip($batch->file_path);
        $this->assertNotFalse($zip->locateName('Client_Audit_Pack/PF/PF_TEST.txt'));
        $this->assertNotFalse($zip->locateName('Client_Audit_Pack/ESI/ESI_TEST.xls'));
        $this->assertNotFalse($zip->locateName('Client_Audit_Pack/PT/PT_TEST.xls'));
        $this->assertNotFalse($zip->locateName('Client_Audit_Pack/TDS_24Q/TDS_TEST.txt'));
        $this->assertNotFalse($zip->locateName('Client_Audit_Pack/GSTR1/UNAVAILABLE.txt'));
        $this->assertStringContainsString('period-wide', $zip->getFromName('Client_Audit_Pack/GSTR1/UNAVAILABLE.txt'));
        $this->assertNotFalse($zip->locateName('Client_Audit_Pack/README.txt'));
        $this->assertStringContainsString('Audit Test Client', $zip->getFromName('Client_Audit_Pack/README.txt'));

        $manifest = json_decode($zip->getFromName('Client_Audit_Pack/manifest.json'), true);
        $this->assertEquals($this->client->id, $manifest['client_id']);
        $this->assertEquals('2026-06', $manifest['period']);
        $this->assertCount(4, $manifest['files']);
        $this->assertEquals(hash('sha256', 'pf-content'), collect($manifest['files'])->firstWhere('folder', 'PF')['sha256']);
        $zip->close();
    }

    /** @test */
    public function another_clients_files_are_never_included()
    {
        Storage::disk('local')->put("pf_ecr/{$this->otherClient->id}/OTHER.txt", 'other');
        $otherRun = PayrollRun::create(['client_id' => $this->otherClient->id, 'payroll_month' => '2026-06-01', 'status' => 'locked']);
        PfEcrBatch::create([
            'client_id' => $this->otherClient->id, 'payroll_run_id' => $otherRun->id,
            'pf_establishment_code' => 'X', 'wage_month' => '2026-06-01', 'status' => 'generated',
            'file_path' => "pf_ecr/{$this->otherClient->id}/OTHER.txt", 'file_name' => 'OTHER.txt',
        ]);

        $response = $this->actingAs($this->adminUser)
            ->postJson(route('compliance.audit_pack.generate'), ['client_id' => $this->client->id, 'period' => '2026-06']);

        $batch = ClientAuditPackBatch::find($response->json('batch_id'));
        $zip = $this->openZip($batch->file_path);
        $this->assertFalse($zip->locateName('Client_Audit_Pack/PF/OTHER.txt'));
        $zip->close();
    }

    /** @test */
    public function only_generated_or_downloaded_status_batches_are_included()
    {
        PtChallanBatch::where('client_id', $this->client->id)->update(['status' => 'filed']);

        $response = $this->actingAs($this->adminUser)
            ->postJson(route('compliance.audit_pack.generate'), ['client_id' => $this->client->id, 'period' => '2026-06']);

        $response->assertJson(['included_count' => 3, 'missing_count' => 2]); // PT + GSTR1 missing
        $this->assertStringContainsString('No PT batch found', collect($response->json('manifest.missing_items'))->firstWhere('folder', 'PT')['reason']);
    }

    /** @test */
    public function missing_compliance_outputs_are_reported_not_fabricated()
    {
        EsiMonthlyBatch::where('client_id', $this->client->id)->delete();

        $response = $this->actingAs($this->adminUser)
            ->postJson(route('compliance.audit_pack.generate'), ['client_id' => $this->client->id, 'period' => '2026-06']);

        $missing = collect($response->json('manifest.missing_items'))->firstWhere('folder', 'ESI');
        $this->assertNotNull($missing);
        $this->assertStringContainsString('No ESI batch found', $missing['reason']);
    }

    /** @test */
    public function empty_pack_is_handled_safely_when_nothing_exists_for_period()
    {
        $response = $this->actingAs($this->adminUser)
            ->postJson(route('compliance.audit_pack.generate'), ['client_id' => $this->client->id, 'period' => '2099-01']);

        $response->assertStatus(200)->assertJson(['success' => true, 'included_count' => 0, 'missing_count' => 5]);
        $batch = ClientAuditPackBatch::find($response->json('batch_id'));
        Storage::disk('local')->assertExists($batch->file_path);
    }

    /** @test */
    public function malicious_file_name_cannot_escape_its_zip_folder()
    {
        Storage::disk('local')->put("pf_ecr/{$this->client->id}/evil.txt", 'evil');
        PfEcrBatch::where('client_id', $this->client->id)->update([
            'file_path' => "pf_ecr/{$this->client->id}/evil.txt",
            'file_name' => '../../../../etc/passwd',
        ]);

        $response = $this->actingAs($this->adminUser)
            ->postJson(route('compliance.audit_pack.generate'), ['client_id' => $this->client->id, 'period' => '2026-06']);

        $batch = ClientAuditPackBatch::find($response->json('batch_id'));
        $zip = $this->openZip($batch->file_path);
        for ($i = 0; $i < $zip->numFiles; $i++) {
            $name = $zip->getNameIndex($i);
            $this->assertStringStartsWith('Client_Audit_Pack/', $name);
            $this->assertStringNotContainsString('..', $name);
        }
        $zip->close();
    }

    /** @test */
    public function employee_role_cannot_access_audit_pack_routes()
    {
        $this->actingAs($this->employeeUser)
            ->postJson(route('compliance.audit_pack.generate'), ['client_id' => $this->client->id, 'period' => '2026-06'])
            ->assertStatus(403);
    }

    /** @test */
    public function download_streams_zip_and_marks_downloaded()
    {
        $gen = $this->actingAs($this->adminUser)
            ->postJson(route('compliance.audit_pack.generate'), ['client_id' => $this->client->id, 'period' => '2026-06']);
        $batchId = $gen->json('batch_id');

        $this->actingAs($this->adminUser)
            ->get(route('compliance.audit_pack.download', $batchId))
            ->assertStatus(200)
            ->assertHeader('content-type', 'application/zip');

        $this->assertEquals('downloaded', ClientAuditPackBatch::find($batchId)->status);
    }
}
