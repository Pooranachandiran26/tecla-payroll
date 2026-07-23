<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Client;
use App\Models\AttendanceUploadBatch;
use App\Models\AttendanceRecord;
use App\Services\AttendanceUploadValidationService;
use Inertia\Inertia;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class AttendanceUploadController extends Controller
{
    protected $validationService;

    public function __construct(AttendanceUploadValidationService $validationService)
    {
        $this->validationService = $validationService;
    }

    /**
     * Display the attendance upload screen.
     */
    public function showUploadPage(Request $request)
    {
        if (!in_array($request->user()->role, ['admin', 'manager'])) {
            abort(403, 'Unauthorized');
        }

        $clients = Client::where('status', 'active')->orderBy('id', 'desc')->get(['id', 'company_name']);
        
        return Inertia::render('Payroll/AttendanceUpload', [
            'clients' => $clients
        ]);
    }

    /**
     * Serve a downloadable CSV template with monthly summary headers.
     */
    public function downloadTemplate()
    {
        $headers = [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => 'attachment; filename="attendance_upload_template.csv"',
        ];

        $callback = function () {
            $file = fopen('php://output', 'w');
            
            // CSV Headers — monthly summary format
            fputcsv($file, [
                'employee_code',
                'days_present',
                'days_lop'
            ]);

            // Example row
            fputcsv($file, [
                'TEC-088',
                '22',
                '0'
            ]);

            fclose($file);
        };

        return response()->stream($callback, 200, $headers);
    }

    /**
     * Preview and validate an uploaded CSV file.
     * Now requires target_month to compute working days and live_punch deductions.
     */
    public function validateUpload(Request $request)
    {
        if (!in_array($request->user()->role, ['admin', 'manager'])) {
            abort(403, 'Unauthorized');
        }

        $request->validate([
            'client_id' => 'required|exists:clients,id',
            'target_month' => 'required|string', // Format: YYYY-MM
            'file' => 'required|file|mimes:csv,txt|max:10240',
        ]);

        $file = $request->file('file');
        
        // Save temporarily
        $filename = \Illuminate\Support\Str::random(40) . '.csv';
        $file->move(storage_path('app/temp_attendance_uploads'), $filename);
        $fullPath = storage_path('app/temp_attendance_uploads/' . $filename);

        try {
            $results = $this->validationService->validateFile(
                $fullPath,
                (int) $request->client_id,
                $request->target_month
            );
            @unlink($fullPath);
            return response()->json($results);
        } catch (\Exception $e) {
            if (file_exists($fullPath)) {
                @unlink($fullPath);
            }
            return response()->json(['error' => 'Failed to parse file: ' . $e->getMessage()], 422);
        }
    }

    /**
     * Process validation and commit expanded daily attendance records to the database.
     */
    public function executeUpload(Request $request)
    {
        if (!in_array($request->user()->role, ['admin', 'manager'])) {
            abort(403, 'Unauthorized');
        }

        $request->validate([
            'client_id' => 'required|exists:clients,id',
            'target_month' => 'required|string', // Format: "YYYY-MM"
            'file' => 'required|file|mimes:csv,txt|max:10240',
        ]);

        $file = $request->file('file');
        $clientId = (int) $request->client_id;

        // Resolve target month first day
        $targetMonthStr = $request->target_month; // Expected YYYY-MM
        try {
            $targetMonth = Carbon::parse($targetMonthStr . '-01')->toDateString();
        } catch (\Exception $e) {
            return back()->with('error', 'Invalid target month format.');
        }

        // Save temporarily
        $filename = \Illuminate\Support\Str::random(40) . '.csv';
        $file->move(storage_path('app/temp_attendance_uploads'), $filename);
        $fullPath = storage_path('app/temp_attendance_uploads/' . $filename);

        try {
            $results = $this->validationService->validateFile($fullPath, $clientId, $targetMonthStr);

            if ($results['matched_rows'] === 0) {
                @unlink($fullPath);
                return back()->with('error', 'No valid rows found in CSV to upload.');
            }

            // Wrap in database transaction
            DB::beginTransaction();

            try {
                // Create Batch Entry
                $batch = AttendanceUploadBatch::create([
                    'client_id' => $clientId,
                    'target_month' => $targetMonth,
                    'uploaded_file_name' => $file->getClientOriginalName(),
                    'total_rows' => $results['total_rows'],
                    'matched_rows' => $results['matched_rows'],
                    'status' => 'pending_verification',
                    'uploaded_by' => $request->user()->id,
                ]);

                // Insert expanded daily records
                foreach ($results['rows'] as $row) {
                    if ($row['status'] !== 'valid') {
                        continue;
                    }

                    foreach ($row['db_payloads'] as $payload) {
                        $payload['uploaded_batch_id'] = $batch->id;

                        AttendanceRecord::updateOrCreate(
                            [
                                'employee_id' => $payload['employee_id'],
                                'attendance_date' => $payload['attendance_date']
                            ],
                            $payload
                        );
                    }
                }

                DB::commit();
                @unlink($fullPath);

                return redirect()->route('payroll.live-monitor', [
                    'client_id' => $clientId,
                    'date' => Carbon::now()->toDateString()
                ])->with('success', 'Attendance timesheet uploaded and processed successfully.');

            } catch (\Exception $e) {
                DB::rollBack();
                @unlink($fullPath);
                return back()->with('error', 'Failed to save attendance database records: ' . $e->getMessage());
            }

        } catch (\Exception $e) {
            if (file_exists($fullPath)) {
                @unlink($fullPath);
            }
            return back()->with('error', 'Failed to parse timesheet file: ' . $e->getMessage());
        }
    }
}
