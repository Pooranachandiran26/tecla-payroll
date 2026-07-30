<?php

namespace Tests\Feature;

use Tests\TestCase;
use Carbon\Carbon;
use App\Services\StatutoryDueDateService;
use App\Models\Client;
use App\Models\ClientBranch;
use Illuminate\Foundation\Testing\RefreshDatabase;

class StatutoryDueDateServiceTest extends TestCase
{
    use RefreshDatabase;

    /**
     * PF (EPFO): Due on or before the 15th of the following month.
     * Source: Paragraph 38(1) of the EPF Scheme, 1952.
     * 
     * ESI: Due on or before the 15th of the following month.
     * Source: Regulation 31 of the ESI (General) Regulations, 1950.
     */
    public function test_pf_and_esi_due_dates_are_15th_of_following_month()
    {
        $payrollMonth = Carbon::create(2026, 7, 1);
        
        $pfDue = StatutoryDueDateService::getPfDueDate($payrollMonth);
        $this->assertEquals('2026-08-15', $pfDue->format('Y-m-d'));

        $esiDue = StatutoryDueDateService::getEsiDueDate($payrollMonth);
        $this->assertEquals('2026-08-15', $esiDue->format('Y-m-d'));
    }

    /**
     * TDS (Form 24Q): Filed Quarterly. ALWAYS return the NEXT upcoming deadline.
     * Q1 (Apr-Jun): July 31
     * Q2 (Jul-Sep): October 31
     * Q3 (Oct-Dec): January 31
     * Q4 (Jan-Mar): May 31
     * Source: Rule 31A of the Income Tax Rules, 1962.
     */
    public function test_tds_due_dates_align_with_quarterly_rules()
    {
        // Q1 payroll month (May) -> Due July 31
        $due = StatutoryDueDateService::getTdsDueDate(Carbon::create(2026, 5, 1));
        $this->assertEquals('2026-07-31', $due->format('Y-m-d'));

        // Q2 payroll month (August) -> Due Oct 31
        $due = StatutoryDueDateService::getTdsDueDate(Carbon::create(2026, 8, 1));
        $this->assertEquals('2026-10-31', $due->format('Y-m-d'));

        // Q3 payroll month (November) -> Due Jan 31 next year
        $due = StatutoryDueDateService::getTdsDueDate(Carbon::create(2026, 11, 1));
        $this->assertEquals('2027-01-31', $due->format('Y-m-d'));

        // Q4 payroll month (February) -> Due May 31
        $due = StatutoryDueDateService::getTdsDueDate(Carbon::create(2027, 2, 1));
        $this->assertEquals('2027-05-31', $due->format('Y-m-d'));
    }

    /**
     * Professional Tax (PT): State-specific.
     * Maharashtra: Last day of the following month. Source: Maharashtra State Tax on Professions Act, 1975.
     * Karnataka: 20th day of the following month. Source: Section 6-A, Karnataka Tax on Professions Act, 1976.
     * Tamil Nadu: Half-Yearly (Sep 15 and Mar 15). Source: Tamil Nadu Panchayats Act, 1994.
     */
    public function test_pt_due_dates_are_state_specific()
    {
        $payrollMonth = Carbon::create(2026, 7, 1);

        $mhDue = StatutoryDueDateService::getPtDueDate($payrollMonth, ['Maharashtra']);
        $this->assertEquals('2026-08-31', $mhDue->format('Y-m-d')); // Last day of August

        $kaDue = StatutoryDueDateService::getPtDueDate($payrollMonth, ['Karnataka']);
        $this->assertEquals('2026-08-20', $kaDue->format('Y-m-d')); // 20th of August

        $tnDue = StatutoryDueDateService::getPtDueDate($payrollMonth, ['Tamil Nadu']);
        $this->assertEquals('2026-09-15', $tnDue->format('Y-m-d')); // Sep 15
    }

    /**
     * Multi-branch earliest-date logic:
     * A client with branches in BOTH Karnataka (due 20th) and Maharashtra (due 31st).
     * Confirm the returned due date is the earlier of the two (Karnataka).
     */
    public function test_multi_state_pt_returns_earliest_upcoming_due_date()
    {
        $payrollMonth = Carbon::create(2026, 7, 1);

        $earliestDue = StatutoryDueDateService::getPtDueDate($payrollMonth, ['Maharashtra', 'Karnataka']);
        
        $this->assertEquals('2026-08-20', $earliestDue->format('Y-m-d'));
    }
}
