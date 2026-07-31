<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;

class AccountProfileController extends Controller
{
    /**
     * Display the authenticated user's profile.
     */
    public function show(Request $request)
    {
        $user = $request->user();

        // Redirect role-specific profile pages if defined
        if ($user->role === 'employee' && \Route::has('employee.profile')) {
            return redirect()->route('employee.profile');
        }

        if ($user->role === 'client' && \Route::has('client.profile')) {
            return redirect()->route('client.profile');
        }

        return Inertia::render('Account/Profile', [
            'profileUser' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'phone' => $user->phone ?? '',
                'role' => $user->role,
                'status' => $user->status,
                'email_verified_at' => $user->email_verified_at ? $user->email_verified_at->format('M d, Y H:i') : 'Unverified',
                'created_at' => $user->created_at ? $user->created_at->format('M d, Y') : '',
            ],
        ]);
    }

    /**
     * Update the authenticated user's profile info.
     */
    public function update(Request $request)
    {
        $user = $request->user();

        $validated = $request->validate([
            'name' => 'required|string|max:100',
            'email' => 'required|email|max:150|unique:users,email,' . $user->id,
        ]);

        $user->name = $validated['name'];
        $user->email = $validated['email'];
        $user->save();

        return back()->with('success', 'Profile information updated successfully!');
    }
}
