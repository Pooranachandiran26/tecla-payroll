<?php

namespace App\Mail;

use App\Models\EmployeeQuery;
use App\Models\PayrollRunItem;
use App\Models\PayrollRun;
use App\Models\Employee;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class QueryResolvedWithPayrollAdjustmentMail extends Mailable
{
    use Queueable, SerializesModels;

    public EmployeeQuery $queryModel;
    public PayrollRunItem $correctionItem;
    public PayrollRun $parentRun;
    public Employee $employee;
    public array $adjustmentSummary;

    public function __construct(
        EmployeeQuery $queryModel,
        PayrollRunItem $correctionItem,
        PayrollRun $parentRun,
        Employee $employee,
        array $adjustmentSummary
    ) {
        $this->queryModel = $queryModel;
        $this->correctionItem = $correctionItem;
        $this->parentRun = $parentRun;
        $this->employee = $employee;
        $this->adjustmentSummary = $adjustmentSummary;
    }

    public function build()
    {
        $subject = "Support Query Resolved: Payroll Adjustment Applied ({$this->queryModel->subject})";

        return $this->subject($subject)
                    ->view('emails.query_resolved_with_adjustment');
    }
}
