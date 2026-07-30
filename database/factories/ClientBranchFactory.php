<?php

namespace Database\Factories;

use App\Models\ClientBranch;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ClientBranch>
 */
class ClientBranchFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'client_id' => 1,
            'branch_name' => 'Main Branch',
            'branch_code' => 'MB-01',
            'state' => 'Maharashtra',
            'city' => 'Mumbai',
            'address_line_1' => 'Test Address',
            'gstin' => '27AAPFU0939F1Z5',
        ];
    }
}
