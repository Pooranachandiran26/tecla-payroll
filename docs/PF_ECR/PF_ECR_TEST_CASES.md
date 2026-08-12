# Provident Fund (PF) ECR - Test Cases & QA Verification Matrix

**Project**: TECLA PAY  
**Feature**: Official EPFO Provident Fund UAN ECR 11-Field Generation  
**Specification**: Official EPFO Unified Employer Portal UAN ECR Specification 2.0  
**Last Updated**: 2026-08-10  

---

| Test ID | Test Scenario | Preconditions | Input / Action | Expected Result | Status |
|---|---|---|---|---|---|
| **TC-01** | Locked Payroll Run Preview | Payroll run in status='locked' with PF-applicable employees | Select locked run and click Preview | Calculates employee count, EPF wages, EE EPF, ER EPF (`employer_epf`), and EPS share correctly. No validation blocking errors. | PASSED |
| **TC-02** | Approved Payroll Run Preview | Payroll run in status='approved' | Select approved run and click Preview | Generates preview successfully. | PASSED |
| **TC-03** | Draft Payroll Run Rejection | Payroll run in status='draft' | Submit draft run ID for ECR generation | Generation BLOCKED. HTTP 422 error returned: "PF ECR generation requires an APPROVED or LOCKED payroll run." | PASSED |
| **TC-04** | Processing Payroll Run Rejection | Payroll run in status='processing' | Submit processing run ID for ECR generation | Generation BLOCKED with validation error. | PASSED |
| **TC-05** | Inclusion of PF-Applicable Employees | Employee with `pf_applicable = true` | Process ECR preview/generation | Employee record included in `.txt` file line items. | PASSED |
| **TC-06** | Exclusion of Non-PF Employees | Employee with `pf_applicable = false` | Process ECR preview/generation | Employee record EXCLUDED from ECR file lines completely. | PASSED |
| **TC-07** | Exclusion of Excluded Run Items | `payroll_run_items.is_excluded = true` | Process ECR preview/generation | Employee item excluded from file lines. | PASSED |
| **TC-08** | Missing 12-Digit UAN Validation | Employee with missing `uan_number` | Click Preview/Generate ECR | Generation BLOCKED. Error message returned: `"PF ECR cannot be generated. Employee: Priya Patel (TEC-002) - Missing Field: UAN (12-digit Universal Account Number)."` | PASSED |
| **TC-09** | Optional PF Member ID Behavior | Employee with missing `pf_member_id` | Click Preview/Generate ECR | ECR generation SUCCEEDS without error. PF Member ID is optional under UAN ECR 2.0. | PASSED |
| **TC-10** | Critical Employer EPF Mapping Verification | Locked payroll run items exist | Compare generated Field #9 with database | Field #9 MUST equal `payroll_run_items.employer_epf` (EPF-only), NOT `employer_pf` (blended CTC). | PASSED |
| **TC-11** | Sum Reconciliation Check | Finalized payroll run | Compare run item sums vs ECR totals | Sum of EE EPF, ER EPF, and EPS share matches database totals exactly. | PASSED |
| **TC-12** | Official Delimiter & 11-Field Count | Generated ECR `.txt` file | Inspect file line structure | File contains exactly 11 fields per line separated by `#~#`. | PASSED |
| **TC-13** | Whole Integer Monetary Format | Generated ECR `.txt` file | Inspect monetary fields (Fields 3-9, 11) | Amounts formatted as whole integers (no decimals, no paise). | PASSED |
| **TC-14** | Field #1 UAN Verification | Generated ECR `.txt` file | Inspect Field #1 | Field #1 contains 12-digit UAN (`employees.uan_number`). | PASSED |
| **TC-15** | Age 58+ EPS Zeroing | Employee age $\ge 58$ at wage month | Inspect Field #5 (EPS Wages) & Field #8 (EPS Share) | EPS Wages and EPS Share output as `0`. | PASSED |
| **TC-16** | NCP Days Calculation | Employee with `lop_days = 2.0` | Inspect Field #10 (NCP Days) | NCP Days output as integer `2`. | PASSED |
| **TC-17** | Batch Tracking Record Creation | Click Generate ECR | Inspect `pf_ecr_batches` table | Creates batch record with `status='generated'`, file path, hash, totals, user ID. | PASSED |
| **TC-18** | Authenticated File Download | Valid batch ID | GET `/compliance/pf-ecr/download/{id}` | Streams file download with filename `ECR_{establishment}_{wage_month}_{timestamp}.txt`. | PASSED |
| **TC-19** | Multi-Tenant Authorization Security | User from Client A attempts to download Client B batch | GET `/compliance/pf-ecr/download/{client_b_batch_id}` | Access DENIED. Returns HTTP 403 Forbidden. | PASSED |
| **TC-20** | Existing Payroll Regression Audit | Execute payroll runs, approval, payslip rendering | Run core payroll regression suite | Existing payroll processing, payslips, and calculations remain 100% UNCHANGED (31/31 assertions passed). | PASSED |
