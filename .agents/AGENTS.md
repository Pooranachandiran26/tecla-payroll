# Workspace Instructions & Memory Rules

## Git Branch Management & Safety Rules
- **Zero Code Loss Guarantee**: Always perform a complete git commit log and branch diff check before merging or pulling code across `feature-name`, `rajesh`, `chandru`, and `main` branches. Ensure every line of code across all team branches is preserved.
- **Remote Synchronization**: Keep `main` fast-forwarded with `origin/main` and ensure `feature-name` is kept merged and pushed with `origin/feature-name`.

## Compliance Module Reference (`/compliance`)
- The project documentation for the Compliance Module workflow is stored in `COMPLIANCE_WORKFLOW.md` in the workspace root.
- Key statutory generators: PF ECR (`#~#` format), ESIC Monthly (`.xlsx`/`.csv`), PT Challan (State-wise slabs), TDS Form 24Q (Protean FVU format), GSTR-1 (`.json` payload), and Client Audit Pack (`.zip` bundle with SHA-256 hashes).

## Client Onboarding Module Reference
- **8 Onboarding Sections**: Exactly 8 sections (`1. Identity`, `2. Address`, `3. Contacts`, `4. Contract`, `5. Statutory`, `6. Documents`, `7. Portal`, `8. SLA`). Do not reorder, merge, or remove sections.
- **Draft & Progress Persistence**: Client onboarding draft persistence uses `clients.status = 'draft'`, `clients.onboarding_current_step` (integer 1-8), and `clients.onboarding_completed_steps` (JSON mapping section completion).
- **Single Draft Record Guarantee**: Saving draft creates or updates exactly one record per client onboarding flow using Inertia `router.post` / `router.put`.
- **Quick Fix Cross-Section Navigation**: `jumpToField(targetStep, fieldId)` navigates to the target section, scrolls and focuses the target field with glowing `.field-highlight-pulse` styling, stores `returnStep`, and automatically returns the user to their originating section when corrected.
- **Billing Model ENUM**: `clients.billing_model` MySQL enum contains `['markup', 'fixed_per_candidate', 'fixed_per_month', 'lumpsum', 'hourly', 'inhouse']`.

## Security Audit Findings & Fix Patterns (Phase 1)
- **Status**: Codebase is currently **NOT SAFE TO PROCEED** to DB schema review due to widespread IDOR vulnerabilities.
- **Affected Controllers**: `SalaryRevisionController`, `EmployeeController`, `BulkUploadController`, `ComplianceController`, `BankChangeRequestController`, `EmployeeExitController`, and `ExportController`.
- **Vulnerability**: Methods like `activate()`, `approve()`, `storeDocument()`, and `markFiled()` are trusting `findOrFail($id)` or `client_id` payloads without verifying if the manager is actually authorized for that specific client/employee.
- **Required Fix Pattern**: Every controller method performing read, write, or delete must enforce tenant isolation by strictly validating `$user->isManagerForClient($clientId)`. Do not rely solely on the `['admin', 'manager']` role middleware.
