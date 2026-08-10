# TDS Form 24Q Quarterly Return Module

## Overview
The **TDS Form 24Q Module** processes locked payroll runs and generates official e-TDS caret (`^`) delimited returns (`.txt`) for Protean RPU/FVU processing, alongside a 4-sheet Excel reconciliation helper (`.xlsx`).

---

## Technical Specifications
- **Service**: `App\Services\Tds24qGeneratorService`
- **Controller**: `App\Http\Controllers\Tds24qController`
- **Models**: `App\Models\Tds24qBatch`, `App\Models\TdsChallan`
- **Migrations**:
  - `database/migrations/2026_08_10_180000_create_tds_24q_batches_table.php`
  - `database/migrations/2026_08_10_180100_create_tds_challans_table.php`
- **UI Component**: `resources/js/Pages/Compliance/ComplianceReports.jsx`
- **Feature Tests**: `tests/Feature/Tds24qTest.php`

---

## Official Record Formats Generated
1. **Q1, Q2, Q3 Returns**:
   - `FH`: File Header Record
   - `BH`: Batch Header Record
   - `CD`: Challan Record
   - `DD`: Deductee Record (Annexure-I)
2. **Q4 Return**:
   - `FH`: File Header Record
   - `BH`: Batch Header Record
   - `CD`: Challan Record
   - `DD`: Deductee Record (Annexure-I)
   - `SD`: Salary Detail Record (Mandatory Annexure-II Full-Year Aggregation)

---

## 4-Sheet Excel Reconciliation Workbook (`.xlsx`)
1. **Summary**: Client TAN/PAN, FY, Quarter, Total Taxable Salary, Total TDS, Total Tax Deposited.
2. **Challan**: BSR Code, Deposit Date, Serial No, Tax, Surcharge, Cess, Interest, Fee 234E, Total.
3. **Annexure-I Deductees**: Employee Code, Name, PAN, Payment Date, Gross Salary, TDS, Reason Flag.
4. **Annexure-II Q4 Salary** (Q4 Only): Annual Gross u/s 17, Sec 10 Exemptions, Sec 16 Standard Deduction, Taxable Income, Total TDS.
