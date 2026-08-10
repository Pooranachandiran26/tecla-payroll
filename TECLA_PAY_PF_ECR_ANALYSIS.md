# TECLA PAY — PF ECR Complete Analysis + EPFO Requirements

> **DOCUMENTATION ONLY.** No code, database, UI, payroll flow, PF calculation, or compliance flow was modified to produce this document. Every claim is either confirmed with an exact `file:line` citation, or explicitly marked **"Needs confirmation"** / **"MISSING FROM EXISTING SYSTEM"** where the code did not provide evidence. The official EPFO source used is the government PDF at `https://www.epfindia.gov.in/site_docs/PDFs/OnlineECR_PDFs/ECR_ForEmployers_FileStructure.pdf`, fetched and read in full for this analysis. Nothing here has been silently corrected — every discrepancy between TECLA PAY and the official EPFO requirement is reported as found.

---

## 1. Executive Summary

TECLA PAY CRM has a **fully working payroll engine that correctly calculates the individual EPF, EPS, and EDLI components** of Provident Fund per employee per payroll run (via `SalaryCalculationService` + `MonthlyPayrollCalculator`). It also has a **Compliance dashboard** that tracks, per client and per statute (PF/ESI/PT/TDS/CLRA), a simple `pending`/`filed` status.

However, the **PF ECR (Electronic Challan cum Return) generation feature does not exist at all beneath the UI layer.** The "Provident Fund ECR" card on the Compliance screen, its "Generate ECR (.txt)" button, and the "Draft PF ECR auto-populated from Payroll Run #PR-0626 (Approved)" banner are **100% static, hardcoded frontend text with a permanently disabled button** — there is no route, controller, service, or file-generation logic behind any of it (confirmed by an exhaustive `app/`-wide search for `ecr`/`ECR`/`provident`, which returned zero relevant hits). This is Classification **(C) UI only / (E) Not implemented**, not a partially-working feature.

Beyond the missing generation feature, this analysis surfaces several **pre-existing data-model gaps and one compliance-relevant calculation risk** that would need to be addressed regardless of who implements ECR generation later:

1. **`payroll_run_items.employer_pf` is a blended CTC-accounting figure (EPF + EPS + EDLI + Admin charges), not a pure EPF number** — the correct source for an ECR "Employer EPF Share" field would be `employer_epf`, and even that column excludes EDLI/Admin charges, which are computed but **never persisted anywhere**. Using `employer_pf` directly for an ECR field would silently over-report the employer's EPF contribution.
2. **PF Member ID (the EPFO account number, distinct from UAN) is not modeled at all** — only UAN is stored. The official ECR field #1, "Member ID," is explicitly a different identifier from UAN.
3. **`clients.pf_ceiling` is client-configurable down to any value ≤ ₹15,000** — this allows an operator to set a wage ceiling below the statutory limit, which would under-calculate PF for affected employees. The EPFO wage ceiling is fixed by law and not something an employer may unilaterally lower.
4. **NCP Days, Arrears (4 sub-fields), and Refund of Advances have no equivalent concept anywhere in the codebase.** The closest existing field, `lop_days`, is fractional (half-days allowed) while EPFO's NCP field is a whole-day integer count — a direct mapping would produce incorrect values without transformation.
5. **EOR vs. Agency-Contract employees of the same client can resolve to two different PF establishment codes**, but nothing in the codebase currently splits a payroll run's employees by establishment code — a real ECR file must be filed per establishment, and today's Compliance dashboard treats each client as a single undifferentiated row.

None of these are bugs in the sense of producing wrong output today — the existing payroll calculation is internally consistent and correctly computes what it's designed to compute (a payslip and a CTC/invoicing figure). They become **relevant risks only if or when ECR generation is built on top of the existing data**, and are documented here exactly for that reason, per the instruction to document rather than fix.

---

## 2. Existing Payroll Flow

Traced from `app/Http/Controllers/PayrollController.php`, `app/Services/MonthlyPayrollCalculator.php`, and the `payroll_runs`/`payroll_run_items` schema (this reproduces, with PF-specific emphasis, findings already established during a prior full codebase analysis of this project and re-verified for this task):

```
Employee (employees table, salary structure + statutory toggles)
  ↓
Attendance capture (attendance_records, resolved by AttendanceResolutionService)
  ↓
Payroll Processing — PayrollController::process()
  → creates/re-runs a `draft` PayrollRun for a client + month
  → for each active employee: PayrollEligibilityService::checkEmployee()
      → hard exclusions: missing bank details, unverified required documents,
        in-progress exit, non-active status, zero attendance with no covering leave
      → eligible employees proceed to MonthlyPayrollCalculator::calculateForEmployee()
  ↓
PF Calculation (inside MonthlyPayrollCalculator, calling SalaryCalculationService)
  → computes employee_pf, employer_pf (blended), employer_epf (EPF-only), employer_eps
  ↓
Payroll Approval — PayrollController::approve(): draft → approved
  ↓
Payroll Lock — PayrollController::lock(): approved → locked
  → PayrollRun::boot() model-level guard prevents further edits to financial fields
  → triggers InvoiceGenerationService (billing), loan repayment processing
  ↓
Compliance — ComplianceController::index() reads LOCKED payroll_run_items
  (via payroll_run_items JOIN payroll_runs WHERE status='locked') only for a HEADCOUNT
  figure, not for any PF wage/contribution aggregation
  ↓
PF ECR — DOES NOT EXIST (see §5)
```

**Routes**: `POST /payroll/runs` (process), `POST /payroll/{id}/approve`, `POST /payroll/{id}/lock` — all under `role:admin,manager` + `module:admin`/`module:payroll` middleware groups (`routes/web.php`).

**Status transitions**: `payroll_runs.status` enum is `draft, processing, approved, locked` (migration `2026_07_13_160300_create_payroll_runs_table.php:18`). Model-level guards in `PayrollRun::boot()` block editing financial fields once `approved`/`locked`, and block deletion of `approved`/`locked` runs entirely.

**Important for PF ECR purposes**: `ComplianceController::index()` filters on `payroll_runs.status = 'locked'` (not `'approved'`) when computing its headcount figure (`ComplianceController.php:25-32`) — so if a future ECR feature is meant to source from "Approved Payroll Run" as the UI banner literally claims, note that the *only* real query against payroll data in this controller today actually requires `locked`, one stage later than "approved." This is a discrepancy between the UI's own claimed data source and the one real query that exists — flagged here as found, not corrected.

---

## 3. Existing PF Flow

The full monthly PF/EPS/EDLI calculation, traced from `app/Services/SalaryCalculationService.php` (the formula engine) and `app/Services/MonthlyPayrollCalculator.php` (the per-run orchestrator):

1. **Gate**: `SalaryCalculationService.php:64` — `if (data_get($employeeData, 'pf_applicable', true)) { ... }`. If `pf_applicable` is false, `employeePf` and `employerPf` remain `0.00` (initialized at lines 61-62) and none of the PF math below executes. **Confirmed by direct code read for this task.**
2. **EPF wage base**: `$basicDa = $basic + $da`; `$employeePfWage = ($employee_pf_wage_basis === 'actual_basic_da') ? $basicDa : min($basicDa, $pfCeiling)` (lines 70-82). `$pfCeiling` defaults to `client.pf_ceiling` (default ₹15,000) or a hardcoded `PF_WAGE_CEILING = 15000` constant.
3. **Employee EPF share**: `$employeePf = $employeePfWage * 0.12` (line 85) → stored to `payroll_run_items.employee_pf`.
4. **Employer total 12% + EDLI + Admin (blended)**: `$employerPf = $employerEpfTotal + $edli + $epfAdmin` (line 93) — this THREE-component blend is stored to `payroll_run_items.employer_pf`. `$edli` and `$epfAdmin` (both 0.5% of the capped PF wage) are computed but **never stored anywhere separately**.
5. **EPS eligibility & split**: if the employee is EPS-eligible (`eps_applicable` AND age < 58 at the payroll month, computed from `date_of_birth`) — `$epsBase = min($basicDa, 15000)` (hardcoded, not client-configurable), `$employerEps = round($epsBase * 0.0833, 2)` → stored to `payroll_run_items.employer_eps`; then `$employerEpf = round($employerEpfTotal - $employerEps, 2)` (the EPF-only remainder) → stored to `payroll_run_items.employer_epf`. If not EPS-eligible, `$employerEpf = round($employerEpfTotal, 2)` (full 12%, no carve-out).

**Wage bases (EPF Wages, EPS Wages, EDLI Wages) are computed in-memory and immediately discarded** — only the resulting ₹ contribution amounts are persisted. This means the wage bases can only be *reconstructed* after the fact from `basic_pay`+`da` combined with the *current* ceiling/wage-basis configuration — which is not snapshotted per run, so a later change to `client.pf_ceiling` or the wage-basis toggle would make historical reconstruction diverge from what was actually contributed at the time.

---

## 4. Existing Compliance Flow

Traced from `app/Http/Controllers/ComplianceController.php` (167 lines, read in full) and `resources/js/Pages/Compliance/ComplianceReports.jsx`:

- **`index()`** builds a per-client, per-statute (`pf`/`esi`/`pt`/`tds`/`clra`) status dashboard for a selected month: headcount (from locked `payroll_run_items`), existing `ComplianceFiling` rows keyed by statute, due dates via `StatutoryDueDateService`, and PF/ESI registration-code completeness via `StatutoryFilingResolutionService`. Passed to Inertia as `clients`, `period`, `stats`, `due_dates` — **no `pf_ecr`, `draft`, or `payroll_run` key is ever passed to the frontend.**
- **`markFiled()`** is a pure status toggle: `ComplianceFiling::updateOrCreate(['client_id','statute','period'], ['status','filed_by','filed_at'])`. It accepts and stores **only** `client_id`, `statute`, `period`, `status` — no challan number, no payment reference, no acknowledgement number, no file attachment.
- The frontend's "Generate Reports & Returns" section (Provident Fund ECR, ESI Monthly File, PT Challan Summary, TDS Form 24Q, GSTR-1 Summary, Client Audit Pack) is a **hardcoded, client-side JS array** (`ComplianceReports.jsx:37-44`) rendered with permanently `disabled` buttons suffixed literally `"(Coming Soon)"` (line 155-157) and **no `onClick` handler wired to any of them**.
- The "Draft PF ECR auto-populated from Payroll Run #PR-0626 (Approved)" banner (line 100) is a **literal hardcoded JSX string**, not interpolated from any prop, state, or backend value.
- The only genuinely functional part of the entire page is the **Client-wise Compliance Register** table and its per-statute filed/pending toggle (real data, real `POST /compliance/mark-filed` round-trip).
- The filter bar above the register (Client/Statute/Due Date Range/Status + "Filter" button) is **non-functional** — no `onChange`/`onClick` wired to anything; the Due Date Range input has a hardcoded value `"2026-06"` with a no-op `onChange`.
- A legacy static alert string was also found in `public/legacy/payroll-approval.js:30`: `"✅ Compliance Integration: Draft PF ECR, ESI, and PT data have been auto-populated for this batch in the Statutory Compliance Center."` — this is a hardcoded `alert()` message in an old, apparently unused JS file, with **no backend call behind it whatsoever**.

---

## 5. Existing PF ECR Flow

**There is no PF ECR flow.** This section exists in the requested table of contents but the honest finding is: nothing beyond the UI card described in §4 exists. Specifically confirmed absent (exhaustive `app/`-wide case-insensitive grep for `ecr`, `ECR`, `Ecr`, `provident`, `pf_ecr`):

- No route (`routes/web.php` compliance group has exactly two routes: `GET /compliance` and `POST /compliance/mark-filed`).
- No controller method that generates a text file, formats PF contributions for EPFO, or returns a `.txt` download response.
- No service class (`EcrService`, `PfEcrGenerator`, or any similarly-named class) anywhere in `app/Services/`.
- No database table or column tracking a generated ECR batch, its contents, or its lifecycle.

The 4 incidental code hits for "provident"/"ecr" found during the search were all false positives unrelated to PF ECR (a GSTIN-decryption accessor, the word "encrypted" appearing in a cast-type string, an unrelated bank/PAN decryption comment, and a `decrypted_gstin` variable name).

**Classification: (E) Not implemented** at the backend; **(C) UI only** at the frontend (a disabled placeholder button and static marketing copy).

---

## 6. Employee Selection Logic

**Direct answer to the question "does PF ECR contain every employee whose payroll was processed, or only PF-applicable employees?": this cannot be answered from an existing ECR feature because none exists.** What *can* be answered is which employees the *existing payroll engine* computes a non-zero PF contribution for, which is the logical candidate set a future ECR feature would need to filter to.

| Employee scenario | Payroll Processed? | PF Applicable? | PF Calculated (non-zero)? | Would belong in ECR? | Reason |
|---|---|---|---|---|---|
| Active employee, `pf_applicable=true`, Basic+DA > 0 | Yes | Yes | Yes | Yes | Passes the `pf_applicable` gate (`SalaryCalculationService.php:64`); standard EPF/EPS/EDLI math runs |
| Active employee, `pf_applicable=false` (e.g. wage exempt or opted out) | Yes | No | No — `employee_pf`/`employer_pf` remain `0.00` | No | Gated out at the same line; a payroll_run_item row still exists (with zeroed PF fields) but represents no real contribution |
| Employee excluded from the payroll run entirely (missing bank details, unverified docs, in-progress exit — per `PayrollEligibilityService`) | No (item created with `is_excluded=true`, zeroed) | N/A (never evaluated) | No | No | Excluded before PF calculation ever runs; `PayrollRunItem.is_excluded=true` is the marker |
| New joiner mid-month | Yes (prorated) | Per `pf_applicable` toggle | Yes, prorated by attendance | Yes, if `pf_applicable=true` | Standard flow; EPFO ECR has dedicated new-joiner fields (17-22, see §16) that nothing in TECLA currently populates |
| Exiting employee mid-month | Yes (via F&F settlement, separate service) | Per `pf_applicable` toggle at time of exit | Yes (regular payroll), separately at F&F | Yes for the exit month, plus EPFO ECR has dedicated exit fields (23-25) that nothing in TECLA currently populates |
| Employee over age 58 | Yes | Per `pf_applicable` toggle (EPF unaffected by age) | EPF: yes if applicable. **EPS: always `0`** (age-58 cutoff correctly implemented in `MonthlyPayrollCalculator`) | Yes for EPF portion; EPS Wages/Contribution should be reported as 0 | Matches the official EPFO remark on field #4 ("EPS Wages... In case of the member over 58 years age, the wages should be '0'") — TECLA's existing age check is **consistent** with this official rule |
| EOR employee vs. Agency-Contract employee at the same client | Yes, both | Independently toggled | Yes, both (formula identical) | Yes, both — but potentially into **two different ECR files** (see §7, §17) | `employment_model` doesn't change the PF math, only which establishment code the filing belongs under |

**Conclusion**: TECLA's payroll engine already has a working, per-employee `pf_applicable` gate that is the natural candidate for ECR employee selection. No code currently exists that applies this filter *for ECR purposes* (because no ECR generation exists), but the underlying data needed to do so (`employees.pf_applicable`, `payroll_run_items.is_excluded`, `payroll_run_items.employee_pf`) is present and consistent.

---

## 7. PF Applicability Logic

- **Gate location**: `app/Services/SalaryCalculationService.php:64` — `data_get($employeeData, 'pf_applicable', true)`, defaulting to `true` if unset.
- **Source of the flag**: `employees.pf_applicable` (boolean, default `true`, migration `2026_07_03_113615_create_employees_table.php`), inherited/defaulted from `clients.pf_applicable` during bulk upload (`FastBulkUploadService.php:309`, `BulkUploadValidationService.php:196-201`) if not explicitly set on the row.
- **EPS sub-gate**: `employees.eps_applicable` (boolean, default `true`) AND age < 58 at the payroll month — both must hold for the EPS/`employer_eps` calculation to run (`MonthlyPayrollCalculator.php:96-111` region, per prior research; confirmed present via the `eps_applicable` references in the direct grep for this task).
- **EDLI sub-gate**: `clients.edli_exempted` (boolean, default `false`) — if true, EDLI (0.5%) is zeroed (`SalaryCalculationService.php:90-91`), independent of the main `pf_applicable` flag.
- **Wage ceiling gate/override**: `clients.pf_ceiling` (decimal, default 15000, but **operator-editable down to any value ≤ 15000** per `StoreClientRequest.php:322`/`UpdateClientRequest.php:326` validation `nullable|numeric|min:0|max:15000`) — see the compliance-risk flag in §1 and §26.
- **Wage-basis toggle**: `employees.employee_pf_wage_basis` / `employer_pf_wage_basis` enum (`ceiling` vs `actual_basic_da`) — if set to `actual_basic_da`, the ₹15,000 cap is bypassed entirely for that side of the calculation (`SalaryCalculationService.php:70-82` region).

**Employee status affecting applicability, from prior research on the `employees` table**: `status` enum `active/onboarding/exited/suspended` — payroll processing (`PayrollEligibilityService`) generally only processes `active` employees; `date_of_joining`/`last_working_day` bound the employment window used for proration. None of this is PF-specific logic — it's the general payroll-inclusion gate that happens to determine whether PF gets calculated at all for a given month (no PF calc happens for months outside the DOJ–exit window since no payroll item exists for that month).

---

## 8. Existing PF Data Sources

| PF Data | Table | Column | Source/Calculation | Available? | Notes |
|---|---|---|---|---|---|
| UAN | `employees` | `uan_number` (string, nullable) | Raw stored | **Available** | No 12-digit format validation found on this column itself |
| PF Member ID (EPFO account number, distinct from UAN) | — | — | — | **MISSING FROM EXISTING SYSTEM** | Exhaustively searched; only UAN is modeled |
| PF Establishment Code | `clients` (EOR) / `settings` group `company_profile` (Agency-Contract) | `pf_establishment_code` | Raw stored, resolved per-employee by `StatutoryFilingResolutionService` based on `employment_model` | **Available, but split across two sources depending on employee type** | Used only for a boolean "is registration resolved" check today — never embedded into any report or grouping logic |
| Employee Name | `employees` | `full_name` (derived from `first_name`+`last_name`) | Auto-derived on save via model hook | **Available** | Father's/Husband's name also separately available (`employees.father_name`) |
| EPF Wages | — | — | Computed transiently in `SalaryCalculationService`, never persisted | **MISSING as a stored value** (re-derivable from `basic_pay`+`da` + *current* config only — not historically snapshotted) | |
| EPS Wages | — | — | Computed transiently, never persisted | **MISSING as a stored value** | EPS ceiling correctly hardcoded to ₹15,000, immune to the `pf_ceiling` override issue |
| EDLI Wages | — | — | Computed transiently, never persisted | **MISSING as a stored value** | |
| Employee EPF Share | `payroll_run_items` | `employee_pf` (decimal 12,2) | `$employeePfWage * 0.12` | **Available** | |
| Employer EPF Share | `payroll_run_items` | `employer_epf` (decimal 10,2, nullable) — **NOT** `employer_pf` | `$employerEpfTotal - $employerEps` (or full 12% if not EPS-eligible) | **Available, but under a different column than the obvious one** — `employer_pf` is a blended EPF+EPS+EDLI+Admin figure, not usable directly | See §1/§3/§26 — this is the single most important mapping risk found |
| EPS Contribution | `payroll_run_items` | `employer_eps` (decimal 10,2, nullable) | `$epsBase * 0.0833` | **Available** | |
| NCP Days | — | — | — | **MISSING FROM EXISTING SYSTEM** | No `ncp`/`non_contributory` concept anywhere in the codebase |
| LOP Days | `payroll_run_items` | `lop_days` (decimal 5,2) | `AttendanceResolutionService` | **Available, but not validated as NCP-equivalent** | Allows fractional days (e.g. 0.5); EPFO's NCP field is a whole-day integer |
| Arrear EPF Wages / Arrear EPF EE Share / Arrear EPF ER Share / Arrear EPS | — | — | — | **MISSING FROM EXISTING SYSTEM** | Only a hardcoded, always-₹0 "Arrears Amount" UI placeholder exists (`EmployeeDetail.jsx:727-730`), with no backing data field. The generic `PayrollCorrectionService`/supplementary-run machinery exists for corrections but does not decompose into these 4 specific EPFO sub-fields |
| Refund of Advances | — | — | — | **MISSING FROM EXISTING SYSTEM** (a conceptually unrelated feature exists) | `EmployeeLoan`/`EmployeeLoanRepayment` tracks employer-issued salary advances/company loans — this is **not** the same as EPFO's concept of refunding a PF-corpus withdrawal advance |

---

## 9. Existing Database Tables

Tables directly relevant to payroll, PF, and compliance (schemas confirmed by direct migration reads during this task and prior research):

| Table | Purpose | Key columns for this analysis | Relationships |
|---|---|---|---|
| `employees` | Employee master, salary structure, statutory toggles | `pf_applicable`, `eps_applicable`, `employee_pf_wage_basis`, `employer_pf_wage_basis`, `uan_number`, `uan_mode`, `previous_employer_uan`, `basic_pay`, `da`, `date_of_birth`, `status`, `employment_model` | belongsTo `clients`, `client_branches` |
| `clients` | Customer company master, statutory config | `pf_applicable`, `pf_ceiling` (operator-editable, see §26), `pf_establishment_code`, `edli_exempted` | hasMany `employees` |
| `payroll_runs` | One row per client per payroll month | `status` enum (`draft/processing/approved/locked`), `parent_run_id` (self-ref, supplementary runs) | hasMany `payroll_run_items` |
| `payroll_run_items` | One row per employee per run — the calculated payslip data | `employee_pf`, `employer_pf` (**blended**), `employer_epf` (**EPF-only**), `employer_eps`, `lop_days`, `paid_days`, `is_excluded`, `is_correction`, `original_payroll_run_item_id` | belongsTo `payroll_runs`, `employees` |
| `compliance_filings` | Manual per-client, per-statute, per-period filing status tracker | `statute` enum(`pf,esi,pt,tds,clra`), `period` (date), `status` enum(`pending,filed`), `filed_by`, `filed_at`, `notes` | belongsTo `clients`, `users` |
| `settings` | DB-backed runtime config | `group='company_profile'`, `key='pf_establishment_code'`/`'esi_code_number'` | none (flat key-value) |
| `employee_loans` / `employee_loan_repayments` | Employer-issued salary advances/loans (NOT EPFO PF-advance refunds — see §8) | `loan_type` enum incl. `salary_advance` | belongsTo `employees` |
| `client_documents` / `employee_documents` | Only existing tables in the whole schema with a 3-state status **including an explicit "rejected" state + rejection_reason** | `verification_status`/`status` enum(`pending,verified,rejected`), `rejection_reason` | — |
| `bulk_upload_batches` | Richest existing lifecycle-tracking pattern in the codebase (4-state status, row counters, JSON summary, generic `type` discriminator) | `status`(`queued,processing,completed,failed`), `total_rows`, `error_count`, `summary` (json) | belongsTo `users`, `clients` |
| `attendance_upload_batches` | 3-state status batch pattern, per-client per-month scoping | `status`(`pending_verification,verified,approved`) | belongsTo `clients`, `users` |

**Confirmed absent from every table in the schema** (exhaustive grep across all 117 migration files for this task and the prior one): `trrn`, `challan_number`, `acknowledgement_number`, any EPFO/ESIC submission-reference column, any ECR-file-path/hash column.

---

## 10. Existing Controllers

| Controller | Relevant methods | Role in PF/Compliance |
|---|---|---|
| `app/Http/Controllers/ComplianceController.php` | `index()`, `markFiled()` | The entire "backend" of the Compliance screen — status dashboard + manual filed/pending toggle. No file generation of any kind. |
| `app/Http/Controllers/PayrollController.php` | `process()`, `approve()`, `lock()`, `releasePayslips()`, `runSupplementary()`, correction methods | Where PF actually gets calculated (via services it calls), but has zero PF-ECR-specific code. |
| `app/Http/Controllers/Admin/AdminReportController.php` | `show()`, `export()`, `pdf()` for `statutory_summary`/`statutory_profile` report keys | Exposes PF figures via the **separate** Reports module (not the Compliance page) — `StatutoryReportService` and `StatutoryProfileReportService` are the nearest existing PF-data-aggregation code, but neither produces an ECR-shaped or ECR-ready output. |

No controller anywhere in `app/Http/Controllers/` contains the string `ecr`, `Ecr`, or `ECR` (confirmed by grep for this task).

---

## 11. Existing Models

| Model | PF/Compliance relevance |
|---|---|
| `Employee` | Holds `pf_applicable`, `eps_applicable`, wage-basis toggles, `uan_number`, salary components. `getEmployeePfMonthlyAttribute()` accessor exists (`app/Models/Employee.php:126-134`) but is a **simplified, possibly-stale duplicate** of the real `SalaryCalculationService` formula (it ignores DA and the wage-basis toggle) — flagged as a code-quality concern, not fixed. |
| `Client` | Holds `pf_applicable`, `pf_ceiling` (operator-editable — see §26), `pf_establishment_code`, `edli_exempted`. |
| `PayrollRun` | `status` state machine with model-level `boot()` guards preventing edits to financial data once `approved`/`locked`. |
| `PayrollRunItem` | Holds the actual per-run PF figures (`employee_pf`, `employer_pf`, `employer_epf`, `employer_eps`). Its own `boot()` guard blocks mutation once the parent run is `approved`/`locked`. |
| `ComplianceFiling` | Thin model (`fillable` mirrors the migration exactly: `client_id, statute, period, status, filed_by, filed_at, notes`) — no business logic, no accessors, no scopes. |

---

## 12. Existing Services

| Service | Role |
|---|---|
| `app/Services/SalaryCalculationService.php` | The formula engine — computes PF/EPS/EDLI/Admin-charge/PT/LWF/Gratuity/Bonus from an employee's salary components. Called both at employee-create time (structural preview) and inside actual payroll runs. |
| `app/Services/MonthlyPayrollCalculator.php` | Orchestrates the full monthly payroll calc per employee, including calling `SalaryCalculationService` for PF and persisting results to `payroll_run_items`. |
| `app/Services/PayrollCorrectionService.php` | Post-lock correction logic — recomputes the same PF formulas independently (duplicated logic, not composed/reused) for a hypothetical corrected attendance figure. No EPFO-arrear-specific decomposition. |
| `app/Services/StatutoryDueDateService.php` | Pure due-date calculator (PF/ESI = 15th of following month per EPF Scheme Para 38(1); TDS = quarterly Form-24Q deadlines; PT = state-specific hardcoded rules for Maharashtra/Karnataka/Tamil Nadu). No filing-status or submission awareness. |
| `app/Services/StatutoryFilingResolutionService.php` | Resolves whether a PF/ESI establishment code exists for a given employee (branching on `employment_model`) — a boolean "is registration configured" check, not a contribution calculator, not a filing-status tracker. |
| `app/Services/Reports/StatutoryReportService.php` | The nearest existing PF-data aggregation: per-employee `basic_pay`, `employee_pf`, `employer_pf` from actual payroll runs, plus a client-level rollup. **Lacks UAN, EPS/EDLI split, and PF establishment code** — would need enrichment to serve as a true ECR data source. |
| `app/Services/Reports/StatutoryProfileReportService.php` | Per-employee PF/ESI/PT/LWF "Covered"/"Exempt" status + UAN. **UAN has a hardcoded dummy fallback value** (`'101299887766'`) if the real field is null — a placeholder, not real data. No monetary PF fields at all. |
| `app/Services/Reports/ComplianceCalendarReportService.php` | A report-shaped wrapper over `compliance_filings` + due dates — inherits every limitation of that table (no challan/TRRN/acknowledgement fields, because none exist upstream). |

No service anywhere is named or behaves like an ECR generator.

---

## 13. Existing Routes

| Method | URI | Controller@action | Middleware | Purpose |
|---|---|---|---|---|
| GET | `/compliance` | `ComplianceController@index` | `role:admin,manager`, `module:compliance` | Compliance dashboard |
| POST | `/compliance/mark-filed` | `ComplianceController@markFiled` | same | Manual pending/filed toggle |
| GET | `/admin/reports/statutory_summary`, `/export`, `/pdf` | `Admin\AdminReportController` | `module:reports` | The Reports-module PF/statutory register (separate feature, not on the Compliance page) |
| GET | `/admin/reports/statutory_profile`, `/export`, `/pdf` | same | `module:reports` | PF/ESI/PT coverage-status audit (separate feature) |

**No route exists** for ECR generation, ECR download, or any EPFO-specific submission action.

---

## 14. Existing UI

`resources/js/Pages/Compliance/ComplianceReports.jsx` is the only screen matching the description in the task. Confirmed contents (see §4 for full detail):

- 6 "Generate Reports & Returns" cards (Provident Fund ECR, ESI Monthly File, PT Challan Summary, TDS Form 24Q, GSTR-1 Summary, Client Audit Pack) — all rendered from a **hardcoded static array**, all with **permanently disabled buttons** labeled `"... (Coming Soon)"`, **none wired to any `onClick` handler**.
- A static "Draft Returns Auto-Populated" banner referencing a literal, hardcoded `"Payroll Run #PR-0626 (Approved)"` string.
- A real, working **Client-wise Compliance Register** DataTable with a functional filed/pending toggle per statute per client.
- A non-functional filter bar above the register (no `onChange`/`onClick` wired).
- A `Pagination` component with hardcoded, non-live values (`totalItems={17}` regardless of actual data length).

---

## 15. Official EPFO ECR Requirements

Source document (fetched and read in full for this task): **"ELECTRONIC CHALLAN CUM RETURN (ECR) FILE FORMAT (FOR EMPLOYERS)"**, `https://www.epfindia.gov.in/site_docs/PDFs/OnlineECR_PDFs/ECR_ForEmployers_FileStructure.pdf`.

**Core format rules (verbatim from the document):**
- "The Electronic Challan cum Return (ECR) will be an electronic return in **plain text format** and will consist of **DETAILED lines (one line for each member)**."
- **Field separator: `#~#`** (hash tilda hash) — explicitly stated, not comma or pipe-delimited.
- Numeric fields: "Numbers only, no special character and not in decimals" — i.e. whole numbers only, no paise/decimal representation.
- Date fields: `dd/mm/yyyy` format.
- No header or footer record is shown in the specification or its sample — each line is a complete, independent member record.
- Preparation method described: build in a spreadsheet → save as CSV → find/replace all commas with `#~#` → save as `.txt`.

**Note on the document's vintage**: this specification identifies each record by a "Member ID" (an account-number-style identifier, max 7 digits — see §16, field 1), which is distinct from the 12-digit UAN. This is the exact document at the URL supplied and is treated here as the authoritative source per instruction, without substituting a different or newer format from any other source.

---

## 16. Official ECR Field List

Full 25-field list, exact order, exact official column names, as extracted from the government PDF:

| # | Official EPFO Column Name | Width/Type | Mandatory | Key Remark |
|---|---|---|---|---|
| 1 | Member ID | Number(7) | **Yes** | Account number, max 7 digits, >0; no duplicate Member IDs within one ECR file |
| 2 | Member Name | Character(85) | **Yes** | No special characters other than '.' |
| 3 | EPF Wages | Number(10) | No | Whole numbers only |
| 4 | EPS Wages | Number(10) | No | Must be '0' if member is over 58 years, even if PF wages exist; capped at ₹6500 in certain employer-contribution-over-ceiling scenarios |
| 5 | EPF Contribution (EE Share) due | Number(10) | No | ≥ field 6 |
| 6 | EPF Contribution (EE Share) being remitted | Number(10) | No | Employee share actually remitted via this ECR |
| 7 | EPS Contribution due | Number(10) | No | ≥ field 8 |
| 8 | EPS Contribution being remitted | Number(10) | No | |
| 9 | Diff EPF and EPS Contribution (ER Share) due | Number(10) | No | The employer's EPF-only share (total 12% minus EPS 8.33%) — ≥ field 10 |
| 10 | Diff EPF and EPS Contribution (ER Share) being remitted | Number(10) | No | |
| 11 | NCP Days | Number(2) | No | "Number of days in the month for which wages are not due" |
| 12 | Refund of Advances | Number(10) | No | |
| 13 | Arrear EPF Wages | Number(10) | No | |
| 14 | Arrear EPF EE Share | Number(10) | No | |
| 15 | Arrear EPF ER Share | Number(10) | No | |
| 16 | Arrear EPS Share | Number(10) | No | |
| 17 | Father's/Husband's Name | Character(85) | No | New members only |
| 18 | Relationship with the Member | Character(1) | No | F or S; new members only |
| 19 | Date of Birth | Date(10) dd/mm/yyyy | No | New members only |
| 20 | Gender | Character(1) | No | M / F / T; new members only |
| 21 | Date of Joining EPF | Date(10) dd/mm/yyyy | No | Not later than month of ECR; new members only |
| 22 | Date of Joining EPS | Date(10) dd/mm/yyyy | No | New members only |
| 23 | Date of Exit from EPF | Date(10) dd/mm/yyyy | No | Not prior to DOJ; exiting members only |
| 24 | Date of Exit from EPS | Date(10) dd/mm/yyyy | No | Exiting members only |
| 25 | Reason for leaving | Character(1) | No, but **mandatory if field 23 is populated** | C/S/R/D/P |

---

## 17. TECLA PAY → EPFO Field Mapping

| # | Official EPFO Field | TECLA PAY Field | Table | Column | Status |
|---|---|---|---|---|---|
| 1 | Member ID | — | — | — | **MISSING** (only UAN exists, which is a different identifier) |
| 2 | Member Name | `full_name` | `employees` | `full_name` | **AVAILABLE** |
| 3 | EPF Wages | — (transient) | `SalaryCalculationService` in-memory var | n/a | **MISSING** as a stored value; re-derivable from `basic_pay`+`da` + current config only |
| 4 | EPS Wages | — (transient) | `SalaryCalculationService` in-memory var | n/a | **MISSING** as a stored value |
| 5 | EPF Contribution (EE Share) due | `employee_pf` | `payroll_run_items` | `employee_pf` | **AVAILABLE** (the "due" and "being remitted" split in the official field doesn't exist — TECLA has only one number, see §18/§19) |
| 6 | EPF Contribution (EE Share) being remitted | *(same as above — no distinct field)* | `payroll_run_items` | `employee_pf` | **AVAILABLE BUT NEEDS VALIDATION** — TECLA has no separate "due vs. remitted" concept for partial remittance |
| 7 | EPS Contribution due | `employer_eps` | `payroll_run_items` | `employer_eps` | **AVAILABLE** |
| 8 | EPS Contribution being remitted | *(same, no distinct field)* | `payroll_run_items` | `employer_eps` | **AVAILABLE BUT NEEDS VALIDATION** — same due-vs-remitted gap |
| 9 | Diff EPF and EPS Contribution (ER Share) due | `employer_epf` | `payroll_run_items` | `employer_epf` | **AVAILABLE BUT NEEDS VALIDATION** — correct column exists, but excludes EDLI/Admin (which is fine per the official field's definition, but confirm no other confusion with `employer_pf`) |
| 10 | Diff EPF and EPS Contribution (ER Share) being remitted | *(same)* | `payroll_run_items` | `employer_epf` | **AVAILABLE BUT NEEDS VALIDATION** |
| 11 | NCP Days | `lop_days` (approximate, not verified equivalent) | `payroll_run_items` | `lop_days` | **AVAILABLE BUT DIFFERENT FORMAT** — decimal/fractional vs. official whole-number; semantic equivalence to EPFO's NCP definition not verified |
| 12 | Refund of Advances | — | — | — | **MISSING** (conceptually unrelated `EmployeeLoan` feature exists but does not represent this) |
| 13 | Arrear EPF Wages | — | — | — | **MISSING** |
| 14 | Arrear EPF EE Share | — | — | — | **MISSING** |
| 15 | Arrear EPF ER Share | — | — | — | **MISSING** |
| 16 | Arrear EPS Share | — | — | — | **MISSING** |
| 17 | Father's/Husband's Name | `father_name` | `employees` | `father_name` | **AVAILABLE** |
| 18 | Relationship with the Member | — | — | — | **MISSING** (father_name is captured but not a flag distinguishing father vs. husband) |
| 19 | Date of Birth | `date_of_birth` | `employees` | `date_of_birth` | **AVAILABLE** |
| 20 | Gender | `gender` | `employees` | `gender` (enum `male,female,other`) | **AVAILABLE BUT DIFFERENT FORMAT** — TECLA's `other` value has no equivalent in EPFO's `M/F/T` set; mapping `other`→`T` would need explicit confirmation, not assumed here |
| 21 | Date of Joining EPF | `date_of_joining` (general employment DOJ, not necessarily PF-specific) | `employees` | `date_of_joining` | **AVAILABLE BUT NEEDS VALIDATION** — TECLA has one DOJ for employment overall; whether this always equals "Date of Joining EPF" (e.g. for a transferred UAN / existing PF member) is not distinguished — see `uan_mode` enum (`new` vs `existing_transfer`) which suggests the system is aware some joiners aren't "new" PF members, but this isn't cross-checked against this specific ECR field |
| 22 | Date of Joining EPS | *(same DOJ, no distinct field)* | `employees` | `date_of_joining` | **AVAILABLE BUT NEEDS VALIDATION** |
| 23 | Date of Exit from EPF | `last_working_day` | `employees` | `last_working_day` | **AVAILABLE BUT NEEDS VALIDATION** |
| 24 | Date of Exit from EPS | *(same)* | `employees` | `last_working_day` | **AVAILABLE BUT NEEDS VALIDATION** |
| 25 | Reason for leaving | `exit_reason` enum (`resignation, termination, end_of_contract, absconding`) | `employees` | `exit_reason` | **AVAILABLE BUT DIFFERENT FORMAT** — TECLA's 4-value enum does not map cleanly onto EPFO's 5-value set (`C/S/R/D/P` = Cessation/Superannuation/Retirement/Death/Permanent Disablement); e.g. TECLA has no "Retirement," "Death in Service," or "Permanent Disablement" values, and "absconding" has no obvious EPFO equivalent — **UNCLEAR**, needs explicit decision, not assumed here |

**Employer-level fields not in the per-member record but required to file (establishment code, wage month)**: `pf_establishment_code` is **AVAILABLE**, but per §7/§17-item-3, resolves to *two different values* depending on `employment_model` for employees of the same client — a structural mapping complication, not a missing-data problem.

---

## 18. ECR File Format

| Requirement | Official EPFO spec | TECLA PAY current capability |
|---|---|---|
| File type | Plain text (`.txt`) | N/A — no generation exists |
| Delimiter | `#~#` (hash tilda hash) | N/A |
| Record structure | One line per member, no header/footer | N/A |
| Encoding | Not specified in document beyond "plain text" | N/A |
| Decimal handling | Whole numbers only, no decimals | TECLA's PF amounts are stored as `decimal(10,2)`/`decimal(12,2)` — would require rounding/truncation to whole numbers for ECR export, a transformation not currently implemented anywhere |
| Date handling | `dd/mm/yyyy` | TECLA stores dates as standard SQL `date` columns — format conversion not implemented anywhere for this purpose |
| Blank values | Empty string between delimiters | N/A |
| New/exit member conditional fields | Populated only in join/exit month | TECLA has no logic distinguishing "this employee joined/exited *this specific* wage month" for ECR purposes (general `date_of_joining`/`last_working_day` exist but aren't filtered against the reporting month anywhere related to this) |

**Conclusion: 100% of the file-format layer is unimplemented** — there is no code anywhere that would assemble a `#~#`-delimited line, no whole-number rounding logic for the PF fields, and no date-reformatting logic for this specific purpose.

---

## 19. Validation Analysis

| Validation | Exists? | Code Location | Current Behaviour | Gap |
|---|---|---|---|---|
| UAN format (12 digits) | No, on the primary field | `employees.uan_number` has no digit-length rule found; only `previous_employer_uan` gets `digits:12` in `BulkUploadValidationService.php:365` | Free-form string accepted for the main UAN field | Inconsistent — the field EPFO actually cares about for ongoing filings isn't validated the same way a secondary field is |
| PF Member ID | N/A | Field doesn't exist | N/A | Cannot validate a field that isn't captured |
| Duplicate Member ID within a file | N/A | No ECR generation exists | N/A | Would need to be built from scratch |
| PF Establishment Code presence | Yes (as a boolean check) | `StatutoryFilingResolutionService::resolveStatuteForEmployee()` | Flags "is_resolved=false" with a `missing_reason` if absent | Only checks *existence*, not format validity of the code string itself |
| PF eligibility (`pf_applicable`) | Yes | `SalaryCalculationService.php:64` | Correctly gates the entire PF calculation | None found |
| EPF wages | No (not a stored/validated value at all) | — | — | See §8 |
| EPS wages | No | — | — | See §8 |
| EDLI wages | No | — | — | See §8, also never stored |
| Employee contribution | Implicit only (formula-derived, not separately validated against a "due" figure) | `SalaryCalculationService.php:85` | Computed once, no due-vs-remitted reconciliation | See §17 items 5-6 |
| Employer contribution | Same as above | `SalaryCalculationService.php:93,104-111` | Computed once | See §17 items 9-10 |
| EPS contribution | Age-58 cutoff correctly validated | `MonthlyPayrollCalculator.php` (age check region) | Correctly zeroes EPS for 58+ | Matches official EPFO rule (§16 field 4) — a genuine point of correctness |
| NCP days | N/A — concept doesn't exist | — | — | See §8 |
| LOP | Yes, as a distinct (non-EPFO-specific) concept | `AttendanceResolutionService`, stored on `payroll_run_items.lop_days` | Allows fractional (half-day) values | Would need transformation/rounding rules defined before being usable as NCP |
| Arrears | N/A — concept doesn't exist | — | — | See §8 |
| Negative amounts | Not specifically checked for PF fields | — | Formulas use `max(0, ...)`/`round()` patterns elsewhere in payroll code (per prior research on LOP proration) but this wasn't specifically re-verified for the PF-only path in this task | **Needs confirmation** |
| Decimal format | N/A for ECR (no export exists); TECLA stores as `decimal(x,2)` internally | — | — | Would need whole-number conversion logic for ECR, not implemented |
| Employee joining date | Basic date validation exists in `StoreEmployeeRequest` (general) | — | Standard Laravel date validation | No cross-check against "not later than month of ECR" (field 21's specific rule) since no ECR exists |
| Employee exit date | Same, general date validation only | — | — | No cross-check against "cannot be prior to DOJ" being re-verified at ECR-generation time (that specific rule doesn't need to be re-invented since a similar DOJ/exit-date-order check likely already exists at the general Employee level, per prior research, but this wasn't independently re-confirmed for this task) |
| Payroll month / approval / lock status | Yes, extensively (see §2) | `PayrollRun::boot()`, `PayrollController` | Correctly enforced for the general payroll flow | Not connected to any PF-ECR-specific gate since none exists |
| Missing employee information (bank details, documents) | Yes, but general payroll eligibility, not PF-specific | `PayrollEligibilityService` | Excludes the employee from payroll entirely (not just PF) | A future ECR feature would need to decide whether a PF-applicable-but-otherwise-payroll-ineligible employee (e.g., excluded for a missing bank detail unrelated to PF) should still appear in an ECR for a month they have PF wages from a *prior* successfully-processed run — this scenario is not addressed anywhere |

---

## 20. Payroll vs. ECR Reconciliation

| Reconciliation check | Can it be done today? | Why / why not |
|---|---|---|
| Payroll PF Employee Deduction vs. ECR Employee Share | **Partially** — the payroll-side number (`payroll_run_items.employee_pf`) exists and is reliable; there is no ECR side to reconcile against since no ECR exists |
| Payroll Employer PF vs. ECR Employer Share | **At risk of being done incorrectly if attempted naively** — see §1/§26: `employer_pf` (blended) is NOT the right source; `employer_epf` is, but this distinction is easy to miss without reading the actual formula code |
| Payroll EPF Wages vs. ECR EPF Wages | **Cannot be reconciled** — the wage base itself is never stored on the payroll side (§8), only the resulting contribution amount |
| Payroll EPS Wages vs. ECR EPS Wages | **Cannot be reconciled** — same reason |
| Payroll NCP vs. ECR NCP | **Cannot be reconciled with confidence** — TECLA has `lop_days` (fractional), not a validated NCP-equivalent whole-day figure |

**No reconciliation mechanism exists today** — this section documents that the *inputs* for such a reconciliation are only partially present, not that a reconciliation feature is missing (which would follow trivially once ECR generation exists, if the underlying wage-base and NCP gaps above are also addressed).

---

## 21. Government Submission Analysis

TECLA PAY currently supports:
- **ECR generation**: No (§5).
- **ECR download**: No.
- **EPFO portal upload**: No — and none should be assumed possible without a real, dedicated EPFO API integration, which does not exist in this codebase in any form (no HTTP client call, no API credentials/config, nothing in `config/services.php` referencing EPFO).
- **EPFO submission (direct)**: No.
- **Reference number / TRRN / Challan / Payment / Acknowledgement / Filed status / Rejection / Revision / Resubmission**: None of these concepts exist as data fields anywhere (§9, confirmed by exhaustive grep).

**"Manual EPFO portal submission required."** — this is the only accurate characterization of the current and any near-term state: even if ECR *generation* were built, actually uploading the resulting `.txt` file to the EPFO Unified Portal and completing the challan/payment process would remain a manual, out-of-band action performed by a human on the government's own website, exactly as it is described for GST/invoice payments elsewhere in this system (per prior research, TECLA has no payment-gateway integration for invoice collection either — payments are always recorded manually after the fact).

---

## 22. Filing Lifecycle

Requested lifecycle: `Draft → Validated → Generated → Downloaded → Submitted → Accepted/Rejected → Challan → Payment → Acknowledgement → Filed → Revision/Resubmission`.

**What exists today, mapped against this lifecycle**:

| Stage | Exists? |
|---|---|
| Draft | No — the "Draft PF ECR" banner is static text, not a real draft state |
| Validated | No |
| Generated | No |
| Downloaded | No |
| Submitted | No |
| Accepted / Rejected | No — `compliance_filings.status` has no such states (only `pending`/`filed`) |
| Challan | No |
| Payment | No |
| Acknowledgement | No |
| **Filed** | **Yes, but only as a manual, unvalidated toggle** — `ComplianceController::markFiled()` lets any admin/manager flip a client+statute+period to `filed` with zero supporting evidence required |
| Revision / Resubmission | No |

Of 11 conceptual stages, **exactly one (Filed) has any representation**, and that one representation is a bare status flag with no upstream validation, generation, or evidence trail behind it.

---

## 23. Tracking Table Analysis

**Can existing tables track the complete PF ECR lifecycle? No — not safely, and not without either significant repurposing (risky) or a new table (see §24).**

Checked against the full list of potential tracking requirements from the task:

- `compliance_filings` could *in principle* be extended with more columns, but doing so would overload a table whose current unique key (`client_id, statute, period`) is **one row per statute per client per month** — an ECR needs (at minimum) *one row per generation attempt*, since a client might regenerate/resubmit an ECR multiple times in the same month (e.g., after a rejection), and might need **two separate ECR files per month** if the client has both EOR and Agency-Contract employees resolving to different establishment codes (§7). The existing unique constraint would actively prevent tracking multiple attempts/establishment-splits correctly without a schema change.
- `bulk_upload_batches` is architecturally the closest **pattern precedent** (UUID PK, rich status enum, row counters, JSON summary, generic `type` discriminator already supporting multiple upload kinds) — but it is semantically an *inbound data import* tracker, not an *outbound government filing* tracker, and reusing it directly would conflate two different concerns (data entering the system vs. a compliance artifact leaving it).
- `client_documents`/`employee_documents` demonstrate the only existing "rejected + rejection_reason" pattern in the codebase — a useful precedent for the Accepted/Rejected stage, but these tables are for uploaded documents, not generated filings.

**Priority assessment per the task's own instructions**: reusing `compliance_filings` as-is is **not safe** (unique-constraint conflict with realistic multi-attempt/multi-establishment scenarios); extending it is **possible but would need to relax or redesign its unique constraint**, which is a schema change beyond "genuinely required" minor extension; a **new table is the most defensible path**, described conceptually (not implemented) in §24.

---

## 24. New Table Recommendation (If Required) — Conceptual Only, NOT Implemented

Per the task's explicit instruction: avoid recommending all four suggested conceptual tables automatically, and avoid duplicating payroll data — PF ECR should *reference* finalized payroll data, not recalculate it.

**Recommended minimum: ONE new table**, not four, because:
- Employee-level ECR line data can be derived at generation time directly from `payroll_run_items` (joined to `employees`) rather than duplicated into a separate "PF ECR Employee Records" table — the source of truth for contribution amounts should remain the locked payroll run, not a copy.
- A separate "PF ECR Documents" table is unnecessary if the batch table itself can hold a `file_path`/`file_hash` column (following the `bulk_upload_batches` precedent of storing `file_path` directly on the batch row).
- A separate "PF ECR Submission" table is only clearly justified if multiple submission attempts per batch need independent tracking (e.g., rejected → resubmitted) — this could alternatively be modeled as a `revision_number` + repeatable batch rows referencing the same logical filing period, avoiding a second table.

**Conceptual table: `pf_ecr_batches`** (name illustrative only — not created):
- **Purpose**: track one ECR-generation attempt for one client + one establishment code + one wage month.
- **Why `compliance_filings` is insufficient**: its unique key (`client_id, statute, period`) cannot represent multiple attempts or an establishment-code split within the same client/month (§23).
- **Illustrative columns** (conceptual, not a schema to be created): `id` (uuid, following the `bulk_upload_batches` PK style), `client_id` (FK), `payroll_run_id` (FK, referencing the source locked run — not duplicating its data), `pf_establishment_code` (string, snapshotted at generation time — see §26 on why snapshotting matters), `wage_month` (date), `employee_count`, `total_epf_wages`, `total_eps_wages`, `total_employee_contribution`, `total_employer_contribution` (aggregates only, for display — not a replacement for the per-employee source data in `payroll_run_items`), `status` (a richer enum than `compliance_filings` has today — e.g. `draft/validated/generated/downloaded/submitted/accepted/rejected/resubmitted/acknowledged`), `generated_by`/`generated_at`, `file_path`/`file_hash`, `downloaded_at`, `submitted_at`, `trrn`, `challan_number`, `challan_date`, `payment_amount`, `payment_date`, `payment_status`, `rejection_reason`, `revision_number`, `acknowledgement_reference`, `filed_at`/`filed_by`, `remarks`.
- **Relationships**: belongsTo `Client`, belongsTo `PayrollRun` (the locked run it was generated from); no `hasMany` employee-line table needed if line data is derived from `payroll_run_items` at generation/re-generation time.
- **Indexes/constraints**: a unique constraint on (`client_id`, `pf_establishment_code`, `wage_month`, `revision_number`) would correctly allow multiple revisions without the `compliance_filings`-style conflict.
- **Audit**: `created_by`/`updated_by` following the existing `BlameableTrait` convention already used elsewhere in this codebase (`Client`, `Employee`, etc.), for consistency with existing patterns — not a new convention.

**This is a recommendation for future consideration only. No table, column, or migration has been created as part of this task.**

---

## 25. Gap Analysis

| Gap | Evidence | Existing Code | Government Requirement | Impact | Recommendation |
|---|---|---|---|---|---|
| No ECR generation whatsoever | §5 | None | Full 25-field `.txt` file, `#~#` delimited | Cannot file PF returns via TECLA at all today; entirely manual/external today | Build generation service referencing `payroll_run_items` |
| No PF Member ID field | §8, §17 | None | Field 1, mandatory | Cannot populate the single most important mandatory field | Needs a new `employees` column (or equivalent) — decision needed on whether to source it from UAN-linked lookup or manual entry |
| `employer_pf` is blended, not pure EPF | §1, §3, §26 | `SalaryCalculationService.php:93` | Fields 9-10 need pure EPF-only employer share | **High** — using the wrong column would silently misreport employer contribution in any future ECR | Use `employer_epf`, not `employer_pf`, if/when ECR is built; document this distinction clearly for any future developer |
| EDLI/Admin charge amounts never persisted | §3, §8 | `SalaryCalculationService.php:90-92` | Not directly an ECR field, but relevant to full EPFO compliance reporting beyond just ECR | Medium | Consider persisting separately if broader EPFO reporting (beyond just the 25-field ECR) is ever needed |
| `clients.pf_ceiling` operator-editable below statutory ₹15,000 | §26 | `StoreClientRequest.php:322` | EPFO wage ceiling is fixed by law | **High — a genuine compliance risk independent of ECR** | Flagged for review; not fixed per instructions |
| No NCP Days concept | §8, §17, §19 | None | Field 11, whole-day integer | Cannot populate a core contribution field | Needs a defined mapping/derivation rule from existing attendance data, decided deliberately (not assumed) |
| No Arrears (4 sub-fields) | §8, §17 | Only a hardcoded ₹0 UI placeholder | Fields 13-16 | Cannot report any correction/arrear cycle via ECR | Needs new tracking, likely tied to the existing `PayrollCorrectionService`/supplementary-run machinery but decomposed into EPFO's specific categories |
| No Refund of Advances | §8, §17 | Conceptually unrelated `EmployeeLoan` feature exists | Field 12 | Cannot report PF-corpus advance refunds | Needs a distinct concept from employer-issued salary advances |
| EOR/Agency establishment-code split not handled | §7, §17, §23 | `StatutoryFilingResolutionService` resolves per-employee but nothing groups a run by resolved code | A real ECR must be filed per establishment | A client with mixed employment models could need 2 separate ECR files per month | Needs explicit grouping logic if/when built |
| `compliance_filings` schema cannot represent multiple attempts/splits | §23, §24 | Unique key `(client_id, statute, period)` | N/A (internal tracking need) | Blocks safe reuse for ECR batch tracking | New table recommended (§24), not implemented |
| No due-vs-remitted split for contributions | §17, §19, §20 | TECLA has one contribution figure per type | Official fields have paired "due" and "being remitted" columns | Cannot represent partial remittance | Needs a decision on whether this nuance matters for TECLA's use case, or whether "due" always equals "remitted" in practice |
| LOP days fractional vs. NCP integer | §8, §17, §19 | `payroll_run_items.lop_days` decimal(5,2) | Field 11 is `Number(2)`, i.e. integer | Direct mapping would produce fractional values in an integer field | Needs an explicit rounding/whole-day policy decision |
| Gender enum mismatch | §17 | `employees.gender` enum(`male,female,other`) | EPFO field 20: `M/F/T` | `other` has no obvious mapping | Needs explicit decision |
| Exit-reason enum mismatch | §17 | `employees.exit_reason` enum (4 values, none matching EPFO's `R`/`D`/`P`) | EPFO field 25: `C/S/R/D/P` | Cannot cleanly populate a conditionally-mandatory field | Needs explicit decision/possible enum extension |
| UAN not validated for format | §19 | No length rule on `employees.uan_number` | UAN is a specific 12-digit government identifier | Bad data could enter the system silently | Documented only, per instructions |

---

## 26. Existing Flow Impact Analysis

Assessing whether a *future* PF ECR implementation could affect existing flows, without recommending or making any change:

| Existing flow | Risk | Reason | Safe approach |
|---|---|---|---|
| Payroll calculation | **LOW** | ECR generation, if built correctly, should be a *read-only consumer* of `payroll_run_items` — it has no reason to touch `SalaryCalculationService`/`MonthlyPayrollCalculator` at all | Read-only, downstream-only design |
| Payroll approval/locking | **LOW** | Same reasoning — ECR would read from already-`locked` data, mirroring how `ComplianceController` already only queries `locked` runs | No changes needed to the lock workflow itself |
| PF calculation | **MEDIUM if misunderstood, LOW if correctly scoped** | The real risk isn't to the calculation code itself, but to a *future developer* misreading `employer_pf` as the EPF figure when `employer_epf` is correct (§1/§3/§26) — a documentation/tribal-knowledge risk, not a code-coupling risk | Clear internal documentation of the `employer_pf` vs `employer_epf` distinction before any ECR work begins |
| Salary calculation | **LOW** | No reason for ECR work to touch `SalaryCalculationService`'s formulas | Read-only |
| Payslip | **LOW** | Entirely separate rendering pipeline (`PayslipPdfService`), no shared code path with a hypothetical ECR generator beyond both reading `payroll_run_items` | None needed |
| Compliance Dashboard | **MEDIUM** | If ECR generation is eventually wired into the existing "Provident Fund ECR" card, the currently-static banner/button will need to become real — this is a UI *replacement*, not an addition, so it necessarily touches `ComplianceReports.jsx` | Treat as a UI feature addition to an existing page, test the rest of the page (the working Compliance Register) isn't regressed |
| Compliance Register | **LOW** | Functionally separate from any ECR feature; only shares the same page/controller | Keep `index()`/`markFiled()` untouched if possible; add new methods rather than modifying existing ones |
| Reports | **LOW** | `StatutoryReportService`/`StatutoryProfileReportService` are separate, already-shipped features; a future ECR data-aggregation step could optionally reuse patterns from these but doesn't need to modify them | Read-only reference, don't modify existing report services |
| Existing filing status (`compliance_filings`) | **MEDIUM** | If a new dedicated table is added (§24) rather than extending this one, the two must stay conceptually distinct (a `compliance_filings.status='filed'` row for `statute='pf'` should presumably reflect whatever the new ECR-tracking table records) — an integration/consistency question, not a technical coupling risk | Decide the relationship (e.g., does completing an ECR filing auto-update the existing `compliance_filings` row?) deliberately before building |
| Existing statutory calculations (ESI/PT/TDS/LWF) | **LOW** | None of these are touched by anything PF/ECR-related | None needed |

---

## 27. Risks

Consolidated from §25/§26, with explicit severity:

- **HIGH — `clients.pf_ceiling` can be set below the statutory ₹15,000 ceiling.** This is a pre-existing compliance risk in the current payroll calculation itself, independent of ECR, and is the most consequential single finding in this analysis. Documented only, not fixed, per instructions.
- **HIGH — `employer_pf` vs. `employer_epf` confusion risk.** Any future implementation (by TECLA's team or elsewhere) that naively uses `employer_pf` for an EPFO-facing figure would silently misreport the employer's EPF contribution by including EPS+EDLI+Admin charges that don't belong in that figure.
- **MEDIUM — No PF Member ID field.** A mandatory official field cannot currently be populated by any existing data.
- **MEDIUM — `compliance_filings`'s unique constraint cannot represent realistic ECR scenarios** (multiple attempts, establishment-code splits) without a schema change.
- **MEDIUM — Data-format mismatches** (fractional LOP vs. integer NCP; 3-value vs. 4-value vs. 5-value enums for various status/reason fields) would each require an explicit, deliberate mapping decision, not an automatic conversion.
- **LOW — Legacy dead code and non-functional UI controls** (`public/legacy/payroll-approval.js`, the non-functional filter bar, the hardcoded `Pagination` values) reflect general code-quality debt already noted in prior full-codebase documentation, not new risks specific to PF ECR.

---

## 28. Proposed Future Enhancement (Conceptual Only — Not Implemented)

```
Existing Approved / Locked Payroll (payroll_runs.status = 'locked')
    ↓
Existing PF Calculation (payroll_run_items.employee_pf, employer_epf, employer_eps — READ ONLY)
    ↓
PF Applicable Employee Selection (employees.pf_applicable = true, filtered by resolved establishment code)
    ↓
ECR Validation (mandatory-field completeness: Member ID*, Member Name; conditional new-joiner/exit fields)
    (*requires the PF Member ID gap in §25 to be resolved first, by whatever means TECLA decides)
    ↓
ECR Preview (on-screen, before generation — mirroring the UI's existing but currently-fake "Draft" concept, made real)
    ↓
Generate Official EPFO TXT (#~#-delimited, whole-number amounts, dd/mm/yyyy dates)
    ↓
Download
    ↓
Manual EPFO Portal Upload (outside TECLA — EPFO's own portal, as established in §21)
    ↓
EPFO Response (outside TECLA)
    ↓
Record Submission Details (TRRN, challan, acknowledgement — into the new tracking table proposed in §24)
    ↓
Challan / Payment (recorded, not processed, by TECLA — mirroring the existing manual invoice-payment pattern)
    ↓
Acknowledgement
    ↓
Mark Filed (potentially syncing back to the existing compliance_filings.status, per the integration decision flagged in §26)
```

**This is labeled explicitly as a PROPOSED FUTURE ENHANCEMENT.** It does not replace, and has not modified, any existing flow.

---

## 29. Recommended Implementation Plan (Conceptual Only — Not Implemented)

Presented as a sequenced set of decisions and build phases for a *future, separately-approved* implementation effort — nothing here has been started:

1. **Resolve open data-model decisions first** (§25/§17 "UNCLEAR"/"Needs confirmation" items): PF Member ID sourcing, gender/exit-reason enum mapping, NCP-vs-LOP policy, due-vs-remitted policy, whether `pf_ceiling` should remain operator-editable below ₹15,000.
2. **Design and review the new tracking table** (§24) before any code is written against it.
3. **Build a read-only ECR data-aggregation service** that reads `payroll_run_items`/`employees`/`clients` (via `employer_epf`, not `employer_pf`) and produces an in-memory ECR-row structure, without yet writing a file.
4. **Build the `#~#`-delimited `.txt` file writer** as a distinct, isolated piece (formatting/rounding/date-conversion logic only), testable independently of the data-aggregation step.
5. **Wire the real "Generate ECR" button** to the above two pieces, replacing (not merely adding to) the current static/disabled UI.
6. **Add manual submission-detail recording** (TRRN, challan, acknowledgement) as a distinct UI step, since EPFO submission itself remains manual/external (§21).
7. **Decide and implement the relationship to `compliance_filings`** (§26) — likely a one-way sync from the new table's "acknowledged/filed" state into `compliance_filings.status='filed'`.
8. **Test against the full matrix in §30** before considering the feature complete.

Each phase should be reviewed and separately approved before proceeding to the next, consistent with the instruction that this document itself requires review before any implementation instruction is given.

---

## 30. Future Test Cases

| # | Test Scenario | What the future implementation must get right |
|---|---|---|
| 1 | Normal PF-applicable employee | Standard EPF/EPS/EDLI math flows through correctly into the ECR row (using `employer_epf`, not `employer_pf`) |
| 2 | Non-PF employee (`pf_applicable=false`) | Correctly excluded from the ECR entirely, not included with zeroed fields |
| 3 | Missing UAN | Since UAN ≠ Member ID (§17), clarify whether missing UAN blocks ECR row generation at all, given Member ID (not UAN) is the mandatory field |
| 4 | Invalid UAN format | Should be caught by validation before generation, once UAN format validation exists (currently absent, §19) |
| 5 | Missing PF Member ID | Since this field doesn't exist in TECLA today, this test case cannot even be constructed until §25's gap is resolved — flagging the dependency |
| 6 | Duplicate PF Member ID within one ECR file | Official spec explicitly rejects this (§16, field 1) — future generator must de-duplicate or error before producing a file |
| 7 | Missing Establishment Code | Should block generation for that client/employee, reusing the existing `StatutoryFilingResolutionService` "is_resolved" check |
| 8 | PF eligible employee | Included, all fields populated |
| 9 | PF non-eligible employee | Excluded (see #2) |
| 10 | New employee (joined in the wage month) | Fields 17-22 (father's name, relationship, DOB, gender, DOJ-EPF, DOJ-EPS) must populate — currently only DOB/gender/father-name are available; relationship-flag is missing (§17 item 18) |
| 11 | Exit employee (left in the wage month) | Fields 23-25 must populate — `last_working_day` available for both EPF/EPS exit dates, but `exit_reason` enum mismatch (§25) must be resolved first |
| 12 | LOP present | Must map to NCP Days per whatever policy is decided (§25) — a naive pass-through of fractional `lop_days` would violate the integer format |
| 13 | NCP present | Cannot be tested until the NCP concept itself exists (§8) |
| 14 | Arrear present | Cannot be tested until arrears are modeled (§8) |
| 15 | Zero EPS wages (age 58+) | Must correctly output `0` per the official rule — TECLA's existing age-58 EPS cutoff (§7) is already correct and should carry through unchanged |
| 16 | Zero EPF wages | Should this employee still appear in the ECR at all, or be excluded? Not addressed anywhere — needs a decision |
| 17 | Multiple employees in one file | Verify `#~#` delimiter and line-per-member format is correctly assembled |
| 18 | Multiple clients | Verify no cross-client data leakage in a per-client-scoped generation |
| 19 | Approved (not yet locked) payroll | Given `ComplianceController` currently only ever queries `locked` data (§2), confirm whether ECR should require `locked` too, contradicting the UI's own "Approved" claim — a decision, not an assumption |
| 20 | Unapproved (draft) payroll | Must be blocked from ECR generation entirely |
| 21 | Locked payroll | The clear, safe case per existing precedent |
| 22 | Unlocked payroll | Must be blocked |
| 23 | ECR generation (happy path) | End-to-end: locked run → valid employees → correct file produced |
| 24 | ECR format (delimiter/decimal/date correctness) | Byte-level verification against the official sample in §16 |
| 25 | Payroll/ECR reconciliation | Once built, verify `employer_epf` totals in the ECR match the sum of `payroll_run_items.employer_epf` for that run — NOT `employer_pf` |
| 26 | EPFO rejection (external, manual) | Verify the new tracking table (§24) can record a rejection + reason, and that `compliance_filings` does not falsely show `filed` in that case |
| 27 | Revision | Verify a second generation attempt for the same client/month/establishment doesn't collide with the first (this is exactly why §23 flags the current `compliance_filings` unique-key conflict) |
| 28 | Resubmission | Same as #27, plus confirm prior attempt's data is preserved for audit, not overwritten |
| 29 | Challan (manual recording) | Verify challan number/date can be recorded against a specific ECR batch |
| 30 | Payment (manual recording) | Verify payment amount/date/status can be recorded, mirroring the existing manual invoice-payment pattern already used elsewhere in TECLA |
| 31 | Acknowledgement (manual recording) | Verify an acknowledgement/ARN-style reference can be recorded |
| 32 | Filed status | Verify the eventual sync (or lack thereof, per the decision in §26/§29 step 7) with the existing `compliance_filings.status` |

---

## 31. Final Recommendation

**Do not attempt to wire up the existing "Generate ECR" button as a quick fix.** The gap is not a missing button-click handler — it is a genuine data-model gap (PF Member ID, wage-base persistence, NCP, arrears, refund-of-advances) combined with one real, pre-existing compliance risk in the payroll calculation itself (`pf_ceiling`) that exists independently of ECR and should be evaluated on its own merits regardless of when/whether ECR generation is built.

The single most important thing for whoever implements this next to know, in one sentence: **`payroll_run_items.employer_pf` is not the employer's EPF contribution — `employer_epf` is — and confusing the two will silently produce a wrong government filing.**

---

# FINAL SUMMARY

**WHAT ALREADY WORKS**
- Per-employee EPF (12%), EPS (8.33%, with correct age-58 cutoff), and EDLI (0.5%) monthly calculation, correctly gated by `pf_applicable`/`eps_applicable`/`edli_exempted`.
- A working Compliance dashboard with real per-client, per-statute `pending`/`filed` status tracking and a functional manual toggle.
- A working, separate Reports module with PF-adjacent aggregate reports (`StatutoryReportService`, `StatutoryProfileReportService`).
- Correct model-level guards preventing payroll data mutation once a run is approved/locked.

**WHAT IS PARTIALLY IMPLEMENTED**
- The PF contribution split (`employer_epf` vs `employer_eps` vs the blended `employer_pf`) exists and is internally correct for its intended purpose (CTC/payslip accounting), but is not structured in a way that's directly ECR-ready without careful column selection.
- PF establishment code is configured (client-level and agency-level) but used only for a boolean completeness check, not embedded in any output.
- The Compliance page's Client-wise Register is fully functional; the "Generate Reports" cards on the same page are not.

**WHAT IS MISSING**
- PF ECR generation entirely (route, controller, service, file format logic).
- PF Member ID, EPF/EPS/EDLI wage-base persistence, NCP Days, all 4 Arrear sub-fields, Refund of Advances.
- Any TRRN/challan/acknowledgement/submission tracking, anywhere in the schema.
- A distinct "Relationship with the Member" flag and any establishment-code-based grouping of payroll data.

**WHAT IS INCORRECT**
- Nothing in the existing PF *calculation* logic was found to be arithmetically incorrect for its own stated purpose. The one substantive risk found is **not a bug but a configuration allowance**: `clients.pf_ceiling` can be set below the statutory ₹15,000 by an operator, which if used, would under-calculate PF.

**WHAT IS UNCLEAR**
- Whether `gender=other` and `exit_reason` values without an EPFO equivalent should map to a default, be blocked, or require manual override at ECR-generation time.
- Whether TECLA's "due vs. remitted" for PF contributions should ever differ (i.e., whether partial remittance is a real scenario for this business) or whether they're always equal in practice.
- Whether "Approved" (per the UI's own banner text) or "Locked" (per the only real query that exists) should be the actual required payroll status for ECR sourcing.

**WHAT OFFICIAL EPFO REQUIREMENTS ARE NOT SUPPORTED**
- 8 of the 25 official ECR fields have no TECLA data source at all (Member ID, EPF Wages, EPS Wages, Refund of Advances, and all 4 Arrear fields, plus the Relationship flag as a 9th near-miss).
- The due-vs-remitted paired-field structure (6 of the 25 fields) is not modeled.
- The `#~#`-delimited plain-text file format itself is entirely unimplemented.

**WHICH EMPLOYEES SHOULD BE INCLUDED IN ECR**
- Based on existing logic: active employees with `pf_applicable=true`, from a `locked` payroll run, not excluded by `PayrollEligibilityService`, split by their resolved PF establishment code (which differs by `employment_model` for EOR vs. Agency-Contract). This is inferred from consistent existing gates, not from any existing ECR-specific rule (since none exists).

**WHETHER EXISTING TABLES ARE SUFFICIENT**
- No — `compliance_filings`'s unique constraint cannot safely represent realistic ECR scenarios (multiple attempts, establishment splits) without a schema change.

**WHETHER NEW TRACKING TABLES ARE REQUIRED**
- Yes, conceptually one new table is recommended (§24) — not four, and not implemented as part of this task.

**WHETHER PF ECR CAN BE IMPLEMENTED WITHOUT TOUCHING PAYROLL**
- Yes, for the calculation logic itself (ECR should be a read-only downstream consumer of already-computed, already-locked `payroll_run_items` data). However, the underlying wage-base persistence gap (§8) means some new data *would* need to start being captured/stored somewhere — likely by adding fields, not by changing any existing payroll formula.

**WHAT SHOULD BE DONE NEXT**
- Review this document.
- Separately decide the open "UNCLEAR" items in §25/§17 before any implementation begins.
- Independently evaluate the `clients.pf_ceiling` compliance risk (§26/§27) on its own timeline, since it is not actually dependent on the ECR feature at all.
- Provide a separate implementation instruction only after this review, per the original task's own instruction.

---

*This document is analysis and documentation only. No PHP, Laravel, database, migration, route, Blade, React, JavaScript, or CSS file belonging to the existing TECLA PAY CRM project was created, modified, or deleted in the course of producing it. The only file created is this one: `TECLA_PAY_PF_ECR_ANALYSIS.md`.*
