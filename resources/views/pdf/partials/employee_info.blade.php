<table class="employee-info-table">
    <tr>
        <td style="width: 20%;" class="meta-label">Employee Code:</td>
        <td style="width: 30%;" class="meta-val">{{ $employee ? $employee->employee_code : '—' }}</td>
        <td style="width: 20%;" class="meta-label">Employee Name:</td>
        <td style="width: 30%;" class="meta-val">{{ $employee ? $employee->full_name : '—' }}</td>
    </tr>
    <tr>
        <td class="meta-label">Designation:</td>
        <td class="meta-val">{{ $employee ? ($employee->designation ?: 'Staff') : '—' }}</td>
        @if($visibleSections['show_bank_details'] ?? true)
        <td class="meta-label">Bank Account:</td>
        <td class="meta-val">{{ $employee ? ($employee->bank_account_number ?: '—') : '—' }}</td>
        @else
        <td class="meta-label">Actual Paid Days:</td>
        <td class="meta-val">{{ number_format((float)$item->paid_days, 1) }}</td>
        @endif
    </tr>
    <tr>
        @if($visibleSections['show_bank_details'] ?? true)
        <td class="meta-label">Bank Name:</td>
        <td class="meta-val">{{ $employee ? ($employee->bank_name ?: '—') : '—' }}</td>
        @else
        <td class="meta-label">LOP Days:</td>
        <td class="meta-val">{{ number_format((float)($item->lop_days ?? 0), 1) }}</td>
        @endif
        @if($visibleSections['show_attendance_summary'] ?? true)
        <td class="meta-label">Actual Paid Days:</td>
        <td class="meta-val">{{ number_format((float)$item->paid_days, 1) }} @if(!empty($item->lop_days) && (float)$item->lop_days > 0)(LOP: {{ number_format((float)$item->lop_days, 1) }})@endif</td>
        @else
        <td class="meta-label">IFSC Code:</td>
        <td class="meta-val">{{ $employee ? (isset($employee->bank_ifsc_code) ? ($employee->bank_ifsc_code ?: '—') : '—') : '—' }}</td>
        @endif
    </tr>
    @if(($visibleSections['show_pf_details'] ?? true) || ($visibleSections['show_esi_details'] ?? true))
    <tr>
        @if($visibleSections['show_pf_details'] ?? true)
        <td class="meta-label">UAN Number:</td>
        <td class="meta-val">{{ $employee ? ($employee->uan_number ?: '—') : '—' }}</td>
        @else
        <td class="meta-label"></td><td class="meta-val"></td>
        @endif
        @if($visibleSections['show_esi_details'] ?? true)
        <td class="meta-label">ESI Number:</td>
        <td class="meta-val">{{ $employee ? ($employee->esi_number ?: '—') : '—' }}</td>
        @else
        <td class="meta-label"></td><td class="meta-val"></td>
        @endif
    </tr>
    @endif
</table>
