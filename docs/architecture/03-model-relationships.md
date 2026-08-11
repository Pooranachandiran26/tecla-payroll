# Eloquent Model Relationships & Scoping Architecture

## Overview

To guarantee automatic tenant data isolation across the entire application, every business entity model will incorporate a global Eloquent scope via a unified `BelongsToCompany` trait. This document details the trait design, global scope mechanics, and updated Eloquent relationships.

---

## 1. `BelongsToCompany` Trait & Global `CompanyScope` Design

### `CompanyScope.php` (Global Scope)

```php
namespace App\Scopes;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Scope;
use Illuminate\Support\Facades\App;

class CompanyScope implements Scope
{
    public function apply(Builder $builder, Model $model): void
    {
        // Skip global scope in console commands, migrations, or seeding unless company context is explicit
        if (App::runningInConsole() && !app()->bound('tenant.company_id')) {
            return;
        }

        $companyId = app()->bound('tenant.company_id') 
            ? app('tenant.company_id') 
            : auth()->user()?->currentCompanyId();

        if ($companyId !== null) {
            $builder->where($model->getTable() . '.company_id', '=', $companyId);
        }
    }
}
```

### `BelongsToCompany.php` (Model Trait)

```php
namespace App\Traits;

use App\Models\Company;
use App\Scopes\CompanyScope;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

trait BelongsToCompany
{
    public static function bootBelongsToCompany(): void
    {
        static::addGlobalScope(new CompanyScope());

        static::creating(function ($model) {
            if (empty($model->company_id)) {
                $companyId = app()->bound('tenant.company_id') 
                    ? app('tenant.company_id') 
                    : auth()->user()?->currentCompanyId();
                    
                if ($companyId) {
                    $model->company_id = $companyId;
                }
            }
        });
    }

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class, 'company_id');
    }
}
```

---

## 2. Model Audit & Updated Relationships

Below is the exhaustive list of Eloquent models, their trait requirements, and updated relationships:

### Core Models

#### `Company` (New Master Model)
* **Trait**: None (Master Entity)
* **Relationships**:
  - `hasMany(User::class)`
  - `hasMany(Client::class)`
  - `hasMany(Employee::class)`
  - `hasMany(PayrollRun::class)`
  - `hasMany(Invoice::class)`
  - `hasMany(AttendanceRecord::class)`
  - `hasMany(LeaveRequest::class)`

#### `User`
* **Trait**: `BelongsToCompany` (with `withoutGlobalScope` allowed for Super Admin authentication)
* **Relationships**:
  - `belongsTo(Company::class)`
  - `belongsToMany(Company::class, 'company_user')`
  - `belongsTo(Employee::class)`
  - `belongsTo(Client::class)`

#### `Client`
* **Trait**: `BelongsToCompany`
* **Relationships**:
  - `belongsTo(Company::class)`
  - `hasMany(ClientBranch::class)`
  - `hasMany(ClientContact::class)`
  - `hasMany(ClientDocument::class)`
  - `hasMany(Employee::class)`
  - `hasMany(PayrollRun::class)`
  - `hasMany(Invoice::class)`

#### `Employee`
* **Trait**: `BelongsToCompany`
* **Relationships**:
  - `belongsTo(Company::class)`
  - `belongsTo(Client::class)`
  - `belongsTo(ClientBranch::class)`
  - `hasOne(User::class)`
  - `hasMany(EmployeeDocument::class)`
  - `hasMany(AttendanceRecord::class)`
  - `hasMany(LeaveRequest::class)`
  - `hasMany(EmployeeLeaveBalance::class)`
  - `hasMany(EmployeeLoan::class)`
  - `hasMany(SalaryRevision::class)`
  - `hasMany(PayrollRunItem::class)`

---

### Module Specific Models

| Model | Trait `BelongsToCompany` | Direct `company_id` | Key Relationships |
| :--- | :--- | :--- | :--- |
| `AttendanceRecord` | Yes | Yes | `belongsTo(Company)`, `belongsTo(Employee)`, `belongsTo(Client)` |
| `AttendanceCorrectionRequest` | Yes | Yes | `belongsTo(Company)`, `belongsTo(Employee)` |
| `AttendanceUploadBatch` | Yes | Yes | `belongsTo(Company)`, `belongsTo(Client)` |
| `LeaveRequest` | Yes | Yes | `belongsTo(Company)`, `belongsTo(Employee)` |
| `EmployeeLeaveBalance` | Yes | Yes | `belongsTo(Company)`, `belongsTo(Employee)`, `belongsTo(ClientLeavePolicy)` |
| `ClientLeavePolicy` | Yes | Yes | `belongsTo(Company)`, `belongsTo(Client)` |
| `PayrollRun` | Yes | Yes | `belongsTo(Company)`, `belongsTo(Client)`, `hasMany(PayrollRunItem)` |
| `PayrollRunItem` | Yes | Yes | `belongsTo(Company)`, `belongsTo(PayrollRun)`, `belongsTo(Employee)` |
| `SalaryRevision` | Yes | Yes | `belongsTo(Company)`, `belongsTo(Employee)` |
| `Invoice` | Yes | Yes | `belongsTo(Company)`, `belongsTo(Client)`, `hasMany(InvoiceLineItem)` |
| `InvoiceLineItem` | Yes | Yes | `belongsTo(Company)`, `belongsTo(Invoice)` |
| `EmployeeLoan` | Yes | Yes | `belongsTo(Company)`, `belongsTo(Employee)`, `hasMany(EmployeeLoanRepayment)` |
| `EmployeeLoanRepayment` | Yes | Yes | `belongsTo(Company)`, `belongsTo(EmployeeLoan)` |
| `EmployeeTaxDeclaration` | Yes | Yes | `belongsTo(Company)`, `belongsTo(Employee)` |
| `EmployeeExit` | Yes | Yes | `belongsTo(Company)`, `belongsTo(Employee)` |
| `PfEcrBatch` | Yes | Yes | `belongsTo(Company)`, `belongsTo(Client)` |
| `EsiMonthlyBatch` | Yes | Yes | `belongsTo(Company)`, `belongsTo(Client)` |
| `PtChallanBatch` | Yes | Yes | `belongsTo(Company)`, `belongsTo(Client)` |
| `Gstr1Batch` | Yes | Yes | `belongsTo(Company)`, `belongsTo(Client)` |
| `Tds24qBatch` | Yes | Yes | `belongsTo(Company)`, `belongsTo(Client)` |
| `TdsChallan` | Yes | Yes | `belongsTo(Company)`, `belongsTo(Client)` |
| `ClientAuditPackBatch` | Yes | Yes | `belongsTo(Company)`, `belongsTo(Client)` |
| `ComplianceFiling` | Yes | Yes | `belongsTo(Company)`, `belongsTo(Client)` |
| `BankChangeRequest` | Yes | Yes | `belongsTo(Company)`, `belongsTo(Employee)` |
| `EmployeeQuery` | Yes | Yes | `belongsTo(Company)`, `belongsTo(Employee)` |
| `AuditLog` | Yes | Yes | `belongsTo(Company)`, `belongsTo(User)` |

---

## 3. Disabling Global Scopes for Admin Workflows

In scenarios where Super Admin requires cross-company reporting or data backfill tools, global scoping can be explicitly bypassed using Eloquent's `withoutGlobalScope`:

```php
// Cross-company query for Super Admin dashboard
$allSystemEmployeesCount = Employee::withoutGlobalScope(CompanyScope::class)->count();
```
