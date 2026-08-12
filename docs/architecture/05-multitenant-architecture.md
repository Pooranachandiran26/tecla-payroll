# Multi-Tenant Architecture & System Isolation Design

## System Architecture Diagram

```text
                                  ┌─────────────────────────┐
                                  │       SUPER ADMIN       │
                                  └────────────┬────────────┘
                                               │
                                      Multiple Companies
                                               │
                         ┌─────────────────────┼─────────────────────┐
                         │                     │                     │
                ┌────────▼────────┐   ┌────────▼────────┐   ┌────────▼────────┐
                │    Company A    │   │    Company B    │   │    Company C    │
                └────────┬────────┘   └────────┬────────┘   └────────┬────────┘
                         │                     │                     │
                     company_id            company_id            company_id
                         │                     │                     │
                ┌────────┴────────┐   ┌────────┴────────┐   ┌────────┴────────┐
                │  Employees      │   │  Employees      │   │  Employees      │
                │  Payroll        │   │  Payroll        │   │  Payroll        │
                │  Attendance     │   │  Attendance     │   │  Attendance     │
                │  Statutory      │   │  Statutory      │   │  Statutory      │
                │  Invoices       │   │  Invoices       │   │  Invoices       │
                └─────────────────┘   └─────────────────┘   └─────────────────┘
```

---

## Architecture Components

### 1. Tenant Isolation Strategy
* **Pattern**: Single Database, Column-Based Multi-Tenancy (Row-Level Security via `company_id`).
* **Enforcement Layer**: Automated at database query level using Eloquent `CompanyScope` and validated at request entry level via `EnsureCompanyContext` middleware.

---

### 2. Core Entities Definition

* **Super Admin**: System administrator with global platform privileges. Can switch between company contexts, onboard companies, alter global system settings, and inspect system-wide audit logs.
* **Company**: The top-level tenant entity (`companies` table). Holds company branding, registration details, legal status, statutory identifiers (PAN, TAN, PF code, ESI code), and billing configuration.
* **Company Admin**: Tenant administrator bound to one or more `company_id`(s). Possesses full control over employee records, payroll execution, attendance approvals, and company settings.
* **`company_id`**: Foreign key present on every business database table referencing `companies(id)`. Serves as the primary data partitioning key.

---

### 3. Middleware Context Pipeline (`EnsureCompanyContext`)

Every HTTP request passes through tenant context resolution middleware:

```php
namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class EnsureCompanyContext
{
    public function handle(Request $request, Closure $next)
    {
        $user = $request->user();

        if (!$user) {
            return $next($request);
        }

        $companyId = null;

        // 1. Header takes precedence for API calls
        if ($request->hasHeader('X-Company-ID')) {
            $headerCompanyId = (int) $request->header('X-Company-ID');
            if ($user->belongsToCompany($headerCompanyId)) {
                $companyId = $headerCompanyId;
            }
        }

        // 2. Session value for Super Admin / Multi-Company Admin web switching
        if (!$companyId && session()->has('active_company_id')) {
            $sessionCompanyId = (int) session('active_company_id');
            if ($user->belongsToCompany($sessionCompanyId)) {
                $companyId = $sessionCompanyId;
            }
        }

        // 3. Default fallback to user's direct company_id
        if (!$companyId) {
            $companyId = $user->company_id;
        }

        // Bind company context to application container
        if ($companyId) {
            app()->instance('tenant.company_id', (int) $companyId);
            session(['active_company_id' => (int) $companyId]);
        }

        return $next($request);
    }
}
```

---

### 4. Company Switching Mechanism for Super Admin & Multi-Company Admins

Super Admins and managers assigned to multiple companies can switch their active context dynamically.

```text
POST /admin/switch-company
Payload: { "company_id": 42 }
```

**Controller Handler Logic**:

```php
public function switchCompany(Request $request)
{
    $request->validate(['company_id' => 'required|exists:companies,id']);
    
    $user = $request->user();
    $targetCompanyId = (int) $request->company_id;

    if (!$user->belongsToCompany($targetCompanyId)) {
        abort(403, 'Unauthorized company context switch attempt.');
    }

    session(['active_company_id' => $targetCompanyId]);

    return back()->with('success', 'Switched to company: ' . Company::find($targetCompanyId)->name);
}
```

---

### 5. API Isolation & Route Protection

All tenant-sensitive API routes are grouped under tenant context middleware:

```php
Route::middleware(['auth:sanctum', EnsureCompanyContext::class])->prefix('v1')->group(function () {
    Route::get('/employees', [EmployeeController::class, 'index']);
    Route::post('/payroll/run', [PayrollController::class, 'process']);
    Route::get('/reports/statutory', [ComplianceController::class, 'report']);
});
```

---

### 6. Queue & Asynchronous Job Isolation

Background jobs (e.g., PDF generation, payroll calculation, bulk import, Statutory filing generation) must execute within their designated company context.

#### Strategy: Store `company_id` in Job Payload

```php
namespace App\Jobs;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class ProcessPayrollBatchJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $companyId;
    public int $payrollRunId;

    public function __construct(int $companyId, int $payrollRunId)
    {
        $this->companyId = $companyId;
        $this->payrollRunId = $payrollRunId;
    }

    public function handle(): void
    {
        // Restore company context inside worker process
        app()->instance('tenant.company_id', $this->companyId);

        // Execute payroll calculator safely in company context
        app(MonthlyPayrollCalculator::class)->calculate($this->payrollRunId);
    }
}
```
