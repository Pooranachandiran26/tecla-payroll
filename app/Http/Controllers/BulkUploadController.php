<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Services\BulkUploadValidationService;
use Inertia\Inertia;

class BulkUploadController extends Controller
{
    protected $validationService;

    public function __construct(BulkUploadValidationService $validationService)
    {
        $this->validationService = $validationService;
    }

    public function showUploadForm(Request $request)
    {
        if (!in_array($request->user()->role, ['admin', 'manager'])) {
            abort(403, 'Unauthorized');
        }
        $clients = \App\Models\Client::where('status', 'active')->select('id', 'company_name', 'client_code')->get();
        return Inertia::render('Employees/BulkUpload', ['clients' => $clients]);
    }

    public function downloadTemplate(Request $request)
    {
        if (!in_array($request->user()->role, ['admin', 'manager'])) {
            abort(403, 'Unauthorized');
        }

        $request->validate([
            'client_id' => 'required|exists:clients,id'
        ]);

        $client = \App\Models\Client::with('branches')->findOrFail($request->client_id);
        
        $filename = 'Bulk_Upload_Template_' . $client->client_code . '_' . date('Ymd_His') . '.xlsx';
        $tempPath = storage_path('app/temp_bulk_uploads/' . $filename);
        
        if (!is_dir(storage_path('app/temp_bulk_uploads'))) {
            mkdir(storage_path('app/temp_bulk_uploads'), 0755, true);
        }

        $writer = \Spatie\SimpleExcel\SimpleExcelWriter::create($tempPath);
        
        $options = $writer->getWriter()->getOptions();
        if (method_exists($options, 'setColumnWidthForRange')) {
            $options->setColumnWidthForRange(25.0, 1, 40);
        }

        $headerStyle = (new \OpenSpout\Common\Entity\Style\Style())
            ->setFontBold()
            ->setFontSize(11)
            ->setFontColor(\OpenSpout\Common\Entity\Style\Color::WHITE)
            ->setBackgroundColor('1F3864');
        $writer->setHeaderStyle($headerStyle);

        $writer->nameCurrentSheet('Employee Data');
        $writer->addHeader([
            'employee_code', 'full_name', 'client_code', 'branch_name', 'personal_email', 'phone_number',
            'date_of_birth', 'date_of_joining', 'designation', 'employment_model', 'prior_employment_flag',
            'residential_address', 'bank_account_number', 'bank_ifsc', 'bank_name', 'bank_branch',
            'account_holder_name', 'pan_number', 'basic_pay', 'hra', 'conveyance', 'da',
            'medical_allowance', 'special_allowance', 'other_additions', 'pf_applicable',
            'esi_applicable', 'pt_applicable', 'lwf_applicable', 'tds_applicable', 'uan_mode',
            'uan_number', 'esic_number', 'tds_regime', 'gratuity_mode', 'lop_basis_days',
            'declarations_accepted', 'reporting_manager_code'
        ]);

        $writer->addRow([
            'employee_code' => 'EMP101',
            'full_name' => 'Sample Employee',
            'client_code' => $client->client_code,
            'branch_name' => $client->branches->first()?->branch_name ?? 'Main',
            'personal_email' => 'employee@example.com',
            'phone_number' => '9876543210',
            'date_of_birth' => '1995-05-15',
            'date_of_joining' => '2023-01-01',
            'designation' => 'Software Engineer',
            'employment_model' => 'eor',
            'prior_employment_flag' => '0',
            'residential_address' => '123 Tech Park, City',
            'bank_account_number' => '123456789012',
            'bank_ifsc' => 'SBIN0001234',
            'bank_name' => 'State Bank of India',
            'bank_branch' => 'Main Branch',
            'account_holder_name' => 'Sample Employee',
            'pan_number' => 'ABCDE1234F',
            'basic_pay' => '25000',
            'hra' => '10000',
            'conveyance' => '2000',
            'da' => '0',
            'medical_allowance' => '1250',
            'special_allowance' => '5000',
            'other_additions' => '0',
            'pf_applicable' => '1',
            'esi_applicable' => '0',
            'pt_applicable' => '1',
            'lwf_applicable' => '0',
            'tds_applicable' => '0',
            'uan_mode' => 'new',
            'uan_number' => '',
            'esic_number' => '',
            'tds_regime' => 'new',
            'gratuity_mode' => 'part_of_ctc',
            'lop_basis_days' => (string)($client->lop_basis_days ?? '26'),
            'declarations_accepted' => '1',
            'reporting_manager_code' => ''
        ]);

        // Sheet 2: Client Defaults (Read Only)
        $writer->addNewSheetAndMakeItCurrent('Client Defaults (Read Only)');
        $writer->addRow([
            'Setting Field' => 'Client Code',
            'Value' => $client->client_code,
            'Notes' => 'Must match client_code in Employee Data sheet'
        ]);
        $writer->addRow([
            'Setting Field' => 'Company Name',
            'Value' => $client->company_name,
            'Notes' => 'Client legal entity name'
        ]);
        $writer->addRow([
            'Setting Field' => 'Default LOP Basis',
            'Value' => (string)($client->lop_basis_days ?? '26'),
            'Notes' => 'Default monthly calculation basis (26 or 30 days)'
        ]);
        $writer->addRow([
            'Setting Field' => 'PF Default',
            'Value' => $client->pf_applicable ? '1 (YES)' : '0 (NO)',
            'Notes' => 'Inherited if pf_applicable is omitted in row'
        ]);
        $writer->addRow([
            'Setting Field' => 'ESI Default',
            'Value' => $client->esi_applicable ? '1 (YES)' : '0 (NO)',
            'Notes' => 'Inherited if esi_applicable is omitted in row'
        ]);
        $writer->addRow([
            'Setting Field' => 'PT Default',
            'Value' => $client->pt_applicable ? '1 (YES)' : '0 (NO)',
            'Notes' => 'Inherited if pt_applicable is omitted in row'
        ]);
        $writer->addRow([
            'Setting Field' => 'LWF Default',
            'Value' => $client->lwf_applicable ? '1 (YES)' : '0 (NO)',
            'Notes' => 'Inherited if lwf_applicable is omitted in row'
        ]);
        $writer->addRow([
            'Setting Field' => 'TDS Default',
            'Value' => $client->tds_applicable ? '1 (YES)' : '0 (NO)',
            'Notes' => 'Inherited if tds_applicable is omitted in row'
        ]);
        $writer->addRow([
            'Setting Field' => 'Primary Branch State',
            'Value' => $client->branches->first()?->state ?? 'N/A',
            'Notes' => 'State jurisdiction for Professional Tax (PT) slabs'
        ]);
        $writer->addRow([
            'Setting Field' => 'Important Notice',
            'Value' => 'Reference Info — Do Not Edit',
            'Notes' => 'This sheet is for reference only. Fill employee data in the "Employee Data" sheet.'
        ]);

        $writer->close();

        return response()->download($tempPath, $filename)->deleteFileAfterSend(true);
    }
    public function validateUpload(Request $request)
    {
        if (!in_array($request->user()->role, ['admin', 'manager'])) {
            abort(403, 'Unauthorized');
        }

        $request->validate([
            'file' => 'required|file|mimes:csv,txt,xlsx,xls|max:10240', // max 10MB
        ]);

        $file = $request->file('file');
        
        // Store it temporarily
        $extension = $file->getClientOriginalExtension() ?: 'csv';
        $filename = \Illuminate\Support\Str::random(40) . '.' . $extension;
        $file->move(storage_path('app/temp_bulk_uploads'), $filename);
        $fullPath = storage_path('app/temp_bulk_uploads/' . $filename);

        try {
            $results = $this->validationService->validateFile($fullPath);
            
            // Clean up the temp file after reading
            @unlink($fullPath);

            return response()->json($results);
        } catch (\Exception $e) {
            if (file_exists($fullPath)) {
                @unlink($fullPath);
            }
            return response()->json(['error' => 'Failed to parse file: ' . $e->getMessage()], 422);
        }
    }
    public function executeImport(Request $request, \App\Services\AuditService $auditService)
    {
        if (!in_array($request->user()->role, ['admin', 'manager'])) {
            abort(403, 'Unauthorized');
        }

        $request->validate([
            'file' => 'required|file|mimes:csv,txt,xlsx,xls|max:10240',
            'partial_import' => 'boolean'
        ]);

        $file = $request->file('file');
        $partialImport = $request->boolean('partial_import');
        
        $extension = $file->getClientOriginalExtension() ?: 'csv';
        $filename = \Illuminate\Support\Str::random(40) . '.' . $extension;
        $file->move(storage_path('app/temp_bulk_uploads'), $filename);
        $fullPath = storage_path('app/temp_bulk_uploads/' . $filename);

        try {
            // Re-validate to ensure nothing has changed or tampered
            $results = $this->validationService->validateFile($fullPath);
            
            if ($results['error_count'] > 0 && !$partialImport) {
                @unlink($fullPath);
                return response()->json(['error' => 'File contains validation errors.', 'results' => $results], 422);
            }

            if ($results['valid_count'] === 0) {
                @unlink($fullPath);
                return response()->json(['error' => 'No valid rows found to import.'], 422);
            }

            $importedCount = 0;
            $clientImpacts = [];
            $clientIds = [];
            $createdEmployees = [];

            // Wrap in transaction
            \Illuminate\Support\Facades\DB::beginTransaction();

            try {
                foreach ($results['rows'] as $row) {
                    if ($row['status'] === 'error') {
                        continue;
                    }

                    $dbPayload = $row['db_payload'];
                    $employee = \App\Models\Employee::create($dbPayload);
                    $createdEmployees[] = $employee;
                    $importedCount++;

                    $clientId = $employee->client_id;
                    $clientIds[$clientId] = true;

                    if (!isset($clientImpacts[$clientId])) {
                        $clientImpacts[$clientId] = [
                            'client_name' => $row['client'],
                            'employee_count' => 0,
                            'total_ctc' => 0,
                        ];
                    }
                    $clientImpacts[$clientId]['employee_count']++;
                    $clientImpacts[$clientId]['total_ctc'] += $employee->ctc_monthly ?? 0;
                }

                \Illuminate\Support\Facades\DB::commit();

                // Log audit
                $auditService->log(
                    'employee.bulk_imported',
                    $request->user(),
                    null,
                    null,
                    ['count' => $importedCount, 'client_ids' => array_keys($clientIds), 'file_name' => $file->getClientOriginalName()]
                );

                // Provision users for successfully created employees
                $invitationService = app(\App\Services\InvitationService::class);
                foreach ($createdEmployees as $employee) {
                    try {
                        if (!\App\Models\User::where('employee_id', $employee->id)->exists()) {
                            $invitationService->createInvitation([
                                'name' => $employee->full_name,
                                'email' => $employee->personal_email,
                                'role' => 'employee',
                                'employee_id' => $employee->id,
                            ], true); // Force queue
                        }
                    } catch (\Illuminate\Database\QueryException $e) {
                        \Illuminate\Support\Facades\Log::error("Failed to provision user for bulk imported employee {$employee->id} (QueryException): " . $e->getMessage());
                    } catch (\Exception $e) {
                        \Illuminate\Support\Facades\Log::error("Failed to provision user for bulk imported employee {$employee->id}: " . $e->getMessage());
                    }
                }

            } catch (\Exception $e) {
                \Illuminate\Support\Facades\DB::rollBack();
                // Determine failed row for error response
                $failedRow = isset($row['rowNo']) ? $row['rowNo'] : 'unknown';
                
                if (file_exists($fullPath)) {
                    @unlink($fullPath);
                }
                
                return response()->json([
                    'message' => 'Transaction fully rolled back. Zero employees were created.',
                    'failed_row' => $failedRow,
                    'reason' => $e->getMessage(),
                ], 422);
            }

            @unlink($fullPath);

            return response()->json([
                'success' => true,
                'message' => "Successfully imported {$importedCount} employees. User accounts and invitations are being provisioned in the background.",
                'summary' => array_values($clientImpacts),
                'results' => $results,
                'imported_count' => $importedCount,
                'ignored_errors_count' => $results['error_count']
            ]);

        } catch (\Exception $e) {
            if (file_exists($fullPath)) {
                @unlink($fullPath);
            }
            return response()->json(['error' => 'Failed to parse file: ' . $e->getMessage()], 422);
        }
    }
}
