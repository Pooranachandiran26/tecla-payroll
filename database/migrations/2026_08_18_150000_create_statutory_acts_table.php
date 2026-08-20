<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;
use Database\Seeders\StatutoryActSeeder;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (!Schema::hasTable('statutory_acts')) {
            Schema::create('statutory_acts', function (Blueprint $table) {
                $table->id();
                $table->string('name');
                $table->string('code')->unique();
                $table->text('description')->nullable();
                $table->string('status')->default('active');
                $table->integer('sort_order')->default(0);
                $table->timestamps();
            });
        }

        // Automatically seed the initial 4 Acts if table is empty
        if (DB::table('statutory_acts')->count() === 0) {
            (new StatutoryActSeeder())->run();
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('statutory_acts');
    }
};
