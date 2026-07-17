<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Client;
use App\Models\ClientBranch;
use App\Models\Employee;
use App\Models\EmployeeDocument;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class EmployeeDocumentViewTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_view_and_verify_uploaded_employee_document()
    {
        Storage::fake('local');

        $admin = User::factory()->create(['role' => 'admin']);
        $client = Client::factory()->create();
        $branch = ClientBranch::factory()->create(['client_id' => $client->id]);

        $employee = Employee::factory()->create([
            'client_id' => $client->id,
            'branch_id' => $branch->id,
            'status' => 'onboarding'
        ]);

        // Fake upload file
        $file = UploadedFile::fake()->create('pan_card.pdf', 500, 'application/pdf');
        $path = $file->store('employee_documents', 'local');

        $doc = EmployeeDocument::create([
            'employee_id' => $employee->id,
            'document_type' => 'pan_card',
            'file_path' => $path,
            'status' => 'pending'
        ]);

        // 1. Assert Admin can view document inline
        $response = $this->actingAs($admin)->get(route('employees.documents.view', ['id' => $employee->id, 'docId' => $doc->id]));
        $response->assertStatus(200);

        // 2. Assert Admin can verify document after reviewing
        $verifyResponse = $this->actingAs($admin)->put(route('employees.documents.verify', ['id' => $employee->id, 'docId' => $doc->id]), [
            'status' => 'verified'
        ]);

        $verifyResponse->assertRedirect();
        $doc->refresh();
        $this->assertEquals('verified', $doc->status);
    }
}
