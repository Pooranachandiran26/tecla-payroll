<?php

namespace App\Mail;

use App\Models\PayrollRunItem;
use App\Models\PayrollRun;
use App\Models\Employee;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;
use Carbon\Carbon;

class SalaryReviewSummaryMail extends Mailable
{
    use Queueable, SerializesModels;

    public PayrollRunItem $item;
    public PayrollRun $run;
    public Employee $employee;
    public array $breakdown;
    public string $supportUrl;
    public string $formattedMonth;

    public function __construct(PayrollRunItem $item, PayrollRun $run, Employee $employee, array $breakdown, string $supportUrl)
    {
        $this->item = $item;
        $this->run = $run;
        $this->employee = $employee;
        $this->breakdown = $breakdown;
        $this->supportUrl = $supportUrl;
        $this->formattedMonth = Carbon::parse($run->payroll_month)->format('F Y');
    }

    public function envelope(): Envelope
    {
        $companyName = optional($this->employee->client)->company_name ?: 'Tecla Payroll';
        return new Envelope(
            subject: "Payroll Summary for {$this->formattedMonth} - {$companyName}",
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.salary_review_summary',
        );
    }

    public function attachments(): array
    {
        return [];
    }
}
