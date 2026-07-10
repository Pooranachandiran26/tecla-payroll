<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Inertia\Inertia;
use App\Services\PasswordService;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;

class ForcePasswordChangeController extends Controller
{
    public function __construct(protected PasswordService $passwordService) {}

    public function show()
    {
        return Inertia::render('Auth/ForcePasswordChange', [
            'passwordPolicyRules' => $this->passwordService->getPolicyRules()
        ]);
    }

    public function update(Request $request)
    {
        $request->validate([
            'password' => ['required', 'confirmed', $this->passwordService->buildValidationRules()]
        ]);

        $user = Auth::user();

        if (!$this->passwordService->checkHistory($user, $request->password)) {
            return back()->withErrors(['password' => 'Cannot reuse a recent password.']);
        }

        $hash = Hash::make($request->password);
        $user->update([
            'password' => $hash,
            'password_changed_at' => now(),
            'must_change_password' => false,
        ]);

        $this->passwordService->recordHistory($user, $hash);

        // Redirect based on role
        if (in_array($user->role, ['admin', 'manager'])) return redirect('/dashboard');
        if ($user->role === 'client') return redirect('/client/dashboard');
        return redirect('/employee/dashboard');
    }
}
