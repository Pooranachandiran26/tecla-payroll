<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class ProfileActivatedMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;
    
    public $employeeName;

    public function __construct($employeeName)
    {
        $this->employeeName = $employeeName;
    }

    public function build()
    {
        return $this->subject('Profile Activated - Tecla Payroll')
                    ->view('emails.profile-activated');
    }
}
