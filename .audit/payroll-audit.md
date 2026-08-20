# TECLA Payroll — Payroll Module Coupling Audit

*Generated 2026-08-19 via direct inspection of `app/Services/*.php`, `app/Models/Employee.php`, `app/Models/Client.php`, relevant migrations.*

## 1. Core payroll tables

| Table | Purpose | Scoping |
|---|---|---|
| `payroll_runs` | One row per client per payroll month; status (draft/processing/approved/locked), totals, supports supplementary runs via `parent_run_id` | `client_id` (restrict) |
| `payroll_run_items` | Per-employee line item: earnings, PF/ESI/PT/LWF/TDS/loan deductions, employer contributions, net pay | via `payroll_run_id` → client; `employee_id` (restrict) |
| `salary_revisions` | Before/after salary snapshot + promotion metadata | via `employee_id` |
| `employee_loans` / `employee_loan_repayments` | Advances/loans/garnishments + repayment ledger | via `employee_id` |
| `employee_exits` | F&F workflow, PT shortfall recovery, statutory bonus | via `employee_id` |
| `employee_tax_declarations` | Old/new regime TDS inputs | via `employee_id` |
| `compliance_filings` | Generic filed/pending tracker per client/statute/period | `client_id` (cascade) |
| `pf_ecr_batches`, `esi_monthly_batches`, `pt_challan_batches`, `tds_24q_batches`, `tds_challans`, `form_b_batches` | Statutory filing/report batches | `client_id` (cascade) |
| `client_audit_pack_batches` | Zips all statutory outputs for a client/period | `client_id` (cascade) |
| `pt_slabs`, `lwf_slabs`, `esi_reason_codes` | Global statutory reference data | unscoped |

## 2. How deeply is "Client" = "Payroll customer"?

Confirmed in `db-audit.md` §2: **~40-45% of `clients`' ~95-100 columns are payroll/statutory or payroll-cycle-specific**, and every column added since the initial wizard has been payroll-flavored. No separate `client_payroll_configs`/`client_statutory_profiles` table exists — it's one flat row serving both "company" and "payroll product config" purposes.

## 3. Statutory/compliance services — coupling to `Client`

| Service | Purpose | Coupling |
|---|---|---|
| `MonthlyPayrollCalculator` | Orchestrates per-employee monthly calc, writes `payroll_run_items` | **Tight** — raw `DB::table('clients')` lookup for `pt_state` |
| `SalaryCalculationService` | Structural CTC/PF/ESI/EPS/EDLI calculator | **Moderate** — takes array/object but internally does `Client::find($clientId)` for `pf_ceiling`/wage basis |
| `PayrollCorrectionService` | Consolidates supplementary + parent run items | **Loose** — operates on `PayrollRun`/item collections |
| `FormBGeneratorService` | Form B wage register (PDF/XLSX/CSV) | **Tight** — `Client $client` typed on nearly every public method |
| `PfEcrGeneratorService` | PF ECR file/batch | **Tight** — resolves establishment code from `Client` |
| `EsiMonthlyContributionService` | Monthly ESI contribution batch | **Tight** — same pattern |
| `PtChallanGeneratorService` | PT challan batch | **Tight** — resolves PT state/reg no per employee+client |
| `TdsCalculationService` | Annual/monthly TDS (old/new regime) | **Loose** — takes `Employee` only, no `Client` param |
| `Tds24qGeneratorService` | Quarterly 24Q return + reconciliation | **Tight** |
| `ClientAuditPackService` | Zips PF/ESI/PT/TDS/Form B into one pack | **Tight** — literally named "Client" |
| `StatutoryFilingResolutionService` | Resolves which statute registration applies | **Tight** |
| `StatutoryDueDateService` | Pure date-math for due dates | **Loose — the most decoupled service found**, static methods, no Client/Employee param |
| `PayrollEligibilityService` | Employee payroll-run eligibility | **Tight** — `checkEmployee(Employee, Client, ...)` |
| `PayrollCycleWarningService` | Cutoff/lock-day timing rules | **Tight** — reads `$client->cutoff_day`/`payroll_lock_day` directly |
| `InvoiceGenerationService` | Client invoices **generated from a locked PayrollRun** | **Tight, structurally significant** — see §5 |

**Pattern**: only `StatutoryDueDateService` and `TdsCalculationService` are Client-decoupled. Every file-generation/statutory-batch service hard-types `Client` and would be unusable for a non-payroll "company" as-is.

## 4. Employee model coupling

- `Employee belongsTo Client` via a hard `client_id` FK (`on delete restrict`). No indirection/tenant abstraction layer.
- Statutory fields are baked directly onto `employees`, mirroring `clients`: `pf_applicable`, `esi_applicable`, `esi_mode`, `esi_threshold_crossed_month`, `pt_applicable`, `pt_deduction_override`, `lwf_applicable`, `tds_regime`, `gratuity_mode`, `bonus_toggle`, `eps_applicable`, `pf_member_id`, wage-basis fields, VPF fields, plus disability fields feeding ESI ceiling, health-insurance fields.
- `employees.employment_model` (`eor`/`agency_contract`) mirrors `clients.contract_type` — the **"staffing" concept (EOR vs. agency) is already fused into the payroll employee record**, not modeled separately. Relevant for the Staffing product design.
- Computed accessors (`getEmployeePfMonthlyAttribute` etc.) reach into `$this->client?->pf_ceiling` directly — even read-only "what's this employee's PF" logic is Client-coupled at the model layer.

## 5. Payroll-specific concerns leaking into "company-level" features

- **Billing/invoicing is not independent of payroll — it's generated FROM a payroll run.** `InvoiceGenerationService::generateForRun(PayrollRun $payrollRun)` is the only entry point creating `Invoice`/`InvoiceLineItem` rows. It loads the `Client`, checks `isInhouse()`, `contract_end_date`/`auto_renewal`, `invoice_cycle`. **There is no client-level "generate invoice" independent of a locked payroll run** — a Staffing product would need its own invoice generator or a real decoupling of invoicing from `PayrollRun`. This is the single most important "what needs redesign before Staffing" finding.
- `account_manager_id`/`backup_account_manager_id` — genuinely product-agnostic today, a good example of a field already at the right "company" altitude.
- Client portal session/IP controls (`portal_session_timeout`, `portal_ip_whitelist`) are generic access-control concerns, but sit in the same flat row as payroll-specific view permissions (`portal_view_payslips`, `portal_view_salary`) using the identical boolean-flag pattern.
- `weekly_off_pattern` default attribute on `Client` is payroll/attendance-flavored but sits on the base model.

## 6. Existing precedent for optional modules

Two patterns exist, at two different altitudes:

**(a) `module:` route middleware** (`EnsureModulePermission`) — gates *internal TECLA staff* out of whole app sections (`module:payroll`, `module:clients`, `module:candidates`, `module:compliance`, `module:reports`, `module:admin`), backed by `users.module_permissions` JSON. Real, working, declarative — but it's per-internal-user RBAC, not per-tenant product entitlement.

**(b) Flat boolean feature flags on `clients`** — no middleware, ad hoc `if` checks: `health_insurance_enabled` (checked in `EmployeeResource`/`BulkUploadController`), `client_portal_enabled` (stored, **not actually enforced** — see `company-user-audit.md` §4), `isInhouse()` (a genuine "this client skips feature X" precedent — skips invoice generation entirely).

**Implication**: `isInhouse()`/`health_insurance_enabled` is the closest existing precedent for "this company has module X enabled," but it's ad hoc scattered booleans, not a generalized entitlement table. The `module:` middleware has the right *shape* (declarative, route-level) but is wired to user permissions, not tenant/product entitlement — worth reusing the pattern, not the implementation, for product gating.
