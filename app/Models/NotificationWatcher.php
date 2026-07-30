<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class NotificationWatcher extends Model
{
    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'categories' => 'array',
        ];
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
