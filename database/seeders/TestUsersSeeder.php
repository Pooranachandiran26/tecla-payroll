<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class TestUsersSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $users = [
            [
                'email' => 'admin@tecla.in',
                'name' => 'Rajesh (Admin)',
                'role' => 'admin',
                'status' => 'active',
                'must_change_password' => false,
                'email_verified_at' => now(),
            ],
            [
                'email' => 'manager@tecla.in',
                'name' => 'Sunita (Manager)',
                'role' => 'manager',
                'status' => 'active',
                'must_change_password' => false,
                'email_verified_at' => now(),
            ],
            [
                'email' => 'client@tecla.in',
                'name' => 'Mahindra Corp (Client)',
                'role' => 'client',
                'client_id' => \App\Models\Client::first()?->id,
                'status' => 'active',
                'must_change_password' => false,
                'email_verified_at' => now(),
            ],
            [
                'email' => 'employee@tecla.in',
                'name' => 'Aarav Sharma (Employee)',
                'role' => 'employee',
                'employee_id' => \App\Models\Employee::first()?->id,
                'status' => 'active',
                'must_change_password' => false,
                'email_verified_at' => now(),
            ],
        ];

        $this->command->info("--- GENERATED TEST USER PASSWORDS ---");
        
        foreach ($users as $userData) {
            $plainPassword = bin2hex(random_bytes(16));
            $userData['password'] = \Illuminate\Support\Facades\Hash::make($plainPassword);
            
            \App\Models\User::updateOrCreate(
                ['email' => $userData['email']],
                $userData
            );
            
            $this->command->info(sprintf("%-20s : %s", $userData['email'], $plainPassword));
        }
        
        $this->command->info("-------------------------------------");
    }
}
