<?php

namespace App\Services;

use App\Models\Client;
use App\Models\FormBBatch;
use App\Models\PayrollRun;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;

/**
 * Generates FORM B - Register of Wages (Tamil Nadu Labour Welfare Fund Rules, 1973 - Rule 29)
 * from an existing locked payroll run. Establishment-level monthly wage summary only.
 */
class FormBGeneratorService
{
    protected PayrollCorrectionService $correctionService;

    public function __construct(PayrollCorrectionService $correctionService)
    {
        $this->correctionService = $correctionService;
    }

    /**
     * Enforce that the payroll cycle for this client + month has actually ended before Form B
     * can be generated for it. Mirrors PayrollCycleWarningService::ensureCycleEnded()'s exact
     * logic and contract (reuses Client::getCycleEndDate(), throws \Exception when blocked) —
     * but is gated by its own ALLOW_EARLY_FORM_B_PROCESSING flag rather than
     * ALLOW_EARLY_PAYROLL_PROCESSING, so Form B generation can be allowed/blocked independently
     * of regular payroll processing in a given environment.
     *
     * Testing Bypass Toggle:
     * Set ALLOW_EARLY_FORM_B_PROCESSING=true in .env to allow early Form B generation during
     * testing. Set to false (or omit) to enforce the normal restriction — this is the default;
     * a missing/unset variable is always treated as false, never as an implicit bypass.
     *
     * @throws \Exception
     */
    public function ensureCycleEndedForFormB(Client $client, string $payrollMonth, ?Carbon $today = null): void
    {
        if (filter_var(env('ALLOW_EARLY_FORM_B_PROCESSING', false), FILTER_VALIDATE_BOOLEAN)) {
            return;
        }

        $todayDate = $today ? $today->copy()->startOfDay() : Carbon::today()->startOfDay();
        $cycleEnd = $client->getCycleEndDate($payrollMonth)->startOfDay();

        if ($todayDate->lt($cycleEnd)) {
            $monthLabel = Carbon::parse($payrollMonth)->format('F Y');
            $formattedEnd = $cycleEnd->format('M j, Y');
            throw new \Exception("Form B cannot be generated for {$monthLabel} yet — this payroll cycle has not ended (ends {$formattedEnd}). Form B can only be generated after the cycle completes.");
        }
    }

    /**
     * Whether the Form B early-processing testing bypass is currently active in this environment.
     * Used only to surface a small, honest "Testing Mode" indicator in the UI — never assumed
     * true, never hardcoded, always reflects the live environment variable.
     */
    public function isEarlyFormBProcessingAllowed(): bool
    {
        return filter_var(env('ALLOW_EARLY_FORM_B_PROCESSING', false), FILTER_VALIDATE_BOOLEAN);
    }

    /**
     * Clients + branches for the context picker.
     */
    public function getClientsWithBranches($user)
    {
        // Draft/incomplete clients are setup records, not operational clients — they must never
        // reach the Form B client picker. See Client::scopeOperational().
        $query = Client::operational()->with(['branches' => function ($q) {
            $q->orderByDesc('is_head_office')->orderBy('branch_name');
        }])->orderBy('company_name');

        if ($user && $user->role === 'manager') {
            $query->whereIn('id', $user->getManagedClientIds());
        }

        return $query->get()->map(function (Client $client) {
            return [
                'id' => $client->id,
                'company_name' => $client->company_name,
                'registered_state' => $client->registered_state,
                'branches' => $client->branches->map(fn($b) => [
                    'id' => $b->id,
                    'branch_name' => $b->branch_name,
                    'state' => $b->state,
                    'is_head_office' => (bool)$b->is_head_office,
                    'lwf_registration_number' => $b->lwf_registration_number,
                ]),
            ];
        });
    }

    /**
     * The only state this Form B implementation has been built and legally verified against
     * (Tamil Nadu Labour Welfare Fund Rules, 1973, Rule 29). This is not a general multi-state
     * applicability engine — no such thing exists elsewhere in the compliance module for Form B —
     * it is a single, explicit, honest gate so a non-Tamil-Nadu establishment is never labeled
     * with Tamil Nadu's Act/Rule text.
     */
    protected const APPLICABLE_STATE = 'Tamil Nadu';

    public static function isTamilNaduState(?string $state): bool
    {
        return $state !== null && strcasecmp(trim($state), self::APPLICABLE_STATE) === 0;
    }

    /**
     * Resolve context (state + legal basis + registration number) for the header/summary bar.
     * applicable_act/legal_basis are only populated when the resolved state is Tamil Nadu —
     * this module has no Karnataka/other-state Form B implementation, so a non-Tamil-Nadu
     * establishment must never be shown Tamil Nadu's Act/Rule text.
     */
    public function resolveContext(Client $client, ?int $branchId): array
    {
        $branch = $branchId ? $client->branches()->find($branchId) : null;
        $state = $branch?->state ?: $client->registered_state;
        $isApplicable = self::isTamilNaduState($state);

        return [
            'client_id' => $client->id,
            'company_name' => $client->company_name,
            'branch_id' => $branch?->id,
            'branch_name' => $branch?->branch_name,
            'state' => $state,
            'lwf_registration_number' => $branch?->lwf_registration_number,
            'form_b_applicable' => $isApplicable,
            'applicable_act' => $isApplicable
                ? 'Tamil Nadu Labour Welfare Fund Act, 1972'
                : 'Not available in current Form B module',
            'legal_basis' => $isApplicable
                ? 'Rule 29, Tamil Nadu Labour Welfare Fund Rules, 1973'
                : '—',
        ];
    }

    /**
     * Step 1: quick summary for a client/branch/month, based on the best available locked run (if any).
     */
    public function getPeriodSummary(Client $client, ?int $branchId, string $payrollMonth): array
    {
        $run = $this->findRecommendedRun($client, $payrollMonth);

        // DA has no rate/percentage configuration anywhere in this system — it is a flat,
        // manually-entered rupee amount on each employee's Salary Structure (employees.da),
        // pro-rated per payroll run by MonthlyPayrollCalculator. There is no client-level or
        // payroll-level "DA rate" setting, so the help link must point at the employees list
        // (where an admin actually edits each employee's DA amount), not at the Client edit page.
        $configUrl = route('employees.index', ['client_id' => $client->id]);

        if (!$run) {
            return [
                'has_locked_run' => false,
                'total_employees' => 0,
                'total_basic_wages' => 0,
                'total_da' => 0,
                'total_other_wage_components' => 0,
                'da_details' => [
                    'da_amount' => 0,
                    'da_base' => 0,
                    'da_rate' => null,
                    'da_rate_formatted' => null,
                    'has_da_rate' => false,
                    'da_source' => 'Employee Salary Structure',
                    'da_configuration_url' => $configUrl,
                ],
            ];
        }

        $items = $this->consolidatedItems($run, $branchId)->where('is_excluded', false);

        $totalBasic = round((float)$items->sum('basic_pay'), 2);
        $totalDa = round((float)$items->sum('da'), 2);

        $hasDaRate = false;
        $daRate = null;
        $daRateFormatted = null;

        if ($totalBasic > 0 && $totalDa > 0) {
            $rawRate = ($totalDa / $totalBasic) * 100;
            $daRate = round($rawRate, 2);
            $daRateFormatted = (fmod($daRate, 1) == 0 ? (int)$daRate : $daRate) . '%';
            $hasDaRate = true;
        } elseif ($totalDa == 0) {
            $daRate = 0;
            $daRateFormatted = '0%';
            $hasDaRate = true;
        }

        return [
            'has_locked_run' => true,
            'total_employees' => $items->count(),
            'total_basic_wages' => $totalBasic,
            'total_da' => $totalDa,
            'total_other_wage_components' => round(
                (float)$items->sum('hra') + (float)$items->sum('conveyance') +
                (float)$items->sum('medical_allowance') + (float)$items->sum('special_allowance') +
                (float)$items->sum('other_additions'),
                2
            ),
            'da_details' => [
                'da_amount' => $totalDa,
                'da_base' => $totalBasic,
                'da_rate' => $daRate,
                'da_rate_formatted' => $daRateFormatted,
                'has_da_rate' => $hasDaRate,
                'da_source' => 'Employee Salary Structure',
                'da_configuration_url' => $configUrl,
            ],
        ];
    }

    /**
     * Step 2: all non-supplementary payroll runs for the client/month, with locked ones flagged
     * and the latest locked run recommended.
     *
     * Employees/Net Disbursement shown here are computed via consolidatedStats(), the SAME
     * locked-children-only consolidation path used by buildReviewData() (Step 3/4/PDF/Excel/CSV),
     * so the figures never diverge from what Form B actually generates for that run. This
     * deliberately does NOT use PayrollRun::getCombinedStats(), which pulls in supplementary
     * children regardless of their own lock status and would show different numbers here than
     * the ones Form B actually reports.
     *
     * When $branchId is given, a locked run with zero employees in that branch is not a valid
     * Form B source for the branch and is excluded from the list entirely (not just zeroed out),
     * so the list only ever shows payroll sources actually applicable to the selected branch.
     * Non-locked (draft/processing/approved) rows are left visible as informational-only — they
     * have no final, immutable employee set yet, so there is nothing reliable to filter by.
     */
    public function getPayrollRuns(Client $client, string $payrollMonth, ?int $branchId = null): array
    {
        $runs = PayrollRun::where('client_id', $client->id)
            ->where('payroll_month', $payrollMonth)
            ->where('is_supplementary_run', false)
            ->orderByDesc('id')
            ->get();

        $rows = collect();

        foreach ($runs as $run) {
            $stats = $run->status === 'locked'
                ? $this->consolidatedStats($run, $branchId)
                : null;

            if ($branchId && $run->status === 'locked' && ($stats['employees'] ?? 0) === 0) {
                continue; // not applicable to the selected branch — do not list it as a source
            }

            $rows->push([
                'id' => $run->id,
                'label' => Carbon::parse($run->payroll_month)->format('F Y') . ($run->is_supplementary_run ? ' - Supplementary' : ' - Final'),
                'payroll_month' => $run->payroll_month,
                'period_start' => Carbon::parse($run->payroll_month)->startOfMonth()->format('d-M-Y'),
                'period_end' => Carbon::parse($run->payroll_month)->endOfMonth()->format('d-M-Y'),
                'status' => $run->status,
                'employees' => $stats['employees'] ?? $run->total_employees_processed,
                'net_disbursement' => $stats['net_disbursement'] ?? (float)$run->total_net_disbursement,
                'locked_on' => $run->locked_at ? Carbon::parse($run->locked_at)->format('d-M-Y h:i A') : null,
                '_locked_at_raw' => $run->locked_at,
            ]);
        }

        $lockedRows = $rows->where('status', 'locked')->values();

        // Same rule as findRecommendedRun(): most recently LOCKED, not highest id.
        $recommended = self::pickMostRecentlyLocked(
            $lockedRows,
            fn($row) => $row['id'],
            fn($row) => $row['_locked_at_raw']
        );
        $recommendedId = $recommended['id'] ?? null;

        $rows = $rows->map(function ($row) use ($recommendedId) {
            $row['recommended'] = $row['id'] === $recommendedId;
            unset($row['_locked_at_raw']);
            return $row;
        });

        return [
            'runs' => $rows->values(),
            'has_locked_run' => $lockedRows->isNotEmpty(),
            'recommended_run_id' => $recommendedId,
        ];
    }

    /**
     * Single authoritative source of consolidated payroll stats for a run, built on top of
     * consolidatedItems() — the same method buildReviewData() uses for Step 3/4/PDF/Excel/CSV.
     * Any caller needing employee count / net disbursement for Form B must go through this
     * (or consolidatedItems() directly) rather than computing its own figures.
     */
    protected function consolidatedStats(PayrollRun $run, ?int $branchId = null): array
    {
        $items = $this->consolidatedItems($run, $branchId)->where('is_excluded', false);

        return [
            'employees' => $items->count(),
            'net_disbursement' => round((float)$items->sum('net_pay'), 2),
        ];
    }

    /**
     * Step 3/4: full Form B breakdown for a selected locked payroll run.
     */
    public function buildReviewData(PayrollRun $run, ?int $branchId = null): array
    {
        if ($run->status !== 'locked') {
            throw new \Exception('Form B can only be generated from a locked payroll run.');
        }

        $client = $run->client;
        $items = $this->consolidatedItems($run, $branchId)->where('is_excluded', false);

        $employeeCount = $items->count();
        $totalBasic = round((float)$items->sum('basic_pay'), 2);
        $totalDa = round((float)$items->sum('da'), 2);
        $totalOtherWage = round(
            (float)$items->sum('hra') + (float)$items->sum('conveyance') +
            (float)$items->sum('medical_allowance') + (float)$items->sum('special_allowance') +
            (float)$items->sum('other_additions'),
            2
        );
        // Total Emoluments Payable = everything actually paid through payroll this month
        // (Basic + DA + HRA/Conveyance/Medical/Special/Other allowances). This equals gross_total,
        // so it is NOT understated: if the establishment paid any overtime or bonus through payroll,
        // that money is already inside "Other Wage Components" below. What TECLA cannot do is tell
        // you how much of this total, if any, was specifically overtime or bonus — there is no
        // dedicated OT/Bonus column anywhere in the payroll data, so those two are reported as
        // "not tracked" rather than a numeric amount (never assumed to be zero).
        $totalEmoluments = round($totalBasic + $totalDa + $totalOtherWage, 2);

        // Other Deductions = gross_total - net_pay, NOT a hand-picked list of deduction columns.
        // MonthlyPayrollCalculator.php computes net_pay as gross_total minus every employee-side
        // deduction it applies (PF/VPF, ESI, PT, PT shortfall, LWF, TDS, capped loan EMI — see
        // MonthlyPayrollCalculator.php:324-338). gross_total and net_pay are both stored columns
        // written by that same calculation, so their difference is, by construction, the exact
        // total of whatever it deducted — automatically, without Form B having to know the names
        // of the individual deduction columns. If a new employee-side deduction is ever added to
        // the calculator, this stays correct with no change here; the old column-list approach
        // would have silently missed it. This intentionally excludes lop_deduction (already
        // reflected inside the reduced gross_total, not a further subtraction) and
        // deferred_loan_amount (the portion NOT deducted this month), matching the calculator's
        // own treatment of those two fields. It also cannot include employer PF/ESI/LWF/EPF/EPS —
        // those are separate columns the calculator never subtracts from gross_total to get net_pay.
        $grossTotalSum = round((float)$items->sum('gross_total'), 2);
        $netPay = round((float)$items->sum('net_pay'), 2);
        $totalOtherDeductions = round($grossTotalSum - $netPay, 2);

        // Fine is not tracked anywhere in TECLA (no column, no workflow). Unlike the deductions
        // above, a real fine would NOT be folded into any other tracked figure — if one was
        // imposed this month, it is genuinely absent from Total Deductions and Balance Due below
        // and must be added manually.
        $totalDeductions = round($totalOtherDeductions, 2);

        $amountActuallyPaid = $netPay; // system assumption: locked payroll net pay treated as paid
        $balanceDue = round(($totalEmoluments - $totalDeductions) - $amountActuallyPaid, 2);

        $context = $this->resolveContext($client, $branchId);

        return [
            'context' => $context,
            'payroll_run_id' => $run->id,
            'payroll_month' => $run->payroll_month,
            'period_label' => Carbon::parse($run->payroll_month)->format('F Y'),
            'period_start' => Carbon::parse($run->payroll_month)->startOfMonth()->format('d-M-Y'),
            'period_end' => Carbon::parse($run->payroll_month)->endOfMonth()->format('d-M-Y'),
            'locked_on' => $run->locked_at ? Carbon::parse($run->locked_at)->format('d-M-Y h:i A') : null,
            'due_date' => Carbon::parse($run->payroll_month)->addMonthNoOverflow()->startOfMonth()->day(15)->format('d-M-Y'),

            'employee_count' => $employeeCount,

            'emoluments' => [
                'basic_wages' => $totalBasic,
                'da' => $totalDa,
                'ot' => null,
                'ot_available' => false,
                'ot_note' => 'Not separately tracked in TECLA.',
                'bonus' => null,
                'bonus_available' => false,
                'bonus_note' => 'Not separately tracked in TECLA.',
                'other_wage_components' => $totalOtherWage,
                'other_wage_components_note' => 'HRA, Conveyance, Medical & Special Allowances, and any other payroll additions. May include Overtime or Bonus paid through payroll, if any (not separately identifiable in TECLA).',
                'total' => $totalEmoluments,
            ],

            'deductions' => [
                'fine' => null,
                'fine_available' => false,
                'fine_note' => 'Not tracked in TECLA.',
                'other_deductions' => $totalOtherDeductions,
                'total' => $totalDeductions,
                'total_note' => 'Excludes Fine (not tracked).',
            ],

            'net_payable' => round($totalEmoluments - $totalDeductions, 2),
            'amount_actually_paid' => $amountActuallyPaid,
            'balance_due' => $balanceDue,
            'balance_due_note' => 'Calculated from tracked figures only. Excludes any Fine, since fines are not tracked in TECLA.',

            'form_layout_note' => 'This reproduces the statutory fields prescribed under Form B (Rule 29, Tamil Nadu Labour Welfare Fund Rules, 1973), verified against the official Rules text. It is a system-generated register, not a certified reproduction of the printed government form.',

            'establishment' => [
                'name' => $context['branch_name'] ?: $client->company_name,
                'address' => $this->formatEstablishmentAddress($client, $branchId),
                'registration_number' => $context['lwf_registration_number'] ?: ($client->pf_establishment_code ?: 'Not on file'),
                'state' => $context['state'],
            ],
        ];
    }

    protected function formatEstablishmentAddress(Client $client, ?int $branchId): string
    {
        $branch = $branchId ? $client->branches()->find($branchId) : null;

        if ($branch) {
            return implode(', ', array_filter([
                $branch->address_line_1, $branch->city, $branch->state, $branch->pin_code,
            ]));
        }

        return implode(', ', array_filter([
            $client->registered_address_line_1, $client->registered_address_line_2,
            $client->registered_city, $client->registered_state, $client->registered_pin,
        ]));
    }

    /**
     * Find the recommended run for a client + month: the most recently LOCKED, non-supplementary
     * run — ranked by locked_at, not by id (see pickMostRecentlyLocked()).
     */
    protected function findRecommendedRun(Client $client, string $payrollMonth): ?PayrollRun
    {
        $lockedRuns = PayrollRun::where('client_id', $client->id)
            ->where('payroll_month', $payrollMonth)
            ->where('is_supplementary_run', false)
            ->where('status', 'locked')
            ->get();

        return self::pickMostRecentlyLocked($lockedRuns, fn($run) => $run->id, fn($run) => $run->locked_at);
    }

    /**
     * Single "Recommended" selection rule shared by findRecommendedRun() (Step 1 preview) and
     * getPayrollRuns() (Step 2 list) — the only two places that pick a default/recommended
     * payroll run. Ranks candidates by locked_at descending: the run that was actually locked
     * most recently, not the one with the highest database id (a run created earlier can be
     * locked later than a newer-id run, e.g. via a correction/relock workflow). A missing/null
     * locked_at should not occur via the real lock flow (PayrollController.php:64-71 always sets
     * it in the same update as status='locked'), but is handled defensively here for any
     * legacy/manually-seeded data — it is never preferred over a real timestamp. Ties (including
     * all-null ties) are broken by id descending for determinism.
     *
     * @param \Illuminate\Support\Collection $candidates locked-run candidates (Eloquent models or arrays)
     * @param callable $idOf extracts the run id from a candidate
     * @param callable $lockedAtOf extracts the raw locked_at value (or null) from a candidate
     * @return mixed the winning candidate, or null if $candidates is empty
     */
    protected static function pickMostRecentlyLocked(\Illuminate\Support\Collection $candidates, callable $idOf, callable $lockedAtOf)
    {
        if ($candidates->isEmpty()) {
            return null;
        }

        return $candidates->sort(function ($a, $b) use ($idOf, $lockedAtOf) {
            $tsA = $lockedAtOf($a);
            $tsB = $lockedAtOf($b);
            $tsA = $tsA ? Carbon::parse($tsA)->timestamp : -1;
            $tsB = $tsB ? Carbon::parse($tsB)->timestamp : -1;

            if ($tsA === $tsB) {
                return $idOf($b) <=> $idOf($a);
            }

            return $tsB <=> $tsA;
        })->first();
    }

    /**
     * Consolidated payroll_run_items (parent + locked supplementary children), optionally scoped to one branch.
     */
    protected function consolidatedItems(PayrollRun $run, ?int $branchId = null)
    {
        $allRunIds = $run->children()->where('status', 'locked')->pluck('id')->prepend($run->id)->toArray();

        $query = DB::table('payroll_run_items')
            ->join('employees', 'payroll_run_items.employee_id', '=', 'employees.id')
            ->whereIn('payroll_run_items.payroll_run_id', $allRunIds)
            ->select('payroll_run_items.*', 'payroll_run_items.id as id', 'employees.branch_id', 'employees.full_name', 'employees.employee_code');

        if ($branchId) {
            $query->where('employees.branch_id', $branchId);
        }

        $rawItems = $query->orderBy('payroll_run_items.id')->get();

        return $this->correctionService->consolidateItemsForDisplay($rawItems);
    }

    /**
     * Generate & persist Form B PDF + Excel + CSV for a locked payroll run.
     */
    public function generate(PayrollRun $run, ?int $branchId, int $userId): FormBBatch
    {
        $data = $this->buildReviewData($run, $branchId);

        $fileBase = 'form_b_' . $run->client_id . '_' . Carbon::parse($run->payroll_month)->format('Ym') . '_' . Str::random(6);
        $dir = 'form_b_reports';

        $pdfPath = $this->writePdf($data, $dir, $fileBase);
        $xlsxPath = $this->writeXlsx($data, $dir, $fileBase);
        $csvPath = $this->writeCsv($data, $dir, $fileBase);

        $batch = FormBBatch::create([
            'client_id' => $run->client_id,
            'branch_id' => $branchId,
            'payroll_run_id' => $run->id,
            'payroll_month' => $run->payroll_month,
            'employee_count' => $data['employee_count'],
            'total_basic_wages' => $data['emoluments']['basic_wages'],
            'total_da' => $data['emoluments']['da'],
            'total_ot' => $data['emoluments']['ot'],
            'total_bonus' => $data['emoluments']['bonus'],
            'total_other_wage_components' => $data['emoluments']['other_wage_components'],
            'total_emoluments_payable' => $data['emoluments']['total'],
            'total_fine' => $data['deductions']['fine'],
            'total_other_deductions' => $data['deductions']['other_deductions'],
            'total_deductions' => $data['deductions']['total'],
            'amount_actually_paid' => $data['amount_actually_paid'],
            'balance_due' => $data['balance_due'],
            'ot_data_available' => $data['emoluments']['ot_available'],
            'bonus_data_available' => $data['emoluments']['bonus_available'],
            'pdf_file_path' => $pdfPath,
            'pdf_file_name' => basename($pdfPath),
            'xlsx_file_path' => $xlsxPath,
            'xlsx_file_name' => basename($xlsxPath),
            'csv_file_path' => $csvPath,
            'csv_file_name' => basename($csvPath),
            // Deliberately hashes only the PDF — the official submission artifact (see
            // StepDownload.jsx: PDF is "recommended for official submission", XLSX/CSV are
            // supporting/internal formats). This matches the established convention for every
            // other multi-file compliance batch in this app (e.g. Tds24qGeneratorService.php:505,
            // which hashes only its primary .txt return and not its companion .xlsx). file_hash
            // is a write-only reference value today — no download() or history() path in this
            // app compares it against anything — so it is not an active integrity gate; it
            // identifies which generated PDF this batch produced, consistent with every sibling.
            'file_hash' => hash('sha256', Storage::disk('local')->get($pdfPath)),
            'status' => 'generated',
            'generated_by' => $userId,
            'generated_at' => now(),
        ]);

        return $batch;
    }

    protected function writePdf(array $data, string $dir, string $fileBase): string
    {
        $path = "{$dir}/{$fileBase}.pdf";

        if (class_exists(\Barryvdh\DomPDF\Facade\Pdf::class)) {
            $pdf = \Barryvdh\DomPDF\Facade\Pdf::loadView('pdf.compliance.form_b', ['data' => $data])
                ->setPaper('a4', 'portrait');
            Storage::disk('local')->put($path, $pdf->output());
        } else {
            Storage::disk('local')->put($path, view('pdf.compliance.form_b', ['data' => $data])->render());
        }

        return $path;
    }

    /**
     * Renders a currency figure, or a plain dash when the underlying value isn't tracked.
     * Deliberately a dash rather than "0.00" — the value is genuinely unknown, not confirmed
     * zero, and this must never present unverified data as a confirmed figure on the statutory
     * register. See buildReviewData()'s ot_available/bonus_available/fine_available flags.
     */
    protected static function displayAmount($value, bool $available, string $notTrackedLabel = '—'): string
    {
        if (!$available || $value === null) {
            return $notTrackedLabel;
        }
        return number_format((float)$value, 2);
    }

    protected function writeXlsx(array $data, string $dir, string $fileBase): string
    {
        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Form B - Register of Wages');

        $sheet->setCellValue('A1', 'FORM B - REGISTER OF WAGES');
        $sheet->setCellValue('A2', '(See Rule 29, Tamil Nadu Labour Welfare Fund Rules, 1973)');
        $sheet->setCellValue('A3', 'For the Month of ' . $data['period_label']);
        $sheet->mergeCells('A1:F1');
        $sheet->mergeCells('A2:F2');
        $sheet->mergeCells('A3:F3');
        $sheet->getStyle('A1:A3')->getFont()->setBold(true);

        $sheet->setCellValue('A5', 'Name of the Establishment');
        $sheet->setCellValue('B5', $data['establishment']['name']);
        $sheet->setCellValue('A6', 'Address');
        $sheet->setCellValue('B6', $data['establishment']['address']);
        $sheet->setCellValue('A7', 'Registration Number');
        $sheet->setCellValue('B7', $data['establishment']['registration_number']);

        // Primary statutory table: exact 5 columns as gazetted under Rule 29 / Form B.
        $row = 10;
        $sheet->setCellValue("A{$row}", 'STATUTORY REGISTER OF WAGES (Form B, Rule 29) — official columns');
        $sheet->getStyle("A{$row}")->getFont()->setBold(true);
        $row += 2;

        $headers = [
            '(1) Total Number of Employees',
            '(2) Total Emoluments Payable during the month (incl. Basic Wages, D.A., O.T., Bonus)',
            '(3a) Fine',
            '(3b) Other Deductions',
            '(4) Amount Actually Paid during the Month',
            '(5) Balance Due to the Employees',
        ];
        foreach ($headers as $i => $h) {
            $col = chr(65 + $i);
            $sheet->setCellValue("{$col}{$row}", $h);
            $sheet->getStyle("{$col}{$row}")->getFont()->setBold(true);
            $sheet->getColumnDimension($col)->setWidth(26);
        }
        $row++;

        $sheet->setCellValue("A{$row}", $data['employee_count']);
        $sheet->setCellValue("B{$row}", $data['emoluments']['total']);
        $sheet->setCellValue("C{$row}", self::displayAmount($data['deductions']['fine'], $data['deductions']['fine_available']));
        $sheet->setCellValue("D{$row}", $data['deductions']['other_deductions']);
        $sheet->setCellValue("E{$row}", $data['amount_actually_paid']);
        $sheet->setCellValue("F{$row}", $data['balance_due']);
        $row += 3;

        // Supporting calculation — TECLA detail, not part of the official Form B columns.
        $sheet->setCellValue("A{$row}", 'SUPPORTING CALCULATION (TECLA detail — not part of the official Form B columns)');
        $sheet->getStyle("A{$row}")->getFont()->setBold(true);
        $row += 1;
        $sheet->setCellValue("A{$row}", 'Particulars');
        $sheet->setCellValue("B{$row}", 'Amount (Rs.) / Status');
        $sheet->getStyle("A{$row}:B{$row}")->getFont()->setBold(true);
        $row++;

        $supportingRows = [
            ['Basic Wages', self::displayAmount($data['emoluments']['basic_wages'], true)],
            ['Dearness Allowance (DA)', self::displayAmount($data['emoluments']['da'], true)],
            ['Overtime Wages (O.T.)', self::displayAmount($data['emoluments']['ot'], $data['emoluments']['ot_available'])],
            ['Bonus', self::displayAmount($data['emoluments']['bonus'], $data['emoluments']['bonus_available'])],
            ['Other Wage Components (HRA, Conveyance, Medical & Special Allowances)', self::displayAmount($data['emoluments']['other_wage_components'], true)],
            ['TOTAL Emoluments Payable (matches column 2 above)', self::displayAmount($data['emoluments']['total'], true)],
            ['', ''],
            ['Fine', self::displayAmount($data['deductions']['fine'], $data['deductions']['fine_available'])],
            ['Other Deductions (PF, ESI, PT, LWF, TDS, Loan EMI)', self::displayAmount($data['deductions']['other_deductions'], true)],
            ['TOTAL Deductions, excludes Fine (matches column 3b above)', self::displayAmount($data['deductions']['total'], true)],
        ];

        foreach ($supportingRows as $r) {
            $sheet->setCellValue("A{$row}", $r[0]);
            $sheet->setCellValue("B{$row}", $r[1]);
            if (str_starts_with($r[0], 'TOTAL')) {
                $sheet->getStyle("A{$row}:B{$row}")->getFont()->setBold(true);
            }
            $row++;
        }

        $row += 1;
        $sheet->setCellValue("A{$row}", 'Note: Amount Actually Paid reflects locked payroll net pay. TECLA does not track bank payment confirmation.');
        $row += 2;
        $sheet->setCellValue("A{$row}", $data['form_layout_note']);
        $sheet->getStyle("A{$row}")->getFont()->setItalic(true);

        $sheet->getColumnDimension('A')->setWidth(60);
        $sheet->getColumnDimension('B')->setWidth(30);

        $path = "{$dir}/{$fileBase}.xlsx";
        $tmpFile = tempnam(sys_get_temp_dir(), 'formb_') . '.xlsx';
        (new Xlsx($spreadsheet))->save($tmpFile);
        Storage::disk('local')->put($path, file_get_contents($tmpFile));
        @unlink($tmpFile);

        return $path;
    }

    protected function writeCsv(array $data, string $dir, string $fileBase): string
    {
        $path = "{$dir}/{$fileBase}.csv";
        $tmpFile = tempnam(sys_get_temp_dir(), 'formb_') . '.csv';
        $handle = fopen($tmpFile, 'w');

        fputcsv($handle, ['FORM B - REGISTER OF WAGES (See Rule 29, Tamil Nadu Labour Welfare Fund Rules, 1973)']);
        fputcsv($handle, ['For the Month of', $data['period_label']]);
        fputcsv($handle, ['Name of the Establishment', $data['establishment']['name']]);
        fputcsv($handle, ['Address', $data['establishment']['address']]);
        fputcsv($handle, ['Registration Number', $data['establishment']['registration_number']]);
        fputcsv($handle, []);

        fputcsv($handle, ['STATUTORY REGISTER OF WAGES (Form B, Rule 29) - official columns']);
        fputcsv($handle, [
            '(1) Total Number of Employees',
            '(2) Total Emoluments Payable during the month (incl. Basic Wages, D.A., O.T., Bonus)',
            '(3a) Fine',
            '(3b) Other Deductions',
            '(4) Amount Actually Paid during the Month',
            '(5) Balance Due to the Employees',
        ]);
        fputcsv($handle, [
            $data['employee_count'],
            $data['emoluments']['total'],
            self::displayAmount($data['deductions']['fine'], $data['deductions']['fine_available']),
            $data['deductions']['other_deductions'],
            $data['amount_actually_paid'],
            $data['balance_due'],
        ]);
        fputcsv($handle, []);

        fputcsv($handle, ['SUPPORTING CALCULATION (TECLA detail - not part of the official Form B columns)']);
        fputcsv($handle, ['Particulars', 'Amount (Rs.) / Status']);
        fputcsv($handle, ['Basic Wages', self::displayAmount($data['emoluments']['basic_wages'], true)]);
        fputcsv($handle, ['Dearness Allowance (DA)', self::displayAmount($data['emoluments']['da'], true)]);
        fputcsv($handle, ['Overtime Wages (O.T.)', self::displayAmount($data['emoluments']['ot'], $data['emoluments']['ot_available'])]);
        fputcsv($handle, ['Bonus', self::displayAmount($data['emoluments']['bonus'], $data['emoluments']['bonus_available'])]);
        fputcsv($handle, ['Other Wage Components (HRA, Conveyance, Medical & Special Allowances)', self::displayAmount($data['emoluments']['other_wage_components'], true)]);
        fputcsv($handle, ['TOTAL Emoluments Payable (matches column 2 above)', self::displayAmount($data['emoluments']['total'], true)]);
        fputcsv($handle, []);
        fputcsv($handle, ['Fine', self::displayAmount($data['deductions']['fine'], $data['deductions']['fine_available'])]);
        fputcsv($handle, ['Other Deductions (PF, ESI, PT, LWF, TDS, Loan EMI)', self::displayAmount($data['deductions']['other_deductions'], true)]);
        fputcsv($handle, ['TOTAL Deductions, excludes Fine (matches column 3b above)', self::displayAmount($data['deductions']['total'], true)]);
        fputcsv($handle, []);

        fputcsv($handle, ['Note', 'Amount Actually Paid reflects locked payroll net pay. TECLA does not track bank payment confirmation.']);
        fputcsv($handle, []);
        fputcsv($handle, [$data['form_layout_note']]);

        fclose($handle);

        Storage::disk('local')->put($path, file_get_contents($tmpFile));
        @unlink($tmpFile);

        return $path;
    }

    public function download(int $id, string $format)
    {
        $batch = FormBBatch::findOrFail($id);

        $map = [
            'pdf' => ['path' => $batch->pdf_file_path, 'name' => $batch->pdf_file_name],
            'xlsx' => ['path' => $batch->xlsx_file_path, 'name' => $batch->xlsx_file_name],
            'csv' => ['path' => $batch->csv_file_path, 'name' => $batch->csv_file_name],
        ];

        if (!isset($map[$format]) || !$map[$format]['path'] || !Storage::disk('local')->exists($map[$format]['path'])) {
            abort(404, 'The requested Form B file is not available.');
        }

        $batch->update(['status' => 'downloaded', 'downloaded_at' => now()]);

        return Storage::disk('local')->download($map[$format]['path'], $map[$format]['name']);
    }

    public function history($user, ?int $clientId = null)
    {
        $query = FormBBatch::with(['client', 'branch', 'payrollRun', 'generatedBy'])
            ->orderByDesc('created_at');

        if ($user && $user->role === 'manager') {
            $query->whereIn('client_id', $user->getManagedClientIds());
        }

        if ($clientId) {
            $query->where('client_id', $clientId);
        }

        return $query->get()->map(function (FormBBatch $batch) {
            return [
                'id' => $batch->id,
                'month_year' => Carbon::parse($batch->payroll_month)->format('F Y'),
                'client_name' => $batch->client->company_name ?? 'N/A',
                'branch_name' => $batch->branch->branch_name ?? 'All Branches',
                'generated_on' => $batch->generated_at ? $batch->generated_at->format('d-M-Y h:i A') : null,
                'payroll_run_label' => 'Run #' . $batch->payroll_run_id,
                'status' => $batch->status,
                'generated_by' => $batch->generatedBy->name ?? 'System',
                'total_emoluments_payable' => $batch->total_emoluments_payable,
            ];
        });
    }

    /**
     * Soft-delete the batch AND remove its generated files from storage. Only the file paths
     * already stored on this specific batch record are ever touched — never a client-supplied
     * path — so this cannot be used to delete anything outside form_b_reports/ belonging to
     * this batch. Storage::disk('local')->delete() is idempotent (returns false, does not throw,
     * for a path that doesn't exist), matching the same pattern already used elsewhere in the app
     * (e.g. EmployeeController.php:392, EmployeePortalController.php:242) — so a missing/already
     * -cleaned file never blocks the database soft-delete.
     */
    public function destroy(int $id): void
    {
        $batch = FormBBatch::findOrFail($id);

        $paths = array_filter([
            $batch->pdf_file_path,
            $batch->xlsx_file_path,
            $batch->csv_file_path,
        ]);

        if (!empty($paths)) {
            Storage::disk('local')->delete($paths);
        }

        $batch->delete();
    }
}
