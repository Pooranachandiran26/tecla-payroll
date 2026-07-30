<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\Setting;
use Illuminate\Foundation\Testing\RefreshDatabase;

class GstSettingsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        
        $admin = User::factory()->create([
            'role' => 'admin',
        ]);
        $this->actingAs($admin);
    }

    public function test_get_gst_settings_returns_defaults()
    {
        $response = $this->getJson(route('admin.settings.gst.show'));

        $response->assertStatus(200)
            ->assertJsonStructure([
                'default_gst_rate',
                'gst_rates',
                'default_reverse_charge',
                'default_tds_on_agency_fee',
            ]);
    }

    public function test_update_gst_settings_stores_new_options_permanently()
    {
        $payload = [
            'default_gst_rate' => '12',
            'default_reverse_charge' => true,
            'default_tds_on_agency_fee' => '2',
            'notes' => 'Compliance update for staffing',
            'gst_rates' => [
                ['rate' => '18', 'label' => '18% Standard', 'hsn_sac' => '998311', 'description' => 'Standard Rate'],
                ['rate' => '12', 'label' => '12% Reduced Rate', 'hsn_sac' => '998311', 'description' => 'Reduced Rate'],
                ['rate' => '5',  'label' => '5% Low Rate', 'hsn_sac' => '998311', 'description' => 'Low Rate'],
                ['rate' => '0',  'label' => '0% SEZ Rate', 'hsn_sac' => '998311', 'description' => 'Zero Rate'],
            ]
        ];

        $response = $this->putJson(route('admin.settings.gst.update'), $payload);
        $response->assertStatus(200);

        // Assert DB record created/updated
        $setting = Setting::where('group', 'gst')->where('key', 'gst_rates')->first();
        $this->assertNotNull($setting);
        $this->assertEquals('json', $setting->type);
        
        $ratesInDb = json_decode($setting->value, true);
        $this->assertCount(4, $ratesInDb);
        $this->assertEquals('12', $ratesInDb[1]['rate']);

        // Assert GET endpoint returns updated data
        $getResponse = $this->getJson(route('admin.settings.gst.show'));
        $getResponse->assertStatus(200);
        $this->assertEquals('12', $getResponse->json('default_gst_rate'));
        $this->assertCount(4, $getResponse->json('gst_rates'));
    }
}
