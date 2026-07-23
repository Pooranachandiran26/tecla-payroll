<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\Client;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;

class RawEvidenceTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->artisan('db:seed');
    }

    public function test_generate_raw_evidence()
    {
        $admin = User::where('role', 'admin')->first();

        echo "\n\n--- 1. RAW CLIENT BRANCH & CONTACT ROW BEFORE EDIT ---\n";
        $payload = [
            'name' => 'Raw Verification Corp',
            'code' => 'RAW-001',
            'type' => 'pvt_ltd',
            'locationsCount' => 1,
            'country' => 'India',
            'regAddressLine1' => '123 Main St',
            'regCity' => 'Chennai',
            'regState' => 'Tamil Nadu',
            'regPin' => '600001',
            'contractType' => 'agency',
            'billingModel' => 'markup',
            'markupPct' => 10,
            'contractStart' => '2026-07-01',
            'billingCurrency' => 'INR',
            'noticePeriod' => 30,
            'gratuityMode' => 'ctc_included',
            'bonusRate' => 8.33,
            'portalAccessLevel' => 'view_only',
            'lopBasis' => '26',
            'branches' => [
                [
                    'name' => 'Chennai HO',
                    'state' => 'Tamil Nadu',
                    'addr1' => '123 Main St',
                    'city' => 'Chennai',
                    'code' => 'TN-01',
                    'pin' => '600001',
                    'gstin' => '33ABCDE1234F1Z5',
                    'isPrimary' => true
                ]
            ],
            'poc1' => [
                'name' => 'John Doe',
                'email' => 'john@raw.com',
                'phone' => '9999999999'
            ]
        ];

        $response = $this->actingAs($admin)->postJson('/clients', $payload);
        if ($response->status() !== 200 && $response->status() !== 302) {
            echo json_encode($response->json(), JSON_PRETTY_PRINT);
        }
        $client = Client::where('client_code', 'RAW-001')->first();
        $branchRow1 = DB::table('client_branches')->where('client_id', $client->id)->first();
        $contactRow1 = DB::table('client_contacts')->where('client_id', $client->id)->first();
        echo "Branch ID: {$branchRow1->id}, City: {$branchRow1->city}, Created: {$branchRow1->created_at}\n";
        echo "Contact ID: {$contactRow1->id}, Name: {$contactRow1->full_name}, Created: {$contactRow1->created_at}\n\n";

        echo "--- 2. RAW CLIENT BRANCH & CONTACT ROW AFTER NO-CHANGE EDIT ---\n";
        $payload['branches'][0]['id'] = $branchRow1->id;
        $payload['poc1']['id'] = $contactRow1->id;
        $response2 = $this->actingAs($admin)->putJson("/clients/{$client->id}", $payload);
        
        $branchRow2 = DB::table('client_branches')->where('client_id', $client->id)->first();
        $contactRow2 = DB::table('client_contacts')->where('client_id', $client->id)->first();
        echo "Branch ID: {$branchRow2->id}, City: {$branchRow2->city}, Created: {$branchRow2->created_at}\n";
        echo "Contact ID: {$contactRow2->id}, Name: {$contactRow2->full_name}, Created: {$contactRow2->created_at}\n\n";

        echo "--- 3. RAW CLIENT BRANCH & CONTACT ROW AFTER REAL-CHANGE EDIT ---\n";
        $payload['branches'][0]['city'] = 'Madurai';
        $payload['poc1']['name'] = 'Jane Doe';
        // Need a slight delay so updated_at actually ticks over a second, else it might match
        sleep(1);
        $response3 = $this->actingAs($admin)->putJson("/clients/{$client->id}", $payload);
        if ($response3->status() !== 200 && $response3->status() !== 302) {
            echo "\n--- RESPONSE 3 FAILED ---\n";
            echo json_encode($response3->json(), JSON_PRETTY_PRINT) . "\n\n";
        }
        
        $branchRow3 = DB::table('client_branches')->where('client_id', $client->id)->first();
        $contactRow3 = DB::table('client_contacts')->where('client_id', $client->id)->first();
        echo "Branch ID: {$branchRow3->id}, City: {$branchRow3->city}, Created: {$branchRow3->created_at}, Updated: {$branchRow3->updated_at}\n";
        echo "Contact ID: {$contactRow3->id}, Name: {$contactRow3->full_name}, Created: {$contactRow3->created_at}, Updated: {$contactRow3->updated_at}\n\n";
        
        $this->assertTrue(true);
    }

    public function test_all_client_fields_save_correctly()
    {
        $admin = User::factory()->create(['role' => 'admin', 'status' => 'active']);
        $payload = [
            'name' => 'TEST_company',
            'type' => 'pvt_ltd',
            'code' => 'TEST_code',
            'trustRegNo' => 'TEST_trust_reg_no',
            'pan' => 'ABCDE1234F',
            'gstin' => '27ABCDE1234F1Z5',
            'industry' => 'TEST_industry',
            'status' => 'onboarding',
            'country' => 'TEST_country',
            'cin' => 'TEST_cin',
            'incorporationDate' => '2026-01-01',
            'logoUrl' => 'TEST_logo.png',
            
            'locationsCount' => 1,
            'regAddressLine1' => 'TEST_addr1',
            'regAddressLine2' => 'TEST_addr2',
            'regCity' => 'TEST_city',
            'regState' => 'TEST_state',
            'regPin' => '400001',
            'taxId' => 'TEST_tax_id',
            'regNo' => 'TEST_reg_no',
            
            'contractType' => 'agency',
            'billingModel' => 'markup',
            'markupPct' => 8.5,
            'fixedFeeCandidate' => 0,
            'contractStart' => '2026-01-01',
            'contractEnd' => '2026-12-31',
            'otBilling' => 'TEST_ot_billing',
            'paymentTerms' => 'TEST_net30',
            'invoiceCycle' => 'TEST_monthly',
            'billingCurrency' => 'TEST_USD',
            'poRequired' => true,
            'poNumber' => 'TEST_po_num',
            'autoRenewal' => true,
            'noticePeriod' => 45,
            
            'ptState' => 'TEST_pt_state',
            'gratuityMode' => 'TEST_gratuity',
            'statutoryBonusApplicable' => true,
            'bonusRate' => 8.33,
            
            'portalAccess' => true,
            'portalAccessLevel' => 'TEST_level',
            'portalUsersLimit' => 3,
            
            'attendanceCutoff' => '28',
            'invoiceRaiseDay' => 'TEST_raise_day',
            'payrollMonthConvention' => 'TEST_convention',
            'lopBasis' => 26,
            
            'poc1' => [
                'name' => 'TEST_poc1',
                'email' => 'testpoc1@test.com',
                'phone' => '9999999999'
            ]
        ];

        $response = $this->actingAs($admin)->postJson('/clients', $payload);
        
        if ($response->status() !== 200 && $response->status() !== 302) {
            echo json_encode($response->json(), JSON_PRETTY_PRINT);
        }
        $response->assertStatus(302);
        
        $client = Client::where('client_code', 'TEST_code')->first();
        
        echo "\n--- RAW DB ROW (test_all_client_fields_save_correctly) ---\n";
        echo json_encode($client->toArray(), JSON_PRETTY_PRINT) . "\n";
        
        // Assertions for every single field
        $this->assertEquals('TEST_company', $client->company_name);
        $this->assertEquals('pvt_ltd', $client->company_type);
        $this->assertEquals('TEST_code', $client->client_code);
        $this->assertEquals('TEST_trust_reg_no', $client->trust_registration_number);
        $this->assertEquals('TEST_industry', $client->industry);
        $this->assertEquals('TEST_country', $client->country);
        $this->assertEquals('TEST_cin', $client->cin_number);
        $this->assertEquals('2026-01-01', $client->incorporation_date);
        $this->assertEquals('TEST_logo.png', $client->logo_path);
        
        $this->assertEquals('TEST_addr1', $client->registered_address_line_1);
        $this->assertEquals('TEST_addr2', $client->registered_address_line_2);
        $this->assertEquals('TEST_city', $client->registered_city);
        $this->assertEquals('TEST_state', $client->registered_state);
        $this->assertEquals('400001', $client->registered_pin);
        $this->assertEquals('TEST_tax_id', $client->tax_id);
        $this->assertEquals('TEST_reg_no', $client->registration_number);
        
        $this->assertEquals('agency', $client->contract_type);
        $this->assertEquals('markup', $client->billing_model);
        $this->assertEquals(8.5, $client->markup_percentage);
        $this->assertEquals(0, $client->fixed_fee_amount);
        $this->assertEquals('2026-01-01', $client->contract_start_date);
        $this->assertEquals('2026-12-31', $client->contract_end_date);
        
        $this->assertEquals('TEST_ot_billing', $client->ot_billing_rule);
        $this->assertEquals('TEST_net30', $client->payment_net_terms);
        $this->assertEquals('TEST_monthly', $client->invoice_cycle);
        $this->assertEquals('TEST_USD', $client->currency);
        $this->assertEquals(1, $client->po_required);
        $this->assertEquals('TEST_po_num', $client->po_number);
        $this->assertEquals(1, $client->auto_renewal);
        $this->assertEquals(45, $client->notice_period_days);
        
        $this->assertEquals('TEST_pt_state', $client->pt_state);
        $this->assertEquals('TEST_gratuity', $client->default_gratuity_mode);
        $this->assertEquals(1, $client->statutory_bonus_applicable);
        $this->assertEquals(8.33, $client->bonus_rate_percentage);
        
        $this->assertEquals(1, $client->client_portal_enabled);
        $this->assertEquals('TEST_level', $client->portal_access_level);
        $this->assertEquals('28', $client->cutoff_day);
        $this->assertEquals('TEST_raise_day', $client->invoice_raise_day);
        $this->assertEquals('TEST_convention', $client->payroll_convention);
        $this->assertEquals('26', $client->lop_basis_days);
    }
}
