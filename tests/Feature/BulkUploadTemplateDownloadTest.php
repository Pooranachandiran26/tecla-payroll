<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\Client;
use Illuminate\Foundation\Testing\RefreshDatabase;

class BulkUploadTemplateDownloadTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_download_bulk_upload_client_template()
    {
        $admin = User::factory()->create(['role' => 'admin', 'status' => 'active']);
        $client = Client::factory()->create(['status' => 'active']);

        $response = $this->actingAs($admin)->get(route('employees.bulk-upload.download-template', ['client_id' => $client->id]));

        $response->assertStatus(200);
        $this->assertTrue(str_contains((string)$response->headers->get('content-disposition'), 'attachment'));
        $this->assertTrue(str_contains((string)$response->headers->get('content-disposition'), 'Bulk_Upload_Template_'));
    }

    public function test_alias_route_admin_can_download_bulk_upload_client_template()
    {
        $admin = User::factory()->create(['role' => 'admin', 'status' => 'active']);
        $client = Client::factory()->create(['status' => 'active']);

        $response = $this->actingAs($admin)->get(route('employees.bulk-upload.template', ['client_id' => $client->id]));

        $response->assertStatus(200);
        $this->assertTrue(str_contains((string)$response->headers->get('content-disposition'), 'attachment'));
    }
}
