<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;
use App\Models\Invoice;
use App\Models\InvoiceAdditionalFee;
use App\Services\InvoicePdfService;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Mail;
use App\Mail\ClientInvoiceMail;
use App\Services\AuditService;

class InvoiceController extends Controller
{
    public function __construct(protected InvoicePdfService $pdfService) {}

    /**
     * Display a listing of client invoices.
     */
    public function index(Request $request)
    {
        $user = $request->user();

        $query = Invoice::with(['client', 'branch', 'additionalFees', 'sentBy'])
            ->orderBy('id', 'desc');

        if ($user && $user->role === 'manager') {
            $query->whereIn('client_id', $user->getManagedClientIds());
        }

        if ($search = $request->input('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('invoice_number', 'like', "%{$search}%")
                  ->orWhereHas('client', function ($cq) use ($search) {
                      $cq->where('company_name', 'like', "%{$search}%");
                  });
            });
        }

        if ($status = $request->input('status')) {
            $query->where('status', $status);
        }

        $invoices = $query->paginate(15)->withQueryString();

        return Inertia::render('Invoicing/InvoicesList', [
            'invoices' => $invoices,
            'filters' => $request->only(['search', 'status']),
        ]);
    }

    /**
     * Show single invoice details page with backend paginated line items (limit 15).
     */
    public function show(Request $request, $id)
    {
        $invoice = Invoice::with([
            'client.contacts',
            'branch',
            'additionalFees',
            'sentBy'
        ])->findOrFail($id);

        $lineItems = $invoice->lineItems()
            ->with('employee')
            ->paginate(15)
            ->withQueryString();

        $targetRunId = $invoice->payroll_run_id;
        if ($targetRunId && $lineItems->count() > 0) {
            $empIds = collect($lineItems->items())->pluck('employee_id')->filter();
            $runItems = \Illuminate\Support\Facades\DB::table('payroll_run_items')
                ->where('payroll_run_id', $targetRunId)
                ->whereIn('employee_id', $empIds)
                ->get()
                ->keyBy('employee_id');

            $lineItems->through(function ($item) use ($runItems) {
                $ri = $runItems->get($item->employee_id);
                if ($ri) {
                    $item->actual_gross = (float) $ri->gross_total;
                    $item->employer_pf = (float) $ri->employer_pf;
                    $item->employer_esi = (float) $ri->employer_esi;
                    $item->employer_lwf = (float) $ri->employer_lwf;
                    $item->employer_statutory_total = (float)$ri->employer_pf + (float)$ri->employer_esi + (float)$ri->employer_lwf;
                    $item->line_ctc = $item->actual_gross + $item->employer_statutory_total;
                } else {
                    $item->actual_gross = (float) $item->gross_pay;
                    $item->employer_pf = 0.00;
                    $item->employer_esi = 0.00;
                    $item->employer_lwf = 0.00;
                    $item->employer_statutory_total = 0.00;
                    $item->line_ctc = (float) $item->gross_pay;
                }
                return $item;
            });
        }

        return Inertia::render('Invoicing/InvoiceDetail', [
            'invoice' => $invoice,
            'lineItems' => $lineItems,
        ]);
    }

    /**
     * Download or stream Tax Invoice PDF.
     */
    public function downloadPdf($id)
    {
        $invoice = Invoice::with(['client', 'branch', 'lineItems.employee', 'additionalFees'])->findOrFail($id);

        $pdfBytes = $this->pdfService->generatePdfBinary($invoice);

        $filename = "Invoice_{$invoice->invoice_number}.pdf";

        return response($pdfBytes, 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'inline; filename="' . $filename . '"',
        ]);
    }

    /**
     * Finalize a DRAFT invoice.
     */
    public function finalize(Request $request, $id)
    {
        $invoice = Invoice::with(['client'])->findOrFail($id);

        try {
            $this->validatePoRequirements($invoice);
        } catch (\InvalidArgumentException $e) {
            if ($request->expectsJson() && !$request->header('X-Inertia')) {
                return response()->json(['error' => $e->getMessage()], 422);
            }
            return redirect()->back()->withErrors(['error' => $e->getMessage()]);
        }

        $invoice->update(['status' => 'finalized']);

        if ($request->expectsJson() && !$request->header('X-Inertia')) {
            return response()->json([
                'message' => 'Invoice finalized successfully.',
                'invoice' => $invoice->fresh(['client', 'branch']),
            ]);
        }

        return redirect()->back()->with('success', "Invoice {$invoice->invoice_number} finalized successfully.");
    }

    /**
     * Send Tax Invoice to Client Primary Contact via Email (Exact 8-step sequence).
     */
    public function sendEmail(Request $request, $id)
    {
        $invoice = Invoice::with(['client.contacts', 'branch', 'lineItems', 'additionalFees'])->findOrFail($id);
        $client = $invoice->client;

        // 1. DRAFT-STATUS GUARD FIRST
        if ($invoice->status === 'draft') {
            $msg = 'Cannot send invoice in draft status. Invoice must be finalized or raised first.';
            if ($request->expectsJson() && !$request->header('X-Inertia')) {
                return response()->json(['error' => $msg], 422);
            }
            return redirect()->back()->withErrors(['error' => $msg]);
        }

        // 2. PO VALIDATION SECOND
        try {
            $this->validatePoRequirements($invoice);
        } catch (\InvalidArgumentException $e) {
            if ($request->expectsJson() && !$request->header('X-Inertia')) {
                return response()->json(['error' => $e->getMessage()], 422);
            }
            return redirect()->back()->withErrors(['error' => $e->getMessage()]);
        }

        // 3. PRIMARY-CONTACT RESOLUTION THIRD
        $primaryContact = $client->contacts ? $client->contacts->first(function ($c) {
            return (bool)($c->is_primary_contact ?? false) || ($c->contact_type ?? null) === 'primary';
        }) : null;

        $primaryEmail = $primaryContact?->email ?: $client->primary_poc_email;

        if (empty($primaryEmail)) {
            $msg = "Cannot send invoice: Client '{$client->company_name}' has no primary contact email configured. Please add a primary contact with a valid email address first.";
            if ($request->expectsJson() && !$request->header('X-Inertia')) {
                return response()->json(['error' => $msg], 422);
            }
            return redirect()->back()->withErrors(['error' => $msg]);
        }

        // CC Emails (contacts with cc_on_invoice == true)
        $ccEmails = $client->contacts
            ? $client->contacts
                ->filter(fn($c) => (bool)($c->cc_on_invoice ?? false) && !empty($c->email) && $c->email !== $primaryEmail)
                ->pluck('email')
                ->values()
                ->all()
            : [];

        // 4. GENERATE PDF
        $pdfBytes = $this->pdfService->generatePdfBinary($invoice);

        // 5. SEND EMAIL
        Mail::to($primaryEmail)
            ->cc($ccEmails)
            ->send(new ClientInvoiceMail($invoice, $pdfBytes));

        // 6. TRACK DELIVERY
        $now = now();
        $invoice->first_sent_at = $invoice->first_sent_at ?? $now;
        $invoice->sent_at = $now;
        $invoice->send_count = ((int)$invoice->send_count) + 1;
        $invoice->sent_by = Auth::id();
        $invoice->sent_to_email = $primaryEmail;
        $invoice->delivery_status = 'sent';
        if (in_array($invoice->status, ['draft', 'finalized'])) {
            $invoice->status = 'sent';
        }
        $invoice->save();

        // 7. IMMUTABLE AUDIT LOGGING
        app(AuditService::class)->log(
            'invoice_email_sent',
            Auth::user(),
            null,
            null,
            [
                'invoice_id' => $invoice->id,
                'invoice_number' => $invoice->invoice_number,
                'recipient' => $primaryEmail,
                'cc' => $ccEmails,
                'send_count' => $invoice->send_count,
                'sent_at' => $now->toDateTimeString(),
            ]
        );

        // 8. RETURN RESPONSE
        if ($request->expectsJson() && !$request->header('X-Inertia')) {
            return response()->json([
                'message' => "Invoice {$invoice->invoice_number} sent successfully to {$primaryEmail}.",
                'invoice' => $invoice->fresh(['client', 'branch', 'sentBy']),
            ]);
        }

        return redirect()->back()->with('success', "Invoice {$invoice->invoice_number} sent successfully to {$primaryEmail}.");
    }

    /**
     * Shared PO Validation Helper Method.
     */
    private function validatePoRequirements(Invoice $invoice): void
    {
        $client = $invoice->client;
        if (!$client) {
            return;
        }

        if ($client->contract_end_date && \Carbon\Carbon::parse($client->contract_end_date)->startOfDay()->isPast() && !(bool)$client->auto_renewal) {
            $formattedEnd = \Carbon\Carbon::parse($client->contract_end_date)->format('Y-m-d');
            throw new \InvalidArgumentException("Cannot process invoice: Client contract for '{$client->company_name}' expired on {$formattedEnd} and auto-renewal is disabled.");
        }

        if (!$client->po_required) {
            return;
        }

        if (empty($client->po_number)) {
            throw new \InvalidArgumentException("Cannot process invoice: Client '{$client->company_name}' requires a Purchase Order (PO) number.");
        }

        if ($client->po_validity_date && \Carbon\Carbon::parse($client->po_validity_date)->startOfDay()->isPast()) {
            $formattedDate = \Carbon\Carbon::parse($client->po_validity_date)->format('Y-m-d');
            throw new \InvalidArgumentException("Cannot process invoice: Purchase Order for client '{$client->company_name}' expired on {$formattedDate}.");
        }

        if ($client->po_value > 0) {
            $cumulativeBilled = Invoice::where('client_id', $client->id)
                ->whereIn('status', ['finalized', 'raised', 'paid', 'sent', 'overdue'])
                ->where('id', '!=', $invoice->id)
                ->sum('grand_total');

            $totalWithCurrent = round((float) $cumulativeBilled + (float) $invoice->grand_total, 2);

            if ($totalWithCurrent > (float) $client->po_value) {
                $formattedLimit = number_format((float)$client->po_value, 2);
                $formattedTotal = number_format($totalWithCurrent, 2);
                throw new \InvalidArgumentException("Cannot process invoice: Cumulative billed amount (₹{$formattedTotal}) exceeds PO budget limit of ₹{$formattedLimit}.");
            }
        }
    }

    /**
     * Store a new additional fee on a DRAFT invoice.
     */
    public function storeFee(Request $request, $id)
    {
        $invoice = Invoice::findOrFail($id);

        // Immutability Guard: Only DRAFT invoices permit adding fees
        if ($invoice->status !== 'draft') {
            if ($request->wantsJson()) {
                return response()->json(['error' => 'Cannot add or modify fees on a finalized or raised invoice.'], 403);
            }
            return redirect()->back()->withErrors(['error' => 'Cannot add or modify fees on a finalized or raised invoice.']);
        }

        $validated = $request->validate([
            'fee_type' => 'required|string|in:sourcing_fee,absorption_fee,other',
            'fee_name' => 'required|string|max:255',
            'amount' => 'required|numeric|min:0.01',
            'remarks' => 'nullable|string|max:1000',
        ]);

        $fee = $invoice->additionalFees()->create([
            'fee_type' => $validated['fee_type'],
            'fee_name' => $validated['fee_name'],
            'amount' => round((float) $validated['amount'], 2),
            'remarks' => $validated['remarks'] ?? null,
        ]);

        // Recalculate invoice stored totals & tax breakdown immediately
        $invoice->recalculateTotals();

        if ($request->wantsJson()) {
            return response()->json([
                'success' => 'Additional fee added successfully.',
                'fee' => $fee,
                'invoice' => $invoice->fresh(['client', 'branch', 'additionalFees']),
            ]);
        }

        return redirect()->back()->with('success', 'Additional fee added successfully.');
    }

    /**
     * Delete an additional fee from a DRAFT invoice.
     */
    public function destroyFee(Request $request, $id, $feeId)
    {
        $invoice = Invoice::findOrFail($id);

        // Immutability Guard: Only DRAFT invoices permit modifying fees
        if ($invoice->status !== 'draft') {
            if ($request->wantsJson()) {
                return response()->json(['error' => 'Cannot add or modify fees on a finalized or raised invoice.'], 403);
            }
            return redirect()->back()->withErrors(['error' => 'Cannot add or modify fees on a finalized or raised invoice.']);
        }

        $fee = InvoiceAdditionalFee::where('invoice_id', $invoice->id)->where('id', $feeId)->firstOrFail();
        $fee->delete();

        // Recalculate invoice stored totals & tax breakdown immediately
        $invoice->recalculateTotals();

        if ($request->wantsJson()) {
            return response()->json([
                'success' => 'Additional fee deleted successfully.',
                'invoice' => $invoice->fresh(['client', 'branch', 'additionalFees']),
            ]);
        }

        return redirect()->back()->with('success', 'Additional fee deleted successfully.');
    }
}
