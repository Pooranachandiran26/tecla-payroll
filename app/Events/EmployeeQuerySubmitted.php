<?php

namespace App\Events;

use App\Contracts\NotifiesWatchers;
use App\Models\EmployeeQuery;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class EmployeeQuerySubmitted implements NotifiesWatchers
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public EmployeeQuery $query;

    public function __construct(EmployeeQuery $query)
    {
        $this->query = $query->load(['employee', 'client']);
    }

    public function watcherCategory(): string
    {
        return 'employee';
    }

    public function watcherSubject(): string
    {
        return "New Employee Query: [" . ucfirst($this->query->category) . "] - " . $this->query->subject;
    }

    public function watcherSummary(): string
    {
        $empName = $this->query->employee ? $this->query->employee->full_name : 'Employee';
        $empCode = $this->query->employee ? $this->query->employee->employee_code : '—';
        $clientName = $this->query->client ? $this->query->client->company_name : 'Client';

        return "Query from {$empName} ({$empCode}) under {$clientName}: " . \Illuminate\Support\Str::limit($this->query->message, 120);
    }

    public function watcherContextUrl(): ?string
    {
        try {
            if (typeof_route_exists('admin.employee-queries.index')) {
                return route('admin.employee-queries.index');
            }
        } catch (\Throwable $e) {}
        return url('/admin/employee-queries');
    }
}

if (!function_exists('App\Events\typeof_route_exists')) {
    function typeof_route_exists($name) {
        return \Illuminate\Support\Facades\Route::has($name);
    }
}
