<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Client Master Directory & Commercial Terms</title>
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
        .text-center { text-align: center; }
    </style>
</head>
<body>
    <table class="header-table">
        <tr>
            <td style="width: 50%;">
                <div class="company-name">Tecla Payroll Management System</div>
                <div class="meta-text">Client Master Directory & Commercial Terms Audit</div>
            </td>
            <td style="width: 50%;" class="text-right">
                <div class="report-title">Client Master</div>
                <div class="meta-text">Generated On: {{ $generatedAt }}</div>
            </td>
        </tr>
    </table>

    <table class="kpi-table">
        <tr>
            <td class="kpi-card" style="width: 33%;">
                <div class="kpi-title">Total Client Accounts</div>
                <div class="kpi-val">{{ $kpis['total_clients'] }}</div>
            </td>
            <td class="kpi-card" style="width: 33%;">
                <div class="kpi-title">Active Clients</div>
                <div class="kpi-val" style="color: #166534;">{{ $kpis['active_clients'] }}</div>
            </td>
            <td class="kpi-card" style="width: 33%;">
                <div class="kpi-title">Onboarding Clients</div>
                <div class="kpi-val" style="color: #1e3a8a;">{{ $kpis['onboarding_count'] }}</div>
            </td>
        </tr>
    </table>

    <table class="data-table">
        <thead>
            <tr>
                <th>Code</th>
                <th>Company Name</th>
                <th>Industry</th>
                <th>Contract Type</th>
                <th>Billing Model</th>
                <th>Commercial Rate</th>
                <th>Primary Contact</th>
                <th>POC Email</th>
                <th class="text-center">Status</th>
            </tr>
        </thead>
        <tbody>
            @foreach($rows as $r)
            <tr>
                <td><strong>{{ $r['client_code'] }}</strong></td>
                <td><strong>{{ $r['company_name'] }}</strong></td>
                <td>{{ $r['industry'] }}</td>
                <td>{{ $r['contract_type'] }}</td>
                <td>{{ $r['billing_model'] }}</td>
                <td><strong>{{ $r['commercial_rate'] }}</strong></td>
                <td>{{ $r['primary_poc_name'] }}</td>
                <td>{{ $r['primary_poc_email'] }}</td>
                <td class="text-center">{{ $r['status'] }}</td>
            </tr>
            @endforeach
        </tbody>
    </table>
</body>
</html>
