import React from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';

import RoleGuard from '../../Components/RoleGuard.jsx';
export default function ClientDashboard() {
    return (
        <RoleGuard allowedRoles={['admin', 'manager', 'client']}>
    <AuthenticatedLayout>
            <Head title="Client Dashboard" />
            
      <div style={{ marginBottom: '1.5rem' }}>
        <Link href={route('clients.index')} style={{ fontSize: '0.85rem', fontWeight: '600' }}>← Back to Clients Directory</Link>

        <div className="flex-row-between" style={{ marginTop: '1rem' }}>
          <div>
            <h2 id="dashboard-welcome-title">Client Portal Dashboard</h2>
            <p id="dashboard-welcome-desc" style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Overview of your
              deployed employees, timesheets, and invoices.</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>

            <div
              style={{ fontSize: '0.85rem', backgroundColor: 'var(--bg-card)', padding: '0.5rem 1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', fontWeight: '500' }}>
              🏢 Client Code: <span id="dashboard-client-code"
                style={{ fontWeight: '600', color: 'var(--primary-navy)' }}>MAH-012</span>
            </div>
          </div>
        </div>
      </div>

      
      <div id="dashboard-alert-container"
        style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem' }}></div>

      
      <div className="grid-cols-3" style={{ marginBottom: '1.5rem' }} id="dashboard-metrics-grid">
        <div className="card metric-card" id="metric-headcount">
          <span className="metric-label">Active Deployed Employees</span>
          <span className="metric-value" id="dashboard-active-headcount">42</span>
          <span className="metric-trend trend-up" id="dashboard-headcount-sub">▲ Active headcount</span>
        </div>

        <div className="card metric-card" id="metric-timesheets">
          <span className="metric-label">Pending Timesheet Approvals</span>
          <span className="metric-value" id="dashboard-pending-timesheets">1 Batch</span>
          <span className="metric-trend trend-down" id="dashboard-timesheets-sub">May 2026 Attendance</span>
        </div>

        <div className="card metric-card" id="metric-invoices">
          <span className="metric-label">Outstanding Invoices</span>
          <span className="metric-value" id="dashboard-outstanding-invoices">₹4,20,000</span>
          <span className="metric-trend trend-up" id="dashboard-invoices-sub">Due date: June 15, 2026</span>
        </div>
      </div>

      
      <div className="grid-layout">
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

          
          <div className="card" id="timesheet-alert-card">
            <div className="card-header">
              <h3 className="card-title" style={{ color: 'var(--status-danger)' }}>📋 Action Required</h3>
            </div>
            <p style={{ fontSize: '0.875rem', marginBottom: '1rem' }}>
              June 2026 timesheet for your 42 deployed employees is awaiting your approval. Review and approve to unblock payroll.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <Link href={route('client.attendance')} id="timesheet-review-link" className="btn btn-primary">Review & Approve →</Link>
            </div>
          </div>

          
          <div className="card" id="candidates-card">
            <div className="card-header">
              <h3 className="card-title">Recent Employees Deployed</h3>
              <Link href={route('client.employees')} id="candidates-view-all-link" className="btn btn-secondary btn-xs">View All
                Employees</Link>
            </div>
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Emp Code</th>
                    <th>Employee Name</th>
                    <th>Designation</th>
                    <th>Date of Joining</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody id="recent-candidates-tbody">
                  
                </tbody>
              </table>
            </div>
          </div>

        </div>

        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

          
          <div className="card" id="invoices-card">
            <div className="card-header">
              <h3 className="card-title">Invoices Summary</h3>
              <Link href={route('client.invoices')} id="invoices-manage-link" className="btn btn-link btn-xs">Manage
                Invoices</Link>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }} id="invoice-summary-list">
              
            </div>
          </div>

          
          <div className="card" style={{ backgroundColor: 'var(--primary-navy)', color: 'white' }}>
            <h3 className="card-title" style={{ color: 'white', marginBottom: '0.5rem' }}>Support & Escalations</h3>
            <p style={{ fontSize: '0.8rem', opacity: '0.9', marginBottom: '1rem' }}>
              For structure modifications, markup updates, or emergency exits, please contact your account manager
              directly.
            </p>
            <div style={{ fontSize: '0.85rem' }} id="support-am-info">
              <strong>Manager:</strong> Sunita Verma<br />
              <strong>Email:</strong> sunita@tecla.in
            </div>
          </div>

        </div>
      </div>
    
        </AuthenticatedLayout>
    </RoleGuard>
    );
}
