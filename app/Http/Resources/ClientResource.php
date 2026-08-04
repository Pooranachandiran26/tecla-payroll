<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

use App\Services\DataMasker;

class ClientResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $data = parent::toArray($request);
        
        // Add counts & audit details
        $data['employees_count'] = $this->whenCounted('employees');
        $data['creator_name'] = $this->relationLoaded('creator') && $this->creator 
            ? $this->creator->name 
            : ($this->entry_source === 'bulk_upload' ? 'Bulk Upload' : ($this->created_by ? 'User #' . $this->created_by : 'System'));
        $data['entry_source'] = $this->entry_source ?: 'manual';
        
        return $data;
    }
}
