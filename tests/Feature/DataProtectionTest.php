<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use Tests\TestCase;
use App\Models\Employee;
use Illuminate\Support\Facades\DB;

class DataProtectionTest extends TestCase
{
    use RefreshDatabase;

    public function test_sensitive_employee_data_is_encrypted_at_rest()
    {
        $this->seed();
        $employee = Employee::first();
        
        $rawPan = DB::table('employees')->where('id', $employee->id)->value('pan_number');
        
        $this->assertNotEquals($employee->pan_number, $rawPan);
        $this->assertStringContainsString('eyJpdiI', $rawPan); // payload identifier for laravel encryption
    }
}
