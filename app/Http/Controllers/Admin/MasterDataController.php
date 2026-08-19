<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Str;

class MasterDataController extends Controller
{
    /**
     * Strict Registry Mapping for all mas_ master entities
     */
    protected $registry = [
        'industries' => [
            'label'  => 'Industries',
            'model'  => \App\Models\Masters\MasIndustry::class,
            'fields' => ['name', 'slug', 'sort_order', 'is_active'],
            'rules'  => ['name' => 'required|string|max:100', 'slug' => 'nullable|string|max:50'],
            'icon'   => 'Building2',
        ],
        'leave_types' => [
            'label'  => 'Leave Types',
            'model'  => \App\Models\Masters\MasLeaveType::class,
            'fields' => ['name', 'code', 'is_paid', 'default_accrual', 'sort_order', 'is_active'],
            'rules'  => ['name' => 'required|string|max:100', 'code' => 'nullable|string|max:50', 'is_paid' => 'boolean', 'default_accrual' => 'numeric|min:0'],
            'icon'   => 'CalendarDays',
        ],
        'document_types' => [
            'label'  => 'Document Types',
            'model'  => \App\Models\Masters\MasDocumentType::class,
            'fields' => ['name', 'code', 'target_entity', 'icon', 'sort_order', 'is_active'],
            'rules'  => ['name' => 'required|string|max:100', 'code' => 'nullable|string|max:50', 'target_entity' => 'required|in:client,employee,both', 'icon' => 'nullable|string'],
            'icon'   => 'FileText',
        ],
        'loan_types' => [
            'label'  => 'Loan / Advance Types',
            'model'  => \App\Models\Masters\MasLoanType::class,
            'fields' => ['name', 'code', 'sort_order', 'is_active'],
            'rules'  => ['name' => 'required|string|max:100', 'code' => 'nullable|string|max:50'],
            'icon'   => 'Banknote',
        ],
        'exit_reasons' => [
            'label'  => 'Exit Reasons',
            'model'  => \App\Models\Masters\MasExitReason::class,
            'fields' => ['name', 'exit_type_category', 'triggers_forfeiture_review', 'sort_order', 'is_active'],
            'rules'  => ['name' => 'required|string|max:100', 'exit_type_category' => 'required|string', 'triggers_forfeiture_review' => 'boolean'],
            'icon'   => 'UserX',
        ],
        'query_categories' => [
            'label'  => 'Query Categories',
            'model'  => \App\Models\Masters\MasQueryCategory::class,
            'fields' => ['name', 'code', 'sort_order', 'is_active'],
            'rules'  => ['name' => 'required|string|max:100', 'code' => 'nullable|string|max:50'],
            'icon'   => 'MessageSquare',
        ],
        'clearance_items' => [
            'label'  => 'Exit Clearance Items',
            'model'  => \App\Models\Masters\MasClearanceItem::class,
            'fields' => ['name', 'default_department', 'sort_order', 'is_active'],
            'rules'  => ['name' => 'required|string|max:100', 'default_department' => 'required|string'],
            'icon'   => 'CheckSquare',
        ],
        'designations' => [
            'label'  => 'Designations',
            'model'  => \App\Models\Masters\MasDesignation::class,
            'fields' => ['name', 'department_name', 'sort_order', 'is_active'],
            'rules'  => ['name' => 'required|string|max:100', 'department_name' => 'nullable|string'],
            'icon'   => 'Briefcase',
        ],
        'report_types' => [
            'label'  => 'Report Types',
            'model'  => \App\Models\Masters\MasReportType::class,
            'fields' => ['name', 'category', 'sort_order', 'is_active'],
            'rules'  => ['name' => 'required|string|max:100', 'category' => 'required|string'],
            'icon'   => 'BarChart3',
        ],
    ];

    /**
     * Render the Master Management dashboard page
     */
    public function index(Request $request)
    {
        $user = $request->user();
        if (!in_array($user->role, ['admin', 'manager'])) {
            abort(403, 'Unauthorized');
        }

        $activeKey = $request->query('key', 'industries');
        if (!isset($this->registry[$activeKey])) {
            $activeKey = 'industries';
        }

        $config = $this->registry[$activeKey];
        $modelClass = $config['model'];
        
        $search = $request->query('search');
        $query = $modelClass::orderBy('sort_order', 'asc')->orderBy('id', 'asc');
        
        if ($search) {
            $query->where(function($q) use ($search, $config) {
                $q->where('name', 'like', "%{$search}%");
                if (in_array('code', $config['fields'])) $q->orWhere('code', 'like', "%{$search}%");
                if (in_array('slug', $config['fields'])) $q->orWhere('slug', 'like', "%{$search}%");
                if (in_array('department_name', $config['fields'])) $q->orWhere('department_name', 'like', "%{$search}%");
                if (in_array('default_department', $config['fields'])) $q->orWhere('default_department', 'like', "%{$search}%");
                if (in_array('exit_type_category', $config['fields'])) $q->orWhere('exit_type_category', 'like', "%{$search}%");
            });
        }

        $items = $query->paginate(10)->withQueryString();

        $meta = [];
        foreach ($this->registry as $k => $v) {
            $meta[$k] = [
                'key'   => $k,
                'label' => $v['label'],
                'icon'  => $v['icon'],
                'count' => ($v['model'])::count(),
            ];
        }

        return Inertia::render('Admin/MasterManagement', [
            'active_key' => $activeKey,
            'items'      => $items,
            'registry'   => $meta,
            'schema'     => [
                'fields' => $config['fields'],
                'rules'  => $config['rules'],
            ],
        ]);
    }

    /**
     * API Endpoint: Get active items by key
     */
    public function getApiData(string $key)
    {
        if (!isset($this->registry[$key])) {
            return response()->json(['error' => 'Invalid master key'], 400);
        }

        $modelClass = $this->registry[$key]['model'];
        $items = $modelClass::where('is_active', true)->orderBy('sort_order', 'asc')->get();

        return response()->json($items);
    }

    /**
     * Store new master record
     */
    public function store(Request $request, string $key)
    {
        if (!in_array($request->user()->role, ['admin', 'manager'])) {
            abort(403, 'Unauthorized');
        }

        if (!isset($this->registry[$key])) {
            return back()->with('error', 'Invalid master key.');
        }

        $config = $this->registry[$key];
        $validated = $request->validate($config['rules']);

        $modelClass = $config['model'];
        
        // Auto-generate unique slug/code
        if (in_array('slug', $config['fields'])) {
            $slugBase = Str::slug($validated['slug'] ?? $validated['name']);
            if (empty($slugBase)) $slugBase = 'item';
            $slug = $slugBase;
            $count = 1;
            while ($modelClass::where('slug', $slug)->exists()) {
                $slug = $slugBase . '-' . $count;
                $count++;
            }
            $validated['slug'] = $slug;
        }

        if (in_array('code', $config['fields'])) {
            $codeBase = strtoupper(Str::slug($validated['code'] ?? $validated['name'], '_'));
            if (empty($codeBase)) $codeBase = 'ITEM';
            $code = $codeBase;
            $count = 1;
            while ($modelClass::where('code', $code)->exists()) {
                $code = $codeBase . '_' . $count;
                $count++;
            }
            $validated['code'] = $code;
        }

        if (in_array('sort_order', $config['fields']) && !$request->has('sort_order')) {
            $maxSort = $modelClass::max('sort_order') ?? 0;
            $validated['sort_order'] = $maxSort + 1;
        }

        $modelClass::create($validated);

        return back()->with('success', "New record added to {$config['label']} successfully.");
    }

    /**
     * Update master record
     */
    public function update(Request $request, string $key, int $id)
    {
        if (!in_array($request->user()->role, ['admin', 'manager'])) {
            abort(403, 'Unauthorized');
        }

        if (!isset($this->registry[$key])) {
            return back()->with('error', 'Invalid master key.');
        }

        $config = $this->registry[$key];
        $modelClass = $config['model'];
        $item = $modelClass::findOrFail($id);

        $rules = $config['rules'];
        $validated = $request->validate($rules);

        // Auto-generate unique slug/code on update if changed
        if (in_array('slug', $config['fields'])) {
            $slugBase = Str::slug($validated['slug'] ?? $validated['name']);
            if (empty($slugBase)) $slugBase = 'item';
            $slug = $slugBase;
            $count = 1;
            while ($modelClass::where('slug', $slug)->where('id', '!=', $id)->exists()) {
                $slug = $slugBase . '-' . $count;
                $count++;
            }
            $validated['slug'] = $slug;
        }

        if (in_array('code', $config['fields'])) {
            $codeBase = strtoupper(Str::slug($validated['code'] ?? $validated['name'], '_'));
            if (empty($codeBase)) $codeBase = 'ITEM';
            $code = $codeBase;
            $count = 1;
            while ($modelClass::where('code', $code)->where('id', '!=', $id)->exists()) {
                $code = $codeBase . '_' . $count;
                $count++;
            }
            $validated['code'] = $code;
        }

        $item->update($validated);

        return back()->with('success', "Record updated in {$config['label']} successfully.");
    }

    /**
     * Toggle active/inactive status
     */
    public function toggleActive(Request $request, string $key, int $id)
    {
        if (!in_array($request->user()->role, ['admin', 'manager'])) {
            abort(403, 'Unauthorized');
        }

        if (!isset($this->registry[$key])) {
            return back()->with('error', 'Invalid master key.');
        }

        $config = $this->registry[$key];
        $modelClass = $config['model'];
        $item = $modelClass::findOrFail($id);

        $item->is_active = !$item->is_active;
        $item->save();

        $statusText = $item->is_active ? 'activated' : 'deactivated';
        return back()->with('success', "Record {$statusText} successfully.");
    }
}
