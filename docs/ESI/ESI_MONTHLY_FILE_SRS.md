# ESI Monthly Contribution File — Software Requirements Specification (SRS)

## 1. Objective & Purpose
The ESI Monthly Contribution File Generator provides an automated compliance utility to generate official ESIC bulk contribution files (`.xls`) directly from TECLA PAY's locked payroll runs.

---

## 2. System Architecture & Data Flow
```
[Locked Payroll Run] -> [PayrollRunItems] -> [EsiMonthlyContributionService] -> [Excel Writer (Xls)] -> [EsiMonthlyBatch] -> [.xls File Download]
```

### Safety Principles
1. **Zero Payload Mutation**: Reads locked payroll data strictly downstream. Never alters calculated payroll figures, employee records, PF ECR, or payslips.
2. **Locked Gating**: ESI generation requires a `locked` payroll status. `draft`, `processing`, or `approved` runs are blocked.
3. **Audit Trail**: Every generation creates a tracked batch record (`esi_monthly_batches`) storing SHA-256 file hash, total wages, employee count, and user timestamps.

---

## 3. Key Functional Requirements

### FR-1: ESI Eligibility Gating
Only employees where:
- `employees.esi_applicable == true`
- `payroll_run_items.employee_esi > 0`
- `payroll_run_items.is_excluded == false`

are included in the monthly file.

### FR-2: File Format & Layout
- Excel 97-2003 `.xls` format.
- Exactly 6 columns in prescribed order: `[IP Number, IP Name, No. of Days, Total Wages, Reason Code, Last Working Day]`.
- No header row. Data begins at Row 1.

### FR-3: Exit & Last Working Day Resolution
- If an employee has `last_working_day` recorded, and the exit date falls within the payroll wage month, it is formatted as `DD-MM-YYYY` in Column F.
- If no exit date or exit date is outside the wage month, Column F is left empty.

### FR-4: Batch Management & Idempotency
- Re-generating ESI for an existing payroll run updates the existing batch record in-place (`status = 'generated'`, new `file_hash`, updated timestamp) rather than duplicating batch history entries.
- Download action updates batch status to `downloaded` and logs `downloaded_at`.

---

## 4. Non-Functional Requirements
- **Performance**: Capable of generating files for 1,000+ employees in < 3 seconds.
- **Security**: File downloads are gated by `auth`, `active`, and `module:compliance` role permissions.
- **Integrity**: SHA-256 hash comparison prevents file tampering.
