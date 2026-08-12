<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>User Activity & System Audit Log Report (Admin Confidential)</title>
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
    </style>
</head>
<body>
    <table class="header-table">
        <tr>
            <td style="width: 50%;">
                <div class="company-name">Tecla Payroll Management System</div>
                <div class="meta-text">User Activity & System Audit Log</div>
            </td>
            <td style="width: 50%;" class="text-right">
                <div class="report-title">Audit Log Report</div>
                <div class="meta-text">Generated On: {{ $generatedAt }} | Scope: ADMIN CONFIDENTIAL</div>
            </td>
        </tr>
    </table>

    <table class="kpi-table">
        <tr>
            <td class="kpi-card" style="width: 33%;">
                <div class="kpi-title">Total Log Entries</div>
                <div class="kpi-val">{{ $kpis['total_logs'] }}</div>
            </td>
            <td class="kpi-card" style="width: 33%;">
                <div class="kpi-title">Unique Users</div>
                <div class="kpi-val">{{ $kpis['unique_users'] }}</div>
            </td>
            <td class="kpi-card" style="width: 33%;">
                <div class="kpi-title">Action Types</div>
                <div class="kpi-val">{{ $kpis['total_actions'] }}</div>
            </td>
        </tr>
    </table>

    <table class="data-table">
        <thead>
            <tr>
                <th>Timestamp</th>
                <th>User Name</th>
                <th>User Email</th>
                <th>Action Performed</th>
                <th>Target Resource</th>
                <th>IP Address</th>
            </tr>
        </thead>
        <tbody>
            @foreach($rows as $r)
            <tr>
                <td>{{ $r['created_at'] }}</td>
                <td><strong>{{ $r['user_name'] }}</strong></td>
                <td>{{ $r['user_email'] }}</td>
                <td>{{ $r['action'] }}</td>
                <td>{{ $r['auditable_type'] }}</td>
                <td>{{ $r['ip_address'] }}</td>
            </tr>
            @endforeach
        </tbody>
    </table>
</body>
</html>
