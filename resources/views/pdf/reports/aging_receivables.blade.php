<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Aging Receivables & Collections Report</title>
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
                <div class="meta-text">Aging Receivables & Collections Audit</div>
            </td>
            <td style="width: 50%;" class="text-right">
                <div class="report-title">Aging Receivables</div>
                <div class="meta-text">Generated On: {{ $generatedAt }}</div>
            </td>
        </tr>
    </table>

    <table class="kpi-table">
        <tr>
            <td class="kpi-card" style="width: 20%;">
                <div class="kpi-title">Total Outstanding</div>
                <div class="kpi-val">₹{{ number_format($kpis['total_outstanding_val'], 2) }}</div>
            </td>
            <td class="kpi-card" style="width: 20%;">
                <div class="kpi-title">0–30 Days</div>
                <div class="kpi-val">₹{{ number_format($kpis['bucketSummary']['0_30'], 2) }}</div>
            </td>
            <td class="kpi-card" style="width: 20%;">
                <div class="kpi-title">31–60 Days</div>
                <div class="kpi-val">₹{{ number_format($kpis['bucketSummary']['31_60'], 2) }}</div>
            </td>
            <td class="kpi-card" style="width: 20%;">
                <div class="kpi-title">61–90 Days</div>
                <div class="kpi-val">₹{{ number_format($kpis['bucketSummary']['61_90'], 2) }}</div>
            </td>
            <td class="kpi-card" style="width: 20%;">
                <div class="kpi-title">90+ Days (Severe)</div>
                <div class="kpi-val" style="color: #991b1b;">₹{{ number_format($kpis['bucketSummary']['90_plus'], 2) }}</div>
            </td>
        </tr>
    </table>

    <table class="data-table">
        <thead>
            <tr>
                <th>Invoice No</th>
                <th>Client Partner</th>
                <th>Month</th>
                <th>Due Date</th>
                <th class="text-center">Days Overdue</th>
                <th class="text-center">Aging Bucket</th>
                <th class="text-right">Pass-Through CTC (₹)</th>
                <th class="text-right">Agency Fee (₹)</th>
                <th class="text-right">Grand Total (₹)</th>
                <th class="text-center">Status</th>
            </tr>
        </thead>
        <tbody>
            @foreach($rows as $r)
            <tr>
                <td><strong>{{ $r['invoice_number'] }}</strong></td>
                <td>{{ $r['client_name'] }}</td>
                <td>{{ $r['invoice_month'] }}</td>
                <td>{{ $r['due_date'] }}</td>
                <td class="text-center">{{ $r['days_overdue'] }}</td>
                <td class="text-center"><strong>{{ $r['aging_bucket'] }}</strong></td>
                <td class="text-right">₹{{ number_format((float)$r['passthrough_ctc'], 2) }}</td>
                <td class="text-right">{{ is_numeric($r['agency_fee']) ? '₹' . number_format((float)$r['agency_fee'], 2) : $r['agency_fee'] }}</td>
                <td class="text-right"><strong>₹{{ number_format((float)$r['grand_total'], 2) }}</strong></td>
                <td class="text-center">{{ $r['status'] }}</td>
            </tr>
            @endforeach
        </tbody>
    </table>
</body>
</html>
