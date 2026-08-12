<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Factories\HasFactory;

use App\Traits\BlameableTrait;

class ClientBranch extends Model
{
    use SoftDeletes, HasFactory, BlameableTrait;
    protected $guarded = [];
}
