<?php

use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

// Auth
Route::get('/', fn() => Inertia::render('Auth/Login'));

// Dashboard
Route::get('/dashboard', fn() => Inertia::render('Dashboard/Dashboard'));
Route::get('/quick-access', fn() => Inertia::render('Dashboard/QuickAccess'));

use App\Http\Controllers\ClientController;
use App\Http\Controllers\ClientPortalController;

// Clients
Route::middleware(['auth','role:admin,manager'])->group(function () {
    Route::get('/clients', [ClientController::class,'index'])
        ->middleware('can:viewAny,App\Models\Client');
    Route::get('/clients/create', [ClientController::class,'create'])
        ->middleware('can:create,App\Models\Client');
    Route::post('/clients', [ClientController::class,'store']);
    Route::get('/clients/{client}', [ClientController::class,'show'])
        ->middleware('can:view,client');
    Route::put('/clients/{client}', [ClientController::class,'update'])
        ->middleware('can:update,client');
});

Route::middleware(['auth','role:client'])->group(function () {
    Route::get('/client/profile', [ClientPortalController::class,'show']);
});

// Employees
Route::post('/employees/calculate-preview', [\App\Http\Controllers\EmployeeController::class, 'calculatePreview']);
Route::get('/employees', fn() => Inertia::render('Employees/EmployeesList'));
Route::get('/employees/create', fn() => Inertia::render('Employees/EmployeeForm'));
Route::get('/employees/bulk-upload', fn() => Inertia::render('Employees/BulkUpload'));
Route::get('/employees/salary-bulk-update', fn() => Inertia::render('Employees/SalaryBulkUpdate'));
Route::get('/employees/{id}', fn() => Inertia::render('Employees/EmployeeDetail'));
Route::get('/employees/{id}/exit', fn() => Inertia::render('Employees/EmployeeExit'));
Route::get('/employees/{id}/salary-revision', fn() => Inertia::render('Employees/SalaryRevision'));
Route::get('/bank-change-requests', fn() => Inertia::render('Employees/BankChangeRequests'));
Route::get('/leave-approval', fn() => Inertia::render('Employees/LeaveApprovalQueue'));

// Payroll
Route::get('/payroll/live-monitor', fn() => Inertia::render('Payroll/LiveAttendanceMonitor'));
Route::get('/payroll/attendance-upload', fn() => Inertia::render('Payroll/AttendanceUpload'));
Route::get('/payroll/attendance-review', fn() => Inertia::render('Payroll/AttendanceReview'));
Route::get('/payroll/processing', fn() => Inertia::render('Payroll/PayrollProcessing'));
Route::get('/payroll/approval', fn() => Inertia::render('Payroll/PayrollApproval'));
Route::get('/payroll/payslips', fn() => Inertia::render('Payroll/Payslip'));
Route::get('/payroll/reconciliation', fn() => Inertia::render('Payroll/PayrollReconciliation'));

// Invoicing
Route::get('/invoices', fn() => Inertia::render('Invoicing/InvoicesList'));
Route::get('/invoices/generate', fn() => Inertia::render('Invoicing/InvoiceGenerate'));

// Compliance + Reports + Admin
Route::get('/compliance', fn() => Inertia::render('Compliance/ComplianceReports'));
Route::get('/reports', fn() => Inertia::render('Reports/ReportsAnalytics'));
Route::get('/admin/activity-log', fn() => Inertia::render('Admin/ActivityLog'));
Route::get('/admin/users', fn() => Inertia::render('Admin/UserManagement'));
Route::get('/admin/settings', fn() => Inertia::render('Admin/Settings'));

// Client Portal
Route::get('/client/dashboard', fn() => Inertia::render('ClientPortal/ClientDashboard'));
Route::get('/client/employees', fn() => Inertia::render('ClientPortal/ClientCandidates'));
Route::get('/client/attendance', fn() => Inertia::render('ClientPortal/ClientAttendanceApproval'));
Route::get('/client/invoices', fn() => Inertia::render('ClientPortal/ClientInvoices'));

// Employee Portal
Route::get('/employee/dashboard', fn() => Inertia::render('EmployeePortal/EmployeeDashboard'));
Route::get('/employee/attendance', fn() => Inertia::render('EmployeePortal/EmployeeAttendance'));
Route::get('/employee/leave', fn() => Inertia::render('EmployeePortal/LeaveRequest'));
Route::get('/employee/payslips', fn() => Inertia::render('EmployeePortal/EmployeePayslips'));
Route::get('/employee/profile', fn() => Inertia::render('EmployeePortal/EmployeeProfile'));
