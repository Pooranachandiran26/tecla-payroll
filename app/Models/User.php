<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Facades\DB;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'role',
        'module_permissions',
        'employee_id',
        'client_id',
        'status',
        'recovery_email',
        'failed_login_attempts',
        'locked_until',
        'password_changed_at',
        'must_change_password',
        'last_login_at',
        'last_login_ip',
        'invitation_token',
        'invitation_expires_at',
        'suspended_reason',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
        'invitation_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'locked_until' => 'datetime',
            'password_changed_at' => 'datetime',
            'last_login_at' => 'datetime',
            'invitation_expires_at' => 'datetime',
            'must_change_password' => 'boolean',
            'module_permissions' => 'array',
        ];
    }

    public function hasModulePermission(string $moduleKey, ?string $parentModuleKey = null): bool
    {
        if ($this->role === 'admin' || $this->role === 'client') {
            return true;
        }

        if (empty($this->module_permissions)) {
            return true;
        }

        if (in_array($moduleKey, $this->module_permissions)) {
            return true;
        }

        if ($parentModuleKey && in_array($parentModuleKey, $this->module_permissions)) {
            $parentSubKeys = [
                'admin' => ['admin_activity_log', 'admin_users', 'admin_sessions', 'admin_payslip_templates', 'admin_settings'],
                'candidates' => ['emp_all', 'emp_create', 'emp_bulk_upload', 'emp_salary_revisions', 'emp_bank_change', 'emp_day_swaps', 'emp_leave_approval', 'emp_queries'],
                'payroll' => ['payroll_live_monitor', 'payroll_attendance_upload', 'payroll_attendance_review', 'payroll_processing', 'payroll_approval', 'payroll_payslips', 'payroll_invoices'],
                'clients' => ['clients_index', 'clients_create'],
                'reports' => ['reports_catalog', 'reports_register'],
                'compliance' => ['compliance_reports'],
            ];

            $subKeys = $parentSubKeys[$parentModuleKey] ?? [];
            $hasAnySubKey = false;
            foreach ($subKeys as $sub) {
                if (in_array($sub, $this->module_permissions)) {
                    $hasAnySubKey = true;
                    break;
                }
            }

            if (!$hasAnySubKey) {
                return true;
            }
        }

        return false;
    }

    // Relationships
    public function employee() { return $this->belongsTo(Employee::class); }
    public function client() { return $this->belongsTo(Client::class); }
    public function managedClients() { return $this->belongsToMany(Client::class, 'client_user'); }
    public function otpCodes() { return $this->hasMany(OtpCode::class); }
    public function passwordHistories() { return $this->hasMany(PasswordHistory::class); }
    public function auditLogs() { return $this->hasMany(AuditLog::class); }

    // Helpers
    public function isAdmin() { return $this->role === 'admin'; }
    public function isManager() { return $this->role === 'manager'; }
    public function isLocked() { return in_array($this->status, ['locked', 'suspended']) || ($this->locked_until && $this->locked_until->isFuture()); }

    public function getManagedClientIds(): array
    {
        if ($this->role === 'admin') {
            return Client::pluck('id')->toArray();
        }

        if ($this->role === 'manager') {
            $amClientIds = Client::where('account_manager_id', $this->id)
                ->orWhere('backup_account_manager_id', $this->id)
                ->pluck('id');

            $pivotClientIds = DB::table('client_user')
                ->where('user_id', $this->id)
                ->pluck('client_id');

            return $amClientIds->merge($pivotClientIds)->unique()->filter()->values()->toArray();
        }

        if ($this->role === 'client' && $this->client_id) {
            return [(int)$this->client_id];
        }

        return [];
    }

    public function isManagerForClient($clientId): bool
    {
        if ($this->role === 'admin') {
            return true;
        }

        if ($this->role === 'manager') {
            return in_array((int)$clientId, $this->getManagedClientIds());
        }

        return false;
    }

    public function incrementFailedAttempts() {
        $this->increment('failed_login_attempts');
    }
    public function resetFailedAttempts() {
        $this->update(['failed_login_attempts' => 0, 'locked_until' => null, 'status' => 'active']);
    }
}
