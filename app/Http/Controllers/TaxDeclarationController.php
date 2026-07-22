<?php

namespace App\Http\Controllers;

use App\Models\Employee;
use App\Models\EmployeeTaxDeclaration;
use App\Services\TdsCalculationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class TaxDeclarationController extends Controller
{
    protected $tdsService;

    public function __construct(TdsCalculationService $tdsService)
    {
        $this->tdsService = $tdsService;
    }

    /**
     * Show or return tax declaration data for an employee.
     */
    public function show($id, Request $request)
    {
        $employee = Employee::findOrFail($id);

        $user = Auth::user();
        if ($user && !in_array($user->role, ['admin', 'manager']) && (int)$user->employee_id !== (int)$employee->id) {
            abort(403, 'Unauthorized action.');
        }

        $targetDate = $request->query('date', now()->toDateString());
        $fy = $this->tdsService->determineFinancialYear($targetDate);

        $declaration = EmployeeTaxDeclaration::where('employee_id', $employee->id)
            ->where('financial_year', $fy)
            ->first();

        $newRegimeTax = $this->tdsService->calculateAnnualTax($employee, $fy, $declaration ? clone $declaration : null);
        
        // Generate comparison for Old Regime even if current declaration is New Regime
        $tempOldDec = $declaration ? clone $declaration : new EmployeeTaxDeclaration(['regime' => 'old']);
        $tempOldDec->regime = 'old';
        $oldRegimeTax = $this->tdsService->calculateAnnualTax($employee, $fy, $tempOldDec);

        return response()->json([
            'employee_id' => $employee->id,
            'financial_year' => $fy,
            'declaration' => $declaration,
            'comparison' => [
                'new_regime' => $newRegimeTax,
                'old_regime' => $oldRegimeTax,
                'recommended_regime' => ($newRegimeTax['net_tax_payable'] <= $oldRegimeTax['net_tax_payable']) ? 'new' : 'old',
                'annual_tax_savings' => abs($newRegimeTax['net_tax_payable'] - $oldRegimeTax['net_tax_payable']),
            ]
        ]);
    }

    /**
     * Store or update an employee tax declaration.
     */
    public function store(Request $request, $id)
    {
        $employee = Employee::findOrFail($id);

        $user = Auth::user();
        if (!in_array($user->role, ['admin', 'manager']) && (int)$user->employee_id !== (int)$employee->id) {
            abort(403, 'Unauthorized action.');
        }

        $fy = $this->tdsService->determineFinancialYear(now()->toDateString());

        $annualRent = (float)($request->input('monthly_rent_paid', 0)) * 12;

        $rules = [
            'regime' => 'required|in:new,old',
            'monthly_rent_paid' => 'nullable|numeric|min:0',
            'landlord_name' => 'nullable|string|max:255',
            'landlord_pan' => $annualRent > 100000 
                ? ['required', 'string', 'regex:/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/i'] 
                : 'nullable|string|max:10',
            'landlord_address' => 'nullable|string|max:500',
            'is_metro_city' => 'nullable|boolean',
            'ppf_amount' => 'nullable|numeric|min:0',
            'elss_amount' => 'nullable|numeric|min:0',
            'life_insurance_premium' => 'nullable|numeric|min:0',
            'tuition_fees' => 'nullable|numeric|min:0',
            'nsc_amount' => 'nullable|numeric|min:0',
            'housing_loan_principal' => 'nullable|numeric|min:0',
            'other_80c' => 'nullable|numeric|min:0',
            'health_insurance_self' => 'nullable|numeric|min:0',
            'health_insurance_parents' => 'nullable|numeric|min:0',
            'is_parents_senior' => 'nullable|boolean',
            'home_loan_interest_self' => 'nullable|numeric|min:0',
            'section_80e_education_loan' => 'nullable|numeric|min:0',
            'section_80g_donations' => 'nullable|numeric|min:0',
            'other_exemptions' => 'nullable|numeric|min:0',
            'previous_employer_gross' => 'nullable|numeric|min:0',
            'previous_employer_tds' => 'nullable|numeric|min:0',
        ];

        $validated = $request->validate($rules);

        $declaration = EmployeeTaxDeclaration::updateOrCreate(
            [
                'employee_id' => $employee->id,
                'financial_year' => $fy,
            ],
            array_merge($validated, [
                'status' => 'submitted',
                'rejection_reason' => null,
            ])
        );

        // Update employee regime default if selected
        if (!empty($validated['regime'])) {
            $employee->update(['tds_regime' => $validated['regime']]);
        }

        return redirect()->back()->with('success', 'Tax declaration submitted successfully.');
    }

    /**
     * Admin/Manager action to verify or reject a tax declaration.
     */
    public function verify(Request $request, $id, $declarationId)
    {
        $employee = Employee::findOrFail($id);
        $declaration = EmployeeTaxDeclaration::where('employee_id', $employee->id)
            ->where('id', $declarationId)
            ->firstOrFail();

        $validated = $request->validate([
            'status' => 'required|in:verified,rejected',
            'rejection_reason' => 'required_if:status,rejected|nullable|string|max:500',
        ]);

        $declaration->update([
            'status' => $validated['status'],
            'rejection_reason' => $validated['status'] === 'rejected' ? $validated['rejection_reason'] : null,
            'verified_by' => Auth::id(),
            'verified_at' => now(),
        ]);

        $statusMsg = $validated['status'] === 'verified' ? 'verified' : 'rejected';
        return redirect()->back()->with('success', "Tax declaration {$statusMsg} successfully.");
    }
}
