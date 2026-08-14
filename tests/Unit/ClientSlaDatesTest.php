<?php

namespace Tests\Unit;

use Tests\TestCase;
use App\Models\Client;

class ClientSlaDatesTest extends TestCase
{
    public function test_target_lock_date_current_month()
    {
        $client = new Client(['payroll_lock_day' => '21_current']);
        $this->assertEquals('Aug 21, 2026', $client->getTargetLockDate('2026-08-01'));

        $client2 = new Client(['payroll_lock_day' => '30_current']);
        $this->assertEquals('Aug 30, 2026', $client2->getTargetLockDate('2026-08-01'));

        $clientEom = new Client(['payroll_lock_day' => 'eom_current']);
        $this->assertEquals('Aug 31, 2026', $clientEom->getTargetLockDate('2026-08-01'));
    }

    public function test_target_lock_date_next_month()
    {
        $client = new Client(['payroll_lock_day' => '3']);
        $this->assertEquals('Sep 3, 2026', $client->getTargetLockDate('2026-08-01'));

        $client2 = new Client(['payroll_lock_day' => '5']);
        $this->assertEquals('Sep 5, 2026', $client2->getTargetLockDate('2026-08-01'));
    }

    public function test_target_salary_credit_date_current_and_next_month()
    {
        $client = new Client(['salary_credit_day' => '25_current']);
        $this->assertEquals('Aug 25, 2026', $client->getTargetSalaryCreditDate('2026-08-01'));

        $clientEom = new Client(['salary_credit_day' => 'eom_current']);
        $this->assertEquals('Aug 31, 2026', $clientEom->getTargetSalaryCreditDate('2026-08-01'));

        $clientNext = new Client(['salary_credit_day' => '7']);
        $this->assertEquals('Sep 7, 2026', $clientNext->getTargetSalaryCreditDate('2026-08-01'));
    }
}
