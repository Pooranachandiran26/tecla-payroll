<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->enum('role', ['admin','manager','client','employee'])->default('employee')->after('password');
            $table->foreignId('employee_id')->nullable()->constrained('employees')->nullOnDelete()->after('role');
            $table->foreignId('client_id')->nullable()->constrained('clients')->nullOnDelete()->after('employee_id');
            $table->enum('status', ['active','suspended','invited','locked'])->default('invited')->after('client_id');
            $table->string('recovery_email')->nullable()->after('status');
            $table->unsignedTinyInteger('failed_login_attempts')->default(0)->after('recovery_email');
            $table->timestamp('locked_until')->nullable()->after('failed_login_attempts');
            $table->timestamp('password_changed_at')->nullable()->after('locked_until');
            $table->boolean('must_change_password')->default(true)->after('password_changed_at');
            $table->timestamp('last_login_at')->nullable()->after('must_change_password');
            $table->string('last_login_ip', 45)->nullable()->after('last_login_at');
            $table->string('invitation_token', 64)->nullable()->unique()->after('last_login_ip');
            $table->timestamp('invitation_expires_at')->nullable()->after('invitation_token');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropForeign(['employee_id']);
            $table->dropForeign(['client_id']);
            $table->dropColumn([
                'role', 'employee_id', 'client_id', 'status', 'recovery_email',
                'failed_login_attempts', 'locked_until', 'password_changed_at',
                'must_change_password', 'last_login_at', 'last_login_ip',
                'invitation_token', 'invitation_expires_at'
            ]);
        });
    }
};
