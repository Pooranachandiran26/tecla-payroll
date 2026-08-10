# Professional Tax (PT) Challan & Return — Government Specification

## 1. Verified Official State Guidelines

### Maharashtra (PTRC Return — Form III-B)
- **Official Portal**: [MahaGST Portal](https://www.mahagst.gov.in)
- **Registration**: 12-digit **PTRC TIN** (e.g., `27123456789P`)
- **Return Form**: Form III-B (PTRC Monthly Return)
- **Filing Frequency**: Monthly, due by end of following month
- **Submission Method**: Download official MahaGST Form III-B Excel macro utility -> Enter data -> Validate -> Generate `.txt` file -> Upload on portal.

---

### Karnataka (Form 5A Statement)
- **Official Portal**: [e-Prerana Portal](https://pt.kar.nic.in)
- **Registration**: **PT EC Number** (Enrollment Certificate Number)
- **Return Form**: Form 5A (Monthly/Quarterly) & Form 5 (Annual Return)
- **Filing Frequency**: Monthly (if monthly tax ≥ ₹5,000) or Quarterly (if tax < ₹5,000); due within 20 days of period end.
- **Submission Method**: Direct online web form entry on `https://pt.kar.nic.in`.

---

### Tamil Nadu (Half-Yearly Return)
- **Official Portal**: Local Municipal Body / GCC Portal (e.g., [Greater Chennai Corporation](https://www.chennaicorporation.gov.in))
- **Registration**: **PTNAN** (Professional Tax New Account Number)
- **Return Form**: Form 1 / Half-Yearly Return
- **Filing Frequency**: Half-Yearly (First Half: Apr–Sep due Oct 31 / Sep 30; Second Half: Oct–Mar due Mar 31 / Apr 30)
- **Submission Method**: Direct online self-assessment entry on local municipal corporation website.

---

## 2. TECLA PAY Statutory Export Structure (`.xlsx`)

Because only Maharashtra uses a `.txt` file generated via macro utility while other states require online web portal entry, TECLA PAY provides a **State-Wise Filing Helper & Reconciliation Export (.xlsx)** containing 2 sheets:

### Sheet 1: State PT Summary
- **Columns**: `State` | `PT Reg / TIN No` | `Wage Month` | `Employee Count` | `Total Gross Wages (₹)` | `Total PT Deducted (₹)`
- **Purpose**: Gives aggregate slab counts and total tax for quick web entry into state tax portals.

### Sheet 2: Employee PT Register
- **Columns**: `State` | `PT Reg No` | `Wage Month` | `Employee Code` | `Employee Name` | `Gender` | `Branch Location` | `Gross Salary (₹)` | `PT Amount (₹)`
- **Purpose**: Complete audit register extracted strictly from locked payroll run items.
