<?php

namespace App\Services;

use App\Models\Invoice;
use App\Models\InvoiceLineItem;
use App\Models\PayrollRun;
use App\Models\Client;
use App\Models\ClientBranch;
use App\Models\Employee;
use Illuminate\Support\Facades\DB;

class InvoiceGenerationService
{
    /**
     * Generate (or merge into existing) invoices for a locked payroll run.
     * Creates one invoice per branch, grouping processed employees by branch_id.
     *
     * For supplementary runs: merges line items into the parent run's existing
     * invoice for the same branch, rather than creating duplicate invoices.
     */
    public function generateForRun(PayrollRun $payrollRun): array
    {
        // 1. Load the client
        $client = Client::findOrFail($payrollRun->client_id);

        // 1a. In-House Client Check (No Client Billing / Invoice Generation)
        if ($client->isInhouse()) {
            return [];
        }

        // 1b. Contract Expiry Check
        if ($client->contract_end_date && \Carbon\Carbon::parse($client->contract_end_date)->startOfDay()->isPast() && !(bool)$client->auto_renewal) {
            $formattedEnd = \Carbon\Carbon::parse($client->contract_end_date)->format('Y-m-d');
            throw new \InvalidArgumentException("Cannot process invoice: Client contract for '{$client->company_name}' expired on {$formattedEnd} and auto-renewal is disabled.");
        }

        // 1c. Invoicing Cycle Guard
        $cycle = $client->invoice_cycle;
        if (!empty($cycle) && $cycle !== 'monthly') {
            throw new \InvalidArgumentException("Cannot process invoice: Client '{$client->company_name}' uses '{$cycle}' invoicing cycle, which requires multi-run batch consolidation. Please set client invoicing cycle to Monthly.");
        }

        // 2. Fetch all non-excluded items for this run
        $items = DB::table('payroll_run_items')
            ->where('payroll_run_id', $payrollRun->id)
            ->where('is_excluded', false)
            ->get();

        if ($items->isEmpty()) {
            return [];
        }

        // 3. Load employees for these items to get branch_id
        $employeeIds = $items->pluck('employee_id')->unique();
        $employees = Employee::whereIn('id', $employeeIds)->get()->keyBy('id');

        // 4. Group items by branch_id
        $itemsByBranch = $items->groupBy(function ($item) use ($employees) {
            $employee = $employees->get($item->employee_id);
            return $employee ? $employee->branch_id : null;
        })->filter(function ($group, $branchId) {
            return $branchId !== null;
        });

        // 5. Fetch agency GSTIN from settings
        $agencyGstin = $this->getAgencyGstin();
        $agencyStateCode = substr($agencyGstin, 0, 2);

        // 6. Determine the target payroll_run_id for invoice lookup
        $targetRunId = $payrollRun->is_supplementary_run
            ? $payrollRun->parent_run_id
            : $payrollRun->id;

        $invoices = [];

        // 7. For each branch, create or merge into an invoice
        foreach ($itemsByBranch as $branchId => $branchItems) {
            $branch = ClientBranch::find($branchId);
            if (!$branch) {
                continue;
            }

            // Resolve branch GSTIN: branch-level first, fall back to client-level
            $branchGstin = $branch->gstin ?: $client->gstin;
            $branchStateCode = substr($branchGstin, 0, 2);

            // Determine GST type
            $gstType = ($agencyStateCode === $branchStateCode) ? 'cgst_sgst' : 'igst';
            $placeOfSupplyState = $this->getStateName($branchStateCode);

            // Calculate branch totals
            $branchGross = 0;
            $branchServiceFee = 0;

            $lineItemData = [];
            foreach ($branchItems as $item) {
                $itemGross = (float) $item->gross_total;
                $itemCtc = $itemGross + (float) data_get($item, 'employer_pf', 0) + (float) data_get($item, 'employer_esi', 0) + (float) data_get($item, 'employer_lwf', 0);
                $branchGross += $itemCtc;

                // Calculate per-item agency fee based on billing model
                $itemFee = $this->calculateItemAgencyFee($client, $item);
                $branchServiceFee += $itemFee;

                $lineItemData[] = [
                    'employee_id' => $item->employee_id,
                    'gross_pay' => round($itemCtc, 2),
                    'agency_fee' => round($itemFee, 2),
                    'line_total' => round($itemCtc + $itemFee, 2),
                ];
            }

            // Fixed monthly retainer (fixed_per_month) & Lumpsum: applied ONCE per branch invoice, not per item
            if (in_array($client->billing_model, ['fixed_per_month', 'fixed_monthly_retainer', 'lumpsum', 'lump_sum'])) {
                $branchServiceFee = (float) ($client->fixed_fee_amount ?? 0);
            }

            $branchGross = round($branchGross, 2);
            $branchServiceFee = round($branchServiceFee, 2);
            $cgstAmount = ($gstType === 'cgst_sgst') ? round($branchServiceFee * 0.09, 2) : 0.00;
            $sgstAmount = ($gstType === 'cgst_sgst') ? round($branchServiceFee * 0.09, 2) : 0.00;
            $igstAmount = ($gstType === 'igst') ? round($branchServiceFee * 0.18, 2) : 0.00;
            $gstAmount = ($gstType === 'cgst_sgst') ? round($cgstAmount + $sgstAmount, 2) : $igstAmount;
            $grandTotal = round($branchGross + $branchServiceFee + $gstAmount, 2);

            // Check if a parent invoice already exists for this branch + target run
            $existingInvoice = Invoice::where('client_id', $client->id)
                ->where('branch_id', $branchId)
                ->where('payroll_run_id', $targetRunId)
                ->first();

            // Calculate dispute window expiration date
            $windowDays = $client->invoice_dispute_window_days !== null ? (int)$client->invoice_dispute_window_days : 7;
            $disputeExpires = now()->addDays($windowDays)->toDateString();

            // Calculate credit limit warning
            $creditLimit = (float) ($client->credit_limit ?? 0);

            if ($existingInvoice) {
                $newGrandTotal = round((float) $existingInvoice->grand_total + $grandTotal, 2);
                $warningNotes = null;
                if ($creditLimit > 0) {
                    $outstanding = Invoice::where('client_id', $client->id)
                        ->whereIn('status', ['draft', 'finalized', 'raised', 'sent', 'overdue', 'partially_paid'])
                        ->where('id', '!=', $existingInvoice->id)
                        ->sum('grand_total');
                    $totalOutstanding = $outstanding + $newGrandTotal;
                    if ($totalOutstanding > $creditLimit) {
                        $warningNotes = "Warning: Credit limit of ₹" . number_format($creditLimit, 2) . " exceeded. Outstanding unpaid total: ₹" . number_format($totalOutstanding, 2);
                    }
                }

                // MERGE: Update existing invoice totals and add new line items
                $newServiceFee = round((float) $existingInvoice->agency_service_fee + $branchServiceFee, 2);
                $newCgst = ($gstType === 'cgst_sgst') ? round($newServiceFee * 0.09, 2) : 0.00;
                $newSgst = ($gstType === 'cgst_sgst') ? round($newServiceFee * 0.09, 2) : 0.00;
                $newIgst = ($gstType === 'igst') ? round($newServiceFee * 0.18, 2) : 0.00;
                $newGst = ($gstType === 'cgst_sgst') ? round($newCgst + $newSgst, 2) : $newIgst;

                $updatePayload = [
                    'gross_salary_passthrough' => round((float) $existingInvoice->gross_salary_passthrough + $branchGross, 2),
                    'agency_service_fee' => $newServiceFee,
                    'cgst_amount' => $newCgst,
                    'sgst_amount' => $newSgst,
                    'igst_amount' => $newIgst,
                    'gst_amount' => $newGst,
                    'grand_total' => $newGrandTotal,
                    'warning_notes' => $warningNotes,
                ];
                if (is_null($existingInvoice->dispute_window_expires_at)) {
                    $updatePayload['dispute_window_expires_at'] = $disputeExpires;
                }
                $existingInvoice->update($updatePayload);

                foreach ($lineItemData as $lid) {
                    InvoiceLineItem::create(array_merge($lid, [
                        'invoice_id' => $existingInvoice->id,
                    ]));
                }

                $invoices[] = $existingInvoice->fresh();
            } else {
                // CREATE: New invoice for this branch
                $invoiceNumber = $this->generateInvoiceNumber($payrollRun, $branchId);

                $warningNotes = null;
                if ($creditLimit > 0) {
                    $outstanding = Invoice::where('client_id', $client->id)
                        ->whereIn('status', ['draft', 'finalized', 'raised', 'sent', 'overdue', 'partially_paid'])
                        ->sum('grand_total');
                    $totalOutstanding = $outstanding + $grandTotal;
                    if ($totalOutstanding > $creditLimit) {
                        $warningNotes = "Warning: Credit limit of ₹" . number_format($creditLimit, 2) . " exceeded. Outstanding unpaid total: ₹" . number_format($totalOutstanding, 2);
                    }
                }

                $netTerms = $client->payment_net_terms;
                $days = 30; // fallback default
                if ($netTerms === 'immediate') {
                    $days = 0;
                } elseif (is_string($netTerms) && str_starts_with($netTerms, 'net')) {
                    $days = (int) substr($netTerms, 3);
                }
                $dueDate = now()->addDays($days)->toDateString();

                $invoice = Invoice::create([
                    'invoice_number' => $invoiceNumber,
                    'client_id' => $client->id,
                    'branch_id' => $branchId,
                    'payroll_run_id' => $targetRunId,
                    'invoice_month' => $payrollRun->payroll_month,
                    'agency_gstin' => $agencyGstin,
                    'branch_gstin' => $branchGstin,
                    'place_of_supply_state' => $placeOfSupplyState,
                    'gst_type' => $gstType,
                    'gross_salary_passthrough' => $branchGross,
                    'agency_service_fee' => $branchServiceFee,
                    'cgst_amount' => $cgstAmount,
                    'sgst_amount' => $sgstAmount,
                    'igst_amount' => $igstAmount,
                    'gst_amount' => $gstAmount,
                    'grand_total' => $grandTotal,
                    'status' => 'draft',
                    'due_date' => $dueDate,
                    'warning_notes' => $warningNotes,
                    'dispute_window_expires_at' => $disputeExpires,
                ]);

                foreach ($lineItemData as $lid) {
                    InvoiceLineItem::create(array_merge($lid, [
                        'invoice_id' => $invoice->id,
                    ]));
                }

                $invoices[] = $invoice;
            }
        }

        return $invoices;
    }

    /**
     * Calculate agency fee for a single payroll item based on client billing model and markup basis.
     */
    private function calculateItemAgencyFee(Client $client, $item): float
    {
        $itemGross = (float) data_get($item, 'gross_total', 0);
        $model = $client->billing_model;

        if (in_array($model, ['fixed_per_month', 'fixed_monthly_retainer', 'lumpsum', 'lump_sum'])) {
            // Monthly retainer / Lump sum is applied ONCE per branch invoice
            return 0.00;
        }

        if ($model === 'fixed_per_candidate' || $model === 'fixed_fee_per_candidate') {
            return (float) ($client->fixed_fee_amount ?? 0);
        }

        if ($model === 'hourly' || $model === 'hourly_rate') {
            $rate = (float) ($client->hourly_rate ?? $client->fixed_fee_amount ?? 0);
            $paidDays = (float) data_get($item, 'paid_days', 30);
            $hours = round($paidDays * 8, 2);
            return round($hours * $rate, 2);
        }

        // Markup Billing Model
        $basisSetting = $client->markup_applied_on ?: 'gross_salary';
        $basis = match ($basisSetting) {
            'ctc' => $itemGross + (float)data_get($item, 'employer_pf', 0) + (float)data_get($item, 'employer_esi', 0) + (float)data_get($item, 'employer_lwf', 0),
            'basic_only' => (float) data_get($item, 'basic_pay', 0),
            'ctc_minus_statutory' => $itemGross,
            default => $itemGross,
        };

        $pct = (float) ($client->markup_percentage ?? 0);
        return round($basis * ($pct / 100), 2);
    }

    /**
     * Fetch agency GSTIN from settings, cleaning any JSON-encoded quotes.
     */
    private function getAgencyGstin(): string
    {
        $gstin = SettingsService::get('company_profile.agency_gstin', '');
        return trim($gstin, '"');
    }

    /**
     * Generate a sequential invoice number.
     */
    private function generateInvoiceNumber(PayrollRun $payrollRun, int $branchId): string
    {
        $monthPart = date('Ym', strtotime($payrollRun->payroll_month));
        return "INV-{$monthPart}-{$branchId}-{$payrollRun->id}";
    }

    /**
     * Map a 2-digit state code to a state name.
     */
    private function getStateName(string $stateCode): string
    {
        $mapping = [
            '01' => 'Jammu & Kashmir', '02' => 'Himachal Pradesh', '03' => 'Punjab',
            '04' => 'Chandigarh', '05' => 'Uttarakhand', '06' => 'Haryana',
            '07' => 'Delhi', '08' => 'Rajasthan', '09' => 'Uttar Pradesh',
            '10' => 'Bihar', '11' => 'Sikkim', '12' => 'Arunachal Pradesh',
            '13' => 'Nagaland', '14' => 'Manipur', '15' => 'Mizoram',
            '16' => 'Tripura', '17' => 'Meghalaya', '18' => 'Assam',
            '19' => 'West Bengal', '20' => 'Jharkhand', '21' => 'Odisha',
            '22' => 'Chhattisgarh', '23' => 'Madhya Pradesh', '24' => 'Gujarat',
            '26' => 'Dadra & Nagar Haveli and Daman & Diu', '27' => 'Maharashtra',
            '28' => 'Andhra Pradesh (Old)', '29' => 'Karnataka', '30' => 'Goa',
            '31' => 'Lakshadweep', '32' => 'Kerala', '33' => 'Tamil Nadu',
            '34' => 'Puducherry', '35' => 'Andaman & Nicobar Islands', '36' => 'Telangana',
            '37' => 'Andhra Pradesh (New)', '38' => 'Ladakh',
        ];

        return $mapping[$stateCode] ?? 'Maharashtra';
    }
}
