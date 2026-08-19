<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Employee;
use App\Services\SettingsService;
use App\Services\AuditService;

class ExportController extends Controller
{
    public function exportEmployeeData(Request $request, SettingsService $settings, AuditService $audit)
    {
        $requiresConfirmation = $settings->getAuthSecurity('unmasked_export_requires_confirmation', true);
        
        if ($requiresConfirmation && !$request->has('confirm_unmasked_export')) {
            abort(403, 'Unmasked exports require explicit confirmation.');
        }

        $user = $request->user();
        if ($user && $user->role === 'client' && $request->has('client_id')) {
            if ((int)$request->client_id !== (int)$user->client_id) {
                abort(403, 'Unauthorized client export request.');
            }
        }
        if ($user && $user->role === 'manager' && $request->has('client_id')) {
            if (!$user->isManagerForClient($request->client_id)) {
                abort(403, 'Unauthorized client export request.');
            }
        }

        $audit->log('unmasked_data_export', auth()->user(), null, null, ['target' => 'employees']);

        // Stub for actual CSV generation
        return response()->json(['message' => 'Unmasked data exported successfully']);
    }
}
