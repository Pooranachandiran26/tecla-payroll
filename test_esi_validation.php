<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

class TestRequest extends \App\Http\Requests\UpdateEmployeeRequest {
    public function authorize(): bool { return true; }
}

$request = new TestRequest();
$request->merge([
    'esiToggle' => 'false',
    'esic_number' => '',
]);

$request->setContainer(app());
try {
    $request->validateResolved();
    echo "Passed!";
} catch (\Illuminate\Validation\ValidationException $e) {
    print_r($e->errors());
} catch (\Exception $e) {
    echo $e->getMessage();
}
