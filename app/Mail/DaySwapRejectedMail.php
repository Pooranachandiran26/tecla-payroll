<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class DaySwapRejectedMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public $employeeName;
    public $originalDate;
    public $newDate;
    public $reason;

    public function __construct(string $employeeName, string $originalDate, string $newDate, string $reason)
    {
        $this->employeeName = $employeeName;
        $this->originalDate = $originalDate;
        $this->newDate = $newDate;
        $this->reason = $reason;
    }

    public function build()
    {
        return $this->subject('Action Required: Attendance Day Swap Rejected')
                    ->view('emails.day-swap-rejected');
    }
}
