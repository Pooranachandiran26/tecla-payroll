<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use Illuminate\Support\Facades\Log;

class LogRequestsMiddleware
{
    public function handle(Request $request, Closure $next): Response
    {
        Log::info('INCOMING REQUEST: ' . $request->method() . ' ' . $request->path(), $request->all());
        
        $response = $next($request);
        
        Log::info('RESPONSE: ' . $response->getStatusCode(), ['content' => substr($response->getContent(), 0, 500)]);
        return $response;
    }
}
