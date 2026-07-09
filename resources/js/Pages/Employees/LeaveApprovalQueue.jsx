import React, { useState } from 'react';
import AuthenticatedLayout from '../../Layouts/AuthenticatedLayout';
import { Head, useForm, router, usePage } from '@inertiajs/react';
import Button from '../../Components/ui/Button';
import Badge from '../../Components/ui/Badge';
import Modal from '../../Components/ui/Modal';
import useToast from '../../Hooks/useToast';
import RoleGuard from '../../Components/RoleGuard.jsx';

export default function LeaveApprovalQueue({ initialLeaves }) {
  const { showToast } = useToast();
  
  // State for rejection modal
  const [rejectLeaveId, setRejectLeaveId] = useState(null);
  const { data, setData, post, processing, reset, errors, clearErrors } = useForm({
      rejection_reason: ''
  });

  const pendingCount = initialLeaves.filter(l => l.status === 'pending').length;
  const approvedCount = initialLeaves.filter(l => l.status === 'approved').length;
  const rejectedCount = initialLeaves.filter(l => l.status === 'rejected').length;

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
              <p className="text-gray-500 text-sm font-medium mb-1">Pending Review</p>
              <h3 className="text-3xl font-bold text-gray-800">{pendingCount}</h3>
            </div>
            <div className="h-12 w-12 bg-amber-50 rounded-full flex items-center justify-center text-amber-500">
              <i className="lucide-clock"></i>
            </div>
          </div>
          
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100 flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm font-medium mb-1">Approved</p>
              <h3 className="text-3xl font-bold text-gray-800">{approvedCount}</h3>
            </div>
            <div className="h-12 w-12 bg-green-50 rounded-full flex items-center justify-center text-green-500">
              <i className="lucide-check-circle"></i>
            </div>
          </div>
          
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100 flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm font-medium mb-1">Rejected</p>
              <h3 className="text-3xl font-bold text-gray-800">{rejectedCount}</h3>
            </div>
            <div className="h-12 w-12 bg-red-50 rounded-full flex items-center justify-center text-red-500">
              <i className="lucide-x-circle"></i>
            </div>
          </div>
        </div>
        
        <div className="card">
            <div className="table-responsive">
              <table className="data-table w-full">
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Leave Type</th>
                    <th>Date Range</th>
                    <th>Days</th>
                    <th>Reason</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {initialLeaves.length === 0 ? (
                      <tr><td colSpan="7" className="text-center">No leave requests found.</td></tr>
                  ) : initialLeaves.map(leave => (
                    <tr key={leave.id}>
                      <td>
                        <div className="font-medium">{leave.empName}</div>
                        <div className="text-xs text-gray-500">{leave.empCode} • {leave.client}</div>
                      </td>
                      <td>
                        <span className="badge badge-info">{leave.leaveType}</span>
                      </td>
                      <td className="text-sm">{leave.dateRange}</td>
                      <td className="text-center font-medium">{leave.days}</td>
                      <td className="text-sm max-w-xs truncate" title={leave.reason}>{leave.reason}</td>
                      <td>
                        {leave.status === 'pending' && <span className="badge badge-warning">Pending</span>}
                        {leave.status === 'approved' && <span className="badge badge-success">Approved</span>}
                        {leave.status === 'rejected' && <span className="badge badge-danger">Rejected</span>}
                      </td>
                      <td>
                        {leave.status === 'pending' ? (
                          <div className="flex gap-2">
                            <Button 
                                size="sm" 
                                variant="success" 
                                onClick={() => handleApprove(leave.id)}
                            >
                                Approve
                            </Button>
                            <Button 
                                size="sm" 
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
                        ) : (
                          <span className="text-gray-400 text-sm">Processed</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
        </div>

        <Modal isOpen={rejectLeaveId !== null} onClose={() => setRejectLeaveId(null)} title="Reject Leave Request">
            <form onSubmit={submitReject}>
                <div className="form-group mb-4">
                    <label>Rejection Reason (min 10 chars)</label>
                    <textarea 
                        className="form-control" 
                        rows="3" 
                        value={data.rejection_reason} 
                        onChange={e => setData('rejection_reason', e.target.value)}
                    ></textarea>
                    {errors.rejection_reason && <span className="error-text">{errors.rejection_reason}</span>}
                </div>
                <div className="flex justify-end gap-2">
                    <Button variant="secondary" type="button" onClick={() => setRejectLeaveId(null)}>Cancel</Button>
                    <Button variant="danger" type="submit" disabled={processing}>Confirm Rejection</Button>
                </div>
            </form>
        </Modal>

      </AuthenticatedLayout>
    </RoleGuard>
  );
}
