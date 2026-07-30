<?php

namespace App\Services;

use App\Models\Employee;
use App\Models\EmployeeTaxDeclaration;
use Carbon\Carbon;

class TdsCalculationService
{
    /**
     * Determine the Financial Year string (e.g. "2026-2027") from a date string.
     */
    public function determineFinancialYear(string $dateString): string
    {
        $date = Carbon::parse($dateString);
        $year = $date->year;
        $month = $date->month;

        if ($month < 4) {
            // Jan, Feb, Mar belong to previous calendar year's FY
            return sprintf('%d-%d', $year - 1, $year);
        }

        return sprintf('%d-%d', $year, $year + 1);
    }

    /**
     * Get remaining payroll months in the financial year including the target month (1 to 12).
     */
    public function getRemainingMonthsInFinancialYear(string $dateString): int
    {
        $date = Carbon::parse($dateString);
        $month = $date->month;

        if ($month >= 4) {
            // April = 12, May = 11, ..., Dec = 4
            return 12 - ($month - 4);
        }

        // Jan = 3, Feb = 2, Mar = 1
        return 4 - $month;
    }

    /**
     * Calculate HRA Exemption under Section 10(13A).
     */
    public function calculateHraExemption(Employee $employee, float $annualRentPaid, bool $isMetroCity): float
    {
        $annualBasic = (float)$employee->basic_pay * 12;
        $annualHra = (float)$employee->hra * 12;

        if ($annualRentPaid <= 0 || $annualHra <= 0 || $annualBasic <= 0) {
            return 0.00;
        }

        // 1. Actual HRA received
        $opt1 = $annualHra;

        // 2. Rent paid minus 10% of basic salary
        $opt2 = max(0.00, $annualRentPaid - (0.10 * $annualBasic));

        // 3. 50% of basic (Metro) or 40% of basic (Non-Metro)
        $metroPct = $isMetroCity ? 0.50 : 0.40;
        $opt3 = $metroPct * $annualBasic;

        return min($opt1, $opt2, $opt3);
    }

    /**
     * Compute full annual tax liability under chosen/default regime for an employee.
     */
    public function calculateAnnualTax(Employee $employee, string $financialYear, ?EmployeeTaxDeclaration $declaration = null): array
    {
        $regime = $declaration ? $declaration->regime : ($employee->tds_regime ?: 'new');
        $annualGross = ((float)$employee->gross_monthly_salary * 12) + ($declaration ? (float)$declaration->previous_employer_gross : 0.00);

        if ($regime === 'old') {
            return $this->calculateOldRegimeTax($employee, $annualGross, $financialYear, $declaration);
        }

        return $this->calculateNewRegimeTax($employee, $annualGross, $financialYear, $declaration);
    }

    /**
     * Calculate tax under New Tax Regime (Section 115BAC).
     */
    protected function calculateNewRegimeTax(Employee $employee, float $annualGross, string $financialYear, ?EmployeeTaxDeclaration $declaration): array
    {
        $standardDeduction = 75000.00; // FY 2024-25 & FY 2025-26 / 2026-27
        $taxableIncome = max(0.00, $annualGross - $standardDeduction);

        // Compute tax by slabs (FY 2025-26 & FY 2026-27 rules)
        $tax = 0.00;
        if ($taxableIncome > 2400000) {
            $tax += ($taxableIncome - 2400000) * 0.30;
            $taxableIncome = 2400000;
        }
        if ($taxableIncome > 2000000) {
            $tax += ($taxableIncome - 2000000) * 0.25;
            $taxableIncome = 2000000;
        }
        if ($taxableIncome > 1600000) {
            $tax += ($taxableIncome - 1600000) * 0.20;
            $taxableIncome = 1600000;
        }
        if ($taxableIncome > 1200000) {
            $tax += ($taxableIncome - 1200000) * 0.15;
            $taxableIncome = 1200000;
        }
        if ($taxableIncome > 800000) {
            $tax += ($taxableIncome - 800000) * 0.10;
            $taxableIncome = 800000;
        }
        if ($taxableIncome > 400000) {
            $tax += ($taxableIncome - 400000) * 0.05;
        }

        $netTaxableIncome = max(0.00, $annualGross - $standardDeduction);

        // Section 87A Rebate
        $rebateLimit = ($financialYear === '2024-2025') ? 700000.00 : 1200000.00;
        $maxRebate = ($financialYear === '2024-2025') ? 25000.00 : 60000.00;

        $rebate = 0.00;
        if ($netTaxableIncome <= $rebateLimit) {
            $rebate = min($tax, $maxRebate);
        }

        $taxAfterRebate = max(0.00, $tax - $rebate);
        $cess = round($taxAfterRebate * 0.04, 2);
        $totalAnnualTax = round($taxAfterRebate + $cess, 2);

        $previousTds = $declaration ? (float)$declaration->previous_employer_tds : 0.00;
        $netTaxPayable = max(0.00, $totalAnnualTax - $previousTds);

        return [
            'regime' => 'new',
            'annual_gross' => $annualGross,
            'standard_deduction' => $standardDeduction,
            'hra_exemption' => 0.00,
            'total_deductions' => $standardDeduction,
            'taxable_income' => $netTaxableIncome,
            'gross_tax' => round($tax, 2),
            'rebate_87a' => round($rebate, 2),
            'tax_after_rebate' => $taxAfterRebate,
            'cess' => $cess,
            'total_annual_tax' => $totalAnnualTax,
            'previous_employer_tds' => $previousTds,
            'net_tax_payable' => $netTaxPayable,
        ];
    }

    /**
     * Calculate tax under Old Tax Regime.
     */
    protected function calculateOldRegimeTax(Employee $employee, float $annualGross, string $financialYear, ?EmployeeTaxDeclaration $declaration): array
    {
        $standardDeduction = 50000.00;

        $hraExemption = 0.00;
        $chapter6aDeductions = 0.00;

        if ($declaration) {
            $hraExemption = $this->calculateHraExemption(
                $employee,
                (float)$declaration->monthly_rent_paid * 12,
                (bool)$declaration->is_metro_city
            );

            $chapter6aDeductions = (float)$declaration->total_80c +
                (float)$declaration->total_80d +
                (float)$declaration->total_24b +
                (float)$declaration->section_80e_education_loan +
                (float)$declaration->section_80g_donations +
                (float)$declaration->other_exemptions;
        }

        $totalDeductions = $standardDeduction + $hraExemption + $chapter6aDeductions;
        $taxableIncome = max(0.00, $annualGross - $totalDeductions);

        // Slabs for Old Regime below 60 years
        $tax = 0.00;
        $rem = $taxableIncome;

        if ($rem > 1000000) {
            $tax += ($rem - 1000000) * 0.30;
            $rem = 1000000;
        }
        if ($rem > 500000) {
            $tax += ($rem - 500000) * 0.20;
            $rem = 500000;
        }
        if ($rem > 250000) {
            $tax += ($rem - 250000) * 0.05;
        }

        // Section 87A Rebate for Old Regime (Income <= 5,00,000)
        $rebate = 0.00;
        if ($taxableIncome <= 500000.00) {
            $rebate = min($tax, 12500.00);
        }

        $taxAfterRebate = max(0.00, $tax - $rebate);
        $cess = round($taxAfterRebate * 0.04, 2);
        $totalAnnualTax = round($taxAfterRebate + $cess, 2);

        $previousTds = $declaration ? (float)$declaration->previous_employer_tds : 0.00;
        $netTaxPayable = max(0.00, $totalAnnualTax - $previousTds);

        return [
            'regime' => 'old',
            'annual_gross' => $annualGross,
            'standard_deduction' => $standardDeduction,
            'hra_exemption' => round($hraExemption, 2),
            'chapter_6a_deductions' => round($chapter6aDeductions, 2),
            'total_deductions' => round($totalDeductions, 2),
            'taxable_income' => round($taxableIncome, 2),
            'gross_tax' => round($tax, 2),
            'rebate_87a' => round($rebate, 2),
            'tax_after_rebate' => $taxAfterRebate,
            'cess' => $cess,
            'total_annual_tax' => $totalAnnualTax,
            'previous_employer_tds' => $previousTds,
            'net_tax_payable' => $netTaxPayable,
        ];
    }

    /**
     * Main method: Calculate monthly TDS deduction for payroll processing.
     * Fallback: If no active verified declaration exists or admin provides override, use $overrides['tds_deduction'] ?? 0.00.
     */
    public function calculateMonthlyTds(Employee $employee, string $payrollMonth, array $overrides = []): float
    {
        // 1. Explicit admin override takes precedence if supplied
        if (array_key_exists('tds_deduction', $overrides) && $overrides['tds_deduction'] !== null && $overrides['tds_deduction'] !== '') {
            return max(0.00, (float)$overrides['tds_deduction']);
        }

        // 2. If TDS toggle is disabled for this employee, return 0
        if (!$employee->tds_applicable) {
            return 0.00;
        }

        $financialYear = $this->determineFinancialYear($payrollMonth);

        // 3. Fallback check: Search for ACTIVE VERIFIED declaration
        $verifiedDeclaration = EmployeeTaxDeclaration::where('employee_id', $employee->id)
            ->where('financial_year', $financialYear)
            ->where('status', 'verified')
            ->first();

        if (!$verifiedDeclaration) {
            // NO verified declaration -> Fallback to 0.00 exactly as before
            return 0.00;
        }

        // 4. Active verified declaration exists -> calculate dynamic TDS
        $annualTaxResult = $this->calculateAnnualTax($employee, $financialYear, $verifiedDeclaration);
        $netAnnualTax = $annualTaxResult['net_tax_payable'];

        if ($netAnnualTax <= 0) {
            return 0.00;
        }

        $remainingMonths = $this->getRemainingMonthsInFinancialYear($payrollMonth);

        $monthlyTds = (float)ceil($netAnnualTax / max(1, $remainingMonths));

        if (array_key_exists('paid_days_ratio', $overrides) && (float)$overrides['paid_days_ratio'] < 1.0) {
            $monthlyTds = round($monthlyTds * (float)$overrides['paid_days_ratio'], 2);
        }

        return $monthlyTds;
    }
}
