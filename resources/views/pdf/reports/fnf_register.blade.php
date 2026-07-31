<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Full & Final Settlement (FnF) Audit Register</title>
    <style>
        body { font-family: DejaVu Sans, sans-serif; font-size: 8px; color: #1e293b; margin: 0; padding: 12px; }
        .header-table { width: 100%; border-bottom: 2px solid #1F3864; padding-bottom: 8px; margin-bottom: 12px; }
        .company-name { font-size: 14px; font-weight: bold; color: #1F3864; text-transform: uppercase; }
        .report-title { font-size: 14px; font-weight: bold; color: #334155; text-align: right; text-transform: uppercase; }
        .meta-text { font-size: 8px; color: #64748b; }
        .kpi-table { width: 100%; margin-bottom: 12px; border-spacing: 6px; }
        .kpi-card { background-color: #f8fafc; border: 1px solid #cbd5e1; padding: 6px; text-align: center; border-radius: 4px; }
        .kpi-title { font-size: 7.5px; font-weight: bold; color: #475569; text-transform: uppercase; }
        .kpi-val { font-size: 11px; font-weight: bold; color: #0f172a; margin-top: 2px; }
        .data-table { width: 100%; border-collapse: collapse; margin-bottom: 12px; font-size: 8px; }
        .data-table th { background-color: #1F3864; color: #ffffff; font-weight: bold; padding: 4px; text-align: left; border: 1px solid #1F3864; }
        .data-table td { padding: 4px; border: 1px solid #e2e8f0; }
        .data-table tr:nth-child(even) { background-color: #f8fafc; }
        .text-right { text-align: right; }
        .text-center { text-align: center; }
    </style>
</head>
<body>
    <table class="header-table">
        <tr>
            <td style="width: 50%;">
                <div class="company-name">Tecla Payroll Management System</div>
                <div class="meta-text">Full & Final Settlement Audit Register</div>
            </td>
            <td style="width: 50%;" class="text-right">
                <div class="report-title">FnF Register</div>
                <div class="meta-text">Generated On: {{ $generatedAt }}</div>
            </td>
        </tr>
    </table>

    <table class="kpi-table">
        <tr>
            <td class="kpi-card" style="width: 25%;">
                <div class="kpi-title">Total Settlements</div>
                <div class="kpi-val">{{ $kpis['total_settlements'] }}</div>
            </td>
            <td class="kpi-card" style="width: 25%;">
                <div class="kpi-title">Total Gratuity Disbursed</div>
                <div class="kpi-val">₹{{ number_format($kpis['total_gratuity'], 2) }}</div>
            </td>
            <td class="kpi-card" style="width: 25%;">
                <div class="kpi-title">Total Leave Encashment</div>
                <div class="kpi-val">₹{{ number_format($kpis['total_leave_enc'], 2) }}</div>
            </td>
            <td class="kpi-card" style="width: 25%;">
                <div class="kpi-title">Total Net Disbursement</div>
                <div class="kpi-val" style="color: #166534;">₹{{ number_format($kpis['total_net_disbursed'], 2) }}</div>
            </td>
        </tr>
    </table>

    <table class="data-table">
        <thead>
            <tr>
                <th>Emp Code</th>
                <th>Employee Name</th>
                <th>Client Partner</th>
                <th>Last Working Day</th>
                <th>Exit Type</th>
                <th class="text-right">Notice (₹)</th>
                <th class="text-right">Leave Enc (₹)</th>
                <th class="text-right">Gratuity (₹)</th>
                <th class="text-right">Net Settlement (₹)</th>
                <th class="text-center">Status</th>
                <th>Bank Account</th>
            </tr>
        </thead>
        <tbody>
            @foreach($rows as $r)
            <tr>
                <td>{{ $r['employee_code'] }}</td>
                <td><strong>{{ $r['employee_name'] }}</strong></td>
                <td>{{ $r['client_name'] }}</td>
                <td>{{ $r['last_working_day'] }}</td>
                <td>{{ $r['exit_type'] }}</td>
                <td class="text-right">₹{{ number_format((float)$r['notice_amount'], 2) }}</td>
                <td class="text-right">₹{{ number_format((float)$r['leave_encashment_amount'], 2) }}</td>
                <td class="text-right">₹{{ number_format((float)$r['gratuity_amount'], 2) }}</td>
                <td class="text-right"><strong>₹{{ number_format((float)$r['net_settlement_amount'], 2) }}</strong></td>
                <td class="text-center">{{ $r['status'] }}</td>
                <td>{{ $r['bank_account_number'] }}</td>
            </tr>
            @endforeach
        </tbody>
    </table>
</body>
</html>
