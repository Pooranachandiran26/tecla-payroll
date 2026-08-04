import React, { useState, useRef } from 'react';
import AuthenticatedLayout from '../../Layouts/AuthenticatedLayout';
import { Head, Link, router, usePage } from '@inertiajs/react';
import Button from '../../Components/ui/Button';
import DataTable from '../../Components/ui/DataTable';
import Pagination from '../../Components/ui/Pagination';
import Badge from '../../Components/ui/Badge';
import { UploadCloud, Loader2, Eye, X, User, Building2, Landmark, IndianRupee, ShieldCheck, HeartPulse, CalendarDays, ChevronLeft, ChevronRight, AlertTriangle, FileSpreadsheet, Trash2, AlertCircle, CheckCircle2, RefreshCw, FileText, Search, ChevronDown, Clock, XCircle, Download } from 'lucide-react';
import axios from 'axios';
import RoleGuard from '../../Components/RoleGuard.jsx';
import useToast from '../../Hooks/useToast';
import { downloadErrorRowsXlsx, downloadAllRowsXlsx, downloadSuccessRowsXlsx } from '../../Utils/excelExport';

/* ────────────────────────────────────────────
   Employee Detail Modal (Slide-over Panel)
   ──────────────────────────────────────────── */
function EmployeeDetailModal({ row, onClose, allRows, onNavigate }) {
  if (!row) return null;
  const raw = row.raw_data || {};

  const currentIndex = allRows.findIndex(r => r.rowNo === row.rowNo);
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < allRows.length - 1;

  React.useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft' && hasPrev) onNavigate(allRows[currentIndex - 1]);
      if (e.key === 'ArrowRight' && hasNext) onNavigate(allRows[currentIndex + 1]);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, hasPrev, hasNext, allRows]);

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

function SearchableClientDropdown({ clients = [], selectedClientId, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef(null);

  const selectedClient = clients.find(c => String(c.id) === String(selectedClientId));

  const filteredClients = clients.filter(c => 
    (c.company_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.client_code || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  React.useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={dropdownRef} className="relative min-w-[280px]">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between gap-2 px-3.5 py-2 text-sm font-semibold rounded-lg border border-gray-300 bg-white shadow-sm hover:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all cursor-pointer"
      >
        <span className="truncate text-gray-800 font-bold">
          {selectedClient ? `${selectedClient.company_name} (${selectedClient.client_code})` : '-- Select Client for Template --'}
        </span>
        <ChevronDown className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1 w-full min-w-[320px] bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden animate-fade-in">
          <div className="p-2 border-b border-gray-100 bg-gray-50/70">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                autoFocus
                placeholder="Search client by name or code..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-md border border-gray-300 bg-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="max-h-60 overflow-y-auto py-1 divide-y divide-gray-50">
            <button
              type="button"
              onClick={() => { onChange(''); setIsOpen(false); setSearchTerm(''); }}
              className={`w-full text-left px-3.5 py-2 text-xs font-medium transition-colors ${
                !selectedClientId ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              -- Select Client for Template --
            </button>
            {filteredClients.length > 0 ? (
              filteredClients.map(c => {
                const isSelected = String(c.id) === String(selectedClientId);
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      onChange(c.id);
                      setIsOpen(false);
                      setSearchTerm('');
                    }}
                    className={`w-full text-left px-3.5 py-2.5 text-xs flex items-center justify-between transition-colors ${
                      isSelected ? 'bg-indigo-50 text-indigo-900 font-bold' : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <span className="truncate pr-2 font-medium">{c.company_name}</span>
                    <span className="text-[0.7rem] px-1.5 py-0.5 rounded bg-gray-100 font-mono text-gray-600 shrink-0 font-bold">
                      {c.client_code}
                    </span>
                  </button>
                );
              })
            ) : (
              <div className="p-3 text-center text-xs text-gray-400 font-medium">
                No clients match "{searchTerm}"
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function BulkUpload({ clients = [], active_session_batch = null }) {
  const { auth } = usePage().props;
  const { showToast } = useToast();
  const [selectedClientId, setSelectedClientId] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [validationResults, setValidationResults] = useState(null);
  const [executionResults, setExecutionResults] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [validationStep, setValidationStep] = useState(1);
  const [isExecuting, setIsExecuting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [partialImportAcknowledged, setPartialImportAcknowledged] = useState(false);
  const [autoProvisionUsers, setAutoProvisionUsers] = useState(true);
  const [isAdvancedOptionsOpen, setIsAdvancedOptionsOpen] = useState(false);
  const [selectedDetailRow, setSelectedDetailRow] = useState(null);
  const [activeBatch, setActiveBatch] = useState(null);
  const [isProgressModalOpen, setIsProgressModalOpen] = useState(false);
  const [showCancelWarningModal, setShowCancelWarningModal] = useState(false);
  const [showNavWarningModal, setShowNavWarningModal] = useState(false);
  const [pendingNavUrl, setPendingNavUrl] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [isSessionRestoredBanner, setIsSessionRestoredBanner] = useState(false);
  const [showImportConfirmModal, setShowImportConfirmModal] = useState(false);
  const [importTargetMode, setImportTargetMode] = useState(null); // 'direct' or 'queue'
  const bypassNavCheck = useRef(false);
  const fileInputRef = useRef(null);

  const openImportConfirmation = (mode) => {
    setImportTargetMode(mode);
    setShowImportConfirmModal(true);
  };

  const confirmAndProceedImport = () => {
    setShowImportConfirmModal(false);
    if (importTargetMode === 'queue') {
      handleQueueJobUpload();
    } else {
      handleExecute();
    }
  };

  // Restore session state on page load if active_session_batch exists
  React.useEffect(() => {
    if (active_session_batch && active_session_batch.rows && active_session_batch.rows.length > 0) {
      setValidationResults({
        batch_id: active_session_batch.batch_id,
        total_rows: active_session_batch.total_rows,
        valid_count: active_session_batch.valid_count,
        error_count: active_session_batch.error_count,
        warning_count: active_session_batch.warning_count,
        rows: active_session_batch.rows,
      });
      setSelectedFile({
        name: active_session_batch.file_name || 'Restored_Bulk_Upload.xlsx',
        size: active_session_batch.file_size || 25000,
      });
      setIsSessionRestoredBanner(true);
    }
  }, [active_session_batch]);

  const isProcessing = isUploading || isExecuting || isProgressModalOpen;

  // 1. Prevent Browser Refresh / Tab Close / Window Unload during processing
  React.useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (isProcessing) {
        e.preventDefault();
        e.returnValue = 'Bulk upload / import is in progress. Refreshing or closing the browser window will interrupt processing. Are you sure you want to leave?';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isProcessing]);

  // 2. Intercept Inertia Router Client Navigation during processing with custom modal
  React.useEffect(() => {
    const unbind = router.on('before', (event) => {
      if (bypassNavCheck.current) {
        return;
      }
      if (isProcessing) {
        event.preventDefault();
        const targetUrl = event.detail.visit?.url?.href || route('employees.index');
        setPendingNavUrl(targetUrl);
        setShowNavWarningModal(true);
      }
    });

    return () => unbind();
  }, [isProcessing]);

  const confirmPendingNav = () => {
    setShowNavWarningModal(false);
    setIsUploading(false);
    setIsExecuting(false);
    setIsProgressModalOpen(false);
    bypassNavCheck.current = true;
    if (pendingNavUrl) {
      router.visit(pendingNavUrl);
    } else {
      router.visit(route('employees.index'));
    }
  };

  const handleCancelClick = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (isProcessing || validationResults) {
      setShowCancelWarningModal(true);
    } else {
      router.visit(route('employees.index'));
    }
  };

  const handleConfirmCancel = () => {
    setShowCancelWarningModal(false);
    setSelectedFile(null);
    setValidationResults(null);
    setExecutionResults(null);
    setIsUploading(false);
    setIsExecuting(false);
    setIsProgressModalOpen(false);
    router.visit(route('employees.index'));
  };

  const handleQueueJobUpload = async () => {
    setIsExecuting(true);
    setIsProgressModalOpen(true);

    const formData = new FormData();
    if (selectedFile instanceof File) {
      formData.append('file', selectedFile);
    }
    if (validationResults?.batch_id) {
      formData.append('batch_id', validationResults.batch_id);
    }
    formData.append('auto_provision_users', autoProvisionUsers ? '1' : '0');
    if (validationResults?.error_count > 0 && partialImportAcknowledged) {
      formData.append('partial_import', '1');
    }

    try {
      const res = await axios.post(route('employees.bulk-upload.async'), formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      const batchId = res.data.batch_id;
      const initialStatus = res.data.status || 'completed';

      setActiveBatch({
        batch_id: batchId,
        status: initialStatus,
        progress_percentage: res.data.progress_percentage || (initialStatus === 'completed' ? 100 : 0),
        processed_rows: res.data.processed_rows || validationResults?.total_rows || 0,
        total_rows: res.data.total_rows || validationResults?.total_rows || 0,
        valid_count: res.data.valid_count || validationResults?.valid_count || 0,
        error_count: res.data.error_count || validationResults?.error_count || 0,
        warning_count: res.data.warning_count || validationResults?.warning_count || 0,
        file_name: selectedFile?.name || 'Employee Bulk Upload File'
      });

      const finishImport = (summaryData, importedCount, ignoredErrors) => {
        setExecutionResults({
          imported_count: importedCount || res.data.valid_count || validationResults?.valid_count || 0,
          ignored_errors_count: ignoredErrors || res.data.error_count || validationResults?.error_count || 0,
          summary: summaryData || res.data.summary || [],
          results: validationResults,
        });

        setIsSessionRestoredBanner(false);
        axios.post(route('employees.bulk-upload.clear-session')).catch(() => {});

        setTimeout(() => {
          setIsProgressModalOpen(false);
          setIsExecuting(false);
          showToast({ message: '✅ Employee bulk import completed successfully!', type: 'success' });
        }, 1000);
      };

      if (initialStatus === 'completed') {
        finishImport(res.data.summary, res.data.valid_count, res.data.error_count);
      } else {
        const interval = setInterval(async () => {
          const statusRes = await axios.get(route('employees.bulk-upload.status', { batchId }));
          setActiveBatch(statusRes.data);

          if (statusRes.data.status === 'completed' || statusRes.data.status === 'failed') {
            clearInterval(interval);
            if (statusRes.data.status === 'completed') {
              finishImport(statusRes.data.summary?.client_impacts, statusRes.data.summary?.imported_count || statusRes.data.valid_count, statusRes.data.error_count);
            } else {
              setIsProgressModalOpen(false);
              setIsExecuting(false);
              showToast({ message: 'Queue Job Failed: ' + (statusRes.data.error_message || 'Validation errors'), type: 'error' });
            }
          }
        }, 1000);
      }
    } catch (error) {
      setIsProgressModalOpen(false);
      setIsExecuting(false);
      showToast({ message: 'Failed to execute import: ' + (error.response?.data?.error || error.message), type: 'error' });
    }
  };

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

  const handleFileProcess = async (file) => {
    if (!file) return;
    
    setSelectedFile(file);
    setIsUploading(true);
    setValidationStep(1);
    setValidationResults(null);
    setExecutionResults(null);
    setIsSessionRestoredBanner(false);
    setCurrentPage(1);
    setFilterStatus('all');

    const stepTimer1 = setTimeout(() => setValidationStep(2), 600);
    const stepTimer2 = setTimeout(() => setValidationStep(3), 1200);

    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const response = await axios.post(route('employees.bulk-upload.validate'), formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setValidationResults(response.data);
      showToast({ message: 'File validated successfully (Session saved for 10 min)', type: 'success' });
    } catch (error) {
      showToast({ message: 'Failed to validate file: ' + (error.response?.data?.error || error.message), type: 'error' });
    } finally {
      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) handleFileProcess(file);
  };

  const handleRemoveFile = async () => {
    setSelectedFile(null);
    setValidationResults(null);
    setExecutionResults(null);
    setIsSessionRestoredBanner(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    try {
      await axios.post(route('employees.bulk-upload.clear-session'));
    } catch (e) {}
    showToast({ message: 'File and session cleared', type: 'info' });
  };

  const startProgressModalAnimation = (fileName, totalRows, validCount, errorCount) => {
    setActiveBatch({
      file_name: fileName,
      status: 'processing',
      progress_percentage: 20,
      processed_rows: Math.round(totalRows * 0.2),
      total_rows: totalRows,
      valid_count: validCount,
      error_count: errorCount,
      warning_count: 0,
    });
    setIsProgressModalOpen(true);
  };


  const handleExecute = async () => {
    if (!selectedFile) return;
    
    setIsExecuting(true);
    const validCount = validationResults?.valid_count || 0;
    const totalCount = validationResults?.total_rows || validCount;

    startProgressModalAnimation(
      selectedFile.name,
      totalCount,
      validCount,
      validationResults?.error_count || 0
    );

    const timer1 = setTimeout(() => {
      setActiveBatch(prev => prev ? { ...prev, progress_percentage: 70, processed_rows: Math.round(totalCount * 0.7) } : null);
    }, 400);

    const formData = new FormData();
    if (selectedFile instanceof File) {
      formData.append('file', selectedFile);
    }
    if (validationResults?.batch_id) {
      formData.append('batch_id', validationResults.batch_id);
    }
    formData.append('auto_provision_users', autoProvisionUsers ? '1' : '0');
    if (validationResults?.error_count > 0 && partialImportAcknowledged) {
        formData.append('partial_import', '1');
    }
    
    try {
      const response = await axios.post(route('employees.bulk-upload.execute'), formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      clearTimeout(timer1);
      setActiveBatch({
        file_name: selectedFile.name,
        status: 'completed',
        progress_percentage: 100,
        processed_rows: totalCount,
        valid_count: response.data.imported_count || validCount,
        error_count: validationResults?.error_count || 0,
        warning_count: 0,
      });

      setIsSessionRestoredBanner(false);
      axios.post(route('employees.bulk-upload.clear-session')).catch(() => {});

      setTimeout(() => {
        setIsProgressModalOpen(false);
        setExecutionResults(response.data);
      }, 1000);

      showToast({ message: response.data.message, type: 'success' });
    } catch (error) {
      clearTimeout(timer1);
      setActiveBatch(prev => prev ? { ...prev, status: 'failed' } : null);
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
  const filteredRows = validationRows.filter(r => {
    if (filterStatus === 'all') return true;
    return r.status === filterStatus;
  });
  const totalRows = filteredRows.length;
  const startIdx = (currentPage - 1) * itemsPerPage;
  const endIdx = startIdx + itemsPerPage;
  const paginatedRows = filteredRows.slice(startIdx, endIdx);
  const totalPages = Math.ceil(totalRows / itemsPerPage);
  
  const canConfirmImport = validationResults?.error_count === 0 || partialImportAcknowledged;

  return (
    <RoleGuard allowedRoles={['admin', 'manager']}>
    <AuthenticatedLayout>
      <Head title="Bulk Upload Employees" />

      <div className="mb-6 flex justify-between items-end flex-wrap gap-4">
        <div>
          <Link href={route('employees.index')} className="text-[0.85rem] font-semibold text-[#1F3864] hover:underline mb-1 inline-block">
            ← Back to Employees Directory
          </Link>
          <h2 className="text-2xl font-bold text-[#1F3864] mt-0.5 mb-1">Excel Bulk Employee Uploader</h2>
          <p className="text-gray-500 text-sm">Upload spreadsheet templates to onboard multiple employees and assign their client defaults instantly.</p>
        </div>

        {/* Tab Navigation Switcher on the far right */}
        <div className="flex items-center bg-gray-200/70 p-1 rounded-xl shadow-inner text-xs font-bold border border-gray-300/50">
          <span className="px-3 py-1.5 rounded-lg bg-white text-[#1F3864] shadow-sm font-bold flex items-center gap-1.5">
            <FileSpreadsheet className="w-3.5 h-3.5 text-indigo-600" />
            <span>Excel Uploader</span>
          </span>
          <Link
            href={route('employees.bulk-upload.history')}
            className="px-3 py-1.5 rounded-lg text-gray-600 hover:text-gray-900 transition-all flex items-center gap-1.5"
          >
            <Clock className="w-3.5 h-3.5 text-gray-500" />
            <span>Upload History & Audit Log</span>
          </Link>
        </div>
      </div>

      {!executionResults && (
        <div className={`grid grid-cols-1 ${selectedFile ? 'lg:grid-cols-1' : 'lg:grid-cols-2'} gap-6 mb-6 items-stretch`}>
          {/* LEFT SIDE: Guidelines (Hidden when a file is already uploaded / restored) */}
          {!selectedFile && (
            <div className="card bg-blue-50/70 border border-blue-100 p-5 shadow-sm rounded-xl flex flex-col justify-between">
              <div>
                <h4 className="text-[#1F3864] font-bold text-base mb-3 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-blue-700 shrink-0" />
                  <span>Important Guidelines for Bulk Upload</span>
                </h4>
                <ul className="text-xs text-gray-700 space-y-2.5">
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-1.5 shrink-0" />
                    <span><strong>Reporting Manager:</strong> Use <strong>reporting_manager_code</strong> to assign a manager belonging to the same client.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-1.5 shrink-0" />
                    <span><strong>Declarations & Optional Gaps:</strong> Supported fields include <strong>declarations_accepted</strong> (1/yes or 0/no), <strong>emergency_contact_name</strong>, <strong>previous_employer_name</strong>, and <strong>previous_employer_uan</strong>.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-1.5 shrink-0" />
                    <span><strong>Statutory Toggles:</strong> Use <strong>1</strong> for Yes/True and <strong>0</strong> for No/False (e.g., pf_applicable, esi_applicable).</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-1.5 shrink-0" />
                    <span><strong>Dates Format:</strong> Must be in <strong>YYYY-MM-DD</strong> format (e.g., 2023-01-15).</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-1.5 shrink-0" />
                    <span><strong>ESI Rule:</strong> ESI will strictly be overridden to ₹0 if Gross Salary exceeds ₹21,000.</span>
                  </li>
                </ul>
              </div>

              <div className="mt-4 pt-3 border-t border-blue-100 flex items-center justify-between text-xs text-blue-800 font-medium">
                <span>Need spreadsheet template?</span>
                <span className="font-semibold text-blue-900">Select Client & Download Template</span>
              </div>
            </div>
          )}

          {/* RIGHT SIDE: Upload File Option / Dropzone */}
          <div className="flex flex-col h-full gap-4">
            {/* Client Template Selection & Download Bar */}
            {!selectedFile && (
              <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="w-full sm:w-auto flex-1 max-w-xs">
                  <SearchableClientDropdown 
                    clients={clients} 
                    selectedClientId={selectedClientId} 
                    onChange={setSelectedClientId} 
                  />
                </div>
                <Button 
                  disabled={!selectedClientId}
                  onClick={() => window.location.href = route('employees.bulk-upload.download-template', { client_id: selectedClientId })}
                  variant="outline"
                  className="w-full sm:w-auto shrink-0 shadow-2xs"
                >
                  Download Client Template (.XLSX)
                </Button>
              </div>
            )}

            {selectedFile ? (
              <div className="card p-6 border border-indigo-100 bg-white rounded-xl shadow-sm flex flex-col justify-between h-full">
                <div>
                  <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-4">
                    <div className="flex items-center gap-2">
                      <FileSpreadsheet className="w-5 h-5 text-indigo-600" />
                      <h4 className="font-bold text-sm text-[#1F3864]">Uploaded Excel File</h4>
                    </div>
                    {isUploading ? (
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 flex items-center gap-1.5 border border-indigo-100">
                        <Loader2 className="w-3.5 h-3.5 text-indigo-600 animate-spin" />
                        Validating File...
                      </span>
                    ) : validationResults ? (
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1 ${
                        validationResults.error_count === 0 ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-800'
                      }`}>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {validationResults.valid_count} Ready
                      </span>
                    ) : null}
                  </div>

                  <div className="flex items-center gap-4 bg-indigo-50/50 p-4 rounded-xl border border-indigo-100 mb-4">
                    <div className="w-12 h-12 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold shrink-0">
                      {isUploading ? (
                        <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
                      ) : (
                        <FileSpreadsheet className="w-6 h-6" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm text-gray-900 truncate">{selectedFile.name}</p>
                      <p className="text-xs text-gray-500 font-medium mt-0.5">
                        {(selectedFile.size / 1024).toFixed(1)} KB · Spreadsheet File
                      </p>
                    </div>
                  </div>

                  {/* Multi-Step Validation Progress Indicator */}
                  {isUploading && (
                    <div className="w-full space-y-2.5 text-left bg-indigo-50/40 p-4 rounded-xl border border-indigo-100 mb-4 text-xs">
                      <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${validationStep >= 1 ? 'bg-indigo-600 animate-pulse' : 'bg-gray-300'}`} />
                        <span className={`font-semibold ${validationStep >= 1 ? 'text-indigo-900 font-bold' : 'text-gray-400'}`}>
                          Step 1: Reading Excel columns & row schema
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${validationStep >= 2 ? 'bg-indigo-600 animate-pulse' : 'bg-gray-300'}`} />
                        <span className={`font-semibold ${validationStep >= 2 ? 'text-indigo-900 font-bold' : 'text-gray-400'}`}>
                          Step 2: Validating statutory compliance & PF/ESI rules
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${validationStep >= 3 ? 'bg-indigo-600 animate-pulse' : 'bg-gray-300'}`} />
                        <span className={`font-semibold ${validationStep >= 3 ? 'text-indigo-900 font-bold' : 'text-gray-400'}`}>
                          Step 3: Verifying client defaults & duplicate codes
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                <div className={`flex items-center justify-between gap-3 pt-3 border-t border-gray-100 ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="flex items-center gap-1.5 text-xs text-gray-700 hover:bg-gray-50"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Change File
                  </Button>
                  <Button 
                    variant="danger" 
                    size="sm" 
                    onClick={handleRemoveFile}
                    disabled={isUploading}
                    className="flex items-center gap-1.5 text-xs"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Remove File
                  </Button>
                </div>
              </div>
            ) : (
              <div 
                className={`card h-full min-h-[260px] flex flex-col items-center justify-center p-8 border-2 border-dashed transition-all duration-200 cursor-pointer rounded-xl text-center ${
                  isDragging 
                    ? 'border-indigo-500 bg-indigo-50/70 shadow-lg scale-[1.01]' 
                    : 'border-gray-300 bg-gray-50/70 hover:bg-gray-100/80 hover:border-indigo-400'
                } ${isUploading || isExecuting ? 'opacity-60 pointer-events-none' : ''}`}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    handleFileProcess(e.dataTransfer.files[0]);
                  }
                }}
              >
                {isUploading ? (
                  <div className="flex flex-col items-center max-w-sm w-full py-2 space-y-3">
                    <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mb-1" strokeWidth={2} />
                    <p className="font-bold text-sm text-[#1F3864]">Validating Employee Spreadsheet...</p>

                    <div className="w-full space-y-2 text-left bg-white p-3.5 rounded-xl border border-indigo-100 shadow-sm text-xs">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${validationStep >= 1 ? 'bg-indigo-600 animate-pulse' : 'bg-gray-300'}`} />
                        <span className={`font-semibold ${validationStep >= 1 ? 'text-indigo-900 font-bold' : 'text-gray-400'}`}>
                          Step 1: Reading Excel columns & row schema
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${validationStep >= 2 ? 'bg-indigo-600 animate-pulse' : 'bg-gray-300'}`} />
                        <span className={`font-semibold ${validationStep >= 2 ? 'text-indigo-900 font-bold' : 'text-gray-400'}`}>
                          Step 2: Validating statutory compliance & PF/ESI rules
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${validationStep >= 3 ? 'bg-indigo-600 animate-pulse' : 'bg-gray-300'}`} />
                        <span className={`font-semibold ${validationStep >= 3 ? 'text-indigo-900 font-bold' : 'text-gray-400'}`}>
                          Step 3: Verifying client defaults & duplicate codes
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3 shadow-inner">
                      <UploadCloud className="w-6 h-6" strokeWidth={1.75} />
                    </div>
                    <p className="font-bold text-sm text-[#1F3864] mb-1">
                      Click to select or drag and drop your Excel/CSV file
                    </p>
                    <p className="text-xs text-gray-500 font-medium mb-1">Supports .xlsx, .xls, .csv up to 10MB</p>
                  </>
                )}
                
              </div>
            )}
          </div>
        </div>
      )}
      
      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
        onChange={handleFileChange}
      />

      {isSessionRestoredBanner && validationResults && !executionResults && (
        <div className="mb-4 bg-indigo-50 border border-indigo-200 p-3.5 rounded-xl flex items-center justify-between gap-4 text-xs font-semibold text-indigo-900 shadow-sm animate-fade-in">
          <div className="flex items-center gap-2.5">
            <span className="w-2 h-2 rounded-full bg-indigo-600 animate-ping shrink-0" />
            <span>
              <strong>Session Restored:</strong> Restored your active validated batch from session. It will remain saved for <strong>10 minutes</strong> before automatic cleanup.
            </span>
          </div>
          <button 
            onClick={handleRemoveFile} 
            className="text-indigo-700 hover:text-indigo-900 underline text-[0.75rem] font-bold"
          >
            Clear Session & Remove
          </button>
        </div>
      )}

      {!executionResults && validationResults && (
        <div className="card p-6">
          <div className="border-b border-gray-100 pb-4 mb-5">
            <h3 className="text-lg font-bold text-[#1F3864] m-0">File Import Validation Status</h3>
            <p className="text-xs text-gray-500 mt-0.5 font-medium">
              Employee spreadsheet analysis details
            </p>
          </div>

          <div className="border border-gray-200 rounded-xl overflow-hidden mb-6 text-xs bg-white">
            <table className="w-full text-left">
              <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 uppercase tracking-wider font-bold">
                <tr>
                  <th className="py-3 px-4">File Name</th>
                  <th className="py-3 px-4 text-center">Total Records</th>
                  <th className="py-3 px-4 text-center">Success</th>
                  <th className="py-3 px-4 text-center">Failures</th>
                  <th className="py-3 px-4">Created By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <tr className="hover:bg-gray-50/50 transition-colors">
                  {/* File Name */}
                  <td className="py-3.5 px-4 font-semibold text-gray-900 truncate max-w-[240px]">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-indigo-600 shrink-0" />
                      <span>{selectedFile?.name || 'Excel File'}</span>
                    </div>
                  </td>

                  {/* Total Records */}
                  <td className="py-3.5 px-4 text-center font-bold text-gray-900">
                    <div className="flex items-center justify-center gap-2">
                      <span>{(validationResults.total_rows || 0).toLocaleString()}</span>
                      {validationResults.rows && validationResults.rows.length > 0 && (
                        <button
                          type="button"
                          onClick={() => downloadAllRowsXlsx(validationResults.rows)}
                          className="p-1.5 rounded-lg text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-all shadow-xs cursor-pointer flex items-center justify-center"
                          title="Download All Total Records (.XLSX)"
                        >
                          <Download className="w-3.5 h-3.5 text-blue-600" />
                        </button>
                      )}
                    </div>
                  </td>

                  {/* Success */}
                  <td className="py-3.5 px-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[0.7rem] font-bold bg-green-50 text-green-700 border border-green-200">
                        <CheckCircle2 className="w-3 h-3" />
                        {(validationResults.valid_count || 0).toLocaleString()}
                      </span>
                      {validationResults.valid_count > 0 && (
                        <button
                          type="button"
                          onClick={() => downloadSuccessRowsXlsx(validationResults.rows)}
                          className="p-1.5 rounded-lg text-green-700 bg-green-50 hover:bg-green-100 border border-green-200 transition-all shadow-xs cursor-pointer flex items-center justify-center"
                          title="Download Validated Success Rows (.XLSX)"
                        >
                          <Download className="w-3.5 h-3.5 text-green-600" />
                        </button>
                      )}
                    </div>
                  </td>

                  {/* Failures */}
                  <td className="py-3.5 px-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      {validationResults.error_count > 0 ? (
                        <>
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[0.7rem] font-bold bg-red-50 text-red-700 border border-red-200">
                            <XCircle className="w-3 h-3" />
                            {validationResults.error_count.toLocaleString()}
                          </span>
                          <button
                            type="button"
                            onClick={() => downloadErrorRowsXlsx(validationResults.rows)}
                            className="p-1.5 rounded-lg text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 transition-all shadow-xs cursor-pointer flex items-center justify-center"
                            title="Download Error/Failure Rows (.XLSX)"
                          >
                            <Download className="w-3.5 h-3.5 text-red-600" />
                          </button>
                        </>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[0.7rem] font-bold bg-gray-50 text-gray-400 border border-gray-200">
                          0
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Created By */}
                  <td className="py-3.5 px-4 font-medium text-gray-700">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-[0.65rem] shrink-0">
                        {auth?.user?.name ? auth.user.name.charAt(0).toUpperCase() : 'U'}
                      </div>
                      <div>
                        <div className="font-bold text-gray-800 text-xs">{auth?.user?.name || 'System User'}</div>
                        <span className="text-[0.6rem] text-gray-400 uppercase font-semibold">{auth?.user?.role || 'admin'}</span>
                      </div>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="flex flex-col items-end gap-3 border-t border-gray-200 p-6 bg-gray-50">
            {validationResults.error_count > 0 && (
              <div className="mb-2 p-3 bg-white border border-red-200 rounded-md shadow-sm w-full max-w-3xl text-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                <label className="flex items-start gap-3 cursor-pointer flex-1">
                  <input 
                    type="checkbox" 
                    className="mt-1 w-4 h-4 text-[#1F3864] rounded border-gray-300 focus:ring-[#1F3864]"
                    checked={partialImportAcknowledged}
                    onChange={(e) => setPartialImportAcknowledged(e.target.checked)}
                  />
                  <span className="text-gray-700 leading-tight font-medium">
                    I acknowledge that only the <strong className="text-green-600">{validationResults.valid_count} Valid</strong> rows will be imported. 
                    The <strong className="text-red-600">{validationResults.error_count} Error</strong> rows will be discarded.
                  </span>
                </label>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => downloadErrorRowsXlsx(validationResults.rows)}
                  className="flex items-center gap-1.5 text-xs font-bold text-red-700 border-red-300 bg-red-50 hover:bg-red-100 shrink-0 shadow-sm"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-red-600" /> Download Error Rows (.XLSX)
                </Button>
              </div>
            )}
            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={handleCancelClick} disabled={isExecuting}>
                Cancel
              </Button>
              <Button variant="outline" disabled={!canConfirmImport || isExecuting || validationResults.valid_count === 0} onClick={() => openImportConfirmation('direct')}>
                {isExecuting ? 'Importing...' : `Direct Import (${validationResults.valid_count} valid)`}
              </Button>
              <Button variant="primary" disabled={!canConfirmImport || isExecuting || validationResults.valid_count === 0} onClick={() => openImportConfirmation('queue')}>
                {isExecuting ? 'Queueing...' : `⚡ Queue Background Job (${validationResults.valid_count} valid)`}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Import Confirmation Modal (Are you confirmed? Yes / No) */}
      {showImportConfirmModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={() => setShowImportConfirmModal(false)} />
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 border border-gray-100 animate-scale-up z-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-[#1F3864]">Are you confirmed?</h3>
                <p className="text-xs text-gray-500 font-medium">Please confirm before processing employee records import</p>
              </div>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-5 text-xs font-medium space-y-2 text-gray-700">
              <div className="flex justify-between items-center pb-2 border-b border-gray-200">
                <span className="text-gray-500">Import Mode:</span>
                <span className="font-bold text-[#1F3864]">
                  {importTargetMode === 'queue' ? '⚡ Background Queue Job' : 'Direct Import'}
                </span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-gray-200">
                <span className="text-gray-500">Valid Employee Records:</span>
                <span className="font-bold text-green-600 font-mono text-sm">
                  {(validationResults?.valid_count || 0).toLocaleString()} Valid
                </span>
              </div>
              {validationResults?.error_count > 0 && (
                <div className="flex justify-between items-center text-red-600">
                  <span>Discarded Error Rows:</span>
                  <span className="font-bold font-mono">
                    {validationResults.error_count.toLocaleString()} Errors
                  </span>
                </div>
              )}
            </div>

            <p className="text-xs text-gray-600 font-medium mb-6 leading-relaxed">
              Are you sure you want to proceed with importing <strong>{(validationResults?.valid_count || 0).toLocaleString()}</strong> employee records into the database?
            </p>

            <div className="flex items-center justify-end gap-3">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowImportConfirmModal(false)}
              >
                No, Cancel
              </Button>
              <Button
                variant={importTargetMode === 'queue' ? 'primary' : 'outline'}
                size="sm"
                onClick={confirmAndProceedImport}
                className="font-bold shadow-sm"
              >
                Yes, Confirm & Import
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Live Background Queue Job Progress Modal Popup */}
      {isProgressModalOpen && activeBatch && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" />

          {/* Dialog Container */}
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl p-6 border border-gray-100 animate-scale-up z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 text-[#1F3864] flex items-center justify-center font-bold">
                  <Loader2 className={`w-5 h-5 text-blue-700 ${activeBatch.status !== 'completed' && activeBatch.status !== 'failed' ? 'animate-spin' : ''}`} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[#1F3864]">Bulk Upload Progress</h3>
                  <p className="text-xs text-gray-500">{activeBatch.file_name}</p>
                </div>
              </div>
              <Badge
                status={
                  activeBatch.status === 'completed' ? 'active' :
                  activeBatch.status === 'failed' ? 'rejected' : 'pending'
                }
                label={activeBatch.status.toUpperCase()}
              />
            </div>

            {/* Live Progress Bar */}
            <div className="my-6">
              <div className="flex justify-between items-center text-sm font-bold text-gray-700 mb-2">
                <span>Processing Employees...</span>
                <span className="text-blue-700 text-lg">{activeBatch.progress_percentage || 0}%</span>
              </div>

              <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden shadow-inner">
                <div
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 h-4 rounded-full transition-all duration-500"
                  style={{ width: `${activeBatch.progress_percentage || 0}%` }}
                />
              </div>

              <div className="flex justify-between items-center text-xs text-gray-500 font-semibold mt-2">
                <span>Processed {activeBatch.processed_rows?.toLocaleString() || 0} of {activeBatch.total_rows?.toLocaleString() || 0} rows</span>
                {activeBatch.status === 'completed' && (
                  <span className="text-green-600 font-bold">✅ 100% Completed! Displaying Summary...</span>
                )}
              </div>
            </div>

            {/* Stats Summary Grid */}
            <div className="grid grid-cols-3 gap-2 bg-gray-50 p-3 rounded-lg text-center text-xs font-semibold">
              <div className="p-2 bg-white rounded border border-gray-100">
                <span className="text-gray-400 block text-[0.65rem]">VALID</span>
                <span className="text-green-600 font-bold text-sm">{activeBatch.valid_count?.toLocaleString() || 0}</span>
              </div>
              <div className="p-2 bg-white rounded border border-gray-100">
                <span className="text-gray-400 block text-[0.65rem]">WARNINGS</span>
                <span className="text-yellow-600 font-bold text-sm">{activeBatch.warning_count?.toLocaleString() || 0}</span>
              </div>
              <div className="p-2 bg-white rounded border border-gray-100">
                <span className="text-gray-400 block text-[0.65rem]">ERRORS</span>
                <span className="text-red-600 font-bold text-sm">{activeBatch.error_count?.toLocaleString() || 0}</span>
              </div>
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
              <p className="text-green-600 text-sm mt-1 font-medium">
                {executionResults.ignored_errors_count > 0 
                  ? <span className="font-bold text-red-600">❌ {executionResults.ignored_errors_count} error rows were ignored. </span>
                  : 'All valid employees have been successfully saved to the database. '}
                <span>User accounts and email invitations are being provisioned in the background via queue worker.</span>
              </p>
            </div>
            <div className="flex gap-3 flex-wrap">
              {validationResults && validationResults.rows && validationResults.rows.some(r => r.status === 'error') && (
                <Button 
                  variant="outline" 
                  onClick={() => downloadErrorRowsXlsx(validationResults.rows)}
                  className="flex items-center gap-1.5 text-red-700 border-red-300 bg-red-50 hover:bg-red-100 font-bold"
                >
                  <FileSpreadsheet className="w-4 h-4 text-red-600" /> Download Error Rows (.XLSX)
                </Button>
              )}
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
      {/* Cancel Warning Confirmation Modal */}
      {showCancelWarningModal && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={() => setShowCancelWarningModal(false)} />

          {/* Modal Container */}
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 border border-amber-200 z-10 space-y-4">
            <div className="flex items-center gap-3 text-amber-600">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center font-bold text-xl">
                ⚠️
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Warning: Cancel Bulk Upload?</h3>
                <p className="text-xs text-gray-500 mt-0.5">Active file or import process detected</p>
              </div>
            </div>

            <p className="text-sm text-gray-700 leading-relaxed bg-amber-50/60 p-3.5 rounded-xl border border-amber-100">
              {isProcessing 
                ? 'A bulk upload / import operation is currently processing in the background. Refreshing, cancelling, or leaving now may interrupt processing and cause incomplete data import.'
                : 'You have a validated file session ready for import. Cancelling will discard this session and reset the form.'
              }
            </p>

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setShowCancelWarningModal(false)}>
                Stay & Continue
              </Button>
              <Button variant="danger" onClick={handleConfirmCancel}>
                Yes, Cancel Import
              </Button>
            </div>
          </div>
        </div>
      )}
      {/* Navigation Intercept Warning Modal */}
      {showNavWarningModal && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={() => setShowNavWarningModal(false)} />

          {/* Modal Container */}
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 border border-amber-200 z-10 space-y-4 animate-scale-up">
            <div className="flex items-center gap-3 text-amber-600">
              <div className="w-11 h-11 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center font-bold">
                <AlertTriangle className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Warning: Bulk Upload Processing</h3>
                <p className="text-xs text-gray-500 mt-0.5">Active import process detected</p>
              </div>
            </div>

            <div className="bg-amber-50/70 p-4 rounded-xl border border-amber-100 space-y-2">
              <p className="text-xs font-semibold text-amber-900 uppercase tracking-wider">Navigation Warning</p>
              <p className="text-sm text-gray-700 leading-relaxed font-medium">
                A bulk upload / import operation is currently processing in the background. Navigating away from this page will interrupt the upload and could cause incomplete data import.
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setShowNavWarningModal(false)}>
                Stay on This Page
              </Button>
              <Button variant="danger" onClick={confirmPendingNav}>
                Leave Page & Discard
              </Button>
            </div>
          </div>
        </div>
      )}

    </AuthenticatedLayout>
    </RoleGuard>
  );
}
