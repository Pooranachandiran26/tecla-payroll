<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;
use App\Models\Invoice;
use App\Models\InvoiceAdditionalFee;
use App\Services\InvoicePdfService;
use Illuminate\Support\Facades\Auth;

class InvoiceController extends Controller
{
    public function __construct(protected InvoicePdfService $pdfService) {}

    /**
     * Display a listing of client invoices.
     */
    public function index(Request $request)
    {
        $user = $request->user();

        $query = Invoice::with(['client', 'branch', 'additionalFees'])
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
                'invoice' => $invoice->fresh(['additionalFees']),
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
                'invoice' => $invoice->fresh(['additionalFees']),
            ]);
        }

        return redirect()->back()->with('success', 'Additional fee deleted successfully.');
    }
}
