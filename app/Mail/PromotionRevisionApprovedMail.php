<?php

namespace App\Mail;

use App\Models\Employee;
use App\Models\SalaryRevision;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class PromotionRevisionApprovedMail extends Mailable
{
    use Queueable, SerializesModels;

    public Employee $employee;
    public SalaryRevision $revision;
    public ?string $customSubject;
    public ?string $customNote;

    public function __construct(Employee $employee, SalaryRevision $revision, ?string $customSubject = null, ?string $customNote = null)
    {
        $this->employee = $employee;
        $this->revision = $revision;
        $this->customSubject = $customSubject;
        $this->customNote = $customNote;
    }

    public function envelope(): Envelope
    {
        if (!empty($this->customSubject)) {
            return new Envelope(
                subject: $this->customSubject,
            );
        }

        $companyName = optional($this->employee->client)->company_name ?: 'Tecla Payroll';
        $typeStr = $this->revision->is_promotion ? '🎉 Promotion & Salary Revision Notification' : '📈 Salary Revision Notification';
        return new Envelope(
            subject: "{$typeStr} - {$this->employee->full_name} ({$companyName})",
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.promotion_revision_approved',
            with: [
                'customNote' => $this->customNote,
            ]
        );
    }

    public function attachments(): array
    {
        return [];
    }
}
