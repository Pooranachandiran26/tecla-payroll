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
     * Get working days context and holiday list for a client and target month.
     * Uses AttendanceUploadValidationService::calculateWorkingDaysContext as the single source of truth.
     */
    public function getContext(Request $request)
    {
        if (!in_array($request->user()->role, ['admin', 'manager'])) {
            abort(403, 'Unauthorized');
        }

        $request->validate([
            'client_id' => 'required|exists:clients,id',
            'target_month' => 'required|string',
        ]);

        $context = $this->validationService->calculateWorkingDaysContext(
            (int) $request->client_id,
            $request->target_month
        );

        return response()->json($context);
    }

    /**
     * Serve a downloadable CSV template with monthly summary headers and live context.
     */
    public function downloadTemplate(Request $request)
    {
        $clientId = $request->query('client_id');
        $targetMonthStr = $request->query('target_month', Carbon::now()->format('Y-m'));

        $headers = [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="attendance_upload_template.csv"',
        ];

        $context = null;
        $sampleEmployees = [];
        if (!empty($clientId)) {
            $context = $this->validationService->calculateWorkingDaysContext((int) $clientId, $targetMonthStr);
            $sampleEmployees = \App\Models\Employee::where('client_id', $clientId)
                ->where('status', 'active')
                ->limit(5)
                ->get();
        }

        $targetMonthVal = $context ? $context['target_month'] : $targetMonthStr;
        $workingDaysSlots = $context ? $context['working_days_slots'] : 22;

        $callback = function () use ($targetMonthVal, $workingDaysSlots, $sampleEmployees, $context) {
            $file = fopen('php://output', 'w');
            
            // CSV Headers — monthly summary format with target_month
            fputcsv($file, [
                'target_month',
                'employee_code',
                'days_present',
                'days_lop'
            ]);

            // Pre-populated sample rows
            if (!empty($sampleEmployees) && count($sampleEmployees) > 0) {
                foreach ($sampleEmployees as $emp) {
                    fputcsv($file, [
                        $targetMonthVal,
                        $emp->employee_code,
                        (string) $workingDaysSlots,
                        '0'
                    ]);
                }
            } else {
                fputcsv($file, [
                    $targetMonthVal,
                    'TEC-088',
                    (string) $workingDaysSlots,
                    '0'
                ]);
            }

            // Reference Info Block (lines starting with #)
            fputcsv($file, []);
            fputcsv($file, ['# ==============================================================================']);
            fputcsv($file, ['# REFERENCE INFO & CLIENT RULES (Do not edit these reference lines)']);
            fputcsv($file, ['# ==============================================================================']);

            if ($context) {
                fputcsv($file, ['# Target Client: ' . $context['client_name']]);
                fputcsv($file, ['# Payroll Target Month: ' . $context['month_label'] . ' (' . $context['target_month'] . ')']);
                fputcsv($file, ['# Total Calendar Days: ' . $context['total_calendar_days']]);
                fputcsv($file, ['# Off-Days Pattern: ' . $context['off_days_label'] . ' (' . $context['off_days_count'] . ' off days)']);
                fputcsv($file, ['# Workday Holidays Count: ' . $context['workday_holiday_count']]);
                fputcsv($file, ['# Required Working Days Slots: ' . $context['working_days_slots']]);
                fputcsv($file, ['# Rule: Enter ONLY real working days worked + LOP. For each employee, days_present + days_lop must equal ' . $context['working_days_slots'] . '.']);
                
                if (!empty($context['holidays'])) {
                    fputcsv($file, ['# Configured Holidays:']);
                    foreach ($context['holidays'] as $h) {
                        $offText = $h['is_off_day'] ? ' (Falls on Weekly Off)' : ' (Paid Holiday)';
                        fputcsv($file, ['#   - ' . $h['date'] . ': ' . $h['name'] . $offText]);
                    }
                }
            } else {
                fputcsv($file, ['# Target Month: ' . $targetMonthVal]);
                fputcsv($file, ['# Rule: Enter ONLY real working days worked + LOP.']);
            }

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
