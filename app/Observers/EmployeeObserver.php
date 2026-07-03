<?php

namespace App\Observers;

use App\Models\Employee;

class EmployeeObserver
{
    /**
     * Handle the Employee "saving" event.
     * This is called before the record is saved to the database (on create and update).
     */
    public function saving(Employee $employee): void
    {
        $calculator = app(\App\Services\SalaryCalculationService::class);
        $calculations = $calculator->calculateStructuralSalary($employee->toArray());

        $employee->gross_monthly_salary = $calculations['gross_monthly_salary'];
        $employee->employer_pf_monthly = $calculations['employer_pf_monthly'];
        $employee->employer_esi_monthly = $calculations['employer_esi_monthly'];
        $employee->net_take_home_monthly = $calculations['net_take_home_monthly'];
        $employee->ctc_monthly = $calculations['ctc_monthly'];
    }

    /**
     * Handle the Employee "created" event.
     */
    public function created(Employee $employee): void
    {
        //
    }

    /**
     * Handle the Employee "updated" event.
     */
    public function updated(Employee $employee): void
    {
        //
    }

    /**
     * Handle the Employee "deleted" event.
     */
    public function deleted(Employee $employee): void
    {
        //
    }

    /**
     * Handle the Employee "restored" event.
     */
    public function restored(Employee $employee): void
    {
        //
    }

    /**
     * Handle the Employee "force deleted" event.
     */
    public function forceDeleted(Employee $employee): void
    {
        //
    }
}
