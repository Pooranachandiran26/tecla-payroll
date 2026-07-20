import React, { useState, useRef } from 'react';
import AuthenticatedLayout from '../../Layouts/AuthenticatedLayout';
import { Head, Link, router } from '@inertiajs/react';
import Button from '../../Components/ui/Button';
import DataTable from '../../Components/ui/DataTable';
import Badge from '../../Components/ui/Badge';
import Select from '../../Components/ui/Select';
import { UploadCloud, FileSpreadsheet, Loader2 } from 'lucide-react';
import axios from 'axios';
import RoleGuard from '../../Components/RoleGuard.jsx';

export default function AttendanceUpload({ clients }) {
  const [tab, setTab] = useState('single');
  const [selectedClientId, setSelectedClientId] = useState(clients && clients.length > 0 ? clients[0].id : '');
  const [targetMonth, setTargetMonth] = useState('2026-07');
  const [file, setFile] = useState(null);

  const getMonthOptions = () => {
    const options = [];
    const startDate = new Date(2026, 4, 1); // May 2026 (index 4)
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 2); // Current date + 2 months

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
  
  const fileInputRef = useRef(null);

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
      setSummary({
        total: response.data.total_rows,
        matched: response.data.matched_rows,
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
    if (!file) {
      setErrorMsg('Please select and upload a valid timesheet first.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    const formData = new FormData();
    formData.append('client_id', selectedClientId);
    formData.append('target_month', targetMonth);
    formData.append('file', file);

    router.post(route('payroll.attendance.upload'), formData, {
      forceFormData: true,
      onSuccess: () => {
        setLoading(false);
      },
      onError: (errors) => {
        setErrorMsg(Object.values(errors).join(', ') || 'Failed to save timesheet.');
        setLoading(false);
      }
    });
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
        if (row.status === 'invalid') return <Badge type="danger">✗ Invalid</Badge>;
      }
    },
    {
      header: 'Notes',
      accessor: 'notes',
      cell: (row) => <span className="text-[0.75rem] text-gray-500">{row.notes}</span>
    },
  ];

  return (
    <RoleGuard allowedRoles={['admin', 'manager']}>
      <AuthenticatedLayout>
        <Head title="Upload Attendance" />

        <div className="mb-6">
          <Link href={route('payroll.live-monitor')} className="text-[0.85rem] font-semibold text-[#1F3864] hover:underline">
            ← Back to Monitor
          </Link>
          <div className="flex justify-between items-center mt-2 mb-1">
            <h2 className="text-2xl font-bold text-[#1F3864]">Upload External Attendance Sheets</h2>
            <a 
              href={route('payroll.attendance.template')} 
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-white border border-gray-300 rounded shadow-sm text-gray-700 hover:bg-gray-50"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Download CSV Template
            </a>
          </div>
          <p className="text-gray-500 text-sm">Upload monthly summary timesheets for clients who manage attendance separately instead of punch-in portal logging.</p>
        </div>

        <div className="bg-[#FFFBEB] border border-[#FDE68A] border-l-4 border-l-[#F59E0B] p-4 rounded-md mb-6 flex flex-col gap-2">
          <div className="text-[0.95rem] text-[#92400E]">
            <strong>Monthly Summary Format:</strong> Each row represents one employee's total attendance for the selected month — days_present and days_lop counts. The system automatically expands these into daily records.
          </div>
          <div className="text-[0.85rem] text-[#92400E] opacity-90">
            Use this screen ONLY for clients whose employees do not use the punch-in portal. Employees who already have live punch records will have those dates excluded — the uploaded counts fill only the remaining working days.
          </div>
        </div>

        {errorMsg && (
          <div className="bg-red-50 text-red-700 p-4 rounded-md mb-6 border border-red-200">
            {errorMsg}
          </div>
        )}

        <div className="card p-0 mb-6 overflow-hidden">
          <ul className="flex border-b border-gray-200">
            <li 
              className={`flex-1 text-center py-3 font-semibold text-[0.9rem] cursor-pointer transition-colors ${tab === 'single' ? 'bg-white text-[#1F3864] border-b-2 border-b-[#1F3864]' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}
              onClick={() => setTab('single')}
            >
              Single Client Upload
            </li>
            <li 
              className={`flex-1 text-center py-3 font-semibold text-[0.9rem] cursor-pointer transition-colors ${tab === 'bulk' ? 'bg-white text-[#1F3864] border-b-2 border-b-[#1F3864]' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}
              onClick={() => setTab('bulk')}
            >
              Multiple Clients (Bulk Import)
            </li>
          </ul>

          <div className="p-6 max-w-[700px] mx-auto">
            {tab === 'single' && (
              <>
                <div className="flex gap-4 mb-6">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Select Target Client</label>
                    <Select value={selectedClientId} onChange={handleClientChange}>
                      {clients && clients.map(client => (
                        <option key={client.id} value={client.id}>{client.company_name}</option>
                      ))}
                    </Select>
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Payroll Target Month</label>
                    <Select value={targetMonth} onChange={handleMonthChange}>
                      {getMonthOptions().map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </Select>
                  </div>
                </div>

                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  accept=".csv,.txt"
                  className="hidden" 
                />

                <div 
                  className="flex flex-col items-center justify-center p-12 border-2 border-dashed border-gray-300 bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer rounded-lg text-center"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <UploadCloud className="w-12 h-12 text-[#1F3864] mb-4" strokeWidth={1.5} />
                  {file ? (
                    <>
                      <p className="font-semibold text-[0.95rem] text-[#1F3864] mb-1">Selected File: {file.name}</p>
                      <p className="text-[0.75rem] text-gray-500">Click to change file</p>
                    </>
                  ) : (
                    <>
                      <p className="font-semibold text-[0.95rem] text-[#1F3864] mb-1">Click to select the timesheet CSV</p>
                      <p className="text-[0.75rem] text-gray-500">Ensure columns: employee_code, days_present, days_lop</p>
                    </>
                  )}
                </div>
              </>
            )}

            {tab === 'bulk' && (
              <div className="p-4 text-center text-gray-500 text-sm">
                Consolidated multi-client timesheet upload is currently read-only. Please use the "Single Client Upload" tab to validate and save client timesheets.
              </div>
            )}
          </div>
        </div>

        {summary && (
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-white p-4 border border-gray-200 rounded-md shadow-sm">
              <div className="text-gray-500 text-xs uppercase font-bold">Total Employees</div>
              <div className="text-xl font-extrabold text-[#1F3864] mt-1">{summary.total}</div>
            </div>
            <div className="bg-white p-4 border border-gray-200 rounded-md shadow-sm">
              <div className="text-green-600 text-xs uppercase font-bold">Valid / Matched</div>
              <div className="text-xl font-extrabold text-green-600 mt-1">{summary.matched}</div>
            </div>
            <div className="bg-white p-4 border border-gray-200 rounded-md shadow-sm">
              <div className="text-red-600 text-xs uppercase font-bold">Errors / Invalid</div>
              <div className="text-xl font-extrabold text-red-600 mt-1">{summary.errors}</div>
            </div>
          </div>
        )}

        {(validationData.length > 0 || loading) && (
          <div className="card p-0">
            <div className="p-5 pb-2">
              <h3 className="text-lg font-bold text-[#1F3864] m-0">Upload Match Confidence Check</h3>
              <p className="text-[0.75rem] text-gray-500 mt-1">
                🟢 Green dot indicates 100% Employee Code match. No fuzzy/name similarity matching — exact code match only.
              </p>
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center p-12 text-gray-500">
                <Loader2 className="w-8 h-8 animate-spin text-[#1F3864] mb-2" />
                <span>Processing validation...</span>
              </div>
            ) : (
              <DataTable columns={columns} data={validationData} />
            )}

            <div className="flex justify-end gap-3 mt-6 border-t border-gray-200 p-6 pt-6">
              <Link href={route('payroll.live-monitor')}>
                <Button variant="secondary">Cancel</Button>
              </Link>
              <Button 
                variant="primary" 
                onClick={handleSave}
                disabled={loading || validationData.length === 0 || summary?.matched === 0}
              >
                Validate & Save Attendance Batch
              </Button>
            </div>
          </div>
        )}
      </AuthenticatedLayout>
    </RoleGuard>
  );
}
