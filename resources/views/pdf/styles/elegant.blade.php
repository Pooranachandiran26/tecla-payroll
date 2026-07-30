body.tpl-elegant {
    font-family: 'Helvetica Neue', Arial, sans-serif;
    font-size: 10.5px;
    color: #064e3b;
    margin: 0;
    padding: 20px;
    background-color: #ffffff;
}

/* Elegant Template: Top Curved Brand Header Box */
.tpl-elegant .header-table {
    width: 100%;
    background-color: #ecfdf5;
    border: 1px solid #a7f3d0;
    border-radius: 8px;
    padding: 15px;
    margin-bottom: 18px;
}

.tpl-elegant .company-name {
    font-size: 18px;
    font-weight: 800;
    color: {{ $accentColor ?: '#047857' }};
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

.tpl-elegant .company-address {
    font-size: 9.5px;
    color: #065f46;
    margin-top: 3px;
}

.tpl-elegant .payslip-title {
    font-size: 20px;
    font-weight: 800;
    color: {{ $accentColor ?: '#047857' }};
    text-align: right;
    text-transform: uppercase;
}

/* Rounded Soft Infoboxes */
.tpl-elegant .employee-info-table {
    width: 100%;
    background-color: #f0fdf4;
    border: 1px solid #bbf7d0;
    border-radius: 6px;
    border-collapse: separate;
    margin-bottom: 18px;
}

.tpl-elegant .employee-info-table th {
    background-color: #d1fae5 !important;
    color: #065f46 !important;
    font-weight: 700;
    border-bottom: 1px solid #a7f3d0 !important;
}

.tpl-elegant .employee-info-table td {
    padding: 7px 12px;
    font-size: 10px;
}

.tpl-elegant .meta-label {
    color: #047857;
    font-weight: 600;
}

.tpl-elegant .meta-val {
    font-weight: bold;
    color: #064e3b;
}

/* Distinct Rounded Table Headers */
.tpl-elegant .components-table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 18px;
    border-radius: 6px;
    overflow: hidden;
}

.tpl-elegant .components-table th {
    background-color: {{ $accentColor ?: '#059669' }};
    color: #ffffff;
    padding: 8px 10px;
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

.tpl-elegant .components-table td {
    border: 1px solid #d1fae5;
    padding: 7px 10px;
    font-size: 10px;
}

/* Elegant Net Pay Pill Highlight */
.tpl-elegant .net-pay-box {
    background-color: #ecfdf5;
    border: 2px solid {{ $accentColor ?: '#059669' }};
    color: #064e3b;
    padding: 12px 18px;
    margin-bottom: 18px;
    border-radius: 8px;
}

.tpl-elegant .net-amount {
    font-size: 16px;
    font-weight: 800;
    color: {{ $accentColor ?: '#047857' }};
}

.tpl-elegant .net-words {
    font-size: 9.5px;
    font-style: italic;
    text-align: right;
    color: #047857;
}

.tpl-elegant .footer-note {
    text-align: center;
    font-size: 8.5px;
    color: #059669;
    margin-top: 20px;
    border-top: 1px dashed #a7f3d0;
    padding-top: 8px;
}
