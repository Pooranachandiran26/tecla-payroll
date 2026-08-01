<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Inertia\Inertia;
use App\Models\AuditLog;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ActivityLogController extends Controller
{
    // Maps frontend category IDs to action keyword patterns
    private const CATEGORY_PATTERNS = [
        'security' => ['login_failed', 'lock', 'breach', 'inactive_access', 'session_revoked'],
        'auth'     => ['login', 'logout', 'otp', 'password_reset', 'invitation_accepted'],
        'employee' => ['employee.', 'employee_', 'auto_activated', 'salary_revision', 'document_verified', 'document_rejected', 'bank_change'],
        'payroll'  => ['payroll', 'payslip', 'pf_', 'esi_', 'tds_', 'lop'],
        'settings' => ['settings', 'branding', 'company_profile', 'pt_slab', 'lwf_slab', 'gst', 'localization', 'file_upload_policy', 'email.settings'],
        'usermgt'  => ['user_created', 'invitation', 'role_changed', 'user_suspended', 'user_reactivated'],
        'system'   => ['email.test', 'email.send', 'export', 'bulk_upload', 'session_revoked'],
    ];

    public function index(Request $request)
    {
        $user = $request->user();
        if (!$user || !in_array($user->role, ['admin', 'manager'])) {
            abort(403, 'Unauthorized access.');
        }

        if ($user->role === 'manager' && !$user->hasModulePermission('admin_activity_log', 'admin')) {
            abort(403, 'You do not have permission to access Activity Logs.');
        }

        $query = AuditLog::with(['user'])->latest();

        // ── Search filter ─────────────────────────────────────────────────────
        if ($request->filled('search')) {
            $s = '%' . $request->search . '%';
            $query->where(function ($q) use ($s) {
                $q->where('action', 'like', $s)
                  ->orWhereHas('user', fn($u) => $u->where('name', 'like', $s)->orWhere('email', 'like', $s))
                  ->orWhere('ip_address', 'like', $s);
            });
        }

        // ── Category filter ───────────────────────────────────────────────────
        if ($request->filled('category') && isset(self::CATEGORY_PATTERNS[$request->category])) {
            $patterns = self::CATEGORY_PATTERNS[$request->category];
            $query->where(function ($q) use ($patterns) {
                foreach ($patterns as $i => $p) {
                    $method = $i === 0 ? 'where' : 'orWhere';
                    $q->$method('action', 'like', '%' . $p . '%');
                }
            });
        }

        // ── Date range filter ─────────────────────────────────────────────────
        if ($request->filled('date_from')) {
            $query->whereDate('created_at', '>=', $request->date_from);
        }
        if ($request->filled('date_to')) {
            $query->whereDate('created_at', '<=', $request->date_to);
        }

        // ── CSV Export Stream ────────────────────────────────────────────────
        if ($request->export === 'csv') {
            $filename = 'activity_log_' . now()->format('Y-m-d_His') . '.csv';
            
            return new StreamedResponse(function () use ($query) {
                $handle = fopen('php://output', 'w');
                // CSV Header Row
                fputcsv($handle, ['ID', 'User Name', 'User Email', 'Action Code', 'Target Model', 'Target ID', 'IP Address', 'Timestamp', 'Changed Data']);

                $query->chunk(200, function ($logs) use ($handle) {
                    foreach ($logs as $log) {
                        $diffSummary = '';
                        if ($log->old_values || $log->new_values) {
                            $diffSummary = json_encode([
                                'before' => $log->old_values,
                                'after'  => $log->new_values,
                            ]);
                        }

                        fputcsv($handle, [
                            $log->id,
                            $log->user ? $log->user->name : 'System',
                            $log->user ? $log->user->email : 'N/A',
                            $log->action,
                            $log->auditable_type ? class_basename($log->auditable_type) : 'Global',
                            $log->auditable_id ?: 'N/A',
                            $log->ip_address ?: 'N/A',
                            $log->created_at->format('Y-m-d H:i:s'),
                            $diffSummary,
                        ]);
                    }
                });

                fclose($handle);
            }, 200, [
                'Content-Type'        => 'text/csv',
                'Content-Disposition' => 'attachment; filename="' . $filename . '"',
            ]);
        }

        // ── Compute Category Counts across DB ──────────────────────────────────
        $categoryCounts = [
            'all' => AuditLog::count(),
        ];
        foreach (self::CATEGORY_PATTERNS as $catKey => $patterns) {
            $categoryCounts[$catKey] = AuditLog::where(function ($q) use ($patterns) {
                foreach ($patterns as $i => $p) {
                    $method = $i === 0 ? 'where' : 'orWhere';
                    $q->$method('action', 'like', '%' . $p . '%');
                }
            })->count();
        }

        // ── Paginate & return for Inertia ─────────────────────────────────────
        $logs = $query->paginate(10)->withQueryString();

        return Inertia::render('Admin/ActivityLog', [
            'logs'           => $logs,
            'categoryCounts' => $categoryCounts,
            'filters'        => $request->only(['search', 'date_from', 'date_to', 'category']),
        ]);
    }
}

