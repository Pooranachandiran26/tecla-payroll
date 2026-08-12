# Module Impact & Refactoring Analysis

## Overview

This analysis evaluates the exact changes required across all 14 core functional modules of the Payroll application to support multi-company data isolation.

---

## 1. Employee Management Module

* **Affected Tables**: `employees`, `employee_documents`, `employee_exits`, `bank_change_requests`, `employee_queries`
* **Affected Models**: `Employee`, `EmployeeDocument`, `EmployeeExit`, `BankChangeRequest`, `EmployeeQuery`
* **Affected Controllers**: `EmployeeController`, `EmployeeExitController`, `BankChangeRequestController`, `EmployeeQueryController`, `EmployeePortalController`
* **Affected Services**: `EmployeeMasterReportService`, `FullAndFinalCalculationService`
* **Impact & Code Refactoring Requirements**:
  - Employee code uniqueness validation must be scoped: `Rule::unique('employees')->where('company_id', $companyId)`.
  - Bulk employee onboarding/import must inject `company_id` into staging rows and employee records.
  - Full & Final calculations must bound leave, loan, and exit recovery within `company_id`.

---

## 2. Payroll Processing Module

* **Affected Tables**: `payroll_runs`, `payroll_run_items`, `bulk_upload_batches`, `bulk_upload_staging_rows`
* **Affected Models**: `PayrollRun`, `PayrollRunItem`, `BulkUploadBatch`
* **Affected Controllers**: `PayrollController`, `BulkUploadController`, `DashboardController`
* **Affected Services**: `MonthlyPayrollCalculator`, `PayrollCorrectionService`, `PayrollEligibilityService`, `PayrollCycleWarningService`
* **Impact & Code Refactoring Requirements**:
  - `PayrollRun` creation must set `company_id`.
  - `MonthlyPayrollCalculator` must ensure `company_id` filter is present on all DB joins and employee candidate selections.
  - Live payroll monitor and approval workflows must enforce `company_id` permission checks.

---

## 3. Salary & Compensation Module

* **Affected Tables**: `salary_revisions`, `payroll_run_items`
* **Affected Models**: `SalaryRevision`
* **Affected Controllers**: `SalaryRevisionController`
* **Affected Services**: `SalaryCalculationService`, `SalaryRevisionReportService`
* **Impact & Code Refactoring Requirements**:
  - Salary revision history must be company-scoped.
  - CTC calculation helpers must fetch statutory parameters based on `company_id` configuration overrides.

---

## 4. Attendance Module

* **Affected Tables**: `attendance_records`, `attendance_correction_requests`, `attendance_upload_batches`, `attendance_upload_staging_rows`, `weekly_off_holidays`, `employee_attendance_overrides`
* **Affected Models**: `AttendanceRecord`, `AttendanceCorrectionRequest`, `AttendanceUploadBatch`, `Holiday`, `EmployeeAttendanceOverride`
* **Affected Controllers**: `AttendanceUploadController`, `AttendanceReviewController`, `AttendanceCorrectionApprovalController`, `DaySwapController`, `ClientHolidayController`
* **Affected Services**: `AttendanceResolutionService`, `AttendanceUploadValidationService`, `AttendanceLopReportService`
* **Impact & Code Refactoring Requirements**:
  - Biometric attendance upload validation must match employee codes scoped to `company_id`.
  - LOP calculations must resolve holidays (`weekly_off_holidays`) with `company_id` fallback.

---

## 5. Leave Management Module

* **Affected Tables**: `leave_requests`, `employee_leave_balances`, `client_leave_policies`
* **Affected Models**: `LeaveRequest`, `EmployeeLeaveBalance`, `ClientLeavePolicy`
* **Affected Controllers**: `LeaveApprovalController`, `ClientLeavePolicyController`
* **Affected Services**: `LeavePolicyService`
* **Impact & Code Refactoring Requirements**:
  - `LeavePolicyService` must filter policies by `company_id` and `client_id`.
  - Yearly leave balance accrual job must run per company context.

---

## 6. Provident Fund (PF / ECR) Module

* **Affected Tables**: `pf_ecr_batches`, `payroll_run_items`, `employees`, `clients`
* **Affected Models**: `PfEcrBatch`, `PayrollRunItem`
* **Affected Controllers**: `PfEcrController`
* **Affected Services**: `PfEcrGeneratorService`
* **Impact & Code Refactoring Requirements**:
  - `PfEcrGeneratorService` generates text files for EPFO filing. Must filter `payroll_run_items` by `company_id` to prevent cross-company employee rows in ECR file.
  - PF establishment codes must be resolved per company/client context.

---

## 7. ESI (Employee State Insurance) Module

* **Affected Tables**: `esi_monthly_batches`, `payroll_run_items`, `employees`
* **Affected Models**: `EsiMonthlyBatch`, `EsiReasonCode`
* **Affected Controllers**: `EsiMonthlyController`
* **Affected Services**: `EsiMonthlyContributionService`
* **Impact & Code Refactoring Requirements**:
  - Batch creation and contribution reports must be isolated by `company_id`.
  - Zero-day reason codes are mapped per company filing batch.

---

## 8. Professional Tax (PT) Module

* **Affected Tables**: `pt_challan_batches`, `pt_slabs`, `payroll_run_items`
* **Affected Models**: `PtChallanBatch`, `PtSlab`
* **Affected Controllers**: `PtChallanController`
* **Affected Services**: `PtChallanGeneratorService`
* **Impact & Code Refactoring Requirements**:
  - State-wise PT challan creation must isolate amounts by `company_id`.
  - `PtSlab` remains global reference table, but PT deductions are recorded per company item.

---

## 9. Tax Deducted at Source (TDS / 24Q) Module

* **Affected Tables**: `tds_24q_batches`, `tds_challans`, `employee_tax_declarations`
* **Affected Models**: `Tds24qBatch`, `TdsChallan`, `EmployeeTaxDeclaration`
* **Affected Controllers**: `Tds24qController`, `TaxDeclarationController`
* **Affected Services**: `Tds24qGeneratorService`, `TdsCalculationService`
* **Impact & Code Refactoring Requirements**:
  - Form 24Q text generation must scope challan entries and employee deductions strictly by `company_id` and TAN.

---

## 10. Employee Loan Module

* **Affected Tables**: `employee_loans`, `employee_loan_repayments`
* **Affected Models**: `EmployeeLoan`, `EmployeeLoanRepayment`
* **Affected Controllers**: `EmployeeLoanController`
* **Affected Services**: `LoanStatementReportService`
* **Impact & Code Refactoring Requirements**:
  - Loan disbursement, interest recovery, and monthly EMI payroll deductions must validate `company_id`.

---

## 11. Overtime Module

* **Affected Tables**: `attendance_records`, `payroll_run_items`
* **Affected Models**: `AttendanceRecord`, `PayrollRunItem`
* **Affected Controllers**: `AttendanceReviewController`, `PayrollController`
* **Affected Services**: `MonthlyPayrollCalculator`
* **Impact & Code Refactoring Requirements**:
  - Overtime hours calculation from attendance records must maintain `company_id` boundary.

---

## 12. Bonus Module (Statutory Bonus)

* **Affected Tables**: `employee_exits`, `payroll_run_items`
* **Affected Models**: `EmployeeExit`, `PayrollRunItem`
* **Affected Controllers**: `EmployeeExitController`, `PayrollController`
* **Affected Services**: `FullAndFinalCalculationService`
* **Impact & Code Refactoring Requirements**:
  - Annual statutory bonus calculation must calculate eligibility using `company_id` historical wages.

---

## 13. Reports Catalog & Custom Reports Module

* **Affected Services**: All 18 report services under `app/Services/Reports/`
  - `PayrollReportService`, `EmployeeMasterReportService`, `MarginProfitabilityReportService`, `StatutoryReportService`, `GstTaxReportService`, `InvoiceReportService`, `AuditLogReportService`, etc.
* **Impact & Code Refactoring Requirements**:
  - All report SQL builders must inherit `company_id` filtering from `BaseReportService`.

---

## 14. Payslip Generation & Distribution Module

* **Affected Tables**: `payroll_run_items`, `payroll_runs`
* **Affected Models**: `PayrollRunItem`
* **Affected Controllers**: `Admin\PayslipTemplateCustomizerController`, `PayrollController`
* **Affected Services**: `PayslipPdfService`
* **Impact & Code Refactoring Requirements**:
  - Payslip PDF generation must load company logo, legal address, statutory IDs, and template preferences based on `company_id`.
