<?php

namespace App\Services;

use App\Models\Employee;
use App\Models\Client;
use App\Services\SettingsService;

class StatutoryFilingResolutionService
{
    /**
     * Resolve registration details for a specific employee and statute ('pf' or 'esi').
     */
    public function resolveStatuteForEmployee(Employee $employee, string $statute): array
    {
        $statute = strtolower($statute);
        $model = $employee->employment_model; // 'eor' or 'agency_contract'
        $client = $employee->client;

        if ($model === 'eor') {
            $filingEntity = 'client';
            $code = null;
            if ($client) {
                $rawCode = $statute === 'esi' ? $client->esi_code_number : $client->pf_establishment_code;
                $code = !empty($rawCode) ? $rawCode : null;
            }

            $isResolved = !empty($code);
            $missingReason = null;
            if (!$isResolved) {
                $clientName = $client ? $client->company_name : 'Unknown Client';
                $statuteLabel = strtoupper($statute);
                $missingReason = "Client '{$clientName}' has no {$statuteLabel} Establishment/Code configured.";
            }

            return [
                'code' => $code,
                'filing_entity' => $filingEntity,
                'is_resolved' => $isResolved,
                'missing_reason' => $missingReason,
            ];
        } else {
            // 'agency_contract'
            $filingEntity = 'agency';
            $settingKey = $statute === 'esi' ? 'company_profile.esi_code_number' : 'company_profile.pf_establishment_code';
            $rawCode = SettingsService::get($settingKey);
            $code = !empty($rawCode) ? $rawCode : null;

            $isResolved = !empty($code);
            $missingReason = null;
            if (!$isResolved) {
                $statuteLabel = strtoupper($statute);
                $missingReason = "Tecla Agency (Settings) has no {$statuteLabel} Establishment/Code configured.";
            }

            return [
                'code' => $code,
                'filing_entity' => $filingEntity,
                'is_resolved' => $isResolved,
                'missing_reason' => $missingReason,
            ];
        }
    }

    /**
     * Resolve registration details for all statutes ('pf' and 'esi') for an employee.
     */
    public function resolveRegistrationForEmployee(Employee $employee): array
    {
        return [
            'pf' => $this->resolveStatuteForEmployee($employee, 'pf'),
            'esi' => $this->resolveStatuteForEmployee($employee, 'esi'),
        ];
    }

    /**
     * Resolve registration aggregated status for a client and statute across its active employees.
     */
    public function resolveClientRegistrationStatus(Client $client, string $statute): array
    {
        $activeEmployees = $client->employees()->where('status', 'active')->get();

        $totalUnresolved = 0;
        $clientUnresolvedCount = 0;
        $agencyUnresolvedCount = 0;
        $clientReason = null;
        $agencyReason = null;

        foreach ($activeEmployees as $emp) {
            $res = $this->resolveStatuteForEmployee($emp, $statute);
            if (!$res['is_resolved']) {
                $totalUnresolved++;
                if ($res['filing_entity'] === 'client') {
                    $clientUnresolvedCount++;
                    if (!$clientReason) {
                        $clientReason = $res['missing_reason'];
                    }
                } else if ($res['filing_entity'] === 'agency') {
                    $agencyUnresolvedCount++;
                    if (!$agencyReason) {
                        $agencyReason = $res['missing_reason'];
                    }
                }
            }
        }

        return [
            'is_fully_resolved' => ($totalUnresolved === 0),
            'total_unresolved_employees' => $totalUnresolved,
            'breakdown' => [
                'client' => [
                    'unresolved_count' => $clientUnresolvedCount,
                    'reason' => $clientReason,
                ],
                'agency' => [
                    'unresolved_count' => $agencyUnresolvedCount,
                    'reason' => $agencyReason,
                ],
            ],
        ];
    }
}
