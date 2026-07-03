import React from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';

import RoleGuard from '../../Components/RoleGuard.jsx';
export default function ClientAttendanceApproval() {
    return (
        <RoleGuard allowedRoles={['admin', 'executive', 'client']}>
    <AuthenticatedLayout>
            <Head title="Client Attendance Approval" />
            
      <div style={{ marginBottom: '1.5rem' }}>
        <a href="/clients-list" style={{ fontSize: '0.85rem', fontWeight: '600' }}>← Back to Clients Directory</a>
        
        <div className="flex-row-between" style={{ marginTop: '1rem' }}>
          <div>
            <h2 id="approval-header-title">Timesheet Attendance Approvals</h2>
            <p id="approval-header-desc" style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Verify monthly employee timesheet counts prior to signing off for invoice generation.</p>
          </div>
        </div>
      </div>

      
      <div className="card" style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h3 className="card-title">Billing Cycle: May 2026</h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Accumulated from daily biometric punch logs (May 01 - May 25, 2026)</p>
          <div style={{ fontSize: '0.85rem', fontWeight: '500' }}>
            Status: <span className="badge badge-warning" id="client-batch-status">Awaiting Your Approval</span>
          </div>
        </div>
        <div id="approval-status-action" style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button className="btn btn-danger" >Reject Batch</button>
          <button className="btn btn-primary" >Approve timesheet batch</button>
        </div>
      </div>

      
      <div className="grid-cols-4" style={{ marginBottom: '1.5rem' }} id="attendance-summary-grid">
        
      </div>

      
      <div id="attendance-alert-container" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem' }}></div>

      
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap', background: 'white', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', alignItems: 'center' }}>
        <div style={{ flex: '1', minWidth: '200px' }}>
          <label style={{ fontSize: '0.75rem', fontWeight: '600', display: 'block', marginBottom: '0.25rem' }}>Search Employee</label>
          <input type="text" id="att-search" className="form-control" placeholder="Search by name or code..." style={{ padding: '0.4rem 0.75rem', width: '100%' }} oninput="filterAttendance()" />
        </div>
        <div style={{ width: '200px' }}>
          <label style={{ fontSize: '0.75rem', fontWeight: '600', display: 'block', marginBottom: '0.25rem' }}>Attendance Status</label>
          <select id="att-filter-status" className="form-control" style={{ padding: '0.4rem 0.75rem', height: 'auto' }} >
            <option value="all">All Employees</option>
            <option value="lop">Has Loss of Pay (LOP)</option>
            <option value="leave">Has Approved Leaves</option>
            <option value="full">100% Attendance</option>
          </select>
        </div>
      </div>

      
      <div className="card">
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Emp Code</th>
                <th>Employee Name</th>
                <th>Designation Role</th>
                <th>Total Working Days</th>
                <th>Days Logged (Present)</th>
                <th>Loss of Pay (LOP) Days</th>
                <th>Approved Leaves</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody id="attendance-table-body">
              
            </tbody>
          </table>
        </div>
      </div>
    
        </AuthenticatedLayout>
    </RoleGuard>
    );
}
