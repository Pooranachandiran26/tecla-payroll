<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Services\SalaryCalculationService;

class EmployeeController extends Controller
{
    public function calculatePreview(Request $request, SalaryCalculationService $calculator)
    {
        $calculations = $calculator->calculateStructuralSalary($request->all());
        return response()->json($calculations);
    }
}
