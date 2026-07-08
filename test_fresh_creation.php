<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

\Illuminate\Support\Facades\DB::statement('SET FOREIGN_KEY_CHECKS=0;');

// Make a valid StoreEmployeeRequest
$request = \Illuminate\Http\Request::create('/employees', 'POST', [
    'clientPartner' => 1,
    'fullName' => 'Real POST Employee',
    'personalEmail' => 'realpost@test.com',
    'phone' => '3333333333',
    'dob' => '1990-01-01',
    'doj' => '2023-01-01',
    'designation' => 'Dev',
    'empType' => 'eor',
    'priorEmploymentFlag' => 0,
    'address' => 'Address',
    'accountNo' => 'BANKPOST123',
    'bankName' => 'HDFC',
    'bankBranch' => 'Mumbai',
    'ifsc' => 'HDFC0000060',
    'accountHolder' => 'Name',
    'pan' => 'ABCDE9999F',
    'uanMode' => 'new',
    'uan' => '100000000000',
    'esiNo' => '1000000000',
    'pfToggle' => true,
    'esiToggle' => true,
    'tdsToggle' => true,
    'ptToggle' => true,
    'lwfToggle' => true,
    'bonusToggle' => true,
    'taxRegime' => 'new',
    'declarations' => 'yes',
    'gratuityMode' => 'part_of_ctc',
    'lopBasis' => '26',
    'basicSal' => 25000,
    'hraSal' => 0,
    'conveyanceSal' => 0,
    'daSal' => 0,
    'medicalSal' => 0,
    'specialSal' => 0,
    'otherSal' => 0,
]);

// Since we are not in a real HTTP request cycle with a logged in user,
// we'll bypass the FormRequest authorization by directly calling validation
$storeRequest = \App\Http\Requests\StoreEmployeeRequest::createFrom($request);
// Mock the user for authorization
$storeRequest->setUserResolver(function () {
    return new \App\Models\User(['role' => 'admin']);
});

// Call prepareForValidation by triggering it manually since we bypass the HTTP kernel
$reflection = new \ReflectionClass($storeRequest);
$method = $reflection->getMethod('prepareForValidation');
$method->setAccessible(true);
$method->invoke($storeRequest);

$validator = \Illuminate\Support\Facades\Validator::make($storeRequest->all(), $storeRequest->rules());
if ($validator->fails()) {
    echo "VALIDATION FAILED:\n";
    print_r($validator->errors()->toArray());
    exit;
}

// Emulate Controller Store
$data = $validator->validated();
$lastEmp = \App\Models\Employee::orderBy('id', 'desc')->first();
$nextId = $lastEmp ? $lastEmp->id + 1 : 1;
$data['employee_code'] = 'TEC-' . str_pad($nextId, 3, '0', STR_PAD_LEFT);
$data['status'] = 'onboarding';
$data['branch_id'] = 1;

$employee = \App\Models\Employee::create($data);

echo "--- FRESH CREATION RAW DB ROW ---\n";
$row = \Illuminate\Support\Facades\DB::select("SELECT id, pan_number, pan_number_hash FROM employees WHERE id = ?", [$employee->id]);
print_r($row[0]);

$employee->forceDelete();
