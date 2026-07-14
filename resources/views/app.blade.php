<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Tecla Payroll</title>
  @php
    $branding = \App\Services\SettingsService::group('branding');
    $faviconUrl = !empty($branding['favicon_path']) ? \Illuminate\Support\Facades\Storage::disk('public')->url($branding['favicon_path']) : '';
    $primaryColor = !empty($branding['primary_color']) ? $branding['primary_color'] : '#1F3864';
  @endphp
  @if($faviconUrl)
    <link rel="icon" href="{{ $faviconUrl }}">
  @endif
  <style>
    :root {
      --primary-navy: {{ $primaryColor }};
    }
  </style>
  @routes
  @viteReactRefresh
  @vite(['resources/css/app.css', 'resources/js/app.jsx'])
  @inertiaHead
</head>
<body>@inertia</body>
</html>
