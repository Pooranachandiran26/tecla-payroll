<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. Add nullable FK columns if they don't exist
        Schema::table('clients', function (Blueprint $table) {
            if (!Schema::hasColumn('clients', 'industry_id')) {
                $table->foreignId('industry_id')->nullable()->after('industry')
                      ->constrained('mas_industries')->nullOnDelete();
            }
        });

        Schema::table('employees', function (Blueprint $table) {
            if (!Schema::hasColumn('employees', 'designation_id')) {
                $table->foreignId('designation_id')->nullable()->after('designation')
                      ->constrained('mas_designations')->nullOnDelete();
            }
        });

        Schema::table('employee_exits', function (Blueprint $table) {
            if (!Schema::hasColumn('employee_exits', 'exit_reason_id')) {
                $table->foreignId('exit_reason_id')->nullable()->after('reason_category')
                      ->constrained('mas_exit_reasons')->nullOnDelete();
            }
        });

        Schema::table('salary_revisions', function (Blueprint $table) {
            if (!Schema::hasColumn('salary_revisions', 'new_designation_id')) {
                $table->foreignId('new_designation_id')->nullable()->after('new_designation')
                      ->constrained('mas_designations')->nullOnDelete();
            }
        });

        // 2. Auto-insert unmapped live values into master tables (with TRIM + case-insensitive matching)
        
        // A. mas_industries
        $seededIndustries = DB::table('mas_industries')->get();
        $liveIndustries = DB::table('clients')
            ->whereNotNull('industry')
            ->where('industry', '!=', '')
            ->pluck('industry')
            ->unique();

        $maxIndSort = (int)(DB::table('mas_industries')->max('sort_order') ?? 0);
        foreach ($liveIndustries as $rawInd) {
            $trimmed = trim($rawInd);
            if (empty($trimmed)) continue;

            $exists = $seededIndustries->first(function ($item) use ($trimmed) {
                return strtolower(trim($item->name)) === strtolower($trimmed);
            });

            if (!$exists) {
                $maxIndSort++;
                $newId = DB::table('mas_industries')->insertGetId([
                    'name' => $trimmed,
                    'slug' => Str::slug($trimmed) ?: 'ind-' . $maxIndSort,
                    'is_active' => true,
                    'sort_order' => $maxIndSort,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
                $seededIndustries->push((object)['id' => $newId, 'name' => $trimmed]);
            }
        }

        // B. mas_designations
        $seededDesigs = DB::table('mas_designations')->get();
        $liveDesigs = DB::table('employees')
            ->whereNotNull('designation')
            ->where('designation', '!=', '')
            ->pluck('designation')
            ->unique();

        $maxDesigSort = (int)(DB::table('mas_designations')->max('sort_order') ?? 0);
        foreach ($liveDesigs as $rawDesig) {
            $trimmed = trim($rawDesig);
            if (empty($trimmed)) continue;

            $exists = $seededDesigs->first(function ($item) use ($trimmed) {
                return strtolower(trim($item->name)) === strtolower($trimmed);
            });

            if (!$exists) {
                $maxDesigSort++;
                $newId = DB::table('mas_designations')->insertGetId([
                    'name' => $trimmed,
                    'department_name' => 'General',
                    'is_active' => true,
                    'sort_order' => $maxDesigSort,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
                $seededDesigs->push((object)['id' => $newId, 'name' => $trimmed]);
            }
        }

        // C. mas_exit_reasons
        $seededExitReasons = DB::table('mas_exit_reasons')->get();
        $liveExits = DB::table('employee_exits')
            ->whereNotNull('reason_category')
            ->where('reason_category', '!=', '')
            ->get(['id', 'exit_type', 'reason_category']);

        $maxExitSort = (int)(DB::table('mas_exit_reasons')->max('sort_order') ?? 0);
        foreach ($liveExits as $exit) {
            $trimmed = trim($exit->reason_category);
            if (empty($trimmed)) continue;

            $exists = $seededExitReasons->first(function ($item) use ($trimmed) {
                return strtolower(trim($item->name)) === strtolower($trimmed);
            });

            if (!$exists) {
                $maxExitSort++;
                $category = $exit->exit_type ?: 'Resignation';
                $newId = DB::table('mas_exit_reasons')->insertGetId([
                    'name' => $trimmed,
                    'exit_type_category' => $category,
                    'triggers_forfeiture_review' => (strtolower($trimmed) === 'conduct / policy violation'),
                    'is_active' => true,
                    'sort_order' => $maxExitSort,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
                $seededExitReasons->push((object)['id' => $newId, 'name' => $trimmed]);
            }
        }

        // 3. Map string values → IDs on existing records
        
        // Map clients.industry -> industry_id
        $freshIndustries = DB::table('mas_industries')->get();
        foreach (DB::table('clients')->whereNotNull('industry')->where('industry', '!=', '')->get(['id', 'industry']) as $client) {
            $trimmed = trim($client->industry);
            $match = $freshIndustries->first(fn($i) => strtolower(trim($i->name)) === strtolower($trimmed));
            if ($match) {
                DB::table('clients')->where('id', $client->id)->update(['industry_id' => $match->id]);
            }
        }

        // Map employees.designation -> designation_id
        $freshDesigs = DB::table('mas_designations')->get();
        foreach (DB::table('employees')->whereNotNull('designation')->where('designation', '!=', '')->get(['id', 'designation']) as $emp) {
            $trimmed = trim($emp->designation);
            $match = $freshDesigs->first(fn($d) => strtolower(trim($d->name)) === strtolower($trimmed));
            if ($match) {
                DB::table('employees')->where('id', $emp->id)->update(['designation_id' => $match->id]);
            }
        }

        // Map employee_exits.reason_category -> exit_reason_id
        $freshExitReasons = DB::table('mas_exit_reasons')->get();
        foreach (DB::table('employee_exits')->whereNotNull('reason_category')->where('reason_category', '!=', '')->get(['id', 'reason_category']) as $exit) {
            $trimmed = trim($exit->reason_category);
            $match = $freshExitReasons->first(fn($r) => strtolower(trim($r->name)) === strtolower($trimmed));
            if ($match) {
                DB::table('employee_exits')->where('id', $exit->id)->update(['exit_reason_id' => $match->id]);
            }
        }

        // Map salary_revisions.new_designation -> new_designation_id
        foreach (DB::table('salary_revisions')->whereNotNull('new_designation')->where('new_designation', '!=', '')->get(['id', 'new_designation']) as $rev) {
            $trimmed = trim($rev->new_designation);
            $match = $freshDesigs->first(fn($d) => strtolower(trim($d->name)) === strtolower($trimmed));
            if ($match) {
                DB::table('salary_revisions')->where('id', $rev->id)->update(['new_designation_id' => $match->id]);
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('salary_revisions', function (Blueprint $table) {
            if (Schema::hasColumn('salary_revisions', 'new_designation_id')) {
                $table->dropForeign(['new_designation_id']);
                $table->dropColumn('new_designation_id');
            }
        });

        Schema::table('employee_exits', function (Blueprint $table) {
            if (Schema::hasColumn('employee_exits', 'exit_reason_id')) {
                $table->dropForeign(['exit_reason_id']);
                $table->dropColumn('exit_reason_id');
            }
        });

        Schema::table('employees', function (Blueprint $table) {
            if (Schema::hasColumn('employees', 'designation_id')) {
                $table->dropForeign(['designation_id']);
                $table->dropColumn('designation_id');
            }
        });

        Schema::table('clients', function (Blueprint $table) {
            if (Schema::hasColumn('clients', 'industry_id')) {
                $table->dropForeign(['industry_id']);
                $table->dropColumn('industry_id');
            }
        });
    }
};
