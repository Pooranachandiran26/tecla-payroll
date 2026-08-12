body.tpl-spreadsheet {
    font-family: 'Courier New', Courier, monospace;
    font-size: 10px;
    color: #0f172a;
    margin: 0;
    padding: 12px;
    background-color: #ffffff;
}
.tpl-spreadsheet .header-table {
    width: 100%;
    border: 2px solid {{ $accentColor ?: '#1F3864' }};
    padding: 8px 12px;
    margin-bottom: 12px;
    background-color: {{ $accentColor ?: '#1F3864' }}0D;
}
.tpl-spreadsheet .company-name {
    font-size: 15px;
    font-weight: bold;
    color: {{ $accentColor ?: '#1F3864' }};
    text-transform: uppercase;
    letter-spacing: 1px;
}
.tpl-spreadsheet .company-address {
    font-size: 9px;
    color: #475569;
}
.tpl-spreadsheet .payslip-title {
    font-size: 15px;
    font-weight: bold;
    color: {{ $accentColor ?: '#1F3864' }};
    text-align: right;
    text-transform: uppercase;
}
.tpl-spreadsheet .employee-info-table {
    width: 100%;
    border: 1px solid {{ $accentColor ?: '#1F3864' }}40;
    border-collapse: collapse;
    margin-bottom: 12px;
}
.tpl-spreadsheet .employee-info-table td {
    border: 1px solid #cbd5e1;
    padding: 4px 6px;
    font-size: 9px;
}
.tpl-spreadsheet .meta-label {
    color: {{ $accentColor ?: '#1F3864' }};
    font-weight: bold;
}
.tpl-spreadsheet .meta-val {
    font-weight: bold;
    color: #0f172a;
}
.tpl-spreadsheet .components-table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 12px;
}
.tpl-spreadsheet .components-table th {
    background-color: {{ $accentColor ?: '#1F3864' }};
    color: #ffffff;
    border: 1px solid {{ $accentColor ?: '#1F3864' }};
    padding: 5px;
    font-size: 9px;
    text-transform: uppercase;
    font-weight: bold;
}
.tpl-spreadsheet .components-table td {
    border: 1px solid #cbd5e1;
    padding: 4.5px 6px;
    font-size: 9px;
}
.tpl-spreadsheet .net-pay-box {
    background-color: {{ $accentColor ?: '#1F3864' }}0F;
    border: 2px solid {{ $accentColor ?: '#1F3864' }};
    color: #0f172a;
    padding: 8px 12px;
    margin-bottom: 12px;
}
.tpl-spreadsheet .net-amount {
    font-size: 14px;
    font-weight: bold;
    color: {{ $accentColor ?: '#1F3864' }};
}
.tpl-spreadsheet .net-words {
    font-size: 8.5px;
    font-style: italic;
    text-align: right;
    color: {{ $accentColor ?: '#1F3864' }};
}
.tpl-spreadsheet .footer-note {
    text-align: center;
    font-size: 8px;
    color: #94a3b8;
    margin-top: 10px;
    border-top: 1px dashed {{ $accentColor ?: '#1F3864' }}40;
    padding-top: 4px;
}
