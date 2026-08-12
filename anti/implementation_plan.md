# Implementation Plan - TECLA PAY Provident Fund (PF) ECR Feature

## Goal Overview
Implement official EPFO Electronic Challan cum Return (ECR) text file generation (`.txt`) for approved/locked payroll runs in **TECLA PAY**, following the official government specification ([EPFO ECR File Structure](https://www.epfindia.gov.in/site_docs/PDFs/OnlineECR_PDFs/ECR_ForEmployers_FileStructure.pdf)). The implementation includes:
1. Sourcing data strictly as a **read-only consumer** of finalized payroll runs without altering any existing payroll formulas, payslip logic, or locking workflows.
2. Mapping database fields to the official **25-field `#~#`-delimited EPFO format**.
3. Pre-generation validation that blocks invalid filings and reports all missing mandatory fields (e.g. missing PF Member ID).
4. Pre-generation ECR preview and monetary reconciliation against locked `payroll_run_items`.
5. Secure `.txt` file generation, storage, and authorized download.
6. Statutory compliance tracking (`pf_ecr_batches`) for ECR lifecycle status (Draft $\rightarrow$ Validated $\rightarrow$ Generated $\rightarrow$ Downloaded $\rightarrow$ Submitted $\rightarrow$ Filed).
7. Comprehensive project documentation under `/docs/PF_ECR/`.

---

## User Review Required

> [!IMPORTANT]
> **CRITICAL DATA SOURCE RULE**: `payroll_run_items.employer_pf` is a blended figure (EPF + EPS + EDLI + Admin charges) used for CTC/invoicing. In accordance with strict compliance requirements, the generator uses `payroll_run_items.employer_epf` for Field 9/10 (Employer EPF Share). `employer_pf` is **NEVER** used as the EPF contribution.

> [!NOTE]
> **READ-ONLY PAYROLL DESIGN**: ECR generation is built entirely downstream of `payroll_runs` and `payroll_run_items`. No existing calculation in `SalaryCalculationService`, `MonthlyPayrollCalculator`, or `PayrollController` is altered.

> [!IMPORTANT]
> **DATABASE SCHEMA PROPOSAL**:
> 1. **`pf_member_id` & `member_relationship` in `employees`**: EPFO Field #1 requires a Member ID (Member Account Number, distinct from UAN) and Field #18 requires member relationship (`F` for Father, `S` for Spouse/Husband).
> 2. **Dedicated `pf_ecr_batches` Table**: The existing `compliance_filings` table has a unique key constraint on `(client_id, statute, period)` representing one aggregate filing status per client per month. It cannot store generated file paths, file hashes, TRRN, challan numbers, generated-by audit logs, or support multiple generation revisions/establishment code splits. Therefore, a dedicated `pf_ecr_batches` table is proposed.

---

## Official EPFO 25-Field Mapping Table

| # | Official EPFO Field Name | Width/Type | TECLA PAY Source / Formula | Validation / Mandatory Rule |
|---|---|---|---|---|
| 1 | Member ID | Num(7) | `employees.pf_member_id` | **Mandatory**. Error if missing |
| 2 | Member Name | Char(85) | `employees.full_name` | **Mandatory**. Stripped of non-'.' special chars |
| 3 | EPF Wages | Num(10) | Re-derived integer: `min(Basic+DA, pf_ceiling)` or `Basic+DA` based on `pf_wage_basis` | Whole integer, `0` if non-PF |
| 4 | EPS Wages | Num(10) | `min(Basic+DA, 15000)` integer; `0` if age $\ge 58$ or `eps_applicable == false` | Whole integer, capped at 15000 |
| 5 | EPF Contribution (EE Share) due | Num(10) | `round(payroll_run_items.employee_pf)` | Whole integer |
| 6 | EPF Contribution (EE Share) being remitted | Num(10) | Same as Field 5 | Whole integer |
| 7 | EPS Contribution due | Num(10) | `round(payroll_run_items.employer_eps)` | Whole integer |
| 8 | EPS Contribution being remitted | Num(10) | Same as Field 7 | Whole integer |
| 9 | Diff EPF and EPS Contribution (ER Share) due | Num(10) | `round(payroll_run_items.employer_epf)` (**NOT** `employer_pf`) | Whole integer |
| 10 | Diff EPF and EPS Contribution (ER Share) being remitted | Num(10) | Same as Field 9 | Whole integer |
| 11 | NCP Days | Num(2) | `round(payroll_run_items.lop_days)` capped to integer days in wage month | Whole integer $\le 31$ |
| 12 | Refund of Advances | Num(10) | `0` | Default 0 |
| 13 | Arrear EPF Wages | Num(10) | `0` | Default 0 |
| 14 | Arrear EPF EE Share | Num(10) | `0` | Default 0 |
| 15 | Arrear EPF ER Share | Num(10) | `0` | Default 0 |
| 16 | Arrear EPS Share | Num(10) | `0` | Default 0 |
| 17 | Father's/Husband's Name | Char(85) | `employees.father_name` (or `spouse_name` if relationship is `S`) | Optional / New joiner |
| 18 | Relationship with the Member | Char(1) | `employees.member_relationship` ('F' or 'S') | Defaults to 'F' |
| 19 | Date of Birth | Date `dd/mm/yyyy` | `employees.date_of_birth` | Required format `dd/mm/yyyy` |
| 20 | Gender | Char(1) | `employees.gender` mapped (`male` $\rightarrow$ `M`, `female` $\rightarrow$ `F`, `other` $\rightarrow$ `T`) | Valid values: M / F / T |
| 21 | Date of Joining EPF | Date `dd/mm/yyyy` | `employees.date_of_joining` if DOJ in wage month, else blank | Blank if not joined in current month |
| 22 | Date of Joining EPS | Date `dd/mm/yyyy` | `employees.date_of_joining` if DOJ in month & `eps_applicable`, else blank | Blank if not joined in current month |
| 23 | Date of Exit from EPF | Date `dd/mm/yyyy` | `employees.last_working_day` if exit in wage month, else blank | Blank if not exited in current month |
| 24 | Date of Exit from EPS | Date `dd/mm/yyyy` | `employees.last_working_day` if exit in month & `eps_applicable`, else blank | Blank if not exited in current month |
| 25 | Reason for leaving | Char(1) | Mapped from `employees.exit_reason`: `resignation`/`end_of_contract` $\rightarrow$ `C` (Cessation), `termination` $\rightarrow$ `C` | Mandatory if Exit Date populated |

---

## Proposed Changes

---

### Database Layer

#### [NEW] [2026_08_10_133000_add_pf_member_id_to_employees_table.php](file:///f:/xampp/htdocs/tecla-payroll/database/migrations/2026_08_10_133000_add_pf_member_id_to_employees_table.php)
- Add `pf_member_id` (string 50, nullable, indexed) to `employees`.
- Add `member_relationship` (enum `['F', 'S']`, default `'F'`) to `employees`.

#### [NEW] [2026_08_10_133500_create_pf_ecr_batches_table.php](file:///f:/xampp/htdocs/tecla-payroll/database/migrations/2026_08_10_133500_create_pf_ecr_batches_table.php)
- Create `pf_ecr_batches` table with:
  - `id` (bigIncrements)
  - `client_id` (FK to `clients`)
  - `payroll_run_id` (FK to `payroll_runs`)
  - `pf_establishment_code` (string)
  - `wage_month` (date)
  - `employee_count` (integer)
  - `total_epf_wages` (decimal 12,2)
  - `total_eps_wages` (decimal 12,2)
  - `total_employee_epf` (decimal 12,2)
  - `total_employer_epf` (decimal 12,2)
  - `total_employer_eps` (decimal 12,2)
  - `total_ncp_days` (integer)
  - `status` (enum: `draft`, `validated`, `generated`, `downloaded`, `submitted`, `accepted`, `rejected`, `filed`)
  - `file_path`, `file_name`, `file_hash` (string, nullable)
  - `generated_by` (FK to `users`, nullable), `generated_at` (timestamp, nullable), `downloaded_at` (timestamp, nullable)
  - `trrn`, `challan_number`, `acknowledgement_ref` (string, nullable)
  - `rejection_reason`, `remarks` (text, nullable)
  - `created_by`, `updated_by` (Blameable audit columns)
  - `timestamps`, `softDeletes`

---

### Backend Layer

#### [NEW] [PfEcrBatch.php](file:///f:/xampp/htdocs/tecla-payroll/app/Models/PfEcrBatch.php)
- Eloquent Model for `pf_ecr_batches` table with relationships to `Client`, `PayrollRun`, `User`.

#### [NEW] [PfEcrGeneratorService.php](file:///f:/xampp/htdocs/tecla-payroll/app/Services/PfEcrGeneratorService.php)
- **Responsibilities**:
  - `preview(int $payrollRunId)`: Fetches locked run items, maps PF-applicable employees (`pf_applicable == true`), validates mandatory fields, calculates monetary totals, reconciles totals against `payroll_run_items`, and returns structured preview payload with error details.
  - `generate(int $payrollRunId, int $userId)`: Performs full validation, formats `#~#` lines, creates `.txt` file, saves to `storage/app/pf_ecr/`, creates `PfEcrBatch` record, and returns batch details.
  - `download(int $batchId, int $userId)`: Validates client access permissions, streams file download response.

#### [NEW] [PfEcrController.php](file:///f:/xampp/htdocs/tecla-payroll/app/Http/Controllers/PfEcrController.php)
- Controller methods: `getRuns`, `preview`, `generate`, `download`, `updateStatus`.

#### [MODIFY] [routes/web.php](file:///f:/xampp/htdocs/tecla-payroll/routes/web.php)
- Add authenticated & authorized routes for PF ECR under `module:compliance` middleware group:
  - `GET /compliance/pf-ecr/runs`
  - `POST /compliance/pf-ecr/preview`
  - `POST /compliance/pf-ecr/generate`
  - `GET /compliance/pf-ecr/download/{id}`
  - `POST /compliance/pf-ecr/update-status/{id}`

---

### Frontend Layer

#### [MODIFY] [ComplianceReports.jsx](file:///f:/xampp/htdocs/tecla-payroll/resources/js/Pages/Compliance/ComplianceReports.jsx)
- Replace static disabled `"Generate ECR (.txt) (Coming Soon)"` button with working interactive flow.
- Add PF ECR Modal/Drawer component featuring:
  1. Payroll Run selector (filtered by client and approved/locked status).
  2. Summary cards (Headcount, EPF Wages, EE EPF, ER EPF, EPS Share, Establishment Code).
  3. Validation Error alerts (lists missing `pf_member_id` or data errors per employee).
  4. Generate & Download `.txt` buttons.
  5. ECR History / Batch status tracking table.

---

### Documentation Layer (`/docs/PF_ECR/`)

#### [NEW] Documentation Suite
Create comprehensive project documentation:
1. `/docs/PF_ECR/README.md` (Document index & implementation status)
2. `/docs/PF_ECR/PF_ECR_SRS.md` (Software Requirements Specification)
3. `/docs/PF_ECR/PF_ECR_CHANGELOG.md` (Itemized change log)
4. `/docs/PF_ECR/PF_ECR_FILE_CHANGES.md` (File change inventory)
5. `/docs/PF_ECR/PF_ECR_FLOW.md` (Old vs New system flow comparison)
6. `/docs/PF_ECR/PF_ECR_DEPLOYMENT_GUIDE.md` (Deployment and staging instructions)
7. `/docs/PF_ECR/PF_ECR_ROLLBACK_PLAN.md` (Detailed rollback procedures)
8. `/docs/PF_ECR/PF_ECR_TEST_CASES.md` (Test matrix & results)
9. `/docs/PF_ECR/PF_ECR_RELEASE_CHECKLIST.md` (Release verification checklist)

---

## Verification Plan

### Automated Tests
Create feature test suite [PfEcrTest.php](file:///f:/xampp/htdocs/tecla-payroll/tests/Feature/PfEcrTest.php):
- `test_locked_payroll_run_ecr_preview_and_generation()`: Verifies valid ECR generated for locked run.
- `test_draft_payroll_run_ecr_generation_blocked()`: Verifies draft/unapproved runs are rejected.
- `test_missing_pf_member_id_blocks_ecr_generation()`: Verifies missing Member ID produces validation error.
- `test_non_pf_applicable_employees_excluded()`: Verifies `pf_applicable == false` employees are excluded.
- `test_reconciliation_total_mismatch_blocks_generation()`: Verifies sum reconciliation check.
- `test_ecr_file_format_and_delimiter()`: Validates 25 `#~#`-delimited fields and date/number formats.
- `test_unauthorized_user_cannot_access_ecr()`: Validates security & multi-tenant isolation.

### Manual Verification
1. Navigate to Statutory Compliance Center (`/compliance`).
2. Open PF ECR generator modal.
3. Select an Approved/Locked payroll run.
4. Verify summary totals and validation messages.
5. Click **Generate ECR (.txt)** and inspect generated `.txt` file contents against official EPFO rules.
