# ESI Monthly Contribution File — Test Cases

## Automated Test Matrix (`tests/Feature/EsiMonthlyContributionTest.php`)

| Test # | Test Case Name | Objective | Result |
|---|---|---|---|
| 1 | `test_draft_payroll_run_is_blocked_from_esi_generation` | Verify that unapproved/draft payroll runs cannot generate ESI file | PASS |
| 2 | `test_approved_but_not_locked_payroll_run_is_blocked_from_esi_generation` | Verify that approved (unlocked) runs are blocked | PASS |
| 3 | `test_locked_run_with_no_esi_eligible_employees_is_blocked` | Verify validation error when no ESI-applicable employees exist | PASS |
| 4 | `test_locked_run_generates_xls_file_with_exactly_six_columns_and_no_header` | Verify `.xls` generation with 6 columns starting directly at Row 1 | PASS |
| 5 | `test_non_esi_applicable_employee_is_excluded_from_the_file` | Verify that `esi_applicable=false` employees are filtered out | PASS |
| 6 | `test_excluded_payroll_items_are_not_included_in_the_file` | Verify `is_excluded=true` payroll run items are excluded | PASS |
| 7 | `test_download_endpoint_streams_the_generated_file` | Verify file streaming and batch status transition to `downloaded` | PASS |
| 8 | `test_employee_role_cannot_access_esi_monthly_routes` | Verify security role gating for unauthorized users | PASS |
| 9 | `test_regenerating_for_the_same_payroll_run_updates_the_existing_batch_not_a_duplicate` | Verify in-place update for re-runs | PASS |

---

## Manual Verification Matrix

| Scenario | Steps | Expected Outcome | Status |
|---|---|---|---|
| UI Modal Open | Go to Compliance -> ESI -> Click `Generate ESI File` | Modal appears listing locked runs | Verified |
| Download .xls | Click `Generate & Download .xls` | Browser downloads `ESI_<Company>_<YYYYMM>.xls` | Verified |
| Excel Structure Check | Open downloaded file in Excel | Rows start on Row 1, exactly 6 columns (A-F), IP numbers formatted as strings | Verified |
