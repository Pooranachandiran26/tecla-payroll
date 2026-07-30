<!DOCTYPE html>
<html>
<head>
    <title>Tecla Payroll Invitation</title>
</head>
<body style="font-family: sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <h2>Welcome to Tecla Payroll, {{ $user->name }}!</h2>
    <p>You have been invited to access the Tecla Payroll platform. Please click the button below to set your password and complete your registration.</p>
    
    <div style="text-align: center; margin: 30px 0;">
        <a href="{{ $invitationLink }}" style="background-color: #0f172a; color: #fff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: bold; display: inline-block;">Accept Invitation</a>
    </div>

    <p style="font-size: 0.9em; color: #666;">If the button doesn't work, copy and paste this link into your browser:<br>
    <a href="{{ $invitationLink }}">{{ $invitationLink }}</a></p>

    <p>Thanks,<br>The Tecla Payroll Team</p>
</body>
</html>
