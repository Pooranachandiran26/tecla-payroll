import React from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';

import RoleGuard from '../../Components/RoleGuard.jsx';
export default function LeaveRequest() {
    return (
        <RoleGuard allowedRoles={['admin', 'executive', 'candidate']}>
    <AuthenticatedLayout>
            <Head title="Leave Request" />
            
      <div className="flex-row-between">
        <div>
          <h2>My Leave Requests</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Submit leave applications, track approval states, and review historical logs.</p>
        </div>
        <button className="btn btn-primary" >➕ Apply for Leave</button>
      </div>

      
      <div className="card">
        <h3 className="card-title" style={{ marginBottom: '1rem' }}>My Leave Request History</h3>
        
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Request ID</th>
                <th>Leave Type</th>
                <th>From Date</th>
                <th>To Date</th>
                <th>Total Days</th>
                <th>Reason Description</th>
                <th>Approving Manager</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody id="leave-history-body">
              <tr id="c-leave-1">
                <td>#LR-1082</td>
                <td><span className="badge badge-info">Sick Leave (SL)</span></td>
                <td>June 23, 2026</td>
                <td>June 23, 2026</td>
                <td style={{ fontWeight: 'bold', textAlign: 'center' }}>1 Day</td>
                <td>Suffering from viral fever, prescription attached.</td>
                <td>Vikas Mehta (Mahindra)</td>
                <td><span className="badge badge-success">Approved</span></td>
                <td>—</td>
              </tr>
              <tr id="c-leave-2">
                <td>#LR-1090</td>
                <td><span className="badge badge-success">Casual Leave (CL)</span></td>
                <td>June 28, 2026</td>
                <td>June 30, 2026</td>
                <td style={{ fontWeight: 'bold', textAlign: 'center' }}>3 Days</td>
                <td>Traveling to hometown for family ceremony.</td>
                <td>Vikas Mehta (Mahindra)</td>
                <td><span className="badge badge-warning" id="c-leave-status-2">Pending Approval</span></td>
                <td id="c-leave-action-2">
                  <button className="btn btn-danger btn-xs" >Cancel Request</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    
        </AuthenticatedLayout>
    </RoleGuard>
    );
}
