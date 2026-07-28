<?php

namespace App\Services;

use App\Models\PayrollRunItem;
use App\Models\Employee;
use App\Models\Client;
use App\Models\SalaryRevision;
use Barryvdh\DomPDF\Facade\Pdf;
use Carbon\Carbon;

class PayslipPdfService
{
    /**
     * Generate raw PDF binary bytes for a given payroll run item.
     *
     * @param PayrollRunItem $item
     * @return string
     */
    public function generatePdfBinary(PayrollRunItem $item): string
    {
        $employee = Employee::find($item->employee_id);
        $run = $item->payrollRun;
        $client = Client::find($run->client_id);

        // Resolve branding
        $isEor = $employee && $employee->employment_model === 'eor';
        $displayName = "TECLA AGENCY PRIVATE LIMITED";
        $companyAddress = "Mumbai, Maharashtra | GST: 27AABCM1234N1ZQ";
        $accentColor = "#1F3864";
        $logoUrl = null;

        if ($isEor && $client) {
            $displayName = $client->display_name_override ?: $client->company_name;
            $cityState = array_filter([$client->registered_city, $client->registered_state]);
            $gstinText = $client->gstin ? "GST: {$client->gstin}" : '';
            $companyAddress = implode(' | ', array_filter([implode(', ', $cityState), $gstinText]));
            if ($client->accent_color) {
                $accentColor = $client->accent_color;
            }
            if ($client->logo_path) {
                $logoUrl = $client->logo_path;
            }
        }

        // Mid-cycle revision split handling
        $midCycleNote = null;
        if ($item->salary_revision_applied) {
            $mStart = Carbon::parse($run->payroll_month)->startOfMonth();
            $mEnd = Carbon::parse($run->payroll_month)->endOfMonth();

            $rev = SalaryRevision::where('employee_id', $employee->id)
                ->where('status', 'approved')
                ->whereBetween('effective_date', [$mStart->toDateString(), $mEnd->toDateString()])
                ->first();

            if ($rev) {
                $eff = Carbon::parse($rev->effective_date)->startOfDay();
                $daysBefore = (int)round($mStart->diffInDays($eff));
                $daysAfter = (int)round($eff->diffInDays($mEnd) + 1);

                $oldRate = (float)(
                    ($rev->old_basic_pay ?? 0) +
                    ($rev->old_hra ?? 0) +
                    ($rev->old_conveyance ?? 0) +
                    ($rev->old_da ?? 0) +
                    ($rev->old_medical_allowance ?? 0) +
                    ($rev->old_special_allowance ?? 0) +
                    ($rev->old_other_additions ?? 0)
                );
                $newRate = (float)(
                    ($rev->new_basic_pay ?? 0) +
                    ($rev->new_hra ?? 0) +
                    ($rev->new_conveyance ?? 0) +
                    ($rev->new_da ?? 0) +
                    ($rev->new_medical_allowance ?? 0) +
                    ($rev->new_special_allowance ?? 0) +
                    ($rev->new_other_additions ?? 0)
                );

                $basePay = (float)$item->gross_total;
                $midCycleNote = "Mid-Cycle Split: {$daysBefore} days @ old rate (₹" . number_format($oldRate, 0) . "/mo) + {$daysAfter} days @ new rate (₹" . number_format($newRate, 0) . "/mo) = ₹" . number_format($basePay, 0) . " this month base";
            } elseif (!empty($item->warning_notes) && str_contains($item->warning_notes, 'Mid-Cycle Split')) {
                $parts = explode(' | ', $item->warning_notes);
                foreach ($parts as $p) {
                    if (str_contains($p, 'Mid-Cycle Split')) {
                        $midCycleNote = $p;
                    }
                }
            }
        }

        $netPayWords = $this->numberToEnglishWords((int)round((float)$item->net_pay));
        $formattedMonth = Carbon::parse($run->payroll_month)->format('F Y');

        $data = [
            'item' => $item,
            'employee' => $employee,
            'run' => $run,
            'client' => $client,
            'displayName' => $displayName,
            'companyAddress' => $companyAddress,
            'accentColor' => $accentColor,
            'logoUrl' => $logoUrl,
            'midCycleNote' => $midCycleNote,
            'netPayWords' => $netPayWords,
            'formattedMonth' => $formattedMonth,
        ];

        if (class_exists('Barryvdh\DomPDF\Facade\Pdf')) {
            $pdf = \Barryvdh\DomPDF\Facade\Pdf::loadView('pdf.payslip', $data);
            $pdf->setPaper('A4', 'portrait');
            return $pdf->output();
        }

        return view('pdf.payslip', $data)->render();
    }

    private function numberToEnglishWords(int $num): string
    {
        if ($num === 0) return 'Rupees Zero Only';

        $a = [
            '', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
            'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'
        ];
        $b = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

        $g = function ($n) use ($a, $b) {
            if ($n < 20) return $a[$n];
            $digit = $n % 10;
            return $b[(int)floor($n / 10)] . ($digit ? '-' . $a[$digit] : '');
        };

        $h = function ($n) use ($a, $g) {
            if ($n < 100) return $g($n);
            $rest = $n % 100;
            return $a[(int)floor($n / 100)] . ' hundred' . ($rest ? ' and ' . $g($rest) : '');
        };

        $convert = function ($n) use ($h) {
            if ($n < 1000) return $h($n);
            $thousands = (int)floor($n / 1000);
            $rest = $n % 1000;
            return $h($thousands) . ' thousand' . ($rest ? ' ' . $h($rest) : '');
        };

        $words = $convert($num);
        return 'Rupees ' . ucfirst($words) . ' Only';
    }
}
