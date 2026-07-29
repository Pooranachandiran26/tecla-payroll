<table style="width: 100%; border-collapse: collapse; margin-bottom: 15px;" cellspacing="0" cellpadding="0">
    <tr>
        {{-- Left Box: Employee Summary --}}
        <td style="width: 49%; vertical-align: top;">
            <table class="employee-info-table" style="width: 100%; margin-bottom: 0;">
                <thead>
                    <tr>
                        <th colspan="2" style="text-align: left; padding: 5px 8px; font-size: 10px; text-transform: uppercase; background-color: rgba(0,0,0,0.05); border-bottom: 1px solid #cbd5e1;">
                            Employee Summary
                        </th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td style="width: 40%;" class="meta-label">Employee Code:</td>
                        <td style="width: 60%;" class="meta-val">{{ $employee ? $employee->employee_code : '—' }}</td>
                    </tr>
                    <tr>
                        <td class="meta-label">Employee Name:</td>
                        <td class="meta-val">{{ $employee ? $employee->full_name : '—' }}</td>
                    </tr>
                    <tr>
                        <td class="meta-label">Designation:</td>
                        <td class="meta-val">{{ $employee ? ($employee->designation ?: 'Staff') : '—' }}</td>
                    </tr>
                    @if($visibleSections['show_attendance_summary'] ?? true)
                    <tr>
                        <td class="meta-label">Actual Paid Days:</td>
                        <td class="meta-val">{{ number_format((float)$item->paid_days, 1) }}</td>
                    </tr>
                    <tr>
                        <td class="meta-label">LOP Days:</td>
                        <td class="meta-val">{{ number_format((float)($item->lop_days ?? 0), 1) }}</td>
                    </tr>
                    @endif
                </tbody>
            </table>
        </td>

        <td style="width: 2%;"></td>

        {{-- Right Box: Bank & Statutory Details --}}
        <td style="width: 49%; vertical-align: top;">
            <table class="employee-info-table" style="width: 100%; margin-bottom: 0;">
                <thead>
                    <tr>
                        <th colspan="2" style="text-align: left; padding: 5px 8px; font-size: 10px; text-transform: uppercase; background-color: rgba(0,0,0,0.05); border-bottom: 1px solid #cbd5e1;">
                            Bank & Statutory Details
                        </th>
                    </tr>
                </thead>
                <tbody>
                    @if($visibleSections['show_bank_details'] ?? true)
                    <tr>
                        <td style="width: 40%;" class="meta-label">Bank Name:</td>
                        <td style="width: 60%;" class="meta-val">{{ $employee ? ($employee->bank_name ?: '—') : '—' }}</td>
                    </tr>
                    <tr>
                        <td class="meta-label">Account Number:</td>
                        <td class="meta-val">{{ $employee ? ($employee->bank_account_number ?: '—') : '—' }}</td>
                    </tr>
                    <tr>
                        <td class="meta-label">IFSC Code:</td>
                        <td class="meta-val">{{ $employee ? (isset($employee->bank_ifsc_code) ? ($employee->bank_ifsc_code ?: 'HDFC0001234') : 'HDFC0001234') : '—' }}</td>
                    </tr>
                    @endif
                    @if($visibleSections['show_pf_details'] ?? true)
                    <tr>
                        <td class="meta-label">UAN Number:</td>
                        <td class="meta-val">{{ $employee ? ($employee->uan_number ?: '101234567890') : '101234567890' }}</td>
                    </tr>
                    @endif
                    @if($visibleSections['show_esi_details'] ?? true)
                    <tr>
                        <td class="meta-label">ESI Number:</td>
                        <td class="meta-val">{{ $employee ? ($employee->esi_number ?: '31001234560001001') : '31001234560001001' }}</td>
                    </tr>
                    @endif
                </tbody>
            </table>
        </td>
    </tr>
</table>
