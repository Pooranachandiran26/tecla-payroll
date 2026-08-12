<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Manager Client Access & Permission Matrix (Admin Only)</title>
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
                <div class="meta-text">Manager Client Access & Security Matrix (Admin Only)</div>
            </td>
            <td style="width: 50%;" class="text-right">
                <div class="report-title">Access Matrix</div>
                <div class="meta-text">Generated On: {{ $generatedAt }}</div>
            </td>
        </tr>
    </table>

    <table class="kpi-table">
        <tr>
            <td class="kpi-card" style="width: 33%;">
                <div class="kpi-title">Total Account Managers</div>
                <div class="kpi-val">{{ $kpis['total_managers'] }}</div>
            </td>
            <td class="kpi-card" style="width: 33%;">
                <div class="kpi-title">Active Account Managers</div>
                <div class="kpi-val" style="color: #166534;">{{ $kpis['active_managers'] }}</div>
            </td>
            <td class="kpi-card" style="width: 33%;">
                <div class="kpi-title">Managers with Client Portfolio</div>
                <div class="kpi-val" style="color: #1e3a8a;">{{ $kpis['assigned_managers'] }}</div>
            </td>
        </tr>
    </table>

    <table class="data-table">
        <thead>
            <tr>
                <th>Account Manager Name</th>
                <th>Email Address</th>
                <th class="text-center">Account Status</th>
                <th class="text-center">Clients Count</th>
                <th>Assigned Client Portfolio</th>
            </tr>
        </thead>
        <tbody>
            @foreach($rows as $r)
            <tr>
                <td><strong>{{ $r['manager_name'] }}</strong></td>
                <td>{{ $r['manager_email'] }}</td>
                <td class="text-center">{{ $r['status'] }}</td>
                <td class="text-center"><strong>{{ $r['assigned_clients_count'] }}</strong></td>
                <td>{{ $r['assigned_client_names'] }}</td>
            </tr>
            @endforeach
        </tbody>
    </table>
</body>
</html>
