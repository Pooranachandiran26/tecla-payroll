body.tpl-tech_modern {
    font-family: 'Inter', 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
    font-size: 11px;
    color: #0f172a;
    margin: 0;
    padding: 20px;
    background-color: #f8fbff;
}

.tpl-tech_modern .header-table {
    width: 100%;
    border-bottom: 3px solid {{ $accentColor ?: '#2563eb' }};
    padding-bottom: 14px;
    margin-bottom: 20px;
}

.tpl-tech_modern .company-name {
    font-size: 20px;
    font-weight: 800;
    color: {{ $accentColor ?: '#2563eb' }};
    text-transform: uppercase;
    letter-spacing: 0.08em;
}

.tpl-tech_modern .company-address {
    font-size: 9px;
    color: #475569;
    margin-top: 4px;
}

.tpl-tech_modern .payslip-title {
    font-size: 20px;
    font-weight: 800;
    color: {{ $accentColor ?: '#2563eb' }};
    text-align: right;
    text-transform: uppercase;
    letter-spacing: 0.06em;
}

.tpl-tech_modern .employee-info-table {
    width: 100%;
    background-color: #ffffff;
    border: 1px solid #dbeafe;
    border-radius: 10px;
    border-collapse: separate;
    margin-bottom: 22px;
}

.tpl-tech_modern .employee-info-table td {
    padding: 10px 12px;
    font-size: 10px;
    vertical-align: top;
}

.tpl-tech_modern .employee-info-table tr + tr td {
    border-top: 1px solid #e2eaf7;
}

.tpl-tech_modern .meta-label {
    color: #475569;
    font-weight: 600;
    letter-spacing: 0.02em;
}

.tpl-tech_modern .meta-val {
    font-weight: 700;
    color: #0f172a;
}

.tpl-tech_modern .components-table {
    width: 100%;
    border-collapse: separate;
    border-spacing: 0 8px;
    margin-bottom: 22px;
}

.tpl-tech_modern .components-table th,
.tpl-tech_modern .components-table td {
    padding: 10px 12px;
    font-size: 10px;
}

.tpl-tech_modern .components-table th {
    background-color: #eff6ff;
    color: #1d4ed8;
    border: 1px solid #bfdbfe;
    border-radius: 8px;
    text-transform: uppercase;
    font-weight: 700;
}

.tpl-tech_modern .components-table td {
    background-color: #ffffff;
    color: #334155;
    border: 1px solid #dbeafe;
}

.tpl-tech_modern .components-table tr td:first-child {
    border-left: 1px solid #dbeafe;
}

.tpl-tech_modern .components-table tr td:last-child {
    border-right: 1px solid #dbeafe;
}

.tpl-tech_modern .net-pay-box {
    background-color: #eff6ff;
    border: 2px solid {{ $accentColor ?: '#2563eb' }};
    padding: 16px 18px;
    margin-bottom: 20px;
    border-radius: 12px;
}

.tpl-tech_modern .net-amount {
    font-size: 17px;
    font-weight: 800;
    color: {{ $accentColor ?: '#2563eb' }};
}

.tpl-tech_modern .net-words {
    font-size: 9.5px;
    font-style: italic;
    text-align: right;
    color: #475569;
}

.tpl-tech_modern .footer-note {
    text-align: center;
    font-size: 8.5px;
    color: #64748b;
    margin-top: 18px;
    border-top: 1px dashed #dbeafe;
    padding-top: 10px;
}
