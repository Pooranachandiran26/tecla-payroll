<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Monthly GST Filing & Tax Summary (Admin Confidential)</title>
    <style>
        body { font-family: DejaVu Sans, sans-serif; font-size: 8px; color: #1e293b; margin: 0; padding: 12px; }
        .header-table { width: 100%; border-bottom: 2px solid #1F3864; padding-bottom: 8px; margin-bottom: 12px; }
        .company-name { font-size: 14px; font-weight: bold; color: #1F3864; text-transform: uppercase; }
        .report-title { font-size: 14px; font-weight: bold; color: #991b1b; text-align: right; text-transform: uppercase; }
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
                <div class="meta-text">Monthly GST Filing & Tax Summary Audit</div>
            </td>
            <td style="width: 50%;" class="text-right">
                <div class="report-title">GST Tax Summary</div>
                <div class="meta-text">Generated On: {{ $generatedAt }} | Scope: ADMIN CONFIDENTIAL</div>
            </td>
        </tr>
    </table>

    <table class="kpi-table">
        <tr>
            <td class="kpi-card" style="width: 20%;">
                <div class="kpi-title">Total Taxable Fee</div>
                <div class="kpi-val">₹{{ number_format($kpis['total_taxable'], 2) }}</div>
            </td>
            <td class="kpi-card" style="width: 20%;">
                <div class="kpi-title">CGST (9%)</div>
                <div class="kpi-val">₹{{ number_format($kpis['total_cgst'], 2) }}</div>
            </td>
            <td class="kpi-card" style="width: 20%;">
                <div class="kpi-title">SGST (9%)</div>
                <div class="kpi-val">₹{{ number_format($kpis['total_sgst'], 2) }}</div>
            </td>
            <td class="kpi-card" style="width: 20%;">
                <div class="kpi-title">IGST (18%)</div>
                <div class="kpi-val">₹{{ number_format($kpis['total_igst'], 2) }}</div>
            </td>
            <td class="kpi-card" style="width: 20%;">
                <div class="kpi-title">Total GST Liability</div>
                <div class="kpi-val" style="color: #1e3a8a;">₹{{ number_format($kpis['total_gst'], 2) }}</div>
            </td>
        </tr>
    </table>

    <table class="data-table">
        <thead>
            <tr>
                <th>Invoice No</th>
                <th>Client Partner</th>
                <th>Month</th>
                <th>Place of Supply</th>
                <th class="text-center">GST Type</th>
                <th class="text-right">Taxable Fee (₹)</th>
                <th class="text-right">CGST (₹)</th>
                <th class="text-right">SGST (₹)</th>
                <th class="text-right">IGST (₹)</th>
                <th class="text-right">Total GST (₹)</th>
            </tr>
        </thead>
        <tbody>
            @foreach($rows as $r)
            <tr>
                <td><strong>{{ $r['invoice_number'] }}</strong></td>
                <td>{{ $r['client_name'] }}</td>
                <td>{{ $r['invoice_month'] }}</td>
                <td>{{ $r['place_of_supply'] }}</td>
                <td class="text-center">{{ $r['gst_type'] }}</td>
                <td class="text-right">₹{{ number_format((float)$r['taxable_agency_fee'], 2) }}</td>
                <td class="text-right">₹{{ number_format((float)$r['cgst_amount'], 2) }}</td>
                <td class="text-right">₹{{ number_format((float)$r['sgst_amount'], 2) }}</td>
                <td class="text-right">₹{{ number_format((float)$r['igst_amount'], 2) }}</td>
                <td class="text-right"><strong>₹{{ number_format((float)$r['total_gst_amount'], 2) }}</strong></td>
            </tr>
            @endforeach
        </tbody>
    </table>
</body>
</html>
