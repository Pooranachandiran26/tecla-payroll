<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use Jenssegers\Agent\Agent;

class SessionController extends Controller
{
    public function ownSessions(Request $request)
    {
        $sessions = DB::table('sessions')
            ->where('user_id', Auth::id())
            ->orderBy('last_activity', 'desc')
            ->get()
            ->map(function ($session) use ($request) {
                $agent = new Agent();
                $agent->setUserAgent($session->user_agent);

                return [
                    'id' => $session->id,
                    'ip_address' => $session->ip_address,
                    'is_current_device' => $session->id === $request->session()->getId(),
                    'last_active' => \Carbon\Carbon::createFromTimestamp($session->last_activity)->diffForHumans(),
                    'browser' => $agent->browser(),
                    'platform' => $agent->platform(),
                ];
            });

        return Inertia::render('Account/Sessions', [
            'sessions' => $sessions
        ]);
    }

    public function revokeOwn(Request $request, $id)
    {
        $session = DB::table('sessions')->where('id', $id)->where('user_id', Auth::id())->first();
        if ($session) {
            app(\App\Services\AuditService::class)->log('session_revoked', Auth::user(), Auth::user(), null, null, ['session_id' => $id, 'ip_address' => $session->ip_address]);
            DB::table('sessions')->where('id', $id)->delete();
        }

        return back()->with('message', 'Session revoked.');
    }

    public function allSessions(Request $request)
    {
        $sessions = DB::table('sessions')
            ->join('users', 'sessions.user_id', '=', 'users.id')
            ->select('sessions.*', 'users.name', 'users.email')
            ->orderBy('sessions.last_activity', 'desc')
            ->get()
            ->map(function ($session) {
                $agent = new Agent();
                $agent->setUserAgent($session->user_agent);

                return [
                    'id' => $session->id,
                    'user_id' => $session->user_id,
                    'name' => $session->name,
                    'email' => $session->email,
                    'ip_address' => $session->ip_address,
                    'last_active' => \Carbon\Carbon::createFromTimestamp($session->last_activity)->toDateTimeString(),
                    'browser' => $agent->browser(),
                    'platform' => $agent->platform(),
                ];
            });

        return Inertia::render('Admin/Sessions', [
            'sessions' => $sessions
        ]);
    }

    public function revokeAny(Request $request, $id)
    {
        $session = DB::table('sessions')->where('id', $id)->first();
        if ($session) {
            $user = \App\Models\User::find($session->user_id);
            if ($user) {
                app(\App\Services\AuditService::class)->log('session_revoked', Auth::user(), $user, null, null, ['session_id' => $id, 'ip_address' => $session->ip_address]);
            }
            DB::table('sessions')->where('id', $id)->delete();
        }

        return back()->with('message', 'Session revoked successfully.');
    }

    public function bulkRevoke(Request $request)
    {
        $request->validate(['ids' => 'required|array']);

        foreach ($request->ids as $id) {
            $this->revokeAny($request, $id);
        }

        return back()->with('message', 'Sessions revoked successfully.');
    }
}
