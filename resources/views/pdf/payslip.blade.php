<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Payslip - {{ $employee ? $employee->full_name : '' }} - {{ $formattedMonth }}</title>
    <style>
        body {
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
            font-size: 11px;
            color: #334155;
            margin: 0;
            padding: 15px;
        }
        .header-table {
            width: 100%;
            border-bottom: 2px solid {{ $accentColor }};
            padding-bottom: 8px;
            margin-bottom: 15px;
        }
        .company-name {
            font-size: 16px;
            font-weight: bold;
            color: {{ $accentColor }};
            text-transform: uppercase;
        }
        .company-address {
            font-size: 9px;
            color: #64748B;
        }
        .payslip-title {
            font-size: 16px;
            font-weight: bold;
            color: {{ $accentColor }};
            text-align: right;
            text-transform: uppercase;
        }
        .employee-info-table {
            width: 100%;
            background-color: #F8FAFC;
            border: 1px solid #E2E8F0;
            border-collapse: collapse;
            margin-bottom: 15px;
        }
        .employee-info-table td {
            padding: 6px 10px;
            font-size: 10px;
        }
        .meta-label {
            color: #64748B;
            font-weight: 500;
        }
        .meta-val {
            font-weight: bold;
            color: #0F172A;
        }
        .split-box {
            background-color: #FFFBEB;
            border: 1px solid #FDE68A;
            color: #92400E;
            padding: 6px 10px;
            font-weight: bold;
            font-size: 10px;
            margin-bottom: 12px;
            border-radius: 3px;
        }
        .components-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 15px;
        }
        .components-table th {
            background-color: {{ $accentColor }};
            color: #FFFFFF;
            padding: 6px;
            font-size: 10px;
            text-transform: uppercase;
        }
        .components-table td {
            border: 1px solid #E2E8F0;
            padding: 5px 8px;
            font-size: 10px;
        }
        .net-pay-box {
            background-color: {{ $accentColor }};
            color: #FFFFFF;
            padding: 10px 15px;
            margin-bottom: 15px;
            border-radius: 4px;
        }
        .net-amount {
            font-size: 15px;
            font-weight: bold;
            color: #FACC15;
        }
        .net-words {
            font-size: 10px;
            font-style: italic;
            text-align: right;
        }
        .footer-note {
            text-align: center;
            font-size: 9px;
            color: #94A3B8;
            margin-top: 20px;
            border-top: 1px solid #E2E8F0;
            padding-top: 8px;
        }
    </style>
</head>
<body>

    <table class="header-table">
        <tr>
            <td style="width: 70%;">
                <div class="company-name">{{ $displayName }}</div>
                <div class="company-address">{{ $companyAddress }}</div>
            </td>
            <td style="width: 30%; text-align: right;">
                <div class="payslip-title">Salary Payslip</div>
                <div style="font-size: 10px; color: #64748B;">{{ $formattedMonth }}</div>
            </td>
        </tr>
    </table>

    <table class="employee-info-table">
        <tr>
            <td style="width: 25%;" class="meta-label">Employee Code:</td>
            <td style="width: 25%;" class="meta-val">{{ $employee ? $employee->employee_code : '—' }}</td>
            <td style="width: 25%;" class="meta-label">Employee Name:</td>
            <td style="width: 25%;" class="meta-val">{{ $employee ? $employee->full_name : '—' }}</td>
        </tr>
        <tr>
            <td class="meta-label">Designation:</td>
            <td class="meta-val">{{ $employee ? ($employee->designation ?: 'Staff') : '—' }}</td>
            <td class="meta-label">Account No:</td>
            <td class="meta-val">{{ $employee ? ($employee->bank_account_number ?: '—') : '—' }}</td>
        </tr>
        <tr>
            <td class="meta-label">Bank Name:</td>
            <td class="meta-val">{{ $employee ? ($employee->bank_name ?: '—') : '—' }}</td>
            <td class="meta-label">Actual Paid Days:</td>
            <td class="meta-val">{{ number_format((float)$item->paid_days, 1) }}</td>
        </tr>
    </table>

    @if(!empty($item->is_correction))
    <div style="background-color: #EFF6FF; border: 1px solid #BFDBFE; color: #1E40AF; padding: 6px 10px; font-weight: bold; font-size: 10px; margin-bottom: 12px; border-radius: 3px;">
        📌 Payroll Adjustment / Correction: {{ $item->correction_reason }}
    </div>
    @endif

    @if($midCycleNote)
    <div class="split-box">
        ↳ {{ $midCycleNote }}
    </div>
    @endif

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
                            <td style="text-align: right; color: {{ $accentColor }};">{{ number_format((float)$item->gross_total, 2) }}</td>
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
                        <tr><td>Employee PF</td><td style="text-align: right;">{{ number_format((float)$item->employee_pf, 2) }}</td></tr>
                        <tr><td>Employee ESIC</td><td style="text-align: right;">{{ number_format((float)$item->employee_esi, 2) }}</td></tr>
                        <tr><td>Professional Tax</td><td style="text-align: right;">{{ number_format((float)$item->professional_tax, 2) }}</td></tr>
                        <tr><td>Welfare Fund (LWF)</td><td style="text-align: right;">{{ number_format((float)$item->lwf_deduction, 2) }}</td></tr>
                        <tr><td>TDS</td><td style="text-align: right;">{{ number_format((float)$item->tds_deduction, 2) }}</td></tr>
                        <tr><td>Loan EMI</td><td style="text-align: right;">{{ number_format((float)$item->loan_emi_deduction, 2) }}</td></tr>
                        <tr><td style="color: #64748B;">LOP Deduction (Informational)</td><td style="text-align: right; color: #64748B;">{{ number_format((float)$item->lop_deduction, 2) }}</td></tr>
                        <tr style="background-color: #FFF5F5; font-weight: bold;">
                            <td>Total Deductions</td>
                            <td style="text-align: right; color: #DC2626;">
                                {{ number_format(
                                    (float)$item->employee_pf +
                                    (float)$item->employee_esi +
                                    (float)$item->professional_tax +
                                    (float)$item->lwf_deduction +
                                    (float)$item->tds_deduction +
                                    (float)$item->loan_emi_deduction, 2)
                                }}
                            </td>
                        </tr>
                    </tbody>
                </table>
            </td>
        </tr>
    </table>

    <table class="net-pay-box" style="width: 100%;">
        <tr>
            <td style="width: 50%;" class="net-amount">
                Net Pay: ₹{{ number_format(round((float)$item->net_pay), 2) }}
            </td>
            <td style="width: 50%;" class="net-words">
                ({{ $netPayWords }})
            </td>
        </tr>
    </table>

    <div class="footer-note">
        This is a computer-generated Payslip. Signature is not required.
    </div>

</body>
</html>
