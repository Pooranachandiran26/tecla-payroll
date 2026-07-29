body.tpl-corporate {
    font-family: 'Georgia', serif;
    font-size: 10.5px;
    color: #1e1b4b;
    margin: 0;
    padding: 20px;
    background-color: #ffffff;
}

/* Corporate Template: Executive Full Banner Top Bar */
.tpl-corporate .header-table {
    width: 100%;
    background-color: #eef2ff;
    border-left: 6px solid {{ $accentColor ?: '#4338ca' }};
    border-right: 1px solid #c7d2fe;
    border-top: 1px solid #c7d2fe;
    border-bottom: 1px solid #c7d2fe;
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
    color: #4338ca;
    margin-top: 3px;
}

.tpl-corporate .payslip-title {
    font-size: 18px;
    font-weight: 800;
    color: {{ $accentColor ?: '#3730a3' }};
    text-align: right;
    text-transform: uppercase;
}

/* Formal Corporate Grid */
.tpl-corporate .employee-info-table {
    width: 100%;
    background-color: #faf5ff;
    border: 1px solid #ddd6fe;
    border-collapse: collapse;
    margin-bottom: 18px;
}

.tpl-corporate .employee-info-table th {
    background-color: #f3e8ff !important;
    color: #581c87 !important;
    font-weight: 700;
    border-bottom: 1px solid #c084fc !important;
}

.tpl-corporate .employee-info-table td {
    padding: 7px 12px;
    font-size: 10px;
}

.tpl-corporate .meta-label {
    color: #6b21a8;
    font-weight: 700;
}

.tpl-corporate .meta-val {
    font-weight: bold;
    color: #3b0764;
}

/* Executive Dual Colored Table Headers */
.tpl-corporate .components-table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 18px;
}

.tpl-corporate .components-table th {
    background-color: #f3e8ff;
    color: #581c87;
    border: 1px solid #c084fc;
    padding: 8px 10px;
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

.tpl-corporate .components-table td {
    border: 1px solid #e9d5ff;
    padding: 6px 10px;
    font-size: 10px;
}

/* Corporate Left Border Ribbon Highlight Box */
.tpl-corporate .net-pay-box {
    background-color: #faf5ff;
    border: 1px solid #ddd6fe;
    border-left: 6px solid {{ $accentColor ?: '#6b21a8' }};
    color: #3b0764;
    padding: 12px 18px;
    margin-bottom: 18px;
    border-radius: 4px;
}

.tpl-corporate .net-amount {
    font-size: 16px;
    font-weight: 800;
    color: {{ $accentColor ?: '#6b21a8' }};
}

.tpl-corporate .net-words {
    font-size: 9.5px;
    font-style: italic;
    text-align: right;
    color: #6b21a8;
}

.tpl-corporate .footer-note {
    text-align: center;
    font-size: 8.5px;
    color: #a855f7;
    margin-top: 20px;
    border-top: 1px solid #f3e8ff;
    padding-top: 8px;
}
