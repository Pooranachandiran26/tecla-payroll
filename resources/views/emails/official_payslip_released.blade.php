<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Official Salary Payslip for {{ $formattedMonth }}</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background-color: #1F3864; padding: 20px; text-align: center; border-radius: 6px 6px 0 0;">
        <h2 style="color: #ffffff; margin: 0;">Official Salary Payslip</h2>
        <p style="color: #cbd5e1; margin: 5px 0 0 0;">Period: {{ $formattedMonth }}</p>
    </div>

    <div style="border: 1px solid #e2e8f0; border-top: none; padding: 25px; background-color: #ffffff; border-radius: 0 0 6px 6px;">
        <p>Dear <strong>{{ $employee->full_name }}</strong> (Code: {{ $employee->employee_code }}),</p>

        <p>Your official salary payslip for <strong>{{ $formattedMonth }}</strong> has been generated and released by management.</p>

        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 15px; margin: 20px 0; text-align: center;">
            <span style="font-size: 14px; text-transform: uppercase; color: #64748b; display: block;">Net Disbursement Amount</span>
            <span style="font-size: 24px; font-weight: bold; color: #1F3864;">₹{{ number_format(round((float)$item->net_pay), 2) }}</span>
        </div>

        <p style="font-size: 14px; color: #475569;">
            📎 <strong>Attachment:</strong> Your official PDF payslip document is attached to this email (<code>Payslip_{{ $employee->employee_code }}_{{ $formattedMonth }}.pdf</code>).
        </p>

        <p style="font-size: 12px; color: #94a3b8; margin-top: 30px; text-align: center; border-top: 1px solid #f1f5f9; padding-top: 15px;">
            This is an automated notification from {{ optional($employee->client)->company_name ?: 'Tecla Payroll' }}.
        </p>
    </div>
</body>
</html>
