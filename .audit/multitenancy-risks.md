# TECLA Payroll — Multi-Tenancy Isolation Risk Audit

*Generated 2026-08-19 via direct inspection of `app/Http/Controllers/*.php` (45 files), `app/Models/User.php`, `app/Policies/ClientPolicy.php`, `config/database.php`, `config/filesystems.php`, git history.*

## 1. Isolation model today: single shared database, confirmed

One `DB_CONNECTION=mysql` / `DB_DATABASE=tecla_payroll` for every tenant. No per-tenant connection switching anywhere in application code (`DB::connection(`/`Config::set('database...` grep: zero matches). Every tenant-scoped table carries a plain `client_id` column, not a separate schema/database.

**This is unambiguously single shared database, row-level (`client_id`) multi-tenancy — not schema-per-tenant or DB-per-tenant.**

## 2. How tenant scoping is enforced: manual/ad-hoc — the central risk

No Eloquent global scope exists anywhere (`addGlobalScope` grep: zero matches). Scoping is entirely opt-in via two `User` helper methods (`getManagedClientIds()`, `isManagerForClient()`) that **every controller must remember to call**.

- Of 45 controller files: **20 call the helpers at least once**; **28 query `Client::`/`Employee::`/`PayrollRun::` directly**, with several files (`Admin/UserController.php`, `ClientHolidayController.php`, `ClientPortalController.php`, `EmployeeQueryController.php`, `PtChallanController.php`, `TaxDeclarationController.php`, `Tds24qController.php`) calling **neither helper anywhere**.
- Even within one file the pattern is inconsistent: `PayrollController.php` calls the helpers inside `releasePayslips()`/`indexLiveMonitor()`, but its `approve()`/`lock()` do a bare `findOrFail()` with zero tenant check.

**Isolation is manual and developer-remembered, applied competently in newer/recently-hardened controllers (Form B, PF ECR, ESI Monthly, Client Audit Pack — all share a private `authorizeClientAccess()` helper) and simply absent elsewhere.**

## 3. The recent "client eligibility" fix vs. tenant-boundary checks — two different gaps

`Client::scopeOperational()`/`isOperational()` now exist and are used correctly in `ComplianceController`, `PayrollController::process()`, `FormBController`. But **eligibility-scoping (is this client active) and tenant-scoping (does this manager own this client) are different checks, and hardening one did not harden the other**:

- `PayrollController::process()` checks `isOperational()` but **never** `isManagerForClient()` — any manager who can reach the route can trigger a run for a client they don't manage.
- `PayrollController::runSupplementary()`, `approve()`, `lock()` have **neither** check.
- `EmployeeController`/`BulkUploadController` still use raw `where('status','active')` instead of the new named scope — functionally fine today, but not consolidated onto the single source of truth the scope was meant to establish.

## 4. Admin bypass scope: already a de-facto platform-wide role

- `getManagedClientIds()`: `if (role === 'admin') return Client::pluck('id')` — every client, unconditionally.
- `isManagerForClient()`: `if (role === 'admin') return true` — bypasses entirely.
- `EnsureModulePermission`: `if (role === 'admin' || role === 'client') return $next($request)` — admin skips module-permission gating too.

**`admin` today already behaves exactly like the target "TECLA Platform Admin" concept.** This is the most direct migration path in the whole redesign — `manager`/`client`/`employee` need real tenant-boundary hardening (§2, §5) before they can be trusted as genuinely tenant-scoped under the new model.

## 5. Cross-tenant leakage surface — confirmed instances

| # | Location | Issue | Severity |
|---|---|---|---|
| a | `PayrollController::approve()`/`lock()` | `findOrFail($id)` then mutates status with **no** tenant check at all — any manager with `module:admin` can approve/lock another client's payroll run | High |
| b | `PayrollController::process()`/`runSupplementary()` | Eligibility checked, tenant boundary not — a manager can process payroll for an unassigned client | High |
| c | `Tds24qController::generate()`/`download()`/`downloadXlsx()` | Validates only `exists:clients,id`; `download()` does `findOrFail()` + streams the file (PAN numbers, deduction detail) with **zero** ownership check — 200, not 403/404 | High |
| d | `PtChallanController::updateStatus()`/`destroy()` | `findOrFail()` then mutate/delete, no tenant check, no `authorizeClientAccess()` helper defined at all | High |
| e | `ClientPolicy::view()`/`update()` | `return in_array($user->role, ['admin','manager'])` — **true for any manager regardless of assignment**; only `viewDocuments()` correctly calls `isManagerForClient()`. Any manager can view/edit any client's PAN/GSTIN/contract/billing terms. Directly contradicts the app's own documented intent (stale doc describes managers as "scoped to clients they're assigned to manage") | Medium-High |
| f | `TaxDeclarationController` | Same pattern as (e), on employee PII (tax regime declarations) | Medium-High |
| g | `User::getManagedClientIds()` empty-assignment fallback | Falls back to **every active client** when a manager has zero explicit assignments — added in commit `777c48b`, message "...for 100% test suite compatibility," a strong signal it's a regression/workaround rather than intentional. Any freshly-onboarded manager sees everything until assigned | High (root-cause level) |

**Pattern**: the fetch-then-authorize idiom (`findOrFail()` → `authorizeClientAccess()`) is the right shape and is used correctly in recently-hardened modules (Form B, PF ECR, ESI Monthly, Client Audit Pack, Invoice, document downloads) — it was simply not applied everywhere, and in one case the shared helper itself was weakened to pass a test.

## 6. File storage isolation: private disk, inconsistent path namespacing

- `local` disk root is `storage/app/private` — not directly URL-addressable; every download goes through an authenticated controller. Exposure surface = the authorization check inside that method, not a guessable path.
- **PF ECR** is properly tenant-namespaced by directory (`pf_ecr/{client_id}/{filename}`).
- **Form B** is a flat directory (`form_b_reports/`) with tenant info only in the filename, not the path — not exploitable today because `download()`/`destroy()` are gated by `authorizeClientAccess()`, but not physically segregated either.
- **Client documents** are stored in a flat folder with a random filename, no client subfolder.
- **Payslips/invoices are not persisted as files at all** — generated on-demand and streamed; nothing to leak via path.

**Given §5, the practical near-term risk isn't leaked paths — it's that a manager authorized to reach `module:compliance` can already download other tenants' TDS 24Q / PT Challan files today via the missing authorization check on the endpoint itself, which is a more direct route to the same outcome than any storage-path issue.**

## Overall assessment for the redesign decision

**The single shared database with a `client_id` column is not, by itself, the problem.** It's a viable, widely-used pattern for Laravel multi-tenant SaaS, provided isolation is enforced centrally rather than per-controller. Today it's enforced per-controller, inconsistently — some modules hardened via a repeatable `authorizeClientAccess()` idiom, others (core Payroll lifecycle, TDS 24Q, PT Challan, Client CRUD policy, Tax Declarations) missed entirely, plus one case where the shared helper itself was weakened for test convenience.

**Recommendation carried into the architecture design: keep the single shared database. Make tenant-scope enforcement structural** (global Eloquent scope / base policy / required trait on every tenant-owned model, one middleware or form-request rule for every `client_id`/`company_id`-bearing route) **rather than moving to per-tenant database/schema separation**, which would not fix the root cause (missing authorization calls) and would add substantial operational complexity to a codebase otherwise well-suited to row-level tenancy. Fixing `getManagedClientIds()`'s empty-fallback and applying `authorizeClientAccess()` uniformly are prerequisites, independent of the multi-product redesign itself.
