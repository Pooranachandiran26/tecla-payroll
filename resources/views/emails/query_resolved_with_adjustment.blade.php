<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Support Query Resolved</title>
    <style>
        body { font-family: sans-serif; color: #1E293B; background-color: #F8FAFC; margin: 0; padding: 20px; }
        .card { background: #FFFFFF; border-radius: 8px; padding: 24px; max-width: 600px; margin: 0 auto; border: 1px solid #E2E8F0; }
        .header { border-bottom: 2px solid #1F3864; padding-bottom: 12px; margin-bottom: 20px; }
        .title { color: #1F3864; font-size: 18px; font-weight: bold; }
        .badge { background: #DCFCE7; color: #166534; padding: 4px 8px; border-radius: 4px; font-weight: bold; font-size: 12px; }
        .table { width: 100%; border-collapse: collapse; margin-top: 16px; }
        .table th, .table td { padding: 8px 12px; border: 1px solid #E2E8F0; text-align: left; font-size: 14px; }
        .table th { background: #F1F5F9; font-weight: 600; }
        .footer { margin-top: 24px; font-size: 12px; color: #64748B; border-top: 1px solid #E2E8F0; padding-top: 12px; }
    </style>
</head>
<body>
    <div class="card">
        <div class="header">
            <div class="title">Payroll Query Resolved with Salary Adjustment</div>
        </div>

        <p>Dear {{ $employee->full_name }},</p>
        <p>Your support query has been resolved by HR & Payroll team with an official salary adjustment.</p>

        <div style="background: #F8FAFC; padding: 12px; border-radius: 6px; margin: 16px 0;">
            <strong>Query Details:</strong><br>
            <strong>Subject:</strong> {{ $queryModel->subject }}<br>
            <strong>Category:</strong> {{ ucfirst($queryModel->category) }}<br>
            <strong>Status:</strong> <span class="badge">Resolved</span>
        </div>

        <p><strong>Payroll Adjustment Summary:</strong></p>
        <table class="table">
            <tr>
                <th>Payroll Period</th>
                <td>{{ \Carbon\Carbon::parse($parentRun->payroll_month)->format('F Y') }}</td>
            </tr>
            <tr>
                <th>Corrected Paid Days</th>
                <td>{{ number_format($adjustmentSummary['corrected_paid_days'], 1) }} Days</td>
            </tr>
            <tr>
                <th>Final Net Pay</th>
                <td>₹{{ number_format($adjustmentSummary['final_net_pay'], 2) }}</td>
            </tr>
            <tr>
                <th>Adjustment Net Variance</th>
                <td style="font-weight: bold; color: {{ $adjustmentSummary['net_variance'] >= 0 ? '#166534' : '#DC2626' }};">
                    {{ $adjustmentSummary['net_variance'] >= 0 ? '+' : '' }}₹{{ number_format($adjustmentSummary['net_variance'], 2) }}
                </td>
            </tr>
        </table>

        @if(!empty($queryModel->admin_response))
            <p><strong>Admin Resolution Note:</strong></p>
            <div style="background: #FFFBEB; border-left: 4px solid #F59E0B; padding: 10px 14px; margin-top: 8px; font-size: 14px;">
                {{ $queryModel->admin_response }}
            </div>
        @endif

        <div class="footer">
            If you have any questions, please log in to the employee portal or contact HR.<br>
            This is an automated system notification from Tecla Payroll.
        </div>
    </div>
</body>
</html>
