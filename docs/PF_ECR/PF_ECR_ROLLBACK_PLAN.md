# Provident Fund (PF) ECR - Rollback Plan

**Project**: TECLA PAY  
**Feature**: Official EPFO Provident Fund ECR Generation  
**Last Updated**: 2026-08-10  

---

## 1. PURPOSE & SAFETY GUARANTEE

This Rollback Plan documents how to safely revert the PF ECR feature in production without affecting pre-existing payroll data, approved/locked payroll runs, employee records, or payslips.

Because PF ECR was built strictly as a **read-only consumer** of `payroll_runs` and `payroll_run_items`, reverting code or dropping the tracking table has **ZERO RISK** to payroll integrity or financial records.

---

## 2. EMERGENCY QUICK DISABLE (FEATURE TOGGLE)

If a critical issue occurs on production, the feature can be safely hidden immediately without rolling back database migrations:

### Frontend Quick Disable
In `resources/js/Pages/Compliance/ComplianceReports.jsx`, set `report.disabled = true` on the Provident Fund ECR card or revert the card button to the disabled state. Recompile assets:
```bash
npm run build
```

---

## 3. FULL ROLLBACK STEPS

If a complete rollback is required:

### Step 1: Revert Database Migrations
Roll back the two PF ECR database migrations:
```bash
php artisan migrate:rollback --step=2
```
This will:
1. Drop the `pf_ecr_batches` table.
2. Remove `pf_member_id` and `member_relationship` columns from `employees`.

### Step 2: Remove New Files
Delete the newly introduced files:
```bash
rm -f database/migrations/2026_08_10_133000_add_pf_member_id_to_employees_table.php
rm -f database/migrations/2026_08_10_133500_create_pf_ecr_batches_table.php
rm -f app/Models/PfEcrBatch.php
rm -f app/Services/PfEcrGeneratorService.php
rm -f app/Http/Controllers/PfEcrController.php
rm -f tests/Feature/PfEcrTest.php
```

### Step 3: Revert Modified Files
Using Git, revert modified files to their previous commit state:
```bash
git checkout HEAD -- app/Models/Employee.php
git checkout HEAD -- routes/web.php
git checkout HEAD -- resources/js/Pages/Compliance/ComplianceReports.jsx
```

### Step 4: Recompile Assets & Clear Cache
```bash
npm run build
php artisan route:clear
php artisan view:clear
php artisan cache:clear
```

---

## 4. ROLLBACK VERIFICATION CHECKLIST

After executing rollback:
- [ ] Navigate to `/compliance` and verify the Compliance screen loads cleanly.
- [ ] Navigate to `/payroll/runs` and open an existing approved or locked payroll run.
- [ ] Verify that employee salary calculations, payslip PDF rendering, and client billing functions operate without errors.
- [ ] Verify database schema by running `php artisan migrate:status`.
