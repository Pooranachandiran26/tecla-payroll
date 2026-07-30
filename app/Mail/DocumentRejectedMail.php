<?php
namespace App\Mail;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class DocumentRejectedMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;
    public $documentType;
    public $employeeName;
    public $rejectionReason;

    public function __construct($documentType, $employeeName, $rejectionReason)
    {
        $this->documentType = $documentType;
        $this->employeeName = $employeeName;
        $this->rejectionReason = $rejectionReason;
    }

    public function build()
    {
        return $this->subject('Action Required: KYC Document Rejected - ' . $this->documentType)
                    ->view('emails.document-rejected');
    }
}
