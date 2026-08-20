# Multitenant Isolation Audit — TECLA Platform Target Architecture (Final Pass)

*Generated 2026-08-19. Read-only security and tenant-isolation audit — no code, migrations, database, or architecture documents were modified in producing this report. Fourth and final agent in the review chain: tecla-architect's approved architecture document → db-architect (schema) → payroll-analyst (Payroll compatibility) → company-auth (access-control model) → multitenant-auditor (this report). All findings below were independently re-verified against the current working tree (branch `feature-name`), not accepted from the prior three reports at face value.*

---

## 1. Isolation Model Assessment

The **proposed model** (Company → Plan → PlanProduct allow-list → CompanyProductSubscription entitlement, `platform_admin` boolean, `company_user` pivot with `product_scope`, hard-fail empty-fallback) is structurally sound and closes every gap identified below *if fully implemented and if every currently-unguarded controller is retrofitted to call it*. §0 of the architecture doc correctly enshrines "Compliance is a module inside Payroll, gated by `hasActiveProduct('payroll')` only" as a non-negotiable rule, and nothing in the current codebase contradicts it.

The **enforcement gap is not a model problem — it's a discipline problem**, and the evidence is unusually direct: `git show 777c48b` proves the flagship gap (`getManagedClientIds()` empty-fallback + `ClientPolicy::view`/`update` losing their per-record checks) was **not an oversight that predates a security-conscious design** — it was a **deliberate regression introduced two days before this audit**, committed with the message "refine ... for 100% test suite compatibility." A correct per-record check (`isManagerForClient()`) was removed from two policy methods, and a blanket "all active clients" fallback was added to the manager-scoping helper, specifically so a test suite would pass. This means: (a) the codebase has already demonstrated it can implement correct per-record tenant checks (this very policy had them, one commit prior — commit `44e8761`), and (b) the regression risk for the Company/Product model is not hypothetical — it already happened once, silently, under time/test pressure, in this exact subsystem.

**Conclusion**: the target *model* is sound and does not need reconsideration by tecla-architect. The *current enforcement* is a mix of genuinely well-built newer modules (Form B, ComplianceController, ClientPortalController) sitting alongside structurally unguarded older/adjacent modules (core Payroll lifecycle, TDS 24Q, PT Challan) and at least one live regression. Do not conflate "the design is right" with "the code matches the design" — it doesn't, in specific, enumerable places.

---

## 2. Confirmed Gaps (headline finding first)

### GAP-1 (HEADLINE) — `getManagedClientIds()` empty-assignment fallback grants a manager access to every active client

- **File:line**: `app/Models/User.php:179-181`
```php
if (empty($ids)) {
    return Client::where('status', 'active')->pluck('id')->toArray();
}
```
- **Exploitable today**: Yes, and it is not a theoretical edge case — it fires for **every manager who has zero rows** in `client_user` and is not `account_manager_id`/`backup_account_manager_id`/`created_by` on any client — a completely ordinary state for a newly-invited manager before an admin finishes assigning clients.
- **Is there another check that closes it?** No. `isManagerForClient()` (`User.php:193-204`) delegates directly to this method, so **every single caller of `isManagerForClient()` inherits the bug** — there is no independent second gate anywhere in the codebase.
- **Live production path**: `HandleInertiaRequests.php:104-113` calls `getManagedClientIds()` on **every Inertia page load** for any `admin`/`manager` user to populate the `activeClients` shared prop (the client-switcher dropdown). An unassigned manager sees every company in the switcher from their very first login — this is not a deep API-only bug, it renders in the primary navigation UI.
- **Regression evidence**: `git show 777c48b` (2026-08-17, two days before this audit) — the empty-fallback was *added* in this commit; it did not exist before.
- **Affected role**: `manager`.
- **Cross-company data/actions reachable**: Every downstream consumer of `getManagedClientIds()`/`isManagerForClient()` — i.e., every "fix" that other controllers rely on to be tenant-safe is silently defeated for any manager in the empty-assignment state. This single function is the load-bearing wall for the entire ad-hoc authorization system; it is currently cracked.
- **Severity**: **High**.
- **Fix (describe gap, not implementation)**: The empty-assignment branch must return `[]`, never "all active clients." (Architecture doc §12 already names this "the single highest-leverage fix to land early" — concur without qualification.)
- **Phase 0?** **Yes.** Zero dependency on the Company/Product schema — pure application-logic fix, one function.

### GAP-2 — `ClientPolicy::update()` has no per-record check

- **File:line**: `app/Policies/ClientPolicy.php:30-33`
```php
public function update(User $user, Client $client): bool
{
    return in_array($user->role, ['admin', 'manager']);
}
```
- **Reachable live**: `routes/web.php:107-108` — `can:update,client` middleware on `GET /clients/{client}/edit` and `PUT /clients/{client}`. Also gates `POST /clients/{client}/documents` (upload) and `POST /clients/{client}/deactivate` (line 110-112).
- **Another check closing it?** No — contrast with `viewDocuments()` two methods below it (`ClientPolicy.php:50-56`), which correctly calls `$user->isManagerForClient($client->id)`. `update()` and `view()` (line 19-23) do not.
- **Regression evidence**: same commit `777c48b` — `git show 777c48b -- app/Policies/ClientPolicy.php` shows `update()` and `view()` both had `if ($user->role === 'manager') return $user->isManagerForClient($client->id);` **removed** and replaced with the blanket `in_array` check.
- **Affected role**: `manager`.
- **Cross-company action**: Any manager (regardless of assignment) can edit any client's full record (statutory config, banking-adjacent onboarding fields, deactivate the client) and upload client documents, for a company they have zero relationship to.
- **Severity**: **High** (write access, not just read).
- **Phase 0?** **Yes** — one-line policy fix, no schema dependency.

### GAP-2b (found during policy spot-check, not in the original 8) — `ClientController::verifyDocument()` authorizes against the class, not the instance

- **File:line**: `app/Http/Controllers/ClientController.php:629-631`
```php
public function verifyDocument(Request $request, Client $client, ClientDocument $document)
{
    $this->authorize('verifyDocuments', Client::class);
```
- `ClientPolicy::verifyDocuments(User $user): bool` (`ClientPolicy.php:58-61`) takes **no `Client` parameter at all** — it's a global "can this role verify documents" check (`admin`/`manager`), never scoped to the specific `$client` in the URL.
- **Route middleware**: `routes/web.php:113` — `PUT /clients/{client}/documents/{document}/verify` has **no `can:` route middleware** (unlike its siblings on lines 107-112), so the class-only `authorize()` call inside the controller is the *only* gate, and it never inspects `$client`.
- **Affected role**: `manager`.
- **Cross-company action**: any manager can verify/reject any other company's client-uploaded documents by URL-guessing `{client}`/`{document}` IDs.
- **Severity**: Medium (write action on document status, not financial/payroll data, but touches onboarding compliance state cross-company).
- **Phase 0?** Yes.

### GAP-3, GAP-4, GAP-5 — `PayrollController::approve()` / `lock()` / `runSupplementary()` — zero tenant-scoping call

- **File:line**: `approve()` — `PayrollController.php:14-44`; `lock()` — `49-165`; `runSupplementary()` — `361-541`. Confirmed: no `isManagerForClient`, `getManagedClientIds`, `Gate::`, or `abort(403` anywhere in any of the three method bodies.
- **Route chain**: `routes/web.php:384-390` — group middleware is `['role:admin,manager', 'module:admin']`. `module:admin` → `EnsureModulePermission::handle()` → `$user->hasModulePermission('admin')` (`User.php:73-112`): for role `admin`/`client` always true; for `manager`, true whenever `module_permissions` is **empty** (the default state for most managers) or explicitly contains `'admin'`. **This is a feature-flag check, not a tenant-boundary check** — it answers "is this manager allowed to touch admin-tier actions at all," never "does this manager own this specific `PayrollRun`'s client."
- **Another check closing it?** No. `$run = PayrollRun::findOrFail($id)` (e.g. `approve()` line 16) is the only lookup; nothing after it inspects `$run->client_id` against the caller.
- **Read-side sibling gap (new, not in the original 8 but same root cause)**: `PayrollController::indexProcessing()` (`~line 706`) and `indexApproval()` (`~line 905`) build the client dropdown with **`Client::where('status','active')->get()`** — no `whereIn('id', $user->getManagedClientIds())` — unlike `indexLiveMonitor()` (`~line 1246-1248`), which correctly does filter. `selectedClientId` is taken directly from `$request->query('client_id')` with no ownership check before `PayrollRun::where('client_id', $selectedClientId)...` is queried and rendered (full draft/approved run detail: employee names, gross/net pay, mid-cycle salary-revision deltas). A manager can simply navigate to `/payroll/processing?client_id=<other company>&payroll_month=...` and **read** another company's unlocked payroll data, independent of the write-side approve/lock gap.
- **Affected role**: `manager`.
- **Cross-company action**: approve, lock (which also triggers loan-repayment posting and invoice generation — real financial side effects), and run supplementary payroll for **any** client's `PayrollRun`, plus read full payroll-run detail for any client via the processing/approval screens.
- **Severity**: **High** (financial state mutation + invoice generation across company boundary).
- **Phase 0?** **Yes** — needs only `Auth::user()->isManagerForClient($run->client_id)` (and the equivalent `whereIn` filter on the two index methods' client list/`selectedClientId`); fully independent of the Company/Product schema.

### GAP-6 — `PtChallanController` — zero tenant scoping outside one method

- **File:line**: `app/Http/Controllers/PtChallanController.php`. `getRuns()` (line 23-78) scopes **only** for `role === 'client'` (line 32-34, 51-53) — never for `manager`. `preview()` (83-89), `generate()` (94-100), `download()` (105-108), `updateStatus()` (113-130), `destroy()` (135-141) have **no scoping of any kind**, for any role.
- **Route chain**: `routes/web.php:325-330`, inside `role:admin,manager` → `module:compliance`. Because of the outer `role:admin,manager` gate, `client`-role portal users cannot reach these routes at all (confirmed — they are not in the same middleware group), which narrows the realistic exploit to the `manager` role only, but that is still a real cross-client leak.
- **Affected role**: `manager` (not `client` — that role is blocked upstream by route middleware, contrary to what a naive controller-only read might suggest).
- **Cross-company action**: a manager can `preview`/`generate`/download PT challan files and mutate `PtChallanBatch` status/TRRN/challan numbers for any `payroll_run_id`/batch `id`, including ones belonging to companies they are not assigned to.
- **Severity**: **High** (statutory filing data + ability to mark another company's challan as filed/generated, corrupting their compliance record).
- **Phase 0?** Yes — needs `isManagerForClient($run->client_id)` / `isManagerForClient($batch->client_id)` in each of the 5 unguarded methods; no schema dependency.

### GAP-7 — `Tds24qController` — zero tenant scoping in any method

- **File:line**: `app/Http/Controllers/Tds24qController.php` — `getMetadata()` (21-49), `preview()` (54-69), `saveChallan()` (74-97), `generate()` (102-114), `download()`/`downloadXlsx()` (119-131). None reference `client_id` ownership; `preview`/`saveChallan`/`generate` accept `client_id` as a plain validated integer (`exists:clients,id`) with no ownership check against the caller.
- **Route chain**: same group as GAP-6 (`role:admin,manager` → `module:compliance`), `routes/web.php:340-345`.
- **Affected role**: `manager`.
- **Cross-company action**: full TDS/Form 24Q dataset (taxable salary, TDS deducted/deposited per employee) preview and generation, plus treasury challan save, for any client — a manager assigned only to Company B can pull Company A's or D's TDS 24Q return data and even record challan payments against it.
- **Severity**: **High** (sensitive tax data, worse than PT Challan in blast radius — full per-employee taxable salary detail).
- **Phase 0?** Yes, same fix shape as GAP-6.

### GAP-8 — `EmployeePortalController::getEmployee()` — global, cross-company employee binding with no tenant filter

- **File:line**: `app/Http/Controllers/EmployeePortalController.php:17-97`, specifically:
  - Line 33-35: name-substring match, no client filter: `Employee::where('full_name', 'like', "%{$user->name}%")->first()`.
  - Line 38-40: **global fallback**, confirmed exactly as claimed:
    ```php
    $matchedEmp = Employee::whereNotIn('id', \App\Models\User::whereNotNull('employee_id')->pluck('employee_id'))->first();
    ```
    This is a database-wide query with **zero** `client_id`/company filter — it returns the first unlinked `Employee` row across the entire table, ordered by `id` (i.e., effectively the oldest/lowest-id unlinked employee in the system, which could belong to any client).
  - Line 89: `$user->update(['employee_id' => $matchedEmp->id])` — **persists** the mismatch permanently; every subsequent login for that user is now permanently bound to a stranger's employee record until a DB admin manually corrects it.
  - Line 44: even the auto-create fallback (when no unlinked employee exists at all) picks `$user->client_id ?: (Client::where('status','active')->value('id') ?: Client::value('id') ?: 1)` — if the employee-role user's own `client_id` is null (plausible — employee-role users are typically linked via `employee_id`, not `client_id`, directly), it silently assigns them to whichever active client happens to sort first, or literally client `1`.
- **Called from**: `dashboard()`, `profile()`, `storeDocument()`, `viewDocument()`, `attendance()`, `punchIn()`, `punchOut()`, `correctionRequests()`, `storeCorrectionRequest()`, `leave()`, `storeLeaveRequest()`, `payslips()`, `downloadPayslip()` — i.e., **every** employee-portal action, all reachable via `routes/web.php:453-477` under `role:employee` (no additional gate).
- **Reachability**: Requires only that an `employee`-role `User` row exist with `employee_id = NULL` and an email/name that doesn't match any `Employee` row — a normal, foreseeable state (e.g., an admin creates the login before linking the employee record, or an invitation flow is interrupted). Confirmed reachable through the ordinary login → dashboard path with no additional privilege needed.
- **Affected role**: `employee`.
- **Cross-company action**: full read of another company's employee's profile, payslips (download PDF), attendance, ability to punch in/out on their behalf, submit leave and bank-change requests, and upload/view documents against that stranger's employee record — and the binding is **write-persisted**, not just a one-off mis-render.
- **Severity**: at least as severe as GAP-1, arguably worse in one dimension: it requires zero attacker intent — it is a data-integrity/isolation failure that fires automatically for a normal admin workflow gap, and it self-perpetuates (persisted `employee_id`) rather than being re-evaluated per request. **High.**
- **Fix (describe gap, not implementation)**: the fallback chain must never resolve or bind an `Employee` outside a scope the logging-in `User` is independently known to belong to (e.g., only match within `$user->client_id` if already known, or fail closed and route to an "unlinked account, contact admin" state) — and must never silently `whereNotIn`-pick an arbitrary unrelated row.
- **Phase 0?** **Yes** — this is pure application logic; entirely independent of and arguably more urgent than the Company/Product schema work, since it's a live data-integrity hazard today.

---

## 3. Known-Risk-Area Re-check (explicit pass/fail, this run)

| # | Risk area | Verdict | Note |
|---|---|---|---|
| 1 | `getManagedClientIds()` empty-fallback | **FAIL — confirmed, live** | GAP-1. Regression traced to commit `777c48b` (2026-08-17). |
| 2 | `ClientPolicy::update()` | **FAIL — confirmed, live** | GAP-2. Same regression commit. |
| 3 | `PayrollController::approve()` | **FAIL — confirmed, live** | GAP-3. No scoping in method body or route middleware. |
| 4 | `PayrollController::lock()` | **FAIL — confirmed, live** | GAP-4. Same; also triggers invoice generation cross-company. |
| 5 | `PayrollController::runSupplementary()` | **FAIL — confirmed, live** | GAP-5. Same pattern. |
| 6 | `PtChallanController` | **FAIL — confirmed, live** | GAP-6. Only `getRuns()` has partial (`client`-role only) scoping; 5 other methods unguarded for `manager`. |
| 7 | `Tds24qController` | **FAIL — confirmed, live** | GAP-7. Zero scoping in all 6 methods. |
| 8 | `EmployeePortalController::getEmployee()` | **FAIL — confirmed, live, reachable** | GAP-8. Verified the exact fallback chain and its DB-wide `whereNotIn` query; confirmed it's called from every portal action and persists the binding. |

**8 of 8 re-checked risk areas remain open.** None have been fixed since the prior passes; one (GAP-1/GAP-2) was actively *reintroduced* by a commit dated after some of this work would have been expected to have started, which should raise the priority of "why did a passing test suite require weakening a security check" as its own process question, separate from the code fix itself.

---

## 4. New Surface

- **Form B module** (`FormBController.php`, `FormBBatch`, `StatutoryAct` — all untracked/new files per `git status`) is the one genuinely well-built precedent in this codebase: every mutating/reading method funnels through `authorizeClientAccess(int $clientId)` (`FormBController.php:47-51`), which calls `isManagerForClient()` against **a `client_id` read from the database record actually being accessed** (the run's own `client_id`, the batch's own `client_id`) — not a client_id taken at face value from the request, per the inline comment at lines 40-46. This is exactly the pattern GAP-3/4/5/6/7 are missing, and it proves the team already knows how to do this correctly when they choose to.
- **File-storage isolation for this new surface**: not independently re-verified beyond the DB-row scoping above (Form B PDF generation/download wasn't traced disk-path-by-disk-path in this pass); given the correct DB-level gate, and that `config/filesystems.php` has no per-tenant disk/path convention platform-wide (single `local` disk, `storage/app/private`), file isolation for Form B rides entirely on the DB authorization check being correct on every read — which it is, but there is no independent second layer (e.g., no path-embedded client ID that could catch a future authorization regression the way defense-in-depth would). Worth noting for db-architect/company-auth as a *general* platform pattern gap (not specific to Form B), not a Form B-specific failure.
- **`Gstr1Controller`** (existing, not new) shows the identical zero-scoping shape as PT Challan/TDS 24Q (`client_id` never referenced in any of its 5 methods). Not verified whether GSTR-1 is legitimately company-wide (TECLA's own GST filing across all clients, not a per-client statutory return) versus a genuine leak — this needs a business-rules answer from payroll-analyst/tecla-architect before it's added to the confirmed-gap list, so it is flagged as **worth follow-up**, not a confirmed finding.

---

## 5. Pattern Summary

**Systematic (global-scope) enforcement**: none exists. There is no middleware, global model scope, or base-controller mechanism that applies tenant filtering automatically — every controller must remember to call `isManagerForClient()`/`getManagedClientIds()` itself.

**Ad hoc (per-controller) enforcement, and it is genuinely bimodal**:
- **Correctly scoped, consistently**: `ClientPortalController` (defensive — returns empty results when `$user->client` is null, filters every query), `FormBController` (per-record `authorizeClientAccess()`), `ComplianceController` (both `index()` and `showClientDetails()` correctly call `isManagerForClient`/exact `client_id` match — lines 53-55, 214, 248-253), `PfEcrController`/`EsiMonthlyController` (1 scoping call each, per the earlier grep sweep — not deep-audited this pass but consistent with payroll-analyst's prior finding).
- **Unscoped or partially scoped**: `PayrollController` (approve/lock/supplementary + two of four index/read methods), `PtChallanController` (1 of 6 methods, and only for `client` role, never `manager`), `Tds24qController` (0 of 6), `ClientPolicy::view`/`update` (regressed), `ClientController::verifyDocument` (authorize-by-class bug), `EmployeePortalController::getEmployee()` (structurally unscoped by design, not omission).

The grep sweep (`isManagerForClient|getManagedClientIds|Gate::|->authorize\(|abort\(403` count per controller) confirms this bimodality numerically: `PtChallanController`, `Tds24qController`, `Gstr1Controller` sit at **0**; `ClientController`, `BulkUploadController`, `AttendanceUploadController` sit at 11-18. There is no middle ground — a controller either has the discipline baked in throughout, or has essentially none. This is consistent with (and independently reproduces) architecture doc §12's own count of "28 controller files with zero tenant-scoping calls today."

**Company A/B/C/D scenario walk-through** (concrete): under the *current* code, product/plan doesn't exist yet, so every gap is expressed at the `client_id`/company-analog level today. Take GAP-3 (`PayrollController::approve()`): a manager whose only `client_user` row (or `account_manager_id`) is against **Company B** (Basic+Staffing) hits `POST /payroll/{id}/approve` with the `id` of a `PayrollRun` belonging to **Company A** (Basic+Payroll) or **Company D** (post-upgrade Basic+Payroll→Plus+Payroll+Staffing). Nothing in `approve()`, in the `module:admin` middleware, or in any policy checks that the run's `client_id` maps to a company the manager is assigned to — the update succeeds unconditionally as long as the run's status allows the transition. The same is true for `lock()` (which additionally posts loan repayments and generates a real invoice against Company A/D) and `runSupplementary()`. Once `company_product_subscriptions` exists, this exact code path becomes the mechanism by which a Staffing-only manager for Company B could approve/lock **Payroll** runs for a company that never subscribed to Payroll at all, or Company D's Payroll runs before D had even acquired Staffing — i.e., the gap doesn't just cross companies, it will cross **product entitlement boundaries** too, because the check that's missing today (`isManagerForClient`) is also the check the redesign would extend into `hasActiveProduct('payroll')`. Fixing GAP-3 now, independent of the schema work, removes this entire class of future risk rather than just today's version of it.

---

## 6. Recommendation Priority

Priority is based on: (a) current live exploitability, (b) blast radius (financial/statutory data + write actions vs. read-only), (c) Phase-0 independence (fixable today without waiting on Company/Product schema), and (d) self-perpetuation (does the damage persist after the request ends).

1. **GAP-8 — `EmployeePortalController::getEmployee()`.** Self-perpetuating (persisted `employee_id`), requires no attacker intent, reachable by ordinary account-provisioning gaps. Fix first — every day it's live, more `employee_id = NULL` accounts can silently mis-bind.
2. **GAP-1 — `getManagedClientIds()` empty-fallback.** Headline finding; load-bearing for the entire ad hoc authorization system; proven to regress silently once already. Fix second, in the same change as GAP-8 if practical — both are one-function/one-branch fixes.
3. **GAP-3/4/5 — `PayrollController::approve()`/`lock()`/`runSupplementary()`** (plus the `indexProcessing()`/`indexApproval()` read-side sibling gap). Highest financial blast radius of the remaining items — `lock()` triggers real invoice generation and loan-repayment posting cross-company.
4. **GAP-6/GAP-7 — `PtChallanController`/`Tds24qController`.** Sensitive statutory/tax data exposure plus ability to corrupt another company's filing status; no dependency on schema.
5. **GAP-2/GAP-2b — `ClientPolicy::update()` and `ClientController::verifyDocument()`.** Write access to client onboarding/document data; smaller blast radius than payroll but still a direct policy defect with a one-line fix.
6. **`Gstr1Controller` (flagged, not confirmed)** — resolve the business-rule question (is GSTR-1 legitimately platform-wide?) before treating it as a gap; if it is per-client data, it belongs in the same tier as GAP-6/7.

All six items above are **Phase 0 — orthogonal to the Company/Product/Plan schema work** and fixable today. None require `companies`, `products`, `plans`, or any new column to exist first; they require only that the *existing* `isManagerForClient()`/`getManagedClientIds()` mechanism actually be called, and called correctly, everywhere it currently isn't. Landing Phase 0 first also directly de-risks the schema migration itself: `users.company_id` and `company_user` will inherit whatever discipline (or lack of it) exists in the codebase at the time they're introduced — shipping them on top of a codebase that still has GAP-1/GAP-8 live means the new columns arrive into a system that has already demonstrated it will regress this exact class of check under time pressure.
