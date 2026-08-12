# Professional Tax (PT) Compliance Module

## Overview
The **Professional Tax (PT) Compliance Module** provides state-wise statutory reconciliation and return filing helper exports (`.xlsx`) based strictly on locked payroll run data.

---

## Key Documentation
1. [Government Specification](file:///f:/xampp/htdocs/tecla-payroll/docs/PT/PT_CHALLAN_GOVERNMENT_SPEC.md) — State-wise rules for MH, KA, TN, portals, registration numbers, and filing methods.
2. [Implementation Summary](file:///f:/xampp/htdocs/tecla-payroll/anti/PT_CHALLAN_IMPLEMENTATION.md) — Full code breakdown, routes, models, services, and test verification output.

---

## Core Components
- **Service**: `App\Services\PtChallanGeneratorService`
- **Controller**: `App\Http\Controllers\PtChallanController`
- **Model**: `App\Models\PtChallanBatch`
- **Migration**: `database/migrations/2026_08_10_150000_create_pt_challan_batches_table.php`
- **UI Component**: `resources/js/Pages/Compliance/ComplianceReports.jsx`
