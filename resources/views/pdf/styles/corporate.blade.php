body.tpl-corporate {
    font-family: 'Georgia', serif;
    font-size: 10.5px;
    color: #1e1b4b;
    margin: 0;
    padding: 20px;
    background-color: #ffffff;
}

/* Corporate Template: Executive Indigo Full Banner */
.tpl-corporate .header-table {
    width: 100%;
    background-color: {{ $accentColor ? $accentColor.'0F' : '#eef2ff' }};
    border-left: 6px solid {{ $accentColor ?: '#4338ca' }};
    border-right: 1px solid {{ $accentColor ? $accentColor.'33' : '#c7d2fe' }};
    border-top: 1px solid {{ $accentColor ? $accentColor.'33' : '#c7d2fe' }};
    border-bottom: 1px solid {{ $accentColor ? $accentColor.'33' : '#c7d2fe' }};
    padding: 14px 18px;
    margin-bottom: 18px;
    border-radius: 4px;
}

.tpl-corporate .company-name {
    font-size: 18px;
    font-weight: 800;
    color: {{ $accentColor ?: '#3730a3' }};
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

.tpl-corporate .company-address {
    font-size: 9px;
    color: {{ $accentColor ?: '#4338ca' }};
    margin-top: 3px;
}

.tpl-corporate .payslip-title {
    font-size: 18px;
    font-weight: 800;
    color: {{ $accentColor ?: '#3730a3' }};
    text-align: right;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

.tpl-corporate .employee-info-table {
    width: 100%;
    background-color: #fafafa;
    border-top: 2px solid {{ $accentColor ?: '#4338ca' }};
    border-bottom: 2px solid {{ $accentColor ?: '#4338ca' }};
    border-collapse: collapse;
    margin-bottom: 18px;
}

.tpl-corporate .employee-info-table td {
    padding: 6px 10px;
    font-size: 10px;
}

.tpl-corporate .meta-label {
    color: {{ $accentColor ?: '#4338ca' }};
    font-weight: 700;
}

.tpl-corporate .meta-val {
    font-weight: 600;
    color: #0f172a;
}

.tpl-corporate .components-table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 18px;
}

.tpl-corporate .components-table th {
    background-color: {{ $accentColor ?: '#4338ca' }};
    color: #ffffff;
    padding: 8px 10px;
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

.tpl-corporate .components-table td {
    border: 1px solid #e2e8f0;
    padding: 6px 10px;
    font-size: 10px;
}

.tpl-corporate .net-pay-box {
    background-color: {{ $accentColor ? $accentColor.'0F' : '#eef2ff' }};
    border: 2px solid {{ $accentColor ?: '#4338ca' }};
    color: #1e1b4b;
    padding: 12px 18px;
    margin-bottom: 18px;
    border-radius: 4px;
}

.tpl-corporate .net-amount {
    font-size: 16px;
    font-weight: 800;
    color: {{ $accentColor ?: '#3730a3' }};
}

.tpl-corporate .net-words {
    font-size: 9.5px;
    font-style: italic;
    text-align: right;
    color: {{ $accentColor ?: '#4338ca' }};
}

.tpl-corporate .footer-note {
    text-align: center;
    font-size: 8.5px;
    color: {{ $accentColor ?: '#4338ca' }};
    margin-top: 20px;
    border-top: 2px double {{ $accentColor ?: '#4338ca' }};
    padding-top: 8px;
}
