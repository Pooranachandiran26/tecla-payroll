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
use OpenSpout\Common\Entity\Style\Style;
use OpenSpout\Common\Entity\Style\Color;

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
     * Serve a downloadable 2-Sheet .xlsx template with monthly summary headers and live context.
     * Sheet 1 (opens first): Reference Info & Rules (styled with generous column widths)
     * Sheet 2: Attendance Entry (data entry tab)
     */
    public function downloadTemplate(Request $request)
    {
        $clientId = $request->query('client_id');
        $targetMonthStr = $request->query('target_month', Carbon::now()->format('Y-m'));

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

        $tempPath = storage_path('app/temp_tmpl_' . \Illuminate\Support\Str::random(16) . '.xlsx');

        $writer = \Spatie\SimpleExcel\SimpleExcelWriter::create($tempPath, 'xlsx', function ($spoutWriter) {
            $options = $spoutWriter->getOptions();
            if (method_exists($options, 'setColumnWidth')) {
                $options->setColumnWidth(35.0, 1);
                $options->setColumnWidth(75.0, 2);
            }
        });

        $headerStyle = (new Style())
            ->setFontBold()
            ->setFontSize(11)
            ->setFontColor(Color::WHITE)
            ->setBackgroundColor('1F3864');

        // --- SHEET 1: "Reference Info & Rules" (FIRST TAB — OPENS BY DEFAULT) ---
        $writer->nameCurrentSheet('Reference Info & Rules');

        // Section 1: Client & Payroll Cycle Timing (Piece 3 fields)
        $writer->addRow(['Section' => '--- CLIENT & PAYROLL CYCLE TIMING ---', 'Details' => ''], $headerStyle);
        $writer->addRow(['Section' => 'Target Client', 'Details' => $context['client_name'] ?? 'N/A']);
        $writer->addRow(['Section' => 'Payroll Target Month', 'Details' => ($context['month_label'] ?? '') . ' (' . $targetMonthVal . ')']);
        $writer->addRow(['Section' => 'Cycle Ends', 'Details' => $context['cycle_ends_formatted'] ?? 'N/A']);
        $writer->addRow(['Section' => 'Target Lock Date', 'Details' => $context['target_lock_date_formatted'] ?? 'N/A']);
        $writer->addRow(['Section' => 'Target Salary Credit', 'Details' => $context['target_salary_credit_formatted'] ?? 'N/A']);
        $writer->addRow(['Section' => '', 'Details' => '']);

        // Section 2: Working Days Breakdown
        $writer->addRow(['Section' => '--- ATTENDANCE BREAKDOWN & RULES ---', 'Details' => ''], $headerStyle);
        $writer->addRow(['Section' => 'Total Calendar Days', 'Details' => (string) ($context['total_calendar_days'] ?? 31)]);
        $writer->addRow(['Section' => 'Off-Days Pattern', 'Details' => ($context['off_days_label'] ?? 'Saturday & Sunday') . ' (' . ($context['off_days_count'] ?? 0) . ' off days)']);
        $writer->addRow(['Section' => 'Workday Holidays Count', 'Details' => (string) ($context['workday_holiday_count'] ?? 0)]);
        $writer->addRow(['Section' => 'Required Working Days Slots', 'Details' => (string) ($context['working_days_slots'] ?? 22)]);
        $writer->addRow(['Section' => '', 'Details' => '']);

        // Section 3: Configured Holidays
        if ($context && !empty($context['holidays'])) {
            $writer->addRow(['Section' => '--- CONFIGURABLE HOLIDAYS ---', 'Details' => ''], $headerStyle);
            foreach ($context['holidays'] as $h) {
                $offText = $h['is_off_day'] ? ' (Falls on Weekly Off)' : ' (Paid Holiday)';
                $writer->addRow(['Section' => $h['date'], 'Details' => $h['name'] . $offText]);
            }
            $writer->addRow(['Section' => '', 'Details' => '']);
        }

        // Section 4: Employees with Custom Off-Day Patterns (Only if overrides exist)
        if (!empty($clientId)) {
            $clientModel = Client::find((int) $clientId);
            $clientDefaultPattern = strtolower($clientModel?->weekly_off_pattern ?? 'sat,sun');

            $overrideEmployees = \App\Models\Employee::where('client_id', $clientId)
                ->where('status', 'active')
                ->whereNotNull('weekly_off_pattern')
                ->where('weekly_off_pattern', '!=', '')
                ->where('weekly_off_pattern', '!=', $clientDefaultPattern)
                ->get();

            if ($overrideEmployees->isNotEmpty()) {
                $writer->addRow(['Section' => '--- EMPLOYEES WITH CUSTOM OFF-DAY PATTERNS ---', 'Details' => ''], $headerStyle);
                $writer->addRow([
                    'Section' => 'Special Rule Note',
                    'Details' => 'These employees have a DIFFERENT weekly off pattern than the client default above. Their required working days differ from the number shown above — check each one individually below.',
                ]);

                foreach ($overrideEmployees as $empOverride) {
                    $empContext = $this->validationService->calculateWorkingDaysContext((int) $clientId, $targetMonthStr, $empOverride);
                    $writer->addRow([
                        'Section' => $empOverride->employee_code . ' (' . $empOverride->full_name . ')',
                        'Details' => $empContext['off_days_label'] . ' → Required Working Days: ' . $empContext['working_days_slots'],
                    ]);
                }
                $writer->addRow(['Section' => '', 'Details' => '']);
            }
        }

        // Section 5: Instruction Rule
        $writer->addRow(['Section' => '--- HOW TO FILL THIS SHEET ---', 'Details' => ''], $headerStyle);
        $writer->addRow(['Section' => 'Data Entry Instructions', 'Details' => 'Switch to Sheet 2 ("Attendance Entry") to enter attendance data. Enter ONLY real working days worked + LOP. For each employee, days_present + days_lop must equal ' . $workingDaysSlots . '.']);

        // --- SHEET 2: "Attendance Entry" (SECOND TAB — DATA ENTRY SHEET) ---
        $writer->addNewSheetAndMakeItCurrent('Attendance Entry');
        if (!empty($sampleEmployees) && count($sampleEmployees) > 0) {
            foreach ($sampleEmployees as $emp) {
                $writer->addRow([
                    'target_month' => $targetMonthVal,
                    'employee_code' => $emp->employee_code,
                    'days_present' => (string) $workingDaysSlots,
                    'days_lop' => '0',
                ]);
            }
        } else {
            $writer->addRow([
                'target_month' => $targetMonthVal,
                'employee_code' => 'TEC-088',
                'days_present' => (string) $workingDaysSlots,
                'days_lop' => '0',
            ]);
        }

        $writer->close();

        return response()->download($tempPath, 'attendance_upload_template.xlsx')->deleteFileAfterSend(true);
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
            'file' => 'required|file|mimes:csv,txt,xlsx,xls|max:10240',
        ]);

        $file = $request->file('file');
        $ext = $file->getClientOriginalExtension() ?: 'csv';
        
        // Save temporarily
        $filename = \Illuminate\Support\Str::random(40) . '.' . $ext;
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
            'file' => 'required|file|mimes:csv,txt,xlsx,xls|max:10240',
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

        $ext = $file->getClientOriginalExtension() ?: 'csv';

        // Save temporarily
        $filename = \Illuminate\Support\Str::random(40) . '.' . $ext;
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
