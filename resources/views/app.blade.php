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
    $accentGoldColor = !empty($branding['accent_gold_color']) ? $branding['accent_gold_color'] : '#B8860B';
    $accentGoldHoverColor = !empty($branding['accent_gold_hover_color']) ? $branding['accent_gold_hover_color'] : '#9c7109';
    $headerTextColor = !empty($branding['header_text_color']) ? $branding['header_text_color'] : '#FFFFFF';
    $cardCornerRadius = !empty($branding['card_corner_radius']) ? $branding['card_corner_radius'] . 'px' : '8px';
    $tableDensity = !empty($branding['table_density']) ? $branding['table_density'] : 'comfortable';
    $tableCellPadding = ($tableDensity === 'compact') ? '0.35rem 0.75rem' : '0.75rem 1rem';
    $fontFamilyKey = !empty($branding['font_family']) ? $branding['font_family'] : 'inter';
    $fontFamilyMap = [
      'inter'   => "'Inter', 'Segoe UI', -apple-system, sans-serif",
      'roboto'  => "'Roboto', 'Segoe UI', -apple-system, sans-serif",
      'outfit'  => "'Outfit', 'Segoe UI', -apple-system, sans-serif",
      'poppins' => "'Poppins', 'Segoe UI', -apple-system, sans-serif",
    ];
    $fontFamilyCss = $fontFamilyMap[$fontFamilyKey] ?? $fontFamilyMap['inter'];
    $containerLayoutWidth = !empty($branding['container_layout_width']) ? $branding['container_layout_width'] : 'standard';
    $containerMaxWidth = ($containerLayoutWidth === 'full') ? '100%' : '1280px';
    $themeMode = !empty($branding['theme_mode_default']) ? $branding['theme_mode_default'] : 'system';
  @endphp
  @if($faviconUrl)
    <link rel="icon" href="{{ $faviconUrl }}">
  @endif
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Outfit:wght@400;500;600;700;800&family=Poppins:wght@400;500;600;700&family=Roboto:wght@400;500;700&display=swap" rel="stylesheet">
  @viteReactRefresh
  @vite(['resources/css/app.css', 'resources/js/app.jsx'])
  <style>
    :root {
      --primary-navy: {{ $primaryColor }};
      --accent-gold: {{ $accentGoldColor }};
      --accent-gold-hover: {{ $accentGoldHoverColor }};
      --header-text-color: {{ $headerTextColor }};
      --radius-md: {{ $cardCornerRadius }};
      --table-cell-padding: {{ $tableCellPadding }};
      --font-family-base: {!! $fontFamilyCss !!};
      --container-max-width: {{ $containerMaxWidth }};
    }
    body {
      font-family: var(--font-family-base) !important;
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
