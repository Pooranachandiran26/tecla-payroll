<?php

use App\Http\Middleware\HandleInertiaRequests;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        $middleware->web(append: [
            \App\Http\Middleware\LogRequestsMiddleware::class,
            \App\Http\Middleware\HandleInertiaRequests::class,
            \Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets::class,
            \App\Http\Middleware\SecurityHeaders::class,
        ]);
        
        $middleware->redirectGuestsTo(fn () => route('login'));
        
        $middleware->alias([
            'role' => \App\Http\Middleware\EnsureUserRole::class,
            'fresh-password' => \App\Http\Middleware\RequireFreshPassword::class,
            'active' => \App\Http\Middleware\EnsureUserActive::class,
            'module' => \App\Http\Middleware\EnsureModulePermission::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->respond(function ($response, \Throwable $e, \Illuminate\Http\Request $request) {
            if ($response->getStatusCode() === 403) {
                return \Inertia\Inertia::render('Error', [
                    'status' => 403,
                    'title' => '403 — Access Forbidden',
                    'message' => $e->getMessage() ?: 'You do not have permission to access this page or module.',
                ])
                ->toResponse($request)
                ->setStatusCode(403);
            }

            return $response;
        });
    })->create();
