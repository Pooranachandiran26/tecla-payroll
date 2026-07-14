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

            // 1. If already locked, block all modifications
            if ($originalStatus === 'locked') {
                throw new \Exception("Cannot modify a locked payroll run.");
            }

            // 2. If status is changing
            if ($run->isDirty('status')) {
                // If original was approved, it can only transition to locked
                if ($originalStatus === 'approved' && $run->status !== 'locked') {
                    throw new \Exception("An approved payroll run can only transition to locked.");
                }

                // Ensure no financial/core fields are changed during the status transition
                $dirtyFields = array_keys($run->getDirty());
                $allowedFields = ['status', 'approved_by', 'approved_at', 'locked_at', 'updated_at'];
                $invalidChanges = array_diff($dirtyFields, $allowedFields);

                if (!empty($invalidChanges)) {
                    throw new \Exception("Cannot modify payroll run parameters or financial values during state transition.");
                }
            } else {
                // 3. If status is not changing, but run is already approved/locked, block all modifications
                if (in_array($originalStatus, ['approved', 'locked'])) {
                    throw new \Exception("Cannot modify details of an approved or locked payroll run.");
                }
            }
        });

        static::deleting(function ($run) {
            if (in_array($run->status, ['approved', 'locked'])) {
                throw new \Exception("Cannot delete a payroll run that is already approved or locked.");
            }
        });
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
        $allRuns = collect([$this])->concat($this->children()->get());

        $gross = $allRuns->sum('total_gross_earnings');
        $net = $allRuns->sum('total_net_disbursement');
        $statutory = $allRuns->sum('total_employer_statutory_cost');

        $latestItems = \Illuminate\Support\Facades\DB::table('payroll_run_items')
            ->whereIn('payroll_run_id', $allRuns->pluck('id'))
            ->orderBy('id', 'desc')
            ->get()
            ->unique('employee_id');

        $processed = $latestItems->where('is_excluded', 0)->count();
        $excluded = $latestItems->where('is_excluded', 1)->count();

        return [
            'total_gross_earnings' => round($gross, 2),
            'total_net_disbursement' => round($net, 2),
            'total_employer_statutory_cost' => round($statutory, 2),
            'total_employees_processed' => $processed,
            'total_employees_excluded' => $excluded,
        ];
    }
}
