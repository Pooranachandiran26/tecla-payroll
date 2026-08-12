# ESI Monthly Contribution Module

## Overview
The **ESI Monthly Contribution Module** handles generation and filing batch tracking for official ESIC monthly return files (`.xls`) in accordance with the Government of India / ESIC Employer Portal specification.

---

## Documentation Index
1. [Government Specification](file:///f:/xampp/htdocs/tecla-payroll/docs/ESI/ESI_MONTHLY_FILE_GOVERNMENT_SPEC.md) — Official ESIC portal format, field order, and data constraints.
2. [Software Requirements Specification (SRS)](file:///f:/xampp/htdocs/tecla-payroll/docs/ESI/ESI_MONTHLY_FILE_SRS.md) — Architectural overview, data flow, safety principles, and eligibility rules.
3. [Codebase Changes](file:///f:/xampp/htdocs/tecla-payroll/docs/ESI/ESI_MONTHLY_FILE_CHANGES.md) — Summary of files added, modified, and preserved.
4. [Test Cases & Matrix](file:///f:/xampp/htdocs/tecla-payroll/docs/ESI/ESI_MONTHLY_FILE_TEST_CASES.md) — Verification results and automated test suite.

---

## Key Contacts & Components
- **Service**: `App\Services\EsiMonthlyContributionService`
- **Controller**: `App\Http\Controllers\EsiMonthlyController`
- **Model**: `App\Models\EsiMonthlyBatch`
- **UI Component**: `resources/js/Pages/Compliance/ComplianceReports.jsx`
