import React from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';

import RoleGuard from '../../Components/RoleGuard.jsx';
export default function ClientCandidates() {
    return (
        <RoleGuard allowedRoles={['admin', 'manager', 'client']}>
    <AuthenticatedLayout>
            <Head title="Client Candidates" />
            
      <div style={{ marginBottom: '1.5rem' }}>
        <a href="/clients-list" style={{ fontSize: '0.85rem', fontWeight: '600' }}>← Back to Clients Directory</a>
        
        <div className="flex-row-between" style={{ marginTop: '1rem' }}>
          <div>
            <h2>Deployed Employees</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>View active personnel currently deployed under contract agreement.</p>
          </div>
        </div>
      </div>

      
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap', background: 'white', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', alignItems: 'center' }}>
        <div style={{ flex: '1', minWidth: '200px' }}>
          <label style={{ fontSize: '0.75rem', fontWeight: '600', display: 'block', marginBottom: '0.25rem' }}>Search Employee</label>
          <input type="text" id="cand-search" className="form-control" placeholder="Search by name or code..." style={{ padding: '0.4rem 0.75rem', width: '100%' }} oninput="filterCandidates()" />
        </div>
        <div style={{ width: '150px' }}>
          <label style={{ fontSize: '0.75rem', fontWeight: '600', display: 'block', marginBottom: '0.25rem' }}>Shift Model</label>
          <select id="cand-filter-shift" className="form-control" style={{ padding: '0.4rem 0.75rem', height: 'auto' }} >
            <option value="all">All Shifts</option>
            <option value="General">General</option>
            <option value="Night">Night Shift</option>
            <option value="Rotational">Rotational</option>
          </select>
        </div>
        <div style={{ width: '150px' }}>
          <label style={{ fontSize: '0.75rem', fontWeight: '600', display: 'block', marginBottom: '0.25rem' }}>Attendance</label>
          <select id="cand-filter-attendance" className="form-control" style={{ padding: '0.4rem 0.75rem', height: 'auto' }} >
            <option value="all">All Statuses</option>
            <option value="Present">Present</option>
            <option value="Absent">Absent</option>
            <option value="Leave">On Leave</option>
          </select>
        </div>
        <div style={{ marginTop: '1.25rem' }}>
          <button className="btn btn-secondary" >📤 Export CSV</button>
        </div>
      </div>

      
      <div className="card">
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Employee Code</th>
                <th>Employee Name</th>
                <th>Designation Role</th>
                <th>Shift Model</th>
                <th>Date of Joining</th>
                <th>Biometric Status</th>
                <th>Attendance Status</th>
                <th>Alerts / Warnings</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              
            </tbody>
          </table>
        </div>
      </div>
    
        </AuthenticatedLayout>
    </RoleGuard>
    );
}
