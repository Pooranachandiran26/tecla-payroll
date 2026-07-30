<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; rounded: 8px; }
        .header { background-color: #1F3864; color: white; padding: 15px; text-align: center; font-size: 18px; font-weight: bold; }
        .content { padding: 20px; }
        .info-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        .info-table td { padding: 8px; border-bottom: 1px solid #edf2f7; }
        .info-label { font-weight: bold; color: #4a5568; width: 140px; }
        .message-box { background-color: #f8fafc; border-left: 4px solid #1F3864; padding: 12px; margin-top: 15px; font-style: italic; }
        .footer { text-align: center; font-size: 12px; color: #a0aec0; margin-top: 20px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            New Employee Support Query
        </div>
        <div class="content">
            <p>Dear HR / Primary Contact,</p>
            <p>An employee under your client organization has submitted a support query on the portal:</p>
            
            <table class="info-table">
                <tr>
                    <td class="info-label">Employee:</td>
                    <td>{{ $queryModel->employee ? $queryModel->employee->full_name : '—' }} ({{ $queryModel->employee ? $queryModel->employee->employee_code : '—' }})</td>
                </tr>
                <tr>
                    <td class="info-label">Category:</td>
                    <td>{{ ucfirst($queryModel->category) }}</td>
                </tr>
                <tr>
                    <td class="info-label">Subject:</td>
                    <td><strong>{{ $queryModel->subject }}</strong></td>
                </tr>
                <tr>
                    <td class="info-label">Submitted On:</td>
                    <td>{{ $queryModel->created_at ? $queryModel->created_at->format('M d, Y H:i A') : now()->format('M d, Y') }}</td>
                </tr>
            </table>

            <div class="message-box">
                "{{ $queryModel->message }}"
            </div>

            <p style="margin-top: 20px;">Our agency admin team is also reviewing this request to assist with resolution.</p>
        </div>
        <div class="footer">
            &copy; {{ date('Y') }} Tecla Payroll Management. All rights reserved.
        </div>
    </div>
</body>
</html>
