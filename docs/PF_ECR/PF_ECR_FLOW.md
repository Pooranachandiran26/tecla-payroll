# Provident Fund (PF) ECR - Old vs. New Architecture & System Flow

**Project**: TECLA PAY  
**Feature**: Official EPFO Provident Fund ECR Generation  
**Last Updated**: 2026-08-10  

---

## 1. PREVIOUS EXISTING FLOW (Before Implementation)

```
[Employee Master]
  ↓ (pf_applicable, salary setup)
[Attendance Resolution]
  ↓
[Payroll Processing] (PayrollController::process → MonthlyPayrollCalculator)
  ↓
[Payroll Approval] (status: draft → approved)
  ↓
[Payroll Lock] (status: approved → locked; model guards freeze fields)
  ↓
[Compliance Dashboard] (ComplianceController@index)
  ↓
[Static UI Placeholder]
  • Card: "Provident Fund ECR"
  • Button: "Generate ECR (.txt) – Coming Soon" (DISABLED)
  • Banner: "Draft PF ECR auto-populated from Payroll Run #PR-0626 (Approved)" (STATIC TEXT)
  • Backend logic: NON-EXISTENT (0 routes, 0 services, 0 controllers)
```

---

## 2. IMPLEMENTED SYSTEM FLOW (New Functional Feature)

```
========================================================================================
STEP 1: FINALIZED PAYROLL DATA CONSUMPTION (READ-ONLY)
========================================================================================
[Locked / Approved Payroll Run] (payroll_runs table, status = 'locked' or 'approved')
  ↓ Read finalized items
[Payroll Run Items] (payroll_run_items table)
  • employee_pf   → Employee EPF Share
  • employer_epf  → Employer EPF Share (EPF-only, excluding EDLI/Admin)
  • employer_eps  → Employer EPS Share
  • lop_days      → Loss of Pay days (mapped to integer NCP)

========================================================================================
STEP 2: EMPLOYEE SELECTION & APPLICABILITY GATING
========================================================================================
Filter Active Employees in Selected Run:
  • employees.pf_applicable == true
  • payroll_run_items.is_excluded == false
  • Split by client's configured PF Establishment Code

========================================================================================
STEP 3: PRE-GENERATION VALIDATION & RECONCILIATION
========================================================================================
Validate Mandatory EPFO Rules:
  ✓ Member ID present? (employees.pf_member_id)
  ✓ UAN present? (employees.uan_number)
  ✓ Member Name valid? (employees.full_name)
  ✓ Date of Birth present? (employees.date_of_birth)
  ✓ Run Status is Approved/Locked? (payroll_runs.status in ['approved', 'locked'])

Reconcile Financial Totals:
  ✓ SUM(payroll_run_items.employee_pf) == SUM(ECR Employee EPF)
  ✓ SUM(payroll_run_items.employer_epf) == SUM(ECR Employer EPF)  [NOT employer_pf!]
  ✓ SUM(payroll_run_items.employer_eps) == SUM(ECR Employer EPS)

If Validation Errors Found:
  → STOP generation. Render blocking error drawer with line-item employee details.

========================================================================================
STEP 4: ECR PREVIEW & DATA RENDERING
========================================================================================
Render Interactive UI Preview:
  • Client Name & PF Establishment Code
  • Selected Payroll Month & Run ID
  • Employee Count
  • Total EPF Wages, Total EPS Wages
  • Total Employee EPF, Total Employer EPF, Total EPS Share
  • Total NCP Days

========================================================================================
STEP 5: OFFICIAL EPFO .TXT FILE GENERATION
========================================================================================
Format Record per Employee (25 Fields):
  Field 1#~#Field 2#~#Field 3#~#...#~#Field 25
  • Separator: #~#
  • Amounts: Whole Integers (no decimals)
  • Dates: dd/mm/yyyy
  • Line Break: CRLF (\r\n)

========================================================================================
STEP 6: SECURE FILE STORAGE & TRACKING
========================================================================================
Write File:
  • Target Path: storage/app/pf_ecr/{client_id}/{filename}.txt
  • Calculate SHA-256 File Hash
Create Batch Track Record:
  • Table: pf_ecr_batches
  • Record totals, status='generated', generated_by, file_path, file_hash

========================================================================================
STEP 7: AUTHENTICATED DOWNLOAD & MANUAL EPFO PORTAL UPLOAD
========================================================================================
Download Stream:
  • GET /compliance/pf-ecr/download/{batch_id}
  • Verified against Client Authorization
Upload to EPFO Portal:
  • Human Admin uploads generated .txt file to https://unifiedportal-emp.epfindia.gov.in/

========================================================================================
STEP 8: STATUS TRACKING & CHALLAN RECORDING
========================================================================================
Update Batch Details:
  • Enter TRRN (Temporary Return Reference Number)
  • Enter Challan Number & Payment Date
  • Update Status: Generated → Submitted → Filed (or Rejected with reason)
  • Option to auto-sync status to compliance_filings
```

---

## 3. KEY ARCHITECTURAL PRINCIPLES RESPECTED

1. **Isolation**: Sourced downstream of locked payroll. No changes to core calculations.
2. **Data Integrity**: Clean separation between blended accounting `employer_pf` and official government `employer_epf`.
3. **Traceability**: Audit trail from payroll run item $\rightarrow$ ECR line item $\rightarrow$ batch record $\rightarrow$ file storage.
