<?php

namespace Database\Factories;

use App\Models\Employee;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Employee>
 */
class EmployeeFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'client_id' => 1,
            'branch_id' => 1,
            'employee_code' => 'EMP-' . $this->faker->unique()->numberBetween(1000, 9999),
            'full_name' => $this->faker->name(),
            'personal_email' => $this->faker->unique()->safeEmail(),
            'phone_number' => '9' . $this->faker->numerify('#########'),
            'date_of_birth' => '1990-01-01',
            'date_of_joining' => '2023-01-01',
            'designation' => 'Developer',
            'gender' => 'female',
            'employment_model' => 'agency_contract',
            'prior_employment_flag' => 0,
            'residential_address' => 'Test Address',
            'bank_account_number' => '1234567890',
            'bank_ifsc' => 'HDFC0000001',
            'bank_name' => 'HDFC Bank',
            'bank_branch' => 'Mumbai',
            'account_holder_name' => 'Test Name',
            'pan_number' => 'ABCDE1234F',
            'aadhaar_number' => '123456789012',
            'esic_number' => '1234567890',
            'uan_number' => '100000000012',
            'uan_mode' => 'existing',
            'pf_applicable' => 1,
            'esi_applicable' => 1,
            'pt_applicable' => 1,
            'tds_regime' => 'new',
            'gratuity_mode' => 'part_of_ctc',
            'lop_basis_days' => '26',
            'basic_pay' => 15000,
            'hra' => 5000,
            'conveyance' => 0,
            'da' => 0,
            'medical_allowance' => 0,
            'special_allowance' => 0,
            'other_additions' => 0,
            'gross_monthly_salary' => 20000,
            'employer_pf_monthly' => 1950,
            'employer_esi_monthly' => 650,
            'net_take_home_monthly' => 18000,
            'ctc_monthly' => 22600,
            'status' => 'active',
        ];
    }
}
