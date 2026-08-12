# Database `company_id` Analysis & Table Classification

## Overview & Classification Rules

Tables are classified into three primary operational tiers:
1. **Master / Tenant Table**: The primary tenant anchor (`companies`).
2. **Business / Multi-Tenant Table**: Core operational tables holding company data. **`company_id` = REQUIRED**.
3. **Lookup / Statutory Shared Table**: System-wide static references (e.g., statutory PT slabs, ESI reason codes). `company_id` NOT required unless client custom overrides are applied.
4. **System / Framework Table**: Laravel internal tables (sessions, jobs, migrations, cache). `company_id` NOT required.

---

## Full Database Table Classification Audit

| Table Name | Type | `company_id` Required | Existing Company Relation | Migration Notes |
| :--- | :--- | :--- | :--- | :--- |
| `companies` | **Master Tenant** | **PRIMARY KEY** (`id`) | Self (Root Tenant Entity) | **[NEW TABLE]** Master company entity. |
| `users` | Business / Tenant | **REQUIRED** | `client_id` (partial) | Add nullable `company_id` FK to `companies(id)`. Pivot table `company_user` for multi-company access. |
| `clients` | Business / Tenant | **REQUIRED** | `id` (acts as legacy client anchor) | Add `company_id` FK. Maps Client accounts under Parent Company / Tenant. |
| `client_branches` | Business / Tenant | **REQUIRED** | Indirect via `client_id` | Add `company_id` FK. Index on `(company_id, client_id)`. |
| `client_contacts` | Business / Tenant | **REQUIRED** | Indirect via `client_id` | Add `company_id` FK. |
| `client_documents` | Business / Tenant | **REQUIRED** | Indirect via `client_id` | Add `company_id` FK. |
| `client_user` | Pivot / Tenant | **REQUIRED** | `client_id`, `user_id` | Pivot linking Users to Clients. Add `company_id` FK for scope validation. |
| `employees` | Business / Tenant | **REQUIRED** | `client_id` | Add `company_id` FK. Composite unique index `(company_id, emp_code)`. |
| `employee_documents` | Business / Tenant | **REQUIRED** | Indirect via `employee_id` | Add `company_id` FK. Backfill from `employees.company_id`. |
| `employee_exits` | Business / Tenant | **REQUIRED** | `client_id`, `employee_id` | Add `company_id` FK. Index on `(company_id, employee_id)`. |
| `employee_leave_balances` | Business / Tenant | **REQUIRED** | `client_id`, `employee_id` | Add `company_id` FK. Composite index `(company_id, employee_id, year)`. |
| `employee_loans` | Business / Tenant | **REQUIRED** | `client_id`, `employee_id` | Add `company_id` FK. |
| `employee_loan_repayments` | Business / Tenant | **REQUIRED** | Indirect via `employee_loan_id` | Add `company_id` FK. Backfill from `employee_loans`. |
| `employee_queries` | Business / Tenant | **REQUIRED** | `client_id`, `employee_id` | Add `company_id` FK. |
| `employee_tax_declarations` | Business / Tenant | **REQUIRED** | `client_id`, `employee_id` | Add `company_id` FK. Composite index `(company_id, employee_id, financial_year)`. |
| `attendance_records` | Business / Tenant | **REQUIRED** | `client_id`, `employee_id` | Add `company_id` FK. Composite index `(company_id, employee_id, date)`. |
| `attendance_correction_requests` | Business / Tenant | **REQUIRED** | `client_id`, `employee_id` | Add `company_id` FK. Index `(company_id, status)`. |
| `attendance_upload_batches` | Business / Tenant | **REQUIRED** | `client_id` | Add `company_id` FK. |
| `attendance_upload_staging_rows` | Business / Tenant | **REQUIRED** | `client_id` | Add `company_id` FK. Index `(company_id, batch_id)`. |
| `leave_requests` | Business / Tenant | **REQUIRED** | `client_id`, `employee_id` | Add `company_id` FK. Composite index `(company_id, employee_id, status)`. |
| `payroll_runs` | Business / Tenant | **REQUIRED** | `client_id` | Add `company_id` FK. Composite index `(company_id, year, month, status)`. |
| `payroll_run_items` | Business / Tenant | **REQUIRED** | `client_id`, `payroll_run_id` | Add `company_id` FK. Composite index `(company_id, payroll_run_id, employee_id)`. |
| `salary_revisions` | Business / Tenant | **REQUIRED** | `client_id`, `employee_id` | Add `company_id` FK. Index `(company_id, employee_id)`. |
| `invoices` | Business / Tenant | **REQUIRED** | `client_id` | Add `company_id` FK. Composite unique index `(company_id, invoice_number)`. |
| `invoice_line_items` | Business / Tenant | **REQUIRED** | Indirect via `invoice_id` | Add `company_id` FK. Backfill from `invoices.company_id`. |
| `invoice_additional_fees` | Business / Tenant | **REQUIRED** | Indirect via `invoice_id` | Add `company_id` FK. Backfill from `invoices.company_id`. |
| `client_attendance_verifications` | Business / Tenant | **REQUIRED** | `client_id` | Add `company_id` FK. |
| `client_leave_policies` | Business / Tenant | **REQUIRED** | `client_id` | Add `company_id` FK. Composite index `(company_id, client_id)`. |
| `pf_ecr_batches` | Business / Tenant | **REQUIRED** | `client_id` | Add `company_id` FK. Index `(company_id, month, year)`. |
| `esi_monthly_batches` | Business / Tenant | **REQUIRED** | `client_id` | Add `company_id` FK. Index `(company_id, month, year)`. |
| `esi_reason_codes` | Lookup / Statutory | NOT REQUIRED | Global Reference | Master statutory reason code lookup (global statutory standard). |
| `pt_challan_batches` | Business / Tenant | **REQUIRED** | `client_id` | Add `company_id` FK. Index `(company_id, month, year, state)`. |
| `pt_slabs` | Lookup / Statutory | NOT REQUIRED | Global Reference | Government Professional Tax slabs per state (global reference table). |
| `lwf_slabs` | Lookup / Statutory | NOT REQUIRED | Global Reference | Labour Welfare Fund slabs per state (global reference table). |
| `gstr1_batches` | Business / Tenant | **REQUIRED** | `client_id` | Add `company_id` FK. Index `(company_id, month, year)`. |
| `tds_24q_batches` | Business / Tenant | **REQUIRED** | `client_id` | Add `company_id` FK. Index `(company_id, quarter, financial_year)`. |
| `tds_challans` | Business / Tenant | **REQUIRED** | `client_id` | Add `company_id` FK. Index `(company_id, quarter, financial_year)`. |
| `client_audit_pack_batches` | Business / Tenant | **REQUIRED** | `client_id` | Add `company_id` FK. |
| `compliance_filings` | Business / Tenant | **REQUIRED** | `client_id` | Add `company_id` FK. |
| `weekly_off_holidays` | Business / Tenant | **REQUIRED** | `client_id` | Add `company_id` FK. Composite index `(company_id, client_id, year)`. |
| `employee_attendance_overrides` | Business / Tenant | **REQUIRED** | `client_id`, `employee_id` | Add `company_id` FK. |
| `bank_change_requests` | Business / Tenant | **REQUIRED** | `client_id`, `employee_id` | Add `company_id` FK. Index `(company_id, status)`. |
| `bulk_upload_batches` | Business / Tenant | **REQUIRED** | `client_id` | Add `company_id` FK. |
| `bulk_upload_staging_rows` | Business / Tenant | **REQUIRED** | Indirect via `batch_id` | Add `company_id` FK. |
| `app_notifications` | Business / Tenant | **REQUIRED** | `client_id` | Add `company_id` FK. Index `(company_id, user_id, read_at)`. |
| `notification_watchers` | Business / Tenant | **REQUIRED** | `client_id` | Add `company_id` FK. |
| `audit_logs` | Business / Tenant | **REQUIRED** | `client_id` | Add `company_id` FK. Composite index `(company_id, created_at)`. |
| `settings` | Business / System | **REQUIRED (Mixed)** | Global Key/Value | Add nullable `company_id` FK. If `company_id` is null = global default setting; if set = company override setting. |
| `otp_codes` | System / Auth | NOT REQUIRED | `user_id` | Ephemeral auth table tied to `user_id`. |
| `password_histories` | System / Auth | NOT REQUIRED | `user_id` | Password history table tied to `user_id`. |
| `login_attempts` | System / Auth | NOT REQUIRED | None (IP / Email) | Global rate-limiting and IP tracking table. |
| `cache` / `cache_locks` | Framework | NOT REQUIRED | None | Framework cache table. |
| `jobs` / `job_batches` / `failed_jobs` | Framework | NOT REQUIRED | None | Framework queue execution. |
| `sessions` | Framework | NOT REQUIRED | None | Framework web sessions. |
| `migrations` | Framework | NOT REQUIRED | None | Framework schema state tracker. |

---

## Key Analysis Insights

### 1. Existing Tables Already Having `company_id`
* **Current Status**: **0 tables** currently possess `company_id`.
* Current data isolation relies on `client_id` or indirect employee relations (`employee_id -> client_id`).

### 2. Tables Missing `company_id` (Needing Migration)
* **43 Business Tables** require the immediate addition of `company_id` foreign key column:
  `users`, `clients`, `client_branches`, `client_contacts`, `client_documents`, `client_user`, `employees`, `employee_documents`, `employee_exits`, `employee_leave_balances`, `employee_loans`, `employee_loan_repayments`, `employee_queries`, `employee_tax_declarations`, `attendance_records`, `attendance_correction_requests`, `attendance_upload_batches`, `attendance_upload_staging_rows`, `leave_requests`, `payroll_runs`, `payroll_run_items`, `salary_revisions`, `invoices`, `invoice_line_items`, `invoice_additional_fees`, `client_attendance_verifications`, `client_leave_policies`, `pf_ecr_batches`, `esi_monthly_batches`, `pt_challan_batches`, `gstr1_batches`, `tds_24q_batches`, `tds_challans`, `client_audit_pack_batches`, `compliance_filings`, `weekly_off_holidays`, `employee_attendance_overrides`, `bank_change_requests`, `bulk_upload_batches`, `bulk_upload_staging_rows`, `app_notifications`, `notification_watchers`, `audit_logs`, `settings`.

### 3. Master Tenant Entity to Create
* **`companies` Table Schema**:
  - `id` (bigint unsigned, auto-increment)
  - `name` (varchar 255)
  - `company_code` (varchar 50, unique)
  - `legal_name` (varchar 255)
  - `email` (varchar 255)
  - `status` (enum: active, inactive, suspended)
  - `created_at`, `updated_at`, `deleted_at` (soft deletes)

### 4. Foreign Key Constraints & Cascade Policy
* Constraint Name Convention: `fk_{table}_company_id` -> `companies(id)`
* Action: `ON DELETE RESTRICT` for financial and statutory tables (`payroll_runs`, `invoices`, `employees`, `compliance_filings`, `pf_ecr_batches`) to prevent catastrophic data wiping.
* Action: `ON DELETE CASCADE` for ephemeral staging/draft tables (`attendance_upload_staging_rows`, `bulk_upload_staging_rows`).

### 5. Composite Index Requirements for Performance & Isolation
* `employees`: `INDEX idx_emp_company_status (company_id, status)`
* `employees`: `UNIQUE INDEX idx_emp_company_code (company_id, employee_code)`
* `attendance_records`: `INDEX idx_att_company_date (company_id, date)`
* `attendance_records`: `INDEX idx_att_company_emp_date (company_id, employee_id, date)`
* `payroll_runs`: `INDEX idx_pr_company_period (company_id, year, month, status)`
* `payroll_run_items`: `INDEX idx_pri_company_run (company_id, payroll_run_id)`
* `invoices`: `UNIQUE INDEX idx_inv_company_num (company_id, invoice_number)`
