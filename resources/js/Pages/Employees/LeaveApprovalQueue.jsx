import React, { useState } from 'react';
import AuthenticatedLayout from '../../Layouts/AuthenticatedLayout';
import { Head, useForm, router, usePage, Link } from '@inertiajs/react';
import Button from '../../Components/ui/Button';
import Badge from '../../Components/ui/Badge';
import Modal from '../../Components/ui/Modal';
import useToast from '../../Hooks/useToast';
import RoleGuard from '../../Components/RoleGuard.jsx';

export default function LeaveApprovalQueue({ leaves = { data: [], links: [] }, clients = [], filters = {} }) {
  const { showToast } = useToast();
  
  const [search, setSearch] = useState(filters.search || '');
  const [clientId, setClientId] = useState(filters.client_id || '');
  const [leaveType, setLeaveType] = useState(filters.leave_type || 'all');
  const [status, setStatus] = useState(filters.status || 'all');

  // State for rejection modal
  const [rejectLeaveId, setRejectLeaveId] = useState(null);
  const { data, setData, post, processing, reset, errors, clearErrors } = useForm({
      rejection_reason: ''
  });

  const leaveList = leaves.data || [];

  const pendingCount = leaveList.filter(l => l.status === 'pending').length;
  const approvedCount = leaveList.filter(l => l.status === 'approved').length;
  const rejectedCount = leaveList.filter(l => l.status === 'rejected').length;

  const applyFilters = () => {
    router.get(route('leave-requests.index'), {
      search,
      client_id: clientId,
      leave_type: leaveType,
      status
    }, { preserveState: true, preserveScroll: true });
  };

  const resetFilters = () => {
    setSearch('');
    setClientId('');
    setLeaveType('all');
    setStatus('all');
    router.get(route('leave-requests.index'), {}, { preserveState: true, preserveScroll: true });
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      applyFilters();
    }
  };

  const handleApprove = (id) => {
      router.post(route('leave-requests.approve', id), {}, {
          onSuccess: () => showToast({ message: 'Leave approved successfully.', type: 'success' }),
          onError: () => {
              if (usePage().props.flash?.error) {
                  showToast({ message: usePage().props.flash.error, type: 'error' });
              }
          }
      });
  };

  const submitReject = (e) => {
      e.preventDefault();
      post(route('leave-requests.reject', rejectLeaveId), {
          onSuccess: () => {
              showToast({ message: 'Leave rejected successfully.', type: 'success' });
              setRejectLeaveId(null);
              reset();
          },
          onError: () => {
              if (usePage().props.flash?.error) {
                  showToast({ message: usePage().props.flash.error, type: 'error' });
              }
          }
      });
  };

  return (
    <RoleGuard allowedRoles={['admin', 'manager']}>
      <AuthenticatedLayout>
        <Head title="Leave Approval Queue" />
        
        <div className="mb-6">
          <h2 className="text-2xl font-semibold mb-2">Leave Approval Queue</h2>
          <p className="text-gray-500">Review and process employee leave applications.</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100 flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm font-medium mb-1">Page Pending Review</p>
              <h3 className="text-3xl font-bold text-amber-600">{pendingCount}</h3>
            </div>
            <div className="h-12 w-12 bg-amber-50 rounded-full flex items-center justify-center text-amber-500 font-bold text-xl">
              ⏳
            </div>
          </div>
          
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100 flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm font-medium mb-1">Page Approved</p>
              <h3 className="text-3xl font-bold text-green-600">{approvedCount}</h3>
            </div>
            <div className="h-12 w-12 bg-green-50 rounded-full flex items-center justify-center text-green-500 font-bold text-xl">
              ✓
            </div>
          </div>
          
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100 flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm font-medium mb-1">Page Rejected</p>
              <h3 className="text-3xl font-bold text-red-600">{rejectedCount}</h3>
            </div>
            <div className="h-12 w-12 bg-red-50 rounded-full flex items-center justify-center text-red-500 font-bold text-xl">
              ✕
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
            <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Leave Type</label>
            <select 
              className="form-control w-full text-sm" 
              value={leaveType} 
              onChange={e => setLeaveType(e.target.value)}
            >
              <option value="all">All Types</option>
              <option value="casual">Casual Leave</option>
              <option value="sick">Sick Leave</option>
              <option value="earned">Earned Leave</option>
              <option value="unpaid">Unpaid Leave</option>
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
                    <th>Leave Type</th>
                    <th>Date Range</th>
                    <th>Days</th>
                    <th>Reason</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {leaveList.length === 0 ? (
                      <tr><td colSpan="7" className="text-center py-8 text-gray-500">No leave requests found matching specified filters.</td></tr>
                  ) : leaveList.map(leave => (
                    <tr key={leave.id}>
                      <td>
                        <div className="font-medium text-gray-900">{leave.empName}</div>
                        <div className="text-xs text-gray-500 mt-0.5">{leave.empCode} • {leave.client}</div>
                      </td>
                      <td>
                        <span className="badge badge-info">{leave.leaveType}</span>
                      </td>
                      <td className="text-sm text-gray-700">{leave.dateRange}</td>
                      <td className="text-center font-medium text-gray-900">{leave.days}</td>
                      <td className="text-sm max-w-xs truncate text-gray-700" title={leave.reason}>{leave.reason}</td>
                      <td>
                        {leave.status === 'pending' && <span className="badge badge-warning">Pending</span>}
                        {leave.status === 'approved' && <span className="badge badge-success">Approved</span>}
                        {leave.status === 'rejected' && <span className="badge badge-danger">Rejected</span>}
                      </td>
                      <td>
                        {leave.status === 'pending' ? (
                          <div className="flex gap-2">
                            <Button 
                                size="xs" 
                                variant="success" 
                                onClick={() => handleApprove(leave.id)}
                            >
                                Approve
                            </Button>
                            <Button 
                                size="xs" 
                                variant="danger" 
                                onClick={() => {
                                    setRejectLeaveId(leave.id);
                                    clearErrors();
                                    reset();
                                }}
                            >
                                Reject
                            </Button>
                          </div>
                        ) : leave.status === 'approved' ? (
                          <span className="text-green-600 text-xs font-semibold">Approved</span>
                        ) : (
                          <span className="text-red-600 text-xs font-semibold" title={leave.rejection_reason}>Rejected</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {leaves.links && leaves.links.length > 3 && (
              <div className="p-4 border-t border-gray-100 flex items-center justify-between">
                <div className="text-xs text-gray-500">
                  Showing {leaves.from || 0} to {leaves.to || 0} of {leaves.total || 0} leave applications
                </div>
                <div className="flex gap-1">
                  {leaves.links.map((link, key) => (
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

        <Modal isOpen={rejectLeaveId !== null} onClose={() => setRejectLeaveId(null)} title="Reject Leave Request">
            <form onSubmit={submitReject} className="p-4 space-y-4">
                <div className="form-group mb-4">
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Rejection Reason (min 10 chars) *</label>
                    <textarea 
                        className="form-control w-full text-sm" 
                        rows="3" 
                        value={data.rejection_reason} 
                        onChange={e => setData('rejection_reason', e.target.value)}
                        placeholder="Provide details on why the leave request is being rejected..."
                        required
                    ></textarea>
                    {errors.rejection_reason && <span className="text-red-500 text-xs">{errors.rejection_reason}</span>}
                </div>
                <div className="flex justify-end gap-2 border-t pt-4">
                    <Button variant="secondary" type="button" onClick={() => setRejectLeaveId(null)}>Cancel</Button>
                    <Button variant="danger" type="submit" disabled={processing}>Confirm Rejection</Button>
                </div>
            </form>
        </Modal>

      </AuthenticatedLayout>
    </RoleGuard>
  );
}
