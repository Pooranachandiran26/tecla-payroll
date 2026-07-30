import React, { useState, useRef } from 'react';
import AuthenticatedLayout from '../../Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';
import Button from '../../Components/ui/Button';
import DataTable from '../../Components/ui/DataTable';
import Pagination from '../../Components/ui/Pagination';
import Badge from '../../Components/ui/Badge';
import { UploadCloud, Loader2, Eye, X, User, Building2, Landmark, IndianRupee, ShieldCheck, HeartPulse, CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import axios from 'axios';
import RoleGuard from '../../Components/RoleGuard.jsx';
import useToast from '../../Hooks/useToast';
import { downloadErrorRowsXlsx } from '../../Utils/excelExport';

/* ────────────────────────────────────────────
   Employee Detail Modal (Slide-over Panel)
   ──────────────────────────────────────────── */
function EmployeeDetailModal({ row, onClose, allRows, onNavigate }) {
  if (!row) return null;
  const raw = row.raw_data || {};

  const currentIndex = allRows.findIndex(r => r.rowNo === row.rowNo);
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < allRows.length - 1;

  const field = (label, value) => {
    const display = value === undefined || value === null || value === '' ? '—' : String(value);
    return (
      <div className="flex justify-between items-start py-2 px-1 border-b border-gray-50 last:border-0">
        <span className="text-xs text-gray-500 font-medium w-2/5 shrink-0">{label}</span>
        <span className={`text-sm font-semibold text-right ${display === '—' ? 'text-gray-300' : 'text-gray-800'}`}>{display}</span>
      </div>
    );
  };

  const boolField = (label, value) => {
    const isTrue = value === '1' || value === 1 || value === true || value === 'yes' || value === 'true';
    const isFalse = value === '0' || value === 0 || value === false || value === 'no' || value === 'false';
    return (
      <div className="flex justify-between items-center py-2 px-1 border-b border-gray-50 last:border-0">
        <span className="text-xs text-gray-500 font-medium w-2/5 shrink-0">{label}</span>
        {isTrue ? (
          <span className="text-xs font-bold text-green-700 bg-green-50 px-2 py-0.5 rounded-full">✓ Yes</span>
        ) : isFalse ? (
          <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">✗ No</span>
        ) : (
          <span className="text-sm text-gray-300">—</span>
        )}
      </div>
    );
  };

  const Section = ({ icon: Icon, title, color, children }) => (
    <div className="mb-4">
      <div className={`flex items-center gap-2 mb-2 pb-2 border-b-2 ${color}`}>
        <Icon className="w-4 h-4" />
        <h4 className="text-sm font-bold uppercase tracking-wide">{title}</h4>
      </div>
      <div className="space-y-0">{children}</div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[9999] flex justify-end" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity" />

      {/* Panel */}
      <div
        className="relative w-full max-w-2xl bg-white shadow-2xl overflow-y-auto animate-slide-in-right"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-gradient-to-r from-[#1F3864] to-[#2E5090] text-white p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-white/20 flex items-center justify-center text-lg font-bold">
                {(raw.full_name || 'E')[0].toUpperCase()}
              </div>
              <div>
                <h3 className="text-lg font-bold leading-tight text-white">{raw.full_name || '—'}</h3>
                <p className="text-blue-200 text-xs mt-0.5">{raw.employee_code || '—'} · Row {row.rowNo}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/20 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Status banner */}
          <div className={`text-xs font-semibold px-3 py-1.5 rounded-md inline-block ${
            row.status === 'ready' ? 'bg-green-500/20 text-green-100' :
            row.status === 'warning' ? 'bg-yellow-500/20 text-yellow-100' :
            'bg-red-500/20 text-red-100'
          }`}>
            {row.status === 'ready' ? '✅' : row.status === 'warning' ? '⚠️' : '❌'} {row.message}
          </div>

          {/* Navigation arrows */}
          <div className="flex items-center gap-2 mt-3">
            <button
              disabled={!hasPrev}
              onClick={() => onNavigate(allRows[currentIndex - 1])}
              className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-md bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Previous
            </button>
            <span className="text-xs text-blue-200">{currentIndex + 1} of {allRows.length}</span>
            <button
              disabled={!hasNext}
              onClick={() => onNavigate(allRows[currentIndex + 1])}
              className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-md bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              Next <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 space-y-2">
          <Section icon={User} title="Personal Information" color="border-blue-500 text-blue-700">
            {field('Full Name', raw.full_name)}
            {field('Employee Code', raw.employee_code)}
            {field('Personal Email', raw.personal_email)}
            {field('Phone Number', raw.phone_number)}
            {field('Date of Birth', raw.date_of_birth)}
            {field('Gender', raw.gender)}
            {field('Aadhaar Number', raw.aadhaar_number)}
            {field('PAN Number', raw.pan_number)}
            {field('Residential Address', raw.residential_address)}
            {field('Emergency Contact', raw.emergency_contact_name)}
          </Section>

          <Section icon={Building2} title="Employment Details" color="border-indigo-500 text-indigo-700">
            {field('Client Code', raw.client_code)}
            {field('Branch', raw.branch_name || raw.branch_code)}
            {field('Designation', raw.designation)}
            {field('Employment Model', raw.employment_model)}
            {field('Date of Joining', raw.date_of_joining)}
            {field('Reporting Manager Code', raw.reporting_manager_code)}
            {boolField('Prior Employment', raw.prior_employment_flag)}
            {field('Previous Employer', raw.previous_employer_name)}
            {field('Previous UAN', raw.previous_employer_uan)}
            {boolField('Declarations Accepted', raw.declarations_accepted)}
            {field('LOP Basis Days', raw.lop_basis_days)}
          </Section>

          <Section icon={Landmark} title="Bank Details" color="border-emerald-500 text-emerald-700">
            {field('Account Holder Name', raw.account_holder_name)}
            {field('Bank Account Number', raw.bank_account_number)}
            {field('IFSC Code', raw.bank_ifsc)}
            {field('Bank Name', raw.bank_name)}
            {field('Bank Branch', raw.bank_branch)}
          </Section>

          <Section icon={IndianRupee} title="Salary Components" color="border-amber-500 text-amber-700">
            {field('Gross CTC (Monthly)', row.ctc ? `₹${Number(row.ctc).toLocaleString('en-IN')}` : null)}
            {field('Basic Pay', raw.basic_pay ? `₹${Number(raw.basic_pay).toLocaleString('en-IN')}` : null)}
            {field('HRA', raw.hra ? `₹${Number(raw.hra).toLocaleString('en-IN')}` : null)}
            {field('Conveyance', raw.conveyance ? `₹${Number(raw.conveyance).toLocaleString('en-IN')}` : null)}
            {field('DA', raw.da ? `₹${Number(raw.da).toLocaleString('en-IN')}` : null)}
            {field('Medical Allowance', raw.medical_allowance ? `₹${Number(raw.medical_allowance).toLocaleString('en-IN')}` : null)}
            {field('Special Allowance', raw.special_allowance ? `₹${Number(raw.special_allowance).toLocaleString('en-IN')}` : null)}
            {field('Other Additions', raw.other_additions ? `₹${Number(raw.other_additions).toLocaleString('en-IN')}` : null)}
            {field('Gratuity Mode', raw.gratuity_mode)}
          </Section>

          <Section icon={ShieldCheck} title="Statutory Compliance" color="border-purple-500 text-purple-700">
            {boolField('PF Applicable', raw.pf_applicable)}
            {boolField('EPS Applicable', raw.eps_applicable)}
            {field('UAN Mode', raw.uan_mode)}
            {field('UAN Number', raw.uan_number)}
            {boolField('ESI Applicable', raw.esi_applicable)}
            {field('ESI Mode', raw.esi_mode)}
            {field('ESIC Number', raw.esic_number)}
            {field('ESI Contribution Period End', raw.esi_contribution_period_end)}
            {boolField('PT Applicable', raw.pt_applicable)}
            {boolField('LWF Applicable', raw.lwf_applicable)}
            {boolField('TDS Applicable', raw.tds_applicable)}
            {field('TDS Regime', raw.tds_regime)}
          </Section>

          {(raw.health_insurance_provider || raw.health_insurance_policy_no || raw.health_insurance_sum_insured) && (
            <Section icon={HeartPulse} title="Health Insurance" color="border-rose-500 text-rose-700">
              {field('Provider', raw.health_insurance_provider)}
              {field('Policy No', raw.health_insurance_policy_no)}
              {field('Sum Insured', raw.health_insurance_sum_insured ? `₹${Number(raw.health_insurance_sum_insured).toLocaleString('en-IN')}` : null)}
            </Section>
          )}

          <Section icon={CalendarDays} title="Additional Dates" color="border-teal-500 text-teal-700">
            {field('Probation End Date', raw.probation_end_date)}
            {field('Attendance Tracking Start', raw.attendance_tracking_start_date)}
          </Section>
        </div>
      </div>

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        .animate-slide-in-right {
          animation: slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
    </div>
  );
}

export default function BulkUpload({ clients = [] }) {
  const { showToast } = useToast();
  const [selectedClientId, setSelectedClientId] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [validationResults, setValidationResults] = useState(null);
  const [executionResults, setExecutionResults] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [partialImportAcknowledged, setPartialImportAcknowledged] = useState(false);
  const [autoProvisionUsers, setAutoProvisionUsers] = useState(true);
  const [isAdvancedOptionsOpen, setIsAdvancedOptionsOpen] = useState(false);
  const [selectedDetailRow, setSelectedDetailRow] = useState(null);
  const fileInputRef = useRef(null);

  const columns = [
    {
      label: 'Row No',
      key: 'rowNo'
    },
    {
      label: 'Employee Code',
      key: 'empCode'
    },
    {
      label: 'Employee Name',
      key: 'empName',
      render: (val, row) => <strong>{row.empName}</strong>
    },
    {
      label: 'Client Assignment',
      key: 'client'
    },
    {
      label: 'Statutory Preview',
      key: 'statutory',
      render: (val, row) => {
        if (!row.statutory) return '—';
        return (
          <div className="flex gap-1 flex-wrap text-[0.7rem]">
            {row.statutory.pf && <Badge status="inactive" label="PF" />}
            {row.statutory.esi && <Badge status="inactive" label="ESI" />}
            {row.statutory.pt && <Badge status="inactive" label="PT" />}
            {row.statutory.lwf && <Badge status="inactive" label="LWF" />}
            {row.statutory.tds && <Badge status="inactive" label="TDS" />}
            {!row.statutory.pf && !row.statutory.esi && !row.statutory.pt && !row.statutory.lwf && !row.statutory.tds && <span className="text-gray-400">None</span>}
          </div>
        );
      }
    },
    {
      label: 'Gross Salary (CTC)',
      key: 'ctc',
      render: (val, row) => row.ctc ? `₹${Number(row.ctc).toLocaleString('en-IN')}` : '—'
    },
    {
      label: 'Validation Message',
      key: 'message',
      render: (val, row) => {
        let colorClass = 'text-green-600';
        if (row.status === 'warning') colorClass = 'text-yellow-600';
        if (row.status === 'error') colorClass = 'text-red-600';
        return <span className={`font-medium ${colorClass} text-xs`}>{row.message}</span>;
      }
    },
    {
      label: 'Status',
      key: 'status',
      render: (val, row) => {
        if (row.status === 'ready') return <Badge status="active" label="Ready" />;
        if (row.status === 'warning') return <Badge status="pending" label="Warning" />;
        if (row.status === 'error') return <Badge status="rejected" label="Error" />;
        return null;
      }
    },
    {
      label: 'Actions',
      key: 'actions',
      render: (val, row) => (
        <button
          onClick={(e) => { e.stopPropagation(); setSelectedDetailRow(row); }}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-[#1F3864] bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-all hover:shadow-sm"
          title="View full employee details"
        >
          <Eye className="w-3.5 h-3.5" />
          Show
        </button>
      )
    }
  ];

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setSelectedFile(file);
    setIsUploading(true);
    setValidationResults(null);
    setExecutionResults(null);
    setCurrentPage(1);
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const response = await axios.post(route('employees.bulk-upload.validate'), formData, {
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
    formData.append('auto_provision_users', autoProvisionUsers ? '1' : '0');
    if (validationResults?.error_count > 0 && partialImportAcknowledged) {
        formData.append('partial_import', '1');
    }
    
    try {
      const response = await axios.post(route('employees.bulk-upload.execute'), formData, {
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

  const itemsPerPage = 10;
  const validationRows = validationResults?.rows || [];
  const totalRows = validationRows.length;
  const startIdx = (currentPage - 1) * itemsPerPage;
  const endIdx = startIdx + itemsPerPage;
  const paginatedRows = validationRows.slice(startIdx, endIdx);
  const totalPages = Math.ceil(totalRows / itemsPerPage);
  
  const canConfirmImport = validationResults?.error_count === 0 || partialImportAcknowledged;

  return (
    <RoleGuard allowedRoles={['admin', 'manager']}>
    <AuthenticatedLayout>
      <Head title="Bulk Upload Employees" />

      <div className="mb-6 flex justify-between items-end flex-wrap gap-4">
        <div>
          <Link href={route('employees.index')} className="text-[0.85rem] font-semibold text-[#1F3864] hover:underline mb-2 inline-block">
            ← Back to Employees Directory
          </Link>
          <h2 className="text-2xl font-bold text-[#1F3864] mt-1 mb-1">Excel Bulk Employee Uploader</h2>
          <p className="text-gray-500 text-sm">Upload spreadsheet templates to onboard multiple employees and assign their client defaults instantly.</p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={selectedClientId}
            onChange={(e) => setSelectedClientId(e.target.value)}
            className="px-3 py-2 text-sm font-semibold rounded-lg border border-gray-300 bg-white shadow-sm focus:border-[#1F3864] focus:ring-1 focus:ring-[#1F3864]"
          >
            <option value="">-- Select Client for Template --</option>
            {clients.map(c => (
              <option key={c.id} value={c.id}>
                {c.company_name} ({c.client_code})
              </option>
            ))}
          </select>
          <Button 
            disabled={!selectedClientId}
            onClick={() => window.location.href = route('employees.bulk-upload.template', { client_id: selectedClientId })}
            variant="outline"
          >
            Download Client Template (.XLSX)
          </Button>
        </div>
      </div>

      <div className="card bg-blue-50 border border-blue-100 p-4 mb-6 shadow-sm rounded-lg">
        <h4 className="text-[#1F3864] font-bold mb-2 flex items-center gap-2">
          <span>⚠️</span> Important Guidelines for Bulk Upload
        </h4>
        <ul className="text-sm text-gray-700 list-disc pl-5 space-y-1">
          <li><strong>Reporting Manager:</strong> Use <strong>reporting_manager_code</strong> to assign a manager. The manager must belong to the same client.</li>
          <li><strong>Declarations & Optional Gaps:</strong> Supported fields include <strong>declarations_accepted</strong> (1/yes or 0/no, defaults to 1), <strong>emergency_contact_name</strong>, <strong>previous_employer_name</strong>, <strong>previous_employer_uan</strong>, <strong>probation_end_date</strong>, and <strong>esi_contribution_period_end</strong>.</li>
          <li><strong>Statutory Toggles:</strong> Use <strong>1</strong> for Yes/True and <strong>0</strong> for No/False (e.g., pf_applicable, esi_applicable).</li>
          <li><strong>Dates Format:</strong> Must be in <strong>YYYY-MM-DD</strong> format (e.g., 2023-01-15).</li>
          <li><strong>Dropdown Values:</strong> Must match exact internal values (e.g., <strong>gender:</strong> male/female/other, <strong>tds_regime:</strong> old/new, <strong>gratuity_mode:</strong> part_of_ctc/over_and_above).</li>
          <li><strong>ESI Rule:</strong> ESI will strictly be ignored and overridden to ₹0 if Gross Salary (sum of all earnings) exceeds ₹21,000, regardless of the toggle.</li>
        </ul>
      </div>

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

      {!executionResults && validationResults && (
        <div className="card p-0">
          <div className="p-5 pb-4 border-b border-gray-100 flex justify-between items-center flex-wrap gap-4">
            <h3 className="text-lg font-bold text-[#1F3864] m-0">File Import Validation Status</h3>
            <div className="flex items-center gap-3">
              {validationResults.error_count > 0 && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => downloadErrorRowsXlsx(validationResults.rows)}
                  className="flex items-center gap-1.5 text-xs text-red-700 border-red-300 bg-red-50 hover:bg-red-100"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                  Download Error Rows ({validationResults.error_count})
                </Button>
              )}
              <div className="bg-gray-100 px-3 py-1.5 rounded-md text-xs font-semibold text-[#1F3864]">
                📊 Summary: {validationResults.total_rows} rows found — <span className="text-green-600">{validationResults.valid_count} Ready</span>, <span className="text-yellow-600">{validationResults.warning_count} Warnings</span>, <span className="text-red-600">{validationResults.error_count} Errors</span>
              </div>
            </div>
          </div>

          <p className="text-xs text-gray-500 mb-4 px-6 mt-4">
            ⚠️ Rows with errors cannot be imported. Resolve warnings below or fix them in your spreadsheet and upload again.
          </p>

          <DataTable columns={columns} data={paginatedRows} />

          {/* Employee Detail Slide-over Modal */}
          {selectedDetailRow && (
            <EmployeeDetailModal
              row={selectedDetailRow}
              allRows={validationRows}
              onClose={() => setSelectedDetailRow(null)}
              onNavigate={(newRow) => setSelectedDetailRow(newRow)}
            />
          )}

          {totalRows > 0 && (
            <div className="px-6 py-4 border-t border-gray-100">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={totalRows}
                itemsPerPage={itemsPerPage}
                onPageChange={setCurrentPage}
              />
            </div>
          )}

          <div className="flex flex-col items-end gap-3 border-t border-gray-200 p-6 bg-gray-50">
            {validationResults.error_count > 0 && (
              <div className="mb-2 p-3 bg-white border border-red-200 rounded-md shadow-sm w-full max-w-2xl text-sm">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="mt-1 w-4 h-4 text-[#1F3864] rounded border-gray-300 focus:ring-[#1F3864]"
                    checked={partialImportAcknowledged}
                    onChange={(e) => setPartialImportAcknowledged(e.target.checked)}
                  />
                  <span className="text-gray-700 leading-tight font-medium">
                    I acknowledge that only the <strong className="text-green-600">{validationResults.valid_count} Valid</strong> rows will be imported. 
                    The <strong className="text-red-600">{validationResults.error_count} Error</strong> rows will be discarded, and I must download the Error Sheet to fix and upload them separately later.
                  </span>
                </label>
              </div>
            )}
            <div className="flex justify-end gap-3">
              <Link href={route('employees.index')}>
                <Button variant="secondary">Cancel</Button>
              </Link>
              <Button variant="primary" disabled={!canConfirmImport || isExecuting || validationResults.valid_count === 0} onClick={handleExecute}>
                {isExecuting ? 'Importing...' : `Confirm & Import (${validationResults.valid_count} valid employees)`}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Execution Results View */}
      {executionResults && (
        <div className="card p-0 mt-6 border-green-500 border-2 shadow-lg overflow-hidden">
          <div className="bg-green-50 p-6 border-b border-green-100 flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-green-800 m-0">✅ {executionResults.imported_count || 0} Employees Imported Successfully</h3>
              <p className="text-green-600 text-sm mt-1">
                {executionResults.ignored_errors_count > 0 
                  ? <span className="font-bold text-red-600">❌ {executionResults.ignored_errors_count} error rows were ignored and not imported.</span>
                  : 'All valid employees have been successfully saved to the database.'}
              </p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={downloadCSV}>
                Download Results CSV
              </Button>
              <Link href={route('employees.index')}>
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
