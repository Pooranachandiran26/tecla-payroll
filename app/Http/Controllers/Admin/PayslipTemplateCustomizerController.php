<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Inertia\Inertia;
use App\Models\Client;
use Illuminate\Support\Facades\Storage;

class PayslipTemplateCustomizerController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        if (!in_array($user->role, ['admin', 'manager'])) {
            abort(403, 'Unauthorized access.');
        }

        if ($user->role === 'manager' && !$user->hasModulePermission('admin_payslip_templates')) {
            abort(403, 'You do not have permission to access the Payslip Templates Customizer.');
        }

        $clientsQuery = Client::where('status', 'active');
        if ($user->role === 'manager') {
            $managedIds = $user->getManagedClientIds();
            $clientsQuery->whereIn('id', $managedIds);
        }

        $clients = $clientsQuery
            ->select('id', 'company_name', 'client_code', 'payslip_template', 'payslip_visible_sections', 'logo_path', 'accent_color')
            ->get();

        $selectedClientId = $request->query('client_id');
        if ($user->role === 'manager' && $selectedClientId && !$user->isManagerForClient($selectedClientId)) {
            abort(403, 'You are not authorized to view or configure payslip templates for this client.');
        }

        $selectedClientId = $selectedClientId ?: $clients->first()?->id;
        $selectedClient = Client::find($selectedClientId) ?: $clients->first();

        $hasNoTemplate = $selectedClient && empty($selectedClient->payslip_template);
        if ($hasNoTemplate) {
            session()->flash('warning', "⚠️ No payslip template configured for {$selectedClient->company_name}. Please select a template below and click Save Configuration.");
        }

        return Inertia::render('Admin/PayslipTemplateCustomizer', [
            'clients' => $clients,
            'selectedClient' => $selectedClient,
            'hasNoTemplate' => $hasNoTemplate,
            'templates' => [
                ['key' => 'standard', 'name' => 'Standard Template', 'description' => 'Corporate standard 2-column table layout with navy accent bar.'],
                ['key' => 'elegant', 'name' => 'Elegant Template', 'description' => 'Clean top card header with Net Pay highlight box on top-right.'],
                ['key' => 'mini', 'name' => 'Mini Template', 'description' => 'Compact high-density single-page printable layout.'],
                ['key' => 'simple', 'name' => 'Simple Template', 'description' => 'Minimalist clean design with subtle border lines and serif accent.'],
                ['key' => 'lite', 'name' => 'Lite Template', 'description' => 'Streamlined modern layout with sky-blue highlight badges.'],
                ['key' => 'spreadsheet', 'name' => 'Spreadsheet Template', 'description' => 'Grid-heavy tabular format mimicking an Excel statement.'],
                ['key' => 'corporate', 'name' => 'Corporate Executive', 'description' => 'Premium executive navy banner with gold accent highlights.'],
                ['key' => 'tech_modern', 'name' => 'Tech Modern', 'description' => 'Tech startup style with indigo rounded badges.'],
                ['key' => 'modern_dark', 'name' => 'Modern Dark Header', 'description' => 'High-contrast dark header block with crisp typography.'],
                ['key' => 'classic_formal', 'name' => 'Classic Formal', 'description' => 'Traditional accounting structure with formal double-underlines.'],
            ]
        ]);
    }

    public function previewHtml(Request $request)
    {
        $user = $request->user();
        if (!$user || ($user->role !== 'admin' && $user->role !== 'manager')) {
            abort(403);
        }

        if ($user->role === 'manager' && !$user->hasModulePermission('admin_payslip_templates')) {
            abort(403, 'You do not have permission to access the Payslip Templates Customizer.');
        }

        $clientId = $request->query('client_id');
        if ($user->role === 'manager' && $clientId && !$user->isManagerForClient($clientId)) {
            abort(403, 'You are not authorized to view templates for this client.');
        }

        $templateKey = $request->query('template', 'standard');
        $clientId = $request->query('client_id');
        $client = Client::find($clientId);

        $savedSections = $client ? ($client->payslip_visible_sections ?: []) : [];

        $visibleSections = [
            'show_bank_details' => $request->has('show_bank_details') ? $request->query('show_bank_details') === '1' : ($savedSections['show_bank_details'] ?? true),
            'show_attendance_summary' => $request->has('show_attendance_summary') ? $request->query('show_attendance_summary') === '1' : ($savedSections['show_attendance_summary'] ?? true),
            'show_pf_details' => $request->has('show_pf_details') ? $request->query('show_pf_details') === '1' : ($savedSections['show_pf_details'] ?? true),
            'show_esi_details' => $request->has('show_esi_details') ? $request->query('show_esi_details') === '1' : ($savedSections['show_esi_details'] ?? true),
            'show_pt_details' => $request->has('show_pt_details') ? $request->query('show_pt_details') === '1' : ($savedSections['show_pt_details'] ?? true),
            'show_lwf_details' => $request->has('show_lwf_details') ? $request->query('show_lwf_details') === '1' : ($savedSections['show_lwf_details'] ?? true),
            'show_organisation_address' => $request->has('show_organisation_address') ? $request->query('show_organisation_address') === '1' : ($savedSections['show_organisation_address'] ?? true),
            'show_logo' => $request->has('show_logo') ? $request->query('show_logo') === '1' : ($savedSections['show_logo'] ?? true),
            'show_signature_details' => $request->has('show_signature_details') ? $request->query('show_signature_details') === '1' : ($savedSections['show_signature_details'] ?? true),
            'show_tds_deduction' => $request->has('show_tds_deduction') ? $request->query('show_tds_deduction') === '1' : ($savedSections['show_tds_deduction'] ?? true),
            'show_lop_deduction' => $request->has('show_lop_deduction') ? $request->query('show_lop_deduction') === '1' : ($savedSections['show_lop_deduction'] ?? true),
            'show_net_in_words' => $request->has('show_net_in_words') ? $request->query('show_net_in_words') === '1' : ($savedSections['show_net_in_words'] ?? true),
            'show_standard_salary' => $request->has('show_standard_salary') ? $request->query('show_standard_salary') === '1' : ($savedSections['show_standard_salary'] ?? true),
            'font_family' => $request->query('font_family', $savedSections['font_family'] ?? 'Helvetica Neue'),
            'font_size' => $request->query('font_size', $savedSections['font_size'] ?? 'normal'),
        ];

        $itemId = $request->query('item_id');
        $actualItem = $itemId ? \App\Models\PayrollRunItem::find($itemId) : null;
        $actualEmployee = $actualItem ? \App\Models\Employee::find($actualItem->employee_id) : null;
        $actualRun = $actualItem ? $actualItem->payrollRun : null;

        // Sample dummy item for live preview fallback
        $dummyItem = $actualItem ?: (object)[
            'paid_days' => 30.0,
            'lop_days' => 1.0,
            'standard_basic_pay' => 46500,
            'basic_pay' => 45000,
            'standard_hra' => 18600,
            'hra' => 18000,
            'standard_conveyance' => 2000,
            'conveyance' => 2000,
            'standard_da' => 0,
            'da' => 0,
            'standard_medical_allowance' => 1250,
            'medical_allowance' => 1250,
            'standard_special_allowance' => 9050,
            'special_allowance' => 8750,
            'other_additions' => 0,
            'standard_gross_total' => 77400,
            'gross_total' => 75000,
            'employee_pf' => 1800,
            'employee_esi' => 0,
            'professional_tax' => 200,
            'lwf_deduction' => 10,
            'tds_deduction' => 3500,
            'loan_emi_deduction' => 0,
            'lop_deduction' => 2400,
            'net_pay' => 67090,
            'is_correction' => false,
        ];

        $dummyEmployee = $actualEmployee ?: (object)[
            'employee_code' => 'DEMO-001',
            'full_name' => 'John Doe',
            'designation' => 'Senior Software Engineer',
            'bank_account_number' => '987654321098',
            'bank_name' => 'HDFC Bank Ltd',
            'bank_ifsc_code' => 'HDFC0001234',
            'uan_number' => '101234567890',
            'esi_number' => '31001234560001001',
        ];

        $pdfService = app(\App\Services\PayslipPdfService::class);
        $netPayWords = $pdfService->numberToEnglishWords((int)round((float)$dummyItem->net_pay));
        $formattedMonth = $actualRun ? \Carbon\Carbon::parse($actualRun->payroll_month)->format('F Y') : 'July 2026';

        $displayName = $client ? ($client->display_name_override ?: $client->company_name) : 'TECLA AGENCY PRIVATE LIMITED';
        $locationStr = implode(', ', array_filter([$client?->registered_city, $client?->registered_state])) ?: 'Mumbai, Maharashtra';
        $gstStr = $client?->gstin ? " | GST: {$client->gstin}" : '';
        $companyAddress = "{$locationStr}{$gstStr}";
        $logoUrl = $client ? $client->logo_path : null;

        $rawAccentColor = $request->query('accent_color');
        if (empty($rawAccentColor) || $rawAccentColor === 'undefined' || $rawAccentColor === 'null') {
            $accentColor = $client && $client->accent_color ? $client->accent_color : null;
        } else {
            $accentColor = $rawAccentColor;
        }

        return response()->view('pdf.payslip', [
            'item' => $dummyItem,
            'employee' => $dummyEmployee,
            'run' => $actualRun,
            'client' => $client,
            'templateKey' => $templateKey,
            'visibleSections' => $visibleSections,
            'displayName' => $displayName,
            'companyAddress' => $companyAddress,
            'accentColor' => $accentColor,
            'logoUrl' => $logoUrl,
            'midCycleNote' => null,
            'netPayWords' => $netPayWords,
            'formattedMonth' => $formattedMonth,
        ])->header('Content-Type', 'text/html');
    }

    public function update(Request $request, $clientId)
    {
        $user = $request->user();
        if (!in_array($user->role, ['admin', 'manager'])) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        if ($user->role === 'manager' && !$user->hasModulePermission('admin_payslip_templates')) {
            abort(403, 'You do not have permission to access the Payslip Templates Customizer.');
        }

        if ($user->role === 'manager' && !$user->isManagerForClient($clientId)) {
            abort(403, 'You are not authorized to configure payslip templates for this client.');
        }

        $client = Client::findOrFail($clientId);

        $validated = $request->validate([
            'payslip_template' => 'required|string',
            'payslip_visible_sections' => 'required|array',
            'accent_color' => 'nullable|string',
            'logo' => 'nullable|image|mimes:jpeg,png,jpg,svg|max:2048',
        ]);

        if ($request->hasFile('logo')) {
            if ($client->logo_path) {
                $oldPath = str_replace('/storage/', '', $client->logo_path);
                Storage::disk('public')->delete($oldPath);
            }
            $path = $request->file('logo')->store('client_logos', 'public');
            $validated['logo_path'] = Storage::disk('public')->url($path);
        }

        $client->update([
            'payslip_template' => $validated['payslip_template'],
            'payslip_visible_sections' => $validated['payslip_visible_sections'],
            'accent_color' => $validated['accent_color'] ?? $client->accent_color,
            'logo_path' => $validated['logo_path'] ?? $client->logo_path,
        ]);

        return redirect()->back()->with('success', 'Payslip design & section preferences updated successfully.');
    }
}
