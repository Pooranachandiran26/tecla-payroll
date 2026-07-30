<?php

namespace App\Services;

use App\Models\PayrollRun;
use App\Models\Invoice;
use App\Models\InvoiceLineItem;
use App\Models\Client;
use Illuminate\Support\Facades\DB;

class MarginReconciliationService
{
    /**
     * Perform independent reconciliation checks for a payroll run.
     *
     * Two independent checks:
     *
     * A) Invoice Line Total Reconciliation:
     *    Value 1 (Invoice Side) = sum(invoice_line_items.line_total) for this run's invoices
     *    Value 2 (Payroll Side) = sum(payroll_run_items.gross_total) + sum(independently calculated service fee from client profile)
     *    These MUST match — if the InvoiceGenerationService computed fees differently
     *    from the client's contract terms, this will catch it.
     *
     * B) Agency Margin Reconciliation:
     *    Margin (Invoice Side) = sum(invoices.agency_service_fee) - sum(employer statutory costs from payroll_run_items)
     *    Margin (Payroll Side)  = sum(independently calculated service fee) - sum(employer statutory costs from payroll_run_items)
     *    These MUST match — if the invoiced service fee diverged from the client's contract terms,
     *    this will catch it.
     *
     * @return array{reconciled: bool, details: array}
     */
    public function reconcileMargin(PayrollRun $payrollRun): array
    {
        $client = Client::findOrFail($payrollRun->client_id);

        // Determine the target run ID for invoice lookup (same logic as InvoiceGenerationService)
        $targetRunId = $payrollRun->is_supplementary_run
            ? $payrollRun->parent_run_id
            : $payrollRun->id;

        // ── Collect all run IDs that feed into this invoice set ──
        // If this is a parent run, include itself and all its supplementary children
        // If this is a supplementary run, we reconcile just this run's contribution
        $runIds = [$payrollRun->id];

        // ── VALUE 1 (Invoice Side): sum of all invoice_line_items.line_total ──
        $invoiceIds = Invoice::where('payroll_run_id', $targetRunId)->pluck('id');
        $invoiceLineTotal = (float) InvoiceLineItem::whereIn('invoice_id', $invoiceIds)->sum('line_total');
        $invoiceServiceFee = (float) Invoice::where('payroll_run_id', $targetRunId)->sum('agency_service_fee');

        // ── VALUE 2 (Payroll Side): independently computed from raw payroll data + client contract ──
        $payrollItems = DB::table('payroll_run_items')
            ->whereIn('payroll_run_id', $runIds)
            ->where('is_excluded', false)
            ->get();

        $payrollGrossTotal = 0;
        $payrollExpectedServiceFee = 0;
        $payrollEmployerStatutory = 0;

        foreach ($payrollItems as $item) {
            $itemGross = (float) $item->gross_total;
            $payrollGrossTotal += $itemGross;

            // Independently compute the expected service fee from client contract terms
            $expectedFee = $this->calculateExpectedFee($client, $itemGross);
            $payrollExpectedServiceFee += $expectedFee;

            // Sum employer statutory costs
            $payrollEmployerStatutory += (float) $item->employer_pf
                + (float) $item->employer_esi
                + (float) ($item->employer_lwf ?? 0);
        }

        $payrollGrossTotal = round($payrollGrossTotal, 2);
        $payrollExpectedServiceFee = round($payrollExpectedServiceFee, 2);
        $payrollEmployerStatutory = round($payrollEmployerStatutory, 2);

        // ── CHECK A: Invoice Line Total vs Payroll + Expected Fee ──
        $payrollSideLineTotal = round($payrollGrossTotal + $payrollExpectedServiceFee, 2);
        $checkA = abs($invoiceLineTotal - $payrollSideLineTotal) < 0.02;

        // ── CHECK B: Agency Margin Invoice Side vs Payroll Side ──
        $marginInvoiceSide = round($invoiceServiceFee - $payrollEmployerStatutory, 2);
        $marginPayrollSide = round($payrollExpectedServiceFee - $payrollEmployerStatutory, 2);
        $checkB = abs($marginInvoiceSide - $marginPayrollSide) < 0.02;

        $reconciled = $checkA && $checkB;

        $details = [
            'check_a' => [
                'label' => 'Invoice Line Total Reconciliation',
                'invoice_side_line_total' => $invoiceLineTotal,
                'payroll_side_line_total' => $payrollSideLineTotal,
                'payroll_gross' => $payrollGrossTotal,
                'payroll_expected_service_fee' => $payrollExpectedServiceFee,
                'passed' => $checkA,
            ],
            'check_b' => [
                'label' => 'Agency Margin Reconciliation',
                'margin_invoice_side' => $marginInvoiceSide,
                'margin_payroll_side' => $marginPayrollSide,
                'invoice_service_fee' => $invoiceServiceFee,
                'payroll_employer_statutory' => $payrollEmployerStatutory,
                'passed' => $checkB,
            ],
            'reconciled' => $reconciled,
        ];

        if (!$reconciled) {
            \Illuminate\Support\Facades\Log::warning(
                'Margin reconciliation FAILED for PayrollRun #' . $payrollRun->id,
                $details
            );
        }

        return $details;
    }

    /**
     * Independently calculate the expected agency fee for one payroll item
     * based solely on the client's contract/billing model.
     */
    private function calculateExpectedFee(Client $client, float $itemGross): float
    {
        return match ($client->billing_model) {
            'markup' => $itemGross * ((float) ($client->markup_percentage ?? 0) / 100),
            'fixed_per_candidate' => (float) ($client->fixed_fee_amount ?? 0),
            'fixed_per_month' => (float) ($client->fixed_fee_amount ?? 0),
            default => 0,
        };
    }
}
