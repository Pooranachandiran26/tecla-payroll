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
     *
     * ⚠️ TEST-ONLY: agency_gstin is currently a placeholder.
     * Invoices generated must NOT be used for real accounting until replaced.
     */
    public function generateForRun(PayrollRun $payrollRun): array
    {
        // 1. Load the client
        $client = Client::findOrFail($payrollRun->client_id);

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
        //    For supplementary runs, merge into the parent run's invoice
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
                $branchGross += $itemGross;

                // Calculate per-item agency fee based on billing model
                $itemFee = $this->calculateItemAgencyFee($client, $itemGross);
                $branchServiceFee += $itemFee;

                $lineItemData[] = [
                    'employee_id' => $item->employee_id,
                    'gross_pay' => round($itemGross, 2),
                    'agency_fee' => round($itemFee, 2),
                    'line_total' => round($itemGross + $itemFee, 2),
                ];
            }

            $branchGross = round($branchGross, 2);
            $branchServiceFee = round($branchServiceFee, 2);
            $gstAmount = round($branchServiceFee * 0.18, 2);
            $grandTotal = round($branchGross + $branchServiceFee + $gstAmount, 2);

            // Check if a parent invoice already exists for this branch + target run
            $existingInvoice = Invoice::where('client_id', $client->id)
                ->where('branch_id', $branchId)
                ->where('payroll_run_id', $targetRunId)
                ->first();

            if ($existingInvoice) {
                // MERGE: Update existing invoice totals and add new line items
                $existingInvoice->update([
                    'gross_salary_passthrough' => round((float) $existingInvoice->gross_salary_passthrough + $branchGross, 2),
                    'agency_service_fee' => round((float) $existingInvoice->agency_service_fee + $branchServiceFee, 2),
                    'gst_amount' => round((float) $existingInvoice->gst_amount + $gstAmount, 2),
                    'grand_total' => round((float) $existingInvoice->grand_total + $grandTotal, 2),
                ]);

                foreach ($lineItemData as $lid) {
                    InvoiceLineItem::create(array_merge($lid, [
                        'invoice_id' => $existingInvoice->id,
                    ]));
                }

                $invoices[] = $existingInvoice->fresh();
            } else {
                // CREATE: New invoice for this branch
                $invoiceNumber = $this->generateInvoiceNumber($payrollRun, $branchId);

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
                    'gst_amount' => $gstAmount,
                    'grand_total' => $grandTotal,
                    'status' => 'draft',
                    'due_date' => now()->addDays(30)->toDateString(),
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
     * Calculate the agency fee for a single payroll item based on the client's billing model.
     */
    private function calculateItemAgencyFee(Client $client, float $itemGross): float
    {
        return match ($client->billing_model) {
            'markup' => $itemGross * ((float) ($client->markup_percentage ?? 0) / 100),
            'fixed_per_candidate' => (float) ($client->fixed_fee_amount ?? 0),
            'fixed_per_month' => (float) ($client->fixed_fee_amount ?? 0),
            default => 0,
        };
    }

    /**
     * Fetch the agency GSTIN from settings, cleaning any JSON-encoded quotes.
     */
    private function getAgencyGstin(): string
    {
        $gstin = SettingsService::get('company_profile.agency_gstin', '');
        // Clean any literal double-quotes baked into the value
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
            '27' => 'Maharashtra', '29' => 'Karnataka', '30' => 'Goa',
            '32' => 'Kerala', '33' => 'Tamil Nadu', '34' => 'Puducherry',
            '36' => 'Telangana', '37' => 'Andhra Pradesh',
        ];
        return $mapping[$stateCode] ?? "State-{$stateCode}";
    }
}
