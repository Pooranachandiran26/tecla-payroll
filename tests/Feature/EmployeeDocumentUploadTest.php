<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use Tests\TestCase;
use App\Models\User;
use App\Models\Employee;
use App\Models\Client;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Mail;
use App\Jobs\NotifyWatchersJob;
use App\Mail\DocumentVerifiedMail;
use App\Mail\DocumentRejectedMail;

class EmployeeDocumentUploadTest extends TestCase
{
    use RefreshDatabase;

    protected $client;
    protected $employee;
    protected $user;
    protected $adminUser;

    protected function setUp(): void
    {
        parent::setUp();
        
        $this->client = Client::factory()->create();
        
        $branch = \App\Models\ClientBranch::create([
            'client_id' => $this->client->id,
            'branch_name' => 'HQ',
            'state' => 'Tamil Nadu'
        ]);
        
        $this->employee = Employee::factory()->create([
            'client_id' => $this->client->id,
            'branch_id' => $branch->id,
            'employee_code' => 'EMP-DOC-001',
            'full_name' => 'Doc Test Employee',
            'personal_email' => 'doc_employee@example.com',
            'status' => 'onboarding',
            'pf_applicable' => false,
            'esi_applicable' => false,
            'bank_account_number' => '1234567890',
            'pan_number' => 'ABCDE1234F',
            'aadhaar_number' => '123456789012',
        ]);

        $this->user = User::factory()->create([
            'role' => 'employee',
            'employee_id' => $this->employee->id,
            'email' => 'doc_employee@example.com',
        ]);

        $this->adminUser = User::factory()->create([
            'role' => 'admin',
        ]);
        
        Storage::fake('local');
    }

    public function test_employee_cannot_upload_document_for_another_employee()
    {
        // Another employee
        $otherEmployee = Employee::factory()->create([
            'client_id' => $this->client->id,
            'branch_id' => \App\Models\ClientBranch::first()->id,
            'employee_code' => 'EMP-DOC-002',
            'full_name' => 'Other Employee',
            'status' => 'onboarding',
            'bank_account_number' => '0987654321',
            'pan_number' => 'ZYXWV0987E',
            'aadhaar_number' => '210987654321',
        ]);

        // Attempting to upload passing the other employee ID in the payload (or trying to override)
        // Since the route does NOT accept an ID and the controller forces auth()->user()->employee_id,
        // it should attach to $this->employee, not $otherEmployee.

        $file = UploadedFile::fake()->image('fake-pan.jpg');

        $response = $this->actingAs($this->user)->post(route('employee.documents.store'), [
            'document_type' => 'pan_card',
            'file' => $file,
            'employee_id' => $otherEmployee->id, // Malicious attempt
        ]);

        $response->assertSessionHas('success');

        // Assert it was attached to the logged-in user, NOT the requested one
        $this->assertDatabaseHas('employee_documents', [
            'employee_id' => $this->employee->id,
            'document_type' => 'pan_card',
            'status' => 'pending',
        ]);

        $this->assertDatabaseMissing('employee_documents', [
            'employee_id' => $otherEmployee->id,
            'document_type' => 'pan_card',
        ]);
    }

    public function test_self_uploading_all_documents_auto_activates_employee_when_verified()
    {
        Queue::fake([NotifyWatchersJob::class]);
        Mail::fake();

        $docsToUpload = [
            'pan_card',
            'aadhaar_card',
            'bank_passbook',
            'offer_letter',
            'photo'
        ];

        // 1. Employee Self Uploads
        foreach ($docsToUpload as $doc) {
            $response = $this->actingAs($this->user)->post(route('employee.documents.store'), [
                'document_type' => $doc,
                'file' => UploadedFile::fake()->create('doc.pdf', 1000, 'application/pdf'),
            ]);
            $response->assertSessionHas('success');
        }

        Queue::assertPushed(NotifyWatchersJob::class, 5);

        // 2. Admin Verifies Each
        $documents = \App\Models\EmployeeDocument::where('employee_id', $this->employee->id)->get();
        $this->assertCount(5, $documents);

        foreach ($documents as $index => $document) {
            $response = $this->actingAs($this->adminUser)->put(route('employees.documents.verify', [
                'id' => $this->employee->id, 
                'docId' => $document->id
            ]), [
                'status' => 'verified'
            ]);
            
            $response->assertSessionHas('success');
            
            // Assert mail sent
            Mail::assertQueued(DocumentVerifiedMail::class, function ($mail) use ($document) {
                return $mail->documentType === $document->document_type;
            });
        }

        // 3. Assert employee status automatically changed to active
        $this->employee->refresh();
        $this->assertEquals('active', $this->employee->status);
    }
    
    public function test_document_rejection_resets_status_on_reupload()
    {
        Mail::fake();
        
        // 1. Employee uploads
        $this->actingAs($this->user)->post(route('employee.documents.store'), [
            'document_type' => 'pan_card',
            'file' => UploadedFile::fake()->create('pan.pdf', 1000, 'application/pdf'),
        ]);
        
        $document = \App\Models\EmployeeDocument::where('employee_id', $this->employee->id)->first();
        
        // 2. Admin rejects
        $this->actingAs($this->adminUser)->put(route('employees.documents.verify', [
            'id' => $this->employee->id, 
            'docId' => $document->id
        ]), [
            'status' => 'rejected',
            'rejection_reason' => 'Blurry image'
        ]);
        
        Mail::assertQueued(DocumentRejectedMail::class);
        
        $document->refresh();
        $this->assertEquals('rejected', $document->status);
        $this->assertEquals('Blurry image', $document->rejection_reason);
        
        // 3. Employee re-uploads
        $this->actingAs($this->user)->post(route('employee.documents.store'), [
            'document_type' => 'pan_card',
            'file' => UploadedFile::fake()->create('pan-new.pdf', 1000, 'application/pdf'),
        ]);
        
        // 4. Assert updated, not duplicated
        $this->assertEquals(1, \App\Models\EmployeeDocument::where('employee_id', $this->employee->id)->count());
        
        $document->refresh();
        $this->assertEquals('pending', $document->status);
        $this->assertNull($document->rejection_reason);
    }
}
