<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

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
        ];
    }

    // Relationships
    public function employee() { return $this->belongsTo(Employee::class); }
    public function client() { return $this->belongsTo(Client::class); }
    public function otpCodes() { return $this->hasMany(OtpCode::class); }
    public function passwordHistories() { return $this->hasMany(PasswordHistory::class); }
    public function auditLogs() { return $this->hasMany(AuditLog::class); }

    // Helpers
    public function isAdmin() { return $this->role === 'admin'; }
    public function isManager() { return $this->role === 'manager'; }
    public function isLocked() { return $this->status === 'locked' || ($this->locked_until && $this->locked_until->isFuture()); }
    public function incrementFailedAttempts() {
        $this->increment('failed_login_attempts');
    }
    public function resetFailedAttempts() {
        $this->update(['failed_login_attempts' => 0, 'locked_until' => null, 'status' => 'active']);
    }
}
