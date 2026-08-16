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
        
        // Calculate onboarding step progress details
        $completedSteps = $this->onboarding_completed_steps;
        if (is_string($completedSteps)) {
            $completedSteps = json_decode($completedSteps, true);
        }
        $completedCount = 0;
        if (is_array($completedSteps)) {
            foreach ($completedSteps as $step => $done) {
                if ($done) $completedCount++;
            }
        }
        if ($this->status === 'active') {
            $completedCount = 8;
        }

        $data['employees_count'] = $this->whenCounted('employees');
        $data['creator_name'] = $this->relationLoaded('creator') && $this->creator 
            ? $this->creator->name 
            : ($this->entry_source === 'bulk_upload' ? 'Bulk Upload' : ($this->created_by ? 'User #' . $this->created_by : 'System'));
        $data['entry_source'] = $this->entry_source ?: 'manual';
        $data['onboarding_current_step'] = $this->onboarding_current_step ?: 1;
        $data['onboarding_completed_steps'] = is_array($completedSteps) ? $completedSteps : [];
        $data['completed_sections_count'] = $completedCount;
        $data['completion_percentage'] = round(($completedCount / 8) * 100);
        
        return $data;
    }
}
