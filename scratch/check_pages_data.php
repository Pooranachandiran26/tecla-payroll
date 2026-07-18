<?php

require 'D:/xampp/htdocs/tecla-payroll/vendor/autoload.php';
$app = require_once 'D:/xampp/htdocs/tecla-payroll/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\User;
use Illuminate\Support\Facades\Auth;

// Find an admin user to authenticate
$adminUser = User::where('role', 'admin')->first();
if (!$adminUser) {
    echo "No admin user found!\n";
    exit(1);
}

echo "Authenticated as admin: " . $adminUser->email . " (ID: " . $adminUser->id . ")\n\n";

// Set the acting user for request testing
Auth::login($adminUser);

$urls = [
    'Live Monitor' => '/payroll/live-monitor?client_id=1&date=2026-07-14',
    'Attendance Review' => '/payroll/attendance-review',
    'Payroll Reconciliation' => '/payroll/reconciliation'
];

foreach ($urls as $label => $url) {
    echo "=== FETCHING: {$label} ({$url}) ===\n";
    
    // Create an internal GET request
    $request = Illuminate\Http\Request::create($url, 'GET');
    
    // Handle the request through the kernel
    $response = $app->make(Illuminate\Contracts\Http\Kernel::class)->handle($request);
    
    $status = $response->getStatusCode();
    echo "Status Code: {$status}\n";
    
    if ($status === 200) {
        $content = $response->getContent();
        
        // Find Inertia data-page attribute
        if (preg_match('/data-page="([^"]+)"/', $content, $matches)) {
            $inertiaJson = html_entity_decode($matches[1], ENT_QUOTES, 'UTF-8');
            $pageData = json_decode($inertiaJson, true);
            
            echo "Inertia Component: " . ($pageData['component'] ?? 'Unknown') . "\n";
            
            // Print a summarized view of the props
            $props = $pageData['props'] ?? [];
            echo "Available Prop Keys: " . implode(', ', array_keys($props)) . "\n";
            
            // Look for employee lists or attendance lists in props
            foreach (['attendance', 'punches', 'items', 'employees', 'reconciliationData', 'timesheets', 'clients'] as $propKey) {
                if (isset($props[$propKey])) {
                    $itemCount = is_array($props[$propKey]) ? count($props[$propKey]) : 'not an array';
                    echo "Prop '{$propKey}': Count = {$itemCount}\n";
                    if (is_array($props[$propKey]) && $itemCount > 0) {
                        echo "First 2 items in '{$propKey}':\n";
                        print_r(array_slice($props[$propKey], 0, 2, true));
                    }
                }
            }
        } else {
            echo "Could not find Inertia page JSON payload in HTML output!\n";
        }
    } else {
        echo "Failed to load page. Content preview:\n";
        echo substr($response->getContent(), 0, 1000) . "\n";
    }
    echo "\n";
}
