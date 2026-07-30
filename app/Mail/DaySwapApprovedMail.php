<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class DaySwapApprovedMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public $employeeName;
    public $originalDate;
    public $newDate;

    public function __construct(string $employeeName, string $originalDate, string $newDate)
    {
        $this->employeeName = $employeeName;
        $this->originalDate = $originalDate;
        $this->newDate = $newDate;
    }

    public function build()
    {
        return $this->subject('Attendance Day Swap Approved')
                    ->view('emails.day-swap-approved');
    }
}
