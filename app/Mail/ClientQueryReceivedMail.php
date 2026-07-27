<?php

namespace App\Mail;

use App\Models\EmployeeQuery;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class ClientQueryReceivedMail extends Mailable
{
    use Queueable, SerializesModels;

    public EmployeeQuery $queryModel;

    public function __construct(EmployeeQuery $queryModel)
    {
        $this->queryModel = $queryModel->load(['employee', 'client']);
    }

    public function build()
    {
        $empName = $this->queryModel->employee ? $this->queryModel->employee->full_name : 'Employee';
        $category = ucfirst($this->queryModel->category);

        return $this->subject("Employee Query Notification: [{$category}] from {$empName}")
                    ->view('emails.client_query_received');
    }
}
