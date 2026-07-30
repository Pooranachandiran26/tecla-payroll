<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use Tests\TestCase;
use App\Models\User;
use App\Models\Employee;
use App\Models\AttendanceRecord;
use App\Models\AttendanceCorrectionRequest;
use Carbon\Carbon;

class AttendanceCorrectionRequestTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        
        $client = \App\Models\Client::factory()->create(['id' => 1]);
        \App\Models\ClientBranch::factory()->create(['id' => 1, 'client_id' => $client->id]);
    }

    private function createEmployeeUser()
    {
        $employee = Employee::factory()->create([
            'bank_account_number' => fake()->unique()->numerify('##########'),
            'pan_number' => fake()->unique()->lexify('?????') . fake()->unique()->numerify('####') . fake()->lexify('?'),
            'aadhaar_number' => fake()->unique()->numerify('############'),
            'uan_number' => fake()->unique()->numerify('############'),
        ]);
        $user = User::factory()->create([
            'role' => 'employee',
            'employee_id' => $employee->id
        ]);
        return $user;
    }

    public function test_correction_request_snapshots_existing_record_correctly()
    {
        $user = $this->createEmployeeUser();
        $date = Carbon::yesterday()->toDateString();
        
        $record = AttendanceRecord::create([
            'employee_id' => $user->employee_id,
            'attendance_date' => $date,
            'punch_in_time' => Carbon::parse($date . ' 09:00:00'),
            'punch_out_time' => Carbon::parse($date . ' 12:00:00'),
            'hours_worked' => 3.0,
            'status' => 'half_day',
            'source' => 'live_punch'
        ]);

        $response = $this->actingAs($user)->post('/employee/attendance/correction-request', [
            'attendance_date' => $date,
            'requested_punch_in_time' => $date . 'T09:00',
            'requested_punch_out_time' => $date . 'T17:00',
            'reason_category' => 'forgot_to_punch_out',
            'reason_details' => 'I forgot to punch out when leaving.'
        ]);

        $response->assertStatus(302);
        $response->assertSessionHas('success');

        $req = AttendanceCorrectionRequest::first();
        $this->assertNotNull($req);
        $this->assertEquals($record->punch_in_time, $req->original_punch_in_time);
        $this->assertEquals($record->punch_out_time, $req->original_punch_out_time);
        $this->assertEquals($record->status, $req->original_status);
    }

    public function test_correction_request_for_missed_day_has_null_originals()
    {
        $user = $this->createEmployeeUser();
        $date = Carbon::yesterday()->toDateString();
        
        // No attendance record created for this date

        $response = $this->actingAs($user)->post('/employee/attendance/correction-request', [
            'attendance_date' => $date,
            'requested_punch_in_time' => $date . 'T09:00',
            'requested_punch_out_time' => $date . 'T17:00',
            'reason_category' => 'forgot_to_punch_in',
            'reason_details' => 'Completely forgot to punch in yesterday.'
        ]);

        $response->assertStatus(302);
        
        $req = AttendanceCorrectionRequest::first();
        $this->assertNull($req->original_punch_in_time);
        $this->assertNull($req->original_punch_out_time);
        $this->assertNull($req->original_status);
    }

    public function test_future_date_is_rejected()
    {
        $user = $this->createEmployeeUser();
        $date = Carbon::tomorrow()->toDateString();
        
        $response = $this->actingAs($user)->post('/employee/attendance/correction-request', [
            'attendance_date' => $date,
            'requested_punch_in_time' => $date . 'T09:00',
            'requested_punch_out_time' => $date . 'T17:00',
            'reason_category' => 'other',
            'reason_details' => 'Future date test.'
        ]);

        $response->assertSessionHasErrors('attendance_date');
        $this->assertEquals(0, AttendanceCorrectionRequest::count());
    }

    public function test_punch_out_before_punch_in_is_rejected()
    {
        $user = $this->createEmployeeUser();
        $date = Carbon::yesterday()->toDateString();
        
        $response = $this->actingAs($user)->post('/employee/attendance/correction-request', [
            'attendance_date' => $date,
            'requested_punch_in_time' => $date . 'T17:00', // After punch out
            'requested_punch_out_time' => $date . 'T09:00',
            'reason_category' => 'other',
            'reason_details' => 'Wrong order test.'
        ]);

        $response->assertSessionHasErrors('requested_punch_out_time');
        $this->assertEquals(0, AttendanceCorrectionRequest::count());
    }

    public function test_second_pending_request_same_date_is_rejected()
    {
        $user = $this->createEmployeeUser();
        $date = Carbon::yesterday()->toDateString();
        
        $response1 = $this->actingAs($user)->post('/employee/attendance/correction-request', [
            'attendance_date' => $date,
            'requested_punch_in_time' => $date . 'T09:00',
            'requested_punch_out_time' => $date . 'T17:00',
            'reason_category' => 'other',
            'reason_details' => 'First valid request.'
        ]);
        
        if (session('errors')) {
            dd(session('errors')->getBag('default')->getMessages());
        }

        $response = $this->actingAs($user)->post('/employee/attendance/correction-request', [
            'attendance_date' => $date,
            'requested_punch_in_time' => $date . 'T09:00',
            'requested_punch_out_time' => $date . 'T18:00',
            'reason_category' => 'other',
            'reason_details' => 'Second conflicting request.'
        ]);



        $response->assertSessionHas('error');
        $this->assertEquals(1, AttendanceCorrectionRequest::count());
    }

    public function test_attendance_records_table_unchanged_after_submission()
    {
        $user = $this->createEmployeeUser();
        $date = Carbon::yesterday()->toDateString();
        
        $record = AttendanceRecord::create([
            'employee_id' => $user->employee_id,
            'attendance_date' => $date,
            'punch_in_time' => Carbon::parse($date . ' 09:00:00'),
            'punch_out_time' => Carbon::parse($date . ' 12:00:00'),
            'hours_worked' => 3.0,
            'status' => 'half_day',
            'source' => 'live_punch'
        ]);

        // Capture state before request
        $countBefore = AttendanceRecord::count();
        $recordBefore = $record->toArray();

        $this->actingAs($user)->post('/employee/attendance/correction-request', [
            'attendance_date' => $date,
            'requested_punch_in_time' => $date . 'T09:00',
            'requested_punch_out_time' => $date . 'T17:00', // Submitting an 8 hour day
            'reason_category' => 'forgot_to_punch_out',
            'reason_details' => 'I forgot to punch out when leaving.'
        ]);

        // Capture state after request
        $countAfter = AttendanceRecord::count();
        $record->refresh();
        $recordAfter = $record->toArray();

        // 100% UNCHANGED check
        $this->assertEquals($countBefore, $countAfter, "Total AttendanceRecord count should not change");
        $this->assertEquals($recordBefore['punch_in_time'], $recordAfter['punch_in_time'], "Punch in time must be untouched");
        $this->assertEquals($recordBefore['punch_out_time'], $recordAfter['punch_out_time'], "Punch out time must be untouched");
        $this->assertEquals($recordBefore['hours_worked'], $recordAfter['hours_worked'], "Hours worked must be untouched");
        $this->assertEquals($recordBefore['status'], $recordAfter['status'], "Status must be untouched");
        
        $this->assertEquals(1, AttendanceCorrectionRequest::count());
    }
}
