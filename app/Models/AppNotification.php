<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Builder;

/**
 * In-app notification record for Admin/Manager users.
 *
 * SCOPE BOUNDARY (v1): Only admin and manager users receive in-app notifications.
 * Employees and clients are intentionally excluded — they continue to receive
 * transactional emails (EmployeeQueryRespondedMail, PromotionRevisionApprovedMail, etc.)
 * which remain unchanged. This is a deliberate design decision, not a gap.
 */
class AppNotification extends Model
{
    protected $guarded = [];

    protected $casts = [
        'read_at' => 'datetime',
        'data'    => 'array',   // Matches the nullable JSON `data` column in the migration
    ];

    /**
     * Convert absolute domain/localhost URLs stored in database to relative paths.
     */
    public function getUrlAttribute($value): ?string
    {
        if (empty($value)) {
            return null;
        }

        if (preg_match('#^https?://[^/]+(.*)$#i', $value, $matches)) {
            $path = $matches[1];
            return $path ?: '/';
        }

        return $value;
    }

    // -------------------------------------------------------------------------
    // Relations
    // -------------------------------------------------------------------------

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    // -------------------------------------------------------------------------
    // Query Scopes
    // -------------------------------------------------------------------------

    public function scopeUnread(Builder $query): Builder
    {
        return $query->whereNull('read_at');
    }

    public function scopeForUser(Builder $query, int $userId): Builder
    {
        return $query->where('user_id', $userId);
    }
}
