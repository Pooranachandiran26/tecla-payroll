<?php
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Mail;
use App\Models\Client;
use App\Models\User;

$user = User::first() ?? User::factory()->create(['role' => 'admin']);
Auth::login($user);

echo "\n--- TEST 1: Change ONLY pan_number (whitelist test) ---\n";
$client = Client::withoutEvents(function () {
    return Client::create([
        'company_name' => 'Evidence Test Corp',
        'client_code' => 'EVC001',
        'industry' => 'Tech',
        'contract_type' => 'agency',
        'contract_start_date' => '2026-01-01',
        'contract_end_date' => '2027-01-01',
        'billing_model' => 'markup',
        'markup_percentage' => 10,
        'status' => 'active',
        'primary_poc_name' => 'Test',
        'primary_poc_email' => 't@t.com',
        'primary_poc_phone' => '1234567890',
        'registered_address_line_1' => '123 Test',
        'registered_city' => 'City',
        'registered_state' => 'State',
        'registered_pin' => '123456',
        'pan_number' => 'OLD_PAN',
        'gstin' => 'OLD_GSTIN'
    ]);
});

DB::enableQueryLog();
Event::fake([
    \App\Events\ClientStatusChanged::class,
    \App\Events\ClientSensitiveFieldChanged::class
]);

$oldWhitelisted = collect($client->getAttributes())->only(Client::NOTIFIABLE_FIELDS)->toArray();
$client->update(['pan_number' => 'NEW_PAN', 'gstin' => 'NEW_GSTIN']);
$newWhitelisted = collect($client->fresh()->getAttributes())->only(Client::NOTIFIABLE_FIELDS)->toArray();

if ($client->wasChanged('status')) {
    Event::dispatch(new \App\Events\ClientStatusChanged($client, 'active', $client->status));
}
$changedWhitelisted = collect($client->getChanges())
    ->only(array_diff(Client::NOTIFIABLE_FIELDS, ['status']))
    ->toArray();

if (!empty($changedWhitelisted)) {
    Event::dispatch(new \App\Events\ClientSensitiveFieldChanged(
        $client,
        collect($oldWhitelisted)->only(array_keys($changedWhitelisted))->toArray(),
        $changedWhitelisted
    ));
}

echo "Events Dispatched:\n";
Event::assertNotDispatched(\App\Events\ClientStatusChanged::class);
Event::assertNotDispatched(\App\Events\ClientSensitiveFieldChanged::class);
echo "Zero sensitive field events dispatched.\n";
echo "Query Log:\n";
foreach (DB::getQueryLog() as $q) {
    if (strpos($q['query'], 'update') !== false) {
        echo $q['query'] . "\nBindings: " . json_encode($q['bindings']) . "\n";
    }
}
DB::disableQueryLog();

echo "\n--- TEST 2: Change a whitelisted field (contract_end_date) ---\n";
$oldWhitelisted = collect($client->getAttributes())->only(Client::NOTIFIABLE_FIELDS)->toArray();
$client->update(['contract_end_date' => '2026-12-31']);
$changedWhitelisted = collect($client->getChanges())
    ->only(array_diff(Client::NOTIFIABLE_FIELDS, ['status']))
    ->toArray();
    
$event2 = new \App\Events\ClientSensitiveFieldChanged(
    $client,
    collect($oldWhitelisted)->only(array_keys($changedWhitelisted))->toArray(),
    $changedWhitelisted
);
echo "Subject: " . $event2->watcherSubject() . "\n";
echo "Body:\n" . $event2->watcherSummary() . "\n";
echo "Context URL: " . $event2->watcherContextUrl() . "\n";

echo "\n--- TEST 3: Soft-delete client with reason ---\n";
$client->deletion_reason = 'Testing deletion tracking';
$client->save();
$client->delete();

$dbReason = DB::select("SELECT deletion_reason FROM clients WHERE id = ?", [$client->id])[0]->deletion_reason;
echo "deletion_reason in DB: " . $dbReason . "\n";

echo "\n--- TEST 4: Restore client email content ---\n";
$eventRestore = new \App\Events\ClientRestored($client, $user);
echo "Subject: " . $eventRestore->watcherSubject() . "\n";
echo "Body:\n" . $eventRestore->watcherSummary() . "\n";
echo "Context URL: " . $eventRestore->watcherContextUrl() . "\n";

$client->forceDelete();
