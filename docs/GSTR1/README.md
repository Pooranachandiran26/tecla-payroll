# GSTR-1 Outward Supplies Module

## Overview
The **GSTR-1 Outward Supplies Module** provides official GSTN-compliant JSON payload generation (`.json`) and Excel Offline Tool Helper exports (`.xlsx`) based on raised invoices.

---

## Core Components
- **Service**: `App\Services\Gstr1GeneratorService`
- **Controller**: `App\Http\Controllers\Gstr1Controller`
- **Model**: `App\Models\Gstr1Batch`
- **Migration**: `database/migrations/2026_08_10_170000_create_gstr1_batches_table.php`
- **UI Component**: `resources/js/Pages/Compliance/ComplianceReports.jsx`
- **Tests**: `tests/Feature/Gstr1Test.php`

---

## Generated Outputs
1. **Official GSTN JSON Payload (`.json`)**:
   - Table 4A: B2B Invoices (`ctin`, `inum`, `idt`, `val`, `pos`, `rchrg`, `inv_typ`, `itms`)
   - Table 12: HSN/SAC 9985 Summary (`hsn_sc`, `desc`, `uqc`, `qty`, `txval`, `iamt`, `camt`, `samt`)
2. **Excel Offline Tool Helper (`.xlsx`)**:
   - Sheet 1: `4A - B2B Invoices`
   - Sheet 2: `12 - HSN Summary`
