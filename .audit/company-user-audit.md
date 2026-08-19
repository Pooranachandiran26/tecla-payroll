# TECLA Payroll — Company / User / Authentication Audit

*Generated 2026-08-19 via direct inspection of `app/Models/Client.php`, `app/Models/User.php`, `config/auth.php`, `routes/web.php`, relevant controllers/middleware.*

## 1. `app/Models/Client.php` — role of this model today

`Client` is a **conflated "company + payroll customer" record**, not a clean tenant model. It's simultaneously "the tenant" (owns `employees()`, `users()`, `branches()`) and "the payroll customer file" (owns `invoices()`, billing terms, SLA, statutory config — see `db-audit.md` §2).

**Relationships**: `contacts()`, `branches()`, `documents()`, `invoices()`, `holidays()`, `accountManager()`/`backupAccountManager()` (belongsTo `User`), `employees()`, `users()` (direct hasMany, separate from the `client_user` pivot — see §7 of `db-audit.md`).

**`status` enum**: `draft` → `onboarding` → `active` → `inactive`/`suspended`. `draft` is the true "setup record, not real yet" state (default on new rows), tracked via `onboarding_current_step`/`onboarding_completed_steps`. Only `status === 'active'` is "operationally eligible" — codified in `Client::scopeOperational()`/`isOperational()`, whose own doc comment says it mirrors ~20 pre-existing ad hoc `status = 'active'` checks scattered across the app. A Client becomes "real" only at `active`.

`isInhouse()` (`billing_model === 'inhouse'`) is the one existing hint of tenant-vs-billed-customer conflict already in the model.

## 2. `app/Models/User.php` — full structure

Single global `users` table, no per-client table/schema.

- `role` enum: **`admin`, `manager`, `client`, `employee`** — 4 flat roles, no separate platform-vs-tenant-admin distinction.
- `employee_id` (nullable FK → `employees`, unique-indexed) — for employee-portal login accounts.
- `client_id` (nullable FK → `clients`) — the "home" client for `client`/`employee`-role users.
- `status` enum (`active`/`suspended`/`invited`/`locked`) — login-account lifecycle, separate from `Client.status`.
- `module_permissions` (JSON) — fine-grained feature/screen gating, **manager role only**.

**Two coexisting client-association mechanisms** (see also `db-audit.md` §5):
1. `client_id` column — single direct client (belongsTo).
2. `client_user` pivot table — many-to-many (`managedClients()`), lets a manager be assigned to multiple clients.

**`getManagedClientIds()`** (`User.php:161-191`) — the actual access-scoping logic:
- `admin` → **every** client ID (`Client::pluck('id')`) — true platform-wide access already, in embryonic form.
- `manager` → union of (clients where `account_manager_id`/`backup_account_manager_id`/`created_by` = self) + (`client_user` pivot rows); **if that union is empty, falls back to *all active clients***. This fallback was added in commit `777c48b` ("fix(rbac): refine ... for 100% test suite compatibility") — a strong signal it's a regression/test-workaround, not an intentional design decision. Any newly-onboarded manager with zero assignments currently sees every active client.
- `client` → `[client_id]` if set, else `[]`.
- `employee` → `[]` (not client-scoped this way; scoped via `employee_id → Employee.client_id` instead).

`isManagerForClient($clientId)` (`User.php:193-204`) is the per-request check built on the above; also unconditionally `true` for `admin`.

## 3. Authentication mechanism

- **Session-based web auth only.** `config/auth.php`: single `web` guard, `session` driver, `App\Models\User` provider.
- **No API tokens, no Sanctum, no SSO/OAuth.** `composer.json` has no `laravel/sanctum`; no `routes/api.php` exists at all. 100% server-rendered/Inertia session auth.
- Centralized in `LoginController` — single `/login` for every role, optional OTP 2FA (global toggle or forced per-client via `portal_require_2fa`), account lockout, IP-attempt throttling.
- **Not scoped per-client at the DB/session level** — one global `users` table, role-based (and for managers, FK/pivot-based) visibility filtering applied in controllers/middleware, not separate guards/connections.

## 4. Client Portal

- Gated (nominally) by `clients.client_portal_enabled` + `portal_access_level` + `portal_users_limit` — **but grep confirms `client_portal_enabled` and `portal_access_level`/`portal_users_limit` are captured on the wizard and never actually read/enforced anywhere in `app/`.** Only `portal_ip_whitelist` (`EnsureClientIpWhitelisted`), `portal_session_timeout` (`EnforceClientSessionTimeout`), and `portal_require_2fa` (`LoginController`) are consumed. **This is a real, currently-latent gap**: disabling `client_portal_enabled` today does not block `role=client` login or `/client/*` access.
- Not a separate auth flow — same `/login` → session pipeline as staff, differentiated purely by `role === 'client'`.
- Routes (`routes/web.php:443-449`), scoped to `$user->client_id`: `/client/dashboard`, `/client/employees`, `/client/attendance`, `/client/leave-settings`, `/client/invoices`, `/client/profile`, via `ClientPortalController`.

## 5. Employee-as-user

`employee` is a **third, distinct tenant-scoped identity**:
- `User.employee_id` (unique-indexed FK → `employees`) links a login to exactly one HR record.
- `role='employee'` → `/employee/dashboard` etc. via `EmployeePortalController` — self-service attendance, leave, payslips, documents, tax declarations.
- `getManagedClientIds()` returns `[]` for this role — employees are scoped purely via `employee_id → Employee.client_id`, not `client_id`/pivot like `client`/`manager` users. **Three different scoping mechanisms for three roles** (admin=all, manager=FK+pivot+risky-fallback, client=single FK, employee=indirect via employee_id) — worth consolidating in the redesign.

## 6. Multi-product / subscription awareness

**None exists.** No `subscriptions`, `products`, `plans`, `entitlements` tables/models anywhere. The only near-misses:
- `clients.sla_tier` (`standard`/`premium`/`enterprise`) — a payroll-operations SLA tier, not a subscription plan or product gate.
- `users.module_permissions` + `module:` route middleware (`EnsureModulePermission`) — per-*internal-user* feature RBAC *within* the single Payroll product (module keys: `clients`, `candidates`, `payroll`, `reports`, `compliance`, `admin`). Has nothing to do with which *products* a tenant/company has purchased.

There is no existing concept distinguishing "company" from "payroll client" — the redesign introduces this from scratch.

## 7. Manager-to-client assignment model

Two overlapping mechanisms, both folded into `getManagedClientIds()`:
1. **FK-based**: `clients.account_manager_id` / `backup_account_manager_id` (`belongsTo(User)`), plus `clients.created_by` (via `BlameableTrait`).
2. **Explicit pivot**: `client_user` table, exposed as `User::managedClients()`.

Effective access = union of both, **with the risky "all active clients" fallback when both are empty** (see §2). The redesign should replace this fallback with an explicit-assignment-required model (empty assignment → empty access, not implicit "all").

## Summary for the redesign

No true tenant abstraction exists today: `Client` conflates tenant identity with payroll/billing config; `User` is one global table with 4 flat roles and three inconsistent client-scoping mechanisms; auth is pure session-based with no API/SSO layer; and there is zero product/subscription/entitlement concept. `admin` already behaves as a de-facto platform-wide role (see `multitenancy-risks.md` §4) — the most direct migration path for "TECLA Platform Admin." Everything else (Tenant/Company identity, Product, Subscription) needs to be built net-new.
