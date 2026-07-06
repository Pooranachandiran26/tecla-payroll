import React, { useState } from 'react';
import AuthenticatedLayout from '../../Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';
import Button from '../../Components/ui/Button';
import DataTable from '../../Components/ui/DataTable';
import Badge from '../../Components/ui/Badge';
import Select from '../../Components/ui/Select';
import { UploadCloud } from 'lucide-react';

import RoleGuard from '../../Components/RoleGuard.jsx';
export default function AttendanceUpload() {
  const [tab, setTab] = useState('single');
  
  const validationData = [
    {
      id: 1,
      empCode: 'TEC-088',
      empName: 'Aarav Sharma',
      matchedName: 'Aarav Sharma (TEC-088)',
      matchType: 'exact',
      daysPresent: '22 Days',
      daysLOP: '0 Days',
      status: 'valid'
    },
    {
      id: 2,
      empCode: 'TEC-121',
      empName: 'Neha P.',
      matchedName: 'Neha Patil (TEC-121)',
      matchType: 'similar',
      daysPresent: '21 Days',
      daysLOP: '1 Day',
      status: 'check'
    },
    {
      id: 3,
      empCode: 'TEC-199',
      empName: 'John Doe',
      matchedName: 'Unmatched / New Hire',
      matchType: 'none',
      daysPresent: '15 Days',
      daysLOP: '0 Days',
      status: 'invalid'
    }
  ];

  const columns = [
    {
      header: 'Parsed Emp Code',
      accessor: 'empCode'
    },
    {
      header: 'Sheet Employee Name',
      accessor: 'empName'
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
        } else if (row.matchType === 'similar') {
          return (
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
              <span className="text-[0.75rem] font-semibold text-yellow-600">88% Name Similarity</span>
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
      accessor: 'daysPresent'
    },
    {
      header: 'Days LOP',
      accessor: 'daysLOP'
    },
    {
      header: 'Status',
      accessor: 'status',
      cell: (row) => {
        if (row.status === 'valid') return <Badge type="success">✓ Valid</Badge>;
        if (row.status === 'check') return <Badge type="warning">⚠ Check Name</Badge>;
        if (row.status === 'invalid') return <Badge type="danger">✗ Ignored</Badge>;
      }
    }
  ];

  return (
    <RoleGuard allowedRoles={['admin', 'manager']}>
    <AuthenticatedLayout>
      <Head title="Upload Attendance" />

      <div className="mb-6">
        <Link href="/payroll/live-attendance" className="text-[0.85rem] font-semibold text-[#1F3864] hover:underline">
          ← Back to Monitor
        </Link>
        <h2 className="text-2xl font-bold text-[#1F3864] mt-2 mb-1">Upload External Attendance sheets</h2>
        <p className="text-gray-500 text-sm">Upload spreadsheet timesheets for clients who manage attendance separately instead of punch-in portal logging.</p>
      </div>

      <div className="bg-[#FFFBEB] border border-[#FDE68A] border-l-4 border-l-[#F59E0B] p-4 rounded-md mb-6 flex flex-col gap-2">
        <div className="text-[0.95rem] text-[#92400E]">
          <strong>Biometric Cloud Integration:</strong> Attendance auto-populates from the employee's active daily Punch In/Out logs. Use this form only to overlay manual spreadsheets or resolve corporate contract hours.
        </div>
        <div className="text-[0.85rem] text-[#92400E] opacity-90">
          Use this screen ONLY for clients whose employees do not use the punch-in portal (e.g. the client tracks attendance in their own HR system and sends you a monthly Excel). Do not upload sheets for employees who already punch in via the Employee Portal — their punch data takes priority and this upload will be ignored for those employees.
        </div>
      </div>

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
                  <Select value="mahindra">
                    <option value="mahindra">Mahindra Corp</option>
                    <option value="tcs">Tata Consultancy Services</option>
                    <option value="reliance">Reliance Digital</option>
                  </Select>
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Payroll Target Month</label>
                  <Select value="june">
                    <option value="june">June 2026</option>
                    <option value="may">May 2026</option>
                  </Select>
                </div>
              </div>
              <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed border-gray-300 bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer rounded-lg text-center">
                <UploadCloud className="w-12 h-12 text-[#1F3864] mb-4" strokeWidth={1.5} />
                <p className="font-semibold text-[0.95rem] text-[#1F3864] mb-1">Drag and drop the Mahindra Corp June timesheet here</p>
                <p className="text-[0.75rem] text-gray-500">Ensure columns match: Employee Code, Total Present Days, LOP Days</p>
              </div>
            </>
          )}

          {tab === 'bulk' && (
            <>
              <div className="mb-6 w-1/2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Target Settlement Month</label>
                <Select value="june">
                  <option value="june">June 2026</option>
                  <option value="may">May 2026</option>
                </Select>
              </div>
              <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed border-gray-300 bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer rounded-lg text-center">
                <UploadCloud className="w-12 h-12 text-[#1F3864] mb-4" strokeWidth={1.5} />
                <p className="font-semibold text-[0.95rem] text-[#1F3864] mb-1">Drag and drop a consolidated multi-client timesheet here</p>
                <p className="text-[0.75rem] text-gray-500">File must specify Client Code in first column to group automatically</p>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="card p-0">
        <div className="p-5 pb-2">
          <h3 className="text-lg font-bold text-[#1F3864] m-0">Upload Match Confidence Check</h3>
          <p className="text-[0.75rem] text-gray-500 mt-1">
            🟢 Green dot indicates 100% Employee Code match. 🟡 Yellow dot flags name-similarity matches that must be verified.
          </p>
        </div>

        <DataTable columns={columns} data={validationData} />

        <div className="flex justify-end gap-3 mt-6 border-t border-gray-200 p-6 pt-6">
          <Link href="/payroll/live-attendance">
            <Button variant="secondary">Cancel</Button>
          </Link>
          <Button variant="primary" onClick={() => window.location.href = '/payroll/attendance-review'}>
            Validate & Save Attendance Batch
          </Button>
        </div>
      </div>

    </AuthenticatedLayout>
    </RoleGuard>
  );
}
