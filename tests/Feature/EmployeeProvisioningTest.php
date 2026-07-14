<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;
use App\Models\User;
use App\Models\Employee;
use App\Models\Client;
use App\Models\ClientBranch;

class EmployeeProvisioningTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        
        $this->client = Client::factory()->create(['status' => 'active']);
        $this->branch = ClientBranch::create(['client_id' => $this->client->id, 'branch_name' => 'HQ']);
        
        $this->admin = User::factory()->create(['role' => 'admin', 'status' => 'active']);
    }

    public function test_creating_employee_provisions_a_linked_user()
    {
        Mail::fake();

        $employeeData = [
            'clientPartner' => $this->client->id,
            'branch_id' => $this->branch->id,
            'fullName' => 'John Provision',
            'personalEmail' => 'john.provision@example.com',
            'phone' => '9988776655',
            'dob' => '1990-01-01',
            'doj' => '2024-01-01',
            'designation' => 'Developer',
            'gender' => 'male',
            'empType' => 'agency_contract',
            'address' => '123 Test St',
            'accountNo' => '1234567890',
            'ifsc' => 'SBIN0001234',
            'bankName' => 'SBI',
            'bankBranch' => 'Main Branch',
            'accountHolder' => 'John Provision',
            'uanMode' => 'new',
            'pan' => 'ABCDE1234F',
            'basicSal' => 20000,
            'hraSal' => 0,
            'conveyanceSal' => 0,
            'daSal' => 0,
            'medicalSal' => 0,
            'specialSal' => 0,
            'otherSal' => 0,
            'pf_applicable' => false,
            'esi_applicable' => false,
            'pt_applicable' => false,
            'lwf_applicable' => false,
            'tds_regime' => 'old',
            'gratuity_mode' => 'part_of_ctc',
        ];

        $response = $this->actingAs($this->admin)->post(route('employees.store'), $employeeData);

        $response->assertRedirect(route('employees.index'));
        $response->assertSessionHas('success');

        $employee = Employee::where('personal_email', 'john.provision@example.com')->first();
        $this->assertNotNull($employee);

        $user = User::where('employee_id', $employee->id)->first();
        $this->assertNotNull($user);
        $this->assertEquals('employee', $user->role);
        $this->assertEquals('invited', $user->status);
        $this->assertEquals('john.provision@example.com', $user->email);
        $this->assertNotNull($user->invitation_token);

        Mail::assertQueued(\App\Mail\InvitationMail::class, function ($mail) use ($user) {
            return $mail->hasTo($user->email);
        });
    }

    public function test_updating_employee_does_not_create_duplicate_user()
    {
        Mail::fake();

        $employeeData = [
            'clientPartner' => $this->client->id,
            'branch_id' => $this->branch->id,
            'fullName' => 'Jane Update',
            'personalEmail' => 'jane.update@example.com',
            'phone' => '9988776655',
            'dob' => '1990-01-01',
            'doj' => '2024-01-01',
            'designation' => 'Developer',
            'gender' => 'female',
            'empType' => 'agency_contract',
            'address' => '123 Test St',
            'accountNo' => '1234567890',
            'ifsc' => 'SBIN0001234',
            'bankName' => 'SBI',
            'bankBranch' => 'Main Branch',
            'accountHolder' => 'Jane Update',
            'uanMode' => 'new',
            'pan' => 'ABCDE1234F',
            'basicSal' => 20000,
            'hraSal' => 0,
            'conveyanceSal' => 0,
            'daSal' => 0,
            'medicalSal' => 0,
            'specialSal' => 0,
            'otherSal' => 0,
            'pf_applicable' => false,
            'esi_applicable' => false,
            'pt_applicable' => false,
            'lwf_applicable' => false,
            'tds_regime' => 'old',
            'gratuity_mode' => 'part_of_ctc',
        ];

        // Create the employee initially
        $this->actingAs($this->admin)->post(route('employees.store'), $employeeData);

        $employee = Employee::where('personal_email', 'jane.update@example.com')->first();
        $userCount = User::where('employee_id', $employee->id)->count();
        $this->assertEquals(1, $userCount);

        // Update the employee
        $employeeData['fullName'] = 'Jane Updated Name';
        $this->actingAs($this->admin)->put(route('employees.update', $employee->id), $employeeData);

        // Assert user count is still 1
        $userCountAfterUpdate = User::where('employee_id', $employee->id)->count();
        $this->assertEquals(1, $userCountAfterUpdate);
        
        $user = User::where('employee_id', $employee->id)->first();
        $this->assertEquals('jane.update@example.com', $user->email);
    }

    public function test_resend_invitation_regenerates_token_for_existing_user()
    {
        Mail::fake();
        
        $employeeData = [
            'clientPartner' => $this->client->id,
            'branch_id' => $this->branch->id,
            'fullName' => 'Bob Resend',
            'personalEmail' => 'bob.resend@example.com',
            'phone' => '9988776655',
            'dob' => '1990-01-01',
            'doj' => '2024-01-01',
            'designation' => 'Developer',
            'gender' => 'male',
            'empType' => 'agency_contract',
            'address' => '123 Test St',
            'accountNo' => '1234567890',
            'ifsc' => 'SBIN0001234',
            'bankName' => 'SBI',
            'bankBranch' => 'Main Branch',
            'accountHolder' => 'Bob Resend',
            'uanMode' => 'new',
            'pan' => 'ABCDE1234F',
            'basicSal' => 20000,
            'hraSal' => 0,
            'conveyanceSal' => 0,
            'daSal' => 0,
            'medicalSal' => 0,
            'specialSal' => 0,
            'otherSal' => 0,
            'pf_applicable' => false,
            'esi_applicable' => false,
            'pt_applicable' => false,
            'lwf_applicable' => false,
            'tds_regime' => 'old',
            'gratuity_mode' => 'part_of_ctc',
        ];

        $this->actingAs($this->admin)->post(route('employees.store'), $employeeData);

        $employee = Employee::where('personal_email', 'bob.resend@example.com')->first();
        $user = User::where('employee_id', $employee->id)->first();
        $oldToken = $user->invitation_token;

        // Resend invitation
        $response = $this->actingAs($this->admin)->post(route('employees.resend-invitation', $employee->id));
        $response->assertSessionHas('success');

        $user->refresh();
        $this->assertNotEquals($oldToken, $user->invitation_token);
        
        // Assert email queued twice
        Mail::assertQueued(\App\Mail\InvitationMail::class, 2);

        // Activate user
        $user->update(['status' => 'active']);

        // Attempt resend on active user
        $response = $this->actingAs($this->admin)->post(route('employees.resend-invitation', $employee->id));
        $response->assertStatus(403);
    }

    public function test_bulk_import_provisions_one_user_per_employee()
    {
        Mail::fake(); // Fake mail for Bulk upload
        
        // We can just construct a mock file for BulkUploadController::executeImport
        $csvContent = "employee_code,client_code,full_name,personal_email,phone_number,date_of_birth,date_of_joining,designation,gender,employment_model,residential_address,basic_pay,pf_applicable,esi_applicable,pt_applicable,lwf_applicable,tds_regime,gratuity_mode,lop_basis_days,hra,conveyance,da,medical_allowance,special_allowance,other_additions,bank_account_number,bank_ifsc,bank_name,bank_branch,account_holder_name,pan_number,aadhaar_number\n";
        $csvContent .= "EMP-BULK1,{$this->client->client_code},Alice Bulk,alice.bulk@example.com,9876543201,1992-01-01,2024-01-01,Developer,female,agency_contract,123 Test St,10000,0,0,0,0,old,part_of_ctc,30,5000,1600,0,1250,2150,0,123456789012,SBIN0001234,SBI,Main Branch,Alice Bulk,ABCDE1234F,123456789012\n";
        $csvContent .= "EMP-BULK2,{$this->client->client_code},Bob Bulk,bob.bulk@example.com,9876543202,1993-01-01,2024-01-01,Tester,male,agency_contract,123 Test St,10000,0,0,0,0,old,part_of_ctc,30,5000,1600,0,1250,2150,0,223456789012,SBIN0001235,SBI,Main Branch,Bob Bulk,ABCDE1235F,223456789012\n";

        $file = \Illuminate\Http\UploadedFile::fake()->createWithContent('bulk.csv', $csvContent);

        $response = $this->actingAs($this->admin)->postJson(route('employees.bulk-upload.execute'), [
            'file' => $file
        ]);

        if ($response->status() !== 200) {
            dump($response->json());
        }
        $response->assertStatus(200);

        $employee1 = Employee::where('personal_email', 'alice.bulk@example.com')->first();
        $employee2 = Employee::where('personal_email', 'bob.bulk@example.com')->first();

        $this->assertNotNull($employee1);
        $this->assertNotNull($employee2);

        $user1 = User::where('employee_id', $employee1->id)->first();
        $user2 = User::where('employee_id', $employee2->id)->first();

        $this->assertNotNull($user1);
        $this->assertNotNull($user2);
        
        // Assert emails were queued
        Mail::assertQueued(\App\Mail\InvitationMail::class, 2);
    }
}
