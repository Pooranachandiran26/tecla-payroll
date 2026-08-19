<?php

namespace App\Http\Controllers;

use App\Models\Client;
use App\Models\Holiday;
use Carbon\Carbon;
use Illuminate\Http\Request;

class ClientHolidayController extends Controller
{
    private function authorizeClientAccess(int $clientId): void
    {
        if (!auth()->user()->isManagerForClient($clientId)) {
            abort(403, 'Unauthorized access to this client\'s data.');
        }
    }

    /**
     * Store a new holiday for a client.
     */
    public function store(Request $request, $clientId)
    {
        $this->authorizeClientAccess((int)$clientId);

        $client = Client::findOrFail($clientId);

        $validated = $request->validate([
            'holiday_date' => 'required|date',
            'name' => 'required|string|min:3|max:255',
            'is_optional' => 'nullable|boolean',
        ]);

        $holidayDate = Carbon::parse($validated['holiday_date'])->toDateString();

        // ════════════════════════════════════════════════════════════════
        // DUPLICATE DATE PROTECTION: Clean validation error, no raw SQL exception
        // ════════════════════════════════════════════════════════════════
        $existing = Holiday::where('client_id', $client->id)
            ->whereDate('holiday_date', $holidayDate)
            ->exists();

        if ($existing) {
            return redirect()->back()->withErrors([
                'holiday_date' => "A holiday already exists for this client on date {$holidayDate}."
            ]);
        }

        Holiday::create([
            'client_id' => $client->id,
            'holiday_date' => $holidayDate,
            'name' => $validated['name'],
            'is_optional' => (bool) ($validated['is_optional'] ?? false),
        ]);

        return redirect()->back()->with('success', "Holiday '{$validated['name']}' added successfully for {$client->company_name}.");
    }

    /**
     * Delete a holiday for a client.
     */
    public function destroy(Request $request, $clientId, $id)
    {
        $this->authorizeClientAccess((int)$clientId);

        $holiday = Holiday::where('client_id', $clientId)->findOrFail($id);
        $holidayName = $holiday->name;
        $holiday->delete();

        return redirect()->back()->with('success', "Holiday '{$holidayName}' deleted successfully.");
    }
}
