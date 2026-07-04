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
        return [
            'id' => $this->id,
            'company_name' => $this->company_name,
            'client_code' => $this->client_code,
            'industry' => $this->industry,
            'contract_type' => $this->contract_type,
            'status' => $this->status,
            'primary_poc_name' => $this->primary_poc_name,
            'primary_poc_email' => $this->primary_poc_email,
            'primary_poc_phone' => $this->primary_poc_phone,
            'company_type' => $this->company_type,
            'country' => $this->country,
            'registered_city' => $this->registered_city,
            'registered_state' => $this->registered_state,
            'contract_start_date' => $this->contract_start_date,
            'contract_end_date' => $this->contract_end_date,
            'pan_number' => DataMasker::maskIdentityNumber($this->pan_number),
            'gstin' => DataMasker::maskIdentityNumber($this->gstin),
        ];
    }
}
