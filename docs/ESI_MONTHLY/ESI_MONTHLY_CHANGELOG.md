# ESI Monthly Contribution - Change Log

**Project**: TECLA PAY
**Feature**: ESI Monthly Contribution File Generation (ESIC Bulk Upload Sheet)
**Last Updated**: 2026-08-10

---

## Summary

Generates the standard 6-column ESIC Monthly Contribution file (Excel 97-2003 `.xls`, no header row) for all ESI-eligible employees on a single **locked** payroll run. Read-only downstream consumer of `payroll_run_items` — no existing payroll, PF, or payslip calculation was modified.

**Output columns (fixed order, no header row):**
1. IP Number (`employees.esic_number`)
2. IP Name (`employees.full_name`)
3. No. of Days for which wages paid/payable (`payroll_run_items.paid_days`, rounded to whole days)
4. Total Monthly Wages (`payroll_run_items.gross_total`)
5. Reason Code, if any (left blank — no reason-code concept exists in TECLA PAY)
6. Last Working Day (`employees.last_working_day`, only if it falls within the payroll run's wage month, formatted `dd-mm-yyyy`; otherwise blank)

**Eligibility rule**: an employee is included only if `employees.esi_applicable = true` **and** `payroll_run_items.employee_esi > 0` for that run — i.e. the existing payroll engine's own already-computed monthly ESI decision is read, not re-derived. `payroll_run_items.is_excluded = true` rows are always skipped.

**Source status rule**: the payroll run must have `payroll_runs.status = 'locked'`. `draft` and `approved` runs are rejected with a 422 validation error and no file is written.

---

## Change Table

| Date | Change Type | File | Change Summary | Reason | Impact | Status |
|------|-------------|------|----------------|--------|--------|--------|
| 2026-08-10 | MIGRATION | `database/migrations/2026_08_10_140000_create_esi_monthly_batches_table.php` | Created `esi_monthly_batches` tracking table (client, payroll run, ESI code, employee count, total wages, file path/hash, generated/downloaded audit) | Track generated ESI files without overloading `compliance_filings`' `(client_id, statute, period)` unique key | Database Schema | COMPLETED |
| 2026-08-10 | MODEL | `app/Models/EsiMonthlyBatch.php` | New Eloquent model for `esi_monthly_batches`, relations to `Client`, `PayrollRun`, `User` | Mirrors the existing `PfEcrBatch` pattern for consistency | App Model | COMPLETED |
| 2026-08-10 | SERVICE | `app/Services/EsiMonthlyContributionService.php` | New service: `generate()` (locked-only gate, ESI-eligibility filter, 6-column row builder, PhpSpreadsheet `.xls` writer, no header row, batch upsert) and `download()` | Core generation logic, isolated from all payroll/PF/payslip services | Core Backend Service | COMPLETED |
| 2026-08-10 | CONTROLLER | `app/Http/Controllers/EsiMonthlyController.php` | New controller: `getRuns`, `generate`, `download`, with admin/manager-only `authorizeClientAccess` | API endpoints for the ESI Monthly feature | App Controller | COMPLETED |
| 2026-08-10 | ROUTE | `routes/web.php` | Registered `compliance.esi_monthly.{runs,generate,download}` routes under the existing `module:compliance` middleware group; added `EsiMonthlyController` import | Expose the new controller securely, consistent with existing PF ECR routes | Routing | COMPLETED |
| 2026-08-10 | UI | `resources/js/Pages/Compliance/ComplianceReports.jsx` | Set the "ESI Monthly File" card to `isFunctional: true`, corrected its button label from `(.xlsx)` to `(.xls)`, added ESI-specific state/handlers, and added a new "ESI Monthly Contribution" modal (locked-run selector, Generate & Download, generation history table) | Replace the previously disabled "Coming Soon" placeholder with a real, working flow | React Frontend | COMPLETED |
| 2026-08-10 | TEST | `tests/Feature/EsiMonthlyContributionTest.php` | New PHPUnit suite: draft/approved-run rejection, no-eligible-employee rejection, 6-column/no-header file assertions (via `PhpOffice\PhpSpreadsheet\IOFactory`), ESI-applicability filtering, `is_excluded` filtering, download + status transition, role-based access denial, idempotent regeneration | Verify the feature end-to-end without touching payroll/PF logic | Automated Test | COMPLETED — 9/9 passing |
| 2026-08-10 | DOCUMENTATION | `docs/ESI_MONTHLY/ESI_MONTHLY_CHANGELOG.md` | This file | Change documentation for the feature | Documentation | COMPLETED |

## Explicitly NOT changed

No file under `app/Services/SalaryCalculationService.php`, `app/Services/MonthlyPayrollCalculator.php`, `app/Services/PayrollCorrectionService.php`, `app/Http/Controllers/PayrollController.php`, `app/Services/PayslipPdfService.php`, or any migration/model touching `payroll_runs` / `payroll_run_items` was modified. The feature only reads already-computed, already-locked payroll data.

## Known limitations / remaining issues

- **Reason Code (column 5) is always blank.** TECLA PAY has no stored concept of an ESIC "reason code" (e.g. for zero working days) — flagged, not invented.
- **Single run, single file, no cross-run/establishment splitting.** Unlike PF ECR (which merges approved + locked supplementary child runs), this feature intentionally operates on exactly one selected locked `payroll_run_id` at a time, per the "one file containing all eligible employees" requirement. If a client's ESI-eligible headcount is split across a parent run and a locked supplementary run, two separate files/generations would currently be needed — not automatically consolidated.
- **No ESIC portal submission tracking.** Unlike `pf_ecr_batches` (which has `trrn`/`challan_number`/status lifecycle beyond `generated`/`downloaded`), `esi_monthly_batches` only tracks generation and download — this was intentionally scoped out since it was not requested; can be extended later following the exact same pattern already built for PF ECR if needed.
- **IP Number / Last Working Day format not independently verified against the current official ESIC bulk-upload template** (no live fetch of an ESIC source document was performed for this task, unlike the PF ECR feature which was built against a fetched official EPFO PDF). The 6-column layout used here is the long-established standard ESIC Monthly Contribution format; if ESIC's current portal template differs, the column mapping in `EsiMonthlyContributionService::generate()` is the single place to adjust.
