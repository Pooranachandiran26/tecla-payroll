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
use App\Http\Controllers\DaySwapController;
use App\Http\Controllers\ClientHolidayController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\EmployeeLoanController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\PfEcrController;
use App\Http\Controllers\EsiMonthlyController;

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
    Route::post('/account/change-password', [\App\Http\Controllers\Auth\PasswordUpdateController::class, 'update'])->name('account.password.update');
    Route::get('/account/profile', [\App\Http\Controllers\AccountProfileController::class, 'show'])->name('account.profile');
    Route::put('/account/profile', [\App\Http\Controllers\AccountProfileController::class, 'update'])->name('account.profile.update');

    // -------------------------------------------------------------------
    // FULLY ACTIVE ROUTES (Must have fresh password)
    // -------------------------------------------------------------------
    Route::middleware('fresh-password')->group(function () {
        
        // Employee Tax Declarations (Accessible by Admin, Manager & Employee self-service)
        Route::get('/employees/{id}/tax-declarations', [\App\Http\Controllers\TaxDeclarationController::class, 'show'])->name('employees.tax-declarations.show');
        Route::post('/employees/{id}/tax-declarations', [\App\Http\Controllers\TaxDeclarationController::class, 'store'])->name('employees.tax-declarations.store');

        // Dashboard (redirects employees/clients to their portal dashboards automatically)
        Route::get('/dashboard', [DashboardController::class, 'index'])->name('dashboard');

        // ADMIN & MANAGER
        Route::middleware('role:admin,manager')->group(function () {
            Route::get('/quick-access', fn() => Inertia::render('Dashboard/QuickAccess'))->middleware('module:quick-access')->name('quick-access');

            Route::post('/export/employees', [\App\Http\Controllers\ExportController::class, 'exportEmployeeData'])->name('employees.export');

            // Clients Module (Gated by module:clients)
            Route::middleware('module:clients')->group(function () {
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

                Route::post('/clients/{clientId}/holidays', [ClientHolidayController::class, 'store'])->name('clients.holidays.store');
                Route::delete('/clients/{clientId}/holidays/{id}', [ClientHolidayController::class, 'destroy'])->name('clients.holidays.destroy');
            });

            // Employees Module (Gated by module:candidates)
            Route::middleware('module:candidates')->group(function () {
                Route::get('/employees/suggestions', [EmployeeController::class, 'suggestions'])->name('employees.suggestions');
                Route::get('/employees/check-unique', [EmployeeController::class, 'checkUnique'])->name('employees.check-unique');
                Route::post('/employees/calculate-preview', [EmployeeController::class, 'calculatePreview'])->name('employees.calculate-preview');
                Route::get('/employees', [EmployeeController::class, 'index'])->name('employees.index');
                Route::post('/employees', [EmployeeController::class, 'store'])->name('employees.store');
                Route::get('/employees/create', function() {
                    $clients = \App\Models\Client::where('status', 'active')->select('id', 'company_name', 'weekly_off_pattern', 'employee_pf_wage_basis', 'employer_pf_wage_basis')->get();
                    return Inertia::render('Employees/EmployeeForm', ['clients' => $clients]);
                })->middleware('module:candidates,emp_create')->name('employees.create');
                Route::get('/employees/bulk-upload', [BulkUploadController::class, 'showUploadForm'])->middleware('module:candidates,emp_bulk_upload')->name('employees.bulk-upload');
                Route::get('/employees/bulk-upload/history', [BulkUploadController::class, 'history'])->name('employees.bulk-upload.history');
                Route::get('/employees/bulk-upload/history/{batchId}/details', [BulkUploadController::class, 'getBatchDetails'])->name('employees.bulk-upload.history.details');
                Route::get('/employees/bulk-upload/history/{batchId}/download-errors', [BulkUploadController::class, 'downloadHistoryErrors'])->name('employees.bulk-upload.history.download-errors');
                Route::get('/employees/bulk-upload/history/{batchId}/download-success', [BulkUploadController::class, 'downloadHistorySuccess'])->name('employees.bulk-upload.history.download-success');
                Route::get('/employees/bulk-upload/template', [BulkUploadController::class, 'downloadTemplate'])->name('employees.bulk-upload.template');
                Route::get('/employees/bulk-upload/download-template', [BulkUploadController::class, 'downloadTemplate'])->name('employees.bulk-upload.download-template');
                Route::get('/employees/bulk-upload/template', [BulkUploadController::class, 'downloadTemplate'])->name('employees.bulk-upload.template');
                Route::post('/employees/bulk-upload/validate', [BulkUploadController::class, 'validateUpload'])->name('employees.bulk-upload.validate');
                Route::post('/employees/bulk-upload/execute', [BulkUploadController::class, 'executeImport'])->name('employees.bulk-upload.execute');
                Route::post('/employees/bulk-upload/async', [BulkUploadController::class, 'uploadAsync'])->name('employees.bulk-upload.async');
                Route::get('/employees/bulk-upload/status/{batchId}', [BulkUploadController::class, 'getBatchStatus'])->name('employees.bulk-upload.status');
                Route::post('/employees/bulk-upload/clear-session', [BulkUploadController::class, 'clearSession'])->name('employees.bulk-upload.clear-session');
                Route::get('/employees/salary-bulk-update', fn() => Inertia::render('Employees/SalaryBulkUpdate'))->name('employees.salary-bulk-update');
                Route::get('/employees/salary-revisions-queue', [SalaryRevisionController::class, 'queue'])->name('employees.salary-revisions-queue');
                Route::get('/employees/{id}', [EmployeeController::class, 'show'])->where('id', '[0-9]+')->name('employees.show');
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
                
                Route::post('/employees/{id}/tax-declarations/{declarationId}/verify', [\App\Http\Controllers\TaxDeclarationController::class, 'verify'])->name('employees.tax-declarations.verify');

                // Employee Loans & Advances
                Route::get('/employees/{employee}/loans', [EmployeeLoanController::class, 'index'])->name('employees.loans.index');
                Route::post('/employees/{employee}/loans', [EmployeeLoanController::class, 'store'])->name('employees.loans.store');
                Route::patch('/employees/loans/{loan}/status', [EmployeeLoanController::class, 'updateStatus'])->name('employees.loans.update-status');

                // Salary Revision
                Route::get('/employees/{id}/salary-revision', [SalaryRevisionController::class, 'create'])->name('employees.salary-revision.create');
                Route::post('/employees/{id}/salary-revision', [SalaryRevisionController::class, 'store'])->name('employees.salary-revision.store');
                Route::post('/employees/{id}/salary-revision/{revisionId}/approve', [SalaryRevisionController::class, 'approve'])->name('employees.salary-revision.approve');
                Route::post('/employees/{id}/salary-revision/{revisionId}/send-email', [SalaryRevisionController::class, 'sendEmail'])->name('employees.salary-revision.send-email');
                
                Route::get('/bank-change-requests', [BankChangeRequestController::class, 'index'])->name('employees.bank-change-requests');
                Route::post('/bank-change-requests/{id}/approve', [BankChangeRequestController::class, 'approve'])->name('employees.bank-change-requests.approve');
                Route::post('/bank-change-requests/{id}/reject', [BankChangeRequestController::class, 'reject'])->name('employees.bank-change-requests.reject');
                
                Route::get('/day-swap-requests', [DaySwapController::class, 'index'])->name('employees.day-swaps');
                Route::post('/day-swap-requests/{id}/approve', [DaySwapController::class, 'approve'])->name('employees.day-swaps.approve');
                Route::post('/day-swap-requests/{id}/reject', [DaySwapController::class, 'reject'])->name('employees.day-swaps.reject');

                Route::get('/attendance-correction-requests', [\App\Http\Controllers\AttendanceCorrectionApprovalController::class, 'index'])->name('employees.attendance-corrections');
                Route::post('/attendance-correction-requests/{id}/approve', [\App\Http\Controllers\AttendanceCorrectionApprovalController::class, 'approve'])->name('employees.attendance-corrections.approve');
                Route::post('/attendance-correction-requests/{id}/reject', [\App\Http\Controllers\AttendanceCorrectionApprovalController::class, 'reject'])->name('employees.attendance-corrections.reject');

                Route::get('/leave-requests', [\App\Http\Controllers\LeaveApprovalController::class, 'index'])->name('leave-requests.index');
                Route::post('/leave-requests/{id}/approve', [\App\Http\Controllers\LeaveApprovalController::class, 'approve'])->name('leave-requests.approve');
                Route::post('/leave-requests/{id}/reject', [\App\Http\Controllers\LeaveApprovalController::class, 'reject'])->name('leave-requests.reject');
            });

            // Payroll Module (Gated by module:payroll)
            Route::middleware('module:payroll')->group(function () {
                Route::get('/payroll/live-monitor', function(\Illuminate\Http\Request $request) {
                    $user = $request->user();
                    if ($user && $user->role === 'manager' && !$user->hasModulePermission('payroll_live_monitor', 'payroll')) {
                        if ($user->hasModulePermission('payroll_attendance_upload', 'payroll')) {
                            return redirect()->route('payroll.attendance-upload');
                        }
                        if ($user->hasModulePermission('payroll_attendance_review', 'payroll')) {
                            return redirect()->route('payroll.attendance-review');
                        }
                        if ($user->hasModulePermission('payroll_processing', 'payroll')) {
                            return redirect()->route('payroll.processing');
                        }
                        if ($user->hasModulePermission('payroll_approval', 'payroll')) {
                            return redirect()->route('payroll.approval');
                        }
                        if ($user->hasModulePermission('payroll_payslips', 'payroll')) {
                            return redirect()->route('payroll.payslips');
                        }
                        if ($user->hasModulePermission('payroll_invoices', 'payroll')) {
                            return redirect()->route('invoices.index');
                        }
                        abort(403, 'You do not have permission to access Live Attendance Monitor.');
                    }
                    return app(\App\Http\Controllers\PayrollController::class)->indexLiveMonitor($request);
                })->name('payroll.live-monitor');

                Route::get('/payroll/attendance-upload', function(\Illuminate\Http\Request $request) {
                    if ($request->user() && $request->user()->role === 'manager' && !$request->user()->hasModulePermission('payroll_attendance_upload', 'payroll')) {
                        abort(403, 'You do not have permission to access Attendance Upload.');
                    }
                    return app(AttendanceUploadController::class)->showUploadPage($request);
                })->name('payroll.attendance-upload');

                Route::get('/payroll/attendance/template', [AttendanceUploadController::class, 'downloadTemplate'])->name('payroll.attendance.template');
                Route::get('/payroll/attendance/context', [AttendanceUploadController::class, 'getContext'])->name('payroll.attendance.context');
                Route::post('/payroll/attendance/validate', [AttendanceUploadController::class, 'validateUpload'])->name('payroll.attendance.validate');
                Route::post('/payroll/attendance/upload', [AttendanceUploadController::class, 'executeUpload'])->name('payroll.attendance.upload');
                Route::post('/payroll/attendance/upload-async', [AttendanceUploadController::class, 'uploadAsync'])->name('payroll.attendance.upload-async');
                Route::get('/payroll/attendance/history', [AttendanceUploadController::class, 'history'])->name('payroll.attendance.history');
                Route::get('/payroll/attendance/history/{batchId}/details', [AttendanceUploadController::class, 'getBatchDetails'])->name('payroll.attendance.history.details');
                Route::get('/payroll/attendance/history/{batchId}/download-errors', [AttendanceUploadController::class, 'downloadHistoryErrors'])->name('payroll.attendance.history.download-errors');
                Route::get('/payroll/attendance/history/{batchId}/download-success', [AttendanceUploadController::class, 'downloadHistorySuccess'])->name('payroll.attendance.history.download-success');
                
                // Client & Admin Leave Settings Routes
                Route::get('/payroll/leave-settings', [\App\Http\Controllers\ClientLeavePolicyController::class, 'index'])->name('payroll.leave-settings');
                Route::post('/payroll/leave-settings', [\App\Http\Controllers\ClientLeavePolicyController::class, 'store'])->name('payroll.leave-settings.store');
                Route::put('/payroll/leave-settings/{id}', [\App\Http\Controllers\ClientLeavePolicyController::class, 'update'])->name('payroll.leave-settings.update');
                Route::post('/payroll/leave-settings/{clientId}/sync', [\App\Http\Controllers\ClientLeavePolicyController::class, 'syncAllEmployees'])->name('payroll.leave-settings.sync');

                Route::get('/payroll/attendance-review', function(\Illuminate\Http\Request $request) {
                    if ($request->user() && $request->user()->role === 'manager' && !$request->user()->hasModulePermission('payroll_attendance_review', 'payroll')) {
                        abort(403, 'You do not have permission to access Attendance Review.');
                    }
                    return app(\App\Http\Controllers\AttendanceReviewController::class)->index($request);
                })->name('payroll.attendance-review');

                Route::get('/payroll/attendance-review/{clientId}/verify', [\App\Http\Controllers\AttendanceReviewController::class, 'verifyLogs'])->name('payroll.attendance-review.verify');
                Route::post('/payroll/attendance-review/{clientId}/verify', [\App\Http\Controllers\AttendanceReviewController::class, 'saveVerification'])->name('payroll.attendance-review.verify.save');
                Route::get('/payroll/attendance-review/{clientId}/details', [\App\Http\Controllers\AttendanceReviewController::class, 'details'])->name('payroll.attendance-review.details');
                
                Route::get('/payroll/processing', function(\Illuminate\Http\Request $request) {
                    if ($request->user() && $request->user()->role === 'manager' && !$request->user()->hasModulePermission('payroll_processing', 'payroll')) {
                        abort(403, 'You do not have permission to access Payroll Processing.');
                    }
                    return app(\App\Http\Controllers\PayrollController::class)->indexProcessing($request);
                })->name('payroll.processing');

                Route::get('/payroll/approval', function(\Illuminate\Http\Request $request) {
                    if ($request->user() && $request->user()->role === 'manager' && !$request->user()->hasModulePermission('payroll_approval', 'payroll')) {
                        abort(403, 'You do not have permission to access Payroll Approval.');
                    }
                    return app(\App\Http\Controllers\PayrollController::class)->indexApproval($request);
                })->name('payroll.approval');

                Route::get('/payroll/payslips', function(\Illuminate\Http\Request $request) {
                    if ($request->user() && $request->user()->role === 'manager' && !$request->user()->hasModulePermission('payroll_payslips', 'payroll')) {
                        abort(403, 'You do not have permission to access Payslips Viewer.');
                    }
                    return app(\App\Http\Controllers\PayrollController::class)->indexPayslips($request);
                })->name('payroll.payslips');

                Route::get('/invoices', function(\Illuminate\Http\Request $request) {
                    if ($request->user() && $request->user()->role === 'manager' && !$request->user()->hasModulePermission('payroll_invoices', 'payroll')) {
                        abort(403, 'You do not have permission to access Invoices List.');
                    }
                    return app(\App\Http\Controllers\InvoiceController::class)->index($request);
                })->name('invoices.index');
                Route::get('/invoices/generate', fn() => Inertia::render('Invoicing/InvoiceGenerate'))->name('invoices.generate');
                Route::get('/invoices/{id}', [\App\Http\Controllers\InvoiceController::class, 'show'])->name('invoices.show');
                Route::get('/invoices/{id}/download', [\App\Http\Controllers\InvoiceController::class, 'downloadPdf'])->name('invoices.download');
                Route::post('/invoices/{id}/finalize', [\App\Http\Controllers\InvoiceController::class, 'finalize'])->name('invoices.finalize');
                Route::post('/invoices/{id}/send-email', [\App\Http\Controllers\InvoiceController::class, 'sendEmail'])->name('invoices.send-email');
                Route::post('/invoices/{id}/mark-paid', [\App\Http\Controllers\InvoiceController::class, 'markAsPaid'])->name('invoices.mark-paid');
                Route::post('/invoices/{id}/fees', [\App\Http\Controllers\InvoiceController::class, 'storeFee'])->name('invoices.fees.store');
                Route::delete('/invoices/{id}/fees/{feeId}', [\App\Http\Controllers\InvoiceController::class, 'destroyFee'])->name('invoices.fees.destroy');
                Route::post('/payroll/{id}/release-payslips', [\App\Http\Controllers\PayrollController::class, 'releasePayslips'])->name('payroll.run.release-payslips');

                // Payroll Correction routes
                Route::post('/payroll/correction/preview', [\App\Http\Controllers\PayrollController::class, 'previewCorrection'])->name('payroll.correction.preview');
                Route::post('/payroll/correction/store', [\App\Http\Controllers\PayrollController::class, 'storeCorrection'])->name('payroll.correction.store');
                Route::get('/payroll/correction/template', [\App\Http\Controllers\PayrollController::class, 'downloadCorrectionTemplate'])->name('payroll.correction.template');
                Route::post('/payroll/correction/batch-import', [\App\Http\Controllers\PayrollController::class, 'importBatchCorrection'])->name('payroll.correction.batch-import');
                Route::post('/payroll/correction/batch-preview', [\App\Http\Controllers\PayrollController::class, 'previewBatchCorrection'])->name('payroll.correction.batch-preview');
                Route::post('/payroll/correction/batch-store', [\App\Http\Controllers\PayrollController::class, 'storeBatchCorrection'])->name('payroll.correction.batch-store');
            });

            // Compliance Module (Gated by module:compliance)
            Route::middleware('module:compliance')->group(function () {
                Route::get('/compliance', [\App\Http\Controllers\ComplianceController::class, 'index'])->name('compliance.index');
                Route::post('/compliance/mark-filed', [\App\Http\Controllers\ComplianceController::class, 'markFiled'])->name('compliance.mark_filed');
                
                // PF ECR Routes
                Route::get('/compliance/pf-ecr/runs', [PfEcrController::class, 'getRuns'])->name('compliance.pf_ecr.runs');
                Route::post('/compliance/pf-ecr/preview', [PfEcrController::class, 'preview'])->name('compliance.pf_ecr.preview');
                Route::post('/compliance/pf-ecr/generate', [PfEcrController::class, 'generate'])->name('compliance.pf_ecr.generate');
                Route::get('/compliance/pf-ecr/download/{id}', [PfEcrController::class, 'download'])->name('compliance.pf_ecr.download');
                Route::post('/compliance/pf-ecr/update-status/{id}', [PfEcrController::class, 'updateStatus'])->name('compliance.pf_ecr.update_status');
                Route::delete('/compliance/pf-ecr/{id}', [PfEcrController::class, 'destroy'])->name('compliance.pf_ecr.destroy');

                // ESI Monthly Contribution Routes
                Route::get('/compliance/esi-monthly/runs', [EsiMonthlyController::class, 'getRuns'])->name('compliance.esi_monthly.runs');
                Route::post('/compliance/esi-monthly/generate', [EsiMonthlyController::class, 'generate'])->name('compliance.esi_monthly.generate');
                Route::get('/compliance/esi-monthly/download/{id}', [EsiMonthlyController::class, 'download'])->name('compliance.esi_monthly.download');
            });

            // Reports Module (Gated by module:reports)
            Route::middleware('module:reports')->group(function () {
                Route::get('/reports', fn() => redirect('/admin/reports/payroll_register'))->name('reports.index');
                Route::get('/admin/reports', [\App\Http\Controllers\Admin\AdminReportController::class, 'index'])->name('admin.reports.index');
                Route::get('/admin/reports/{reportKey}', [\App\Http\Controllers\Admin\AdminReportController::class, 'show'])->name('admin.reports.show');
                Route::get('/admin/reports/{reportKey}/export', [\App\Http\Controllers\Admin\AdminReportController::class, 'export'])->name('admin.reports.export');
                Route::get('/admin/reports/{reportKey}/pdf', [\App\Http\Controllers\Admin\AdminReportController::class, 'pdf'])->name('admin.reports.pdf');
            });

            Route::get('/admin/employee-queries', [\App\Http\Controllers\EmployeeQueryController::class, 'adminIndex'])->name('admin.employee-queries.index');
            Route::post('/admin/employee-queries', [\App\Http\Controllers\EmployeeQueryController::class, 'adminStore'])->name('admin.employee-queries.store');
            Route::post('/admin/employee-queries/{query}/respond', [\App\Http\Controllers\EmployeeQueryController::class, 'adminRespond'])->name('admin.employee-queries.respond');
        });
 
        // Notifications (Admin & Manager)
        Route::get('/notifications', [NotificationController::class, 'index'])->name('notifications.index');
        Route::post('/notifications/{id}/read', [NotificationController::class, 'markRead'])->name('notifications.read');
        Route::post('/notifications/read-all', [NotificationController::class, 'readAll'])->name('notifications.readAll');

        // ADMIN & MANAGER ACCESS (Gated by module:admin permission)
        Route::middleware(['role:admin,manager', 'module:admin'])->group(function () {
            Route::post('/payroll/runs', [\App\Http\Controllers\PayrollController::class, 'process'])->name('payroll.run.process');
            Route::post('/payroll/{id}/approve', [\App\Http\Controllers\PayrollController::class, 'approve'])->name('payroll.run.approve');
            
            Route::post('/compliance/mark-filed', [\App\Http\Controllers\ComplianceController::class, 'markFiled'])->name('compliance.mark_filed');
            Route::post('/payroll/{id}/lock', [\App\Http\Controllers\PayrollController::class, 'lock'])->name('payroll.run.lock');
            Route::post('/payroll/{id}/supplementary', [\App\Http\Controllers\PayrollController::class, 'runSupplementary'])->name('payroll.run.supplementary');

            Route::get('/admin/activity-log', [\App\Http\Controllers\Admin\ActivityLogController::class, 'index'])->name('admin.activity-log');
            Route::get('/admin/users', [UserController::class, 'index'])->name('admin.users');
            Route::post('/admin/users', [UserController::class, 'store'])->name('admin.users.store');
            Route::post('/admin/users/{user}/resend-invite', [UserController::class, 'resendInvite'])->name('admin.users.resend-invite');
            Route::put('/admin/users/{user}/managed-clients', [UserController::class, 'updateManagedClients'])->name('admin.users.update-managed-clients');
            Route::put('/admin/users/{user}/module-permissions', [UserController::class, 'updateModulePermissions'])->name('admin.users.update-module-permissions');
            Route::delete('/admin/users/{user}', [UserController::class, 'destroy'])->name('admin.users.destroy');
            Route::get('/admin/payslip-templates', [\App\Http\Controllers\Admin\PayslipTemplateCustomizerController::class, 'index'])->name('admin.payslip-templates');
            Route::get('/admin/payslip-templates/preview', [\App\Http\Controllers\Admin\PayslipTemplateCustomizerController::class, 'previewHtml'])->name('admin.payslip-templates.preview');
            Route::post('/admin/payslip-templates/{client}', [\App\Http\Controllers\Admin\PayslipTemplateCustomizerController::class, 'update'])->name('admin.payslip-templates.update');
            Route::get('/admin/settings', fn() => Inertia::render('Admin/Settings'))->middleware('module:admin,admin_settings')->name('admin.settings');
            
            Route::apiResource('admin/watchers', \App\Http\Controllers\NotificationWatcherController::class)->except(['show']);
            
            Route::get('/admin/settings/company', [SettingsController::class, 'getCompanyProfile'])->name('admin.settings.company.show');
            Route::put('/admin/settings/company', [SettingsController::class, 'updateCompanyProfile'])->name('admin.settings.company.update');
            
            Route::get('/admin/settings/pt-slabs', [SettingsController::class, 'getPtSlabs'])->name('admin.settings.pt-slabs');
            Route::put('/admin/settings/pt-slabs/{id}', [SettingsController::class, 'updatePtSlab'])->name('admin.settings.pt-slabs.update');
            
            Route::get('/admin/settings/lwf-slabs', [SettingsController::class, 'getLwfSlabs'])->name('admin.settings.lwf-slabs');
            Route::put('/admin/settings/lwf-slabs/{id}', [SettingsController::class, 'updateLwfSlab'])->name('admin.settings.lwf-slabs.update');
            
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

            Route::get('/admin/settings/gst', [SettingsController::class, 'getGstSettings'])->name('admin.settings.gst.show');
            Route::put('/admin/settings/gst', [SettingsController::class, 'updateGstSettings'])->name('admin.settings.gst.update');

            Route::get('/admin/sessions', [SessionController::class, 'allSessions'])->name('admin.sessions');
            Route::delete('/admin/sessions/{id}', [SessionController::class, 'revokeAny'])->name('admin.sessions.destroy');
            Route::post('/admin/sessions/bulk-revoke', [SessionController::class, 'bulkRevoke'])->name('admin.sessions.bulk-revoke');
        });

        // CLIENT ONLY
        Route::middleware(['role:client', 'client.ip', 'client.timeout'])->group(function () {
            Route::get('/client/dashboard', [\App\Http\Controllers\ClientPortalController::class, 'dashboard'])->name('client.dashboard');
            Route::get('/client/employees', [\App\Http\Controllers\ClientPortalController::class, 'employees'])->name('client.employees');
            Route::get('/client/attendance', [\App\Http\Controllers\ClientPortalController::class, 'attendance'])->name('client.attendance');
            Route::get('/client/leave-settings', [\App\Http\Controllers\ClientPortalController::class, 'leaveSettings'])->name('client.leave-settings');
            Route::get('/client/invoices', [\App\Http\Controllers\ClientPortalController::class, 'invoices'])->name('client.invoices');
            Route::get('/client/profile', [\App\Http\Controllers\ClientPortalController::class, 'show'])->name('client.profile');
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
            
            Route::get('/employee/attendance/day-swaps', [DaySwapController::class, 'employeeIndex'])->name('employee.day-swaps.index');
            Route::post('/employee/attendance/day-swaps', [DaySwapController::class, 'store'])->name('employee.day-swaps.store');
            Route::post('/employee/attendance/day-swaps/{id}/withdraw', [DaySwapController::class, 'withdraw'])->name('employee.day-swaps.withdraw');
            
            Route::get('/employee/leave', [\App\Http\Controllers\EmployeePortalController::class, 'leave'])->name('employee.leave');
            Route::post('/employee/leave-requests', [\App\Http\Controllers\EmployeePortalController::class, 'storeLeaveRequest'])->name('employee.leave.store');
            
            Route::get('/employee/payslips', [\App\Http\Controllers\EmployeePortalController::class, 'payslips'])->name('employee.payslips');
            Route::get('/employee/payslips/{id}/download', [\App\Http\Controllers\EmployeePortalController::class, 'downloadPayslip'])->name('employee.payslips.download');

            Route::get('/employee/contact', [\App\Http\Controllers\EmployeeQueryController::class, 'employeeIndex'])->name('employee.contact');
            Route::post('/employee/contact', [\App\Http\Controllers\EmployeeQueryController::class, 'employeeStore'])->name('employee.contact.store');
        });
    });
});


