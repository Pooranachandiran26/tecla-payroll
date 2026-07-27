<?php

namespace App\Mail;

use App\Models\PayrollRunItem;
use App\Models\PayrollRun;
use App\Models\Employee;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Attachment;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;
use Carbon\Carbon;

class OfficialPayslipReleasedMail extends Mailable
{
    use Queueable, SerializesModels;

    public PayrollRunItem $item;
    public PayrollRun $run;
    public Employee $employee;
    public string $pdfRawBytes;
    public string $formattedMonth;

    public function __construct(PayrollRunItem $item, PayrollRun $run, Employee $employee, string $pdfRawBytes)
    {
        $this->item = $item;
        $this->run = $run;
        $this->employee = $employee;
        $this->pdfRawBytes = $pdfRawBytes;
        $this->formattedMonth = Carbon::parse($run->payroll_month)->format('F Y');
    }

    public function envelope(): Envelope
    {
        $companyName = optional($this->employee->client)->company_name ?: 'Tecla Payroll';
        return new Envelope(
            subject: "Official Salary Payslip for {$this->formattedMonth} - {$companyName}",
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.official_payslip_released',
        );
    }

    public function attachments(): array
    {
        $empCode = $this->employee->employee_code ?: 'EMP';
        $filename = "Payslip_{$empCode}_{$this->formattedMonth}.pdf";

        return [
            Attachment::fromData(fn() => $this->pdfRawBytes, $filename)
                ->withMime('application/pdf'),
        ];
    }
}
