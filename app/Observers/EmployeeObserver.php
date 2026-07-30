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
        // Resolve notice_period_days: inherit from client default, fall back to 30
        if (is_null($employee->notice_period_days)) {
            $client = $employee->client;
            $employee->notice_period_days = $client ? ($client->default_notice_period_days ?? 30) : 30;
        }

        $calculator = app(\App\Services\SalaryCalculationService::class);
        $calculations = $calculator->calculateStructuralSalary($employee->toArray());

        $employee->gross_monthly_salary = $calculations['gross_monthly_salary'];
        $employee->employer_pf_monthly = $calculations['employer_pf_monthly'];
        $employee->employer_esi_monthly = $calculations['employer_esi_monthly'];
        $employee->net_take_home_monthly = $calculations['net_take_home_monthly'];
        $employee->ctc_monthly = $calculations['ctc_monthly'];

        // Compute hashes for encrypted fields
        if ($employee->isDirty('pan_number')) {
            $employee->pan_number_hash = $employee->pan_number ? hash('sha256', $employee->pan_number) : null;
        }
        if ($employee->isDirty('aadhaar_number')) {
            $employee->aadhaar_number_hash = $employee->aadhaar_number ? hash('sha256', $employee->aadhaar_number) : null;
        }
        if ($employee->isDirty('bank_account_number')) {
            $employee->bank_account_hash = $employee->bank_account_number ? hash('sha256', $employee->bank_account_number) : null;
        }
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
