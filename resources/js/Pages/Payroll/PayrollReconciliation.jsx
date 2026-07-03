import React from 'react';
import AuthenticatedLayout from '../../Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';
import Button from '../../Components/ui/Button';
import Badge from '../../Components/ui/Badge';
import DataTable from '../../Components/ui/DataTable';

import RoleGuard from '../../Components/RoleGuard.jsx';
export default function PayrollReconciliation() {
  const data = [
    {
      id: 1,
      batchId: '#PR-0626',
      client: 'Mahindra Corp',
      month: 'June 2026',
      expected: '₹8,50,400',
      actual: '₹8,50,400',
      variance: '₹0',
      status: 'reconciled'
    },
    {
      id: 2,
      batchId: '#PR-0625',
      client: 'Tata Consultancy Services',
      month: 'June 2026',
      expected: '₹5,75,200',
      actual: '₹5,75,200',
      variance: '₹0',
      status: 'reconciled'
    },
    {
      id: 3,
      batchId: '#PR-0524',
      client: 'Wipro Limited',
      month: 'May 2026',
      expected: '₹3,45,000',
      actual: '₹3,32,500',
      variance: '-₹12,500',
      status: 'variance'
    }
  ];

  const columns = [
    { header: 'Batch ID', accessor: 'batchId', cell: (row) => <strong>{row.batchId}</strong> },
    { header: 'Client', accessor: 'client' },
    { header: 'Payout Month', accessor: 'month' },
    { header: 'Expected Total', accessor: 'expected' },
    { header: 'Actual Disbursed', accessor: 'actual' },
    { 
      header: 'Variance', 
      accessor: 'variance',
      cell: (row) => <span className={row.status === 'variance' ? 'text-red-600 font-bold' : ''}>{row.variance}</span>
    },
    { 
      header: 'Status', 
      accessor: 'status',
      cell: (row) => row.status === 'reconciled' ? <Badge type="success">Reconciled</Badge> : <Badge type="danger">Variance Found</Badge>
    },
    {
      header: 'Actions',
      accessor: 'actions',
      cell: (row) => (
        <Button size="xs" variant="secondary" onClick={() => alert(row.status === 'variance' ? 'Investigating variance...' : 'Viewing log...')}>
          {row.status === 'variance' ? 'Investigate' : 'View Log'}
        </Button>
      )
    }
  ];

  return (
    <RoleGuard allowedRoles={['admin', 'executive']}>
    <AuthenticatedLayout>
      <Head title="Payroll Reconciliation" />

      <div className="flex justify-between items-end mb-6">
        <div>
          <h2 className="text-2xl font-bold text-[#1F3864] mb-1">Bank Reconciliation Dashboard</h2>
          <p className="text-gray-500 text-[0.95rem]">Compare Expected Total Disbursement against Actual Confirmed Disbursement from the Bank Statement.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary">📥 Upload Bank Statement</Button>
          <Button variant="primary" onClick={() => alert('Starting reconciliation engine...')}>🔄 Run Reconciliation</Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6 mb-8">
        <div className="card p-6 border-l-4 border-l-[#1F3864]">
          <div className="text-[0.85rem] text-gray-500 font-semibold uppercase mb-2">Expected Disbursement (June)</div>
          <div className="text-[1.75rem] font-bold text-gray-900">₹14,25,600</div>
          <div className="text-[0.8rem] text-gray-500 mt-2">Based on locked payroll batches.</div>
        </div>
        <div className="card p-6 border-l-4 border-l-green-500">
          <div className="text-[0.85rem] text-gray-500 font-semibold uppercase mb-2">Actual Confirmed Disbursal</div>
          <div className="text-[1.75rem] font-bold text-green-600">₹14,25,600</div>
          <div className="text-[0.8rem] text-gray-500 mt-2">Matched from uploaded bank statements.</div>
        </div>
        <div className="card p-6 border-l-4 border-l-red-500">
          <div className="text-[0.85rem] text-gray-500 font-semibold uppercase mb-2">Unreconciled Variance</div>
          <div className="text-[1.75rem] font-bold text-red-600">₹0</div>
          <div className="text-[0.8rem] text-gray-500 mt-2">Variance requiring manual review.</div>
        </div>
      </div>

      <div className="bg-[#F0FDF4] border border-[#BBF7D0] border-l-4 border-l-green-500 p-4 rounded-md mb-6 flex items-start gap-3">
        <span className="text-[1.25rem]">✅</span>
        <div>
          <div className="text-[0.95rem] font-semibold text-[#166534] mb-1">Reconciliation Status: All Clear</div>
          <div className="text-[0.85rem] text-[#15803D]">0 Discrepancies Found. The bank statement matches the locked payroll disbursement batches exactly.</div>
        </div>
      </div>

      <div className="card p-0">
        <div className="card-header p-5 pb-0 border-b-0">
          <h3 className="card-title text-lg font-bold text-[#1F3864]">Completed Runs & Reconciliation Breakdown</h3>
        </div>
        <div className="p-0">
          <DataTable columns={columns} data={data} />
        </div>
      </div>

    </AuthenticatedLayout>
    </RoleGuard>
  );
}
