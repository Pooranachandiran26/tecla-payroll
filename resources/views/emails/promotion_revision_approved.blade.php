<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>{{ $revision->is_promotion ? 'Promotion & Salary Revision Letter' : 'Salary Revision Letter' }}</title>
</head>
<body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #1e293b; background-color: #f8fafc; margin: 0; padding: 20px;">
    @php
        $client = $employee->client;
        $companyName = $client->company_name ?? 'Tecla Payroll';
        $logoUrl = null;
        if ($client && !empty($client->logo_path)) {
            if (str_starts_with($client->logo_path, 'data:image') || str_starts_with($client->logo_path, 'http')) {
                $logoUrl = $client->logo_path;
            } else {
                $logoUrl = asset('storage/' . ltrim($client->logo_path, '/'));
            }
        }
        $effectiveDateFormatted = $revision->effective_date ? \Carbon\Carbon::parse($revision->effective_date)->format('F d, Y') : \Carbon\Carbon::now()->format('F d, Y');
        $reasonLabel = match($revision->reason_for_revision) {
            'appraisal' => 'Annual Performance Appraisal',
            'promotion' => 'Role Promotion Adjustment',
            'correction' => 'Statutory Structure Correction',
            default => ucfirst($revision->reason_for_revision)
        };
    @endphp

    <div style="max-width: 650px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.05); border: 1px solid #e2e8f0;">
        
        <!-- Header Branding Bar -->
        <div style="background: linear-gradient(135deg, #1F3864 0%, #0F172A 100%); padding: 24px; text-align: center;">
            @if($logoUrl)
                <div style="margin-bottom: 12px;">
                    <img src="{{ $logoUrl }}" alt="{{ $companyName }}" style="max-height: 55px; max-width: 220px; object-fit: contain; background: #ffffff; padding: 6px 12px; border-radius: 6px; display: inline-block;">
                </div>
            @endif
            <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 700; tracking-wide: 0.5px;">
                {{ $companyName }}
            </h1>
            <p style="color: #94a3b8; margin: 4px 0 0 0; font-size: 13px;">
                Official Human Resources & Compensation Notice
            </p>
        </div>

        <!-- Announcement Banner -->
        @if($revision->is_promotion)
            <div style="background: linear-gradient(135deg, #7E22CE 0%, #6B21A8 100%); padding: 18px 24px; color: #ffffff; text-align: center;">
                <div style="font-size: 26px; margin-bottom: 4px;">🎉 🏆</div>
                <h2 style="margin: 0; font-size: 18px; font-weight: 800; letter-spacing: 0.5px; text-transform: uppercase;">
                    Congratulations on your Promotion!
                </h2>
                <p style="margin: 6px 0 0 0; font-size: 14px; opacity: 0.95;">
                    Promoted to <strong style="color: #fef08a; text-decoration: underline;">{{ $revision->new_designation }}</strong>
                </p>
            </div>
        @else
            <div style="background: linear-gradient(135deg, #1E40AF 0%, #1E3A8A 100%); padding: 16px 24px; color: #ffffff; text-align: center;">
                <h2 style="margin: 0; font-size: 17px; font-weight: 700;">
                    📈 Salary Revision Notice
                </h2>
            </div>
        @endif

        <!-- Body Content -->
        <div style="padding: 28px 24px;">
            <p style="font-size: 15px; margin-top: 0;">
                Dear <strong>{{ $employee->full_name }}</strong> (Employee Code: <code>{{ $employee->employee_code }}</code>),
            </p>

            <p style="font-size: 14px; color: #334155; line-height: 1.6;">
                @if($revision->is_promotion)
                    We are thrilled to acknowledge your hard work, dedication, and leadership. Management has approved your promotion along with a revised compensation structure effective <strong>{{ $effectiveDateFormatted }}</strong>.
                @else
                    Management has reviewed and approved a revision to your monthly salary structure effective <strong>{{ $effectiveDateFormatted }}</strong>.
                @endif
            </p>

            @if(!empty($customNote))
                <div style="background-color: #f0fdf4; border-left: 4px solid #16a34a; border-radius: 0 8px 8px 0; padding: 14px 18px; margin: 18px 0;">
                    <p style="margin: 0; font-size: 12px; font-weight: 700; color: #15803d; text-transform: uppercase; letter-spacing: 0.5px;">
                        💬 Personal Note from Management:
                    </p>
                    <p style="margin: 6px 0 0 0; font-size: 14px; color: #166534; line-height: 1.5; white-space: pre-line;">
                        {{ $customNote }}
                    </p>
                </div>
            @endif

            <!-- Key Highlights Card -->
            <div style="background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 14px 18px; margin: 20px 0; font-size: 13px;">
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td style="padding: 4px 0; color: #64748b;"><strong>Effective Date:</strong></td>
                        <td style="padding: 4px 0; text-align: right; font-weight: bold; color: #0f172a;">{{ $effectiveDateFormatted }}</td>
                    </tr>
                    <tr>
                        <td style="padding: 4px 0; color: #64748b;"><strong>Revision Category:</strong></td>
                        <td style="padding: 4px 0; text-align: right; font-weight: bold; color: #0f172a;">{{ $reasonLabel }}</td>
                    </tr>
                    @if($revision->is_promotion)
                        <tr>
                            <td style="padding: 4px 0; color: #64748b;"><strong>Previous Role:</strong></td>
                            <td style="padding: 4px 0; text-align: right; color: #475569;">{{ $revision->old_designation ?: $employee->designation ?: 'N/A' }}</td>
                        </tr>
                        <tr>
                            <td style="padding: 4px 0; color: #64748b;"><strong>New Role:</strong></td>
                            <td style="padding: 4px 0; text-align: right; font-weight: bold; color: #7e22ce;">{{ $revision->new_designation }}</td>
                        </tr>
                    @endif
                </table>
            </div>

            <!-- Compensation Component Breakdown Table -->
            <h3 style="font-size: 15px; font-weight: 700; color: #1f3864; margin: 24px 0 12px 0; border-bottom: 2px solid #e2e8f0; padding-bottom: 6px;">
                📊 Compensation Structure Comparison
            </h3>

            <table style="width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 24px;">
                <thead>
                    <tr style="background-color: #f1f5f9; color: #475569; text-align: left;">
                        <th style="padding: 10px 12px; border-bottom: 2px solid #cbd5e1; border-radius: 6px 0 0 0;">Component</th>
                        <th style="padding: 10px 12px; border-bottom: 2px solid #cbd5e1; text-align: right;">Previous (Monthly)</th>
                        <th style="padding: 10px 12px; border-bottom: 2px solid #cbd5e1; text-align: right; border-radius: 0 6px 0 0;">Revised (Monthly)</th>
                    </tr>
                </thead>
                <tbody style="color: #334155;">
                    <tr style="border-bottom: 1px solid #f1f5f9;">
                        <td style="padding: 10px 12px;">1. Basic Pay</td>
                        <td style="padding: 10px 12px; text-align: right;">₹{{ number_format((float)$revision->old_basic_pay, 2) }}</td>
                        <td style="padding: 10px 12px; text-align: right; font-weight: bold; color: #0f172a;">₹{{ number_format((float)$revision->new_basic_pay, 2) }}</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #f1f5f9;">
                        <td style="padding: 10px 12px;">2. House Rent Allowance (HRA)</td>
                        <td style="padding: 10px 12px; text-align: right;">₹{{ number_format((float)$revision->old_hra, 2) }}</td>
                        <td style="padding: 10px 12px; text-align: right; font-weight: bold; color: #0f172a;">₹{{ number_format((float)$revision->new_hra, 2) }}</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #f1f5f9;">
                        <td style="padding: 10px 12px;">3. Conveyance Allowance</td>
                        <td style="padding: 10px 12px; text-align: right;">₹{{ number_format((float)$revision->old_conveyance, 2) }}</td>
                        <td style="padding: 10px 12px; text-align: right; font-weight: bold; color: #0f172a;">₹{{ number_format((float)$revision->new_conveyance, 2) }}</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #f1f5f9;">
                        <td style="padding: 10px 12px;">4. Special Allowance</td>
                        <td style="padding: 10px 12px; text-align: right;">₹{{ number_format((float)$revision->old_special_allowance, 2) }}</td>
                        <td style="padding: 10px 12px; text-align: right; font-weight: bold; color: #0f172a;">₹{{ number_format((float)$revision->new_special_allowance, 2) }}</td>
                    </tr>
                    @if((float)$revision->old_other_additions > 0 || (float)$revision->new_other_additions > 0)
                        <tr style="border-bottom: 1px solid #f1f5f9;">
                            <td style="padding: 10px 12px;">5. Other Allowances</td>
                            <td style="padding: 10px 12px; text-align: right;">₹{{ number_format((float)$revision->old_other_additions, 2) }}</td>
                            <td style="padding: 10px 12px; text-align: right; font-weight: bold; color: #0f172a;">₹{{ number_format((float)$revision->new_other_additions, 2) }}</td>
                        </tr>
                    @endif
                    <tr style="background-color: #f8fafc; font-weight: bold; border-top: 2px solid #e2e8f0; border-bottom: 1px solid #e2e8f0;">
                        <td style="padding: 12px; color: #1e3a8a;">Gross Monthly CTC</td>
                        <td style="padding: 12px; text-align: right; color: #64748b;">₹{{ number_format((float)$revision->old_ctc, 2) }}</td>
                        <td style="padding: 12px; text-align: right; color: #1e3a8a; font-size: 14px;">₹{{ number_format((float)$revision->new_ctc, 2) }}</td>
                    </tr>
                    <tr style="background-color: #ecfdf5; font-weight: bold;">
                        <td style="padding: 12px; color: #065f46;">Net Monthly Take-Home (Est.)</td>
                        <td style="padding: 12px; text-align: right; color: #64748b;">₹{{ number_format((float)$revision->old_net_take_home, 2) }}</td>
                        <td style="padding: 12px; text-align: right; color: #047857; font-size: 14px;">₹{{ number_format((float)$revision->new_net_take_home, 2) }}</td>
                    </tr>
                </tbody>
            </table>

            <p style="font-size: 13px; color: #475569; line-height: 1.5; margin-bottom: 24px;">
                All other terms and conditions of your employment contract remain unchanged unless explicitly revised. If you have any questions regarding your revised pay breakdown, please feel free to reach out to the HR / Payroll department.
            </p>

            <div style="border-top: 1px solid #e2e8f0; pt-4; margin-top: 28px; padding-top: 16px;">
                <p style="font-size: 13px; color: #334155; margin: 0;">Warm regards,</p>
                <p style="font-size: 14px; font-weight: 700; color: #1f3864; margin: 4px 0 0 0;">
                    HR & Talent Management Team
                </p>
                <p style="font-size: 12px; color: #64748b; margin: 2px 0 0 0;">
                    {{ $companyName }}
                </p>
            </div>
        </div>

        <!-- Footer -->
        <div style="background-color: #f1f5f9; padding: 16px 24px; text-align: center; border-top: 1px solid #e2e8f0;">
            <p style="font-size: 11px; color: #94a3b8; margin: 0;">
                This is an automated system email generated on behalf of {{ $companyName }}. Please keep this record for your personal files.
            </p>
        </div>
    </div>
</body>
</html>
