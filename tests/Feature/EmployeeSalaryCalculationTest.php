<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use App\Models\Employee;
use App\Observers\EmployeeObserver;

class EmployeeSalaryCalculationTest extends TestCase
{
    public function test_employer_pf_monthly_is_strictly_maintained_at_13_percent_of_basic()
    {
        Employee::unguard();

        // Instantiate model without saving to DB to bypass foreign key constraints for this calculation test
        $employee = new Employee([
            'basic_pay' => 25000,
            'pf_applicable' => 1,
            'esi_applicable' => 1,
            'pt_applicable' => 1,
        ]);

        // Manually trigger the saving observer which performs the structural salary calculation
        $observer = new EmployeeObserver();
        $observer->saving($employee);

        // 13% of 15000 (statutory ceiling) is 1950
        $this->assertEquals(1950.00, $employee->employer_pf_monthly);
    }
    public function test_esi_never_applies_above_threshold_regardless_of_toggle()
    {
        Employee::unguard();

        $employee = new Employee([
            'basic_pay' => 20000,
            'hra' => 5000, // gross = 25000
            'esi_applicable' => 1,
            'esi_limit' => 21000,
        ]);

        $observer = new EmployeeObserver();
        $observer->saving($employee);

        $this->assertEquals(0, $employee->employee_esi_monthly);
        $this->assertEquals(0, $employee->employer_esi_monthly);
    }
}
