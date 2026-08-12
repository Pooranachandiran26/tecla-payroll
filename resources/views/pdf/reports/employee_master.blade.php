<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Employee Master Directory & CTC Breakdown</title>
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
        .font-mono { font-family: monospace; }
    </style>
</head>
<body>

    <table class="header-table">
        <tr>
            <td style="width: 50%;">
                <div class="company-name">Tecla Payroll Management System</div>
                <div class="meta-text">Employee Directory & Compensation Register</div>
            </td>
            <td style="width: 50%;" class="text-right">
                <div class="report-title">Employee Master Directory</div>
                <div class="meta-text">Generated On: {{ $generatedAt }} | Scope: {{ ucfirst($userRole) }}</div>
            </td>
        </tr>
    </table>

    <table class="kpi-table">
        <tr>
            <td class="kpi-card" style="width: 25%;">
                <div class="kpi-title">Total Employees</div>
                <div class="kpi-val">{{ $kpis['total_employees'] }}</div>
            </td>
            <td class="kpi-card" style="width: 25%;">
                <div class="kpi-title">Active Employees</div>
                <div class="kpi-val" style="color: #166534;">{{ $kpis['active_count'] }}</div>
            </td>
            <td class="kpi-card" style="width: 25%;">
                <div class="kpi-title">Total Monthly Gross</div>
                <div class="kpi-val" style="color: #1e3a8a;">₹{{ number_format($kpis['total_gross'], 2) }}</div>
            </td>
            <td class="kpi-card" style="width: 25%;">
                <div class="kpi-title">Total Monthly CTC</div>
                <div class="kpi-val" style="color: #0f172a;">₹{{ number_format($kpis['total_ctc'], 2) }}</div>
            </td>
        </tr>
    </table>

    <table class="data-table">
        <thead>
            <tr>
                <th>Code</th>
                <th>Employee Name</th>
                <th>Client Partner</th>
                <th>Branch</th>
                <th>Designation</th>
                <th>DOJ</th>
                <th>Model</th>
                <th class="text-right">Basic (₹)</th>
                <th class="text-right">Gross (₹)</th>
                <th class="text-right">Monthly CTC (₹)</th>
                <th>Bank A/C No</th>
                <th>PAN Number</th>
            </tr>
        </thead>
        <tbody>
            @foreach($rows as $r)
            <tr>
                <td>{{ $r['employee_code'] }}</td>
                <td><strong>{{ $r['full_name'] }}</strong></td>
                <td>{{ $r['client_name'] }}</td>
                <td>{{ $r['branch_name'] }}</td>
                <td>{{ $r['designation'] }}</td>
                <td>{{ $r['date_of_joining'] }}</td>
                <td>{{ $r['employment_model'] }}</td>
                <td class="text-right">₹{{ number_format((float)$r['basic_pay'], 2) }}</td>
                <td class="text-right">₹{{ number_format((float)$r['gross_monthly_salary'], 2) }}</td>
                <td class="text-right"><strong>₹{{ number_format((float)$r['ctc_monthly'], 2) }}</strong></td>
                <td class="font-mono">{{ $r['bank_account_number'] }}</td>
                <td class="font-mono">{{ $r['pan_number'] }}</td>
            </tr>
            @endforeach
        </tbody>
    </table>

</body>
</html>
