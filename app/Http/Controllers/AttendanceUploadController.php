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

        $clientsQuery = Client::where('status', 'active');
        if ($request->user()->role === 'manager') {
            $clientsQuery->whereIn('id', $request->user()->getManagedClientIds());
        }
        $clients = $clientsQuery->orderBy('id', 'desc')->get(['id', 'company_name']);
        
        $uploadHistory = \App\Models\BulkUploadBatch::with('user:id,name,email,role')
            ->forUser($request->user())
            ->where('type', 'attendance')
            ->latest()
            ->take(15)
            ->get()
            ->map(function ($b) {
                return [
                    'id' => $b->id,
                    'file_name' => $b->file_name,
                    'status' => $b->status,
                    'total_rows' => $b->total_rows,
                    'processed_rows' => $b->processed_rows,
                    'valid_count' => $b->valid_count,
                    'error_count' => $b->error_count,
                    'warning_count' => $b->warning_count,
                    'created_at' => $b->created_at ? $b->created_at->toDateTimeString() : null,
                    'user' => $b->user ? [
                        'name' => $b->user->name,
                        'email' => $b->user->email,
                        'role' => $b->user->role,
                    ] : null,
                ];
            });

        return Inertia::render('Payroll/AttendanceUpload', [
            'clients' => $clients,
            'upload_history' => $uploadHistory,
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
        $referenceEmployees = [];
        $allActiveEmployees = [];
        if (!empty($clientId)) {
            $context = $this->validationService->calculateWorkingDaysContext((int) $clientId, $targetMonthStr);
            $referenceEmployees = \App\Models\Employee::where('client_id', $clientId)
                ->where('status', 'active')
                ->limit(50)
                ->get();
            $allActiveEmployees = \App\Models\Employee::where('client_id', $clientId)
                ->where('status', 'active')
                ->get();
        }

        $targetMonthVal = $context ? $context['target_month'] : $targetMonthStr;
        $workingDaysSlots = $context ? $context['working_days_slots'] : 22;

        $tempPath = storage_path('app/temp_tmpl_' . \Illuminate\Support\Str::random(16) . '.xlsx');

        $writer = \Spatie\SimpleExcel\SimpleExcelWriter::create($tempPath, 'xlsx', function ($spoutWriter) {
            $options = $spoutWriter->getOptions();
            if (method_exists($options, 'setColumnWidth')) {
                $options->setColumnWidth(40.0, 1);
                $options->setColumnWidth(75.0, 2);
                $options->setColumnWidth(25.0, 3);
                $options->setColumnWidth(18.0, 4);
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
        $monthStart = \Carbon\Carbon::parse($targetMonthVal . '-01');
        $monthEnd = $monthStart->copy()->endOfMonth();

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
                    'Details' => 'Custom weekly off pattern. Required working days differ from client default.',
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

            // Section 4B: Mid-Month Joiners & Partial-Month Tracking Employees
            $midMonthList = [];
            foreach ($referenceEmployees as $sampleEmp) {
                $empStart = \Carbon\Carbon::parse($sampleEmp->date_of_joining)->startOfDay();
                if (!empty($sampleEmp->attendance_tracking_start_date)) {
                    $atsd = \Carbon\Carbon::parse($sampleEmp->attendance_tracking_start_date)->startOfDay();
                    if ($atsd->gt($empStart)) {
                        $empStart = $atsd->copy();
                    }
                }
                if ($empStart->gt($monthStart) && $empStart->lte($monthEnd)) {
                    $empCtx = $this->validationService->calculateWorkingDaysContext((int) $clientId, $targetMonthStr, $sampleEmp);
                    $existingPunches = $empCtx['existing_punches_count'];
                    $netSlots = $empCtx['net_available_slots'];

                    $midMonthList[] = [
                        'emp' => $sampleEmp,
                        'start_date' => $empStart->format('M d, Y'),
                        'total_slots' => $empCtx['working_days_slots'],
                        'punches' => $existingPunches,
                        'slots' => $netSlots,
                    ];
                }
            }

            if (!empty($midMonthList)) {
                $writer->addRow(['Section' => '--- MID-MONTH JOINERS & PARTIAL-MONTH TRACKING EMPLOYEES ---', 'Details' => ''], $headerStyle);
                $writer->addRow([
                    'Section' => 'Special Joining Note',
                    'Details' => 'Joined mid-month. Max available working days are lower than full month slots.',
                ]);

                foreach ($midMonthList as $mm) {
                    $punchNote = $mm['punches'] > 0 ? " ({$mm['total_slots']} Total - {$mm['punches']} Live Punches)" : '';
                    $writer->addRow([
                        'Section' => $mm['emp']->employee_code . ' (' . $mm['emp']->full_name . ')',
                        'Details' => 'Joined: ' . $mm['start_date'] . ' | Max Working Days: ' . $mm['slots'] . $punchNote,
                    ]);
                }
                $writer->addRow(['Section' => '', 'Details' => '']);
            }

            // Section 4C: Full-Month Employees with Existing Live Punches
            $punchedFullMonth = [];
            foreach ($referenceEmployees as $sampleEmp) {
                $empStart = \Carbon\Carbon::parse($sampleEmp->date_of_joining)->startOfDay();
                if (!empty($sampleEmp->attendance_tracking_start_date)) {
                    $atsd = \Carbon\Carbon::parse($sampleEmp->attendance_tracking_start_date)->startOfDay();
                    if ($atsd->gt($empStart)) {
                        $empStart = $atsd->copy();
                    }
                }
                $isMidMonth = $empStart->gt($monthStart) && $empStart->lte($monthEnd);
                if (!$isMidMonth) {
                    $empCtx = $this->validationService->calculateWorkingDaysContext((int) $clientId, $targetMonthStr, $sampleEmp);
                    if ($empCtx['existing_punches_count'] > 0) {
                        $punchedFullMonth[] = [
                            'emp' => $sampleEmp,
                            'total_slots' => $empCtx['working_days_slots'],
                            'punches' => $empCtx['existing_punches_count'],
                            'slots' => $empCtx['net_available_slots'],
                        ];
                    }
                }
            }

            if (!empty($punchedFullMonth)) {
                $writer->addRow(['Section' => '--- EMPLOYEES WITH EXISTING LIVE PUNCHES ---', 'Details' => ''], $headerStyle);
                $writer->addRow([
                    'Section' => 'Live Punch Note',
                    'Details' => 'These employees have existing live punches logged. Remaining available days are adjusted below.',
                ]);

                foreach ($punchedFullMonth as $pfm) {
                    $writer->addRow([
                        'Section' => $pfm['emp']->employee_code . ' (' . $pfm['emp']->full_name . ')',
                        'Details' => 'Max Working Days: ' . $pfm['slots'] . ' (' . $pfm['total_slots'] . ' Total - ' . $pfm['punches'] . ' Live Punches)',
                    ]);
                }
                $writer->addRow(['Section' => '', 'Details' => '']);
            }
        }

        // Section 5: Instruction Rule
        $writer->addRow(['Section' => '--- HOW TO FILL THIS SHEET ---', 'Details' => ''], $headerStyle);
        $writer->addRow(['Section' => 'Data Entry Instructions', 'Details' => 'In Sheet 2, enter working days + LOP. Total (present + LOP) must match required days for each employee.']);

        // --- SHEET 2: "Attendance Entry" (SECOND TAB — DATA ENTRY SHEET) ---
        $writer->addNewSheetAndMakeItCurrent('Attendance Entry');
        if (!empty($allActiveEmployees) && count($allActiveEmployees) > 0) {
            foreach ($allActiveEmployees as $emp) {
                // Auto-detect mid-month joiners & custom weekly off pattern employees to pre-fill their exact max available working days
                $empStart = \Carbon\Carbon::parse($emp->date_of_joining)->startOfDay();
                if (!empty($emp->attendance_tracking_start_date)) {
                    $atsd = \Carbon\Carbon::parse($emp->attendance_tracking_start_date)->startOfDay();
                    if ($atsd->gt($empStart)) {
                        $empStart = $atsd->copy();
                    }
                }
                $isMidMonth = $empStart->gt($monthStart) && $empStart->lte($monthEnd);
                $hasCustomPattern = !empty($emp->weekly_off_pattern) && strtolower($emp->weekly_off_pattern) !== ($clientDefaultPattern ?? 'sat,sun');

                if ($isMidMonth || $hasCustomPattern) {
                    $empCtx = $this->validationService->calculateWorkingDaysContext((int) $clientId, $targetMonthStr, $emp);
                    $empWorkingDays = $empCtx['net_available_slots'];
                } else {
                    $empWorkingDays = $workingDaysSlots;
                }

                $writer->addRow([
                    'target_month' => $targetMonthVal,
                    'employee_code' => $emp->employee_code,
                    'days_present' => (string) $empWorkingDays,
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
            'file' => 'required|file|mimes:csv,txt,xlsx,xls|max:102400',
        ]);

        $clientId = (int) $request->client_id;
        $targetMonthStr = $request->target_month;
        $user = $request->user();

        // 1. Locked Payroll Run Period Guard Check (Lock Guard)
        $monthStart = Carbon::parse($targetMonthStr . '-01');
        $hasLockedPeriod = DB::table('payroll_runs')
            ->where('client_id', $clientId)
            ->where('payroll_month', $monthStart->toDateString())
            ->where('status', 'locked')
            ->exists();

        if ($hasLockedPeriod) {
            $monthLabel = $monthStart->format('F Y');
            return response()->json([
                'error' => "⚠️ Already Locked Period — Payroll for {$monthLabel} is already locked for this client. Use Payroll Correction instead."
            ], 422);
        }

        $file = $request->file('file');
        $ext = $file->getClientOriginalExtension() ?: 'csv';
        
        $batchId = (string) \Illuminate\Support\Str::uuid();
        $filename = $batchId . '.' . $ext;

        if (!is_dir(storage_path('app/temp_attendance_uploads'))) {
            mkdir(storage_path('app/temp_attendance_uploads'), 0755, true);
        }

        $file->move(storage_path('app/temp_attendance_uploads'), $filename);
        $fullPath = storage_path('app/temp_attendance_uploads/' . $filename);

        try {
            set_time_limit(300); // Allow up to 5 minutes for large file validation

            $results = $this->validationService->validateFile(
                $fullPath,
                $clientId,
                $targetMonthStr,
                $batchId
            );

            // Create pending BulkUploadBatch directly in database (advanced, cache-less method)
            \App\Models\BulkUploadBatch::create([
                'id' => $batchId,
                'user_id' => $user->id,
                'type' => 'attendance',
                'client_id' => $clientId,
                'target_month' => $monthStart->toDateString(),
                'file_name' => $file->getClientOriginalName(),
                'file_path' => $fullPath,
                'status' => 'pending',
                'total_rows' => $results['total_rows'] ?? 0,
                'processed_rows' => 0,
                'valid_count' => $results['matched_rows'] ?? 0,
                'error_count' => $results['error_count'] ?? 0,
                'warning_count' => $results['skipped_count'] ?? 0,
            ]);

            // Keep Cache write for backward compatibility
            \Illuminate\Support\Facades\Cache::put('attendance_upload_session_' . $user->id, [
                'batch_id' => $batchId,
                'client_id' => $clientId,
                'target_month' => $targetMonthStr,
                'file_name' => $file->getClientOriginalName(),
                'file_path' => $fullPath,
                'total_rows' => $results['total_rows'] ?? 0,
                'matched_rows' => $results['matched_rows'] ?? 0,
                'error_count' => $results['error_count'] ?? 0,
                'skipped_count' => $results['skipped_count'] ?? 0,
            ], 600);

            return response()->json(array_merge($results, [
                'batch_id' => $batchId,
            ]));
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
            'file' => 'required|file|mimes:csv,txt,xlsx,xls|max:102400',
        ]);

        $clientId = (int) $request->client_id;
        $targetMonthStr = $request->target_month;
        $monthStart = Carbon::parse($targetMonthStr . '-01');

        // Check lock guard
        $hasLockedPeriod = DB::table('payroll_runs')
            ->where('client_id', $clientId)
            ->where('payroll_month', $monthStart->toDateString())
            ->where('status', 'locked')
            ->exists();

        if ($hasLockedPeriod) {
            $monthLabel = $monthStart->format('F Y');
            return back()->with('error', "⚠️ Already Locked Period — Payroll for {$monthLabel} is already locked for this client.");
        }

        $file = $request->file('file');
        $ext = $file->getClientOriginalExtension() ?: 'csv';
        
        $batchId = (string) \Illuminate\Support\Str::uuid();
        $filename = $batchId . '.' . $ext;

        $file->move(storage_path('app/temp_attendance_uploads'), $filename);
        $fullPath = storage_path('app/temp_attendance_uploads/' . $filename);

        try {
            set_time_limit(300); // Allow up to 5 minutes for large file processing

            // Write staging rows
            $results = $this->validationService->validateFile($fullPath, $clientId, $targetMonthStr, $batchId);

            if ($results['matched_rows'] === 0) {
                @unlink($fullPath);
                return back()->with('error', 'No valid rows found in CSV to upload.');
            }

            // Sync import directly inside transaction
            DB::beginTransaction();
            try {
                $batch = \App\Models\BulkUploadBatch::create([
                    'id' => $batchId,
                    'user_id' => $request->user()->id,
                    'type' => 'attendance',
                    'client_id' => $clientId,
                    'target_month' => $monthStart->toDateString(),
                    'file_name' => $file->getClientOriginalName(),
                    'file_path' => '',
                    'status' => 'completed',
                    'total_rows' => $results['total_rows'],
                    'processed_rows' => $results['total_rows'],
                    'valid_count' => $results['matched_rows'],
                    'error_count' => $results['error_count'],
                    'warning_count' => $results['skipped_count'],
                ]);

                \App\Models\AttendanceUploadBatch::create([
                    'client_id' => $clientId,
                    'target_month' => $monthStart->toDateString(),
                    'uploaded_file_name' => $file->getClientOriginalName(),
                    'total_rows' => $results['total_rows'],
                    'matched_rows' => $results['matched_rows'],
                    'status' => 'approved',
                    'uploaded_by' => $request->user()->id,
                    'created_by' => $request->user()->id,
                    'updated_by' => $request->user()->id,
                ]);

                $stagingRows = DB::table('attendance_upload_staging_rows')
                    ->where('batch_id', $batchId)
                    ->where('status', 'ready')
                    ->get();

                // Preload employees and context for expansion
                $empMap = \App\Models\Employee::where('client_id', $clientId)->get()->keyBy('employee_code');
                $clientModel = \App\Models\Client::find($clientId);
                $monthEnd = $monthStart->copy()->endOfMonth();
                $clientHolidayDates = \App\Models\Holiday::where('client_id', $clientId)
                    ->whereBetween('holiday_date', [$monthStart->toDateString(), $monthEnd->toDateString()])
                    ->pluck('holiday_date')
                    ->map(fn($d) => Carbon::parse($d)->toDateString())
                    ->toArray();
                $punchDatesMap = AttendanceRecord::whereIn('employee_id', $empMap->pluck('id'))
                    ->whereBetween('attendance_date', [$monthStart->toDateString(), $monthEnd->toDateString()])
                    ->whereIn('source', ['live_punch', 'override'])
                    ->get(['employee_id', 'attendance_date'])
                    ->groupBy('employee_id')
                    ->map(fn($g) => $g->pluck('attendance_date')->map(fn($d) => Carbon::parse($d)->toDateString())->toArray())
                    ->toArray();

                foreach ($stagingRows as $row) {
                    $emp = $empMap->get($row->employee_code);
                    if (!$emp) continue;

                    $empStart = Carbon::parse($emp->date_of_joining)->startOfDay();
                    if (!empty($emp->attendance_tracking_start_date)) {
                        $atsd = Carbon::parse($emp->attendance_tracking_start_date)->startOfDay();
                        if ($atsd->gt($empStart)) $empStart = $atsd->copy();
                    }
                    $effectiveStart = $monthStart->gt($empStart) ? $monthStart->copy() : $empStart->copy();
                    $pattern = $emp->weekly_off_pattern ?? $clientModel->weekly_off_pattern ?? 'sat,sun';
                    $offDays = array_map('trim', explode(',', strtolower($pattern)));

                    $dailyPayloads = $this->validationService->expandToDaily(
                        $emp->id,
                        (int) $row->days_present,
                        (int) $row->days_lop,
                        $effectiveStart,
                        $monthEnd,
                        $offDays,
                        $clientHolidayDates,
                        $punchDatesMap[$emp->id] ?? []
                    );

                    foreach ($dailyPayloads as $payload) {
                        $payload['uploaded_batch_id'] = $batchId;

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

                return redirect()->route('payroll.attendance-review', [
                    'client_id' => $clientId,
                    'month' => $targetMonthStr
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

    /**
     * Dispatch background upload job
     */
    public function uploadAsync(Request $request)
    {
        if (!in_array($request->user()->role, ['admin', 'manager'])) {
            abort(403, 'Unauthorized');
        }

        $request->validate([
            'batch_id' => 'required|string',
            'partial_import' => 'nullable|boolean',
        ]);

        $batchId = $request->batch_id;
        $partialImport = $request->boolean('partial_import', false);
        $user = $request->user();

        set_time_limit(300); // Allow up to 5 minutes for processing batch import

        // 1. Look up pending batch directly from database (advanced, cache-less method)
        $batch = \App\Models\BulkUploadBatch::where('id', $batchId)
            ->where('status', 'pending')
            ->first();

        if ($batch) {
            $batch->update([
                'status' => 'processing',
                'partial_import' => $partialImport,
            ]);
            \Illuminate\Support\Facades\Cache::forget('attendance_upload_session_' . $user->id);
        } else {
            // Fallback to cache for backward compatibility / sync methods
            $activeSession = \Illuminate\Support\Facades\Cache::get('attendance_upload_session_' . $user->id);
            if (!$activeSession || $activeSession['batch_id'] !== $batchId) {
                return response()->json(['error' => 'Active upload session not found or expired.'], 422);
            }

            $clientId = $activeSession['client_id'];
            $targetMonthStr = $activeSession['target_month'];
            $monthStart = Carbon::parse($targetMonthStr . '-01');

            $batch = \App\Models\BulkUploadBatch::create([
                'id' => $batchId,
                'user_id' => $user->id,
                'type' => 'attendance',
                'client_id' => $clientId,
                'target_month' => $monthStart->toDateString(),
                'file_name' => $activeSession['file_name'],
                'file_path' => $activeSession['file_path'],
                'status' => 'processing',
                'total_rows' => $activeSession['total_rows'],
                'processed_rows' => 0,
                'valid_count' => $activeSession['matched_rows'],
                'error_count' => $activeSession['error_count'],
                'warning_count' => $activeSession['skipped_count'],
                'partial_import' => $partialImport,
            ]);

            \Illuminate\Support\Facades\Cache::forget('attendance_upload_session_' . $user->id);
        }

        \App\Jobs\ProcessAttendanceBulkUploadJob::dispatchSync($batchId);

        $batch->refresh();

        return response()->json([
            'success' => true,
            'batch_id' => $batchId,
            'status' => $batch->status,
            'progress_percentage' => 100,
            'processed_rows' => $batch->processed_rows,
            'total_rows' => $batch->total_rows,
            'valid_count' => $batch->valid_count,
            'error_count' => $batch->error_count,
            'message' => $batch->status === 'completed'
                ? 'Attendance processed successfully!'
                : 'Processing failed: ' . $batch->error_message,
        ]);
    }

    /**
     * Display the attendance upload history screen.
     */
    public function history(Request $request)
    {
        $user = $request->user();
        if (!in_array($user->role, ['admin', 'manager'])) {
            abort(403, 'Unauthorized');
        }

        $query = \App\Models\BulkUploadBatch::with(['user:id,name,email,role', 'client:id,company_name'])
            ->where('type', 'attendance')
            ->forUser($user)
            ->orderBy('created_at', 'desc');

        $batches = $query->paginate(15);

        $statsQuery = \App\Models\BulkUploadBatch::where('type', 'attendance')->forUser($user);
        $totalUploads = $statsQuery->count();
        $totalRecords = $statsQuery->sum('total_rows');
        $totalValid = $statsQuery->sum('valid_count');
        $successRate = $totalRecords > 0 ? round(($totalValid / $totalRecords) * 100) : 0;
        
        $avgSpeed = '—';
        $avgSpeedMs = $statsQuery->whereNotNull('processing_time_ms')->avg('processing_time_ms');
        if ($avgSpeedMs) {
            $avgSpeed = round($avgSpeedMs / 1000, 2) . 's';
        }

        return Inertia::render('Payroll/AttendanceUploadHistory', [
            'batches' => $batches,
            'kpis' => [
                'total_uploads' => $totalUploads,
                'total_records' => $totalRecords,
                'success_rate' => $successRate,
                'avg_speed' => $avgSpeed,
            ],
        ]);
    }

    /**
     * Get details for a specific attendance upload batch (staging rows)
     */
    public function getBatchDetails(Request $request, string $batchId)
    {
        $user = $request->user();
        if (!in_array($user->role, ['admin', 'manager'])) {
            abort(403, 'Unauthorized');
        }

        $batch = \App\Models\BulkUploadBatch::with(['user:id,name,email,role', 'client:id,company_name'])
            ->where('type', 'attendance')
            ->forUser($user)
            ->where('id', $batchId)
            ->firstOrFail();

        $rowsQuery = DB::table('attendance_upload_staging_rows')
            ->where('batch_id', $batchId);

        if ($user->role === 'manager') {
            $managedClientIds = $user->getManagedClientIds();
            if (!empty($managedClientIds)) {
                $rowsQuery->whereIn('client_id', $managedClientIds);
            }
        }

        $rows = $rowsQuery->get()->map(function ($r) {
            return [
                'id' => $r->id,
                'employee_code' => $r->employee_code,
                'full_name' => $r->full_name,
                'days_present' => (float)$r->days_present,
                'days_lop' => (float)$r->days_lop,
                'status' => $r->status,
                'error_message' => $r->error_message,
                'raw_data' => json_decode($r->raw_data, true) ?: [],
            ];
        });

        if ($rows->isEmpty() && $batch->status === 'completed' && $batch->valid_count > 0) {
            $attendanceRecords = AttendanceRecord::where('uploaded_batch_id', $batchId)
                ->with('employee:id,employee_code,full_name')
                ->get()
                ->groupBy('employee_id');

            $rows = $attendanceRecords->values()->map(function ($group, $index) {
                $first = $group->first();
                $presentCount = $group->where('is_present', true)->count();
                $lopCount = $group->where('is_lop', true)->count();
                return [
                    'id' => $index + 1,
                    'employee_code' => $first->employee->employee_code ?? 'N/A',
                    'full_name' => $first->employee->full_name ?? 'N/A',
                    'days_present' => (float)$presentCount,
                    'days_lop' => (float)$lopCount,
                    'status' => 'ready',
                    'error_message' => null,
                    'raw_data' => [],
                ];
            });
        }

        return response()->json([
            'batch' => $batch,
            'rows' => $rows,
        ]);
    }

    /**
     * Download Error Report CSV for Attendance history batch
     */
    public function downloadHistoryErrors(Request $request, string $batchId)
    {
        $user = $request->user();
        if (!in_array($user->role, ['admin', 'manager'])) {
            abort(403, 'Unauthorized');
        }

        $batch = \App\Models\BulkUploadBatch::where('type', 'attendance')
            ->forUser($user)
            ->where('id', $batchId)
            ->firstOrFail();

        $rowsQuery = DB::table('attendance_upload_staging_rows')
            ->where('batch_id', $batchId)
            ->where('status', 'error');

        if ($user->role === 'manager') {
            $managedClientIds = $user->getManagedClientIds();
            if (!empty($managedClientIds)) {
                $rowsQuery->whereIn('client_id', $managedClientIds);
            }
        }

        $errorRows = $rowsQuery->get();

        $filename = 'Attendance_Errors_Batch_' . substr($batchId, 0, 8) . '.csv';
        
        $headers = [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => 'attachment; filename="' . $filename . '"',
            'Cache-Control' => 'no-cache, no-store, must-revalidate',
            'Pragma' => 'no-cache',
            'Expires' => '0',
        ];

        $callback = function () use ($errorRows) {
            $file = fopen('php://output', 'w');
            fputcsv($file, ['Employee Code', 'Days Present', 'Days LOP', 'Error Reason']);
            
            foreach ($errorRows as $row) {
                fputcsv($file, [
                    $row->employee_code,
                    $row->days_present,
                    $row->days_lop,
                    $row->error_message,
                ]);
            }
            fclose($file);
        };

        return response()->stream($callback, 200, $headers);
    }

    /**
     * Download Success Report CSV for Attendance history batch
     */
    public function downloadHistorySuccess(Request $request, string $batchId)
    {
        $user = $request->user();
        if (!in_array($user->role, ['admin', 'manager'])) {
            abort(403, 'Unauthorized');
        }

        $batch = \App\Models\BulkUploadBatch::where('type', 'attendance')
            ->forUser($user)
            ->where('id', $batchId)
            ->firstOrFail();

        $rowsQuery = DB::table('attendance_upload_staging_rows')
            ->where('batch_id', $batchId)
            ->where('status', 'ready');

        if ($user->role === 'manager') {
            $managedClientIds = $user->getManagedClientIds();
            if (!empty($managedClientIds)) {
                $rowsQuery->whereIn('client_id', $managedClientIds);
            }
        }

        $successRows = $rowsQuery->get();

        $filename = 'Attendance_Success_Batch_' . substr($batchId, 0, 8) . '.csv';

        $headers = [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => 'attachment; filename="' . $filename . '"',
            'Cache-Control' => 'no-cache, no-store, must-revalidate',
            'Pragma' => 'no-cache',
            'Expires' => '0',
        ];

        $callback = function () use ($successRows, $batchId) {
            $file = fopen('php://output', 'w');
            fputcsv($file, ['Employee Code', 'Days Present', 'Days LOP', 'Status']);

            if ($successRows->isEmpty()) {
                $attendanceRecords = \App\Models\AttendanceRecord::where('uploaded_batch_id', $batchId)
                    ->with('employee:id,employee_code,full_name')
                    ->get()
                    ->groupBy('employee_id');

                foreach ($attendanceRecords as $group) {
                    $first = $group->first();
                    $presentCount = $group->where('is_present', true)->count();
                    $lopCount = $group->where('is_lop', true)->count();
                    fputcsv($file, [
                        $first->employee->employee_code ?? 'N/A',
                        $presentCount,
                        $lopCount,
                        'Success',
                    ]);
                }
            } else {
                foreach ($successRows as $row) {
                    fputcsv($file, [
                        $row->employee_code,
                        $row->days_present,
                        $row->days_lop,
                        'Success',
                    ]);
                }
            }
            fclose($file);
        };

        return response()->stream($callback, 200, $headers);
    }
}
