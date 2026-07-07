<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Client extends Model
{
    use HasFactory, SoftDeletes;
    protected $guarded = [];

    protected $casts = [
        'pan_number' => 'encrypted',
        'gstin' => 'encrypted',
    ];

    public function contacts()
    {
        return $this->hasMany(ClientContact::class);
    }

    public function branches()
    {
        return $this->hasMany(ClientBranch::class);
    }

    public function documents()
    {
        return $this->hasMany(ClientDocument::class);
    }

    public function accountManager()
    {
        return $this->belongsTo(User::class, 'account_manager_id');
    }

    public function backupAccountManager()
    {
        return $this->belongsTo(User::class, 'backup_account_manager_id');
    }

    public function employees()
    {
        return $this->hasMany(Employee::class);
    }

    public function users()
    {
        return $this->hasMany(User::class);
    }
}
