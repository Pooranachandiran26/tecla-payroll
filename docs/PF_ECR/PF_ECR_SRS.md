# Software Requirements Specification (SRS) - Provident Fund (PF) ECR Feature

**Project**: TECLA PAY (HR / CRM / Payroll)  
**Module**: Statutory Compliance Center  
**Feature**: Official EPFO Provident Fund Electronic Challan cum Return (ECR) File Generation  
**Document Version**: 1.1  
**Status**: APPROVED / IMPLEMENTED & VERIFIED  
**Last Updated**: 2026-08-10  

---

## 1. Document Purpose
This Software Requirements Specification (SRS) defines the functional, technical, compliance, security, and data requirements for generating the official EPFO Provident Fund Electronic Challan cum Return (ECR) plain text (`.txt`) file in TECLA PAY. It serves as the authoritative specification for developers, compliance managers, and QA engineers.

---

## 2. Executive Summary & Business Objective
Employers in India are required by law to file monthly Electronic Challan cum Returns (ECR) on the EPFO Unified Portal for Provident Fund compliance. TECLA PAY calculates monthly PF contributions during payroll processing. This feature enables HR and Compliance Administrators to export an official, validated, EPFO-compliant `.txt` return file directly from finalized (approved/locked) payroll runs, without manual data entry or recalculation.

---

## 3. Core Scope & Boundaries

### In-Scope
1. **Read-Only Data Extraction**: Extract finalized PF contribution records directly from locked/approved `payroll_runs` and `payroll_run_items`.
2. **Official 25-Field Mapping**: Format data according to the official EPFO ECR Specification (`#~#` delimited, whole integer amounts, `dd/mm/yyyy` dates).
3. **PF Applicability Filtering**: Include only active employees with `pf_applicable = true` and `is_excluded = false`.
4. **Pre-Generation Validation**: Block generation if mandatory EPFO fields (such as PF Member ID, UAN, DOB) are missing, reporting all validation errors to the user.
5. **Employee Profile PF Management**: Input fields for `PF Member ID` and `Member Relationship (Father/Spouse)` in Employee Add/Edit forms (`EmployeeForm.jsx`) and Profile View (`EmployeeDetail.jsx`).
6. **Monetary Reconciliation**: Reconcile sum of employee EPF share (`employee_pf`), employer EPF share (`employer_epf`), and employer EPS share (`employer_eps`) against ECR totals before file creation.
7. **ECR Preview & All-Month Filtering**: Render an on-screen preview of client details, totals, and employee-level line items before generating the text file. Supports selecting `All Finalized Months` or specific month filters.
8. **File Storage & Download**: Securely generate, hash, store, and stream download of `.txt` ECR files.
9. **Compliance Lifecycle Tracking**: Track batch status (`draft` $\rightarrow$ `validated` $\rightarrow$ `generated` $\rightarrow$ `downloaded` $\rightarrow$ `submitted` $\rightarrow$ `accepted`/`rejected` $\rightarrow$ `filed`) via `pf_ecr_batches`.

### Out-of-Scope (Non-Goals)
1. **Direct EPFO API Submission**: EPFO does not expose a direct submission API for non-portal upload. File upload to the EPFO Unified Portal remains a manual step performed by the employer on the government website.
2. **Payroll Formula Modifications**: No changes to `SalaryCalculationService`, `MonthlyPayrollCalculator`, or payslip engines.
3. **Multi-Establishment Automated Grouping**: Each ECR file is scoped to a selected client and its configured PF establishment code.

---

## 4. Existing System vs. Proposed Flow

### Existing Flow (Prior State)
```
Employee Setup → Payroll Run → PF Calc → Payroll Approval → Payroll Lock → Compliance Dashboard ("Coming Soon" static button)
```

### Implemented Flow
```
Finalized (Locked/Approved) Payroll Run
       ↓
Filter PF-Applicable Employees (pf_applicable = true)
       ↓
Validate Required EPFO Data (PF Member ID, UAN, DOB, Dates)
       ↓
Render ECR Preview & Reconcile Totals (EE EPF, ER EPF [employer_epf], EPS)
       ↓
Generate Official #~#-Delimited EPFO .TXT File
       ↓
Save to Storage & Create PfEcrBatch Tracking Record
       ↓
Download TXT File & Perform Manual Upload to EPFO Portal
       ↓
Update Filing Status (TRRN / Challan Number / Acknowledgment)
```

---

## 5. Critical Compliance & Data Mapping Rules

### Critical Employer EPF Rule
> [!CAUTION]
> In TECLA PAY, `payroll_run_items.employer_pf` is a **blended CTC accounting figure** containing EPF + EPS + EDLI + Admin charges.
> The ECR generator **MUST USE `payroll_run_items.employer_epf`** for Field #9 and Field #10 (Employer EPF Share). `employer_pf` MUST NOT be used for government filings.

---

## 6. Official EPFO 25-Field Specification & TECLA Mapping Table

| # | Field Name | Width/Type | Mandatory | TECLA PAY Source / Logic | Validation Rule |
|---|---|---|---|---|---|
| 1 | Member ID | Num(7) | **Yes** | `employees.pf_member_id` | Must be non-empty string $\le 50$ chars. Error if missing |
| 2 | Member Name | Char(85) | **Yes** | `employees.full_name` | Stripped of special chars except `.`. Error if empty |
| 3 | EPF Wages | Num(10) | Yes | Re-calculated EPF wage base integer: `min(Basic+DA, pf_ceiling)` or `Basic+DA` | Whole number integer $\ge 0$ |
| 4 | EPS Wages | Num(10) | Yes | `min(Basic+DA, 15000)` integer; `0` if age $\ge 58$ or `eps_applicable == false` | Whole number integer $\ge 0$, max 15000 |
| 5 | EPF EE Share Due | Num(10) | Yes | `round(payroll_run_items.employee_pf)` | Whole integer $\ge 0$ |
| 6 | EPF EE Share Remitted | Num(10) | Yes | Same as Field 5 | Whole integer $\ge 0$ |
| 7 | EPS Contribution Due | Num(10) | Yes | `round(payroll_run_items.employer_eps)` | Whole integer $\ge 0$ |
| 8 | EPS Contribution Remitted | Num(10) | Yes | Same as Field 7 | Whole integer $\ge 0$ |
| 9 | Diff EPF/EPS ER Share Due | Num(10) | Yes | `round(payroll_run_items.employer_epf)` | Whole integer $\ge 0$ |
| 10 | Diff EPF/EPS ER Share Remitted | Num(10) | Yes | Same as Field 9 | Whole integer $\ge 0$ |
| 11 | NCP Days | Num(2) | Yes | `round(payroll_run_items.lop_days)` | Integer $0 \le \text{NCP} \le 31$ |
| 12 | Refund of Advances | Num(10) | Yes | `0` | Default 0 |
| 13 | Arrear EPF Wages | Num(10) | Yes | `0` | Default 0 |
| 14 | Arrear EPF EE Share | Num(10) | Yes | `0` | Default 0 |
| 15 | Arrear EPF ER Share | Num(10) | Yes | `0` | Default 0 |
| 16 | Arrear EPS Share | Num(10) | Yes | `0` | Default 0 |
| 17 | Father's/Husband's Name | Char(85) | Conditional | `employees.father_name` (or `spouse_name`) | Sanitized text |
| 18 | Relationship | Char(1) | Conditional | `employees.member_relationship` | 'F' (Father) or 'S' (Spouse) |
| 19 | Date of Birth | Date | Conditional | `employees.date_of_birth` | Format `dd/mm/yyyy` |
| 20 | Gender | Char(1) | Conditional | `employees.gender` (`male` $\rightarrow$ M, `female` $\rightarrow$ F, `other` $\rightarrow$ T) | Allowed: M / F / T |
| 21 | DOJ EPF | Date | Conditional | `employees.date_of_joining` if in wage month, else `""` | `dd/mm/yyyy` or blank |
| 22 | DOJ EPS | Date | Conditional | `employees.date_of_joining` if in wage month & `eps_applicable`, else `""` | `dd/mm/yyyy` or blank |
| 23 | DOE EPF | Date | Conditional | `employees.last_working_day` if in wage month, else `""` | `dd/mm/yyyy` or blank |
| 24 | DOE EPS | Date | Conditional | `employees.last_working_day` if in wage month & `eps_applicable`, else `""` | `dd/mm/yyyy` or blank |
| 25 | Reason for Leaving | Char(1) | Conditional | Mapped from `employees.exit_reason`: `resignation`/`end_of_contract`/`termination` $\rightarrow$ `C` | Mandatory if DOE populated |

---

## 7. Database Changes & Tracking Schema

### `employees` Table Enhancements
* `pf_member_id` (VARCHAR 50, NULLABLE, INDEX): Stores employee PF Member Account Number.
* `member_relationship` (ENUM ['F', 'S'], DEFAULT 'F'): Relationship flag ('F' = Father, 'S' = Spouse).

### Dedicated `pf_ecr_batches` Table Schema
```sql
CREATE TABLE pf_ecr_batches (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    client_id BIGINT UNSIGNED NOT NULL,
    payroll_run_id BIGINT UNSIGNED NOT NULL,
    pf_establishment_code VARCHAR(100) NOT NULL,
    wage_month DATE NOT NULL,
    employee_count INT NOT NULL DEFAULT 0,
    total_epf_wages DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    total_eps_wages DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    total_employee_epf DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    total_employer_epf DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    total_employer_eps DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    total_ncp_days INT NOT NULL DEFAULT 0,
    status ENUM('draft','validated','generated','downloaded','submitted','accepted','rejected','filed') DEFAULT 'generated',
    file_path VARCHAR(255) NULL,
    file_name VARCHAR(255) NULL,
    file_hash VARCHAR(64) NULL,
    generated_by BIGINT UNSIGNED NULL,
    generated_at TIMESTAMP NULL,
    downloaded_at TIMESTAMP NULL,
    trrn VARCHAR(100) NULL,
    challan_number VARCHAR(100) NULL,
    acknowledgement_ref VARCHAR(100) NULL,
    rejection_reason TEXT NULL,
    remarks TEXT NULL,
    created_by BIGINT UNSIGNED NULL,
    updated_by BIGINT UNSIGNED NULL,
    created_at TIMESTAMP NULL,
    updated_at TIMESTAMP NULL,
    deleted_at TIMESTAMP NULL,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
    FOREIGN KEY (payroll_run_id) REFERENCES payroll_runs(id) ON DELETE CASCADE
);
```

---

## 8. Security & Authorization
* **Middleware**: `auth`, `role:admin,manager`, `module:compliance`.
* **Tenant Isolation**: Sourced payroll runs and downloaded ECR files are validated against the authenticated user's accessible clients. Unauthorized cross-client access returns HTTP 403 Forbidden.
* **File Storage**: ECR text files are stored in `storage/app/pf_ecr/` (non-public directory) and streamed via authenticated controller endpoints only.

---

## 9. Testing & Acceptance Criteria
1. Locked/Approved payroll runs select correct PF-applicable employees.
2. Draft/processing payroll runs block ECR generation.
3. Missing `pf_member_id` or UAN generates clear validation errors blocking file creation.
4. Total sums match `payroll_run_items` (`employee_pf`, `employer_epf`, `employer_eps`).
5. `.txt` file outputs exactly 25 `#~#`-delimited fields per line with CRLF line breaks.
6. Authorization guards prevent cross-client file access.
7. Employee Add/Edit form allows saving `PF Member ID` and `Member Relationship`.
