@php
    $totalDeductionsVal = (
        (($visibleSections['show_pf_details'] ?? true) ? (float)$item->employee_pf : 0) +
        (($visibleSections['show_esi_details'] ?? true) ? (float)$item->employee_esi : 0) +
        (($visibleSections['show_pt_details'] ?? true) ? (float)$item->professional_tax : 0) +
        (($visibleSections['show_lwf_details'] ?? true) ? (float)$item->lwf_deduction : 0) +
        (float)$item->tds_deduction +
        (float)$item->loan_emi_deduction
    );
@endphp

<table style="width: 100%;" cellspacing="0" cellpadding="0">
    <tr>
        <td style="width: 49%; vertical-align: top;">
            <table class="components-table">
                <thead>
                    <tr>
                        <th style="text-align: left;">Earnings</th>
                        <th style="text-align: right;">Amount (₹)</th>
                    </tr>
                </thead>
                <tbody>
                    <tr><td>Basic Pay</td><td style="text-align: right;">{{ number_format((float)$item->basic_pay, 2) }}</td></tr>
                    <tr><td>HRA</td><td style="text-align: right;">{{ number_format((float)$item->hra, 2) }}</td></tr>
                    <tr><td>Conveyance</td><td style="text-align: right;">{{ number_format((float)$item->conveyance, 2) }}</td></tr>
                    <tr><td>DA</td><td style="text-align: right;">{{ number_format((float)$item->da, 2) }}</td></tr>
                    <tr><td>Medical Allowance</td><td style="text-align: right;">{{ number_format((float)$item->medical_allowance, 2) }}</td></tr>
                    <tr><td>Special Allowance</td><td style="text-align: right;">{{ number_format((float)$item->special_allowance, 2) }}</td></tr>
                    <tr><td>Arrears / Other Additions</td><td style="text-align: right;">{{ number_format((float)$item->other_additions, 2) }}</td></tr>
                    <tr style="background-color: #F1F5F9; font-weight: bold;">
                        <td>Gross Total</td>
                        <td style="text-align: right; color: {{ $accentColor ?: '#1F3864' }};">{{ number_format((float)$item->gross_total, 2) }}</td>
                    </tr>
                </tbody>
            </table>
        </td>
        <td style="width: 2%;"></td>
        <td style="width: 49%; vertical-align: top;">
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
                    @if($visibleSections['show_lwf_details'] ?? true)
                    <tr><td>Welfare Fund (LWF)</td><td style="text-align: right;">{{ number_format((float)$item->lwf_deduction, 2) }}</td></tr>
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
