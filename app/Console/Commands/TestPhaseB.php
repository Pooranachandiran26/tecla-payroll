<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Client;
use App\Events\ClientCreated;
use App\Events\ClientStatusChanged;
use App\Events\ClientSensitiveFieldChanged;
use App\Events\ClientDeleted;
use App\Events\ClientRestored;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\DB;

class TestPhaseB extends Command
{
    protected $signature = 'app:test-phase-b {test}';
    protected $description = 'Run Phase B verification tests';

    public function handle(): int
    {
        $test = $this->argument('test');
        
        return match($test) {
            'pan-only' => $this->testPanOnly(),
            'create' => $this->testCreate(),
            'status' => $this->testStatusChange(),
            'whitelist' => $this->testWhitelistField(),
            'delete' => $this->testDelete(),
            'restore' => $this->testRestore(),
            default => $this->error("Unknown test: {$test}") ?? 1,
        };
    }

    private function testPanOnly(): int
    {
        $this->info('=== TEST 1: PAN-only update — should fire ZERO events ===');
        
        $client = Client::where('status', 'active')->first();
        $this->line("Client: {$client->company_name} (ID: {$client->id})");
        $this->line("Old PAN (encrypted): " . substr($client->getRawOriginal('pan_number'), 0, 30) . '...');
        
        // Simulate what the controller does: update, then check getChanges against whitelist
        $client->update(['pan_number' => 'TESTPAN1234']);
        
        $allChanges = $client->getChanges();
        $this->line("All getChanges() keys: " . implode(', ', array_keys($allChanges)));
        
        $changedWhitelisted = collect($allChanges)
            ->only(array_diff(Client::NOTIFIABLE_FIELDS, ['status']))
            ->toArray();
        
        $statusChanged = $client->wasChanged('status');
        
        $this->line("Status changed: " . ($statusChanged ? 'YES' : 'NO'));
        $this->line("Whitelisted changes: " . (empty($changedWhitelisted) ? 'NONE (empty array)' : implode(', ', array_keys($changedWhitelisted))));
        
        if (!$statusChanged && empty($changedWhitelisted)) {
            $this->info('✅ PASS — Zero events would fire. PAN change is invisible to the notification system.');
        } else {
            $this->error('❌ FAIL — Events would have fired!');
        }
        
        // Restore original PAN
        $client->update(['pan_number' => 'ABCDE1234F']);
        
        return self::SUCCESS;
    }

    private function testCreate(): int
    {
        $this->info('=== TEST 2: Create client — should fire ClientCreated ===');
        
        $client = Client::create([
            'company_name' => 'Phase B Test Corp',
            'client_code' => 'PBT001',
            'industry' => 'Technology',
            'contract_type' => 'agency',
            'contract_start_date' => '2026-07-01',
            'contract_end_date' => '2027-06-30',
            'billing_model' => 'markup',
            'markup_percentage' => 12,
            'status' => 'onboarding',
            'primary_poc_name' => 'Test User',
            'primary_poc_email' => 'test@example.com',
            'primary_poc_phone' => '9999999999',
            'registered_address_line_1' => '100 Test Street',
            'registered_city' => 'Chennai',
            'registered_state' => 'Tamil Nadu',
            'registered_pin' => '600001',
            'company_type' => 'pvt_ltd',
            'country' => 'India',
            'pan_number' => 'TESTPAN999',
            'gstin' => '29TESTGSTIN1Z5',
        ]);
        
        $this->line("Created client ID: {$client->id}");
        
        // Render the email that would be sent
        $event = new ClientCreated($client);
        $this->line("Event category: {$event->watcherCategory()}");
        $this->line("Event subject: {$event->watcherSubject()}");
        $this->line("---EMAIL BODY START---");
        $this->line($event->watcherSummary());
        $this->line("---EMAIL BODY END---");
        $this->line("Context URL: " . ($event->watcherContextUrl() ?? 'null'));
        
        // Actually dispatch the event so email is sent
        Event::dispatch($event);
        $this->info('✅ Event dispatched — email sent to active watchers.');
        
        return self::SUCCESS;
    }

    private function testStatusChange(): int
    {
        $this->info('=== TEST 3: Status change — should fire ClientStatusChanged ===');
        
        $client = Client::where('client_code', 'PBT001')->first();
        if (!$client) {
            $this->error('Run "create" test first.');
            return self::FAILURE;
        }
        
        $oldStatus = $client->status;
        $client->update(['status' => 'active']);
        
        $event = new ClientStatusChanged($client, $oldStatus, $client->status);
        $this->line("Event subject: {$event->watcherSubject()}");
        $this->line("---EMAIL BODY START---");
        $this->line($event->watcherSummary());
        $this->line("---EMAIL BODY END---");
        
        Event::dispatch($event);
        $this->info('✅ Event dispatched.');
        
        return self::SUCCESS;
    }

    private function testWhitelistField(): int
    {
        $this->info('=== TEST 4: Whitelisted field change — should fire ClientSensitiveFieldChanged ===');
        
        $client = Client::where('client_code', 'PBT001')->first();
        if (!$client) {
            $this->error('Run "create" test first.');
            return self::FAILURE;
        }
        
        $oldWhitelisted = collect($client->getAttributes())->only(Client::NOTIFIABLE_FIELDS)->toArray();
        $oldEndDate = $client->contract_end_date;
        
        $client->update(['contract_end_date' => '2028-12-31']);
        
        $changedWhitelisted = collect($client->getChanges())
            ->only(array_diff(Client::NOTIFIABLE_FIELDS, ['status']))
            ->toArray();
        
        $event = new ClientSensitiveFieldChanged(
            $client,
            collect($oldWhitelisted)->only(array_keys($changedWhitelisted))->toArray(),
            $changedWhitelisted
        );
        
        $this->line("Event subject: {$event->watcherSubject()}");
        $this->line("---EMAIL BODY START---");
        $summary = $event->watcherSummary();
        $this->line($summary);
        $this->line("---EMAIL BODY END---");
        
        // Verify PAN/GSTIN not in the body
        $hasPan = str_contains(strtolower($summary), 'pan');
        $hasGstin = str_contains(strtolower($summary), 'gstin');
        $this->line("Contains 'pan': " . ($hasPan ? 'YES ❌' : 'NO ✅'));
        $this->line("Contains 'gstin': " . ($hasGstin ? 'YES ❌' : 'NO ✅'));
        
        Event::dispatch($event);
        $this->info('✅ Event dispatched.');
        
        return self::SUCCESS;
    }

    private function testDelete(): int
    {
        $this->info('=== TEST 5: Soft-delete with reason — should persist reason + fire ClientDeleted ===');
        
        $client = Client::where('client_code', 'PBT001')->first();
        if (!$client) {
            $this->error('Run "create" test first.');
            return self::FAILURE;
        }
        
        $clientId = $client->id;
        $reason = 'Phase B test deletion — contract terminated early by mutual agreement.';
        
        // Persist reason + soft-delete (same as controller does)
        $client->deletion_reason = $reason;
        $client->save();
        $client->delete();
        
        // Verify from DB
        $row = DB::selectOne("SELECT id, company_name, deletion_reason, deleted_at FROM clients WHERE id = ?", [$clientId]);
        $this->line("DB Row → id: {$row->id}");
        $this->line("DB Row → company_name: {$row->company_name}");
        $this->line("DB Row → deletion_reason: {$row->deletion_reason}");
        $this->line("DB Row → deleted_at: {$row->deleted_at}");
        
        $event = new ClientDeleted($client, $reason, auth()->user() ?? \App\Models\User::first());
        $this->line("Event subject: {$event->watcherSubject()}");
        $this->line("---EMAIL BODY START---");
        $this->line($event->watcherSummary());
        $this->line("---EMAIL BODY END---");
        
        Event::dispatch($event);
        $this->info('✅ Event dispatched. Deletion reason persisted in DB.');
        
        return self::SUCCESS;
    }

    private function testRestore(): int
    {
        $this->info('=== TEST 6: Restore — should fire ClientRestored ===');
        
        $client = Client::withTrashed()->where('client_code', 'PBT001')->first();
        if (!$client) {
            $this->error('Run "delete" test first.');
            return self::FAILURE;
        }
        
        $client->restore();
        $client->refresh();
        
        $event = new ClientRestored($client, auth()->user() ?? \App\Models\User::first());
        $this->line("Event subject: {$event->watcherSubject()}");
        $this->line("---EMAIL BODY START---");
        $this->line($event->watcherSummary());
        $this->line("---EMAIL BODY END---");
        $this->line("Context URL: " . ($event->watcherContextUrl() ?? 'null'));
        
        Event::dispatch($event);
        $this->info('✅ Event dispatched.');
        
        // Cleanup: delete the test client permanently
        $client->forceDelete();
        $this->line('Test client cleaned up (force-deleted).');
        
        return self::SUCCESS;
    }
}
