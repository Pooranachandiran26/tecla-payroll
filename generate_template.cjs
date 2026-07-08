const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');

async function createTemplate() {
    const workbook = new ExcelJS.Workbook();
    
    // Sheet 1: Instructions
    const instructionsSheet = workbook.addWorksheet('Instructions');
    instructionsSheet.getColumn(1).width = 25;
    instructionsSheet.getColumn(2).width = 75;

    // Add title
    instructionsSheet.mergeCells('A1:B1');
    const titleCell = instructionsSheet.getCell('A1');
    titleCell.value = 'Bulk Upload Template Instructions';
    titleCell.font = { name: 'Arial', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F3864' } };
    titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
    instructionsSheet.getRow(1).height = 40;

    const instructions = [
        ['Mandatory Fields', 'employee_code, client_code, branch_code, full_name, personal_email, phone_number, date_of_joining, designation, employment_model, basic_pay, hra'],
        ['Statutory Toggles', 'Use 1 for Yes/True and 0 for No/False (e.g., pf_applicable, esi_applicable).'],
        ['Dates Format', 'Must be in YYYY-MM-DD format (e.g., 2023-01-15).'],
        ['Dropdown Values', 'Must match exact internal values (e.g., gender: male/female/other, tds_regime: old/new, gratuity_mode: part_of_ctc/over_and_above).'],
        ['ESI Rule', 'ESI will strictly be ignored and overridden to ₹0 if Gross Salary (sum of all earnings) exceeds ₹21,000, regardless of the toggle.']
    ];

    instructionsSheet.addRow([]); // empty row
    
    instructions.forEach(instruction => {
        const row = instructionsSheet.addRow(instruction);
        row.getCell(1).font = { bold: true };
        row.getCell(2).alignment = { wrapText: true };
    });

    // Format all rows for wrap text
    instructionsSheet.eachRow((row, rowNumber) => {
        if (rowNumber > 2) {
            row.height = 35;
            row.getCell(1).alignment = { vertical: 'top' };
            row.getCell(2).alignment = { vertical: 'top', wrapText: true };
        }
    });

    // Sheet 2: Data Template
    const dataSheet = workbook.addWorksheet('Employee Data');
    
    const headers = [
        'employee_code', 'client_code', 'branch_code', 'full_name', 'personal_email', 'phone_number', 
        'date_of_birth', 'date_of_joining', 'designation', 'gender', 'employment_model', 'prior_employment_flag', 
        'residential_address', 'bank_account_number', 'bank_ifsc', 'account_holder_name', 'pan_number', 
        'aadhaar_number', 'esic_number', 'tds_regime', 'gratuity_mode', 'lop_basis_days', 'basic_pay', 'hra', 
        'conveyance', 'da', 'medical_allowance', 'special_allowance', 'other_additions', 'pf_applicable', 
        'esi_applicable', 'pt_applicable'
    ];

    // Add headers
    dataSheet.addRow(headers);
    const headerRow = dataSheet.getRow(1);
    headerRow.height = 30;
    headerRow.eachCell((cell, colNumber) => {
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F3864' } };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        dataSheet.getColumn(colNumber).width = 20;
    });

    // Add sample row
    const sampleRow = [
        'EMP-001', 'SYNSTAR', 'MB-01', 'John Doe', 'john@example.com', '9876543210', 
        '1990-01-01', '2023-01-01', 'Developer', 'male', 'agency_contract', 0, 
        '123 Main St', '1234567890', 'HDFC0000001', 'John Doe', 'ABCDE1234F', 
        '123412341234', '1111111111', 'new', 'part_of_ctc', 26, 15000, 5000, 
        0, 0, 0, 0, 0, 1, 1, 1
    ];
    const dataRow = dataSheet.addRow(sampleRow);
    dataRow.eachCell(cell => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F9FF' } };
    });

    // Freeze first row
    dataSheet.views = [
        { state: 'frozen', xSplit: 0, ySplit: 1 }
    ];

    const targetDir = path.join(__dirname, 'public', 'templates');
    if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
    }

    const outputPath = path.join(targetDir, 'employee_bulk_upload_template.xlsx');
    await workbook.xlsx.writeFile(outputPath);
    console.log(`Template generated at ${outputPath}`);
}

createTemplate().catch(console.error);
