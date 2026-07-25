<?php

namespace App\Mail;

use App\Models\EmployeeQuery;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class EmployeeQueryRespondedMail extends Mailable
{
    use Queueable, SerializesModels;

    public EmployeeQuery $queryModel;

    public function __construct(EmployeeQuery $queryModel)
    {
        $this->queryModel = $queryModel->load(['employee', 'client', 'resolver']);
    }

    public function build()
    {
        $subject = "Response to your Support Query: {$this->queryModel->subject}";

        return $this->subject($subject)
                    ->view('emails.employee_query_responded');
    }
}
