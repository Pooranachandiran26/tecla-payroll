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

    public function index()
    {
        $employees = \App\Models\Employee::all();
        return \Inertia\Inertia::render('Employees/EmployeesList', [
            'employees' => \App\Http\Resources\EmployeeResource::collection($employees)
        ]);
    }

    public function show($id)
    {
        $employee = \App\Models\Employee::findOrFail($id);
        return \Inertia\Inertia::render('Employees/EmployeeDetail', [
            'employee' => new \App\Http\Resources\EmployeeResource($employee)
        ]);
    }
}
