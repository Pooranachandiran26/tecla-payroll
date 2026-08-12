<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Operational Payroll Cycle Status Dashboard</title>
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
                <div class="meta-text">Operational Payroll Cycle Status Dashboard</div>
            </td>
            <td style="width: 50%;" class="text-right">
                <div class="report-title">Cycle Status</div>
                <div class="meta-text">Generated On: {{ $generatedAt }}</div>
            </td>
        </tr>
    </table>

    <table class="kpi-table">
        <tr>
            <td class="kpi-card" style="width: 25%;">
                <div class="kpi-title">Total Cycles</div>
                <div class="kpi-val">{{ $kpis['total_runs'] }}</div>
            </td>
            <td class="kpi-card" style="width: 25%;">
                <div class="kpi-title">Locked Cycles</div>
                <div class="kpi-val" style="color: #166534;">{{ $kpis['locked_runs'] }}</div>
            </td>
            <td class="kpi-card" style="width: 25%;">
                <div class="kpi-title">Approved Cycles</div>
                <div class="kpi-val" style="color: #1e3a8a;">{{ $kpis['approved_runs'] }}</div>
            </td>
            <td class="kpi-card" style="width: 25%;">
                <div class="kpi-title">In-Progress / Draft</div>
                <div class="kpi-val" style="color: #854d0e;">{{ $kpis['draft_runs'] }}</div>
            </td>
        </tr>
    </table>

    <table class="data-table">
        <thead>
            <tr>
                <th>Client Partner</th>
                <th>Payroll Month</th>
                <th class="text-center">Cycle Status</th>
                <th class="text-center">Headcount</th>
                <th class="text-right">Gross Earnings (₹)</th>
                <th class="text-right">Net Disbursement (₹)</th>
                <th class="text-right">Employer Cost (₹)</th>
                <th>Processed By</th>
                <th>Approved By</th>
            </tr>
        </thead>
        <tbody>
            @foreach($rows as $r)
            <tr>
                <td><strong>{{ $r['client_name'] }}</strong></td>
                <td>{{ $r['payroll_month'] }}</td>
                <td class="text-center"><strong>{{ $r['cycle_status'] }}</strong></td>
                <td class="text-center">{{ $r['employees_processed'] }}</td>
                <td class="text-right">{{ number_format($r['gross_earnings'], 2) }}</td>
                <td class="text-right"><strong>{{ number_format($r['net_disbursement'], 2) }}</strong></td>
                <td class="text-right">{{ number_format($r['employer_cost'], 2) }}</td>
                <td>{{ $r['processed_by_name'] }}</td>
                <td>{{ $r['approved_by_name'] }}</td>
            </tr>
            @endforeach
        </tbody>
    </table>
</body>
</html>
