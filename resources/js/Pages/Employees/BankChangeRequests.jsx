import React, { useState } from 'react';
import AuthenticatedLayout from '../../Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';
import Button from '../../Components/ui/Button';
import DataTable from '../../Components/ui/DataTable';
import Badge from '../../Components/ui/Badge';
import Modal from '../../Components/ui/Modal';
import useToast from '../../Hooks/useToast';
import Select from '../../Components/ui/Select';
import Input from '../../Components/ui/Input';

import RoleGuard from '../../Components/RoleGuard.jsx';
const initialRequests = [
  {
    id: 1,
    empName: 'Aarav Sharma',
    empCode: 'TEC-088',
    client: 'Mahindra Corp',
    oldBank: 'HDFC Bank',
    oldAc: '••••••••398571',
    newBank: 'ICICI Bank',
    newAc: '••••••••882947',
    date: 'June 24, 2026',
    checks: ['Name Match', 'IFSC Valid'],
    status: 'pending'
  },
  {
    id: 2,
    empName: 'Neha Patil',
    empCode: 'TEC-121',
    client: 'Mahindra Corp',
    oldBank: 'SBI Bank',
    oldAc: '••••••••125432',
    newBank: 'HDFC Bank',
    newAc: '••••••••993821',
    date: 'June 23, 2026',
    checks: ['Name Match', 'IFSC Valid'],
    status: 'pending'
  }
];

export default function BankChangeRequests() {
  const { showToast } = useToast();
  const [requests, setRequests] = useState(initialRequests);
  
  const [approveModalOpen, setApproveModalOpen] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [selectedReq, setSelectedReq] = useState(null);

  const openApprove = (req) => {
    setSelectedReq(req);
    setApproveModalOpen(true);
  };

  const openReject = (req) => {
    setSelectedReq(req);
    setRejectModalOpen(true);
  };

  const confirmApprove = () => {
    if (selectedReq) {
      setRequests(prev => prev.map(r => r.id === selectedReq.id ? { ...r, status: 'approved' } : r));
      showToast({ message: `Bank update approved for ${selectedReq.empName}.`, type: 'success' });
    }
    setApproveModalOpen(false);
  };

  const confirmReject = () => {
    if (selectedReq) {
      setRequests(prev => prev.map(r => r.id === selectedReq.id ? { ...r, status: 'rejected' } : r));
      showToast({ message: `Bank update rejected for ${selectedReq.empName}.`, type: 'error' });
    }
    setRejectModalOpen(false);
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
      header: 'Client Assignment',
      accessor: 'client'
    },
    {
      header: 'Current Account (Old)',
      accessor: 'oldAc',
      cell: (row) => (
        <span className="font-mono text-sm leading-tight inline-block">
          {row.oldBank}<br/>{row.oldAc}
        </span>
      )
    },
    {
      header: 'Requested Account (New)',
      accessor: 'newAc',
      cell: (row) => (
        <span className="font-mono text-sm font-bold text-green-600 leading-tight inline-block">
          {row.newBank}<br/>{row.newAc}
        </span>
      )
    },
    {
      header: 'Requested Date',
      accessor: 'date'
    },
    {
      header: 'Verification Checks',
      accessor: 'checks',
      cell: (row) => (
        <div className="flex flex-col gap-1 items-start">
          {row.checks.map((check, i) => (
            <Badge key={i} type="success" className="text-[0.7rem]">✓ {check}</Badge>
          ))}
        </div>
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
              <Button size="xs" variant="primary" onClick={() => openApprove(row)}>Approve</Button>
              <Button size="xs" variant="danger" onClick={() => openReject(row)}>Reject</Button>
            </div>
          );
        }
        if (row.status === 'approved') {
          return <span className="text-[0.8rem] text-green-600 font-bold">Updated in System</span>;
        }
        if (row.status === 'rejected') {
          return <span className="text-[0.8rem] text-red-600 font-bold">Notice Sent</span>;
        }
      }
    }
  ];

  return (
    <RoleGuard allowedRoles={['admin', 'manager']}>
    <AuthenticatedLayout>
      <Head title="Bank Change Requests" />
      
      <div className="mb-6">
        <Link href={route('employees.index')} className="text-[0.85rem] font-semibold text-[#1F3864] hover:underline">
          ← Back to Employees Directory
        </Link>
        <h2 className="text-2xl font-bold text-[#1F3864] mt-2 mb-1">Secure Bank Details Approval Queue</h2>
        <p className="text-gray-500 text-sm">Review and authorize employee requests to update salary disbursement accounts. Employees cannot edit these details directly.</p>
      </div>

      <div className="card p-0">
        <DataTable columns={columns} data={requests} />
      </div>

      {/* Approve Modal */}
      <Modal isOpen={approveModalOpen} onClose={() => setApproveModalOpen(false)} title="Confirm Bank Detail Update">
        <div className="p-4">
          <p className="text-[0.9rem] mb-4">
            You are authorizing a bank profile change request for <strong>{selectedReq?.empName}</strong>.
          </p>
          <div className="bg-green-50 p-4 rounded-md border border-green-200 mb-4 text-[0.85rem]">
            <strong>New Account Details:</strong><br />
            Bank: <span>{selectedReq?.newBank}</span><br />
            Account: <span>{selectedReq?.newAc}</span>
          </div>
          <p className="text-[0.75rem] text-gray-500">
            ⚠️ This update will immediately change future salary disbursement payouts. Verify the uploaded passbook copy before confirming.
          </p>
        </div>
        <div className="flex justify-end gap-3 p-4 border-t border-gray-200 bg-gray-50 rounded-b-lg">
          <Button variant="secondary" onClick={() => setApproveModalOpen(false)}>Cancel</Button>
          <Button variant="primary" onClick={confirmApprove}>Approve & Update</Button>
        </div>
      </Modal>

      {/* Reject Modal */}
      <Modal isOpen={rejectModalOpen} onClose={() => setRejectModalOpen(false)} title="Reject Detail Change Request">
        <div className="p-4">
          <p className="text-[0.9rem] mb-4">
            Provide rejection feedback for <strong>{selectedReq?.empName}</strong>.
          </p>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Reason for Rejection</label>
            <Select value="">
              <option value="name_mismatch">Name on passbook does not match employee records</option>
              <option value="illegible_doc">Uploaded bank document/passbook copy is illegible</option>
              <option value="invalid_ifsc">Invalid IFSC / branch code entered</option>
              <option value="other">Other reason</option>
            </Select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Additional comments (Optional)</label>
            <textarea 
              className="w-full border border-gray-300 rounded-md p-2 text-sm focus:ring-1 focus:ring-[#B8860B] focus:border-[#B8860B] transition-colors" 
              rows="3" 
              placeholder="Explain the error to help employee correct it..."
            ></textarea>
          </div>
        </div>
        <div className="flex justify-end gap-3 p-4 border-t border-gray-200 bg-gray-50 rounded-b-lg">
          <Button variant="secondary" onClick={() => setRejectModalOpen(false)}>Cancel</Button>
          <Button variant="danger" onClick={confirmReject}>Reject Request</Button>
        </div>
      </Modal>

    </AuthenticatedLayout>
    </RoleGuard>
  );
}
