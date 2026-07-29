<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Payslip - {{ $employee ? $employee->full_name : '' }} - {{ $formattedMonth }}</title>
    <style>
        body {
            @if(($visibleSections['font_family'] ?? '') === 'Georgia')
                font-family: Georgia, 'Times New Roman', serif !important;
            @elseif(($visibleSections['font_family'] ?? '') === 'Courier New')
                font-family: 'Courier New', Courier, monospace !important;
            @elseif(($visibleSections['font_family'] ?? '') === 'Arial')
                font-family: Arial, sans-serif !important;
            @else
                font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif !important;
            @endif

            @if(($visibleSections['font_size'] ?? '') === 'small')
                font-size: 9px !important;
            @elseif(($visibleSections['font_size'] ?? '') === 'large')
                font-size: 13px !important;
            @endif
        }
        @php $tplKey = $templateKey ?? 'standard'; @endphp
        @if(view()->exists("pdf.styles.{$tplKey}"))
            @include("pdf.styles.{$tplKey}")
        @else
            @include("pdf.styles.standard")
        @endif
    </style>
</head>
<body class="tpl-{{ $tplKey }}">

    <table class="header-table">
        <tr>
            <td style="width: 70%;">
                @if(($visibleSections['show_logo'] ?? true) && !empty($logoUrl))
                    <img src="{{ $logoUrl }}" style="max-height: 40px; margin-bottom: 5px;" /><br/>
                @endif
                <div class="company-name">{{ $displayName }}</div>
                @if($visibleSections['show_organisation_address'] ?? true)
                    <div class="company-address">{{ $companyAddress }}</div>
                @endif
            </td>
            <td style="width: 30%; text-align: right;">
                <div class="payslip-title">Salary Payslip</div>
                <div style="font-size: 10px; color: #64748B;">{{ $formattedMonth }}</div>
            </td>
        </tr>
    </table>

    {{-- Shared Employee Info Partial --}}
    @include('pdf.partials.employee_info')

    @if(!empty($item->is_correction))
    <div style="background-color: #EFF6FF; border: 1px solid #BFDBFE; color: #1E40AF; padding: 6px 10px; font-weight: bold; font-size: 10px; margin-bottom: 12px; border-radius: 3px;">
        📌 Payroll Adjustment / Correction: {{ $item->correction_reason }}
    </div>
    @endif

    @if($midCycleNote)
    <div class="split-box">
        ↳ {{ $midCycleNote }}
    </div>
    @endif

    {{-- Shared Salary Components Math Partial --}}
    @include('pdf.partials.salary_components')

    <table class="net-pay-box" style="width: 100%;">
        <tr>
            <td style="width: 50%;" class="net-amount">
                Net Pay: ₹{{ number_format(round((float)$item->net_pay), 2) }}
            </td>
            <td style="width: 50%;" class="net-words">
                @if($visibleSections['show_net_in_words'] ?? true)
                    ({{ $netPayWords }})
                @endif
            </td>
        </tr>
    </table>

    @if($visibleSections['show_signature_details'] ?? true)
    <table style="width: 100%; margin-top: 30px; margin-bottom: 10px;">
        <tr>
            <td style="width: 50%;"></td>
            <td style="width: 50%; text-align: right;">
                <div style="border-bottom: 1px solid #334155; width: 150px; display: inline-block; margin-bottom: 4px;"></div>
                <div style="font-size: 9px; font-weight: bold; color: #334155;">Authorized Signatory</div>
            </td>
        </tr>
    </table>
    @endif

    <div class="footer-note">
        This is a computer-generated Payslip. Signature is not required.
    </div>

</body>
</html>
