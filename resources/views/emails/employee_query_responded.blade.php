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
        .response-box { background-color: #f0fdf4; border-left: 4px solid #16a34a; padding: 15px; margin-top: 15px; rounded-right: 6px; }
        .btn-link { display: inline-block; background-color: #1F3864; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold; margin-top: 20px; }
        .footer { text-align: center; font-size: 12px; color: #a0aec0; margin-top: 20px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            Support Query Resolved
        </div>
        <div class="content">
            <p>Dear {{ $queryModel->employee ? $queryModel->employee->full_name : 'Employee' }},</p>
            <p>Your support query has been reviewed and responded to by our HR & Admin team:</p>
            
            <table class="info-table">
                <tr>
                    <td class="info-label">Category:</td>
                    <td>{{ ucfirst($queryModel->category) }}</td>
                </tr>
                <tr>
                    <td class="info-label">Subject:</td>
                    <td><strong>{{ $queryModel->subject }}</strong></td>
                </tr>
                <tr>
                    <td class="info-label">Your Query:</td>
                    <td>{{ $queryModel->message }}</td>
                </tr>
                <tr>
                    <td class="info-label">Status:</td>
                    <td><strong style="color: #16a34a;">Resolved</strong></td>
                </tr>
            </table>

            <div class="response-box">
                <strong style="color: #15803d; display: block; margin-bottom: 5px;">💬 Response from Admin / HR:</strong>
                <p style="margin: 0; white-space: pre-line;">{{ $queryModel->admin_response }}</p>
            </div>

            <div style="text-align: center;">
                <a href="{{ url('/employee/contact') }}" class="btn-link">View Query History in Portal</a>
            </div>
        </div>
        <div class="footer">
            &copy; {{ date('Y') }} Tecla Payroll Management. All rights reserved.
        </div>
    </div>
</body>
</html>
