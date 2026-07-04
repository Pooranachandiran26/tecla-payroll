import React, { useState } from 'react';
import AuthenticatedLayout from '../../Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';
import Button from '../../Components/ui/Button';
import DataTable from '../../Components/ui/DataTable';
import Badge from '../../Components/ui/Badge';
import Select from '../../Components/ui/Select';
import useToast from '../../Hooks/useToast';
import { Info } from 'lucide-react';

import RoleGuard from '../../Components/RoleGuard.jsx';
const initialLeaves = [
  {
    id: 1,
    empName: 'Aarav Sharma',
    empCode: 'TEC-088',
    client: 'Mahindra Corp',
    leaveType: 'Sick Leave (SL)',
    leaveCode: 'sick',
    dateRange: 'June 23, 2026 - June 23, 2026',
    days: 1,
    reason: 'Suffering from viral fever, prescription attached.',
    status: 'pending'
  },
  {
    id: 2,
    empName: 'Neha Patil',
    empCode: 'TEC-121',
    client: 'Mahindra Corp',
    leaveType: 'Casual Leave (CL)',
    leaveCode: 'casual',
    dateRange: 'June 28, 2026 - June 30, 2026',
    days: 3,
    reason: 'Traveling to hometown for family ceremony.',
    status: 'pending'
  }
];

export default function LeaveApprovalQueue() {
  const { showToast } = useToast();
  const [leaves, setLeaves] = useState(initialLeaves);
  const [showBanner, setShowBanner] = useState(true);

  const pendingCount = leaves.filter(l => l.status === 'pending').length;
  const approvedCount = leaves.filter(l => l.status === 'approved').length;
  const rejectedCount = leaves.filter(l => l.status === 'rejected').length;

  const processLeave = (id, action) => {
    const employee = leaves.find(l => l.id === id)?.empName;
    setLeaves(prev => prev.map(l => l.id === id ? { ...l, status: action } : l));
    
    if (action === 'approved') {
      showToast({ message: `Leave approved for ${employee}`, type: 'success' });
    } else {
      showToast({ message: `Leave rejected for ${employee}`, type: 'error' });
    }
  };

  const columns = [
    {
      header: 'Employee Name',
      accessor: 'empName',
      cell: (row) => (
        <>
          <strong>{row.empName}</strong>
          <div className="text-xs text-gray-500 mt-0.5">Emp Code: {row.empCode}</div>
        </>
      )
    },
    {
      header: 'Client Partner',
      accessor: 'client'
    },
    {
      header: 'Leave Type',
      accessor: 'leaveType',
      cell: (row) => {
        let badgeType = 'neutral';
        if (row.leaveCode === 'sick') badgeType = 'info';
        if (row.leaveCode === 'casual') badgeType = 'success';
        if (row.leaveCode === 'earned') badgeType = 'warning';
        return <Badge type={badgeType}>{row.leaveType}</Badge>;
      }
    },
    {
      header: 'Date Range',
      accessor: 'dateRange'
    },
    {
      header: 'Total Days',
      accessor: 'days',
      cell: (row) => (
        <div className="font-bold text-center">{row.days} Day{row.days > 1 ? 's' : ''}</div>
      )
    },
    {
      header: 'Reason',
      accessor: 'reason',
      cell: (row) => (
        <span className="text-[0.85rem]">{row.reason}</span>
      )
    },
    {
      header: 'Status',
      accessor: 'status',
      cell: (row) => {
        if (row.status === 'pending') return <Badge type="warning">Pending Approval</Badge>;
        if (row.status === 'approved') return <Badge type="success">Approved</Badge>;
        if (row.status === 'rejected') return <Badge type="danger">Rejected</Badge>;
        return null;
      }
    },
    {
      header: 'Actions',
      accessor: 'actions',
      cell: (row) => {
        if (row.status === 'pending') {
          return (
            <div className="flex gap-2">
              <Button size="xs" variant="primary" onClick={() => processLeave(row.id, 'approved')}>Approve</Button>
              <Button size="xs" variant="danger" onClick={() => processLeave(row.id, 'rejected')}>Reject</Button>
            </div>
          );
        }
        if (row.status === 'approved') {
          const d = new Date().toLocaleDateString('en-US', {month: 'short', day: 'numeric', year: 'numeric'});
          return (
            <span className="text-[0.85rem] text-green-600 font-bold">
              Approved by Rajesh (Admin)<br/>
              <span className="text-[0.75rem] text-gray-500 font-normal">{d}</span>
            </span>
          );
        }
        if (row.status === 'rejected') {
          return <span className="text-[0.85rem] text-red-600 font-bold">Rejected — employee notified</span>;
        }
      }
    }
  ];

  return (
    <RoleGuard allowedRoles={['admin', 'manager']}>
    <AuthenticatedLayout>
      <Head title="Leave Approval Queue" />

      <div className="mb-6">
        <Link href="/employees" className="text-[0.85rem] font-semibold text-[#1F3864] hover:underline">
          ← Back to Employees Directory
        </Link>
        <h2 className="text-2xl font-bold text-[#1F3864] mt-2 mb-1">Leave Request Approval Queue</h2>
        <p className="text-gray-500 text-sm">Approve or reject employee leave requests. Approved leaves automatically override punch logs as 'On Leave' during payroll processing.</p>
      </div>

      {showBanner && (
        <div className="bg-[#FFFBEB] border border-[#FDE68A] border-l-4 border-l-[#F59E0B] p-4 rounded-md mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Info className="w-5 h-5 text-[#D97706]" />
            <span className="text-sm text-[#92400E]">
              These are leave requests from agency-deployed employees. You are approving as the agency (Tecla Media), not as the client's manager. Approved leave is marked in payroll as 'On Leave' — it is not a Loss of Pay day.
            </span>
          </div>
          <Button size="xs" variant="secondary" onClick={() => setShowBanner(false)}>Dismiss</Button>
        </div>
      )}

      <div className="card p-4 mb-6 flex gap-4 items-center flex-wrap">
        <div className="text-[0.85rem] font-semibold text-[#1F3864]">Filters:</div>
        <div>
          <Select value="">
            <option value="">All Clients</option>
            <option value="mahindra">Mahindra Corp</option>
            <option value="tcs">Tata Consultancy Services</option>
          </Select>
        </div>
        <div>
          <Select value="">
            <option value="">All Leave Types</option>
            <option value="sick">Sick Leave (SL)</option>
            <option value="casual">Casual Leave (CL)</option>
            <option value="earned">Earned Leave (EL)</option>
          </Select>
        </div>
        <Button variant="navy" className="py-1.5 px-4 h-auto min-h-0 text-sm">Apply</Button>
      </div>

      <div className="card p-0">
        <div className="flex justify-between items-center p-5 pb-0 mb-4">
          <h3 className="text-lg font-bold text-[#1F3864] m-0">Approval Queue</h3>
          <div className="text-[0.85rem] font-semibold">
            <span className="text-yellow-600">{pendingCount} Pending</span> | <span className="text-green-600 ml-1">{approvedCount} Approved</span> | <span className="text-red-600 ml-1">{rejectedCount} Rejected</span>
          </div>
        </div>
        <DataTable columns={columns} data={leaves} />
      </div>

    </AuthenticatedLayout>
    </RoleGuard>
  );
}
