<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>403 - Access Restricted | Tecla Payroll</title>
    <style>
        body { font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; background-color: #F8FAFC; color: #1E293B; margin: 0; padding: 0; display: flex; flex-direction: column; min-height: 100vh; }
        header { background-color: #1F3864; color: #FFFFFF; padding: 1rem 2rem; display: flex; align-items: center; justify-content: space-between; }
        .logo { font-size: 1.25rem; font-weight: 800; letter-spacing: 0.05em; text-decoration: none; color: #FFFFFF; }
        .container { display: flex; flex: 1; align-items: center; justify-content: center; padding: 2rem 1rem; }
        .card { background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 16px; padding: 3rem 2.5rem; max-width: 540px; width: 100%; text-align: center; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.05); }
        .icon-circle { width: 80px; height: 80px; border-radius: 50%; background-color: #FEF3C7; color: #D97706; display: flex; align-items: center; justify-content: center; margin: 0 auto 1.5rem auto; font-size: 2.2rem; font-weight: bold; }
        h1 { font-size: 1.6rem; font-weight: 800; color: #1F3864; margin-bottom: 0.5rem; }
        p { font-size: 0.95rem; color: #64748B; line-height: 1.6; margin-bottom: 2rem; }
        .btn-group { display: flex; gap: 0.75rem; justify-content: center; flex-wrap: wrap; }
        .btn { display: inline-flex; align-items: center; gap: 6px; padding: 0.6rem 1.25rem; font-size: 0.88rem; font-weight: 600; border-radius: 8px; text-decoration: none; cursor: pointer; border: none; }
        .btn-secondary { background: #F1F5F9; color: #334155; border: 1px solid #CBD5E1; }
        .btn-navy { background: #1F3864; color: #FFFFFF; }
    </style>
</head>
<body>
    <header>
        <a href="/dashboard" class="logo">▲ TECLA PAYROLL</a>
    </header>
    <div class="container">
        <div class="card">
            <div class="icon-circle">🛡️</div>
            <h1>403: Access Restricted</h1>
            <p>{{ $exception->getMessage() ?: 'Sorry, you do not have permission or role clearance to access this module or resource.' }}</p>
            <div class="btn-group">
                <button onclick="window.history.back()" class="btn btn-secondary">← Go Back</button>
                <a href="/dashboard" class="btn btn-navy">🏠 Return to Dashboard</a>
            </div>
        </div>
    </div>
</body>
</html>
