# ESI Monthly Contribution File — Government Specification

## 1. Official Government Source & Context
- **Portal**: Employees' State Insurance Corporation (ESIC) Employer Portal
- **Module**: Monthly Contribution Filing (`File Monthly Contributions`)
- **Template Name**: Sample MC Excel Template (`.xls`)
- **Filing Frequency**: Monthly, due by the 15th of the following month
- **Scope**: Single file containing all ESI-applicable insured persons (IPs) for the contribution period.

---

## 2. File Format Specification

| Parameter | Government Specification | TECLA PAY Implementation |
|---|---|---|
| **File Type** | Microsoft Excel 97-2003 Binary Format (`.xls`) | Generated using `PhpOffice\PhpSpreadsheet\Writer\Xls` |
| **Header Row** | No Header Row (Data begins on Row 1) | Data begins on Row 1, Row 1 = First Employee |
| **Number of Columns** | Exactly 6 Columns (A through F) | Constant `COLUMN_COUNT = 6` |
| **Encoding / Text Formatting** | All text cells stored as String/Text format | `setCellValueExplicit(..., DataType::TYPE_STRING)` used for IP numbers, reason codes, and dates |

---

## 3. Required Field Details (Columns A–F)

### Column A: IP Number (Insurance Person Number)
- **Field Name**: IP Number
- **Data Type**: String (10-digit numeric)
- **Max Length**: 10 digits
- **Mandatory**: Yes
- **Rules**: Explicitly preserved as text to retain leading zeroes and prevent Excel scientific notation formatting (e.g. `3123456789`).

### Column B: IP Name (Employee Name)
- **Field Name**: IP Name
- **Data Type**: String (Alphabets and spaces)
- **Max Length**: Standard text length (up to 100 characters)
- **Mandatory**: Yes
- **Rules**: Employee name as per ESIC registration records.

### Column C: No. of Days (Paid/Payable Days)
- **Field Name**: No. of Days
- **Data Type**: Integer (Whole number)
- **Mandatory**: Yes
- **Rules**: Number of days for which wages were paid or payable during the wage month. Rounded up to the nearest integer.

### Column D: Total Monthly Wages (Gross ESI Wages)
- **Field Name**: Total Monthly Wages
- **Data Type**: Decimal / Numeric (2 decimal places)
- **Mandatory**: Yes
- **Rules**: Total gross earnings for the month applicable for ESI calculation.

### Column E: Reason Code (Zero Working Days Reason)
- **Field Name**: Reason Code
- **Data Type**: String / Numeric Code
- **Mandatory**: Optional when No. of Days > 0 (left blank/empty); mandatory if No. of Days = 0.
- **Valid Codes**:
  - `0` / Empty: Without reason (normal working days)
  - `1`: On leave
  - `2`: Left service
  - `3`: Retired
  - `4`: Out of coverage
  - `5`: Expired
  - `6`: Non-implemented area
  - `7`: Compliance by immediate employer
  - `8`: Suspension of work
  - `9`: Strike / Lockout
  - `10`: Retrenchment
  - `11`: No work
  - `12`: Does not belong to this employer
  - `13`: Duplicate IP

### Column F: Last Working Day (Exit Date)
- **Field Name**: Last Working Day
- **Data Type**: Date String (`DD-MM-YYYY`)
- **Mandatory**: Mandatory if employee exited during the contribution month; left blank otherwise.
- **Rules**: Date must fall within the contribution month.

---

## 4. Submission & Portal Guidelines
1. Log into the ESIC Employer Portal.
2. Navigate to `Monthly Contribution` -> `File Monthly Contributions`.
3. Select the applicable Wage Month and Year.
4. Upload the generated `.xls` file.
5. Review the validation summary on screen and proceed to Challan generation.
