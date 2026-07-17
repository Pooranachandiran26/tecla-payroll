import ExcelJS from 'exceljs';

export const TEMPLATE_COLUMNS = [
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

export async function generateErrorRowsXlsxBuffer(rows) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Error Rows');

  const headers = [...TEMPLATE_COLUMNS, 'error_reason'];
  
  // Professional column widths matching text length
  worksheet.columns = headers.map(header => ({
    header: header,
    key: header,
    width: Math.max(header.length + 6, 22)
  }));

  // Style header row: Dark Navy fill (#1F3864), Bold white text
  const headerRow = worksheet.getRow(1);
  headerRow.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1F3864' }
  };
  headerRow.alignment = { vertical: 'middle', horizontal: 'left' };
  headerRow.height = 26;

  const failedRows = rows.filter(r => r.status === 'error');

  failedRows.forEach(row => {
    const rawData = row.raw_data || {};
    const rowValues = {};
    TEMPLATE_COLUMNS.forEach(col => {
      rowValues[col] = rawData[col] !== undefined ? rawData[col] : '';
    });
    rowValues['error_reason'] = row.message || '';
    
    const addedRow = worksheet.addRow(rowValues);
    addedRow.font = { name: 'Calibri', size: 10 };
    addedRow.height = 20;
  });

  return await workbook.xlsx.writeBuffer();
}

export async function downloadErrorRowsXlsx(rows) {
  const buffer = await generateErrorRowsXlsxBuffer(rows);
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.setAttribute('hidden', '');
  a.setAttribute('href', url);
  a.setAttribute('download', 'bulk_upload_error_rows.xlsx');
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
