<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Tecla Payroll</title>
  @php
    $branding = \App\Services\SettingsService::group('branding');
    $faviconUrl = !empty($branding['favicon_path']) ? \Illuminate\Support\Facades\Storage::disk('public')->url($branding['favicon_path']) . '?v=' . time() : '';
    $primaryColor = !empty($branding['primary_color']) ? $branding['primary_color'] : '#1F3864';
    $themeMode = !empty($branding['theme_mode_default']) ? $branding['theme_mode_default'] : 'system';
  @endphp
  @if($faviconUrl)
    <link rel="icon" href="{{ $faviconUrl }}">
  @endif
  @viteReactRefresh
  @vite(['resources/css/app.css', 'resources/js/app.jsx'])
  <style>
    :root {
      --primary-navy: {{ $primaryColor }};
    }
  </style>
  <script>
    (function() {
      const theme = '{{ $themeMode }}';
      if (theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.documentElement.classList.add('dark');
      }
    })();
  </script>
  @routes
  @inertiaHead
</head>
<body>@inertia</body>
</html>
