<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Carbon\Carbon;

class PayrollRun extends Model
{
    use HasFactory;

    protected $guarded = [];

    public static function boot()
    {
        parent::boot();

        static::updating(function ($run) {
            $originalStatus = $run->getOriginal('status');
            $dirtyFields = array_keys($run->getDirty());

            // Allowed metadata changes on a locked run
            $metadataFields = ['review_email_sent_at', 'payslip_released_at', 'payslip_released_by', 'resend_count', 'updated_at', 'created_by', 'updated_by', 'locked_by'];

            // 1. If already locked, allow ONLY metadata fields
            if ($originalStatus === 'locked') {
                $nonMetadataChanges = array_diff($dirtyFields, $metadataFields);
                if (!empty($nonMetadataChanges)) {
                    throw new \Exception("Cannot modify details of an approved or locked payroll run.");
                }
                return;
            }

            // 2. If status is changing
            if ($run->isDirty('status')) {
                // If original was approved, it can only transition to locked
                if ($originalStatus === 'approved' && $run->status !== 'locked') {
                    throw new \Exception("An approved payroll run can only transition to locked.");
                }

                // Ensure no financial/core fields are changed during the status transition
                $allowedFields = array_merge(['status', 'approved_by', 'approved_at', 'locked_at', 'locked_by', 'created_by', 'updated_by'], $metadataFields);
                $invalidChanges = array_diff($dirtyFields, $allowedFields);

                if (!empty($invalidChanges)) {
                    throw new \Exception("Cannot modify payroll run parameters or financial values during state transition.");
                }
            } else {
                // 3. If status is not changing, but run is already approved, block non-metadata modifications
                if ($originalStatus === 'approved') {
                    $nonMetadataChanges = array_diff($dirtyFields, $metadataFields);
                    if (!empty($nonMetadataChanges)) {
                        throw new \Exception("Cannot modify details of an approved or locked payroll run.");
                    }
                }
            }
        });

        static::deleting(function ($run) {
            if (in_array($run->status, ['approved', 'locked'])) {
                throw new \Exception("Cannot delete a payroll run that is already approved or locked.");
            }
        });
    }

    public function client()
    {
        return $this->belongsTo(Client::class);
    }

    public function processedBy()
    {
        return $this->belongsTo(User::class, 'processed_by');
    }

    public function approvedBy()
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function updater()
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    public function locker()
    {
        return $this->belongsTo(User::class, 'locked_by');
    }

    public function items()
    {
        return $this->hasMany(PayrollRunItem::class);
    }

    public function children()
    {
        return $this->hasMany(PayrollRun::class, 'parent_run_id');
    }

    public function getCombinedStats()
    {
        $allRunIds = $this->children()->pluck('id')->prepend($this->id)->toArray();

        $rawItems = \Illuminate\Support\Facades\DB::table('payroll_run_items')
            ->join('employees', 'payroll_run_items.employee_id', '=', 'employees.id')
            ->whereIn('payroll_run_id', $allRunIds)
            ->select('payroll_run_items.*', 'payroll_run_items.id as id', 'employees.full_name', 'employees.employee_code')
            ->orderBy('payroll_run_items.id', 'asc')
            ->get();

        $consolidatedItems = app(\App\Services\PayrollCorrectionService::class)->consolidateItemsForDisplay($rawItems);
        $activeItems = $consolidatedItems->where('is_excluded', false);

        $gross = $activeItems->sum('gross_total');
        $net = $activeItems->sum('net_pay');
        $statutory = $activeItems->sum(function ($item) {
            return (float)($item->employer_pf ?? 0) + (float)($item->employer_esi ?? 0) + (float)($item->employer_lwf ?? 0);
        });

        $processed = $consolidatedItems->where('is_excluded', false)->count();
        $excluded = $consolidatedItems->where('is_excluded', true)->count();

        return [
            'total_gross_earnings' => round($gross, 2),
            'total_net_disbursement' => round($net, 2),
            'total_employer_statutory_cost' => round($statutory, 2),
            'total_employees_processed' => $processed,
            'total_employees_excluded' => $excluded,
        ];
    }

    /**
     * Get all active employees under this client who joined on or before the target month ended,
     * but have no row at all in the parent payroll run's items.
     */
    public function getNewHireCandidates()
    {
        $monthEnd = Carbon::parse($this->payroll_month)->endOfMonth()->toDateString();
        
        $allRunIds = $this->children()->pluck('id')->prepend($this->id)->toArray();

        $existingEmployeeIds = \Illuminate\Support\Facades\DB::table('payroll_run_items')
            ->whereIn('payroll_run_id', $allRunIds)
            ->pluck('employee_id')
            ->toArray();

        return Employee::where('client_id', $this->client_id)
            ->where('status', 'active')
            ->where(function($query) use ($monthEnd) {
                $query->whereNull('date_of_joining')
                      ->orWhere('date_of_joining', '<=', $monthEnd);
            })
            ->whereNotIn('id', $existingEmployeeIds)
            ->get();
    }
}

