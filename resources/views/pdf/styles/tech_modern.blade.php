body.tpl-tech_modern {
    font-family: 'Inter', 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
    font-size: 11px;
    color: #0f172a;
    margin: 0;
    padding: 20px;
    background-color: #ffffff;
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
    background-color: {{ $accentColor ? $accentColor.'0D' : '#eff6ff' }};
    border: 1px solid {{ $accentColor ? $accentColor.'26' : '#bfdbfe' }};
    border-radius: 8px;
    border-collapse: separate;
    margin-bottom: 20px;
}

.tpl-tech_modern .employee-info-table td {
    padding: 8px 12px;
    font-size: 10px;
}

.tpl-tech_modern .meta-label {
    color: {{ $accentColor ?: '#2563eb' }};
    font-weight: 600;
    text-transform: uppercase;
    font-size: 9px;
    letter-spacing: 0.05em;
}

.tpl-tech_modern .meta-val {
    font-weight: 700;
    color: #0f172a;
}

.tpl-tech_modern .components-table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 20px;
    border-radius: 8px;
    overflow: hidden;
}

.tpl-tech_modern .components-table th {
    background-color: {{ $accentColor ?: '#2563eb' }};
    color: #ffffff;
    padding: 9px 12px;
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    font-weight: 700;
}

.tpl-tech_modern .components-table td {
    border: 1px solid {{ $accentColor ? $accentColor.'26' : '#dbeafe' }};
    padding: 8px 12px;
    font-size: 10px;
}

.tpl-tech_modern .net-pay-box {
    background-color: {{ $accentColor ? $accentColor.'0F' : '#eff6ff' }};
    border: 2px solid {{ $accentColor ?: '#2563eb' }};
    color: #0f172a;
    padding: 14px 18px;
    margin-bottom: 20px;
    border-radius: 8px;
}

.tpl-tech_modern .net-amount {
    font-size: 17px;
    font-weight: 800;
    color: {{ $accentColor ?: '#2563eb' }};
}

.tpl-tech_modern .net-words {
    font-size: 10px;
    font-style: italic;
    text-align: right;
    color: {{ $accentColor ?: '#2563eb' }};
}

.tpl-tech_modern .footer-note {
    text-align: center;
    font-size: 9px;
    color: #94a3b8;
    margin-top: 20px;
    border-top: 1px solid {{ $accentColor ? $accentColor.'26' : '#dbeafe' }};
    padding-top: 10px;
}
