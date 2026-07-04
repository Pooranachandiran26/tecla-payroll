import React from 'react';
import AuthenticatedLayout from '../../Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';
import Button from '../../Components/ui/Button';
import DataTable from '../../Components/ui/DataTable';
import Badge from '../../Components/ui/Badge';
import Select from '../../Components/ui/Select';
import { UploadCloud } from 'lucide-react';

import RoleGuard from '../../Components/RoleGuard.jsx';
const validationData = [
  {
    rowNo: 1,
    empCode: 'TEC-201',
    empName: 'Rahul Singhal',
    client: 'Mahindra Corp',
    ctc: '₹28,500',
    message: '✓ Data format ready',
    status: 'ready',
    action: null
  },
  {
    rowNo: 2,
    empCode: 'TEC-202',
    empName: 'Preeti Nair',
    client: 'Tata Consultancy Services',
    ctc: '₹22,000',
    message: '⚠️ Designation "QA Eng" does not match master categories.',
    status: 'warning',
    action: 'map'
  },
  {
    rowNo: 3,
    empCode: 'TEC-203',
    empName: 'Amit Shah',
    client: 'Reliance Digital',
    ctc: '₹16,500',
    message: '✓ Data format ready',
    status: 'ready',
    action: null
  },
  {
    rowNo: 4,
    empCode: '—',
    empName: 'Geeta Gopinath',
    client: 'Mahindra Corp',
    ctc: '₹45,000',
    message: '❌ Mandatory Employee Code is missing.',
    status: 'error',
    action: 'fix'
  }
];

export default function BulkUpload() {

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
      header: 'Gross Salary (CTC)',
      accessor: 'ctc'
    },
    {
      header: 'Validation Message',
      accessor: 'message',
      cell: (row) => {
        let colorClass = 'text-green-600';
        if (row.status === 'warning') colorClass = 'text-yellow-600';
        if (row.status === 'error') colorClass = 'text-red-600';
        return <span className={`font-medium ${colorClass}`}>{row.message}</span>;
      }
    },
    {
      header: 'Validation Status',
      accessor: 'status',
      cell: (row) => {
        if (row.status === 'ready') return <Badge type="success">Ready</Badge>;
        if (row.status === 'warning') return <Badge type="warning">Warning</Badge>;
        if (row.status === 'error') return <Badge type="danger">Error</Badge>;
        return null;
      }
    },
    {
      header: 'Action Resolution',
      accessor: 'action',
      cell: (row) => {
        if (row.action === 'map') {
          return (
            <Select value="qa-lead" className="text-xs py-1 px-2 h-auto w-auto">
              <option value="">Map to Master Category...</option>
              <option value="qa-lead">QA Lead (Match: 82%)</option>
              <option value="dev">Software Developer</option>
              <option value="ops">Operations Exec</option>
            </Select>
          );
        }
        if (row.action === 'fix') {
          return <span className="text-[0.75rem] text-red-600 font-semibold">Fix in Excel File</span>;
        }
        return '—';
      }
    }
  ];

  return (
    <RoleGuard allowedRoles={['admin', 'manager']}>
    <AuthenticatedLayout>
      <Head title="Bulk Upload Employees" />

      <div className="mb-6">
        <Link href="/employees" className="text-[0.85rem] font-semibold text-[#1F3864] hover:underline">
          ← Back to Employees Directory
        </Link>
        <h2 className="text-2xl font-bold text-[#1F3864] mt-2 mb-1">Excel Bulk Employee Uploader</h2>
        <p className="text-gray-500 text-sm">Upload spreadsheet templates to onboard multiple employees and assign their client defaults instantly.</p>
      </div>

      {/* Drag and Drop Box */}
      <div className="card mb-6 flex flex-col items-center justify-center p-12 border-2 border-dashed border-gray-300 bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer rounded-lg text-center">
        <UploadCloud className="w-12 h-12 text-[#1F3864] mb-4" strokeWidth={1.5} />
        <p className="font-semibold text-base text-[#1F3864] mb-1">Drag and drop your employee Excel/CSV file here</p>
        <p className="text-sm text-gray-500 mb-4">Supports .xlsx, .xls, .csv up to 10MB</p>
        <Button variant="secondary" size="xs">Download Excel Sample Template</Button>
      </div>

      {/* Excel Validation Preview Grid */}
      <div className="card p-0">
        <div className="p-5 pb-4 border-b border-gray-100 flex justify-between items-center flex-wrap gap-4">
          <h3 className="text-lg font-bold text-[#1F3864] m-0">File Import Validation Status</h3>
          <div className="bg-gray-100 px-3 py-1.5 rounded-md text-xs font-semibold text-[#1F3864]">
            📊 Summary: 48 rows found — <span className="text-green-600">42 Ready</span>, <span className="text-yellow-600">4 Warnings</span>, <span className="text-red-600">2 Errors</span>
          </div>
        </div>

        <p className="text-xs text-gray-500 mb-4 px-6 mt-4">
          ⚠️ Rows with errors cannot be imported. Resolve warnings below or fix them in your spreadsheet and upload again.
        </p>

        <DataTable columns={columns} data={validationData} />

        <div className="flex justify-end gap-3 mt-6 border-t border-gray-200 p-6 pt-6">
          <Link href="/employees">
            <Button variant="secondary">Cancel</Button>
          </Link>
          <Button variant="primary" onClick={() => alert('Import successful: 45 employees successfully registered!')}>
            Confirm & Import (45 employees)
          </Button>
        </div>
      </div>

    </AuthenticatedLayout>
    </RoleGuard>
  );
}
