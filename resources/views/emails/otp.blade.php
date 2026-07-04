<!DOCTYPE html>
<html>
<head>
    <title>Tecla Payroll Verification Code</title>
</head>
<body style="font-family: sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <h2>Your Verification Code</h2>
    <p>Hi {{ $user->name }},</p>
    <p>Please use the following code to complete your login:</p>
    
    <div style="text-align: center; margin: 30px 0;">
        <span style="font-size: 32px; font-weight: bold; letter-spacing: 4px; color: #0f172a; padding: 15px 30px; background-color: #f1f5f9; border-radius: 8px;">{{ $code }}</span>
    </div>

    <p style="font-size: 0.9em; color: #666;">This code will expire in a few minutes. Do not share it with anyone.</p>

    <p>Thanks,<br>The Tecla Payroll Team</p>
</body>
</html>
