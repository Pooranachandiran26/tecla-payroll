<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use App\Models\User;
use App\Models\Employee;
use App\Models\Client;
use App\Models\ClientBranch;
use App\Models\AttendanceRecord;
use Carbon\Carbon;

class EmployeePunchLocationTest extends TestCase
{
    use RefreshDatabase;

    protected $employee;
    protected $user;
    protected $client;
    protected $branch;

    protected function setUp(): void
    {
        parent::setUp();

        $this->client = Client::factory()->create(['status' => 'active']);
        
        $this->branch = ClientBranch::create([
            'client_id' => $this->client->id,
            'branch_name' => 'Mumbai Office',
            'state' => 'Maharashtra'
        ]);

        $this->employee = Employee::create([
            'client_id' => $this->client->id,
            'branch_id' => $this->branch->id,
            'full_name' => 'John Doe',
            'personal_email' => 'john.doe@example.com',
            'phone_number' => '9876543210',
            'date_of_birth' => '1990-01-01',
            'date_of_joining' => '2026-01-01',
            'designation' => 'Software Engineer',
            'employment_model' => 'eor',
            'residential_address' => '123 St',
            'bank_account_number' => '1234567890',
            'bank_ifsc' => 'ICIC0001234',
            'bank_name' => 'ICICI Bank',
            'bank_branch' => 'Main Branch',
            'account_holder_name' => 'John Doe',
            'pan_number' => 'ABCDE1234F',
            'employee_code' => 'TEC-200',
            'uan_mode' => 'new',
            'status' => 'active',
            'basic_pay' => 20000,
            'hra' => 5000,
            'conveyance' => 0,
            'da' => 0,
            'medical_allowance' => 0,
            'special_allowance' => 0,
            'other_additions' => 0,
            'tds_regime' => 'new',
            'gratuity_mode' => 'part_of_ctc',
            'lop_basis_days' => '30',
            'declarations_accepted' => 1,
            'pf_applicable' => true,
            'esi_applicable' => false,
            'pt_applicable' => true,
            'lwf_applicable' => false,
        ]);

        $this->user = User::factory()->create([
            'role' => 'employee',
            'employee_id' => $this->employee->id,
            'status' => 'active'
        ]);
    }

    public function test_punch_in_stores_geo_location_fields()
    {
        $today = Carbon::today()->toDateString();

        $response = $this->actingAs($this->user)->post(route('employee.attendance.punch-in'), [
            'latitude' => '19.076090',
            'longitude' => '72.877426',
            'place_name' => 'Mumbai, Maharashtra, India'
        ]);

        $response->assertRedirect();
        
        // Assert record exists in database
        $record = AttendanceRecord::where('employee_id', $this->employee->id)
            ->where('attendance_date', $today)
            ->first();

        $this->assertNotNull($record);
        $this->assertEquals('19.076090', $record->latitude);
        $this->assertEquals('72.877426', $record->longitude);
        $this->assertEquals('Mumbai, Maharashtra, India', $record->place_name);
        $this->assertEquals('live_punch', $record->source);
    }
}
