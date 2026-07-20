const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');

async function runTest() {
  console.log("=== RUNNING NODE.JS EXCELJS ERROR SHEET EXPORT TEST ===");

  const TEMPLATE_COLUMNS = [
    'employee_code',
    'full_name',
    'client_code',
    'branch_name',
    'personal_email',
    'phone_number',
    'date_of_birth',
    'date_of_joining',
    'designation',
    'employment_model',
    'prior_employment_flag',
    'residential_address',
    'bank_account_number',
    'bank_ifsc',
    'bank_name',
    'bank_branch',
    'account_holder_name',
    'pan_number',
    'basic_pay',
    'hra',
    'conveyance',
    'da',
    'medical_allowance',
    'special_allowance',
    'other_additions',
    'pf_applicable',
    'esi_applicable',
    'pt_applicable',
    'lwf_applicable',
    'tds_applicable',
    'uan_mode',
    'uan_number',
    'esic_number',
    'tds_regime',
    'gratuity_mode',
    'lop_basis_days',
    'declarations_accepted',
    'reporting_manager_code',
  ];

  // Mock validation error row with commas in address
  const mockErrorRows = [
    {
      status: 'error',
      message: 'The personal email format is invalid. | Mandatory PAN number is missing.',
      raw_data: {
        employee_code: 'ERR001',
        full_name: 'John Error',
        client_code: 'CLT01',
        branch_name: 'Main',
        personal_email: 'invalid_email_format',
        phone_number: '9876543210',
        date_of_birth: '1990-01-01',
        date_of_joining: '2023-01-01',
        designation: 'Engineer',
        employment_model: 'eor',
        prior_employment_flag: '0',
        residential_address: '123 Main St, Apt 4B, City, State 400001', // COMMA IN ADDRESS
        bank_account_number: '1234567890',
        bank_ifsc: 'SBIN0001234',
        bank_name: 'HDFC Bank',
        bank_branch: 'Mumbai',
        account_holder_name: 'John Error',
        pan_number: '',
        basic_pay: '15000',
        hra: '5000',
        conveyance: '0',
        da: '0',
        medical_allowance: '0',
        special_allowance: '0',
        other_additions: '0',
        pf_applicable: '1',
        esi_applicable: '0',
        pt_applicable: '1',
        lwf_applicable: '0',
        tds_applicable: '0',
        uan_mode: 'new',
        uan_number: '',
        esic_number: '',
        tds_regime: 'new',
        gratuity_mode: 'part_of_ctc',
        lop_basis_days: '26',
        declarations_accepted: '1',
        reporting_manager_code: ''
      }
    }
  ];

  // Build workbook using ExcelJS
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Error Rows');

  const headers = [...TEMPLATE_COLUMNS, 'error_reason'];
  worksheet.addRow(headers);

  const failedRows = mockErrorRows.filter(r => r.status === 'error');
  failedRows.forEach(row => {
    const rawData = row.raw_data || {};
    const rowValues = TEMPLATE_COLUMNS.map(col => rawData[col] !== undefined ? rawData[col] : '');
    rowValues.push(row.message || '');
    worksheet.addRow(rowValues);
  });

  const scratchDir = path.join(__dirname, '../../scratch');
  if (!fs.existsSync(scratchDir)) {
    fs.mkdirSync(scratchDir, { recursive: true });
  }

  const outputPath = path.join(scratchDir, 'test_bulk_error_rows.xlsx');
  await workbook.xlsx.writeFile(outputPath);
  console.log(`1. Wrote ExcelJS .xlsx file to: ${outputPath}`);

  // READ BACK FILE AND VERIFY CELL CONTENT
  const readWorkbook = new ExcelJS.Workbook();
  await readWorkbook.xlsx.readFile(outputPath);
  const readSheet = readWorkbook.getWorksheet('Error Rows');

  const headerRowValues = readSheet.getRow(1).values.slice(1);
  const dataRowValues = readSheet.getRow(2).values.slice(1);

  const addressColIdx = headerRowValues.indexOf('residential_address');
  const errorReasonColIdx = headerRowValues.indexOf('error_reason');

  const readAddress = dataRowValues[addressColIdx];
  const readErrorReason = dataRowValues[errorReasonColIdx];

  console.log("\n2. READ-BACK CELL CONTENT ASSERTIONS:");
  console.log(`   Header 'residential_address' Column Index: ${addressColIdx + 1}`);
  console.log(`   Read-Back 'residential_address' Cell Value : "${readAddress}"`);
  console.log(`   Header 'error_reason' Column Index        : ${errorReasonColIdx + 1}`);
  console.log(`   Read-Back 'error_reason' Cell Value        : "${readErrorReason}"`);

  if (readAddress !== '123 Main St, Apt 4B, City, State 400001') {
    console.error("❌ ERROR: Address field was corrupted or split!");
    process.exit(1);
  }

  if (readErrorReason !== 'The personal email format is invalid. | Mandatory PAN number is missing.') {
    console.error("❌ ERROR: Error reason text did not match!");
    process.exit(1);
  }

  if (headerRowValues.length !== 39) {
    console.error(`❌ ERROR: Expected 39 columns (38 template + 1 error_reason), got ${headerRowValues.length}`);
    process.exit(1);
  }

  console.log("\n✅ SUCCESS: EXCELJS .XLSX FILE GENERATED AND VERIFIED WITH INTACT COMMAS IN SINGLE CELL!\n");
}

runTest().catch(err => {
  console.error(err);
  process.exit(1);
});
