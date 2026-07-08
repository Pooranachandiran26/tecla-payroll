<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use App\Models\User;
use App\Models\Client;
use App\Models\ClientBranch;
use App\Models\Employee;
use App\Models\EmployeeDocument;

class EmployeeDocumentVerificationTest extends TestCase
{
    use \Illuminate\Foundation\Testing\DatabaseTransactions;

    public function test_manager_receives_403_when_verifying_document()
    {
        $manager = User::factory()->create(['role' => 'manager']);
        $admin = User::factory()->create(['role' => 'admin']);
        
        $employee = Employee::first();
        if (!$employee) {
            $this->markTestSkipped('No seeded employee available for test.');
        }

        $documentId = \Illuminate\Support\Facades\DB::table('employee_documents')->insertGetId([
            'employee_id' => $employee->id,
            'document_type' => 'pan_card',
            'file_path' => 'docs/test.pdf',
            'status' => 'pending'
        ]);

        $response = $this->actingAs($manager)->putJson("/employees/{$employee->id}/documents/{$documentId}/verify", [
            'status' => 'verified'
        ]);

        $response->assertStatus(403);
        
        // Also verify admin works
        $responseAdmin = $this->actingAs($admin)->putJson("/employees/{$employee->id}/documents/{$documentId}/verify", [
            'status' => 'verified'
        ]);
        
        $responseAdmin->assertStatus(302);
    }
}
