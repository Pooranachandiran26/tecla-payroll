<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Form B - Register of Wages</title>
    <style>
        body { font-family: DejaVu Sans, sans-serif; font-size: 9.5px; color: #1e293b; margin: 0; padding: 20px; }
        .title { text-align: center; font-size: 15px; font-weight: bold; text-transform: uppercase; margin-bottom: 2px; }
        .subtitle { text-align: center; font-size: 10px; margin-bottom: 2px; }
        .rule-ref { text-align: center; font-size: 9px; color: #475569; margin-bottom: 14px; }
        .estab-table { width: 100%; border: 1px solid #94a3b8; border-collapse: collapse; margin-bottom: 14px; }
        .estab-table td { padding: 5px 8px; border: 1px solid #94a3b8; font-size: 9px; }
        .estab-label { width: 28%; font-weight: bold; background-color: #f1f5f9; }
        .section-title { font-size: 10px; font-weight: bold; color: #1F3864; margin: 4px 0 6px; text-transform: uppercase; }
        .stat-table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
        .stat-table th { background-color: #1F3864; color: #fff; font-weight: bold; padding: 5px 4px; text-align: left; border: 1px solid #1F3864; font-size: 8px; }
        .stat-table td { padding: 6px 4px; border: 1px solid #cbd5e1; font-size: 9.5px; text-align: center; }
        .support-table { width: 100%; border-collapse: collapse; margin-bottom: 6px; font-size: 9px; }
        .support-table td { padding: 3px 5px; border-bottom: 1px solid #E2E8F0; }
        .support-total td { font-weight: bold; background-color: #F8FAFC; }
        .text-right { text-align: right; }
        .footer-table { width: 100%; margin-top: 30px; font-size: 9.5px; }
        .footer-table td { padding-top: 20px; vertical-align: bottom; }
        .sign-line { border-top: 1px solid #1e293b; padding-top: 4px; width: 220px; }
        .disclaimer { margin-top: 16px; font-size: 7.8px; color: #64748b; border-top: 1px dashed #cbd5e1; padding-top: 6px; }
    </style>
</head>
<body>

    <div class="title">Form B</div>
    <div class="subtitle">Register of Wages</div>
    <div class="rule-ref">(See Rule 29, Tamil Nadu Labour Welfare Fund Rules, 1973)</div>
    <div class="subtitle" style="margin-bottom: 14px;">For the Month of {{ $data['period_label'] }}</div>

    <table class="estab-table">
        <tr>
            <td class="estab-label">Name of Establishment</td>
            <td>{{ $data['establishment']['name'] }}</td>
        </tr>
        <tr>
            <td class="estab-label">Address</td>
            <td>{{ $data['establishment']['address'] ?: 'Not on file' }}</td>
        </tr>
        <tr>
            <td class="estab-label">Registration Number (LWF)</td>
            <td>{{ $data['establishment']['registration_number'] }}</td>
        </tr>
        <tr>
            <td class="estab-label">State</td>
            <td>{{ $data['establishment']['state'] }}</td>
        </tr>
    </table>

    <div class="section-title">Statutory Register of Wages — Form B official columns (Rule 29)</div>
    <table class="stat-table">
        <thead>
            <tr>
                <th style="width: 12%;">(1) Total Number of Employees</th>
                <th style="width: 24%;">(2) Total Emoluments Payable during the month, including Basic Wages, D.A., O.T., Bonus</th>
                <th style="width: 13%;">(3a) Fine</th>
                <th style="width: 15%;">(3b) Other Deductions</th>
                <th style="width: 18%;">(4) Amount Actually Paid during the Month</th>
                <th style="width: 18%;">(5) Balance Due to the Employees</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td>{{ number_format($data['employee_count']) }}</td>
                <td>{{ number_format($data['emoluments']['total'], 2) }}</td>
                <td>
                    @if($data['deductions']['fine_available'])
                        {{ number_format($data['deductions']['fine'], 2) }}
                    @else
                        —
                    @endif
                </td>
                <td>{{ number_format($data['deductions']['other_deductions'], 2) }}</td>
                <td>{{ number_format($data['amount_actually_paid'], 2) }}</td>
                <td>{{ number_format($data['balance_due'], 2) }}</td>
            </tr>
        </tbody>
    </table>

    <div class="section-title" style="margin-top: 14px;">Supporting Calculation (TECLA detail — not part of the official Form B columns)</div>
    <table class="support-table">
        <tr>
            <td style="width: 65%;">Basic Wages</td>
            <td class="text-right">{{ number_format($data['emoluments']['basic_wages'], 2) }}</td>
        </tr>
        <tr>
            <td>Dearness Allowance (D.A.)</td>
            <td class="text-right">{{ number_format($data['emoluments']['da'], 2) }}</td>
        </tr>
        <tr>
            <td>Overtime Wages (O.T.)</td>
            <td class="text-right">
                @if($data['emoluments']['ot_available'])
                    {{ number_format($data['emoluments']['ot'], 2) }}
                @else
                    —
                @endif
            </td>
        </tr>
        <tr>
            <td>Bonus</td>
            <td class="text-right">
                @if($data['emoluments']['bonus_available'])
                    {{ number_format($data['emoluments']['bonus'], 2) }}
                @else
                    —
                @endif
            </td>
        </tr>
        <tr>
            <td>Other Wage Components (HRA, Conveyance, Medical &amp; Special Allowances)</td>
            <td class="text-right">{{ number_format($data['emoluments']['other_wage_components'], 2) }}</td>
        </tr>
        <tr class="support-total">
            <td>= Total Emoluments Payable (matches column 2 above)</td>
            <td class="text-right">{{ number_format($data['emoluments']['total'], 2) }}</td>
        </tr>
    </table>

    <table class="support-table" style="margin-top: 8px;">
        <tr>
            <td style="width: 65%;">Fine</td>
            <td class="text-right">
                @if($data['deductions']['fine_available'])
                    {{ number_format($data['deductions']['fine'], 2) }}
                @else
                    —
                @endif
            </td>
        </tr>
        <tr>
            <td>Other Deductions (PF, ESI, PT, LWF, TDS, Loan EMI)</td>
            <td class="text-right">{{ number_format($data['deductions']['other_deductions'], 2) }}</td>
        </tr>
        <tr class="support-total">
            <td>= Total Deductions, excludes Fine (matches column 3b above)</td>
            <td class="text-right">{{ number_format($data['deductions']['total'], 2) }}</td>
        </tr>
    </table>

    <table class="footer-table">
        <tr>
            <td style="width: 33%;">
                <div class="sign-line">Place</div>
            </td>
            <td style="width: 33%;">
                <div class="sign-line">Date</div>
            </td>
            <td style="width: 34%;">
                <div class="sign-line">Signature of Employer / Authorised Signatory</div>
            </td>
        </tr>
    </table>

    <div class="disclaimer">
        This is a system-generated register based on the locked payroll run for {{ $data['period_label'] }} (locked on {{ $data['locked_on'] }}).
        {{ $data['form_layout_note'] }}
        "Amount Actually Paid" reflects the locked payroll net pay figure. TECLA does not currently track bank payment confirmation
        (payment status, UTR, or transaction reference) for employee salary disbursement.
    </div>

</body>
</html>
