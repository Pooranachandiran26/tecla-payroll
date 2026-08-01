<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Margin & Profitability Report (Admin Confidential)</title>
    <style>
        body { font-family: DejaVu Sans, sans-serif; font-size: 8.5px; color: #1e293b; margin: 0; padding: 12px; }
        .header-table { width: 100%; border-bottom: 2px solid #1F3864; padding-bottom: 8px; margin-bottom: 12px; }
        .company-name { font-size: 14px; font-weight: bold; color: #1F3864; text-transform: uppercase; }
        .report-title { font-size: 15px; font-weight: bold; color: #991b1b; text-align: right; text-transform: uppercase; }
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
        .badge-confidential { background-color: #fee2e2; color: #991b1b; padding: 2px 6px; border-radius: 3px; font-weight: bold; font-size: 8px; }
    </style>
</head>
<body>

    <table class="header-table">
        <tr>
            <td style="width: 50%;">
                <div class="company-name">Tecla Payroll Management System</div>
                <div class="meta-text">Executive Financial Profitability Audit</div>
            </td>
            <td style="width: 50%;" class="text-right">
                <div class="report-title">Margin & Profitability Report</div>
                <div class="meta-text">Generated On: {{ $generatedAt }} | Scope: <span class="badge-confidential">ADMIN CONFIDENTIAL</span></div>
            </td>
        </tr>
    </table>

    <table class="kpi-table">
        <tr>
            <td class="kpi-card" style="width: 25%;">
                <div class="kpi-title">Total Invoiced (Excl. GST)</div>
                <div class="kpi-val" style="color: #1e3a8a;">₹{{ number_format($kpis['total_invoiced'], 2) }}</div>
            </td>
            <td class="kpi-card" style="width: 25%;">
                <div class="kpi-title">Gross Salary Pass-Through</div>
                <div class="kpi-val">₹{{ number_format($kpis['total_gross'], 2) }}</div>
            </td>
            <td class="kpi-card" style="width: 25%;">
                <div class="kpi-title">True Agency Margin</div>
                <div class="kpi-val" style="color: #166534;">₹{{ number_format($kpis['total_margin'], 2) }}</div>
            </td>
            <td class="kpi-card" style="width: 25%;">
                <div class="kpi-title">Overall Margin %</div>
                <div class="kpi-val" style="color: #166534;">{{ $kpis['overall_margin_pct'] }}</div>
            </td>
        </tr>
    </table>

    <table class="data-table">
        <thead>
            <tr>
                <th>Client Partner</th>
                <th>Billing Month</th>
                <th class="text-right">Invoiced (Excl. GST) (₹)</th>
                <th class="text-right">Gross Earnings (₹)</th>
                <th class="text-right">Employer Stat Cost (₹)</th>
                <th class="text-right">True Agency Margin (₹)</th>
                <th class="text-center">Margin %</th>
            </tr>
        </thead>
        <tbody>
            @foreach($rows as $r)
            <tr>
                <td><strong>{{ $r['client_name'] }}</strong></td>
                <td>{{ $r['invoice_month'] }}</td>
                <td class="text-right">₹{{ number_format((float)$r['invoiced_excl_gst'], 2) }}</td>
                <td class="text-right">₹{{ number_format((float)$r['gross_earnings'], 2) }}</td>
                <td class="text-right">₹{{ number_format((float)$r['employer_statutory_cost'], 2) }}</td>
                <td class="text-right"><strong style="color: #166534;">₹{{ number_format((float)$r['true_agency_margin'], 2) }}</strong></td>
                <td class="text-center"><strong>{{ $r['margin_percentage'] }}</strong></td>
            </tr>
            @endforeach
        </tbody>
    </table>

</body>
</html>
