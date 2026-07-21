<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use App\Models\User;
use App\Models\Client;
use App\Models\Employee;
use App\Models\Setting;
use App\Services\SettingsService;
use App\Services\StatutoryFilingResolutionService;

class StatutoryFilingResolutionServiceTest extends TestCase
{
    use RefreshDatabase;

    protected StatutoryFilingResolutionService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = new StatutoryFilingResolutionService();
    }

    public function test_eor_employee_resolves_to_client_code_when_configured()
    {
        $client = Client::factory()->create([
            'company_name' => 'EOR Client Corp',
            'pf_establishment_code' => 'CLIENT-PF-100',
            'esi_code_number' => 'CLIENT-ESI-100',
        ]);
        $branch = \App\Models\ClientBranch::factory()->create(['client_id' => $client->id]);

        $employee = Employee::factory()->create([
            'client_id' => $client->id,
            'branch_id' => $branch->id,
            'employment_model' => 'eor',
        ]);

        $res = $this->service->resolveRegistrationForEmployee($employee);

        $this->assertTrue($res['pf']['is_resolved']);
        $this->assertEquals('CLIENT-PF-100', $res['pf']['code']);
        $this->assertEquals('client', $res['pf']['filing_entity']);
        $this->assertNull($res['pf']['missing_reason']);

        $this->assertTrue($res['esi']['is_resolved']);
        $this->assertEquals('CLIENT-ESI-100', $res['esi']['code']);
        $this->assertEquals('client', $res['esi']['filing_entity']);
    }

    public function test_eor_employee_fails_resolution_when_client_code_is_null()
    {
        $client = Client::factory()->create([
            'company_name' => 'Unconfigured Client',
            'pf_establishment_code' => null,
            'esi_code_number' => null,
        ]);
        $branch = \App\Models\ClientBranch::factory()->create(['client_id' => $client->id]);

        $employee = Employee::factory()->create([
            'client_id' => $client->id,
            'branch_id' => $branch->id,
            'employment_model' => 'eor',
        ]);

        $res = $this->service->resolveRegistrationForEmployee($employee);

        $this->assertFalse($res['pf']['is_resolved']);
        $this->assertNull($res['pf']['code']);
        $this->assertEquals('client', $res['pf']['filing_entity']);
        $this->assertStringContainsString("Client 'Unconfigured Client' has no PF", $res['pf']['missing_reason']);
    }

    public function test_agency_employee_resolves_to_tecla_settings_code()
    {
        // Set Tecla Agency Settings codes
        SettingsService::set('company_profile.pf_establishment_code', 'TECLA-AGENCY-PF-999');
        SettingsService::set('company_profile.esi_code_number', 'TECLA-AGENCY-ESI-999');

        $client = Client::factory()->create([
            'pf_establishment_code' => 'DIFFERENT-CLIENT-PF',
        ]);
        $branch = \App\Models\ClientBranch::factory()->create(['client_id' => $client->id]);

        $employee = Employee::factory()->create([
            'client_id' => $client->id,
            'branch_id' => $branch->id,
            'employment_model' => 'agency_contract',
        ]);

        $res = $this->service->resolveRegistrationForEmployee($employee);

        $this->assertTrue($res['pf']['is_resolved']);
        $this->assertEquals('TECLA-AGENCY-PF-999', $res['pf']['code']);
        $this->assertNotEquals('DIFFERENT-CLIENT-PF', $res['pf']['code']);
        $this->assertEquals('agency', $res['pf']['filing_entity']);
        $this->assertNull($res['pf']['missing_reason']);
    }

    public function test_agency_employee_fails_resolution_when_tecla_settings_code_is_null()
    {
        // Ensure Tecla Settings codes are null
        SettingsService::set('company_profile.pf_establishment_code', null);

        $client = Client::factory()->create([
            'pf_establishment_code' => 'SOME-CLIENT-PF',
        ]);
        $branch = \App\Models\ClientBranch::factory()->create(['client_id' => $client->id]);

        $employee = Employee::factory()->create([
            'client_id' => $client->id,
            'branch_id' => $branch->id,
            'employment_model' => 'agency_contract',
        ]);

        $res = $this->service->resolveRegistrationForEmployee($employee);

        $this->assertFalse($res['pf']['is_resolved']);
        $this->assertNull($res['pf']['code']);
        $this->assertEquals('agency', $res['pf']['filing_entity']);
        $this->assertStringContainsString("Tecla Agency (Settings) has no PF", $res['pf']['missing_reason']);
    }

    public function test_mixed_batch_multi_client_resolution()
    {
        // Set Tecla Agency Settings PF code
        SettingsService::set('company_profile.pf_establishment_code', 'TECLA-AGENCY-PF');

        // Client A has its own PF code
        $clientA = Client::factory()->create([
            'company_name' => 'Client A',
            'pf_establishment_code' => 'CLIENT-A-PF',
        ]);
        $branchA = \App\Models\ClientBranch::factory()->create(['client_id' => $clientA->id]);

        // Client B has NO PF code (null)
        $clientB = Client::factory()->create([
            'company_name' => 'Client B',
            'pf_establishment_code' => null,
        ]);
        $branchB = \App\Models\ClientBranch::factory()->create(['client_id' => $clientB->id]);

        $eorEmpA = Employee::factory()->create([
            'client_id' => $clientA->id,
            'branch_id' => $branchA->id,
            'employment_model' => 'eor',
            'bank_account_number' => '100000000001',
            'pan_number' => 'ABCDE1001A',
            'aadhaar_number' => '100000000001'
        ]);
        $eorEmpB = Employee::factory()->create([
            'client_id' => $clientB->id,
            'branch_id' => $branchB->id,
            'employment_model' => 'eor',
            'bank_account_number' => '100000000002',
            'pan_number' => 'ABCDE1002A',
            'aadhaar_number' => '100000000002'
        ]);

        $agencyEmpA = Employee::factory()->create([
            'client_id' => $clientA->id,
            'branch_id' => $branchA->id,
            'employment_model' => 'agency_contract',
            'bank_account_number' => '100000000003',
            'pan_number' => 'ABCDE1003A',
            'aadhaar_number' => '100000000003'
        ]);
        $agencyEmpB = Employee::factory()->create([
            'client_id' => $clientB->id,
            'branch_id' => $branchB->id,
            'employment_model' => 'agency_contract',
            'bank_account_number' => '100000000004',
            'pan_number' => 'ABCDE1004A',
            'aadhaar_number' => '100000000004'
        ]);

        $resEorA = $this->service->resolveStatuteForEmployee($eorEmpA, 'pf');
        $resEorB = $this->service->resolveStatuteForEmployee($eorEmpB, 'pf');
        $resAgencyA = $this->service->resolveStatuteForEmployee($agencyEmpA, 'pf');
        $resAgencyB = $this->service->resolveStatuteForEmployee($agencyEmpB, 'pf');

        // EOR Employee A resolves to Client A's code
        $this->assertTrue($resEorA['is_resolved']);
        $this->assertEquals('CLIENT-A-PF', $resEorA['code']);
        $this->assertEquals('client', $resEorA['filing_entity']);

        // EOR Employee B fails resolution (missing Client B code)
        $this->assertFalse($resEorB['is_resolved']);
        $this->assertEquals('client', $resEorB['filing_entity']);

        // Explicit Proof Assertion 1: Agency Employee under Client A ignores Client A's code and uses Tecla's code
        $this->assertEquals('TECLA-AGENCY-PF', $resAgencyA['code']);
        $this->assertNotEquals('CLIENT-A-PF', $resAgencyA['code']);
        $this->assertEquals('agency', $resAgencyA['filing_entity']);

        // Explicit Proof Assertion 2: Agency Employee under Client B (with NULL client code) still resolves to Tecla's code
        $this->assertEquals('TECLA-AGENCY-PF', $resAgencyB['code']);
        $this->assertTrue($resAgencyB['is_resolved']);
        $this->assertEquals('agency', $resAgencyB['filing_entity']);
    }

    public function test_hybrid_client_distinguishes_client_vs_agency_missing_reasons()
    {
        // Seed Tecla Settings as NULL
        SettingsService::set('company_profile.pf_establishment_code', null);

        // Seed a Hybrid Client with NULL PF code
        $hybridClient = Client::factory()->create([
            'company_name' => 'Hybrid Tech Pvt Ltd',
            'contract_type' => 'hybrid',
            'pf_establishment_code' => null,
        ]);
        $branch = \App\Models\ClientBranch::factory()->create(['client_id' => $hybridClient->id]);

        // Add 1 EOR Employee and 1 Agency Employee under this Hybrid Client
        Employee::factory()->create([
            'client_id' => $hybridClient->id,
            'branch_id' => $branch->id,
            'employment_model' => 'eor',
            'status' => 'active',
            'bank_account_number' => '100000000005',
            'pan_number' => 'ABCDE1005A',
            'aadhaar_number' => '100000000005'
        ]);
        Employee::factory()->create([
            'client_id' => $hybridClient->id,
            'branch_id' => $branch->id,
            'employment_model' => 'agency_contract',
            'status' => 'active',
            'bank_account_number' => '100000000006',
            'pan_number' => 'ABCDE1006A',
            'aadhaar_number' => '100000000006'
        ]);

        $res = $this->service->resolveClientRegistrationStatus($hybridClient, 'pf');

        $this->assertFalse($res['is_fully_resolved']);
        $this->assertEquals(2, $res['total_unresolved_employees']);

        // Assert separate breakdowns
        $this->assertEquals(1, $res['breakdown']['client']['unresolved_count']);
        $this->assertStringContainsString("Client 'Hybrid Tech Pvt Ltd' has no PF", $res['breakdown']['client']['reason']);

        $this->assertEquals(1, $res['breakdown']['agency']['unresolved_count']);
        $this->assertStringContainsString("Tecla Agency (Settings) has no PF", $res['breakdown']['agency']['reason']);
    }
}
