<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Services\BulkUploadValidationService;
use Inertia\Inertia;

class BulkUploadController extends Controller
{
    protected $validationService;

    public function __construct(BulkUploadValidationService $validationService)
    {
        $this->validationService = $validationService;
    }

    /**
     * Validate an uploaded bulk employee file (Preview only, no writes).
     */
    public function validateUpload(Request $request)
    {
        if (!in_array($request->user()->role, ['admin', 'manager'])) {
            abort(403, 'Unauthorized');
        }

        $request->validate([
            'file' => 'required|file|mimes:csv,txt,xlsx,xls|max:10240', // max 10MB
        ]);

        $file = $request->file('file');
        
        // Store it temporarily
        $extension = $file->getClientOriginalExtension() ?: 'csv';
        $filename = \Illuminate\Support\Str::random(40) . '.' . $extension;
        $file->move(storage_path('app/temp_bulk_uploads'), $filename);
        $fullPath = storage_path('app/temp_bulk_uploads/' . $filename);

        try {
            $results = $this->validationService->validateFile($fullPath);
            
            // Clean up the temp file after reading
            unlink($fullPath);

            return response()->json($results);
        } catch (\Exception $e) {
            if (file_exists($fullPath)) {
                unlink($fullPath);
            }
            return response()->json(['error' => 'Failed to parse file: ' . $e->getMessage()], 422);
        }
    }
    public function executeImport(Request $request, \App\Services\AuditService $auditService)
    {
        if (!in_array($request->user()->role, ['admin', 'manager'])) {
            abort(403, 'Unauthorized');
        }

        $request->validate([
            'file' => 'required|file|mimes:csv,txt,xlsx,xls|max:10240',
        ]);

        $file = $request->file('file');
        
        $extension = $file->getClientOriginalExtension() ?: 'csv';
        $filename = \Illuminate\Support\Str::random(40) . '.' . $extension;
        $file->move(storage_path('app/temp_bulk_uploads'), $filename);
        $fullPath = storage_path('app/temp_bulk_uploads/' . $filename);

        try {
            // Re-validate to ensure nothing has changed or tampered
            $results = $this->validationService->validateFile($fullPath);
            
            if ($results['error_count'] > 0) {
                unlink($fullPath);
                return response()->json(['error' => 'File contains validation errors.', 'results' => $results], 422);
            }

            $importedCount = 0;
            $clientImpacts = [];
            $clientIds = [];

            // Wrap in transaction
            \Illuminate\Support\Facades\DB::beginTransaction();

            try {
                foreach ($results['rows'] as $row) {
                    if ($row['status'] === 'error') {
                        continue;
                    }

                    $dbPayload = $row['db_payload'];
                    $employee = \App\Models\Employee::create($dbPayload);
                    $importedCount++;

                    $clientId = $employee->client_id;
                    $clientIds[$clientId] = true;

                    if (!isset($clientImpacts[$clientId])) {
                        $clientImpacts[$clientId] = [
                            'client_name' => $row['client'],
                            'employee_count' => 0,
                            'total_ctc' => 0,
                        ];
                    }
                    $clientImpacts[$clientId]['employee_count']++;
                    $clientImpacts[$clientId]['total_ctc'] += $employee->ctc_monthly;
                }

                \Illuminate\Support\Facades\DB::commit();

                // Log audit
                $auditService->log(
                    'employee.bulk_imported',
                    $request->user(),
                    null,
                    null,
                    ['count' => $importedCount, 'client_ids' => array_keys($clientIds), 'file_name' => $file->getClientOriginalName()]
                );

            } catch (\Exception $e) {
                \Illuminate\Support\Facades\DB::rollBack();
                // Determine failed row for error response
                $failedRow = isset($row['rowNo']) ? $row['rowNo'] : 'unknown';
                
                if (file_exists($fullPath)) {
                    unlink($fullPath);
                }
                
                return response()->json([
                    'message' => 'Transaction fully rolled back. Zero employees were created.',
                    'failed_row' => $failedRow,
                    'reason' => $e->getMessage(),
                ], 422);
            }

            unlink($fullPath);

            return response()->json([
                'success' => true,
                'message' => "Successfully imported {$importedCount} employees.",
                'summary' => array_values($clientImpacts),
                'results' => $results,
            ]);

        } catch (\Exception $e) {
            if (file_exists($fullPath)) {
                unlink($fullPath);
            }
            return response()->json(['error' => 'Failed to parse file: ' . $e->getMessage()], 422);
        }
    }
}
