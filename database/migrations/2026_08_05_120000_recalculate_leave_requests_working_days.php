<?php

use Illuminate\Database\Migrations\Migration;
use App\Models\LeaveRequest;
use App\Models\Employee;
use App\Models\Client;
use App\Services\AttendanceResolutionService;
use App\Services\LeavePolicyService;
use Carbon\Carbon;

return new class extends Migration
{
    public function up(): void
    {
        $attendanceResolutionService = app(AttendanceResolutionService::class);
        $leavePolicyService = app(LeavePolicyService::class);

        // 1. Recalculate days_count to working days for all LeaveRequest records
        $leaveRequests = LeaveRequest::all();
        foreach ($leaveRequests as $req) {
            $employee = Employee::find($req->employee_id);
            if ($employee) {
                $fromDate = Carbon::parse($req->from_date);
                $toDate = Carbon::parse($req->to_date);

                $workingDays = 0;
                for ($curr = $fromDate->copy(); $curr->lte($toDate); $curr->addDay()) {
                    if ($attendanceResolutionService->isWorkingDay($employee, $curr)) {
                        $workingDays++;
                    }
                }

                $req->update(['days_count' => $workingDays]);
            }
        }

        // 2. Re-sync EmployeeLeaveBalance for all clients
        $clients = Client::where('status', 'active')->get();
        $year = (int)date('Y');
        foreach ($clients as $client) {
            $leavePolicyService->syncClientEmployeesBalances($client, $year);
        }
    }

    public function down(): void
    {
        // Data correction migration - irreversible
    }
};
