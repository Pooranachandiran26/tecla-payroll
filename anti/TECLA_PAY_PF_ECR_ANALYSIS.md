You are working on an existing Laravel project called TECLA PAY.

PROJECT OVERVIEW
================

TECLA PAY is a Payroll and HR/CRM application.

Technology:
- Backend: Laravel / PHP
- Database: MySQL
- Frontend: Blade + HTML/CSS/JavaScript
- Existing application with Payroll and Compliance modules

IMPORTANT:
This is an EXISTING production-style project.

Do NOT assume the project is empty.
Do NOT rebuild existing functionality.
Do NOT change existing business logic unless I explicitly ask.

CURRENT MAJOR MODULES
=====================

1. Dashboard
2. Quick Access
3. Clients
4. Employees
5. Payroll
6. Compliance
7. Reports
8. Admin

CURRENT PAYROLL FLOW
====================

Client
 ↓
Employees
 ↓
Payroll
 ↓
Payroll Calculation
 ↓
Payroll Run
 ↓
Payroll Approval
 ↓
Payroll Lock / Approved
 ↓
Compliance

Payroll is already implemented.

IMPORTANT:
The existing Payroll calculation and approved Payroll Run are already being used.

Do NOT change the existing Payroll flow unless I explicitly instruct you.

CURRENT COMPLIANCE MODULE
=========================

The Compliance screen currently contains:

- Provident Fund ECR
- ESI Monthly File
- PT Challan Summary
- TDS Form 24Q
- GSTR-1 Summary
- Client Audit Pack
- Client-wise Compliance Register
- PF / ESI / PT / TDS / CLRA status
- Draft returns auto-populated from approved Payroll Run

CURRENT PF ECR SCREEN
====================

The Compliance page currently displays:

"Provident Fund ECR"

Description:

"Generates Electronic Challan cum Return (ECR) for EPFO portal upload."

Button:

"Generate ECR (.txt) – Coming Soon"

There is also a UI message indicating that a Draft PF ECR is auto-populated from an approved Payroll Run.

IMPORTANT FINDING:
The current PF ECR UI is currently static/incomplete.

The actual backend ECR generation functionality has NOT yet been implemented.

PF ECR is the next feature we are planning to implement.

==================================================
CRITICAL SAFETY RULE
==================================================

Before modifying anything:

FIRST inspect the existing code.

Understand:

- Existing Payroll flow
- Payroll Run
- Payroll calculation
- PF calculation
- Employee statutory information
- Existing Compliance module
- Existing database structure
- Existing compliance filing structure

DO NOT modify anything during initial analysis.

==================================================
PF ECR REQUIREMENT
==================================================

We need to implement official EPFO Provident Fund ECR generation.

The official EPFO ECR File Structure document is the government source of truth:

https://www.epfindia.gov.in/site_docs/PDFs/OnlineECR_PDFs/ECR_ForEmployers_FileStructure.pdf

The ECR must eventually contain the official required fields and follow the official file structure.

Do NOT invent fields.

Do NOT use random third-party ECR formats.

==================================================
VERY IMPORTANT EXISTING DATA FINDING
==================================================

During previous analysis we identified an important distinction:

payroll_run_items.employer_pf

is NOT necessarily the employer's EPF contribution.

It is a blended amount used for accounting/CTC/invoicing purposes.

The actual employer EPF contribution must use:

payroll_run_items.employer_epf

or the actual verified source in the existing code/database.

DO NOT change this mapping without first verifying the code.

Never use employer_pf blindly for the EPFO ECR employer EPF field.

==================================================
KNOWN PF ECR DATA GAPS
==================================================

Previous analysis identified that some official EPFO ECR fields may not currently have a proper source in TECLA PAY.

Potential missing information includes:

- PF Member ID
- EPF wage base
- EPS wage base
- NCP Days
- Arrear EPF wages
- Arrear EPF employee share
- Arrear EPF employer share
- Arrear EPS
- Refund of Advances

IMPORTANT:

Do NOT invent values.

Do NOT use UAN as PF Member ID unless the existing business rules explicitly confirm that this is correct.

If a required field is missing:

STOP and report it.

Do not silently generate incorrect government data.

==================================================
DATABASE RULE
==================================================

First inspect existing tables.

Try to reuse existing database structures where appropriate.

Do NOT automatically create multiple new tables.

If new tracking tables are required, first document:

- Why existing tables cannot support the requirement
- Proposed table name
- Columns
- Relationships
- Foreign keys
- Indexes
- Unique constraints
- Purpose

Then WAIT for my approval before creating migrations.

==================================================
COMPLIANCE TRACKING
==================================================

The PF ECR lifecycle may eventually need tracking for:

Draft
 ↓
Validated
 ↓
Generated
 ↓
Downloaded
 ↓
Submitted
 ↓
Accepted / Rejected
 ↓
Challan
 ↓
Payment
 ↓
Acknowledgement
 ↓
Filed
 ↓
Revision / Resubmission

But do not implement this entire lifecycle automatically.

First inspect what already exists.

==================================================
EXISTING FLOW MUST BE PROTECTED
==================================================

Do NOT break:

- Employee management
- Payroll
- Payroll calculations
- Payroll approval
- Payroll locking
- Payslips
- PF calculations
- ESI calculations
- PT calculations
- Existing Compliance
- Existing Reports
- Existing Client functionality

PF ECR should preferably be implemented as an isolated Compliance feature using finalized payroll data.

Do NOT recalculate payroll inside ECR.

==================================================
WORKING METHOD
==================================================

For every task I give you:

STEP 1:
Inspect existing implementation.

STEP 2:
Explain what you found.

STEP 3:
Identify files that need to change.

STEP 4:
Identify database impact.

STEP 5:
Identify possible impact on existing flow.

STEP 6:
Ask for approval if the change is risky or affects existing business logic.

STEP 7:
Only then implement.

Do not make large unrelated changes.

==================================================
IMPORTANT
==================================================

Do not make assumptions about the existing application.

Use the actual code as the source of truth for:

- Table names
- Column names
- Routes
- Controllers
- Models
- Services
- Payroll calculations
- PF calculations
- Existing compliance logic

If something is unclear, tell me.

I will provide additional documents/analysis when required.

==================================================
CURRENT TASK
==================================================

For now, DO NOT IMPLEMENT PF ECR.

First inspect the project and provide:

1. Project structure
2. Payroll flow
3. PF calculation flow
4. Compliance flow
5. Current PF ECR implementation status
6. Relevant database tables
7. Relevant controllers/models/services/routes
8. Existing PF fields
9. Missing PF ECR fields
10. Potential database changes
11. Risks to existing Payroll flow

Then wait for my next instruction.