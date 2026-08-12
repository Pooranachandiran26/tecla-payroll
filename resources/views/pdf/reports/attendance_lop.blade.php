<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Attendance & LOP Summary Report</title>
    <style>
        body { font-family: DejaVu Sans, sans-serif; font-size: 8.5px; color: #1e293b; margin: 0; padding: 12px; }
        .header-table { width: 100%; border-bottom: 2px solid #1F3864; padding-bottom: 8px; margin-bottom: 12px; }
        .company-name { font-size: 14px; font-weight: bold; color: #1F3864; text-transform: uppercase; }
        .report-title { font-size: 15px; font-weight: bold; color: #1F3864; text-align: right; text-transform: uppercase; }
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
                <div class="meta-text">Attendance & Loss of Pay Audit Register</div>
            </td>
            <td style="width: 50%;" class="text-right">
                <div class="report-title">Attendance & LOP Summary</div>
                <div class="meta-text">Generated On: {{ $generatedAt }} | Scope: {{ ucfirst($userRole) }}</div>
            </td>
        </tr>
    </table>

    <table class="kpi-table">
        <tr>
            <td class="kpi-card" style="width: 33%;">
                <div class="kpi-title">Total Paid Days</div>
                <div class="kpi-val" style="color: #166534;">{{ number_format($kpis['total_paid_days'], 1) }}</div>
            </td>
            <td class="kpi-card" style="width: 33%;">
                <div class="kpi-title">Total LOP Days</div>
                <div class="kpi-val" style="color: #991b1b;">{{ number_format($kpis['total_lop_days'], 1) }}</div>
            </td>
            <td class="kpi-card" style="width: 33%;">
                <div class="kpi-title">Total LOP Deductions</div>
                <div class="kpi-val" style="color: #b45309;">₹{{ number_format($kpis['total_lop_deduction'], 2) }}</div>
            </td>
        </tr>
    </table>

    <table class="data-table">
        <thead>
            <tr>
                <th>Month</th>
                <th>Client</th>
                <th>Code</th>
                <th>Employee Name</th>
                <th class="text-center">Paid Days</th>
                <th class="text-center">LOP Days</th>
                <th class="text-right">Basic Pay (₹)</th>
                <th class="text-right">LOP Deduction (₹)</th>
                <th class="text-right">Net Pay (₹)</th>
                <th>Source</th>
            </tr>
        </thead>
        <tbody>
            @foreach($rows as $r)
            <tr>
                <td>{{ $r['payroll_month'] }}</td>
                <td>{{ $r['client_name'] }}</td>
                <td>{{ $r['employee_code'] }}</td>
                <td><strong>{{ $r['employee_name'] }}</strong></td>
                <td class="text-center">{{ number_format((float)$r['paid_days'], 1) }}</td>
                <td class="text-center">
                    @if($r['lop_days'] > 0)
                        <strong style="color: #991b1b;">{{ number_format((float)$r['lop_days'], 1) }}</strong>
                    @else
                        0
                    @endif
                </td>
                <td class="text-right">₹{{ number_format((float)$r['basic_pay'], 2) }}</td>
                <td class="text-right">₹{{ number_format((float)$r['lop_deduction'], 2) }}</td>
                <td class="text-right"><strong>₹{{ number_format((float)$r['net_pay'], 2) }}</strong></td>
                <td>{{ $r['attendance_source'] }}</td>
            </tr>
            @endforeach
        </tbody>
    </table>

</body>
</html>
