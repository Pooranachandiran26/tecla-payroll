import React, { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router } from '@inertiajs/react';
import Button from '../../Components/ui/Button';
import Badge from '../../Components/ui/Badge';
import Modal from '../../Components/ui/Modal';
import useToast from '../../Hooks/useToast';
import RoleGuard from '../../Components/RoleGuard.jsx';

export default function DaySwapRequests({ requests = { data: [], links: [] }, clients = [], filters = {} }) {
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
    router.get(route('employees.day-swaps'), {
      search,
      client_id: clientId,
      status
    }, { preserveState: true, preserveScroll: true });
  };

  const resetFilters = () => {
    setSearch('');
    setClientId('');
    setStatus('all');
    router.get(route('employees.day-swaps'), {}, { preserveState: true, preserveScroll: true });
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
    router.post(route('employees.day-swaps.approve', selectedReq.id), {}, {
      onFinish: () => {
        setProcessing(false);
        setApproveModalOpen(false);
        setSelectedReq(null);
      },
      onSuccess: (page) => {
        if (page.props.flash?.success) showToast({ message: page.props.flash.success, type: 'success' });
        if (page.props.flash?.error) showToast({ message: page.props.flash.error, type: 'error' });
      }
    });
  };

  const confirmReject = () => {
    if (!selectedReq || !rejectionReason.trim()) return;
    setProcessing(true);
    router.post(route('employees.day-swaps.reject', selectedReq.id), {
      rejection_reason: rejectionReason
    }, {
      onFinish: () => {
        setProcessing(false);
        setRejectModalOpen(false);
        setSelectedReq(null);
      },
      onSuccess: (page) => {
        if (page.props.flash?.success) showToast({ message: page.props.flash.success, type: 'success' });
        if (page.props.flash?.error) showToast({ message: page.props.flash.error, type: 'error' });
      }
    });
  };

  const reqList = requests.data || [];

  return (
    <RoleGuard allowedRoles={['admin', 'manager']}>
      <AuthenticatedLayout>
        <Head title="Attendance Day Swap Requests" />

        <div className="mb-6">
          <Link href={route('employees.index')} className="text-[0.85rem] font-semibold text-[#1F3864] hover:underline">
            ← Back to Employees Directory
          </Link>
          <h2 className="text-2xl font-bold text-[#1F3864] mt-2 mb-1">Attendance Day Swap Approval Queue</h2>
          <p className="text-gray-500 text-sm">Review and authorize employee day swap requests. Approved swaps update attendance resolution automatically.</p>
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
                  <th>Off-Day Worked (Original)</th>
                  <th>Work-Day Taken Off (New)</th>
                  <th>Reason / Details</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {reqList.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center py-8 text-gray-500">
                      No day swap requests found matching the specified filters.
                    </td>
                  </tr>
                ) : (
                  reqList.map((row) => (
                    <tr key={row.id}>
                      <td>
                        <strong className="text-gray-900">{row.empName}</strong>
                        <span className="block text-xs text-gray-500">{row.empCode} · {row.client}</span>
                      </td>
                      <td><strong className="font-mono text-gray-900">{row.originalDate}</strong></td>
                      <td><strong className="font-mono text-gray-900">{row.newDate}</strong></td>
                      <td className="text-gray-600 max-w-xs truncate" title={row.reason}>
                        {row.reason}
                      </td>
                      <td>
                        <Badge
                          variant={
                            row.status === 'approved' ? 'success' :
                            row.status === 'rejected' ? 'danger' : 'warning'
                          }
                        >
                          {row.status}
                        </Badge>
                      </td>
                      <td className="text-right space-x-2">
                        {row.status === 'pending' && (
                          <>
                            <Button size="sm" variant="success" onClick={() => openApprove(row)}>
                              Approve
                            </Button>
                            <Button size="sm" variant="danger" onClick={() => openReject(row)}>
                              Reject
                            </Button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Approve Modal */}
        <Modal 
          isOpen={approveModalOpen} 
          onClose={() => setApproveModalOpen(false)}
          title="Approve Day Swap Request"
        >
          <div className="py-2 space-y-4">
            <p className="text-sm text-gray-600">
              Are you sure you want to approve the attendance day swap for <strong>{selectedReq?.empName}</strong>?
            </p>
            <div className="text-xs bg-gray-50 p-3 rounded border border-gray-200 font-mono space-y-1">
              <div>• Off-day worked: <strong>{selectedReq?.originalDate}</strong></div>
              <div>• Work-day taken off: <strong>{selectedReq?.newDate}</strong></div>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
              <Button variant="secondary" size="sm" onClick={() => setApproveModalOpen(false)}>Cancel</Button>
              <Button variant="success" size="sm" onClick={confirmApprove} disabled={processing}>
                {processing ? 'Approving...' : 'Confirm Approval'}
              </Button>
            </div>
          </div>
        </Modal>

        {/* Reject Modal */}
        <Modal 
          isOpen={rejectModalOpen} 
          onClose={() => setRejectModalOpen(false)}
          title="Reject Day Swap Request"
        >
          <div className="py-2 space-y-4">
            <p className="text-sm text-gray-600">
              Rejecting day swap request for <strong>{selectedReq?.empName}</strong>.
            </p>
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Rejection Reason *</label>
              <textarea
                rows="3"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Specify reason for rejection..."
                className="form-control w-full text-sm"
                required
              />
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
              <Button variant="secondary" size="sm" onClick={() => setRejectModalOpen(false)}>Cancel</Button>
              <Button variant="danger" size="sm" onClick={confirmReject} disabled={processing || !rejectionReason.trim()}>
                {processing ? 'Rejecting...' : 'Confirm Rejection'}
              </Button>
            </div>
          </div>
        </Modal>
      </AuthenticatedLayout>
    </RoleGuard>
  );
}
