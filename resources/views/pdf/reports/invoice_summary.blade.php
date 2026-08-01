<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Invoice & Revenue Summary Report</title>
    <style>
        body {
            font-family: DejaVu Sans, sans-serif;
            font-size: 9px;
            color: #1e293b;
            margin: 0;
            padding: 12px;
            background-color: #ffffff;
        }
        .header-table {
            width: 100%;
            border-bottom: 2px solid #1F3864;
            padding-bottom: 8px;
            margin-bottom: 12px;
        }
        .company-name {
            font-size: 14px;
            font-weight: bold;
            color: #1F3864;
            text-transform: uppercase;
        }
        .report-title {
            font-size: 16px;
            font-weight: bold;
            color: #1F3864;
            text-align: right;
            text-transform: uppercase;
        }
        .meta-text {
            font-size: 8px;
            color: #64748b;
        }
        .kpi-table {
            width: 100%;
            margin-bottom: 12px;
            border-spacing: 6px;
        }
        .kpi-card {
            background-color: #f8fafc;
            border: 1px solid #cbd5e1;
            padding: 8px;
            text-align: center;
            border-radius: 4px;
        }
        .kpi-title {
            font-size: 8px;
            font-weight: bold;
            color: #475569;
            text-transform: uppercase;
        }
        .kpi-val {
            font-size: 12px;
            font-weight: bold;
            color: #0f172a;
            margin-top: 2px;
        }
        .section-title {
            font-size: 11px;
            font-weight: bold;
            color: #1F3864;
            margin-top: 10px;
            margin-bottom: 6px;
            border-bottom: 1px solid #cbd5e1;
            padding-bottom: 3px;
        }
        .data-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 14px;
            font-size: 8.5px;
        }
        .data-table th {
            background-color: #1F3864;
            color: #ffffff;
            font-weight: bold;
            padding: 5px;
            text-align: left;
            border: 1px solid #1F3864;
        }
        .data-table td {
            padding: 4.5px;
            border: 1px solid #e2e8f0;
        }
        .data-table tr:nth-child(even) {
            background-color: #f8fafc;
        }
        .text-right {
            text-align: right;
        }
        .text-center {
            text-align: center;
        }
        .badge-status {
            display: inline-block;
            padding: 2px 5px;
            border-radius: 3px;
            font-size: 7.5px;
            font-weight: bold;
        }
        .badge-paid { background-color: #dcfce7; color: #166534; }
        .badge-overdue { background-color: #fee2e2; color: #991b1b; }
        .badge-sent { background-color: #e0f2fe; color: #075985; }
        .badge-draft { background-color: #f1f5f9; color: #475569; }
        .badge-margin { background-color: #fef3c7; color: #92400e; }
    </style>
</head>
<body>

    <!-- Header Banner -->
    <table class="header-table">
        <tr>
            <td style="width: 50%;">
                <div class="company-name">Tecla Payroll Management System</div>
                <div class="meta-text">Executive Financial & Revenue Report</div>
            </td>
            <td style="width: 50%;" class="text-right">
                <div class="report-title">Invoice & Revenue Summary</div>
                <div class="meta-text">Generated On: {{ $generatedAt }} | Scope: {{ ucfirst($userRole) }}</div>
            </td>
        </tr>
    </table>

    <!-- Executive KPI Cards -->
    <table class="kpi-table">
        <tr>
            <td class="kpi-card" style="width: 25%;">
                <div class="kpi-title">Total Invoiced</div>
                <div class="kpi-val" style="color: #1e3a8a;">₹{{ number_format($kpis['total_invoiced'], 2) }}</div>
            </td>
            <td class="kpi-card" style="width: 25%;">
                <div class="kpi-title">Total Collected (Paid)</div>
                <div class="kpi-val" style="color: #166534;">₹{{ number_format($kpis['total_collected'], 2) }}</div>
            </td>
            <td class="kpi-card" style="width: 25%;">
                <div class="kpi-title">Total Outstanding</div>
                <div class="kpi-val" style="color: #b45309;">₹{{ number_format($kpis['total_outstanding'], 2) }}</div>
            </td>
            <td class="kpi-card" style="width: 25%;">
                <div class="kpi-title">Total Overdue</div>
                <div class="kpi-val" style="color: #991b1b;">₹{{ number_format($kpis['total_overdue'], 2) }}</div>
            </td>
        </tr>
    </table>

    <!-- Section 1: Client-Level Aggregated Summary -->
    <div class="section-title">1. Client Billing & Margin Aggregation Summary</div>
    <table class="data-table">
        <thead>
            <tr>
                <th>Client Name</th>
                <th class="text-center">Invoices</th>
                <th class="text-right">Pass-Through CTC (₹)</th>
                <th class="text-right">Agency Margin (₹)</th>
                <th class="text-right">GST Total (₹)</th>
                <th class="text-right">Grand Total (₹)</th>
                <th class="text-center">Paid / Overdue</th>
            </tr>
        </thead>
        <tbody>
            @foreach($clientSummary as $cs)
            <tr>
                <td><strong>{{ $cs['client_name'] }}</strong></td>
                <td class="text-center">{{ $cs['total_invoices'] }}</td>
                <td class="text-right">₹{{ number_format($cs['total_passthrough'], 2) }}</td>
                <td class="text-right">
                    @if(is_numeric($cs['total_margin']))
                        ₹{{ number_format($cs['total_margin'], 2) }}
                    @else
                        <span class="badge-status badge-margin">N/A (Admin Only)</span>
                    @endif
                </td>
                <td class="text-right">₹{{ number_format($cs['total_gst'], 2) }}</td>
                <td class="text-right"><strong>₹{{ number_format($cs['total_grand'], 2) }}</strong></td>
                <td class="text-center">
                    <span class="badge-status badge-paid">{{ $cs['paid_count'] }} Paid</span>
                    @if($cs['overdue_count'] > 0)
                        <span class="badge-status badge-overdue">{{ $cs['overdue_count'] }} Overdue</span>
                    @endif
                </td>
            </tr>
            @endforeach
        </tbody>
    </table>

    <!-- Section 2: Detailed Invoice Register -->
    <div class="section-title">2. Detailed Invoice Register</div>
    <table class="data-table">
        <thead>
            <tr>
                <th>Invoice No</th>
                <th>Client Name</th>
                <th>Month</th>
                <th class="text-right">CTC (₹)</th>
                <th class="text-right">Fee (₹)</th>
                <th class="text-right">GST (₹)</th>
                <th class="text-right">Grand Total (₹)</th>
                <th class="text-center">Status</th>
                <th>Due Date</th>
                <th class="text-center">Days Overdue</th>
                <th>PO Number</th>
            </tr>
        </thead>
        <tbody>
            @foreach($rows as $r)
            <tr>
                <td><strong>{{ $r['invoice_number'] }}</strong></td>
                <td>{{ $r['client_name'] }}</td>
                <td>{{ $r['invoice_month'] }}</td>
                <td class="text-right">₹{{ number_format((float)$r['gross_salary_passthrough'], 2) }}</td>
                <td class="text-right">
                    @if(is_numeric($r['agency_service_fee']))
                        ₹{{ number_format((float)$r['agency_service_fee'], 2) }}
                    @else
                        <span class="badge-status badge-margin">{{ $r['agency_service_fee'] }}</span>
                    @endif
                </td>
                <td class="text-right">₹{{ number_format((float)$r['gst_amount'], 2) }}</td>
                <td class="text-right"><strong>₹{{ number_format((float)$r['grand_total'], 2) }}</strong></td>
                <td class="text-center">
                    @php
                        $st = strtolower($r['status']);
                        $badgeClass = match($st) {
                            'paid' => 'badge-paid',
                            'overdue' => 'badge-overdue',
                            'sent', 'raised' => 'badge-sent',
                            default => 'badge-draft',
                        };
                    @endphp
                    <span class="badge-status {{ $badgeClass }}">{{ $r['status'] }}</span>
                </td>
                <td>{{ $r['due_date'] }}</td>
                <td class="text-center">
                    @if($r['days_overdue'] > 0)
                        <strong style="color: #991b1b;">{{ $r['days_overdue'] }}d</strong>
                    @else
                        —
                    @endif
                </td>
                <td>{{ $r['po_number'] }}</td>
            </tr>
            @endforeach
        </tbody>
    </table>

</body>
</html>
