# Provident Fund (PF) ECR - Deployment & Move Guide (Local → Production)

**Project**: TECLA PAY  
**Feature**: Official EPFO Provident Fund ECR Generation  
**Last Updated**: 2026-08-10  

---

## 1. PRE-DEPLOYMENT CHECKLIST

Before deploying from Local/Development to Staging or Production:

- [ ] Ensure database backup of production database is completed.
- [ ] Confirm all feature tests pass locally (`php artisan test --filter=PfEcrTest`).
- [ ] Verify node assets build cleanly without warnings (`npm run build`).
- [ ] Ensure PHP version is $\ge 8.2$ with `pdo_mysql` and standard file system permissions enabled.

---

## 2. FILE MOVE MANIFEST

Deploy **ONLY** the following files from your local repository to production. **DO NOT copy the entire codebase blindly.**

### A. Database Migrations
```
database/migrations/2026_08_10_133000_add_pf_member_id_to_employees_table.php
database/migrations/2026_08_10_133500_create_pf_ecr_batches_table.php
```

### B. Backend Files (App)
```
app/Models/PfEcrBatch.php
app/Models/Employee.php (Modified - git diff inspect fillable)
app/Services/PfEcrGeneratorService.php
app/Http/Controllers/PfEcrController.php
routes/web.php (Modified - git diff inspect routes)
```

### C. Frontend Files
```
resources/js/Pages/Compliance/ComplianceReports.jsx (Modified)
```

### D. Automated Tests
```
tests/Feature/PfEcrTest.php
```

### E. Documentation
```
docs/PF_ECR/*
```

---

## 3. DEPLOYMENT EXECUTION STEPS

Follow these exact commands on the server:

### Step 1: Copy Files
Transfer the exact files listed in Section 2 above to the production server via Git, deployment script, or CI/CD pipeline.

### Step 2: Execute Database Migrations
Run the artisan migration command to create the `pf_ecr_batches` table and update the `employees` table schema:
```bash
php artisan migrate --force
```

### Step 3: Verify Storage Directory Permissions
Ensure Laravel storage directory exists and has write permissions for the web server user (`www-data` or `nginx`):
```bash
mkdir -p storage/app/pf_ecr
chmod -R 775 storage/app/pf_ecr
```

### Step 4: Build Production Assets
Run NPM build to compile React assets:
```bash
npm run build
```

### Step 5: Clear Laravel Caches
Clear route, view, and application cache to register new routes and models:
```bash
php artisan route:clear
php artisan view:clear
php artisan config:clear
php artisan cache:clear
```

---

## 4. POST-DEPLOYMENT VERIFICATION (SMOKE TEST)

1. Log into TECLA PAY as an Admin or Manager user.
2. Navigate to **Statutory Compliance Center** (`/compliance`).
3. Locate the **Provident Fund ECR** card under "Generate Reports & Returns".
4. Click **Generate ECR (.txt)**.
5. In the modal, select a client and an approved/locked payroll run.
6. Click **Preview ECR**.
7. Verify that employee count, EPF wages, EE EPF share, ER EPF share (`employer_epf`), and EPS share display accurately.
8. Click **Generate & Download ECR (.txt)**.
9. Inspect the downloaded `.txt` file:
   - Ensure fields are separated by `#~#`.
   - Ensure monetary amounts are whole integers.
   - Ensure dates are formatted as `dd/mm/yyyy`.
   - Ensure lines end with standard CRLF.
10. Navigate to the **Payroll** module and open a payslip to confirm that existing payroll processing, calculations, and payslip generation remain 100% unaffected.
