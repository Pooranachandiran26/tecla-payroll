@php
    $totalDeductionsVal = (
        (($visibleSections['show_pf_details'] ?? true) ? (float)$item->employee_pf : 0) +
        (($visibleSections['show_esi_details'] ?? true) ? (float)$item->employee_esi : 0) +
        (($visibleSections['show_pt_details'] ?? true) ? (float)$item->professional_tax : 0) +
        (float)($item->pt_shortfall_recovery ?? 0) +
        (($visibleSections['show_lwf_details'] ?? true) ? (float)$item->lwf_deduction : 0) +
        (float)$item->tds_deduction +
        (float)$item->loan_emi_deduction
    );
    $useSingleTable = in_array(($templateKey ?? 'standard'), ['lite', 'simple', 'tech_modern', 'mini', 'spreadsheet']);
    $showStd = $visibleSections['show_standard_salary'] ?? true;
@endphp

@if($useSingleTable)
    {{-- Single Vertical Stacked Table Layout (Zoho / Modern Style) --}}
    <table class="components-table" style="width: 100%; border-collapse: collapse; margin-bottom: 15px;">
        <thead>
            <tr style="border-bottom: 2px solid {{ $accentColor }};">
                <th style="text-align: left; padding: 7px 10px;">EARNINGS</th>
                @if($showStd)
                <th style="text-align: right; padding: 7px 10px; width: 25%;">STANDARD (₹)</th>
                @endif
                <th style="text-align: right; padding: 7px 10px; width: 25%;">ACTUAL (₹)</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td>Basic Pay</td>
                @if($showStd)<td style="text-align: right; color: #64748b;">{{ number_format((float)($item->standard_basic_pay ?? $item->basic_pay), 2) }}</td>@endif
                <td style="text-align: right; font-weight: bold;">{{ number_format((float)$item->basic_pay, 2) }}</td>
            </tr>
            <tr>
                <td>House Rent Allowance (HRA)</td>
                @if($showStd)<td style="text-align: right; color: #64748b;">{{ number_format((float)($item->standard_hra ?? $item->hra), 2) }}</td>@endif
                <td style="text-align: right; font-weight: bold;">{{ number_format((float)$item->hra, 2) }}</td>
            </tr>
            <tr>
                <td>Conveyance Allowance</td>
                @if($showStd)<td style="text-align: right; color: #64748b;">{{ number_format((float)($item->standard_conveyance ?? $item->conveyance), 2) }}</td>@endif
                <td style="text-align: right; font-weight: bold;">{{ number_format((float)$item->conveyance, 2) }}</td>
            </tr>
            <tr>
                <td>Dearness Allowance (DA)</td>
                @if($showStd)<td style="text-align: right; color: #64748b;">{{ number_format((float)($item->standard_da ?? $item->da), 2) }}</td>@endif
                <td style="text-align: right; font-weight: bold;">{{ number_format((float)$item->da, 2) }}</td>
            </tr>
            <tr>
                <td>Medical Allowance</td>
                @if($showStd)<td style="text-align: right; color: #64748b;">{{ number_format((float)($item->standard_medical_allowance ?? $item->medical_allowance), 2) }}</td>@endif
                <td style="text-align: right; font-weight: bold;">{{ number_format((float)$item->medical_allowance, 2) }}</td>
            </tr>
            <tr>
                <td>Special Allowance</td>
                @if($showStd)<td style="text-align: right; color: #64748b;">{{ number_format((float)($item->standard_special_allowance ?? $item->special_allowance), 2) }}</td>@endif
                <td style="text-align: right; font-weight: bold;">{{ number_format((float)$item->special_allowance, 2) }}</td>
            </tr>
            <tr>
                <td>Arrears / Other Additions</td>
                @if($showStd)<td style="text-align: right; color: #64748b;">0.00</td>@endif
                <td style="text-align: right; font-weight: bold;">{{ number_format((float)$item->other_additions, 2) }}</td>
            </tr>
            <tr style="background-color: rgba(0,0,0,0.03); font-weight: bold; border-top: 1px solid #cbd5e1; border-bottom: 2px solid #cbd5e1;">
                <td>Gross Total Earnings</td>
                @if($showStd)<td style="text-align: right; color: #64748b;">{{ number_format((float)($item->standard_gross_total ?? $item->gross_total), 2) }}</td>@endif
                <td style="text-align: right; color: {{ $accentColor }};">{{ number_format((float)$item->gross_total, 2) }}</td>
            </tr>
        </tbody>
    </table>

    <table class="components-table" style="width: 100%; border-collapse: collapse; margin-bottom: 15px;">
        <thead>
            <tr style="border-bottom: 2px solid #dc2626;">
                <th style="text-align: left; padding: 7px 10px; color: #dc2626;">DEDUCTIONS</th>
                <th style="text-align: right; padding: 7px 10px; width: 25%; color: #dc2626;">(-) AMOUNT (₹)</th>
                @if($showStd)
                <th style="text-align: right; padding: 7px 10px; width: 25%; color: #dc2626;">STATUTORY REF</th>
                @endif
            </tr>
        </thead>
        <tbody>
            @if($visibleSections['show_pf_details'] ?? true)
            <tr><td>Employee PF</td><td style="text-align: right; font-weight: bold;">{{ number_format((float)$item->employee_pf, 2) }}</td>@if($showStd)<td style="text-align: right; color: #64748b;">EPFO</td>@endif</tr>
            @endif
            @if($visibleSections['show_esi_details'] ?? true)
            <tr><td>Employee ESIC</td><td style="text-align: right; font-weight: bold;">{{ number_format((float)$item->employee_esi, 2) }}</td>@if($showStd)<td style="text-align: right; color: #64748b;">ESIC</td>@endif</tr>
            @endif
            @if($visibleSections['show_pt_details'] ?? true)
            <tr><td>Professional Tax</td><td style="text-align: right; font-weight: bold;">{{ number_format((float)$item->professional_tax, 2) }}</td>@if($showStd)<td style="text-align: right; color: #64748b;">P-Tax</td>@endif</tr>
            @endif
            @if((float)($item->pt_shortfall_recovery ?? 0) > 0)
            <tr><td>PT Shortfall Recovery</td><td style="text-align: right; font-weight: bold;">{{ number_format((float)$item->pt_shortfall_recovery, 2) }}</td>@if($showStd)<td style="text-align: right; color: #64748b;">H1/H2 PT</td>@endif</tr>
            @endif
            @if($visibleSections['show_lwf_details'] ?? true)
            <tr><td>Labour Welfare Fund (LWF)</td><td style="text-align: right; font-weight: bold;">{{ number_format((float)$item->lwf_deduction, 2) }}</td>@if($showStd)<td style="text-align: right; color: #64748b;">LWF</td>@endif</tr>
            @endif
            @if($visibleSections['show_tds_deduction'] ?? true)
            <tr><td>TDS (Income Tax)</td><td style="text-align: right; font-weight: bold;">{{ number_format((float)$item->tds_deduction, 2) }}</td>@if($showStd)<td style="text-align: right; color: #64748b;">IT Dept</td>@endif</tr>
            @endif
            <tr><td>Loan EMI</td><td style="text-align: right; font-weight: bold;">{{ number_format((float)$item->loan_emi_deduction, 2) }}</td>@if($showStd)<td style="text-align: right; color: #64748b;">Advance</td>@endif</tr>
            @if($visibleSections['show_lop_deduction'] ?? true)
            <tr><td style="color: #64748b;">LOP Deduction (Informational)</td><td style="text-align: right; color: #64748b;">{{ number_format((float)$item->lop_deduction, 2) }}</td>@if($showStd)<td style="text-align: right; color: #64748b;">Loss of Pay</td>@endif</tr>
            @endif
            <tr style="background-color: #fff5f5; font-weight: bold; border-top: 1px solid #fecaca; border-bottom: 2px solid #fca5a5;">
                <td style="color: #dc2626;">Total Deductions</td>
                <td style="text-align: right; color: #dc2626;">{{ number_format($totalDeductionsVal, 2) }}</td>
                @if($showStd)<td style="text-align: right; color: #dc2626;">Deductions Sum</td>@endif
            </tr>
        </tbody>
    </table>

@else
    {{-- Side-by-Side 2-Column Split Table Layout --}}
    <table style="width: 100%;" cellspacing="0" cellpadding="0">
        <tr>
            <td style="width: {{ $showStd ? '55%' : '49%' }}; vertical-align: top;">
                <table class="components-table">
                    <thead>
                        <tr>
                            <th style="text-align: left;">Earnings</th>
                            @if($showStd)
                            <th style="text-align: right; width: 28%;">Standard (₹)</th>
                            @endif
                            <th style="text-align: right; width: 28%;">Actual (₹)</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>Basic Pay</td>
                            @if($showStd)<td style="text-align: right; color: #64748b;">{{ number_format((float)($item->standard_basic_pay ?? $item->basic_pay), 2) }}</td>@endif
                            <td style="text-align: right; font-weight: bold;">{{ number_format((float)$item->basic_pay, 2) }}</td>
                        </tr>
                        <tr>
                            <td>HRA</td>
                            @if($showStd)<td style="text-align: right; color: #64748b;">{{ number_format((float)($item->standard_hra ?? $item->hra), 2) }}</td>@endif
                            <td style="text-align: right; font-weight: bold;">{{ number_format((float)$item->hra, 2) }}</td>
                        </tr>
                        <tr>
                            <td>Conveyance</td>
                            @if($showStd)<td style="text-align: right; color: #64748b;">{{ number_format((float)($item->standard_conveyance ?? $item->conveyance), 2) }}</td>@endif
                            <td style="text-align: right; font-weight: bold;">{{ number_format((float)$item->conveyance, 2) }}</td>
                        </tr>
                        <tr>
                            <td>DA</td>
                            @if($showStd)<td style="text-align: right; color: #64748b;">{{ number_format((float)($item->standard_da ?? $item->da), 2) }}</td>@endif
                            <td style="text-align: right; font-weight: bold;">{{ number_format((float)$item->da, 2) }}</td>
                        </tr>
                        <tr>
                            <td>Medical Allowance</td>
                            @if($showStd)<td style="text-align: right; color: #64748b;">{{ number_format((float)($item->standard_medical_allowance ?? $item->medical_allowance), 2) }}</td>@endif
                            <td style="text-align: right; font-weight: bold;">{{ number_format((float)$item->medical_allowance, 2) }}</td>
                        </tr>
                        <tr>
                            <td>Special Allowance</td>
                            @if($showStd)<td style="text-align: right; color: #64748b;">{{ number_format((float)($item->standard_special_allowance ?? $item->special_allowance), 2) }}</td>@endif
                            <td style="text-align: right; font-weight: bold;">{{ number_format((float)$item->special_allowance, 2) }}</td>
                        </tr>
                        <tr>
                            <td>Arrears / Other Additions</td>
                            @if($showStd)<td style="text-align: right; color: #64748b;">0.00</td>@endif
                            <td style="text-align: right; font-weight: bold;">{{ number_format((float)$item->other_additions, 2) }}</td>
                        </tr>
                        <tr style="background-color: #F1F5F9; font-weight: bold;">
                            <td>Gross Total</td>
                            @if($showStd)<td style="text-align: right; color: #64748b;">{{ number_format((float)($item->standard_gross_total ?? $item->gross_total), 2) }}</td>@endif
                            <td style="text-align: right; color: {{ $accentColor }};">{{ number_format((float)$item->gross_total, 2) }}</td>
                        </tr>
                    </tbody>
                </table>
            </td>
            <td style="width: 2%;"></td>
            <td style="width: 43%; vertical-align: top;">
                <table class="components-table">
                    <thead>
                        <tr>
                            <th style="text-align: left;">Deductions</th>
                            <th style="text-align: right;">Amount (₹)</th>
                        </tr>
                    </thead>
                    <tbody>
                        @if($visibleSections['show_pf_details'] ?? true)
                        <tr><td>Employee PF</td><td style="text-align: right;">{{ number_format((float)$item->employee_pf, 2) }}</td></tr>
                        @endif
                        @if($visibleSections['show_esi_details'] ?? true)
                        <tr><td>Employee ESIC</td><td style="text-align: right;">{{ number_format((float)$item->employee_esi, 2) }}</td></tr>
                        @endif
                        @if($visibleSections['show_pt_details'] ?? true)
                        <tr><td>Professional Tax</td><td style="text-align: right;">{{ number_format((float)$item->professional_tax, 2) }}</td></tr>
                        @endif
                        @if((float)($item->pt_shortfall_recovery ?? 0) > 0)
                        <tr><td>PT Shortfall Recovery</td><td style="text-align: right;">{{ number_format((float)$item->pt_shortfall_recovery, 2) }}</td></tr>
                        @endif
                        @if($visibleSections['show_lwf_details'] ?? true)
                        <tr><td>Labour Welfare Fund (LWF)</td><td style="text-align: right;">{{ number_format((float)$item->lwf_deduction, 2) }}</td></tr>
                        @endif
                        @if($visibleSections['show_tds_deduction'] ?? true)
                        <tr><td>TDS</td><td style="text-align: right;">{{ number_format((float)$item->tds_deduction, 2) }}</td></tr>
                        @endif
                        <tr><td>Loan EMI</td><td style="text-align: right;">{{ number_format((float)$item->loan_emi_deduction, 2) }}</td></tr>
                        @if($visibleSections['show_lop_deduction'] ?? true)
                        <tr><td style="color: #64748B;">LOP Deduction (Informational)</td><td style="text-align: right; color: #64748B;">{{ number_format((float)$item->lop_deduction, 2) }}</td></tr>
                        @endif
                        <tr style="background-color: #FFF5F5; font-weight: bold;">
                            <td>Total Deductions</td>
                            <td style="text-align: right; color: #DC2626;">{{ number_format($totalDeductionsVal, 2) }}</td>
                        </tr>
                    </tbody>
                </table>
            </td>
        </tr>
    </table>
@endif
