<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Payroll Summary for {{ $formattedMonth }}</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background-color: #1F3864; padding: 20px; text-align: center; border-radius: 6px 6px 0 0;">
        <h2 style="color: #ffffff; margin: 0;">Payroll Summary</h2>
        <p style="color: #cbd5e1; margin: 5px 0 0 0;">Period: {{ $formattedMonth }}</p>
    </div>

    <div style="border: 1px solid #e2e8f0; border-top: none; padding: 25px; background-color: #ffffff; border-radius: 0 0 6px 6px;">
        <p>Dear <strong>{{ $employee->full_name }}</strong> (Code: {{ $employee->employee_code }}),</p>

        <p>Your monthly salary for <strong>{{ $formattedMonth }}</strong> has been calculated. Below is your detailed attendance and compensation summary:</p>

        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 15px; margin: 20px 0;">
            <h4 style="margin-top: 0; color: #1F3864; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">Attendance & Paid Days Breakdown</h4>
            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                <tr>
                    <td style="padding: 6px 0; color: #64748b;">Days Present:</td>
                    <td style="padding: 6px 0; text-align: right; font-weight: bold;">{{ $breakdown['present_days'] ?? 0 }} day(s)</td>
                </tr>
                <tr>
                    <td style="padding: 6px 0; color: #64748b;">Weekly Off Days:</td>
                    <td style="padding: 6px 0; text-align: right; font-weight: bold;">{{ $breakdown['weekly_off_days'] ?? 0 }} day(s)</td>
                </tr>
                <tr>
                    <td style="padding: 6px 0; color: #64748b;">Holidays:</td>
                    <td style="padding: 6px 0; text-align: right; font-weight: bold;">{{ $breakdown['holiday_days'] ?? 0 }} day(s)</td>
                </tr>
                <tr>
                    <td style="padding: 6px 0; color: #dc2626;">Loss of Pay (LOP) Days:</td>
                    <td style="padding: 6px 0; text-align: right; font-weight: bold; color: #dc2626;">{{ $breakdown['lop_days'] ?? 0 }} day(s)</td>
                </tr>
                <tr style="border-top: 1px solid #cbd5e1;">
                    <td style="padding: 8px 0; font-weight: bold; color: #1F3864;">Total Calculated Paid Days:</td>
                    <td style="padding: 8px 0; text-align: right; font-weight: bold; color: #1F3864;">{{ number_format((float)$item->paid_days, 1) }} day(s)</td>
                </tr>
            </table>
        </div>

        <div style="background-color: #1F3864; color: #ffffff; padding: 15px 20px; border-radius: 6px; text-align: center; margin: 20px 0;">
            <span style="font-size: 14px; text-transform: uppercase; tracking-wider: 1px; display: block; opacity: 0.9;">Calculated Net Take-Home Pay</span>
            <span style="font-size: 24px; font-weight: bold; color: #facc15;">₹{{ number_format(round((float)$item->net_pay), 2) }}</span>
        </div>

        <div style="background-color: #fffbe6; border: 1px solid #ffe58f; border-radius: 6px; padding: 15px; margin: 20px 0;">
            <p style="margin: 0; color: #873800; font-size: 14px;">
                <strong>⚠️ Need a Review?</strong><br>
                If anything looks incorrect on your attendance or salary summary, you can 
                <a href="{{ $supportUrl }}" style="color: #1F3864; font-weight: bold; text-decoration: underline;">Raise a Payroll Query Here</a>.
            </p>
        </div>

        <p style="font-size: 12px; color: #94a3b8; margin-top: 30px; text-align: center; border-top: 1px solid #f1f5f9; padding-top: 15px;">
            This is an automated payroll review notice from {{ optional($employee->client)->company_name ?: 'Tecla Payroll' }}.
        </p>
    </div>
</body>
</html>
