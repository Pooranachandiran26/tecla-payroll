<?php

namespace App\Models\Masters;

use Illuminate\Database\Eloquent\Model;

class MasDocumentType extends Model
{
    protected $table = 'mas_document_types';

    protected $fillable = [
        'name',
        'code',
        'target_entity',
        'icon',
        'is_active',
        'sort_order',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'sort_order' => 'integer',
    ];
}
