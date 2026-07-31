<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Statutory Deduction & Contribution Register</title>
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
                <div class="meta-text">Statutory Compliance & Tax Deduction Register</div>
            </td>
            <td style="width: 50%;" class="text-right">
                <div class="report-title">Statutory Summary Report</div>
                <div class="meta-text">Generated On: {{ $generatedAt }} | Scope: {{ ucfirst($userRole) }}</div>
            </td>
        </tr>
    </table>

    <table class="kpi-table">
        <tr>
            <td class="kpi-card" style="width: 33%;">
                <div class="kpi-title">Employee Deductions Total</div>
                <div class="kpi-val" style="color: #b45309;">₹{{ number_format($kpis['total_emp_stat'], 2) }}</div>
            </td>
            <td class="kpi-card" style="width: 33%;">
                <div class="kpi-title">Employer Statutory Total</div>
                <div class="kpi-val" style="color: #1e3a8a;">₹{{ number_format($kpis['total_er_stat'], 2) }}</div>
            </td>
            <td class="kpi-card" style="width: 33%;">
                <div class="kpi-title">Total Statutory Liability</div>
                <div class="kpi-val" style="color: #166534;">₹{{ number_format($kpis['total_liability'], 2) }}</div>
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
                <th class="text-right">Basic (₹)</th>
                <th class="text-right">Emp PF</th>
                <th class="text-right">Emp ESI</th>
                <th class="text-right">PT</th>
                <th class="text-right">LWF</th>
                <th class="text-right">TDS</th>
                <th class="text-right">Er PF</th>
                <th class="text-right">Er ESI</th>
                <th class="text-right">Er LWF</th>
                <th class="text-right">Total Liability</th>
            </tr>
        </thead>
        <tbody>
            @foreach($rows as $r)
            <tr>
                <td>{{ $r['payroll_month'] }}</td>
                <td>{{ $r['client_name'] }}</td>
                <td>{{ $r['employee_code'] }}</td>
                <td><strong>{{ $r['employee_name'] }}</strong></td>
                <td class="text-right">₹{{ number_format((float)$r['basic_pay'], 2) }}</td>
                <td class="text-right">₹{{ number_format((float)$r['employee_pf'], 2) }}</td>
                <td class="text-right">₹{{ number_format((float)$r['employee_esi'], 2) }}</td>
                <td class="text-right">₹{{ number_format((float)$r['professional_tax'], 2) }}</td>
                <td class="text-right">₹{{ number_format((float)$r['lwf_deduction'], 2) }}</td>
                <td class="text-right">₹{{ number_format((float)$r['tds_deduction'], 2) }}</td>
                <td class="text-right">₹{{ number_format((float)$r['employer_pf'], 2) }}</td>
                <td class="text-right">₹{{ number_format((float)$r['employer_esi'], 2) }}</td>
                <td class="text-right">₹{{ number_format((float)$r['employer_lwf'], 2) }}</td>
                <td class="text-right"><strong>₹{{ number_format((float)$r['total_statutory_liability'], 2) }}</strong></td>
            </tr>
            @endforeach
        </tbody>
    </table>

</body>
</html>
