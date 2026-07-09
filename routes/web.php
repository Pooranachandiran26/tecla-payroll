<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use App\Http\Controllers\ClientController;
use App\Http\Controllers\ClientPortalController;
use App\Http\Controllers\EmployeeController;
use App\Http\Controllers\BulkUploadController;
use App\Http\Controllers\SalaryRevisionController;
use App\Http\Controllers\SettingsController;
use App\Http\Controllers\Auth\LoginController;
use App\Http\Controllers\Auth\InvitationController;
use App\Http\Controllers\Auth\PasswordResetController;
use App\Http\Controllers\Auth\ForcePasswordChangeController;
use App\Http\Controllers\Admin\UserController;
use App\Http\Controllers\SessionController;

// -----------------------------------------------------------------------
// GUEST ROUTES (Unauthenticated)
// -----------------------------------------------------------------------
Route::middleware('guest')->group(function () {
    Route::get('/', fn() => redirect('/login'));
    Route::get('/login', [LoginController::class, 'showLogin'])->name('login');
    Route::post('/login', [LoginController::class, 'login'])->middleware('throttle:5,1');
    Route::get('/login/verify-otp', [LoginController::class, 'showVerifyOtp']);
    Route::post('/login/verify-otp', [LoginController::class, 'verifyOtp'])->middleware('throttle:5,1');
    Route::post('/login/resend-otp', [LoginController::class, 'resendOtp'])->middleware('throttle:1,1');
    
    Route::get('/invitation/{token}', [InvitationController::class, 'show']);
    Route::post('/invitation/{token}/complete', [InvitationController::class, 'complete']);
    
    Route::get('/forgot-password', [PasswordResetController::class, 'showForgotPassword']);
    Route::post('/forgot-password', [PasswordResetController::class, 'sendResetOtp'])->middleware('throttle:3,15');
    Route::get('/reset-password/verify-otp', [PasswordResetController::class, 'showVerifyResetOtp']);
    Route::post('/reset-password/verify-otp', [PasswordResetController::class, 'verifyResetOtp']);
    Route::get('/reset-password/new', [PasswordResetController::class, 'showNewPassword']);
    Route::post('/reset-password/new', [PasswordResetController::class, 'resetPassword']);
});

// -----------------------------------------------------------------------
// AUTHENTICATED ROUTES (Any Role)
// -----------------------------------------------------------------------
Route::middleware('auth')->group(function () {
    // Authenticated Home Redirect
    Route::get('/', function () {
        $role = Auth::user()->role;
        if (in_array($role, ['admin', 'manager'])) return redirect('/dashboard');
        if ($role === 'client') return redirect('/client/dashboard');
        return redirect('/employee/dashboard');
    });

    Route::post('/logout', [LoginController::class, 'logout'])->name('logout');
    
    // Force Password Change (Bypasses fresh-password middleware)
    Route::get('/force-password-change', [ForcePasswordChangeController::class, 'show']);
    Route::post('/force-password-change', [ForcePasswordChangeController::class, 'update']);
    
    Route::get('/account/sessions', [SessionController::class, 'ownSessions']);
    Route::delete('/account/sessions/{id}', [SessionController::class, 'revokeOwn']);

    // -------------------------------------------------------------------
    // FULLY ACTIVE ROUTES (Must have fresh password)
    // -------------------------------------------------------------------
    Route::middleware('fresh-password')->group(function () {
        
        // ADMIN & MANAGER
        Route::middleware('role:admin,manager')->group(function () {
            Route::get('/dashboard', fn() => Inertia::render('Dashboard/Dashboard'));
            Route::get('/quick-access', fn() => Inertia::render('Dashboard/QuickAccess'));

            Route::post('/export/employees', [\App\Http\Controllers\ExportController::class, 'exportEmployeeData']);

            // Clients
            Route::get('/clients', [ClientController::class,'index'])->middleware('can:viewAny,App\Models\Client')->name('clients.index');
            Route::get('/clients/create', [ClientController::class,'create'])->middleware('can:create,App\Models\Client');
            Route::post('/clients', [ClientController::class,'store']);
            Route::get('/clients/{client}', [ClientController::class,'show'])->middleware('can:view,client')->name('clients.show');
            Route::get('/clients/{client}/statutory-defaults', [ClientController::class, 'statutoryDefaults'])->middleware('can:view,client')->name('clients.statutoryDefaults');
            Route::get('/clients/{client}/edit', [ClientController::class,'edit'])->middleware('can:update,client')->name('clients.edit');
            Route::put('/clients/{client}', [ClientController::class,'update'])->middleware('can:update,client');
            Route::delete('/clients/{client}', [ClientController::class,'destroy'])->middleware('can:delete,client')->name('clients.destroy');
            Route::post('/clients/{client}/deactivate', [ClientController::class,'deactivate'])->middleware('can:update,client')->name('clients.deactivate');
            Route::post('/clients/{id}/restore', [ClientController::class,'restore'])->name('clients.restore');
            Route::post('/clients/{client}/documents', [ClientController::class, 'uploadDocument'])->middleware('can:update,client');
            Route::put('/clients/{client}/documents/{document}/verify', [ClientController::class, 'verifyDocument']);
            Route::get('/clients/{client}/documents/{document}/download', [ClientController::class, 'downloadDocument']);

            // Employees
            Route::post('/employees/calculate-preview', [EmployeeController::class, 'calculatePreview']);
            Route::get('/employees', [EmployeeController::class, 'index'])->name('employees.index');
            Route::post('/employees', [EmployeeController::class, 'store'])->name('employees.store');
            Route::get('/employees/create', function() {
                $clients = \App\Models\Client::where('status', 'active')->select('id', 'company_name')->get();
                return Inertia::render('Employees/EmployeeForm', ['clients' => $clients]);
            });
            Route::get('/employees/bulk-upload', fn() => Inertia::render('Employees/BulkUpload'));
            Route::post('/employees/bulk-upload/validate', [BulkUploadController::class, 'validateUpload'])->name('employees.bulk-upload.validate');
            Route::post('/employees/bulk-upload/execute', [BulkUploadController::class, 'executeImport'])->name('employees.bulk-upload.execute');
            Route::get('/employees/salary-bulk-update', fn() => Inertia::render('Employees/SalaryBulkUpdate'));
            Route::get('/employees/{id}', [EmployeeController::class, 'show'])->name('employees.show');
            Route::get('/employees/{id}/edit', [EmployeeController::class, 'edit'])->name('employees.edit');
            Route::put('/employees/{id}', [EmployeeController::class, 'update'])->name('employees.update');
            Route::post('/employees/{id}/documents', [EmployeeController::class, 'storeDocument'])->name('employees.documents.store');
            Route::put('/employees/{id}/documents/{docId}/verify', [EmployeeController::class, 'verifyDocument'])->name('employees.documents.verify');
            Route::get('/employees/{id}/exit', [\App\Http\Controllers\EmployeeExitController::class, 'show'])->name('employees.exit.show');
            Route::post('/employees/{id}/exit/preview-settlement', [\App\Http\Controllers\EmployeeExitController::class, 'previewSettlement']);
            Route::post('/employees/{id}/exit/stage/{stage}', [\App\Http\Controllers\EmployeeExitController::class, 'storeStage']);
            Route::post('/employees/{id}/exit/approve', [\App\Http\Controllers\EmployeeExitController::class, 'approve']);
            Route::post('/employees/{id}/exit/confirm', [\App\Http\Controllers\EmployeeExitController::class, 'confirm']);
            
            // Salary Revision
            Route::get('/employees/{id}/salary-revision', [SalaryRevisionController::class, 'create'])->name('employees.salary-revision.create');
            Route::post('/employees/{id}/salary-revision', [SalaryRevisionController::class, 'store'])->name('employees.salary-revision.store');
            Route::post('/employees/{id}/salary-revision/{revisionId}/approve', [SalaryRevisionController::class, 'approve'])->name('employees.salary-revision.approve');
            
            Route::get('/bank-change-requests', fn() => Inertia::render('Employees/BankChangeRequests'));
            Route::get('/leave-approval', fn() => Inertia::render('Employees/LeaveApprovalQueue'));

            // Payroll & Invoicing & Reports
            Route::get('/payroll/live-monitor', fn() => Inertia::render('Payroll/LiveAttendanceMonitor'));
            Route::get('/payroll/attendance-upload', fn() => Inertia::render('Payroll/AttendanceUpload'));
            Route::get('/payroll/attendance-review', fn() => Inertia::render('Payroll/AttendanceReview'));
            Route::get('/payroll/processing', fn() => Inertia::render('Payroll/PayrollProcessing'));
            Route::get('/payroll/approval', fn() => Inertia::render('Payroll/PayrollApproval'));
            Route::get('/payroll/payslips', fn() => Inertia::render('Payroll/Payslip'));
            Route::get('/payroll/reconciliation', fn() => Inertia::render('Payroll/PayrollReconciliation'));
            Route::get('/invoices', fn() => Inertia::render('Invoicing/InvoicesList'));
            Route::get('/invoices/generate', fn() => Inertia::render('Invoicing/InvoiceGenerate'));
            Route::get('/compliance', fn() => Inertia::render('Compliance/ComplianceReports'));
            Route::get('/reports', fn() => Inertia::render('Reports/ReportsAnalytics'));

        });

        // ADMIN ONLY
        Route::middleware('role:admin')->group(function () {
            Route::get('/admin/activity-log', [\App\Http\Controllers\Admin\ActivityLogController::class, 'index']);
            Route::get('/admin/users', [UserController::class, 'index']);
            Route::post('/admin/users', [UserController::class, 'store']);
            Route::get('/admin/settings', fn() => Inertia::render('Admin/Settings'));
            
            Route::apiResource('admin/watchers', \App\Http\Controllers\NotificationWatcherController::class)->except(['show']);
            
            Route::get('/admin/settings/company', [SettingsController::class, 'getCompanyProfile']);
            Route::put('/admin/settings/company', [SettingsController::class, 'updateCompanyProfile']);
            
            Route::get('/admin/settings/pt-slabs', [SettingsController::class, 'getPtSlabs']);
            
            Route::get('/admin/settings/payroll', [SettingsController::class, 'getPayrollConfig']);
            Route::put('/admin/settings/payroll', [SettingsController::class, 'updatePayrollConfig']);
            
            Route::get('/admin/settings/auth-security', [SettingsController::class, 'getAuthSecurity']);
            Route::put('/admin/settings/auth-security', [SettingsController::class, 'updateAuthSecurity']);
            
            Route::get('/admin/settings/email', [SettingsController::class, 'getEmailSettings']);
            Route::put('/admin/settings/email', [SettingsController::class, 'updateEmailSettings']);
            Route::post('/admin/settings/email/test', [SettingsController::class, 'testEmailSettings'])->middleware('throttle:3,1');
            
            Route::get('/admin/settings/branding', [SettingsController::class, 'getBranding']);
            Route::post('/admin/settings/branding', [SettingsController::class, 'updateBranding']);
            
            Route::get('/admin/settings/localization', [SettingsController::class, 'getLocalization']);
            Route::put('/admin/settings/localization', [SettingsController::class, 'updateLocalization']);
            
            Route::get('/admin/settings/file-upload-policy', [SettingsController::class, 'getFileUploadPolicy']);
            Route::put('/admin/settings/file-upload-policy', [SettingsController::class, 'updateFileUploadPolicy']);
            
            Route::get('/admin/sessions', [SessionController::class, 'allSessions']);
            Route::delete('/admin/sessions/{id}', [SessionController::class, 'revokeAny']);
            Route::post('/admin/sessions/bulk-revoke', [SessionController::class, 'bulkRevoke']);
        });

        // CLIENT ONLY
        Route::middleware('role:client')->group(function () {
            Route::get('/client/dashboard', fn() => Inertia::render('ClientPortal/ClientDashboard'));
            Route::get('/client/employees', fn() => Inertia::render('ClientPortal/ClientCandidates'));
            Route::get('/client/attendance', fn() => Inertia::render('ClientPortal/ClientAttendanceApproval'));
            Route::get('/client/invoices', fn() => Inertia::render('ClientPortal/ClientInvoices'));
            Route::get('/client/profile', [ClientPortalController::class,'show']);
        });

        // EMPLOYEE ONLY
        Route::middleware('role:employee')->group(function () {
            Route::get('/employee/dashboard', fn() => Inertia::render('EmployeePortal/EmployeeDashboard'));
            Route::get('/employee/attendance', fn() => Inertia::render('EmployeePortal/EmployeeAttendance'));
            Route::get('/employee/leave', fn() => Inertia::render('EmployeePortal/LeaveRequest'));
            Route::get('/employee/payslips', fn() => Inertia::render('EmployeePortal/EmployeePayslips'));
            Route::get('/employee/profile', fn() => Inertia::render('EmployeePortal/EmployeeProfile'));
        });
    });
});
