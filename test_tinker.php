<?php
// Test script via artisan tinker

use App\Models\Employee;
use App\Models\User;
use App\Models\BankChangeRequest;
use Illuminate\Support\Facades\DB;

DB::table('jobs')->truncate();

// 1. Employee auto activation
$emp = Employee::first();
$emp->update(['status' => 'active']);
\Illuminate\Support\Facades\Mail::to($emp->personal_email)->queue(new \App\Mail\ProfileActivatedMail($emp->full_name));

// 2. Bank change requested
\App\Jobs\NotifyWatchersJob::dispatch('system_alerts', 'Bank Change Requested', "Employee {$emp->full_name} has requested to update their bank details.", null);

// 3. Bank change approved
\Illuminate\Support\Facades\Mail::to($emp->personal_email)->queue(new \App\Mail\BankChangeApprovedMail($emp->full_name));

// 4. Bank change rejected
\Illuminate\Support\Facades\Mail::to($emp->personal_email)->queue(new \App\Mail\BankChangeRejectedMail($emp->full_name, 'Invalid IFSC code'));

echo "Jobs in queue:\n";
$jobs = DB::table('jobs')->get();
foreach($jobs as $job) {
    $payload = json_decode($job->payload);
    echo "- " . $payload->displayName . "\n";
}
