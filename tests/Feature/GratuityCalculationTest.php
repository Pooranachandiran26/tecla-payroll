<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use App\Models\Client;
use App\Models\ClientBranch;
use App\Models\Employee;
use App\Services\FullAndFinalCalculationService;
use Carbon\Carbon;

class GratuityCalculationTest extends TestCase
{
    use RefreshDatabase;

    private function createTestEmployee(array $attributes = []): Employee
    {
        $client = Client::factory()->create();
        $branch = ClientBranch::factory()->create(['client_id' => $client->id]);

        $defaults = [
            'client_id' => $client->id,
            'branch_id' => $branch->id,
            'date_of_joining' => '2020-01-01',
            'basic_pay' => 20000.00,
            'da' => 0.00,
            'employment_type' => 'permanent',
        ];

        return Employee::factory()->create(array_merge($defaults, $attributes));
    }

    /** @test */
    public function test_permanent_employee_at_4_years_240_days_is_eligible()
    {
        // 4 years (4 * 365 = 1460 days) + 240 days = 1700 days
        $doj = Carbon::parse('2020-01-01');
        $lwd = $doj->copy()->addDays((4 * 365) + 240); // 2024-08-28 (1700 days)

        $employee = $this->createTestEmployee([
            'date_of_joining' => $doj->toDateString(),
            'employment_type' => 'permanent',
            'basic_pay' => 26000.00,
        ]);

        $service = new FullAndFinalCalculationService();
        $preview = $service->calculatePreview($employee, [
            'last_working_day' => $lwd->toDateString(),
        ]);

        // 1700 days = 4 full years + 240 days (> 182 days extra), so gratuityYears = 5
        // Amount = (26000 / 26) * 15 * 5 = 75,000.00
        $this->assertGreaterThan(0, $preview['gratuity_amount']);
        $this->assertEquals(75000.00, $preview['gratuity_amount']);
    }

    /** @test */
    public function test_permanent_employee_at_4_years_200_days_is_not_eligible()
    {
        // 4 years + 200 days = 1660 days (below 1700 threshold)
        $doj = Carbon::parse('2020-01-01');
        $lwd = $doj->copy()->addDays((4 * 365) + 200);

        $employee = $this->createTestEmployee([
            'date_of_joining' => $doj->toDateString(),
            'employment_type' => 'permanent',
            'basic_pay' => 26000.00,
        ]);

        $service = new FullAndFinalCalculationService();
        $preview = $service->calculatePreview($employee, [
            'last_working_day' => $lwd->toDateString(),
        ]);

        $this->assertEquals(0.00, $preview['gratuity_amount']);
    }

    /** @test */
    public function test_temp_employee_at_1_year_is_eligible()
    {
        // Temp employee at exactly 1 year (365 days)
        $doj = Carbon::parse('2025-01-01');
        $lwd = Carbon::parse('2026-01-01'); // 1 full year = 365 days

        $employee = $this->createTestEmployee([
            'date_of_joining' => $doj->toDateString(),
            'employment_type' => 'temporary',
            'basic_pay' => 26000.00,
        ]);

        $service = new FullAndFinalCalculationService();
        $preview = $service->calculatePreview($employee, [
            'last_working_day' => $lwd->toDateString(),
        ]);

        // 1 year = 1 full year + 0 extra days, gratuityYears = 1
        // Amount = (26000 / 26) * 15 * 1 = 15,000.00
        $this->assertGreaterThan(0, $preview['gratuity_amount']);
        $this->assertEquals(15000.00, $preview['gratuity_amount']);
    }

    /** @test */
    public function test_temp_employee_at_11_months_is_not_eligible()
    {
        // Temp employee at 11 months (approx 335 days < 365)
        $doj = Carbon::parse('2025-01-01');
        $lwd = Carbon::parse('2025-12-01');

        $employee = $this->createTestEmployee([
            'date_of_joining' => $doj->toDateString(),
            'employment_type' => 'temporary',
            'basic_pay' => 26000.00,
        ]);

        $service = new FullAndFinalCalculationService();
        $preview = $service->calculatePreview($employee, [
            'last_working_day' => $lwd->toDateString(),
        ]);

        $this->assertEquals(0.00, $preview['gratuity_amount']);
    }

    /** @test */
    public function test_gratuity_amount_uses_basic_plus_da_combined()
    {
        // Permanent employee with 5 full years (5 * 365 = 1825 days)
        $doj = Carbon::parse('2020-01-01');
        $lwd = Carbon::parse('2025-01-01');

        $employee = $this->createTestEmployee([
            'date_of_joining' => $doj->toDateString(),
            'employment_type' => 'permanent',
            'basic_pay' => 20000.00,
            'da' => 6000.00, // Basic + DA = 26,000.00
        ]);

        $service = new FullAndFinalCalculationService();
        $preview = $service->calculatePreview($employee, [
            'last_working_day' => $lwd->toDateString(),
        ]);

        // Base salary = 20,000 + 6,000 = 26,000
        // Years = 5
        // Amount = (26000 / 26) * 15 * 5 = 75,000.00
        $this->assertEquals(75000.00, $preview['gratuity_amount']);
    }

    /** @test */
    public function test_legacy_employee_without_employment_type_defaults_to_permanent_rule()
    {
        // Legacy record with employment_type = null
        $doj = Carbon::parse('2020-01-01');
        $lwdShort = $doj->copy()->addDays((4 * 365) + 200); // 1660 days -> Not eligible under permanent rule
        $lwdLong = $doj->copy()->addDays((4 * 365) + 240);  // 1700 days -> Eligible under permanent rule

        $employee = $this->createTestEmployee([
            'date_of_joining' => $doj->toDateString(),
            'employment_type' => null,
            'basic_pay' => 26000.00,
        ]);

        $service = new FullAndFinalCalculationService();
        
        $previewShort = $service->calculatePreview($employee, ['last_working_day' => $lwdShort->toDateString()]);
        $this->assertEquals(0.00, $previewShort['gratuity_amount']);

        $previewLong = $service->calculatePreview($employee, ['last_working_day' => $lwdLong->toDateString()]);
        $this->assertEquals(75000.00, $previewLong['gratuity_amount']);
    }

    /** @test */
    public function test_gratuity_years_calculation_6_years_5_months_counts_as_6_years()
    {
        // 6 years 5 months (approx 6 * 365 + 150 days) < 182 days extra into year 7
        $doj = Carbon::parse('2020-01-01');
        $lwd = Carbon::parse('2026-06-01'); // 6 years + 5 months (Jan 1 to Jun 1 = 151 extra days)

        $employee = $this->createTestEmployee([
            'date_of_joining' => $doj->toDateString(),
            'employment_type' => 'permanent',
            'basic_pay' => 26000.00,
        ]);

        $service = new FullAndFinalCalculationService();
        $preview = $service->calculatePreview($employee, [
            'last_working_day' => $lwd->toDateString(),
        ]);

        // Base = 26,000 / 26 = 1,000. 1000 * 15 * 6 years = 90,000.00
        $this->assertEquals(90000.00, $preview['gratuity_amount']);
    }

    /** @test */
    public function test_gratuity_years_calculation_6_years_7_months_counts_as_7_years()
    {
        // 6 years 7 months (approx 6 * 365 + 212 days) >= 182 days extra into year 7
        $doj = Carbon::parse('2020-01-01');
        $lwd = Carbon::parse('2026-08-05'); // 6 years + 7 months + 4 days (Jan 1 to Aug 5 = 216 extra days)

        $employee = $this->createTestEmployee([
            'date_of_joining' => $doj->toDateString(),
            'employment_type' => 'permanent',
            'basic_pay' => 26000.00,
        ]);

        $service = new FullAndFinalCalculationService();
        $preview = $service->calculatePreview($employee, [
            'last_working_day' => $lwd->toDateString(),
        ]);

        // Base = 26,000 / 26 = 1,000. 1000 * 15 * 7 years = 105,000.00
        $this->assertEquals(105000.00, $preview['gratuity_amount']);
    }
}
