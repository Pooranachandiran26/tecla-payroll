import React, { useState } from 'react';
import AuthenticatedLayout from '../../Layouts/AuthenticatedLayout';
import { Head, Link, router } from '@inertiajs/react';
import Button from '../../Components/ui/Button';
import Badge from '../../Components/ui/Badge';
import Modal from '../../Components/ui/Modal';
import useToast from '../../Hooks/useToast';
import RoleGuard from '../../Components/RoleGuard.jsx';

export default function BankChangeRequests({ requests = { data: [], links: [] }, clients = [], filters = {} }) {
  const { showToast } = useToast();
  
  const [search, setSearch] = useState(filters.search || '');
  const [clientId, setClientId] = useState(filters.client_id || '');
  const [status, setStatus] = useState(filters.status || 'all');

  const [approveModalOpen, setApproveModalOpen] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [selectedReq, setSelectedReq] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [processing, setProcessing] = useState(false);

  const applyFilters = () => {
    router.get(route('employees.bank-change-requests'), {
      search,
      client_id: clientId,
      status
    }, { preserveState: true, preserveScroll: true });
  };

  const resetFilters = () => {
    setSearch('');
    setClientId('');
    setStatus('all');
    router.get(route('employees.bank-change-requests'), {}, { preserveState: true, preserveScroll: true });
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      applyFilters();
    }
  };

  const openApprove = (req) => {
    setSelectedReq(req);
    setApproveModalOpen(true);
  };

  const openReject = (req) => {
    setSelectedReq(req);
    setRejectionReason('');
    setRejectModalOpen(true);
  };

  const confirmApprove = () => {
    if (!selectedReq) return;
    setProcessing(true);
    router.post(route('employees.bank-change-requests.approve', selectedReq.id), {}, {
      onFinish: () => {
        setProcessing(false);
        setApproveModalOpen(false);
      },
      onSuccess: () => {
        showToast({ message: `Bank update approved for ${selectedReq.empName}.`, type: 'success' });
      },
      onError: (err) => {
        showToast({ message: err.message || 'Failed to approve bank request.', type: 'error' });
      }
    });
  };

  const confirmReject = () => {
    if (!selectedReq) return;
    if (!rejectionReason || rejectionReason.trim().length < 5) {
      showToast({ message: 'Please provide a valid rejection reason (min 5 characters).', type: 'error' });
      return;
    }
    setProcessing(true);
    router.post(route('employees.bank-change-requests.reject', selectedReq.id), {
      rejection_reason: rejectionReason
    }, {
      onFinish: () => {
        setProcessing(false);
        setRejectModalOpen(false);
      },
      onSuccess: () => {
        showToast({ message: `Bank update rejected for ${selectedReq.empName}.`, type: 'success' });
      },
      onError: (err) => {
        showToast({ message: err.message || 'Failed to reject bank request.', type: 'error' });
      }
    });
  };

  const reqList = requests.data || [];

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

        {/* Filter Controls Bar */}
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-6 flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Search Employee / Client</label>
            <input 
              type="text" 
              className="form-control w-full text-sm" 
              placeholder="Search by name, code..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={handleKeyPress}
            />
          </div>
          <div className="w-48">
            <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Client Filter</label>
            <select 
              className="form-control w-full text-sm" 
              value={clientId} 
              onChange={e => setClientId(e.target.value)}
            >
              <option value="">All Clients</option>
              {clients.map(c => (
                <option key={c.id} value={c.id}>{c.company_name}</option>
              ))}
            </select>
          </div>
          <div className="w-40">
            <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Status</label>
            <select 
              className="form-control w-full text-sm" 
              value={status} 
              onChange={e => setStatus(e.target.value)}
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
          <div className="flex gap-2">
            <Button variant="primary" size="sm" onClick={applyFilters}>Apply Filters</Button>
            <Button variant="secondary" size="sm" onClick={resetFilters}>Reset</Button>
          </div>
        </div>

        <div className="card p-0">
          <div className="overflow-x-auto">
            <table className="data-table w-full">
              <thead>
                <tr>
                  <th>Employee &amp; Client</th>
                  <th>Current Account (Old)</th>
                  <th>Requested Account (New)</th>
                  <th>Reason / Remarks</th>
                  <th>Requested Date</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {reqList.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="text-center py-8 text-gray-500">
                      No bank change requests found matching the specified filters.
                    </td>
                  </tr>
                ) : (
                  reqList.map((row) => (
                    <tr key={row.id}>
                      <td>
                        <strong className="text-gray-900">{row.empName}</strong>
                        <div className="text-xs text-gray-500 mt-0.5">
                          {row.empCode} • {row.client}
                        </div>
                      </td>
                      <td>
                        <span className="font-mono text-xs leading-tight inline-block text-gray-700">
                          {row.oldBank}<br/>{row.oldAc}
                        </span>
                      </td>
                      <td>
                        <span className="font-mono text-xs font-bold text-green-600 leading-tight inline-block">
                          {row.newBank} ({row.rawNewIfsc})<br/>{row.newAc}
                        </span>
                        <div className="text-[0.7rem] text-gray-500 mt-0.5">Holder: {row.rawNewHolder}</div>
                      </td>
                      <td>
                        <div className="text-xs max-w-xs truncate" title={row.reason}>
                          {row.reason || '—'}
                        </div>
                      </td>
                      <td className="text-xs text-gray-600">{row.date}</td>
                      <td>
                        {row.status === 'pending' && <Badge type="warning">Pending Approval</Badge>}
                        {row.status === 'approved' && <Badge type="success">Approved</Badge>}
                        {row.status === 'rejected' && <Badge type="danger">Rejected</Badge>}
                      </td>
                      <td>
                        {row.status === 'pending' ? (
                          <div className="flex gap-2">
                            <Button size="xs" variant="primary" onClick={() => openApprove(row)}>Approve</Button>
                            <Button size="xs" variant="danger" onClick={() => openReject(row)}>Reject</Button>
                          </div>
                        ) : row.status === 'approved' ? (
                          <span className="text-[0.8rem] text-green-600 font-bold">Updated in System</span>
                        ) : (
                          <span className="text-[0.8rem] text-red-600 font-bold" title={row.rejectionReason}>Rejected</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {requests.links && requests.links.length > 3 && (
            <div className="p-4 border-t border-gray-100 flex items-center justify-between">
              <div className="text-xs text-gray-500">
                Showing {requests.from || 0} to {requests.to || 0} of {requests.total || 0} requests
              </div>
              <div className="flex gap-1">
                {requests.links.map((link, key) => (
                  <Link
                    key={key}
                    href={link.url || '#'}
                    className={`px-3 py-1 text-xs rounded border ${
                      link.active
                        ? 'bg-[#1F3864] text-white border-[#1F3864]'
                        : link.url
                        ? 'bg-white text-gray-700 hover:bg-gray-50 border-gray-300'
                        : 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                    }`}
                    dangerouslySetInnerHTML={{ __html: link.label }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Approve Modal */}
        <Modal isOpen={approveModalOpen} onClose={() => setApproveModalOpen(false)} title="Confirm Bank Detail Update">
          <div className="p-4">
            <p className="text-[0.9rem] mb-4">
              You are authorizing a bank profile change request for <strong>{selectedReq?.empName}</strong> ({selectedReq?.empCode}).
            </p>
            <div className="bg-green-50 p-4 rounded-md border border-green-200 mb-4 text-[0.85rem]">
              <strong>New Account Details:</strong><br />
              Account Holder: <span>{selectedReq?.rawNewHolder}</span><br />
              Bank Name: <span>{selectedReq?.newBank}</span><br />
              Branch: <span>{selectedReq?.rawNewBranch || 'N/A'}</span><br />
              IFSC Code: <span>{selectedReq?.rawNewIfsc}</span><br />
              Account Number: <span className="font-mono font-bold text-green-700">{selectedReq?.rawNewAc}</span>
            </div>
            <p className="text-[0.75rem] text-gray-500">
              ⚠️ Approving this request will immediately overwrite the employee's payout credentials in the system for all future salary disbursements.
            </p>
          </div>
          <div className="flex justify-end gap-3 p-4 border-t border-gray-200 bg-gray-50 rounded-b-lg">
            <Button variant="secondary" onClick={() => setApproveModalOpen(false)} disabled={processing}>Cancel</Button>
            <Button variant="primary" onClick={confirmApprove} disabled={processing}>
              {processing ? 'Approving...' : 'Approve & Update'}
            </Button>
          </div>
        </Modal>

        {/* Reject Modal */}
        <Modal isOpen={rejectModalOpen} onClose={() => setRejectModalOpen(false)} title="Reject Bank Detail Request">
          <div className="p-4">
            <p className="text-[0.9rem] mb-4">
              Provide rejection feedback for <strong>{selectedReq?.empName}</strong>.
            </p>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Reason for Rejection *</label>
              <textarea 
                className="form-control w-full text-sm" 
                rows="3" 
                value={rejectionReason}
                onChange={e => setRejectionReason(e.target.value)}
                placeholder="Explain why the bank detail change request was rejected..."
                required
              ></textarea>
            </div>
          </div>
          <div className="flex justify-end gap-3 p-4 border-t border-gray-200 bg-gray-50 rounded-b-lg">
            <Button variant="secondary" onClick={() => setRejectModalOpen(false)} disabled={processing}>Cancel</Button>
            <Button variant="danger" onClick={confirmReject} disabled={processing}>
              {processing ? 'Rejecting...' : 'Reject Request'}
            </Button>
          </div>
        </Modal>

      </AuthenticatedLayout>
    </RoleGuard>
  );
}
