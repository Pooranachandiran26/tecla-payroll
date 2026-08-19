# TECLA Platform — Target Architecture

**TECLA Platform Admin → Tenant/Company → Plans → Products (Payroll, Staffing, Future)**

*Design document only — no code, migrations, or database changed. Built strictly from the evidence in `.audit/db-audit.md`, `.audit/company-user-audit.md`, `.audit/payroll-audit.md`, `.audit/multitenancy-risks.md` (all generated 2026-08-19 by direct code/schema inspection). Prior art acknowledged: `docs/architecture/05-multitenant-architecture.md` (2026-08-11) already proposed row-level `company_id` tenancy with a single shared DB and RBAC roles — reused here where it still applies.*

*Revision note: this version adds a Plan layer (TECLA has no plan system today — this is new capability, not evidence from the audits) and makes explicit a business rule that was implicit-but-untested in the first version: **Compliance is a capability inside the Payroll product, never a separate product or subscription.** Sections 4, 6-11, 13-14 are revised; a new §15-17 covers onboarding, self-signup, and worked company examples. §1-2 (current-state findings) and §5 (tenant DB) are unchanged from the audits and not repeated in full below where nothing about them changed.*

*Consistency-check note (second pass): the model was already an allow-list design (`plan_products` = permitted, not auto-activated), which is what made Company A/B correctly diverge on Basic — but the word "includes" was used loosely in two places (§8.4, §11) in a way that could be misread as the wrong interpretation. §8.0 was added as an explicit, single-source disambiguation (with a worked table for all four companies), the loose wording was corrected, and Company D's upgrade example (§17) was expanded to name the exact three record types involved and their causal order, so the plan-change and product-activation are unambiguously two separate, independently-timestamped facts.*

## 0. Non-Negotiable Business Rules (governs every section below)

1. **Compliance is a module inside the Payroll product** — `ComplianceController`, `FormBController`, `PfEcrController`, `EsiMonthlyController`, `PtChallanController`, `Tds24qController`, `ClientAuditPackController` (per `AGENTS.md`'s own compliance reference: PF ECR, ESI Monthly, PT Challan, TDS 24Q, GSTR-1, Client Audit Pack, Form B) all remain gated by **one** check — `hasActiveProduct('payroll')` — exactly like every other Payroll screen. **There is no `hasActiveProduct('compliance')` anywhere in this design, and none should ever be added.**
2. **TECLA has no Plan system today** (confirmed absent in `db-audit.md` §4 — no `plans`/`subscriptions` table of any kind exists). Everything Plan-related below is new design, not a revision of something that exists.
3. **Plans are configured by TECLA Platform Admin**, not hardcoded. No application code may branch on a plan's name/code (`if ($plan->code === 'plus')`) — all gating is via data (`plan_products` membership, `tier_rank` ordering), so new plans and new products can be added by Platform Admin alone, with zero deploys.
4. **Products remain exactly**: Payroll, Staffing. Compliance is not, and will not become, a third entry in the `products` table.

---

## 1. Current Architecture Summary

- **Single shared MySQL database**, one connection, ~62 tables, 138 migrations, built organically over ~7 weeks with no prior tenant/product redesign.
- **`clients` is the only tenant-like entity**, and it conflates four concerns in one flat row (~95-100 columns): generic company identity (~30 cols), payroll/statutory configuration (~30 cols, 40-45% of the table), billing/invoicing terms (~15 cols), and client-portal access config (~11 cols). Every column added since the initial build has been payroll-flavored — the table has grown *more* coupled to Payroll over time, not less.
- **`Employee` belongs directly to `Client`** via a hard FK; payroll/statutory flags are duplicated onto `employees` the same way. `employees.employment_model` (`eor`/`agency_contract`) already encodes a staffing-adjacent concept, fused into the payroll employee record.
- **Every statutory/payroll-generation service hard-types `Client`** (Form B, PF ECR, ESI Monthly, PT Challan, TDS 24Q, Audit Pack) — only `StatutoryDueDateService` and `TdsCalculationService` are decoupled.
- **Invoicing is triggered from a locked `PayrollRun`**, not from the company independently — there is no product-agnostic "generate an invoice for this company" entry point today.
- **Auth**: one global `users` table, 4 flat roles (`admin`/`manager`/`client`/`employee`), session-only (no API/SSO layer). `admin` already has unconditional access to every client — a de-facto platform-wide role in embryonic form.
- **Tenant isolation**: row-level via `client_id`, enforced *manually per-controller* through `User::getManagedClientIds()`/`isManagerForClient()` — applied consistently in newer modules (Form B, PF ECR, ESI Monthly, Audit Pack), inconsistently or not at all elsewhere (core Payroll lifecycle actions, TDS 24Q, PT Challan, Client CRUD policy, Tax Declarations).
- **Zero existing concept** of company vs. client, product, module, subscription, or entitlement. The closest analogs (`sla_tier`, `module_permissions`, `applicable_statutory_acts`, `health_insurance_enabled`, `isInhouse()`) each solve a narrower, different problem.

## 2. Problems with Current Architecture

1. **No tenant identity independent of Payroll.** A company cannot exist in the system without simultaneously being a fully-configured Payroll client — there is no way to onboard a Staffing-only customer without either dragging in irrelevant PF/ESI/LWF/TDS fields or duplicating the company record.
2. **No product/subscription model at any layer** — DB, auth, or UI. "Which products does this company have" is not a representable fact today.
3. **Payroll logic is not swappable/optional** — every statutory service assumes a `Client` (== Payroll customer) exists, so Staffing can't reuse the same company record without either inheriting Payroll's assumptions or requiring a parallel, disconnected record (breaking requirement 5: same company identity).
4. **Invoicing is payroll-triggered**, not company-level — a second product needs its own billing trigger or a real decoupling.
5. **Tenant-boundary enforcement is ad hoc**, not structural — adding a second product without fixing this multiplies the leakage surface identified in `multitenancy-risks.md` §5 (confirmed unauthorized cross-tenant access on Payroll approve/lock, TDS 24Q, PT Challan, Client CRUD, Tax Declarations) rather than shrinking it.
6. **`getManagedClientIds()` silently grants a manager access to every active client** when they have no explicit assignment — a correctness bug that becomes more dangerous, not less, once a manager might legitimately have zero assigned companies in one product but some in another.
7. **The 4-role flat enum (`admin`/`manager`/`client`/`employee`) has no product dimension** — there's no way today to say "this manager handles Payroll for Company A and Staffing for Company B."
8. **No genuine "Platform Admin" role distinct from "Payroll product admin."** `admin` today *is* both, which is fine while there's one product, but conflates platform governance (managing companies/products/subscriptions/users across products) with product-level operational admin work.

## 3. Recommended Architecture

Introduce a **Company** as the true top-of-hierarchy tenant identity. A Company is on exactly one **Plan** at a time; the Plan determines which **Products** the company is *eligible* to activate; **CompanyProductSubscription** rows are the actual on/off switch per product. Compliance is not a layer in this diagram at all — it lives entirely inside the Payroll box, gated the same way every other Payroll screen is:

```
TECLA Platform (platform_admins, products, plans, plan_products, companies,
                company_plan_subscriptions, company_product_subscriptions,
                company_subscription_history)
        │
        ▼
    Company  (id, name, PAN/GSTIN/CIN, registered address, industry, lifecycle status)
        │
        ├── CompanyPlanSubscription (current + historical) ──► Plan (e.g. "Basic", "Plus", ...
        │                                                       Platform-Admin-defined data,
        │                                                       never hardcoded by name)
        │                                                            │
        │                                                      PlanProduct (which Products
        │                                                       THIS Plan makes available —
        │                                                       the plan-product mapping)
        │
        ├── CompanyProductSubscription ──► Product: Payroll   (status: trial/active/suspended/cancelled;
        │   (only activatable if Payroll is       only activatable if in the company's current Plan)
        │    in the company's current plan)              │
        │                                                 ▼
        │                                      PayrollClientProfile (1:1 with Company, exists only if
        │                                      the Payroll product is activated)
        │                                      = today's `clients` row, minus identity columns
        │                                                 │
        │                                                 ▼
        │              Employees, PayrollRuns, Invoices — AND Compliance: Form B, PF ECR, ESI
        │              Monthly, PT Challan, TDS 24Q, GSTR-1, Client Audit Pack. All of this is
        │              INSIDE Payroll. Gated by the same single check as the rest of Payroll —
        │              never a separate "Compliance product" or "Compliance subscription."
        │
        └── CompanyProductSubscription ──► Product: Staffing  (status: trial/active/suspended/cancelled)
                                                 │
                                                 ▼
                                       StaffingClientProfile (1:1 with Company, future)
                                                 │
                                                 ▼
                                       Placements, Staffing-specific tables (future)
```

**Key principle**: `Company` carries only what every product needs (legal identity, registered address, statutory IDs like PAN/GSTIN/CIN, primary contact, lifecycle status). Everything Payroll-specific — including Compliance — stays exactly where it is today (on the `clients` row and its child tables), reframed as a **product profile owned by Payroll, keyed 1:1 to a Company** rather than the tenant record itself. A Staffing-only company simply never gets a `PayrollClientProfile` row, and therefore never sees any Compliance screen — not because Compliance was individually gated, but because Compliance has no existence outside Payroll's tables in the first place.

**Plan vs. Product are two different axes, deliberately kept separate:**
- **Plan** = a commercial tier (Basic, Plus, whatever Platform Admin defines later) that answers *"which products is this company allowed to turn on, and at what limits?"* Plans are pure data — `plans` + `plan_products` rows — never referenced by name in code.
- **Product** = Payroll or Staffing, the actual functional module a company uses day to day. A company's *effective* access to a product is always read from `company_product_subscriptions`, never re-derived from the plan at request time — the plan only gates what CAN be turned on, at the moment it's turned on (see §8).

Isolation stays **single shared database, row-level `company_id`/`client_id` tenancy** — per `multitenancy-risks.md`'s explicit conclusion, physical per-tenant DB separation would not fix the actual documented risk (missing/inconsistent authorization calls) and would add real operational cost. What changes is that scoping becomes **structural** (global scope + one enforcement point) instead of per-controller-remembered.

## 4. Platform DB Design

Logically separate — **starts as the same physical MySQL database** (avoids cross-DB FK/transaction complexity for zero benefit at this stage), organized as its own migration namespace/table prefix so it can be split onto its own connection later without touching a single existing table.

| Table | Purpose |
|---|---|
| `companies` | The tenant. Pure identity: `id`, `name`, `legal_name`, `company_code`, `pan_number`, `gstin`, `cin_number`, `industry`, `company_type`, `registered_address_*`, `country`, `primary_contact_name/email/phone`, `status` (`draft`/`onboarding`/`active`/`inactive`/`suspended` — reuses the exact lifecycle already proven on `clients`), `onboarding_current_step`/`onboarding_completed_steps` (reuse the existing wizard-progress pattern). |
| `products` | Catalog. Seed rows: `payroll`, `staffing`. `id`, `code` (unique slug), `name`, `description`, `status` (`available`/`coming_soon`/`retired`), `sort_order`. Future products insert here — nothing else changes. **Compliance is never a row in this table** (Rule 0.1). |
| `plans` | **New capability.** The commercial tier catalog. `id`, `code` (unique slug — arbitrary, Platform-Admin-chosen, e.g. `basic`/`plus`/anything later), `name`, `description`, `tier_rank` (integer; purely for ordering/"is this an upgrade or downgrade" comparisons — never for feature logic), `status` (`draft`/`active`/`retired`), `is_public` (whether it appears on the self-signup plan picker), `created_by`. No product list lives directly on this row — see `plan_products`. |
| `plan_products` | **The Plan↔Product mapping** (item requested explicitly). `id`, `plan_id`, `product_id`, `limits` (nullable JSON — optional per-plan-per-product caps, e.g. `{"max_employees": 50}`, deliberately schema-flexible so new limit types never need a migration). Unique `(plan_id, product_id)`. **This is an allow-list, not an auto-include list** — see §8.0 for the full disambiguation. A row's mere existence means *"a company on this plan is permitted to activate this product"*; it does not activate the product for any company, and two companies on the identical plan can end up with completely different products actually turned on. |
| `company_plan_subscriptions` | **Current + historical plan assignment.** `id`, `company_id`, `plan_id`, `status` (`active`/`superseded`/`cancelled`), `started_at`, `ended_at` (null = current), `changed_by` (platform admin, or null for self-signup), `change_reason` (`initial`/`upgrade`/`downgrade`/`admin_override`/`cancelled`). App-enforced invariant: at most one row per `company_id` with `status='active' AND ended_at IS NULL`. Upgrading/downgrading closes the current row and opens a new one — never an in-place update — which is what makes this a true history, not just a current-state pointer. |
| `company_product_subscriptions` | **Current activation state per product** (unchanged concept from v1, still the entitlement source of truth). `company_id`, `product_id`, `status` (`trial`/`active`/`suspended`/`cancelled`), `activated_at`, `deactivated_at`, `activated_by`. Unique `(company_id, product_id)`. Reading this table — nothing else — answers "does this company have Payroll/Staffing right now." |
| `company_subscription_history` | **New capability — the full audit ledger** the "Subscription history" requirement needs. Append-only. `id`, `company_id`, `event_type` (`plan_assigned`/`plan_upgraded`/`plan_downgraded`/`plan_cancelled`/`product_activated`/`product_deactivated`/`product_suspended`/`product_reactivated`), `plan_id` (nullable, set for plan_* events), `product_id` (nullable, set for product_* events), `previous_value`/`new_value` (short strings, for display — e.g. previous plan code → new plan code), `actor_user_id` (nullable — null for self-service/system-driven events), `occurred_at`, `notes`. This single table drives the Company screen's subscription timeline (§17) rather than duplicating history-tracking logic inside two separate tables. |
| `platform_admins` *(or an `is_platform_admin` boolean + `company_id IS NULL` convention on the existing `users` table — see §7)* | Users who manage companies/products/plans/subscriptions across the whole platform, not scoped to any one company. |
| `platform_audit_log` | Cross-cutting platform actions not already covered by `company_subscription_history` (e.g. a product's `status` being retired, a plan being created/edited) — distinct from the existing per-record `audit_logs` table, which stays product-level. |

**What's genuinely new here**: `plans`, `plan_products`, `company_plan_subscriptions`, `company_subscription_history` are all net-new capability (Rule 0.2 — none of this exists today, in any form). `companies`, `products`, `company_product_subscriptions` carry over from the v1 design. `platform_admins`/`platform_audit_log` remain optional/deferrable as before.

## 5. Tenant DB Design

**Also the same physical database** — "Tenant DB" here means the existing operational schema, unchanged in location, reorganized only conceptually as "product-scoped data living under a Company." Per `multitenancy-risks.md`, this is deliberately *not* a database-per-tenant model.

- **Payroll product tables** (all 100% unchanged in structure): `payroll_runs`, `payroll_run_items`, `employees` + its satellite tables, `invoices` + line items, `attendance_*`, `leave_requests`, `salary_revisions`, `employee_loans`, etc. Every one of these keeps its existing `client_id` FK exactly as-is (see §11 — nothing here is renamed in Phase 1).
- **Compliance tables — explicitly still Payroll tables, per Rule 0.1**: `compliance_filings`, `pf_ecr_batches`, `esi_monthly_batches`, `pt_challan_batches`, `tds_24q_batches`, `tds_challans`, `form_b_batches`, `client_audit_pack_batches`. None of these gain a `company_id` of their own or any new relationship — they stay exactly where they are, reached the same way they are today (via `client_id`/`payroll_run_id`), because Compliance is not a product with its own tenant-scoping needs. The only thing that changes for this group is the same one thing that changes for all of Payroll: the `clients` row they hang off of gains a `company_id` (§6).
- **`clients` becomes `PayrollClientProfile`** (conceptually — see §6 for the exact column split): gains a `company_id` FK (nullable during migration, `NOT NULL` once backfilled), keeps every payroll/statutory/billing/portal column it has today. This is the single existing table that bridges Platform DB (`companies`) and Tenant DB (everything Payroll).
- **Global reference tables** (`pt_slabs`, `lwf_slabs`, `statutory_acts`, `esi_reason_codes`) stay exactly as they are — unscoped, shared across all tenants, correct today.
- **Future Staffing tables** (`staffing_client_profiles`, `placements`, whatever else Staffing needs) live in this same physical DB, each carrying `company_id` directly — never `client_id`, since Staffing has no relationship to Payroll's config.

## 6. Company/Client Model

**`Company`** (new) — the tenant. Fields extracted from `clients`' "generic company identity" bucket (`db-audit.md` §2): `company_name`, `client_code`→`company_code`, `industry`, `company_type`, `country`, `pan_number`, `tax_id`, `tan_number`, `gstin`, `trust_registration_number`, `registration_number`, `cin_number`, `incorporation_date`, `website`, `logo_path`, `display_name_override`, `accent_color`, registered address (5 fields), primary POC (3 fields), `status`, `onboarding_current_step`/`onboarding_completed_steps`.

**`PayrollClientProfile`** (the reframed `clients` table) — everything else stays: all ~30 payroll/statutory columns, all ~15 billing/invoicing columns, all ~11 portal-access columns, plus `account_manager_id`/`backup_account_manager_id`, `sla_tier`, `contract_type`/`contract_start/end_date`. Gains `company_id` (FK → `companies.id`, unique — 1:1 today, could relax to 1:many only if a genuine multi-entity-per-company need ever appears, which nothing in the evidence suggests). **`Employee`, `PayrollRun`, and every payroll/statutory service keep pointing at `client_id` → this table, unchanged** (see §9).

A **Staffing-only** company: a `companies` row exists, an `active` row in `company_product_subscriptions` for `staffing` exists, and **no `PayrollClientProfile` row exists at all** — satisfying requirement 4 directly (Payroll-specific info literally cannot be required of it, because the table it would live in isn't there).

A **Payroll+Staffing** company: one `companies` row, two subscription rows, one `PayrollClientProfile` row and one `StaffingClientProfile` row, both keyed by the same `company_id` — satisfying requirement 5 (same company identity, two independent product profiles).

**Where Plan sits**: on `Company`, not on `PayrollClientProfile` or any per-product profile — a company has exactly one Plan regardless of how many products it runs (see `company_plan_subscriptions`, §4/§8). This is deliberate: Plan is a commercial relationship between TECLA and the Company, not a Payroll concept, so it must not live on a table that a Staffing-only company (with no `PayrollClientProfile` row at all) would never have.

## 7. User/Authentication Model

Keep the single global `users` table and session-based auth (no evidence anything about auth mechanics needs to change for this redesign — the gap is authorization scope, not authentication transport).

- Add `company_id` to `users` **alongside** the existing `client_id` (do not remove `client_id` yet — see §14). For a Payroll-only user these are the same company's data reached two ways during transition; for a genuinely new Staffing user, `company_id` is populated and `client_id` stays null.
- **Resolve the `client_id`-column-vs-`client_user`-pivot ambiguity** (`company-user-audit.md` §2) by standardizing on a `company_user` pivot (`user_id`, `company_id`, `product_scope` — nullable array/enum of which product(s) this assignment covers, e.g. `['payroll']`, `['staffing']`, or both) as the *only* many-to-many mechanism going forward; keep the single `client_id`/`company_id` FK only for `role=client`/`role=employee` users' one "home" company.
- **Introduce a genuine Platform Admin distinction**, separate from today's overloaded `admin` role: either a `platform_admin` boolean on `users` (simplest, lowest-migration-risk) or a 5th role value. A platform admin has `company_id = NULL` and manages `companies`/`products`/`company_product_subscriptions`/all users — satisfying requirement 7. Product-level `admin` (today's role, unchanged in behavior) continues to mean "sees everything within the product(s) their company/assignment covers."
- **Fix the `getManagedClientIds()` empty-assignment fallback** (`multitenancy-risks.md` §5g) as part of this work, not as an afterthought — it becomes strictly more important once "which company" and "which product" are both dimensions a manager can be scoped on. Empty assignment must mean empty access, never "all."
- `role=employee` stays exactly as it is (scoped via `employee_id` → `Employee.client_id` → `PayrollClientProfile.company_id`) — Payroll employees are a Payroll-product concept; Staffing will need its own equivalent (a "worker"/"placement" identity — see §10) with its own portal, not a repurposing of `Employee`.

## 8. Plan, Product & Subscription Activation Model

Two axes, two tables for "current state," one table for "how did we get here" (§4). This section is the full mechanism — entitlement check, activation, and upgrade/downgrade — all data-driven per Rule 0.3.

### 8.0 What `plan_products` means — stated unambiguously

There are exactly two ways this table could be interpreted, and only one of them is correct in this design:

1. **✅ ALLOWED — `plan_products` is a permission list.** A row `(plan_id, product_id)` means *"a company on this plan is permitted to activate this product."* It says nothing about whether any given company actually has. **This is the design.**
2. **❌ AUTO-INCLUDED — NOT this design.** A row does *not* mean "every company on this plan automatically has this product active." No `company_product_subscriptions` row is created, changed, or implied by `plan_products` alone.

**Why it has to be interpretation 1**: if it were interpretation 2, Company A and Company B — both on Basic — would necessarily end up with the same product(s) active, since "Basic" would deterministically produce one fixed activation state. The scenario requires Basic to permit *both* Payroll and Staffing (two `plan_products` rows: `(basic, payroll)` and `(basic, staffing)`), while Company A activates only Payroll and Company B activates only Staffing — two independent `company_product_subscriptions` rows, one per company, each a free choice within what Basic allows. **`plan_products` is the menu; `company_product_subscriptions` is the order.** A plan with a row for a product is necessary for that product to be activatable, but never sufficient — and never automatic — for it to be active.

Concretely, for the four scenarios:

| | `plan_products` rows (permission — plan-level, shared) | `company_product_subscriptions` rows (activation — per-company, independent) |
|---|---|---|
| Basic | `(basic, payroll)`, `(basic, staffing)` — both permitted | Company A: `(A, payroll)` only. Company B: `(B, staffing)` only. |
| Plus | `(plus, payroll)`, `(plus, staffing)` — both permitted | Company C: `(C, payroll)` **and** `(C, staffing)`. |
| Company D, before upgrade | on Basic → `(basic, payroll)`, `(basic, staffing)` permitted | `(D, payroll)` only — Staffing permitted but not activated |
| Company D, after upgrade | on Plus → `(plus, payroll)`, `(plus, staffing)` permitted | `(D, payroll)` unchanged, **plus a new** `(D, staffing)` row created by a separate activation action |

Note Basic and Plus can have *identical* `plan_products` rows in this table (both could permit both products) and still be meaningfully different plans — the difference between them can live entirely in `limits` (§4's JSON column) or pricing, not necessarily in which products they permit. Nothing in the scenarios given requires Basic to structurally forbid Staffing+Payroll together; it only requires that Company A and B, both on Basic, ended up with different *activations*. (If the business intent is instead that Basic structurally caps a company to one product at a time, that's a `limits`-driven or activation-count rule enforced by `activateProduct()`, not a `plan_products` membership rule — flagged as an open business question in §12, not assumed here either way.)

### 8.1 Entitlement check (the only thing product code ever asks)

```
Company::hasActiveProduct(string $productCode): bool
    = EXISTS a company_product_subscriptions row for this company + product
      WHERE status IN ('trial', 'active')
```

That's the entire runtime check. It does **not** re-derive from the current plan on every request — the plan only matters at the moment a product is turned on or off (§8.3). This mirrors the existing, proven shape of `Client::isOperational()` (a single boolean read, no cross-table joins on the hot path) and is what `EnsureProductSubscribed` (a new middleware, parallel to but distinct from the existing internal-user `module:` middleware — see v1 §8, unchanged reasoning) evaluates before any Payroll or Staffing route resolves. **Compliance routes are gated by `hasActiveProduct('payroll')` and nothing else — Rule 0.1.**

### 8.2 Plan defines the menu, not the order

```
Plan::availableProducts(): Collection<Product>
    = products joined through plan_products WHERE plan_products.plan_id = this plan
```

A product can only be activated for a company if it appears in `Plan::availableProducts()` for that company's **current** plan. This is checked once, at activation time:

```
CompanyService::activateProduct(Company $company, Product $product, actor):
    if $product not in $company->currentPlan->availableProducts():
        reject — "Not included in your current plan. Upgrade to access {$product->name}."
    upsert company_product_subscriptions (status='active', activated_at=now)
    log company_subscription_history (event='product_activated')
```

Nothing here hardcodes which plan unlocks which product — that's entirely the data in `plan_products`, edited by Platform Admin (§8.4). A future third product (or a future third plan) needs zero code changes to this logic, only new rows.

### 8.3 Upgrade / downgrade

```
CompanyService::changePlan(Company $company, Plan $newPlan, actor):
    $oldPlan = $company->currentPlan
    direction = $newPlan->tier_rank > $oldPlan->tier_rank ? 'upgrade' : 'downgrade'

    close current company_plan_subscriptions row (status='superseded', ended_at=now)
    insert new company_plan_subscriptions row (plan_id=$newPlan, status='active', started_at=now, change_reason=direction)
    log company_subscription_history (event='plan_' + direction, previous=$oldPlan->code, new=$newPlan->code)

    if direction == 'downgrade':
        for each active company_product_subscriptions row whose product
              is NOT in $newPlan->availableProducts():
            → BLOCK the downgrade and surface the conflicting products to the actor, OR
            → auto-suspend those rows (status='suspended') and log a
              'product_suspended' history event, if the actor explicitly confirms
        (Platform Admin config choice — not hardcoded; see §8.4. Recommended default:
         block-with-confirmation, since silently cutting off a live product is the more
         dangerous failure mode of the two.)

    # Upgrading never auto-activates newly-available products. Company D (§17) becomes
    # ELIGIBLE for Staffing the moment they're on Plus — a separate, explicit
    # activateProduct() call (self-service or Platform-Admin-initiated) is what actually
    # turns Staffing on. This keeps billing/onboarding intent explicit rather than
    # surprising the company with a product they didn't ask to start using.
```

`tier_rank` comparison (not plan name) is what decides "upgrade" vs. "downgrade" — consistent with Rule 0.3.

### 8.4 What Platform Admin configures (no code involved)

- **Products**: add/retire a product row. (Today: just Payroll and Staffing.)
- **Plans**: create/edit/retire a plan (code, name, `tier_rank`, `is_public`).
- **Plan↔Product mapping**: per plan, check which products it *permits* (§8.0 — this does not activate anything for any company, it only makes activation possible), and optionally set per-product `limits` (JSON — e.g. employee caps), all via `plan_products` rows.
- **Downgrade conflict policy**: whether a downgrade that would strand an active product blocks or auto-suspends (a platform-level setting, or a per-plan override — deferred to implementation, not decided here).
- **Company plan assignment**: manually assign/change a company's plan (the admin-initiated path — §15/§16 cover the self-service path).

No `if` statement in application code should ever need to change when Platform Admin does any of the above.

## 9. Payroll's Relationship to Tenant

**Unchanged in every way that matters to running code — and this explicitly includes Compliance.** `Employee.client_id` continues to point at the same primary key it does today — that PK just now belongs to a table understood as "the Payroll product profile for a Company" rather than "the tenant." Every payroll/statutory service (`MonthlyPayrollCalculator`, `SalaryCalculationService`, `FormBGeneratorService`, `PfEcrGeneratorService`, etc. — all tightly `Client`-typed per `payroll-audit.md` §3) keeps working against the same model with the same columns, because the model isn't restructured, only reframed and given one new FK (`company_id`) pointing upward. This is precisely what makes requirement 1 ("Existing Payroll must continue working") achievable without a rewrite.

The one real change Payroll's code needs (not urgent, but see §14): treat `Client`/`PayrollClientProfile` as *owned by* the Payroll product rather than *being* the tenant — in practice this only matters once a second product exists and something needs to ask "does this company have Payroll at all" before assuming a `Client` row exists for it (a case that literally cannot happen today, since every `Client` row *is* the only tenant record, but can happen the moment Staffing-only companies exist).

**Compliance specifically** never needs its own version of this question — every Compliance controller already reaches its data by first loading a `Client`/`PayrollClientProfile` (directly or via `payroll_run_id`), so "does this company have Compliance" is already, structurally, the same question as "does this company have Payroll," today and after this redesign. No new check is introduced for Compliance anywhere in this document.

## 10. Future Staffing's Relationship to Tenant

Staffing has not started (requirement 2) — this section is deliberately a skeleton, not a schema, per "do not implement anything":

- Staffing gets its **own product profile table** (`staffing_client_profiles`), `company_id`-keyed, containing whatever Staffing-specific config it turns out to need — structurally identical in *shape* to `PayrollClientProfile` but with zero shared columns, since `payroll-audit.md` confirmed every payroll-adjacent column on the current model (PF/ESI/LWF/TDS/gratuity/cutoff days) is meaningless outside Payroll.
- Staffing needs its **own worker/placement identity**, not a repurposed `Employee`. The audit found `Employee.employment_model` (`eor`/`agency_contract`) already encodes an EOR-vs-agency distinction that *sounds* staffing-related but is fused into the Payroll employee record and driven by Payroll's own statutory calculation needs (PF/ESI eligibility, wage basis). Reusing `Employee` for Staffing placements would re-create the exact coupling problem this whole redesign exists to undo. If a person needs to exist in both Payroll and Staffing for the same company, that argues for a shared, thin `Person`/`Worker` identity (name, contact, government IDs) that both `Employee` and a future `Placement` reference — explicitly flagged as a pre-Staffing design decision in §14, not resolved here.
- Staffing's billing, if any, needs its own trigger — it cannot reuse `InvoiceGenerationService::generateForRun(PayrollRun)` as-is (`payroll-audit.md` §5), since Staffing has no `PayrollRun`.

## 11. Migration Strategy

Adapts the 3-phase pattern already proposed (and evidently well-reasoned) in `docs/architecture/06-migration-risk.md`, applied to `company_id` introduction rather than a `client_id`→`company_id` rename:

1. **Phase A — additive schema only.** Create `companies`, `products`, `plans`, `plan_products`, `company_plan_subscriptions`, `company_product_subscriptions`, `company_subscription_history` tables. Add a **nullable** `company_id` to `clients` and to `users`. No existing table, column, or FK is touched. Payroll (including Compliance) is unaffected because nothing it reads has changed. Seed `products` with `payroll`/`staffing`, and seed exactly **one** initial plan (e.g. `legacy`, `tier_rank=0`, `is_public=false`) whose `plan_products` *permits* both (two rows, per §8.0 — this alone activates nothing) — this is the "grandfather plan" every existing customer is placed on in Phase B, not a business decision about what Basic/Plus should look like (Platform Admin defines the real public plans separately, whenever ready).
2. **Phase B — backfill.** One idempotent script: for every existing `clients` row, create a `companies` row (identity columns copied across), set `clients.company_id` to the new row's id, seed a `company_product_subscriptions` row `(company_id, product_id=payroll, status=active)` for every currently-`active`/`onboarding` client (mirrors real-world truth: every existing client is already "subscribed to Payroll" — and, per Rule 0.1, already has Compliance, since it was never separate). Seed a `company_plan_subscriptions` row `(company_id, plan_id=legacy, status=active)` for every such company, plus a matching `company_subscription_history` row (`event_type='plan_assigned'`, `notes='migration backfill'`) so the history ledger is complete from day one, not just from the cutover forward. For `users`, backfill `company_id` from `client_id` where set.
3. **Phase C — harden.** Make `clients.company_id` `NOT NULL` + real FK once backfilled and verified. New client (company) creation flow starts creating a `companies` row first, then a `PayrollClientProfile` row referencing it, instead of one flat `clients` insert — this is the only behavioral change to the existing onboarding wizard, and it's additive (the wizard still collects the exact same fields, just writes them to two tables instead of one).
4. **Phase D (separate, can run in parallel with A-C since it's orthogonal) — tenant-boundary hardening**: fix `getManagedClientIds()`'s empty-fallback, apply `authorizeClientAccess()`-style checks to the confirmed-missing spots (`multitenancy-risks.md` §5: Payroll approve/lock/runSupplementary, TDS 24Q, PT Challan, `ClientPolicy`, Tax Declarations). **This should happen before or alongside Phase A**, not after — every gap in that list gets *more* dangerous once a second product and a product-dimension on user access exist, not less.

At no point in Phases A-C does a Payroll query, controller, or service need to change — this is the concrete mechanism behind requirement 1.

## 12. Risks

- **Silent dual-identity drift**: if `companies.company_name` and `clients.company_name` (kept temporarily for backward compatibility — see §14) ever diverge post-migration, reports could show inconsistent names. Mitigate by making `PayrollClientProfile` read the name from `companies` via the relationship as soon as Phase C lands, rather than keeping a second copy indefinitely.
- **The empty-fallback bug in `getManagedClientIds()` becoming load-bearing for two products at once** if Phase D is deferred — a manager with no Payroll assignment could see all companies' Payroll data; the same bug in a product-aware world could span products too. This is the single highest-leverage fix to land early.
- **`InvoiceGenerationService`'s hard coupling to `PayrollRun`** means Staffing billing is unbuilt design debt, not a gap this document can close — flagged, not solved (§10).
- **28 controller files with zero tenant-scoping calls today** (`multitenancy-risks.md` §2) are latent risk regardless of this redesign; the redesign doesn't create them, but doesn't fix them either unless Phase D is prioritized.
- **Onboarding UX regression risk**: splitting one wizard-driven insert into two related inserts (Company then PayrollClientProfile) needs careful transaction handling so a partial failure can't leave an orphaned `companies` row with no profile — mitigate with a DB transaction wrapping both writes, mirroring the existing `DB::transaction()` pattern already used elsewhere in `EmployeeController::store()`.
- **Migration ordering risk**: Phase C's `NOT NULL` constraint must not run until backfill is verified complete (row-count parity check between `clients` and `companies`) — exactly the kind of risk `06-migration-risk.md` already documents mitigations for.
- **Compliance-as-a-product creep**: the single largest risk this revision exists to prevent. Because `/compliance` is already a prominent top-level nav item and route group today, a future contributor unfamiliar with Rule 0.1 could plausibly propose "just add a `compliance` row to `products`." Mitigate by keeping this document's Rule 0 section as the canonical reference, and by never adding a `hasActiveProduct('compliance')` call anywhere — its absence is intentional and should stay conspicuous.
- **Plan/product conflict on downgrade left unresolved**: if the block-vs-auto-suspend policy (§8.3) isn't decided before Phase 2 ships, a downgrade could either wrongly strand a company's active product or wrongly block a legitimate downgrade indefinitely. This is a product-policy decision, not an engineering one — flagged, not resolved, in this document.
- **`tier_rank` collisions**: two plans accidentally sharing the same `tier_rank` value makes "upgrade vs. downgrade" ambiguous for `changePlan()`. Mitigate with a Platform Admin UI validation (unique `tier_rank`, or at minimum a warning), not a DB constraint that would block legitimate co-equal-tier plans if that's ever wanted.

## 13. Phased Implementation Plan

1. **Phase 0 (prerequisite, can start immediately, fully independent of everything else)**: Tenant-boundary hardening — fix `getManagedClientIds()` fallback, add `authorizeClientAccess()` checks to the confirmed gaps. Zero schema change. De-risks everything after it.
2. **Phase 1**: Additive schema (`companies`, `products`, `plans`, `plan_products`, `company_plan_subscriptions`, `company_product_subscriptions`, `company_subscription_history`, nullable `company_id` on `clients`/`users`) + backfill script (including the `legacy` plan grandfathering — §11) + verification. No behavior change yet; Payroll (and Compliance within it) runs identically.
3. **Phase 2**: Harden FKs (`NOT NULL`), switch the client/company onboarding wizard to write `companies` then `PayrollClientProfile` (§15). Introduce `platform_admin` distinction on `users`. Build the minimal Platform Admin console: manage companies, **manage the products catalog, manage plans and their plan-product mapping, assign/change a company's plan**, toggle product subscriptions, manage users (§8.4, §7) — this directly satisfies requirement 7 and is the first user-visible deliverable of the whole effort.
4. **Phase 3**: Introduce `EnsureProductSubscribed` middleware, wire it in front of the existing Payroll route groups (now a no-op for existing customers, since Phase 1's backfill already gave everyone an active Payroll subscription on the `legacy` plan) — proves the activation model works end-to-end before Staffing needs it. Define the first real public plans (e.g. Basic/Plus) as data at this point — this is a Platform Admin/business action, not an engineering task.
5. **Phase 4**: Build self-signup (§16) once Platform Admin has at least one public plan defined — this is naturally sequenced after Phase 3, not before.
6. **Phase 5 (whenever Staffing actually starts, per requirement 2 — no earlier)**: Design `staffing_client_profiles` and the shared Person/Worker identity question flagged in §10, informed by Staffing's actual requirements rather than guessed here.

## 14. What NOT to Change Yet

- **Do not rename or restructure `clients`, `employees`, `payroll_runs`, or any of the ~15 statutory batch tables.** They keep their current names, columns, and FKs indefinitely — only a `company_id` column is added to `clients`. Renaming `clients` → `payroll_client_profiles` at the *database* level (as opposed to conceptually, in this document) is a Phase 2+ cosmetic decision, not a Phase 1 requirement, and isn't needed for the architecture to work.
- **Do not remove `users.client_id`** until every read-path that depends on it has a verified `company_id`-based equivalent — keep both columns through Phase 2 at minimum.
- **Do not touch `InvoiceGenerationService`, `MonthlyPayrollCalculator`, or any of the tightly-`Client`-coupled statutory services** (`payroll-audit.md` §3) — none of them need to change for Payroll to keep working under this model, and speculatively decoupling them now (before Staffing's actual billing/worker requirements are known) risks guessing wrong.
- **Do not design or build any Staffing-specific table yet** — requirement 2 is explicit that it hasn't started; §10 intentionally stops at "here's the shape of the decision, not the decision."
- **Do not attempt physical per-tenant database/schema separation.** `multitenancy-risks.md` explicitly concludes the shared-DB model isn't the risk — inconsistent authorization is — and per-tenant DB separation would add real operational cost while leaving that actual risk unaddressed.
- **Do not fold Phase 0 (tenant-boundary hardening) into "later, after the product layer is done."** It's evidence-backed as already-broken today, independent of this redesign, and every day it's deferred is a day the confirmed gaps (Payroll approve/lock, TDS 24Q, PT Challan, Client CRUD, Tax Declarations — `multitenancy-risks.md` §5) stay exploitable.
- **Do not add `compliance` to the `products` table, ever, under any circumstance** (Rule 0.1). If a future request asks for "Compliance as its own subscription tier" or similar, that is a business-rule change this document does not authorize and should be escalated, not quietly implemented.
- **Do not let any application code branch on a plan's `code` or `name`** (Rule 0.3) — e.g. no `if ($plan->code === 'basic')`. All plan-driven behavior must route through `plan_products` membership and `tier_rank` comparison. A hardcoded plan-name check is the one mistake that would defeat the entire point of making Plans Platform-Admin-configurable.
- **Do not decide the downgrade conflict policy (block vs. auto-suspend) inside this document** — it's flagged in §8.3/§12 as a business-policy decision for Platform Admin/product, not resolved here.
- **Do not design Staffing's plan/product limits** (the `plan_products.limits` JSON shape for Staffing) before Staffing's actual requirements exist — the column is deliberately schema-flexible (JSON) so this can wait.

## 15. Company Onboarding (revised)

The existing **8-section Payroll onboarding wizard is untouched** — per `AGENTS.md`'s own instruction, its sections (`1. Identity` → `8. SLA`) are not reordered, merged, or removed, and nothing in this document requires touching them. What changes is what happens *before* it:

```
Step 0 (NEW) — Company & Plan
  ├─ Company identity: name, PAN/GSTIN/CIN, registered address, industry, primary contact
  ├─ Plan selection: Platform Admin picks (admin-initiated onboarding) or the public plan
  │  picker is shown (self-signup, §16) — only plans with status='active' are selectable
  └─ Product selection: multi-select, options constrained to Plan::availableProducts()
        │
        ├─ Payroll selected? → hand off into the EXISTING, UNCHANGED 8-step Payroll wizard
        │                       (Identity/Address/Contacts/Contract/Statutory/Documents/Portal/SLA)
        │
        └─ Staffing selected? → hand off into Staffing's own onboarding (future, §10 — not
                                 designed here)

  If both products selected: run Payroll's wizard first, then Staffing's, sequentially.
  (Revisit if/when Staffing's actual UX requirements suggest parallel tracks make more sense —
  not assumed here.)
```

Mechanically, this is one additional screen/step and one additional pair of writes (`companies` row, then `company_plan_subscriptions` + `company_product_subscriptions` rows) ahead of the wizard's existing first screen — the wizard's own internal `onboarding_current_step`/`onboarding_completed_steps` tracking (already proven on `clients`, reused identically on `companies` per §4) is unaffected, since Step 0 is a distinct, prior flow, not a 9th section bolted onto the existing 8.

**Admin-initiated companies** (Platform Admin creates the company directly, e.g. for an enterprise deal signed offline): same Step 0, but Plan can be any plan regardless of `is_public`, and the actor recorded on `company_plan_subscriptions`/`company_subscription_history` is the admin, not "self_service."

## 16. Self-Signup Flow (new)

A public-facing variant of Step 0, for a prospect who arrives without a salesperson/admin:

```
1. Public landing: minimal company identity capture (name, primary contact email, industry) +
   account credentials for the first user (becomes role=client / company-admin-equivalent for
   this company once created)
2. Public plan comparison page — shows only plans with is_public=true, their included
   products (via plan_products), and (if configured) their limits — this page is entirely
   rendered from data, never a hardcoded pricing table in a view
3. Prospect picks a Plan → picks Product(s) from that plan's availableProducts()
4. System creates: companies row (status='draft' or 'trial' per business decision — not
   fixed here), company_plan_subscriptions row (change_reason='initial', changed_by=null),
   company_product_subscriptions row(s) (status='trial' or 'active' depending on whether
   payment/verification gates activation — a billing-integration decision out of this
   document's scope), company_subscription_history rows for both
5. Redirect into Step 0's product hand-off (§15) — Payroll and/or Staffing wizard(s)
```

**Distinction from admin-initiated onboarding**: self-signup is Steps 1-4 above happening through a public, unauthenticated form with no Platform Admin involved; admin-initiated onboarding is Platform Admin performing the equivalent of steps 3-4 directly inside the Platform Admin console (§17) on behalf of a company, skipping the public landing/credential-creation step (the admin invites a user afterward instead, reusing the existing `InvitationService` already in the codebase).

Trial handling, payment gating, and exactly when a `draft`/`trial` company becomes fully `active` are billing/business decisions this document intentionally does not resolve — the schema (`status` enums already including `trial` on the subscription tables) supports whichever policy is chosen without further schema change.

## 17. Company Screen Examples

Illustrative Platform Admin "Company Detail" screen contents for the four given scenarios — showing exactly what the data model in §4/§8 produces, not new design:

**Company A** — Basic, Payroll only
```
Plan: Basic  [Change Plan]
Products:
  ☑ Payroll   — Active since 2026-06-01                    [Deactivate]
  ☐ Staffing  — Available on your plan, not activated       [Activate]
History:
  2026-06-01  plan_assigned      → Basic
  2026-06-01  product_activated  → Payroll
```

**Company B** — Basic, Staffing only
```
Plan: Basic  [Change Plan]
Products:
  ☐ Payroll   — Available on your plan, not activated       [Activate]
  ☑ Staffing  — Active since 2026-07-10                     [Deactivate]
History:
  2026-07-10  plan_assigned      → Basic
  2026-07-10  product_activated  → Staffing
```
*(Same plan as Company A — proof that "Basic" does not hardcode a fixed product set; it's a menu, and each company chose differently from it.)*

**Company C** — Plus, Payroll + Staffing
```
Plan: Plus  [Change Plan]
Products:
  ☑ Payroll   — Active since 2026-05-15                     [Deactivate]
  ☑ Staffing  — Active since 2026-05-15                     [Deactivate]
History:
  2026-05-15  plan_assigned      → Plus
  2026-05-15  product_activated  → Payroll
  2026-05-15  product_activated  → Staffing
```

**Company D** — Basic → Plus upgrade, two months apart
```
Plan: Plus  [Change Plan]
Products:
  ☑ Payroll   — Active since 2026-06-01                     [Deactivate]
  ☑ Staffing  — Active since 2026-08-01                     [Deactivate]
History:
  2026-06-01  plan_assigned      → Basic
  2026-06-01  product_activated  → Payroll
  2026-08-01  plan_upgraded      Basic → Plus
  2026-08-01  product_activated  → Staffing
```
*(Verification of the required separation — two independent record types, four rows total for this transition, none of them merged or implied by another:*
1. *`company_plan_subscriptions`: the Basic row gets `status='superseded', ended_at=2026-08-01`; a new row is inserted `(plan_id=plus, status='active', started_at=2026-08-01)`. This alone changes nothing about which products are running — it only re-defines what Company D is now **permitted** to activate (§8.0).*
2. *`company_product_subscriptions`: the existing Payroll row is untouched by the plan change. A separate, later `activateProduct()` call inserts a **new** row `(product=staffing, status='active', activated_at=2026-08-01)` — this is the action that actually turns Staffing on, and it is only possible because step 1 already happened.*
3. *`company_subscription_history` records both as distinct, separately-timestamped events (`plan_upgraded` then `product_activated`), so the causal order — plan changed first, product activated second, never the reverse — is preserved and auditable.*
*Compliance does not appear anywhere in Company D's product list or history, in any scenario — it was never a separate switch to flip.)*

