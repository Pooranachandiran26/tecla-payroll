import React, { useState, useRef } from 'react';
import AuthenticatedLayout from '../../Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';
import Button from '../../Components/ui/Button';
import DataTable from '../../Components/ui/DataTable';
import Badge from '../../Components/ui/Badge';
import { UploadCloud, Loader2 } from 'lucide-react';
import axios from 'axios';
import RoleGuard from '../../Components/RoleGuard.jsx';
import useToast from '../../Hooks/useToast';

export default function BulkUpload() {
  const { showToast } = useToast();
  const [selectedFile, setSelectedFile] = useState(null);
  const [validationResults, setValidationResults] = useState(null);
  const [executionResults, setExecutionResults] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const fileInputRef = useRef(null);

  const columns = [
    {
      header: 'Row No',
      accessor: 'rowNo'
    },
    {
      header: 'Employee Code',
      accessor: 'empCode'
    },
    {
      header: 'Employee Name',
      accessor: 'empName',
      cell: (row) => <strong>{row.empName}</strong>
    },
    {
      header: 'Client Assignment',
      accessor: 'client'
    },
    {
      header: 'Statutory Preview',
      accessor: 'statutory',
      cell: (row) => {
        if (!row.statutory) return '—';
        return (
          <div className="flex gap-1 flex-wrap text-[0.7rem]">
            {row.statutory.pf && <Badge type="info">PF</Badge>}
            {row.statutory.esi && <Badge type="info">ESI</Badge>}
            {row.statutory.pt && <Badge type="info">PT</Badge>}
            {row.statutory.lwf && <Badge type="info">LWF</Badge>}
            {row.statutory.tds && <Badge type="info">TDS</Badge>}
            {!row.statutory.pf && !row.statutory.esi && !row.statutory.pt && !row.statutory.lwf && !row.statutory.tds && <span className="text-gray-400">None</span>}
          </div>
        );
      }
    },
    {
      header: 'Gross Salary (CTC)',
      accessor: 'ctc',
      cell: (row) => row.ctc ? `₹${Number(row.ctc).toLocaleString('en-IN')}` : '—'
    },
    {
      header: 'Validation Message',
      accessor: 'message',
      cell: (row) => {
        let colorClass = 'text-green-600';
        if (row.status === 'warning') colorClass = 'text-yellow-600';
        if (row.status === 'error') colorClass = 'text-red-600';
        return <span className={`font-medium ${colorClass} text-xs`}>{row.message}</span>;
      }
    },
    {
      header: 'Status',
      accessor: 'status',
      cell: (row) => {
        if (row.status === 'ready') return <Badge type="success">Ready</Badge>;
        if (row.status === 'warning') return <Badge type="warning">Warning</Badge>;
        if (row.status === 'error') return <Badge type="danger">Error</Badge>;
        return null;
      }
    }
  ];

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setSelectedFile(file);
    setIsUploading(true);
    setValidationResults(null);
    setExecutionResults(null);
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const response = await axios.post('/employees/bulk-upload/validate', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setValidationResults(response.data);
      showToast({ message: 'File validated successfully', type: 'success' });
    } catch (error) {
      showToast({ message: 'Failed to validate file: ' + (error.response?.data?.error || error.message), type: 'error' });
    } finally {
      setIsUploading(false);
      // Reset input so the same file can be selected again
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleExecute = async () => {
    if (!selectedFile) return;
    
    setIsExecuting(true);
    const formData = new FormData();
    formData.append('file', selectedFile);
    
    try {
      const response = await axios.post('/employees/bulk-upload/execute', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setExecutionResults(response.data);
      showToast({ message: response.data.message, type: 'success' });
    } catch (error) {
      if (error.response?.status === 422 && error.response?.data?.failed_row) {
        showToast({ 
          message: `Import failed at Row ${error.response.data.failed_row}: ${error.response.data.reason}. Transaction rolled back.`, 
          type: 'error',
          duration: 10000
        });
      } else {
        showToast({ message: 'Failed to execute import: ' + (error.response?.data?.error || error.message), type: 'error' });
      }
    } finally {
      setIsExecuting(false);
    }
  };

  const downloadCSV = () => {
    if (!executionResults || !executionResults.results) return;
    const rows = executionResults.results.rows;
    let csv = 'Row No,Employee Code,Employee Name,Client,Gross Salary (CTC),Status,Validation Message\n';
    rows.forEach(r => {
      const escapedMessage = r.message ? `"${r.message.replace(/"/g, '""')}"` : '';
      csv += `${r.rowNo},${r.empCode},${r.empName},"${r.client}",${r.ctc || ''},${r.status},${escapedMessage}\n`;
    });
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', 'bulk_import_results.csv');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <RoleGuard allowedRoles={['admin', 'manager']}>
    <AuthenticatedLayout>
      <Head title="Bulk Upload Employees" />

      <div className="mb-6 flex justify-between items-end">
        <div>
          <Link href="/employees" className="text-[0.85rem] font-semibold text-[#1F3864] hover:underline mb-2 inline-block">
            ← Back to Employees Directory
          </Link>
          <h2 className="text-2xl font-bold text-[#1F3864] mt-1 mb-1">Excel Bulk Employee Uploader</h2>
          <p className="text-gray-500 text-sm">Upload spreadsheet templates to onboard multiple employees and assign their client defaults instantly.</p>
        </div>
        <a 
          href="/templates/employee_bulk_upload_template.xlsx" 
          download 
          className="btn btn-outline flex items-center gap-2 text-sm font-semibold border-gray-300 shadow-sm"
        >
          <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd"></path></svg>
          Download Excel Template
        </a>
      </div>

      {/* Important Notes */}
      <div className="card bg-blue-50 border border-blue-100 p-4 mb-6 shadow-sm rounded-lg">
        <h4 className="text-[#1F3864] font-bold mb-2 flex items-center gap-2">
          <span>⚠️</span> Important Guidelines for Bulk Upload
        </h4>
        <ul className="text-sm text-gray-700 list-disc pl-5 space-y-1">
          <li><strong>Mandatory Fields:</strong> employee_code, client_code, branch_code, full_name, personal_email, phone_number, date_of_joining, designation, employment_model, basic_pay, hra.</li>
          <li><strong>Statutory Toggles:</strong> Use <strong>1</strong> for Yes/True and <strong>0</strong> for No/False (e.g., pf_applicable, esi_applicable).</li>
          <li><strong>Dates Format:</strong> Must be in <strong>YYYY-MM-DD</strong> format (e.g., 2023-01-15).</li>
          <li><strong>Dropdown Values:</strong> Must match exact internal values (e.g., <strong>gender:</strong> male/female/other, <strong>tds_regime:</strong> old/new, <strong>gratuity_mode:</strong> part_of_ctc/over_and_above).</li>
          <li><strong>ESI Rule:</strong> ESI will strictly be ignored and overridden to ₹0 if Gross Salary (sum of all earnings) exceeds ₹21,000, regardless of the toggle.</li>
        </ul>
      </div>

      {/* Drag and Drop Box */}
      {!executionResults && (
      <div 
        className={`card mb-6 flex flex-col items-center justify-center p-12 border-2 border-dashed border-gray-300 bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer rounded-lg text-center ${isUploading || isExecuting ? 'opacity-50 pointer-events-none' : ''}`}
        onClick={() => fileInputRef.current?.click()}
      >
        {isUploading ? (
          <Loader2 className="w-12 h-12 text-[#1F3864] mb-4 animate-spin" strokeWidth={1.5} />
        ) : (
          <UploadCloud className="w-12 h-12 text-[#1F3864] mb-4" strokeWidth={1.5} />
        )}
        <p className="font-semibold text-base text-[#1F3864] mb-1">
          {isUploading ? 'Validating file...' : 'Click to select or drag and drop your employee Excel/CSV file here'}
        </p>
        <p className="text-sm text-gray-500 mb-4">Supports .csv up to 10MB</p>
        
        <input 
          type="file" 
          ref={fileInputRef} 
          className="hidden" 
          accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
          onChange={handleFileChange}
        />
      </div>
      )}

      {/* Excel Validation Preview Grid */}
      {!executionResults && validationResults && (
        <div className="card p-0">
          <div className="p-5 pb-4 border-b border-gray-100 flex justify-between items-center flex-wrap gap-4">
            <h3 className="text-lg font-bold text-[#1F3864] m-0">File Import Validation Status</h3>
            <div className="bg-gray-100 px-3 py-1.5 rounded-md text-xs font-semibold text-[#1F3864]">
              📊 Summary: {validationResults.total_rows} rows found — <span className="text-green-600">{validationResults.valid_count} Ready</span>, <span className="text-yellow-600">{validationResults.warning_count} Warnings</span>, <span className="text-red-600">{validationResults.error_count} Errors</span>
            </div>
          </div>

          <p className="text-xs text-gray-500 mb-4 px-6 mt-4">
            ⚠️ Rows with errors cannot be imported. Resolve warnings below or fix them in your spreadsheet and upload again.
          </p>

          <DataTable columns={columns} data={validationResults.rows} />

          <div className="flex justify-end gap-3 mt-6 border-t border-gray-200 p-6 pt-6">
            <Link href="/employees">
              <Button variant="secondary">Cancel</Button>
            </Link>
            <Button variant="primary" disabled={validationResults.error_count > 0 || isExecuting} onClick={handleExecute}>
              {isExecuting ? 'Importing...' : `Confirm & Import (${validationResults.valid_count + validationResults.warning_count} employees)`}
            </Button>
          </div>
        </div>
      )}

      {/* Execution Results View */}
      {executionResults && (
        <div className="card p-0 mt-6 border-green-500 border-2 shadow-lg overflow-hidden">
          <div className="bg-green-50 p-6 border-b border-green-100 flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-green-800 m-0">✅ {executionResults.message}</h3>
              <p className="text-green-600 text-sm mt-1">All employees have been successfully saved to the database.</p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={downloadCSV}>
                Download Results CSV
              </Button>
              <Link href="/employees">
                <Button variant="primary">View Employees Directory</Button>
              </Link>
            </div>
          </div>
          
          <div className="p-6">
            <h4 className="font-bold text-[#1F3864] mb-4">Margin / Client Billing Impact Summary</h4>
            <div className="text-sm text-gray-500 mb-4 bg-blue-50 p-3 rounded border border-blue-100">
              <span className="font-semibold text-blue-800">Note:</span> This is an estimated monthly cost impact. Real invoice generation will depend on the Invoicing module.
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {executionResults.summary.map((client, idx) => (
                <div key={idx} className="border border-gray-200 rounded-lg p-4 bg-white shadow-sm">
                  <div className="text-lg font-bold text-[#1F3864] mb-1">{client.client_name}</div>
                  <div className="flex justify-between items-center text-sm mb-2">
                    <span className="text-gray-500">Employees Imported:</span>
                    <Badge type="info">{client.employee_count}</Badge>
                  </div>
                  <div className="flex justify-between items-center text-sm border-t pt-2 border-gray-100">
                    <span className="text-gray-500 font-medium">Added Monthly CTC:</span>
                    <span className="font-bold text-green-600">₹{Number(client.total_ctc).toLocaleString('en-IN')}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

    </AuthenticatedLayout>
    </RoleGuard>
  );
}
