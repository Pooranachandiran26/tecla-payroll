<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .header { background: #1e3a8a; color: white; padding: 15px; text-align: center; font-weight: bold; }
        .content { padding: 20px; border: 1px solid #ddd; border-top: none; }
        .meta { font-size: 0.9em; color: #666; margin-top: 20px; border-top: 1px solid #eee; padding-top: 10px; }
        .button { display: inline-block; padding: 10px 20px; background: #1e3a8a; color: white; text-decoration: none; border-radius: 4px; margin-top: 15px; }
        .tag { display: inline-block; padding: 2px 8px; background: #e0f2fe; color: #0284c7; border-radius: 12px; font-size: 0.8em; font-weight: bold; text-transform: uppercase; }
    </style>
</head>
<body>
    <div class="header">
        Tecla Payroll - System Alert
    </div>
    <div class="content">
        <h2>{{ $subjectText }}</h2>
        <span class="tag">{{ $category }}</span>
        
        <p style="margin-top: 20px; white-space: pre-wrap;">{{ $summary }}</p>
        
        @if($contextUrl)
            <a href="{{ $contextUrl }}" class="button">View Details</a>
        @endif
        
        <div class="meta">
            <p><strong>Environment:</strong> {{ app()->environment() }}</p>
            <p><strong>Timestamp:</strong> {{ now()->toDateTimeString() }}</p>
            <p><small>You are receiving this email because you are subscribed to the "{{ $category }}" notification category as a System Watcher.</small></p>
        </div>
    </div>
</body>
</html>
