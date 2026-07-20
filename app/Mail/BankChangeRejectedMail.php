<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class BankChangeRejectedMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;
    
    public $employeeName;
    public $reason;

    public function __construct($employeeName, $reason)
    {
        $this->employeeName = $employeeName;
        $this->reason = $reason;
    }

    public function build()
    {
        return $this->subject('Action Required: Bank Details Update Rejected')
                    ->view('emails.bank-rejected');
    }
}
