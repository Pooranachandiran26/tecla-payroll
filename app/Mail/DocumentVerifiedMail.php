<?php
namespace App\Mail;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class DocumentVerifiedMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;
    public $documentType;
    public $employeeName;

    public function __construct($documentType, $employeeName)
    {
        $this->documentType = $documentType;
        $this->employeeName = $employeeName;
    }

    public function build()
    {
        return $this->subject('KYC Document Verified - ' . $this->documentType)
                    ->view('emails.document-verified');
    }
}
