import React, { useState, useEffect, useRef } from 'react';
import AuthenticatedLayout from '../../Layouts/AuthenticatedLayout';
import { Head, Link, router } from '@inertiajs/react';
import Button from '../../Components/ui/Button';
import DataTable from '../../Components/ui/DataTable';
import Badge from '../../Components/ui/Badge';
import Select from '../../Components/ui/Select';
import Pagination from '../../Components/ui/Pagination';
import { 
  UploadCloud, FileSpreadsheet, Loader2, Calendar, Info, CheckCircle2, 
  AlertTriangle, Clock, RefreshCw, X, XCircle, Download, Search, FileText,
  Copy, Check, AlertCircle, Sparkles, Filter, ChevronDown, ChevronUp, Layers, ArrowRight, ShieldCheck
} from 'lucide-react';
import axios from 'axios';
import RoleGuard from '../../Components/RoleGuard.jsx';

export default function AttendanceUpload({ clients, upload_history = [] }) {
  const [selectedClientId, setSelectedClientId] = useState(clients && clients.length > 0 ? clients[0].id : '');
  const [targetMonth, setTargetMonth] = useState('2026-08');
  const [file, setFile] = useState(null);

  const [historySearch, setHistorySearch] = useState('');
  const [historyStatusFilter, setHistoryStatusFilter] = useState('all');
  const [historyPage, setHistoryPage] = useState(1);
  const historyItemsPerPage = 5;

  const filteredUploadHistory = (upload_history || []).filter(batch => {
    const matchesSearch = !historySearch || 
      (batch.file_name && batch.file_name.toLowerCase().includes(historySearch.toLowerCase())) ||
      (batch.id && batch.id.toLowerCase().includes(historySearch.toLowerCase())) ||
      (batch.user?.name && batch.user.name.toLowerCase().includes(historySearch.toLowerCase()));
    
    const matchesStatus = historyStatusFilter === 'all' || 
      (batch.status && batch.status.toLowerCase() === historyStatusFilter.toLowerCase());

    return matchesSearch && matchesStatus;
  });

  const totalHistoryItems = filteredUploadHistory.length;
  const totalHistoryPages = Math.ceil(totalHistoryItems / historyItemsPerPage) || 1;
  const paginatedUploadHistory = filteredUploadHistory.slice(
    (historyPage - 1) * historyItemsPerPage,
    historyPage * historyItemsPerPage
  );
  const [contextData, setContextData] = useState(null);

  const getMonthOptions = () => {
    const options = [];
    const startDate = new Date(2026, 4, 1); // May 2026 (index 4)
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 2);

    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const year = currentDate.getFullYear();
      const monthNum = String(currentDate.getMonth() + 1).padStart(2, '0');
      const label = currentDate.toLocaleString('default', { month: 'long' }) + ' ' + year;
      options.push({ value: `${year}-${monthNum}`, label });
      currentDate.setMonth(currentDate.getMonth() + 1);
    }
    return options.reverse();
  };

  const [validationData, setValidationData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [summary, setSummary] = useState(null);
  const [batchId, setBatchId] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [partialImportAcknowledged, setPartialImportAcknowledged] = useState(false);

  // Validation Explorer State
  const [rowTab, setRowTab] = useState('all'); // 'all' | 'errors' | 'warnings' | 'valid'
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [rowSearch, setRowSearch] = useState('');
  const [rowPage, setRowPage] = useState(1);
  const rowItemsPerPage = 10;
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);

  const fileInputRef = useRef(null);

  const categorizeRowNote = (row) => {
    const note = (row.notes || '').toLowerCase();
    const status = row.status;
    if (status === 'blocked_locked' || note.includes('already locked') || note.includes('locked')) {
      return { key: 'locked', label: 'Payroll Locked', color: 'bg-purple-50 text-purple-700 border-purple-200', icon: '🔒', severity: 'danger' };
    }
    if (note.includes('not found') || note.includes('employee code not found')) {
      return { key: 'missing_emp', label: 'Employee Code Not Found', color: 'bg-red-50 text-red-700 border-red-200', icon: '🔴', severity: 'danger' };
    }
    if (note.includes('invalid present days') || note.includes('invalid lop days') || note.includes('invalid days_present') || note.includes('invalid days_lop') || note.includes('invalid number')) {
      return { key: 'format', label: 'Invalid Number Format', color: 'bg-rose-50 text-rose-700 border-rose-200', icon: '⛔', severity: 'danger' };
    }
    if (note.includes('total days exceeded') || note.includes("numbers don't match") || note.includes('working days total') || note.includes('mismatch')) {
      return { key: 'mismatch', label: 'Total Days Exceeded', color: 'bg-amber-50 text-amber-800 border-amber-200', icon: '⚠️', severity: 'danger' };
    }
    if (status === 'skipped' || note.includes('future joining date') || note.includes('not yet joined')) {
      return { key: 'future_doj', label: 'Future Joining Date', color: 'bg-blue-50 text-blue-700 border-blue-200', icon: 'ℹ️', severity: 'info' };
    }
    if (note.includes('capped to month limit') || note.includes('capped') || note.includes('adjusted')) {
      return { key: 'adjusted', label: 'Capped to Month Limit', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: '⚡', severity: 'warning' };
    }
    if (note.includes('missing days auto-filled') || note.includes('shortfall') || note.includes('auto-filled')) {
      return { key: 'shortfall', label: 'Missing Days Auto-Filled', color: 'bg-teal-50 text-teal-700 border-teal-200', icon: '⚡', severity: 'warning' };
    }
    if (note.includes('sheet month mismatch') || note.includes('target month mismatch')) {
      return { key: 'month_mismatch', label: 'Month Mismatch Warning', color: 'bg-orange-50 text-orange-700 border-orange-200', icon: '🗓️', severity: 'warning' };
    }
    if (status === 'valid') {
      return { key: 'valid', label: 'Valid / Ready', color: 'bg-green-50 text-green-700 border-green-200', icon: '✅', severity: 'success' };
    }
    return { key: 'other_error', label: 'Validation Issue', color: 'bg-red-50 text-red-700 border-red-200', icon: '❌', severity: 'danger' };
  };

  const copyErrorSummary = () => {
    const errorRows = (validationData || []).filter(r => r.status === 'invalid' || r.status === 'blocked_locked');
    if (errorRows.length === 0) return;

    let summaryText = `Attendance Upload Validation Errors (${errorRows.length} issues) - ${file?.name || 'Timesheet'}:\n`;
    summaryText += `Target Client: ${clients?.find(c => String(c.id) === String(selectedClientId))?.company_name || selectedClientId} | Month: ${targetMonth}\n`;
    summaryText += `--------------------------------------------------------\n\n`;
    errorRows.forEach((r, idx) => {
      summaryText += `[#${r.id}] Emp Code: ${r.empCode} | Name: ${r.matchedName}\n`;
      summaryText += `    Entered Values: Present=${r.daysPresent}, LOP=${r.daysLOP}\n`;
      summaryText += `    Error Reason: ${r.notes || 'Validation error'}\n\n`;
    });

    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(summaryText)
        .then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2500);
        })
        .catch(() => {
          fallbackCopyText(summaryText);
        });
    } else {
      fallbackCopyText(summaryText);
    }
  };

  const fallbackCopyText = (text) => {
    try {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed";
      textArea.style.left = "-999999px";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      if (successful) {
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      } else {
        setCopyFailed(true);
        setTimeout(() => setCopyFailed(false), 4000);
      }
    } catch (err) {
      setCopyFailed(true);
      setTimeout(() => setCopyFailed(false), 4000);
    }
  };

  useEffect(() => {
    if (selectedClientId && targetMonth) {
      axios.get(route('payroll.attendance.context'), {
        params: { client_id: selectedClientId, target_month: targetMonth }
      })
      .then(res => setContextData(res.data))
      .catch(() => setContextData(null));
    }
  }, [selectedClientId, targetMonth]);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      triggerValidation(selectedFile, selectedClientId, targetMonth);
    }
  };

  const triggerValidation = (selectedFile, clientId, month) => {
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');
    setBatchId(null);
    setPartialImportAcknowledged(false);
    
    const formData = new FormData();
    formData.append('client_id', clientId);
    formData.append('target_month', month);
    formData.append('file', selectedFile);

    axios.post(route('payroll.attendance.validate'), formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
    .then(response => {
      const rows = response.data.rows || [];
      const errorCount = response.data.error_count || 0;
      setValidationData(rows);
      setBatchId(response.data.batch_id);
      setSummary({
        total: response.data.total_rows,
        matched: response.data.matched_rows,
        skipped: response.data.skipped_count || 0,
        errors: errorCount
      });
      setRowTab(errorCount > 0 ? 'errors' : 'all');
      setCategoryFilter('all');
      setRowPage(1);
      setRowSearch('');
      setLoading(false);
      setTimeout(() => {
        const el = document.getElementById('validation-analysis-section');
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 150);
    })
    .catch(err => {
      setErrorMsg(err.response?.data?.error || err.response?.data?.message || 'Failed to validate timesheet file.');
      setValidationData([]);
      setSummary(null);
      setLoading(false);
    });
  };

  const handleClientChange = (e) => {
    const nextClientId = e.target.value;
    setSelectedClientId(nextClientId);
    if (file) {
      triggerValidation(file, nextClientId, targetMonth);
    }
  };

  const handleMonthChange = (e) => {
    const nextMonth = e.target.value;
    setTargetMonth(nextMonth);
    if (file) {
      triggerValidation(file, selectedClientId, nextMonth);
    }
  };

  const handleSave = () => {
    if (!batchId) {
      setErrorMsg('No active validation session. Please re-upload.');
      return;
    }

    setIsProcessing(true);
    setErrorMsg('');

    axios.post(route('payroll.attendance.upload-async'), {
      batch_id: batchId,
      partial_import: true
    })
    .then(res => {
      setIsProcessing(false);
      setSuccessMsg('Attendance records successfully processed and saved!');
      setTimeout(() => {
        router.visit(route('payroll.attendance-review', {
          client_id: selectedClientId,
          month: targetMonth
        }));
      }, 1500);
    })
    .catch(err => {
      setErrorMsg(err.response?.data?.error || err.response?.data?.message || 'Failed to process attendance upload.');
      setIsProcessing(false);
    });
  };

  const handleRemoveFile = () => {
    setFile(null);
    setValidationData([]);
    setSummary(null);
    setBatchId(null);
    setErrorMsg('');
    setSuccessMsg('');
    setPartialImportAcknowledged(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const downloadTotalCsv = () => {
    if (!validationData || validationData.length === 0) return;
    let csv = 'Row No,Employee Code,Employee Name,Days Present,Days LOP,Status,Notes\n';
    validationData.forEach(r => {
      const escapedNotes = r.notes ? `"${r.notes.replace(/"/g, '""')}"` : '';
      csv += `${r.id},${r.empCode},"${r.matchedName}",${r.daysPresent},${r.daysLOP},${r.status},${escapedNotes}\n`;
    });
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', `attendance_total_records_${targetMonth}.csv`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const downloadSuccessCsv = () => {
    if (!validationData || validationData.length === 0) return;
    const validRows = validationData.filter(r => r.status === 'valid');
    if (validRows.length === 0) return;
    let csv = 'Row No,Employee Code,Employee Name,Days Present,Days LOP,Status,Notes\n';
    validRows.forEach(r => {
      const escapedNotes = r.notes ? `"${r.notes.replace(/"/g, '""')}"` : '';
      csv += `${r.id},${r.empCode},"${r.matchedName}",${r.daysPresent},${r.daysLOP},${r.status},${escapedNotes}\n`;
    });
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', `attendance_success_rows_${targetMonth}.csv`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const downloadErrorCsv = () => {
    if (!validationData || validationData.length === 0) return;
    const errorRows = validationData.filter(r => r.status !== 'valid');
    if (errorRows.length === 0) return;
    let csv = 'Row No,Employee Code,Employee Name,Days Present,Days LOP,Status,Notes\n';
    errorRows.forEach(r => {
      const escapedNotes = r.notes ? `"${r.notes.replace(/"/g, '""')}"` : '';
      csv += `${r.id},${r.empCode},"${r.matchedName}",${r.daysPresent},${r.daysLOP},${r.status},${escapedNotes}\n`;
    });
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', `attendance_error_rows_${targetMonth}.csv`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const columns = [
    {
      header: 'Parsed Emp Code',
      accessor: 'empCode'
    },
    {
      header: 'System Matched Employee',
      accessor: 'matchedName',
      cell: (row) => <strong>{row.matchedName}</strong>
    },
    {
      header: 'Match Confidence',
      accessor: 'matchType',
      cell: (row) => {
        if (row.matchType === 'exact') {
          return (
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-green-500"></span>
              <span className="text-[0.75rem] font-semibold text-green-600">100% Exact Match</span>
            </div>
          );
        } else {
          return (
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-500"></span>
              <span className="text-[0.75rem] font-semibold text-red-600">✗ Not Found</span>
            </div>
          );
        }
      }
    },
    {
      header: 'Days Present',
      accessor: 'daysPresent',
      cell: (row) => <span>{row.daysPresent} Days</span>
    },
    {
      header: 'Days LOP',
      accessor: 'daysLOP',
      cell: (row) => <span>{row.daysLOP} Days</span>
    },
    {
      header: 'Status',
      accessor: 'status',
      cell: (row) => {
        if (row.status === 'valid') return <Badge type="success">✓ Valid</Badge>;
        if (row.status === 'skipped') return <Badge type="warning">⚠️ Skipped</Badge>;
        if (row.status === 'invalid') return <Badge type="danger">✗ Invalid</Badge>;
        return <Badge type="neutral">{row.status}</Badge>;
      }
    },
    {
      header: 'Notes',
      accessor: 'notes',
      cell: (row) => <span className="text-[0.75rem] text-gray-500 leading-snug block max-w-[320px]">{row.notes}</span>
    }
  ];

  return (
    <RoleGuard allowedRoles={['admin', 'manager']} moduleKey="payroll">
      <AuthenticatedLayout>
        <Head title="Upload Attendance" />

        {/* Top Header Section */}
        <div className="mb-6">
          <div className="flex items-center gap-2 text-xs text-gray-500 mb-1 font-semibold">
            <Link href={route('payroll.attendance-review', { client_id: selectedClientId, month: targetMonth })} className="hover:underline text-[#1F3864]">Attendance Review</Link>
            <span>/</span>
            <span className="text-gray-700">Upload</span>
          </div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold text-[#1F3864]">Upload External Attendance Sheets</h2>
          </div>
        </div>

        {errorMsg && (
          <div className="bg-red-50 text-red-700 p-4 rounded-xl mb-6 border border-red-200 text-sm font-semibold">
            {errorMsg}
          </div>
        )}

        {successMsg && (
          <div className="bg-emerald-50 text-emerald-700 p-4 rounded-xl mb-6 border border-emerald-200 text-sm font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            {successMsg}
          </div>
        )}

        {/* STEP 1: Select Client & Target Month */}
        <div className="card p-6 shadow-sm border border-gray-200 rounded-2xl bg-white mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-[#1F3864] text-white flex items-center justify-center font-black text-xs shrink-0">1</span>
                <h3 className="text-lg font-bold text-[#1F3864] m-0">Select Client & Target Month</h3>
              </div>
              <p className="text-xs text-gray-500 mt-1 font-medium pl-8">
                Choose client and payroll month to calculate client-specific working days
              </p>
            </div>
            
            {/* Scope Selectors */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
              <div className="w-full sm:w-64">
                <Select value={selectedClientId} onChange={handleClientChange} disabled={file !== null}>
                  {clients && clients.map(client => (
                    <option key={client.id} value={client.id}>{client.company_name}</option>
                  ))}
                </Select>
              </div>
              <div className="w-full sm:w-48">
                <Select value={targetMonth} onChange={handleMonthChange} disabled={file !== null}>
                  {getMonthOptions().map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </Select>
              </div>
            </div>
          </div>
        </div>

        {/* STEP 2: Working Days Breakdown & Rules (Matching Top-Level Card) */}
        {contextData && (
          <div className="card p-6 shadow-sm border border-gray-200 rounded-2xl bg-white mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-150 pb-4 mb-5">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-[#1F3864] text-white flex items-center justify-center font-black text-xs shrink-0">2</span>
                  <h3 className="text-lg font-bold text-[#1F3864] m-0">
                    Working Days Breakdown for {contextData.month_label}
                  </h3>
                </div>
                <p className="text-xs text-gray-500 mt-1 font-medium pl-8">
                  Statutory calendar calculation and required attendance rules for this client
                </p>
              </div>
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#1F3864] text-white text-xs font-black shadow-xs shrink-0">
                <span>🎯 Required Working Days:</span>
                <span className="text-amber-300 text-sm font-black">{contextData.working_days_slots} Days</span>
              </div>
            </div>

            {/* Formula & Rule Row */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
              <div className="lg:col-span-6 bg-slate-50 border border-gray-200 p-4 rounded-xl text-xs text-gray-700 leading-relaxed shadow-xs flex flex-col justify-between">
                <div>
                  <div className="font-bold text-[#1F3864] mb-1.5 flex items-center gap-1.5">
                    <Info className="w-4 h-4 text-indigo-600" />
                    <span>How Working Days Are Calculated:</span>
                  </div>
                  <p className="text-gray-500 text-[11px] mb-2 leading-relaxed">
                    Sundays (or client off-days) and holidays are paid automatically — do not include them in present days.
                  </p>
                </div>
                <div className="font-mono text-[11px] bg-white p-2.5 rounded-lg text-indigo-950 font-semibold border border-indigo-100">
                  {contextData.total_calendar_days} Calendar Days − {contextData.off_days_count} Off-Days ({contextData.off_days_label}) − {contextData.workday_holiday_count} Holiday(s) = <strong className="text-indigo-700 text-xs font-bold">{contextData.working_days_slots} Working Day Slots</strong>
                </div>
              </div>

              <div className="lg:col-span-6 bg-amber-50 border-2 border-amber-300 p-4 rounded-xl text-amber-950 text-xs shadow-xs flex flex-col justify-between">
                <div>
                  <div className="font-black text-amber-900 mb-1 flex items-center gap-1.5 text-xs uppercase tracking-wider">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>CRITICAL UPLOAD RULE:</span>
                  </div>
                  <p className="leading-relaxed">
                    Enter <strong>ONLY actual working days worked + LOP</strong>. For every employee in your file:
                  </p>
                </div>
                <div className="bg-white border border-amber-300 p-2 rounded-lg text-center mt-2 font-mono font-bold text-amber-900 text-xs">
                  <code>days_present + days_lop</code> = <span className="text-indigo-700 text-sm font-black">{contextData.working_days_slots}</span>
                </div>
              </div>
            </div>

            {/* Client Holidays Strip */}
            {contextData.holidays && contextData.holidays.length > 0 && (
              <div className="mt-4 pt-3.5 border-t border-gray-150 flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">
                  Configured Client Holidays ({contextData.month_label}):
                </span>
                {contextData.holidays.map((h, idx) => (
                  <span key={idx} className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border ${h.is_off_day ? 'bg-gray-100 border-gray-250 text-gray-600' : 'bg-emerald-50 border-emerald-200 text-emerald-800'}`}>
                    <span>🏖️ {h.name}</span>
                    <span className="text-[10px] uppercase text-gray-400 font-mono">({h.date})</span>
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* STEP 3 Card: Download Template & Upload Timesheet (Full Width) */}
        <div className="card p-6 shadow-sm border border-gray-200 rounded-2xl bg-white mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-150 pb-4 mb-5">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-[#1F3864] text-white flex items-center justify-center font-black text-xs shrink-0">3</span>
                <h3 className="text-lg font-bold text-[#1F3864] m-0">Download Template & Upload Timesheet</h3>
              </div>
              <p className="text-xs text-gray-500 mt-1 font-medium pl-8">
                Download the pre-formatted Excel template with {contextData?.working_days_slots || 0} working days base, then upload
              </p>
            </div>

            {/* Prominent Template Download Button */}
            <a 
              href={route('payroll.attendance.template', { client_id: selectedClientId, target_month: targetMonth })} 
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-black bg-emerald-50 text-emerald-800 border-2 border-emerald-300 hover:bg-emerald-100 rounded-xl shadow-xs transition-all shrink-0 cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>Download Excel Template ({contextData?.working_days_slots || 0} Working Days Base)</span>
            </a>
          </div>

          <div>
            {file ? (
              <div className="p-5 border border-indigo-200 rounded-xl bg-indigo-50/30 shadow-xs mb-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm shrink-0">
                      XLS
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-[#1F3864] text-sm truncate max-w-[280px]">{file.name}</div>
                      <span className="text-[0.7rem] text-gray-500 font-medium">Size: {Math.round(file.size / 1024)} KB</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isProcessing}
                      className="flex items-center gap-1 text-xs shadow-xs bg-white"
                    >
                      <RefreshCw className="w-3.5 h-3.5" /> Change
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handleRemoveFile}
                      disabled={isProcessing}
                      className="flex items-center gap-1 text-xs text-red-600 border-red-200 hover:bg-red-50 shadow-xs bg-white"
                    >
                      <X className="w-3.5 h-3.5" /> Remove
                    </Button>
                  </div>
                </div>

                {/* Prominent Quick Action Header Bar right in the Upload Card */}
                {loading && (
                  <div className="mt-4 pt-3 border-t border-indigo-100/80 flex items-center gap-2 text-xs font-semibold text-indigo-700">
                    <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                    <span>Validating rows against client working days and statutory rules...</span>
                  </div>
                )}

                {!loading && summary && (
                  <div className="mt-4 pt-3.5 border-t border-indigo-200/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-lg shadow-xs border">
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                        summary.errors === 0 
                          ? 'bg-green-100 text-green-800 border border-green-200' 
                          : 'bg-amber-100 text-amber-900 border border-amber-200'
                      }`}>
                        {summary.errors === 0 ? <CheckCircle2 className="w-3.5 h-3.5 text-green-600" /> : <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />}
                        <span>{summary.matched} Valid / {summary.errors} Errors</span>
                      </span>
                      <span className="text-[11px] text-gray-500 font-medium hidden sm:inline">Ready to save</span>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <button
                        type="button"
                        onClick={() => document.getElementById('validation-analysis-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                        className="px-3 py-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 shadow-xs flex-1 sm:flex-initial justify-center"
                      >
                        <Layers className="w-3.5 h-3.5" />
                        <span>Review Notes</span>
                      </button>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={handleSave}
                        disabled={isProcessing || summary.matched === 0 || (summary.errors > 0 && !partialImportAcknowledged)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs px-3.5 py-1.5 rounded-lg shadow-sm border-0 flex items-center gap-1.5 flex-1 sm:flex-initial justify-center"
                      >
                        {isProcessing ? (
                          <span className="flex items-center gap-1.5">
                            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving...
                          </span>
                        ) : (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Save & Import ({summary.matched})</span>
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div 
                className="flex flex-col items-center justify-center p-12 border-2 border-dashed border-indigo-200 bg-indigo-50/20 hover:bg-indigo-50/40 transition-colors cursor-pointer rounded-2xl text-center"
                onClick={() => fileInputRef.current?.click()}
              >
                <UploadCloud className="w-12 h-12 text-[#1F3864] mb-3" strokeWidth={1.5} />
                <p className="font-bold text-base text-[#1F3864] mb-1">Click to select or drag & drop timesheet file (.xlsx, .csv)</p>
                <p className="text-xs text-gray-500 max-w-[460px] mx-auto leading-relaxed">
                  Ensure columns: <code>target_month</code>, <code>employee_code</code>, <code>days_present</code>, <code>days_lop</code>. 
                  (For {contextData?.month_label || targetMonth}, <strong>days_present + days_lop must equal {contextData?.working_days_slots || 0}</strong>).
                </p>
              </div>
            )}
          </div>
        </div>

        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileChange} 
          accept=".csv,.xlsx,.xls,.txt"
          className="hidden" 
        />

        {loading && (
          <div className="card p-12 flex flex-col items-center justify-center text-gray-500 shadow-sm">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-2" strokeWidth={2.25} />
            <span className="font-bold text-xs uppercase tracking-wider text-[#1F3864]">Analyzing Attendance Sheet...</span>
          </div>
        )}

        {!loading && summary && (() => {
          const warningCount = (validationData || []).filter(r => {
            const cat = categorizeRowNote(r);
            return cat.severity === 'warning' || cat.severity === 'info';
          }).length;

          const errorCategories = (() => {
            const map = {};
            (validationData || []).forEach(row => {
              const cat = categorizeRowNote(row);
              if (row.status !== 'valid' || cat.severity === 'warning' || cat.severity === 'info') {
                if (!map[cat.key]) {
                  map[cat.key] = { ...cat, count: 0 };
                }
                map[cat.key].count++;
              }
            });
            return Object.values(map);
          })();

          const filteredRows = (validationData || []).filter(r => {
            if (rowTab === 'errors') {
              if (r.status !== 'invalid' && r.status !== 'blocked_locked') return false;
            } else if (rowTab === 'warnings') {
              const cat = categorizeRowNote(r);
              if (cat.severity !== 'warning' && cat.severity !== 'info') return false;
            } else if (rowTab === 'valid') {
              if (r.status !== 'valid') return false;
            }

            if (categoryFilter !== 'all') {
              const cat = categorizeRowNote(r);
              if (cat.key !== categoryFilter) return false;
            }

            if (rowSearch.trim()) {
              const s = rowSearch.toLowerCase().trim();
              const matchEmp = (r.empCode || '').toLowerCase().includes(s);
              const matchName = (r.matchedName || '').toLowerCase().includes(s);
              const matchNote = (r.notes || '').toLowerCase().includes(s);
              if (!matchEmp && !matchName && !matchNote) return false;
            }

            return true;
          });

          const totalFilteredPages = Math.ceil(filteredRows.length / rowItemsPerPage) || 1;
          const paginatedRows = filteredRows.slice((rowPage - 1) * rowItemsPerPage, rowPage * rowItemsPerPage);
          const validPercentage = summary.total > 0 ? Math.round((summary.matched / summary.total) * 100) : 0;
          const errorPercentage = summary.total > 0 ? Math.round((summary.errors / summary.total) * 100) : 0;

          return (
            <div id="validation-analysis-section" className="card p-0 overflow-hidden shadow-lg border border-gray-200 rounded-2xl animate-fade-in mb-8 bg-white scroll-mt-6">
              {/* Card Header & File Overview */}
              <div className="p-6 border-b border-gray-150 bg-gradient-to-r from-gray-50 via-slate-50 to-indigo-50/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="p-1.5 rounded-lg bg-[#1F3864] text-white text-xs font-bold shadow-xs">
                      <ShieldCheck className="w-4 h-4" />
                    </span>
                    <h3 className="text-lg font-bold text-[#1F3864] m-0">Attendance Validation Health & Analysis</h3>
                  </div>
                  <p className="text-xs text-gray-500 font-medium flex items-center gap-2">
                    <span>File: <strong className="text-gray-700">{file?.name || 'Timesheet File'}</strong></span>
                    <span>•</span>
                    <span>Target: <strong className="text-gray-700">{contextData?.month_label || targetMonth}</strong></span>
                    <span>•</span>
                    <span>Required Working Days: <strong className="text-[#1F3864]">{contextData?.working_days_slots || 0} Days</strong></span>
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={downloadTotalCsv}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-white border border-gray-300 rounded-lg shadow-xs text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
                    title="Download Total Records CSV"
                  >
                    <Download className="w-3.5 h-3.5 text-blue-600" />
                    <span>Total ({summary.total})</span>
                  </button>
                  {summary.matched > 0 && (
                    <button
                      type="button"
                      onClick={downloadSuccessCsv}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-green-50 border border-green-200 rounded-lg shadow-xs text-green-700 hover:bg-green-100 transition-colors cursor-pointer"
                      title="Download Valid Rows CSV"
                    >
                      <Download className="w-3.5 h-3.5 text-green-600" />
                      <span>Valid ({summary.matched})</span>
                    </button>
                  )}
                  {summary.errors > 0 && (
                    <button
                      type="button"
                      onClick={downloadErrorCsv}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-red-50 border border-red-200 rounded-lg shadow-xs text-red-700 hover:bg-red-100 transition-colors cursor-pointer"
                      title="Download Error Rows CSV"
                    >
                      <Download className="w-3.5 h-3.5 text-red-600" />
                      <span>Errors ({summary.errors})</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Stat Cards Grid */}
              <div className="p-6 border-b border-gray-100 bg-white">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  {/* Total Records Card */}
                  <div className="p-4 rounded-xl border border-gray-200 bg-slate-50/60 shadow-xs flex flex-col justify-between">
                    <div className="flex items-center justify-between text-gray-500 mb-2">
                      <span className="text-xs font-bold uppercase tracking-wider">Total Records</span>
                      <span className="p-1.5 rounded-lg bg-blue-100 text-blue-700">
                        <FileText className="w-4 h-4" />
                      </span>
                    </div>
                    <div className="flex items-baseline justify-between">
                      <div className="text-2xl font-black text-gray-900">{summary.total.toLocaleString()}</div>
                      <span className="text-[11px] font-semibold text-gray-500">100% Processed</span>
                    </div>
                  </div>

                  {/* Valid Records Card */}
                  <div className="p-4 rounded-xl border border-green-200 bg-green-50/40 shadow-xs flex flex-col justify-between">
                    <div className="flex items-center justify-between text-green-700 mb-2">
                      <span className="text-xs font-bold uppercase tracking-wider">Valid / Ready</span>
                      <span className="p-1.5 rounded-lg bg-green-100 text-green-700">
                        <CheckCircle2 className="w-4 h-4" />
                      </span>
                    </div>
                    <div className="flex items-baseline justify-between">
                      <div className="text-2xl font-black text-green-700">{summary.matched.toLocaleString()}</div>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-800">
                        {validPercentage}% Ready
                      </span>
                    </div>
                  </div>

                  {/* Errors / Failures Card */}
                  <div className={`p-4 rounded-xl border shadow-xs flex flex-col justify-between ${summary.errors > 0 ? 'border-red-300 bg-red-50/50' : 'border-gray-200 bg-gray-50/40'}`}>
                    <div className="flex items-center justify-between text-red-700 mb-2">
                      <span className="text-xs font-bold uppercase tracking-wider">Validation Errors</span>
                      <span className={`p-1.5 rounded-lg ${summary.errors > 0 ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-400'}`}>
                        <XCircle className="w-4 h-4" />
                      </span>
                    </div>
                    <div className="flex items-baseline justify-between">
                      <div className={`text-2xl font-black ${summary.errors > 0 ? 'text-red-700' : 'text-gray-400'}`}>
                        {summary.errors.toLocaleString()}
                      </div>
                      {summary.errors > 0 ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800">
                          {errorPercentage}% Action Required
                        </span>
                      ) : (
                        <span className="text-[11px] font-medium text-gray-400">Zero Issues</span>
                      )}
                    </div>
                  </div>

                  {/* Warnings / Reconciled Card */}
                  <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/30 shadow-xs flex flex-col justify-between">
                    <div className="flex items-center justify-between text-amber-800 mb-2">
                      <span className="text-xs font-bold uppercase tracking-wider">Warnings & Notes</span>
                      <span className="p-1.5 rounded-lg bg-amber-100 text-amber-800">
                        <AlertTriangle className="w-4 h-4" />
                      </span>
                    </div>
                    <div className="flex items-baseline justify-between">
                      <div className="text-2xl font-black text-amber-800">{warningCount.toLocaleString()}</div>
                      <span className="text-[11px] font-semibold text-amber-700">Auto-Reconciled</span>
                    </div>
                  </div>
                </div>

                {/* Progress / Health Bar */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs font-semibold text-gray-600">
                    <span>Validation Health Ratio</span>
                    <span>{summary.matched} of {summary.total} Records Valid ({validPercentage}%)</span>
                  </div>
                  <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden flex shadow-inner">
                    <div 
                      className="bg-emerald-500 transition-all duration-500" 
                      style={{ width: `${validPercentage}%` }} 
                      title={`${summary.matched} Valid Rows (${validPercentage}%)`}
                    />
                    {summary.errors > 0 && (
                      <div 
                        className="bg-rose-500 transition-all duration-500" 
                        style={{ width: `${errorPercentage}%` }} 
                        title={`${summary.errors} Error Rows (${errorPercentage}%)`}
                      />
                    )}
                  </div>
                </div>
              </div>

              {/* Interactive Row Explorer & Notes Section */}
              <div className="p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                  {/* Filter Tabs */}
                  <div className="flex items-center gap-1.5 p-1 bg-gray-100 rounded-xl border border-gray-200 shrink-0">
                    {summary.errors > 0 && (
                      <button
                        type="button"
                        onClick={() => { setRowTab('errors'); setCategoryFilter('all'); setRowPage(1); }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                          rowTab === 'errors'
                            ? 'bg-red-600 text-white shadow-xs'
                            : 'text-red-700 hover:bg-red-50'
                        }`}
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Errors Only ({summary.errors})</span>
                      </button>
                    )}
                    {warningCount > 0 && (
                      <button
                        type="button"
                        onClick={() => { setRowTab('warnings'); setCategoryFilter('all'); setRowPage(1); }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                          rowTab === 'warnings'
                            ? 'bg-amber-600 text-white shadow-xs'
                            : 'text-amber-800 hover:bg-amber-50'
                        }`}
                      >
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>Warnings ({warningCount})</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => { setRowTab('valid'); setCategoryFilter('all'); setRowPage(1); }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        rowTab === 'valid'
                          ? 'bg-green-600 text-white shadow-xs'
                          : 'text-green-700 hover:bg-green-50'
                      }`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Valid ({summary.matched})</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => { setRowTab('all'); setCategoryFilter('all'); setRowPage(1); }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        rowTab === 'all'
                          ? 'bg-[#1F3864] text-white shadow-xs'
                          : 'text-gray-600 hover:bg-white'
                      }`}
                    >
                      <Layers className="w-3.5 h-3.5" />
                      <span>All ({summary.total})</span>
                    </button>
                  </div>

                  {/* Actions & Search on the Right */}
                  <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search emp code, name, reason..."
                        value={rowSearch}
                        onChange={(e) => { setRowSearch(e.target.value); setRowPage(1); }}
                        className="w-full pl-8.5 pr-3 py-1.5 text-xs rounded-lg border border-gray-300 focus:outline-hidden focus:ring-2 focus:ring-[#1F3864] focus:border-transparent bg-white shadow-xs"
                      />
                      {rowSearch && (
                        <button
                          type="button"
                          onClick={() => { setRowSearch(''); setRowPage(1); }}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>

                    {summary.errors > 0 && (
                      <button
                        type="button"
                        onClick={copyErrorSummary}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-xs shrink-0 cursor-pointer border ${
                          copied
                            ? 'bg-green-600 text-white border-green-600'
                            : 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100'
                        }`}
                        title="Copy All Error Messages & Emp Codes to Clipboard"
                      >
                        {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5 text-indigo-600" />}
                        <span>{copied ? 'Copied to Clipboard!' : 'Copy Error Summary'}</span>
                      </button>
                    )}
                  </div>
                </div>

                {copyFailed && (
                  <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 flex items-center justify-between">
                    <span>⚠️ Could not copy automatically. Please use the <strong>Download Error CSV</strong> button.</span>
                    <button type="button" onClick={() => setCopyFailed(false)} className="text-amber-600 hover:text-amber-900">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* Category Filter Chips (if any issues exist) */}
                {errorCategories.length > 0 && (
                  <div className="flex items-center gap-2 flex-wrap mb-4 p-3 bg-slate-50/80 border border-slate-200 rounded-xl">
                    <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                      <Filter className="w-3 h-3" /> Issue Categories:
                    </span>
                    <button
                      type="button"
                      onClick={() => { setCategoryFilter('all'); setRowPage(1); }}
                      className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer border ${
                        categoryFilter === 'all'
                          ? 'bg-[#1F3864] text-white border-[#1F3864]'
                          : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      All Issues ({errorCategories.reduce((sum, c) => sum + c.count, 0)})
                    </button>
                    {errorCategories.map(cat => (
                      <button
                        key={cat.key}
                        type="button"
                        onClick={() => { setCategoryFilter(categoryFilter === cat.key ? 'all' : cat.key); setRowPage(1); }}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer border ${
                          categoryFilter === cat.key
                            ? 'bg-[#1F3864] text-white border-[#1F3864]'
                            : `${cat.color} hover:opacity-80`
                        }`}
                      >
                        <span>{cat.icon}</span>
                        <span>{cat.label}</span>
                        <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/80 font-extrabold text-gray-800">
                          {cat.count}
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Detailed Validation Table with Rich Inline Notes */}
                <div className="border border-gray-200 rounded-xl overflow-hidden text-xs bg-white shadow-xs">
                  <table className="w-full text-left">
                    <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 uppercase tracking-wider font-bold">
                      <tr>
                        <th className="py-3 px-4 w-16 text-center">Row</th>
                        <th className="py-3 px-4 w-48">Employee Code</th>
                        <th className="py-3 px-4 w-56">Employee Name</th>
                        <th className="py-3 px-4 text-center w-40">Uploaded Days</th>
                        <th className="py-3 px-4 text-center w-32">Status</th>
                        <th className="py-3 px-4">Validation Notes & Explanation</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-150">
                      {paginatedRows.length > 0 ? (
                        paginatedRows.map(row => {
                          const cat = categorizeRowNote(row);
                          const isError = row.status === 'invalid' || row.status === 'blocked_locked';
                          const isWarn = cat.severity === 'warning' || cat.severity === 'info';
                          const totalDays = Number(row.daysPresent || 0) + Number(row.daysLOP || 0);

                          return (
                            <tr 
                              key={row.id} 
                              className={`transition-colors font-medium ${
                                isError ? 'bg-red-50/30 hover:bg-red-50/50' : isWarn ? 'bg-amber-50/20 hover:bg-amber-50/40' : 'hover:bg-gray-50/60'
                              }`}
                            >
                              <td className="py-3 px-4 text-center font-bold text-gray-500">
                                #{row.id}
                              </td>

                              {/* Employee Code */}
                              <td className="py-3 px-4">
                                <span className={`inline-flex items-center font-mono font-bold px-2 py-0.5 rounded text-xs border ${
                                  isError 
                                    ? 'bg-red-100 text-red-800 border-red-200' 
                                    : 'bg-indigo-50 text-indigo-800 border-indigo-200'
                                }`}>
                                  {row.empCode || '—'}
                                </span>
                              </td>

                              {/* Employee Name */}
                              <td className="py-3 px-4 font-semibold text-gray-900 truncate max-w-[200px]">
                                {row.matchedName === 'Unmatched / Not Found' ? (
                                  <span className="text-red-600 italic">Not Found in System</span>
                                ) : (
                                  <span>{row.matchedName}</span>
                                )}
                              </td>

                              {/* Uploaded Days */}
                              <td className="py-3 px-4 text-center">
                                <div className="flex flex-col items-center gap-1">
                                  <div className="flex items-center gap-1.5 font-semibold text-[11px]">
                                    <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold" title="Days Present">
                                      {row.daysPresent} Present
                                    </span>
                                    <span className={`px-2 py-0.5 rounded border font-bold ${
                                      Number(row.daysLOP) > 0 
                                        ? 'bg-rose-50 text-rose-800 border-rose-200' 
                                        : 'bg-gray-50 text-gray-600 border-gray-200'
                                    }`} title="Days Absent / Loss of Pay">
                                      {row.daysLOP} LOP
                                    </span>
                                  </div>
                                  <span className="text-[10px] text-gray-500 font-medium">
                                    Total: {totalDays} / {contextData?.working_days_slots || totalDays} Days
                                  </span>
                                </div>
                              </td>

                              {/* Status Badge */}
                              <td className="py-3 px-4 text-center">
                                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${cat.color}`}>
                                  <span>{cat.icon}</span>
                                  <span>{cat.label}</span>
                                </span>
                              </td>

                              {/* Inline Notes */}
                              <td className="py-3 px-4">
                                {row.notes ? (
                                  <div className={`p-2 rounded-lg border text-xs leading-relaxed ${
                                    isError 
                                      ? 'bg-red-100/70 border-red-300 text-red-900 font-medium' 
                                      : isWarn 
                                        ? 'bg-amber-100/70 border-amber-300 text-amber-900' 
                                        : 'bg-gray-100 border-gray-200 text-gray-700'
                                  }`}>
                                    {row.notes}
                                  </div>
                                ) : (
                                  <span className="text-green-600 font-semibold flex items-center gap-1 text-[11px]">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                                    <span>Perfect match ({contextData?.working_days_slots || totalDays} working days). Ready to save.</span>
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-gray-400 italic">
                            No records found matching the current tab and filter criteria.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Explorer Pagination */}
                {totalFilteredPages > 1 && (
                  <div className="flex items-center justify-between mt-4 text-xs">
                    <span className="text-gray-500">
                      Showing {(rowPage - 1) * rowItemsPerPage + 1} to {Math.min(rowPage * rowItemsPerPage, filteredRows.length)} of {filteredRows.length} rows
                    </span>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={rowPage === 1}
                        onClick={() => setRowPage(prev => Math.max(1, prev - 1))}
                        className="text-xs px-2.5 py-1"
                      >
                        Previous
                      </Button>
                      <span className="px-2 font-bold text-gray-700">
                        Page {rowPage} of {totalFilteredPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={rowPage === totalFilteredPages}
                        onClick={() => setRowPage(prev => Math.min(totalFilteredPages, prev + 1))}
                        className="text-xs px-2.5 py-1"
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Partial Import Acknowledgment (if errors present) */}
              {summary.errors > 0 && (
                <div className="mx-6 mb-6 p-4 bg-red-50/60 border border-red-200 rounded-xl shadow-xs text-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <label className="flex items-start gap-3 cursor-pointer flex-1">
                    <input 
                      type="checkbox" 
                      className="mt-0.5 w-4 h-4 text-[#1F3864] rounded border-gray-300 focus:ring-[#1F3864]"
                      checked={partialImportAcknowledged}
                      onChange={(e) => setPartialImportAcknowledged(e.target.checked)}
                    />
                    <div className="text-gray-700 leading-tight">
                      <div className="font-bold text-gray-900 mb-0.5">Proceed with Partial Attendance Import?</div>
                      <span>
                        I acknowledge that only the <strong className="text-green-700 font-bold">{summary.matched} Valid Records</strong> will be saved to the database. 
                        The <strong className="text-red-700 font-bold">{summary.errors} Error Records</strong> will be discarded.
                      </span>
                    </div>
                  </label>

                  <button
                    type="button"
                    onClick={downloadErrorCsv}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-red-700 border border-red-300 bg-white hover:bg-red-50 rounded-lg shrink-0 shadow-xs cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-red-600" />
                    <span>Download Discarded CSV ({summary.errors})</span>
                  </button>
                </div>
              )}

              {/* Card Action Footer */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-6 border-t border-gray-200 bg-gray-50/50">
                <div className="text-xs text-gray-500 font-medium">
                  {summary.errors > 0 ? (
                    <span className="text-amber-800 flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                      <span>{summary.errors} error rows need review before proceeding.</span>
                    </span>
                  ) : (
                    <span className="text-green-700 flex items-center gap-1 font-semibold">
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                      <span>All {summary.matched} employee records validated successfully with 0 errors.</span>
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                  <Button variant="secondary" onClick={handleRemoveFile} disabled={isProcessing}>
                    Cancel / Re-upload
                  </Button>
                  <Button 
                    variant="primary" 
                    onClick={handleSave}
                    disabled={isProcessing || summary.matched === 0 || (summary.errors > 0 && !partialImportAcknowledged)}
                    className="shadow-sm"
                  >
                    {isProcessing ? (
                      <span className="flex items-center gap-1.5">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Processing Import...
                      </span>
                    ) : (
                      `Validate & Save Attendance Batch (${summary.matched} valid)`
                    )}
                  </Button>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Floating Sticky Quick Action Bar when summary is loaded */}
        {!loading && summary && (
          <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-40 w-[94%] max-w-4xl bg-[#1F3864]/95 backdrop-blur-md text-white p-3.5 px-5 rounded-2xl shadow-2xl border border-indigo-400/30 flex flex-col sm:flex-row items-center justify-between gap-3 animate-fade-in">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className={`p-2 rounded-xl text-white font-bold text-xs shrink-0 ${summary.errors === 0 ? 'bg-emerald-500' : 'bg-amber-500'}`}>
                {summary.errors === 0 ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
              </div>
              <div className="min-w-0">
                <div className="font-bold text-xs sm:text-sm leading-tight flex items-center gap-2">
                  <span>{summary.matched} of {summary.total} Valid Rows Ready</span>
                  {summary.errors > 0 && (
                    <span className="px-2 py-0.2 rounded-full text-[10px] bg-rose-500 text-white font-black uppercase shrink-0">
                      {summary.errors} Errors
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-gray-300 truncate">
                  {file?.name} • Required: <strong className="text-white">{contextData?.working_days_slots || 0} Days</strong>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end shrink-0">
              <button
                type="button"
                onClick={() => document.getElementById('validation-analysis-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                className="px-3 py-2 rounded-xl text-xs font-bold text-white bg-white/10 hover:bg-white/20 border border-white/20 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>View Full Notes</span>
              </button>
              <Button
                variant="primary"
                size="md"
                onClick={handleSave}
                disabled={isProcessing || summary.matched === 0 || (summary.errors > 0 && !partialImportAcknowledged)}
                className="bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs px-4 py-2 rounded-xl shadow-lg border-0"
              >
                {isProcessing ? (
                  <span className="flex items-center gap-1.5">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving...
                  </span>
                ) : (
                  `Validate & Save Batch (${summary.matched} valid)`
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Upload History & Audit Log Section */}
        <div className="mt-8 card p-6">
          <div className="border-b border-gray-100 pb-4 mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-[#1F3864] m-0 flex items-center gap-2">
                <Clock className="w-5 h-5 text-indigo-600" />
                <span>Attendance Upload History & Audit Log</span>
              </h3>
              <p className="text-xs text-gray-500 mt-0.5 font-medium">
                Recent attendance sheet upload logs and execution history
              </p>
            </div>
            <Badge status="inactive" label={`${filteredUploadHistory.length} Batches`} />
          </div>

          {/* Filter Controls Bar */}
          <div className="mb-4 bg-gray-50/80 p-3 rounded-xl border border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            {/* Search Box */}
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search file name, batch ID, or uploader..."
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                className="w-full pl-9 pr-8 py-1.5 text-xs rounded-lg border border-gray-300 bg-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-medium"
              />
              {historySearch && (
                <button onClick={() => setHistorySearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Status Dropdown Filter */}
            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <span className="text-gray-500 font-semibold shrink-0">Filter Status:</span>
              <select
                value={historyStatusFilter}
                onChange={(e) => setHistoryStatusFilter(e.target.value)}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-300 bg-white text-gray-700 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 cursor-pointer shadow-2xs"
              >
                <option value="all">All Statuses</option>
                <option value="completed">Completed</option>
                <option value="processing">Processing</option>
                <option value="failed">Failed</option>
              </select>
            </div>
          </div>

          {paginatedUploadHistory && paginatedUploadHistory.length > 0 ? (
            <>
              <div className="border border-gray-200 rounded-xl overflow-hidden text-xs bg-white mb-4">
                <table className="w-full text-left">
                  <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 uppercase tracking-wider font-bold">
                    <tr>
                      <th className="py-3 px-4">File Name / Batch</th>
                      <th className="py-3 px-4 text-center">Total Rows</th>
                      <th className="py-3 px-4 text-center">Valid</th>
                      <th className="py-3 px-4 text-center">Errors</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4">Uploaded By</th>
                      <th className="py-3 px-4 text-right">Date & Time</th>
                      <th className="py-3 px-4 text-center">Download Reports</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {paginatedUploadHistory.map((batch) => (
                      <tr key={batch.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="py-3.5 px-4 font-semibold text-gray-900">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-indigo-600 shrink-0" />
                            <div>
                              <div className="font-bold text-gray-900 text-xs">{batch.file_name || 'Attendance Sheet'}</div>
                              <div className="text-[0.65rem] text-gray-400 font-mono font-normal">ID: {batch.id}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-center font-bold text-gray-800">
                          {(batch.total_rows || 0).toLocaleString()}
                        </td>
                        <td className="py-3.5 px-4 text-center font-bold text-green-700">
                          {(batch.valid_count || 0).toLocaleString()}
                        </td>
                        <td className="py-3.5 px-4 text-center font-bold text-red-600">
                          {(batch.error_count || 0).toLocaleString()}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <Badge 
                            status={batch.status === 'completed' ? 'active' : batch.status === 'processing' ? 'pending' : 'rejected'}
                            label={batch.status ? batch.status.toUpperCase() : 'UNKNOWN'} 
                          />
                        </td>
                        <td className="py-3.5 px-4 font-medium text-gray-700">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-[0.65rem] shrink-0">
                              {batch.user?.name ? batch.user.name.charAt(0).toUpperCase() : 'U'}
                            </div>
                            <div>
                              <div className="font-bold text-gray-800 text-xs">{batch.user?.name || 'System User'}</div>
                              <span className="text-[0.6rem] text-gray-400 uppercase font-semibold">{batch.user?.role || 'admin'}</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono text-[0.75rem] text-gray-500">
                          {batch.created_at || '—'}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {batch.valid_count > 0 ? (
                              <a
                                href={route('payroll.attendance.history.download-success', { batchId: batch.id })}
                                className="px-2 py-1 text-[0.7rem] font-bold text-green-700 bg-green-50 hover:bg-green-100 border border-green-200 rounded-lg flex items-center gap-1 transition-all shadow-2xs"
                                title="Download Validated Records CSV"
                                target="_blank"
                                rel="noreferrer"
                              >
                                <Download className="w-3 h-3 text-green-600" />
                                <span>Valid ({batch.valid_count})</span>
                              </a>
                            ) : null}
                            {batch.error_count > 0 ? (
                              <a
                                href={route('payroll.attendance.history.download-errors', { batchId: batch.id })}
                                className="px-2 py-1 text-[0.7rem] font-bold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg flex items-center gap-1 transition-all shadow-2xs"
                                title="Download Error Rows CSV"
                                target="_blank"
                                rel="noreferrer"
                              >
                                <Download className="w-3 h-3 text-red-600" />
                                <span>Errors ({batch.error_count})</span>
                              </a>
                            ) : null}
                            {(!batch.valid_count || batch.valid_count === 0) && (!batch.error_count || batch.error_count === 0) && (
                              <span className="text-gray-400 text-xs">—</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {totalHistoryPages > 1 && (
                <div className="mt-4 flex justify-between items-center">
                  <Pagination
                    currentPage={historyPage}
                    totalPages={totalHistoryPages}
                    totalItems={totalHistoryItems}
                    itemsPerPage={historyItemsPerPage}
                    onPageChange={setHistoryPage}
                  />
                </div>
              )}
            </>
          ) : (
            <div className="py-8 text-center bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
              <Clock className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-xs text-gray-500 font-medium">No matching attendance upload history found</p>
            </div>
          )}
        </div>
      </AuthenticatedLayout>
    </RoleGuard>
  );
}
