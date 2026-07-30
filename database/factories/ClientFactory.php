<?php

namespace Database\Factories;

use App\Models\Client;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Client>
 */
class ClientFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'company_name' => $this->faker->company(),
            'client_code' => $this->faker->unique()->regexify('[A-Z]{3}[0-9]{3}'),
            'contract_type' => 'eor',
            'contract_start_date' => $this->faker->date(),
            'billing_model' => 'markup',
            'primary_poc_name' => $this->faker->name(),
            'primary_poc_email' => $this->faker->safeEmail(),
            'primary_poc_phone' => $this->faker->phoneNumber(),
            'company_type' => 'pvt_ltd',
            'registered_address_line_1' => $this->faker->streetAddress(),
            'registered_city' => $this->faker->city(),
            'registered_state' => $this->faker->state(),
            'registered_pin' => '400001',
        ];
    }
}
