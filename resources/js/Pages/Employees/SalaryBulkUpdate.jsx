import React, { useState } from 'react';
import AuthenticatedLayout from '../../Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';
import Button from '../../Components/ui/Button';
import DataTable from '../../Components/ui/DataTable';
import Badge from '../../Components/ui/Badge';
import Input from '../../Components/ui/Input';
import { UploadCloud } from 'lucide-react';

import RoleGuard from '../../Components/RoleGuard.jsx';
const initialSalaries = [
  {
    id: 1,
    empCode: 'TEC-088',
    empName: 'Aarav Sharma',
    client: 'Mahindra Corp',
    currentCTC: 35000,
    proposedCTC: 45000,
    effectiveDate: '2026-04-01'
  },
  {
    id: 2,
    empCode: 'TEC-121',
    empName: 'Neha Patil',
    client: 'Mahindra Corp',
    currentCTC: 32000,
    proposedCTC: 32000,
    effectiveDate: '2026-06-01'
  },
  {
    id: 3,
    empCode: 'TEC-168',
    empName: 'Vikram Rao',
    client: 'Reliance Digital',
    currentCTC: 18500,
    proposedCTC: 22500,
    effectiveDate: '2026-06-01'
  }
];

export default function SalaryBulkUpdate() {
  const [salaries, setSalaries] = useState(initialSalaries);

  const updateProposed = (id, val) => {
    setSalaries(prev => prev.map(s => s.id === id ? { ...s, proposedCTC: parseFloat(val) || 0 } : s));
  };

  const updateDate = (id, val) => {
    setSalaries(prev => prev.map(s => s.id === id ? { ...s, effectiveDate: val } : s));
  };

  const columns = [
    {
      header: 'Emp Code',
      accessor: 'empCode'
    },
    {
      header: 'Employee Name',
      accessor: 'empName',
      cell: (row) => <strong>{row.empName}</strong>
    },
    {
      header: 'Client Deployed',
      accessor: 'client'
    },
    {
      header: 'Current CTC (Monthly)',
      accessor: 'currentCTC',
      cell: (row) => `₹${row.currentCTC.toLocaleString('en-IN')}`
    },
    {
      header: 'Proposed CTC (New)',
      accessor: 'proposedCTC',
      cell: (row) => (
        <Input 
          type="number" 
          value={row.proposedCTC} 
          onChange={(e) => updateProposed(row.id, e.target.value)} 
          className="py-1 px-2 w-[110px]"
        />
      )
    },
    {
      header: 'Difference',
      accessor: 'diff',
      cell: (row) => {
        const diff = row.proposedCTC - row.currentCTC;
        const pct = row.currentCTC > 0 ? ((diff / row.currentCTC) * 100).toFixed(1) : 0;
        
        if (diff > 0) {
          return <span className="text-green-600 font-semibold">+₹{diff.toLocaleString('en-IN')} (+{pct}%)</span>;
        } else if (diff < 0) {
          return <span className="text-red-600 font-semibold">₹{diff.toLocaleString('en-IN')} ({pct}%)</span>;
        } else {
          return <span className="text-gray-500 font-semibold">₹0 (0%)</span>;
        }
      }
    },
    {
      header: 'Effective Date',
      accessor: 'effectiveDate',
      cell: (row) => (
        <Input 
          type="date" 
          value={row.effectiveDate} 
          onChange={(e) => updateDate(row.id, e.target.value)}
          className="py-1 px-2 w-auto" 
          title="Effective Date" 
        />
      )
    },
    {
      header: 'Deduction Flags',
      accessor: 'flags',
      cell: (row) => {
        // Mock ESI rule check
        if (row.id === 3 && row.proposedCTC > 21000) {
          return <Badge type="danger" title="Crossed ESI threshold limit of 21k">⚠ ESI Disabling</Badge>;
        }
        if (row.id === 1) {
          return <Badge type="danger" title="Crossed ESI threshold limit of 21k">⚠ ESI Locked</Badge>;
        }
        return <Badge type="neutral">No Flags</Badge>;
      }
    },
    {
      header: 'Status',
      accessor: 'status',
      cell: () => <Badge type="success">Valid</Badge>
    }
  ];

  return (
    <RoleGuard allowedRoles={['admin', 'executive']}>
    <AuthenticatedLayout>
      <Head title="Bulk Salary Update" />

      <div className="mb-6">
        <Link href="/employees" className="text-[0.85rem] font-semibold text-[#1F3864] hover:underline">
          ← Back to Employees Directory
        </Link>
        <h2 className="text-2xl font-bold text-[#1F3864] mt-2 mb-1">Bulk Salary Revision Tool</h2>
        <p className="text-gray-500 text-sm">Upload revision lists or edit multiple salaries inline. Revisions automatically recalculate statutory deductions (e.g. ESI threshold locks).</p>
      </div>

      <div className="bg-[#FFF5F5] border-l-4 border-l-[#E53E3E] text-[#C53030] p-4 text-[0.9rem] rounded mb-6">
        <strong>Important Revision Policy:</strong> Salary updates and CTC changes apply strictly to the effective date forward. Past processed or finalized payroll runs are locked and will not be retroactively modified.
      </div>

      {/* Upload box */}
      <div className="card mb-6 flex flex-col items-center justify-center p-12 border-2 border-dashed border-gray-300 bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer rounded-lg text-center">
        <UploadCloud className="w-12 h-12 text-[#1F3864] mb-4" strokeWidth={1.5} />
        <p className="font-semibold text-base text-[#1F3864] mb-1">Drag and drop your salary update sheet here</p>
        <p className="text-sm text-gray-500 mb-4">Format: Employee Code, New Basic, New Allowances, Effective Date</p>
        <Button variant="secondary" size="xs">Download Revision Template</Button>
      </div>

      {/* Revision Preview Table */}
      <div className="card p-0">
        <div className="p-5 pb-4 border-b border-gray-100 flex flex-col gap-1">
          <h3 className="text-lg font-bold text-[#1F3864] m-0">Salary Increment Revisions (Inline Editor)</h3>
          <span className="text-xs text-gray-500">Adjust and verify calculations prior to committing.</span>
        </div>

        <DataTable columns={columns} data={salaries} />

        <div className="flex justify-end gap-3 mt-6 border-t border-gray-200 p-6 pt-6">
          <Link href="/employees">
            <Button variant="secondary">Cancel</Button>
          </Link>
          <Button variant="primary" onClick={() => alert('Salaries updated successfully!')}>
            Apply Revisions
          </Button>
        </div>
      </div>
    </AuthenticatedLayout>
    </RoleGuard>
  );
}
