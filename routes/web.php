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
use App\Http\Controllers\AttendanceUploadController;
use App\Http\Controllers\BankChangeRequestController;

// -----------------------------------------------------------------------
// GUEST ROUTES (Unauthenticated)
// -----------------------------------------------------------------------
Route::middleware('guest')->group(function () {
    Route::get('/', fn() => redirect('/login'));
    Route::get('/login', [LoginController::class, 'showLogin'])->name('login');
    Route::post('/login', [LoginController::class, 'login'])->middleware('throttle:5,1')->name('login.post');
    Route::get('/login/verify-otp', [LoginController::class, 'showVerifyOtp'])->name('login.verify.show');
    Route::post('/login/verify-otp', [LoginController::class, 'verifyOtp'])->middleware('throttle:5,1')->name('login.verify.post');
    Route::post('/login/resend-otp', [LoginController::class, 'resendOtp'])->middleware('throttle:1,1')->name('login.resend-otp');
    
    Route::get('/invitation/{token}', [InvitationController::class, 'show'])->name('invitation.show');
    Route::post('/invitation/{token}/complete', [InvitationController::class, 'complete'])->name('invitation.complete');
    
    Route::get('/forgot-password', [PasswordResetController::class, 'showForgotPassword'])->name('password.request');
    Route::post('/forgot-password', [PasswordResetController::class, 'sendResetOtp'])->middleware('throttle:3,15')->name('password.email');
    Route::get('/reset-password/verify-otp', [PasswordResetController::class, 'showVerifyResetOtp'])->name('password.reset.verify.show');
    Route::post('/reset-password/verify-otp', [PasswordResetController::class, 'verifyResetOtp'])->name('password.reset.verify.post');
    Route::get('/reset-password/new', [PasswordResetController::class, 'showNewPassword'])->name('password.reset.new.show');
    Route::post('/reset-password/new', [PasswordResetController::class, 'resetPassword'])->name('password.reset.new.post');
});

// -----------------------------------------------------------------------
// AUTHENTICATED ROUTES (Any Role)
// -----------------------------------------------------------------------
Route::middleware(['auth', 'active'])->group(function () {
    // Authenticated Home Redirect
    Route::get('/', function () {
        $role = Auth::user()->role;
        if (in_array($role, ['admin', 'manager'])) return redirect('/dashboard');
        if ($role === 'client') return redirect('/client/dashboard');
        return redirect('/employee/dashboard');
    });

    Route::post('/logout', [LoginController::class, 'logout'])->name('logout');
    
    // Force Password Change (Bypasses fresh-password middleware)
    Route::get('/force-password-change', [ForcePasswordChangeController::class, 'show'])->name('password.force-change.show');
    Route::post('/force-password-change', [ForcePasswordChangeController::class, 'update'])->name('password.force-change.post');
    
    Route::get('/account/sessions', [SessionController::class, 'ownSessions'])->name('account.sessions');
    Route::delete('/account/sessions/{id}', [SessionController::class, 'revokeOwn'])->name('account.sessions.destroy');

    // -------------------------------------------------------------------
    // FULLY ACTIVE ROUTES (Must have fresh password)
    // -------------------------------------------------------------------
    Route::middleware('fresh-password')->group(function () {
        
        // ADMIN & MANAGER
        Route::middleware('role:admin,manager')->group(function () {
            Route::get('/dashboard', fn() => Inertia::render('Dashboard/Dashboard'))->name('dashboard');
            Route::get('/quick-access', fn() => Inertia::render('Dashboard/QuickAccess'))->name('quick-access');

            Route::post('/export/employees', [\App\Http\Controllers\ExportController::class, 'exportEmployeeData'])->name('employees.export');

            // Clients
            Route::get('/clients', [ClientController::class,'index'])->middleware('can:viewAny,App\Models\Client')->name('clients.index');
            Route::get('/clients/create', [ClientController::class,'create'])->middleware('can:create,App\Models\Client')->name('clients.create');
            Route::get('/clients/check-unique', [ClientController::class, 'checkUnique'])->name('clients.check-unique');
            Route::post('/clients', [ClientController::class,'store'])->name('clients.store');
            Route::get('/clients/{client}', [ClientController::class,'show'])->middleware('can:view,client')->name('clients.show');
            Route::get('/clients/{client}/statutory-defaults', [ClientController::class, 'statutoryDefaults'])->middleware('can:view,client')->name('clients.statutoryDefaults');
            Route::get('/clients/{client}/active-employees', [ClientController::class, 'activeEmployees'])->middleware('can:view,client')->name('clients.activeEmployees');
            Route::get('/clients/{client}/edit', [ClientController::class,'edit'])->middleware('can:update,client')->name('clients.edit');
            Route::put('/clients/{client}', [ClientController::class,'update'])->middleware('can:update,client')->name('clients.update');
            Route::delete('/clients/{client}', [ClientController::class,'destroy'])->middleware('can:delete,client')->name('clients.destroy');
            Route::post('/clients/{client}/deactivate', [ClientController::class,'deactivate'])->middleware('can:update,client')->name('clients.deactivate');
            Route::post('/clients/{id}/restore', [ClientController::class,'restore'])->name('clients.restore');
            Route::post('/clients/{client}/documents', [ClientController::class, 'uploadDocument'])->middleware('can:update,client')->name('clients.documents.store');
            Route::put('/clients/{client}/documents/{document}/verify', [ClientController::class, 'verifyDocument'])->name('clients.documents.verify');
            Route::get('/clients/{client}/documents/{document}/download', [ClientController::class, 'downloadDocument'])->name('clients.documents.download');

            // Employees
            Route::get('/employees/check-unique', [EmployeeController::class, 'checkUnique'])->name('employees.check-unique');
            Route::post('/employees/calculate-preview', [EmployeeController::class, 'calculatePreview'])->name('employees.calculate-preview');
            Route::get('/employees', [EmployeeController::class, 'index'])->name('employees.index');
            Route::post('/employees', [EmployeeController::class, 'store'])->name('employees.store');
            Route::get('/employees/create', function() {
                $clients = \App\Models\Client::where('status', 'active')->select('id', 'company_name')->get();
                return Inertia::render('Employees/EmployeeForm', ['clients' => $clients]);
            })->name('employees.create');
            Route::get('/employees/bulk-upload', [BulkUploadController::class, 'showUploadForm'])->name('employees.bulk-upload');
            Route::get('/employees/bulk-upload/download-template', [BulkUploadController::class, 'downloadTemplate'])->name('employees.bulk-upload.download-template');
            Route::post('/employees/bulk-upload/validate', [BulkUploadController::class, 'validateUpload'])->name('employees.bulk-upload.validate');
            Route::post('/employees/bulk-upload/execute', [BulkUploadController::class, 'executeImport'])->name('employees.bulk-upload.execute');
            Route::get('/employees/salary-bulk-update', fn() => Inertia::render('Employees/SalaryBulkUpdate'))->name('employees.salary-bulk-update');
            Route::get('/employees/{id}', [EmployeeController::class, 'show'])->name('employees.show');
            Route::get('/employees/{id}/edit', [EmployeeController::class, 'edit'])->name('employees.edit');
            Route::put('/employees/{id}', [EmployeeController::class, 'update'])->name('employees.update');
            Route::delete('/employees/{id}', [EmployeeController::class, 'destroy'])->name('employees.destroy');
            Route::post('/employees/{id}/deactivate', [EmployeeController::class, 'deactivate'])->name('employees.deactivate');
            Route::post('/employees/{id}/activate', [EmployeeController::class, 'activate'])->name('employees.activate');
            Route::post('/employees/{id}/restore', [EmployeeController::class, 'restore'])->name('employees.restore');
            Route::post('/employees/{id}/resend-invitation', [EmployeeController::class, 'resendInvitation'])->name('employees.resend-invitation');
            Route::post('/employees/{id}/documents', [EmployeeController::class, 'storeDocument'])->name('employees.documents.store');
            Route::put('/employees/{id}/documents/{docId}/verify', [EmployeeController::class, 'verifyDocument'])->name('employees.documents.verify');
            Route::get('/employees/{id}/documents/{docId}/view', [EmployeeController::class, 'viewDocument'])->name('employees.documents.view');
            Route::get('/employees/{id}/exit', [\App\Http\Controllers\EmployeeExitController::class, 'show'])->name('employees.exit.show');
            Route::post('/employees/{id}/exit/preview-settlement', [\App\Http\Controllers\EmployeeExitController::class, 'previewSettlement'])->name('employees.exit.preview');
            Route::post('/employees/{id}/exit/stage/{stage}', [\App\Http\Controllers\EmployeeExitController::class, 'storeStage'])->name('employees.exit.stage');
            Route::post('/employees/{id}/exit/approve', [\App\Http\Controllers\EmployeeExitController::class, 'approve'])->name('employees.exit.approve');
            Route::post('/employees/{id}/exit/confirm', [\App\Http\Controllers\EmployeeExitController::class, 'confirm'])->name('employees.exit.confirm');
            
            // Salary Revision
            Route::get('/employees/{id}/salary-revision', [SalaryRevisionController::class, 'create'])->name('employees.salary-revision.create');
            Route::post('/employees/{id}/salary-revision', [SalaryRevisionController::class, 'store'])->name('employees.salary-revision.store');
            Route::post('/employees/{id}/salary-revision/{revisionId}/approve', [SalaryRevisionController::class, 'approve'])->name('employees.salary-revision.approve');
            
            Route::get('/bank-change-requests', [BankChangeRequestController::class, 'index'])->name('employees.bank-change-requests');
            Route::post('/bank-change-requests/{id}/approve', [BankChangeRequestController::class, 'approve'])->name('employees.bank-change-requests.approve');
            Route::post('/bank-change-requests/{id}/reject', [BankChangeRequestController::class, 'reject'])->name('employees.bank-change-requests.reject');
            Route::get('/leave-requests', [\App\Http\Controllers\LeaveApprovalController::class, 'index'])->name('leave-requests.index');
            Route::post('/leave-requests/{id}/approve', [\App\Http\Controllers\LeaveApprovalController::class, 'approve'])->name('leave-requests.approve');
            Route::post('/leave-requests/{id}/reject', [\App\Http\Controllers\LeaveApprovalController::class, 'reject'])->name('leave-requests.reject');
 
            // Payroll & Invoicing & Reports
            Route::get('/payroll/live-monitor', [\App\Http\Controllers\PayrollController::class, 'indexLiveMonitor'])->name('payroll.live-monitor');
            Route::get('/payroll/attendance-upload', [AttendanceUploadController::class, 'showUploadPage'])->name('payroll.attendance-upload');
            Route::get('/payroll/attendance/template', [AttendanceUploadController::class, 'downloadTemplate'])->name('payroll.attendance.template');
            Route::post('/payroll/attendance/validate', [AttendanceUploadController::class, 'validateUpload'])->name('payroll.attendance.validate');
            Route::post('/payroll/attendance/upload', [AttendanceUploadController::class, 'executeUpload'])->name('payroll.attendance.upload');
            Route::get('/payroll/attendance-review', [\App\Http\Controllers\AttendanceReviewController::class, 'index'])->name('payroll.attendance-review');
            Route::get('/payroll/attendance-review/{clientId}/verify', [\App\Http\Controllers\AttendanceReviewController::class, 'verifyLogs'])->name('payroll.attendance-review.verify');
            Route::post('/payroll/attendance-review/{clientId}/verify', [\App\Http\Controllers\AttendanceReviewController::class, 'saveVerification'])->name('payroll.attendance-review.verify.save');
            Route::get('/payroll/attendance-review/{clientId}/details', [\App\Http\Controllers\AttendanceReviewController::class, 'details'])->name('payroll.attendance-review.details');
            Route::get('/payroll/processing', [\App\Http\Controllers\PayrollController::class, 'indexProcessing'])->name('payroll.processing');
            Route::get('/payroll/approval', [\App\Http\Controllers\PayrollController::class, 'indexApproval'])->name('payroll.approval');
            Route::get('/payroll/payslips', [\App\Http\Controllers\PayrollController::class, 'indexPayslips'])->name('payroll.payslips');
            Route::get('/payroll/reconciliation', fn() => Inertia::render('Payroll/PayrollReconciliation'))->name('payroll.reconciliation');
            Route::get('/invoices', [\App\Http\Controllers\PayrollController::class, 'indexInvoices'])->name('invoices.index');
            Route::get('/invoices/generate', fn() => Inertia::render('Invoicing/InvoiceGenerate'))->name('invoices.generate');
            Route::get('/compliance', fn() => Inertia::render('Compliance/ComplianceReports'))->name('compliance.index');
            Route::get('/reports', fn() => Inertia::render('Reports/ReportsAnalytics'))->name('reports.index');
 
        });
 
        // ADMIN ONLY
        Route::middleware('role:admin')->group(function () {
            Route::post('/payroll/runs', [\App\Http\Controllers\PayrollController::class, 'process'])->name('payroll.run.process');
            Route::post('/payroll/{id}/approve', [\App\Http\Controllers\PayrollController::class, 'approve'])->name('payroll.run.approve');
            Route::post('/payroll/{id}/lock', [\App\Http\Controllers\PayrollController::class, 'lock'])->name('payroll.run.lock');
            Route::post('/payroll/{id}/supplementary', [\App\Http\Controllers\PayrollController::class, 'runSupplementary'])->name('payroll.run.supplementary');

            Route::get('/admin/activity-log', [\App\Http\Controllers\Admin\ActivityLogController::class, 'index'])->name('admin.activity-log');
            Route::get('/admin/users', [UserController::class, 'index'])->name('admin.users');
            Route::post('/admin/users', [UserController::class, 'store'])->name('admin.users.store');
            Route::get('/admin/settings', fn() => Inertia::render('Admin/Settings'))->name('admin.settings');
            
            Route::apiResource('admin/watchers', \App\Http\Controllers\NotificationWatcherController::class)->except(['show']);
            
            Route::get('/admin/settings/company', [SettingsController::class, 'getCompanyProfile'])->name('admin.settings.company.show');
            Route::put('/admin/settings/company', [SettingsController::class, 'updateCompanyProfile'])->name('admin.settings.company.update');
            
            Route::get('/admin/settings/pt-slabs', [SettingsController::class, 'getPtSlabs'])->name('admin.settings.pt-slabs');
            
            Route::get('/admin/settings/payroll', [SettingsController::class, 'getPayrollConfig'])->name('admin.settings.payroll.show');
            Route::put('/admin/settings/payroll', [SettingsController::class, 'updatePayrollConfig'])->name('admin.settings.payroll.update');
            
            Route::get('/admin/settings/auth-security', [SettingsController::class, 'getAuthSecurity'])->name('admin.settings.auth-security.show');
            Route::put('/admin/settings/auth-security', [SettingsController::class, 'updateAuthSecurity'])->name('admin.settings.auth-security.update');
            
            Route::get('/admin/settings/email', [SettingsController::class, 'getEmailSettings'])->name('admin.settings.email.show');
            Route::put('/admin/settings/email', [SettingsController::class, 'updateEmailSettings'])->name('admin.settings.email.update');
            Route::post('/admin/settings/email/test', [SettingsController::class, 'testEmailSettings'])->middleware('throttle:3,1')->name('admin.settings.email.test');
            
            Route::get('/admin/settings/branding', [SettingsController::class, 'getBranding'])->name('admin.settings.branding.show');
            Route::post('/admin/settings/branding', [SettingsController::class, 'updateBranding'])->name('admin.settings.branding.update');
            
            Route::get('/admin/settings/localization', [SettingsController::class, 'getLocalization'])->name('admin.settings.localization.show');
            Route::put('/admin/settings/localization', [SettingsController::class, 'updateLocalization'])->name('admin.settings.localization.update');
            
            Route::get('/admin/settings/file-upload-policy', [SettingsController::class, 'getFileUploadPolicy'])->name('admin.settings.file-upload-policy.show');
            Route::put('/admin/settings/file-upload-policy', [SettingsController::class, 'updateFileUploadPolicy'])->name('admin.settings.file-upload-policy.update');
            
            Route::get('/admin/sessions', [SessionController::class, 'allSessions'])->name('admin.sessions');
            Route::delete('/admin/sessions/{id}', [SessionController::class, 'revokeAny'])->name('admin.sessions.destroy');
            Route::post('/admin/sessions/bulk-revoke', [SessionController::class, 'bulkRevoke'])->name('admin.sessions.bulk-revoke');
        });

        // CLIENT ONLY
        Route::middleware('role:client')->group(function () {
            Route::get('/client/dashboard', fn() => Inertia::render('ClientPortal/ClientDashboard'))->name('client.dashboard');
            Route::get('/client/employees', fn() => Inertia::render('ClientPortal/ClientCandidates'))->name('client.employees');
            Route::get('/client/attendance', fn() => Inertia::render('ClientPortal/ClientAttendanceApproval'))->name('client.attendance');
            Route::get('/client/invoices', fn() => Inertia::render('ClientPortal/ClientInvoices'))->name('client.invoices');
            Route::get('/client/profile', [ClientPortalController::class,'show'])->name('client.profile');
        });

        // EMPLOYEE ONLY
        Route::middleware('role:employee')->group(function () {
            Route::get('/employee/dashboard', [\App\Http\Controllers\EmployeePortalController::class, 'dashboard'])->name('employee.dashboard');
            Route::get('/employee/profile', [\App\Http\Controllers\EmployeePortalController::class, 'profile'])->name('employee.profile');
            Route::post('/employee/documents', [\App\Http\Controllers\EmployeePortalController::class, 'storeDocument'])->name('employee.documents.store');
            Route::get('/employee/documents/{docId}/view', [\App\Http\Controllers\EmployeePortalController::class, 'viewDocument'])->name('employee.documents.view');
            Route::post('/employee/bank-change-requests', [BankChangeRequestController::class, 'store'])->name('employee.bank-change-request.store');
            Route::get('/employee/attendance', [\App\Http\Controllers\EmployeePortalController::class, 'attendance'])->name('employee.attendance');
            Route::post('/employee/attendance/punch-in', [\App\Http\Controllers\EmployeePortalController::class, 'punchIn'])->name('employee.attendance.punch-in');
            Route::post('/employee/attendance/punch-out', [\App\Http\Controllers\EmployeePortalController::class, 'punchOut'])->name('employee.attendance.punch-out');
            
            Route::get('/employee/attendance/correction-requests', [\App\Http\Controllers\EmployeePortalController::class, 'correctionRequests'])->name('employee.attendance.correction-requests');
            Route::post('/employee/attendance/correction-request', [\App\Http\Controllers\EmployeePortalController::class, 'storeCorrectionRequest'])->name('employee.attendance.correction-request.store');
            
            Route::get('/employee/leave', [\App\Http\Controllers\EmployeePortalController::class, 'leave'])->name('employee.leave');
            Route::post('/employee/leave-requests', [\App\Http\Controllers\EmployeePortalController::class, 'storeLeaveRequest'])->name('employee.leave.store');
            
            Route::get('/employee/payslips', fn() => Inertia::render('EmployeePortal/EmployeePayslips'))->name('employee.payslips');
        });
    });
});


