import React, { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router } from '@inertiajs/react';
import Button from '../../Components/ui/Button';
import Badge from '../../Components/ui/Badge';
import Modal from '../../Components/ui/Modal';
import useToast from '../../Hooks/useToast';
import RoleGuard from '../../Components/RoleGuard.jsx';
import { Clock, CheckCircle2, XCircle, AlertCircle, ArrowLeft, Search, Filter, RotateCcw } from 'lucide-react';

export default function AttendanceCorrectionQueue({ requests = { data: [], links: [] }, clients = [], summaryCounts = {}, filters = {} }) {
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
    router.get(route('employees.attendance-corrections'), {
      search,
      client_id: clientId,
      status
    }, { preserveState: true, preserveScroll: true });
  };

  const resetFilters = () => {
    setSearch('');
    setClientId('');
    setStatus('all');
    router.get(route('employees.attendance-corrections'), {}, { preserveState: true, preserveScroll: true });
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
    router.post(route('employees.attendance-corrections.approve', selectedReq.id), {}, {
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
    router.post(route('employees.attendance-corrections.reject', selectedReq.id), {
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

  const pendingCount = summaryCounts?.pending ?? reqList.filter(r => r.status === 'pending').length;
  const approvedCount = summaryCounts?.approved ?? reqList.filter(r => r.status === 'approved').length;
  const rejectedCount = summaryCounts?.rejected ?? reqList.filter(r => r.status === 'rejected').length;

  return (
    <RoleGuard allowedRoles={['admin', 'manager']}>
      <AuthenticatedLayout>
        <Head title="Attendance Correction Approval Queue" />

        <div className="mb-6">
          <Link href={route('employees.index')} className="text-[0.85rem] font-semibold text-[#1F3864] hover:underline inline-flex items-center gap-1">
            <ArrowLeft size={14} /> Back to Employees Directory
          </Link>
          <div className="flex items-center justify-between mt-2">
            <div>
              <h2 className="text-2xl font-bold text-[#1F3864] mb-1">Attendance Correction Approval Queue</h2>
              <p className="text-gray-500 text-sm">Review, authorize, or reject employee clock-in and clock-out time correction applications.</p>
            </div>
          </div>
        </div>

        {/* Top Summary Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-white p-4 rounded-xl border border-amber-200 bg-amber-50/50 shadow-sm flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-amber-800">Pending Review</div>
              <div className="text-2xl font-bold text-amber-950 mt-1">{pendingCount}</div>
            </div>
            <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center">
              <Clock size={20} />
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-emerald-200 bg-emerald-50/50 shadow-sm flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-emerald-800">Page Approved</div>
              <div className="text-2xl font-bold text-emerald-950 mt-1">{approvedCount}</div>
            </div>
            <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 size={20} />
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-rose-200 bg-rose-50/50 shadow-sm flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-rose-800">Page Rejected</div>
              <div className="text-2xl font-bold text-rose-950 mt-1">{rejectedCount}</div>
            </div>
            <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center">
              <XCircle size={20} />
            </div>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-6 flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Search Employee / Client</label>
            <input 
              type="text" 
              className="form-control w-full text-sm" 
              placeholder="Search employee name, code..."
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
            <Button variant="primary" size="sm" onClick={applyFilters} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <Filter size={14} /> Apply Filters
            </Button>
            <Button variant="secondary" size="sm" onClick={resetFilters} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <RotateCcw size={14} /> Reset
            </Button>
          </div>
        </div>

        {/* Data Table */}
        <div className="card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="data-table w-full">
              <thead>
                <tr>
                  <th>Employee &amp; Client</th>
                  <th>Attendance Date</th>
                  <th>Original Stamps</th>
                  <th>Requested Stamps</th>
                  <th>Reason / Details</th>
                  <th>Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {reqList.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="text-center py-8 text-gray-500">
                      No attendance correction requests found matching specified filters.
                    </td>
                  </tr>
                ) : (
                  reqList.map((row) => (
                    <tr key={row.id}>
                      <td>
                        <strong className="text-gray-900 block">{row.empName}</strong>
                        <span className="text-xs text-gray-500 font-mono">{row.empCode} · {row.client}</span>
                      </td>
                      <td>
                        <strong className="text-gray-900 block">{row.formattedDate}</strong>
                        <span className="text-xs text-gray-400 font-mono">{row.attendanceDate}</span>
                      </td>
                      <td>
                        <div className="text-xs font-mono text-gray-600">
                          <div>In: <span className="font-semibold text-gray-800">{row.originalPunchIn}</span></div>
                          <div>Out: <span className="font-semibold text-gray-800">{row.originalPunchOut}</span></div>
                        </div>
                      </td>
                      <td>
                        <div className="text-xs font-mono text-indigo-700 bg-indigo-50/70 p-1.5 rounded border border-indigo-100">
                          <div>In: <strong>{row.requestedPunchIn}</strong></div>
                          <div>Out: <strong>{row.requestedPunchOut}</strong></div>
                        </div>
                      </td>
                      <td className="max-w-xs">
                        <div className="font-semibold text-xs text-gray-800">{row.reasonCategory}</div>
                        <div className="text-xs text-gray-500 truncate" title={row.reasonDetails}>{row.reasonDetails}</div>
                      </td>
                      <td>
                        <Badge
                          variant={
                            row.status === 'approved' ? 'success' :
                            row.status === 'rejected' ? 'danger' : 'warning'
                          }
                        >
                          {row.status === 'pending' ? 'Pending Review' : row.status}
                        </Badge>
                      </td>
                      <td className="text-right space-x-2">
                        {row.status === 'pending' ? (
                          <>
                            <Button size="sm" variant="success" onClick={() => openApprove(row)}>
                              Approve
                            </Button>
                            <Button size="sm" variant="danger" onClick={() => openReject(row)}>
                              Reject
                            </Button>
                          </>
                        ) : (
                          <div className="text-xs text-gray-400 font-mono">
                            {row.reviewedAt && <div>Reviewed by {row.reviewerName || 'Admin'}</div>}
                            {row.rejectionReason && <div className="text-rose-600 truncate max-w-[140px]" title={row.rejectionReason}>Reason: {row.rejectionReason}</div>}
                          </div>
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
          title="Approve Time Correction Request"
        >
          <div className="py-2 space-y-4">
            <p className="text-sm text-gray-600">
              Are you sure you want to approve the attendance time correction for <strong>{selectedReq?.empName}</strong>?
            </p>
            <div className="text-xs bg-gray-50 p-3 rounded border border-gray-200 font-mono space-y-1">
              <div>• Date: <strong>{selectedReq?.formattedDate} ({selectedReq?.attendanceDate})</strong></div>
              <div>• Requested Punch In: <strong className="text-indigo-700">{selectedReq?.requestedPunchIn}</strong></div>
              <div>• Requested Punch Out: <strong className="text-indigo-700">{selectedReq?.requestedPunchOut}</strong></div>
              <div className="text-emerald-700 pt-1">• Attendance record will be updated automatically.</div>
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
          title="Reject Time Correction Request"
        >
          <div className="py-2 space-y-4">
            <p className="text-sm text-gray-600">
              Rejecting attendance correction request for <strong>{selectedReq?.empName}</strong>.
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
