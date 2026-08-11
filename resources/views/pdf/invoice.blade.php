<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Tax Invoice - {{ $invoice->invoice_number }}</title>
    <style>
        body {
            font-family: DejaVu Sans, sans-serif;
            font-size: 10px;
            color: #1e293b;
            margin: 0;
            padding: 15px;
            background-color: #ffffff;
        }
        .header-table {
            width: 100%;
            border-bottom: 2px solid #1F3864;
            padding-bottom: 10px;
            margin-bottom: 15px;
        }
        .company-name {
            font-size: 16px;
            font-weight: bold;
            color: #1F3864;
            text-transform: uppercase;
        }
        .company-address {
            font-size: 9.5px;
            color: #475569;
            margin-top: 3px;
        }
        .invoice-title {
            font-size: 18px;
            font-weight: bold;
            color: #1F3864;
            text-align: right;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        .meta-table {
            width: 100%;
            margin-bottom: 15px;
            border-collapse: collapse;
        }
        .meta-box {
            width: 49%;
            vertical-align: top;
            background-color: #f8fafc;
            border: 1px solid #cbd5e1;
            padding: 10px;
            border-radius: 4px;
        }
        .meta-label {
            color: #64748b;
            font-size: 9px;
            font-weight: bold;
            text-transform: uppercase;
        }
        .meta-val {
            font-weight: bold;
            color: #0f172a;
            font-size: 10.5px;
        }
        .items-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 15px;
        }
        .items-table th {
            background-color: #1F3864;
            color: #ffffff;
            padding: 8px;
            font-size: 9.5px;
            text-transform: uppercase;
            border: 1px solid #1F3864;
        }
        .items-table td {
            border: 1px solid #cbd5e1;
            padding: 7px 9px;
            font-size: 10px;
        }
        .tax-summary-table {
            width: 100%;
            margin-bottom: 15px;
            border-collapse: collapse;
        }
        .grand-total-box {
            background-color: #eff6ff;
            border: 1px solid #bfdbfe;
            border-left: 4px solid #1F3864;
            padding: 10px 14px;
            margin-bottom: 15px;
        }
        .grand-total-val {
            font-size: 16px;
            font-weight: bold;
            color: #1F3864;
        }
        .bank-terms-table {
            width: 100%;
            margin-top: 15px;
            border-collapse: collapse;
        }
        .bank-box {
            width: 49%;
            vertical-align: top;
            font-size: 9.5px;
            background-color: #f8fafc;
            border: 1px solid #e2e8f0;
            padding: 8px 10px;
        }
        .footer-note {
            text-align: center;
            font-size: 8.5px;
            color: #94a3b8;
            margin-top: 20px;
            border-top: 1px solid #f1f5f9;
            padding-top: 6px;
        }
    </style>
</head>
<body>

    <!-- Header Table -->
    <table class="header-table">
        <tr>
            <td style="width: 60%;">
                @if(!empty($logoUrl))
                    <img src="{{ $logoUrl }}" style="max-height: 45px; margin-bottom: 5px;" /><br/>
                @endif
                <div class="company-name">{{ $issuerName }}</div>
                <div class="company-address">{{ $issuerAddress }}</div>
                <div class="company-address"><strong>GSTIN:</strong> {{ $issuerGstin }}</div>
            </td>
            <td style="width: 40%; text-align: right; vertical-align: top;">
                <div class="invoice-title">Tax Invoice</div>
                <div style="font-size: 11px; font-weight: bold; color: #475569; margin-top: 4px;">{{ $invoice->invoice_number }}</div>
                <div style="font-size: 9.5px; color: #64748b; margin-top: 2px;">Billing Month: {{ $formattedMonth }}</div>
            </td>
        </tr>
    </table>

    <!-- Billed From & Billed To Section -->
    <table class="meta-table" cellspacing="0" cellpadding="0">
        <tr>
            <td class="meta-box" style="margin-right: 2%;">
                <div style="font-weight: bold; color: #1F3864; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; margin-bottom: 6px;">
                    BILLED TO (CLIENT DETAILS)
                </div>
                <div class="meta-val">{{ $billedToName }} ({{ $billedToCode }})</div>
                <div style="margin-top: 3px; font-size: 9.5px; color: #334155;">
                    <strong>Registered Address:</strong> {{ $billedToAddress }}
                </div>
                <div style="margin-top: 3px; font-size: 9.5px; color: #334155;">
                    <strong>Branch:</strong> {{ $branchName }} @if($billedToGstin) | <strong>GSTIN:</strong> {{ $billedToGstin }} @endif
                </div>
            </td>
            <td style="width: 2%;"></td>
            <td class="meta-box">
                <div style="font-weight: bold; color: #1F3864; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; margin-bottom: 6px;">
                    INVOICE METADATA
                </div>
                <table style="width: 100%; font-size: 9.5px;" cellpadding="2">
                    <tr><td class="meta-label">Invoice Date:</td><td class="meta-val">{{ $formattedDate }}</td></tr>
                    <tr><td class="meta-label">Payment Due Date:</td><td class="meta-val" style="color: #dc2626;">{{ $formattedDueDate }}</td></tr>
                    <tr><td class="meta-label">Place of Supply:</td><td class="meta-val">{{ $invoice->place_of_supply_state }}</td></tr>
                    <tr><td class="meta-label">GST Tax Type:</td><td class="meta-val">{{ $invoice->gst_type === 'cgst_sgst' ? 'Intrastate (CGST 9% + SGST 9%)' : 'Interstate (IGST 18%)' }}</td></tr>
                </table>
            </td>
        </tr>
    </table>

    <!-- Itemized Table -->
    <table class="items-table">
        <thead>
            <tr>
                <th style="width: 8%; text-align: center;">#</th>
                <th style="text-align: left;">Particulars / Description</th>
                <th style="width: 15%; text-align: center;">SAC / HSN</th>
                <th style="width: 25%; text-align: right;">Amount (₹)</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td style="text-align: center;">1</td>
                <td>
                    <strong>Pass-Through Employee Gross Salaries</strong><br/>
                    <span style="font-size: 8.5px; color: #64748b;">Reimbursement of employee payroll disbursement for {{ $formattedMonth }} ({{ count($invoice->lineItems) }} candidates)</span>
                </td>
                <td style="text-align: center;">998311</td>
                <td style="text-align: right; font-weight: bold;">{{ number_format((float)$invoice->gross_salary_passthrough, 2) }}</td>
            </tr>
            <tr>
                <td style="text-align: center;">2</td>
                <td>
                    <strong>Agency Service Fee / Management Margin</strong><br/>
                    <span style="font-size: 8.5px; color: #64748b;">Professional payroll management fee as per client contract terms</span>
                </td>
                <td style="text-align: center;">998311</td>
                <td style="text-align: right; font-weight: bold; color: #059669;">{{ number_format((float)$invoice->agency_service_fee, 2) }}</td>
            </tr>

            @php $itemIndex = 3; @endphp
            @foreach($invoice->additionalFees as $fee)
            <tr>
                <td style="text-align: center;">{{ $itemIndex++ }}</td>
                <td>
                    <strong>{{ $fee->fee_name }}</strong><br/>
                    <span style="font-size: 8.5px; color: #64748b;">{{ $fee->remarks ?: 'Additional agency billing fee item' }}</span>
                </td>
                <td style="text-align: center;">998311</td>
                <td style="text-align: right; font-weight: bold; color: #2563eb;">{{ number_format((float)$fee->amount, 2) }}</td>
            </tr>
            @endforeach

            @php
                $additionalFeesSum = (float) $invoice->additionalFees->sum('amount');
                $taxableServiceFeeTotal = (float)$invoice->agency_service_fee + $additionalFeesSum;
            @endphp

            <tr style="background-color: #f8fafc; font-weight: bold;">
                <td colspan="3" style="text-align: right;">Total Taxable Service Fees Subtotal (Excl. Pass-Through):</td>
                <td style="text-align: right; color: #1F3864;">₹{{ number_format($taxableServiceFeeTotal, 2) }}</td>
            </tr>
        </tbody>
    </table>

    <!-- Tax Breakdown Section -->
    <table class="items-table" style="margin-top: 10px;">
        <thead>
            <tr style="background-color: #475569; border-color: #475569;">
                <th style="text-align: left;">Tax Component Breakdown</th>
                <th style="width: 25%; text-align: center;">Tax Rate</th>
                <th style="width: 25%; text-align: right;">Tax Amount (₹)</th>
            </tr>
        </thead>
        <tbody>
            @if($invoice->gst_type === 'cgst_sgst')
            <tr>
                <td>Central Goods & Services Tax (CGST)</td>
                <td style="text-align: center;">9.00%</td>
                <td style="text-align: right; font-weight: bold;">{{ number_format((float)((float)$invoice->cgst_amount > 0 ? $invoice->cgst_amount : round($taxableServiceFeeTotal * 0.09, 2)), 2) }}</td>
            </tr>
            <tr>
                <td>State Goods & Services Tax (SGST)</td>
                <td style="text-align: center;">9.00%</td>
                <td style="text-align: right; font-weight: bold;">{{ number_format((float)((float)$invoice->sgst_amount > 0 ? $invoice->sgst_amount : round($taxableServiceFeeTotal * 0.09, 2)), 2) }}</td>
            </tr>
            @else
            <tr>
                <td>Integrated Goods & Services Tax (IGST)</td>
                <td style="text-align: center;">18.00%</td>
                <td style="text-align: right; font-weight: bold;">{{ number_format((float)((float)$invoice->igst_amount > 0 ? $invoice->igst_amount : ((float)$invoice->gst_amount > 0 ? $invoice->gst_amount : round($taxableServiceFeeTotal * 0.18, 2))), 2) }}</td>
            </tr>
            @endif
            <tr style="background-color: #fff5f5; font-weight: bold;">
                <td>Total GST (Tax Amount)</td>
                <td style="text-align: center;">18.00%</td>
                <td style="text-align: right; color: #dc2626;">₹{{ number_format((float)$invoice->gst_amount, 2) }}</td>
            </tr>
        </tbody>
    </table>

    <!-- Grand Total Box -->
    <table class="grand-total-box" style="width: 100%;">
        <tr>
            <td style="width: 55%; font-size: 10px;">
                <strong>Amount in Words:</strong><br/>
                <span style="font-style: italic; color: #334155;">{{ $grandTotalWords }}</span>
            </td>
            <td style="width: 45%; text-align: right;" class="grand-total-val">
                Invoice Grand Total: ₹{{ number_format((float)$invoice->grand_total, 2) }}
            </td>
        </tr>
    </table>

    @php
        $tdsRate = $client->client_tds_percentage !== null 
            ? (float) $client->client_tds_percentage 
            : (is_numeric($client->tds_applicable_on_agency_fee) ? (float)$client->tds_applicable_on_agency_fee : null);
    @endphp

    @if(isset($client) && $tdsRate !== null && $tdsRate > 0)
    @php
        $taxableFee = (float) $invoice->agency_service_fee;
        $estTds = round($taxableFee * ($tdsRate / 100), 2);
        $netReceivable = round((float)$invoice->grand_total - $estTds, 2);
    @endphp
    <div style="margin-top: 4px; padding: 5px 10px; background-color: #f8fafc; border: 1px dashed #cbd5e1; font-size: 9px; text-align: right;">
        <span style="color: #64748b;">Est. Client TDS Deduction ({{ number_format($tdsRate, 2) }}%): -₹{{ number_format($estTds, 2) }}</span>
        &nbsp;&nbsp;|&nbsp;&nbsp;
        <strong style="color: #0f172a;">Est. Net Cash Received in Bank (Post TDS): ₹{{ number_format($netReceivable, 2) }}</strong>
    </div>
    @endif

    <!-- Bank Details & Payment Instructions / Terms -->
    <table class="bank-terms-table">
        <tr>
            <td class="bank-box" style="margin-right: 2%;">
                <div style="font-weight: bold; color: #1F3864; border-bottom: 1px solid #e2e8f0; padding-bottom: 3px; margin-bottom: 5px;">
                    BANK ACCOUNT DETAILS FOR REMITTANCE
                </div>
                <div><strong>Bank Name:</strong> {{ $bankDetails['bank_name'] }}</div>
                <div><strong>Account Number:</strong> {{ $bankDetails['account_number'] }}</div>
                <div><strong>IFSC Code:</strong> {{ $bankDetails['ifsc_code'] }}</div>
                <div><strong>Branch:</strong> {{ $bankDetails['branch_name'] }}</div>
            </td>
            <td style="width: 2%;"></td>
            <td class="bank-box">
                <div style="font-weight: bold; color: #1F3864; border-bottom: 1px solid #e2e8f0; padding-bottom: 3px; margin-bottom: 5px;">
                    PAYMENT TERMS & INSTRUCTIONS
                </div>
                <div style="color: #475569; margin-bottom: 4px;">{{ $paymentInstructions }}</div>
                <div style="white-space: pre-line; color: #64748b; font-size: 8.5px;">{{ $termsAndConditions }}</div>
            </td>
        </tr>
    </table>

    @if(!empty($client->invoice_footer_notes))
    <div style="margin-top: 15px; padding: 8px 10px; background-color: #f8fafc; border-left: 3px solid #1F3864; font-size: 9px; color: #334155;">
        <strong>Client Special Note:</strong> {{ $client->invoice_footer_notes }}
    </div>
    @endif

    <table style="width: 100%; margin-top: 35px;">
        <tr>
            <td style="width: 60%;"></td>
            <td style="width: 40%; text-align: right;">
                <div style="border-bottom: 1px solid #334155; width: 160px; display: inline-block; margin-bottom: 4px;"></div>
                <div style="font-size: 9.5px; font-weight: bold; color: #1F3864;">Authorized Signatory</div>
                <div style="font-size: 8.5px; color: #64748b;">{{ $issuerName }}</div>
            </td>
        </tr>
    </table>

    <div class="footer-note">
        This is a computer-generated Tax Invoice. Signature is not required.
    </div>

</body>
</html>
