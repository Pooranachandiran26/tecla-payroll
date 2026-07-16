<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Invoice;

class CheckOverdueInvoices extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'invoices:check-overdue';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Updates status of invoices that have passed their due date to overdue';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $count = Invoice::where('status', '!=', 'paid')
            ->where('due_date', '<', now()->toDateString())
            ->update(['status' => 'overdue']);
        
        $this->info("Successfully updated {$count} overdue invoices to overdue status.");
    }
}
