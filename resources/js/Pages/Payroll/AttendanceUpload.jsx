import React, { useState, useEffect, useRef } from 'react';
import AuthenticatedLayout from '../../Layouts/AuthenticatedLayout';
import { Head, Link, router } from '@inertiajs/react';
import Button from '../../Components/ui/Button';
import DataTable from '../../Components/ui/DataTable';
import Badge from '../../Components/ui/Badge';
import Select from '../../Components/ui/Select';
import { UploadCloud, FileSpreadsheet, Loader2, Calendar, Info, CheckCircle2, AlertTriangle, Clock, RefreshCw, X, XCircle, Download } from 'lucide-react';
import axios from 'axios';
import RoleGuard from '../../Components/RoleGuard.jsx';

export default function AttendanceUpload({ clients }) {
  const [selectedClientId, setSelectedClientId] = useState(clients && clients.length > 0 ? clients[0].id : '');
  const [targetMonth, setTargetMonth] = useState('2026-08');
  const [file, setFile] = useState(null);
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

  const fileInputRef = useRef(null);

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
      setValidationData(response.data.rows || []);
      setBatchId(response.data.batch_id);
      setSummary({
        total: response.data.total_rows,
        matched: response.data.matched_rows,
        skipped: response.data.skipped_count || 0,
        errors: response.data.error_count
      });
      setLoading(false);
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
        <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-gray-500 mb-1 font-semibold">
              <Link href={route('payroll.attendance-review', { client_id: selectedClientId, month: targetMonth })} className="hover:underline text-[#1F3864]">Attendance Review</Link>
              <span>/</span>
              <span className="text-gray-700">Upload</span>
            </div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold text-[#1F3864]">Upload External Attendance Sheets</h2>
            </div>
          </div>

          {/* Switcher Tabs placed in the top-right header area */}
          <div className="flex items-center bg-gray-200/70 p-1 rounded-xl shadow-inner text-xs font-bold border border-gray-300/50 shrink-0">
            <span className="px-3 py-1.5 rounded-lg bg-white text-[#1F3864] shadow-sm font-bold flex items-center gap-1.5">
              <FileSpreadsheet className="w-3.5 h-3.5 text-indigo-600" />
              <span>Excel Uploader</span>
            </span>
            <Link
              href={route('payroll.attendance.history')}
              className="px-3 py-1.5 rounded-lg text-gray-600 hover:text-gray-900 transition-all flex items-center gap-1.5"
            >
              <Clock className="w-3.5 h-3.5 text-gray-500" />
              <span>Upload History</span>
            </Link>
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

        {/* 2-Column Responsive Dashboard Layout */}
        <div className="flex flex-col lg:flex-row gap-6 mb-6">
          
          {/* Left Column: Guidelines & Calculations (width 5/12) */}
          <div className="w-full lg:w-5/12 flex flex-col gap-6">
            
            {/* Guidelines Card */}
            <div className="bg-[#EFF6FF] border border-[#BFDBFE] border-l-4 border-l-[#2563EB] py-6 px-5 rounded-xl shadow-xs mb-6">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-[#2563EB] mt-0.5 shrink-0" />
                <div className="text-xs text-[#1E40AF] leading-relaxed">
                  <h4 className="font-extrabold text-sm mb-1.5 text-[#1D4ED8]">How This System Works</h4>
                  This system automatically pays employees for Sundays (or your client's configured off-days) and holidays — you don't need to include them in your upload. Just enter how many days someone actually worked (<code className="bg-blue-100 px-1 py-0.5 rounded text-blue-900 font-mono text-xs">days_present</code>), and how many days they were absent without leave (<code className="bg-blue-100 px-1 py-0.5 rounded text-blue-900 font-mono text-xs">days_lop</code>). These two numbers should always add up to the <strong>Working Days Required</strong> calculated for that target month.
                </div>
              </div>
            </div>

            {/* Calculations & Context Panel */}
            {contextData && (
              <div className="bg-white border border-gray-200 p-5 rounded-xl shadow-sm">
                <div className="flex items-center justify-between border-b border-gray-200 pb-3 mb-3">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-[#1F3864]" />
                    <span className="font-bold text-sm text-[#1F3864]">
                      Working Days Breakdown
                    </span>
                  </div>
                  <span className="bg-[#1F3864] text-white text-xs font-bold px-2.5 py-1 rounded-full shrink-0">
                    {contextData.working_days_slots} Days Required
                  </span>
                </div>

                <div className="text-xs text-gray-500 mb-4 leading-relaxed">
                  <strong>Formula:</strong> {contextData.total_calendar_days} Calendar Days − {contextData.off_days_count} Off-Days ({contextData.off_days_label}) − {contextData.workday_holiday_count} Holiday(s) = <strong className="text-[#1F3864]">{contextData.working_days_slots} Working Day Slots</strong>.
                </div>

                <div className="bg-amber-50 border border-amber-200 text-amber-900 text-xs p-3 rounded-lg mb-4 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                  <div>
                    <strong>Upload Rule:</strong> Enter ONLY real working days worked + LOP in your CSV. For each employee, <code>days_present + days_lop</code> must add up to <strong>{contextData.working_days_slots}</strong>.
                  </div>
                </div>

                <div>
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wide block mb-2">
                    Configured Client Holidays ({contextData.month_label}):
                  </span>
                  {contextData.holidays && contextData.holidays.length > 0 ? (
                    <div className="flex flex-col gap-1.5">
                      {contextData.holidays.map((h, idx) => (
                        <div key={idx} className={`flex items-center justify-between text-xs px-2.5 py-1.5 rounded-lg border font-medium ${h.is_off_day ? 'bg-gray-100 border-gray-250 text-gray-500' : 'bg-emerald-50 border-emerald-100 text-emerald-800'}`}>
                          <span>🏖️ {h.name}</span>
                          <span className="text-[10px] uppercase font-bold text-gray-400">{h.date}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="text-xs text-gray-400 italic">No holidays configured for this month.</span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Upload Form & Dropzone (width 7/12) */}
          <div className="w-full lg:w-7/12">
            <div className="card p-6 shadow-sm border border-gray-200 rounded-xl bg-white h-full flex flex-col justify-between">
              <div>
                <div className="border-b border-gray-150 pb-4 mb-5 flex justify-between items-center gap-4">
                  <div>
                    <h3 className="text-lg font-bold text-[#1F3864] m-0">Single Client Upload</h3>
                    <p className="text-xs text-gray-500 mt-0.5 font-medium">Select client and upload target month attendance template</p>
                  </div>
                  
                  {/* Download Excel Template button placed here inside uploader header card */}
                  <a 
                    href={route('payroll.attendance.template', { client_id: selectedClientId, target_month: targetMonth })} 
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-white border border-gray-300 rounded shadow-xs text-gray-700 hover:bg-gray-50 shrink-0"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-green-600" />
                    Download Template
                  </a>
                </div>

                <div className="flex gap-4 mb-6">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Select Target Client</label>
                    <Select value={selectedClientId} onChange={handleClientChange} disabled={file !== null}>
                      {clients && clients.map(client => (
                        <option key={client.id} value={client.id}>{client.company_name}</option>
                      ))}
                    </Select>
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Payroll Target Month</label>
                    <Select value={targetMonth} onChange={handleMonthChange} disabled={file !== null}>
                      {getMonthOptions().map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </Select>
                  </div>
                </div>

                {file ? (
                  <div className="p-6 border border-[#1F3864]/20 rounded-xl bg-indigo-50/20 shadow-xs mb-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm">
                          XLS
                        </div>
                        <div>
                          <div className="font-bold text-[#1F3864] text-sm">{file.name}</div>
                          <span className="text-[0.7rem] text-gray-400 font-medium">Size: {Math.round(file.size / 1024)} KB</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => fileInputRef.current?.click()}
                          disabled={isProcessing}
                          className="flex items-center gap-1 text-xs shadow-xs"
                        >
                          <RefreshCw className="w-3.5 h-3.5" /> Change
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={handleRemoveFile}
                          disabled={isProcessing}
                          className="flex items-center gap-1 text-xs text-red-600 border-red-200 hover:bg-red-50 shadow-xs"
                        >
                          <X className="w-3.5 h-3.5" /> Remove
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div 
                    className="flex flex-col items-center justify-center p-14 border-2 border-dashed border-gray-300 bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer rounded-xl text-center mb-4"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <UploadCloud className="w-10 h-10 text-[#1F3864] mb-3" strokeWidth={1.5} />
                    <p className="font-semibold text-[0.95rem] text-[#1F3864] mb-1">Click to select the timesheet file (.xlsx, .csv)</p>
                    <p className="text-[0.75rem] text-gray-500 max-w-[400px] mx-auto leading-relaxed">Supported formats: Excel (.xlsx), CSV (.csv). Ensure columns: target_month, employee_code, days_present, days_lop</p>
                  </div>
                )}
              </div>
            </div>
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

        {!loading && summary && (
          <div className="card p-0 overflow-hidden shadow-md animate-fade-in mb-6">
            <div className="p-6 border-b border-gray-150 bg-gray-50/50">
              <h3 className="text-lg font-bold text-[#1F3864] m-0">File Import Validation Status</h3>
              <p className="text-xs text-gray-500 mt-0.5 font-medium">Employee attendance validation and analysis summary</p>
            </div>

            <div className="p-6">
              <div className="border border-gray-200 rounded-xl overflow-hidden mb-6 text-xs bg-white">
                <table className="w-full text-left">
                  <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 uppercase tracking-wider font-bold">
                    <tr>
                      <th className="py-3 px-4">File Name</th>
                      <th className="py-3 px-4 text-center">Total Records</th>
                      <th className="py-3 px-4 text-center">Success</th>
                      <th className="py-3 px-4 text-center">Failures</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    <tr className="hover:bg-gray-50/50 transition-colors font-medium">
                      <td className="py-3.5 px-4 font-semibold text-gray-900 truncate max-w-[240px]">
                        <div className="flex items-center gap-2">
                          <span className="text-base">📋</span>
                          <span>{file?.name || 'Attendance Template'}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-center font-bold text-gray-900">
                        {summary.total.toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[0.7rem] font-bold bg-green-50 text-green-700 border border-green-200">
                          <CheckCircle2 className="w-3 h-3" />
                          {summary.matched.toLocaleString()}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {summary.errors > 0 ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[0.7rem] font-bold bg-red-50 text-red-700 border border-red-200">
                            <XCircle className="w-3 h-3" />
                            {summary.errors.toLocaleString()}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[0.7rem] font-bold bg-gray-50 text-gray-400 border border-gray-200">
                            0
                          </span>
                        )}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {summary.errors > 0 && (
                <div className="mb-6 p-4 bg-red-50/50 border border-red-200 rounded-xl shadow-xs text-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                  <label className="flex items-start gap-3 cursor-pointer flex-1">
                    <input 
                      type="checkbox" 
                      className="mt-0.5 w-4 h-4 text-[#1F3864] rounded border-gray-300 focus:ring-[#1F3864]"
                      checked={partialImportAcknowledged}
                      onChange={(e) => setPartialImportAcknowledged(e.target.checked)}
                    />
                    <span className="text-gray-700 leading-tight font-semibold">
                      I acknowledge that only the <strong className="text-green-600">{summary.matched} Valid</strong> rows will be imported. 
                      The <strong className="text-red-600">{summary.errors} Error</strong> rows will be discarded.
                    </span>
                  </label>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      const errorRows = validationData.filter(r => r.status === 'invalid');
                      let csvContent = "data:text/csv;charset=utf-8,Employee Code,Days Present,Days LOP,Error Reason\n";
                      errorRows.forEach(r => {
                        csvContent += `"${r.empCode}","${r.daysPresent}","${r.daysLOP}","${r.notes || ''}"\n`;
                      });
                      const encodedUri = encodeURI(csvContent);
                      const link = document.createElement("a");
                      link.setAttribute("href", encodedUri);
                      link.setAttribute("download", "Attendance_Errors.csv");
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                    }}
                    className="flex items-center gap-1.5 text-xs font-bold text-red-700 border-red-300 bg-red-50 hover:bg-red-100 shrink-0 shadow-sm"
                  >
                    <Download className="w-3.5 h-3.5 text-red-600" /> Download Error Rows (.CSV)
                  </Button>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50/50">
              <Button variant="secondary" onClick={handleRemoveFile} disabled={isProcessing}>
                Cancel
              </Button>
              <Button 
                variant="primary" 
                onClick={handleSave}
                disabled={isProcessing || summary.matched === 0 || (summary.errors > 0 && !partialImportAcknowledged)}
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
        )}
      </AuthenticatedLayout>
    </RoleGuard>
  );
}
