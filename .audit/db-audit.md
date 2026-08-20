# TECLA Payroll — Database Audit

*Generated 2026-08-19 via direct inspection of `database/migrations/*.php` (138 files), `app/Models/*.php`, `config/database.php`, `composer.json`. Cross-checked against the prior (2026-08-11) architecture proposal at `docs/architecture/` — treated as secondary/context only, not as ground truth, since it predates ~15 later migrations.*

## 1. Full table inventory (~62 real tables, grouped)

**Client / company**
`clients` (the tenant/company record — see §2, heavily overloaded), `client_contacts`, `client_branches`, `client_documents`, `client_leave_policies`, `client_attendance_verifications`, `client_audit_pack_batches`, `client_user` (pivot: users ↔ clients).

**Employee / HR**
`employees`, `employee_documents`, `employee_exits`, `employee_queries`, `salary_revisions`, `bank_change_requests`, `employee_loans`, `employee_loan_repayments`, `employee_tax_declarations`, `employee_leave_balances`, `employee_attendance_overrides`, `holidays`.

**Attendance / Leave**
`attendance_records`, `attendance_correction_requests`, `attendance_upload_batches`, `attendance_upload_staging_rows`, `leave_requests`.

**Payroll**
`payroll_runs`, `payroll_run_items`.

**Statutory reference data (global, not client-scoped)**
`pt_slabs`, `lwf_slabs`, `statutory_acts`, `esi_reason_codes`.

**Statutory batches (client-scoped filing/report generation)**
`compliance_filings`, `pf_ecr_batches`, `esi_monthly_batches`, `pt_challan_batches`, `gstr1_batches`, `tds_24q_batches`, `tds_challans`, `form_b_batches`.

**Billing / invoicing**
`invoices`, `invoice_line_items`, `invoice_additional_fees`.

**Bulk upload / staging**
`bulk_upload_batches`, `bulk_upload_staging_rows`.

**Auth / user / security**
`users`, `password_reset_tokens`, `sessions`, `otp_codes`, `password_histories`, `login_attempts`, `audit_logs`.

**Notifications / misc**
`notification_watchers`, `app_notifications`, `settings` (global key/value, not client-scoped).

**Laravel boilerplate**
`cache`, `cache_locks`, `jobs`, `job_batches`, `failed_jobs`.

## 2. `clients` is NOT a pure company/tenant identity table — the central finding

Base migration `2026_07_03_105316_create_clients_table.php`, extended by **28 further migrations**. ~95-100 columns today, splitting roughly into:

- **Payroll/statutory config (~30 cols, 40-45% of the row)**: `pf_ceiling`, `pf_applicable`, `employee_pf_wage_basis`, `employer_pf_wage_basis`, `edli_exempted`, `pf_establishment_code`, `esi_limit`, `esi_applicable`, `esi_code_number`, `lwf_frequency`, `lwf_applicable`, `tds_regime`, `tds_applicable`, `pt_state`, `state_registration_option`, `default_gratuity_mode`, `gratuity_applicable`, `statutory_bonus_applicable`, `bonus_rate_percentage`, `statutory_bonus_type`, `applicable_statutory_acts` (json), `clra_license_number/expiry`, `cutoff_day`, `payroll_lock_day`, `salary_credit_day`, `payroll_convention`, `custom_cycle_start_day/end_day`, `payslip_visible_sections`, `payslip_template`, `health_insurance_enabled`.
- **Billing/invoicing config (~15 cols)**: `billing_model`, `markup_percentage`, `markup_applied_on`, `fixed_fee_amount`, `hourly_rate`, `client_tds_percentage`, `tds_applicable_on_agency_fee`, `credit_limit`, `late_payment_penalty_pct`, `payment_net_terms`, `invoice_cycle`, `invoice_raise_day`, `invoice_dispute_window_days`, `po_required`, `po_number`.
- **Client portal access config (~11 cols)**: `client_portal_enabled`, `portal_access_level`, `portal_users_limit`, `portal_view_salary`, `portal_view_invoices`, `portal_view_payslips`, `portal_raise_requests`, `portal_require_2fa`, `portal_session_timeout`, `portal_ip_whitelist`, `portal_primary_email`.
- **Generic company identity (~30 cols)**: `company_name`, `client_code`, `industry`, `company_type`, `country`, `pan_number`, `tax_id`, `tan_number`, `gstin`, `trust_registration_number`, `registration_number`, `cin_number`, `incorporation_date`, `website`, `logo_path`, registered address (5 fields), `contract_type`, `contract_start/end_date`, `sla_tier`, `account_manager_id`/`backup_account_manager_id`, `status`, `onboarding_current_step`/`onboarding_completed_steps`, primary POC (3 fields), `currency`.

**Trend**: every column added since the initial wizard has been payroll-flavored — the table is getting *more* coupled over time, not less. There is no `client_payroll_configs`/`client_statutory_profiles` split today; it's one flat row.

## 3. Foreign key / ownership pattern — inconsistent

- **~23 tables have a direct `client_id` FK**: `employees`, `client_contacts`, `client_documents`, `client_branches`, `users` (nullable), `client_user`, `payroll_runs`, `invoices`, `attendance_upload_batches`, `client_attendance_verifications`, `compliance_filings`, `holidays`, `employee_queries`, `bulk_upload_batches` (nullable), `attendance_upload_staging_rows` (nullable), `client_leave_policies`, `pf_ecr_batches`, `esi_monthly_batches`, `pt_challan_batches`, `tds_24q_batches`, `tds_challans`, `client_audit_pack_batches`, `form_b_batches`.
- **Scoped only indirectly via `employee_id` → `employees.client_id`** (no `client_id` of their own): `salary_revisions`, `employee_documents`, `employee_exits`, `bank_change_requests`, `attendance_records`, `attendance_correction_requests`, `leave_requests`, `employee_loans`, `employee_loan_repayments`, `employee_tax_declarations`, `employee_leave_balances`.
- **Scoped only via `payroll_run_id` → `payroll_runs.client_id`**: `payroll_run_items`.
- **Global reference tables (correctly unscoped)**: `pt_slabs`, `lwf_slabs`, `statutory_acts`, `esi_reason_codes`, `settings`.

This mixed ownership chain (some direct FK, some two-hop join) is a known risk surface — an existing Playwright suite (`tests/e2e/client-isolation-security.spec.ts`) and docs (`docs/testing/client-isolation-final-report.md`, `docs/testing/security-findings.md`) already track it.

## 4. Existing multi-tenant / product / subscription concepts

| Concept | Exists today? | Evidence |
|---|---|---|
| Separate "company" vs "client" entity | **No** | No `companies` table anywhere |
| "product"/"module"/"subscription" table | **No** | Zero matches for `Schema::create('(products\|modules\|subscriptions\|tenants)'` |
| "tenant" table distinct from `clients` | **No** | — |
| Multiple DB connections/schemas in use | **No** | `.env`: `DB_CONNECTION=mysql` only; no `DB::connection('other')`/`Schema::connection()` tenant routing anywhere |
| Tenancy packages (`stancl/tenancy` etc.) | **No** | Not in `composer.json` |
| Per-tenant DB routing | **No** | — |

Closest analogs: `users.module_permissions` (JSON, per-*user* feature RBAC, nothing to do with tenant/product entitlement) and `clients.applicable_statutory_acts` (JSON, act-level classification, not product-level).

**Conclusion: this is architecturally single-database, single-schema, shared-tables multi-client via `client_id` FKs, with zero product/module/subscription abstraction. A Platform → Tenant → Products layer is greenfield at the schema level.**

## 5. Auth-related tables

- `users`: `role` enum (`admin`/`manager`/`client`/`employee`), `employee_id` (nullable FK), `client_id` (nullable FK), `status` (`active`/`suspended`/`invited`/`locked`), security/lockout columns, `module_permissions` (JSON).
- `client_user` pivot table exists (`user_id`, `client_id`, unique pair) for many-to-many manager↔client.
- **Both mechanisms coexist on `User.php`**: `belongsTo(Client::class)` via `client_id` AND `belongsToMany(Client::class, 'client_user')` via the pivot — an ambiguous "which client does this user belong to" design that predates this redesign and should be resolved by it.
- No `company_id` column exists anywhere — only `client_id`.

## 6. Migration count and timeline

- **138 migration files**, spanning **2026-07-03 → 2026-08-19** (~7 weeks, ~2.8/day average, with visible feature bursts — e.g. 9 statutory-batch migrations in one day, 2026-08-10).
- `clients` alone was altered by **28 separate follow-on migrations** after creation — a textbook "god table grown by accretion" pattern.
- No migration has ever renamed/split `clients`, introduced a `companies`/`tenants` table, or consolidated the schema. Purely organic growth; no big-bang tenant redesign has occurred to date.
