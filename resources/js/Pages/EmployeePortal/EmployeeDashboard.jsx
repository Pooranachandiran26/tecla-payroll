import React from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';

import RoleGuard from '../../Components/RoleGuard.jsx';
export default function EmployeeDashboard() {
    return (
        <RoleGuard allowedRoles={['admin', 'executive', 'candidate']}>
    <AuthenticatedLayout>
            <Head title="Employee Dashboard" />
            
      
      <div style={{ backgroundColor: '#FFF5F5', border: '1px solid #FEB2B2', borderLeft: '4px solid var(--status-danger)', padding: '1rem 1.25rem', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontSize: '1.25rem' }}>⚠</span>
          <span style={{ fontSize: '0.9rem', color: '#7F1D1D' }}>
            <strong>Document Verification Alert:</strong> Your PAN Card upload was rejected: <em>"Image blurred and unreadable. Please re-upload a clear scanned copy."</em> Please re-upload.
          </span>
        </div>
        <button className="btn btn-danger btn-xs" >Re-upload PAN Card</button>
      </div>

      <div className="flex-row-between">
        <div>
          <h2>Employee Self-Service</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Welcome back, Aarav. Track your hours, request leave, and download payslips.</p>
        </div>
        <div>
          <span className="badge badge-success" id="candidate-punch-status">Status: Off Duty</span>
        </div>
      </div>

      
      <div className="grid-layout">
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          
          <div className="card" style={{ textAlign: 'center', padding: '2.5rem 1.5rem' }}>
            <h3 style={{ marginBottom: '0.5rem', color: 'var(--primary-navy)' }}>Daily Time Tracker</h3>
            
            <div style={{ fontSize: '3.5rem', fontWeight: '700', color: 'var(--primary-navy)', fontFamily: 'monospace', marginBottom: '0.5rem' }} id="candidate-punch-timer">
              00:00:00
            </div>
            
            <p id="candidate-punch-time-label" style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>Not punched in yet today</p>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem' }}>
              <button className="btn btn-primary" id="btn-candidate-punch" style={{ fontSize: '1.1rem', padding: '0.75rem 2rem' }}>
                Punch In
              </button>
            </div>
            <p id="candidate-punch-confirmation" style={{ color: 'var(--status-success)', fontWeight: '500', fontSize: '0.9rem', marginTop: '1rem', display: 'none' }}>Today's attendance recorded ✓</p>
            
            <div style={{ marginTop: '1.5rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              📍 Current Location IP: <strong>103.45.20.12 (Mahindra Office)</strong>
            </div>
            <div style={{ marginTop: '1rem', fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
              Your daily punch is automatically sent to the Live Attendance Monitor visible to your Agency Manager.
            </div>
          </div>

          
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">My Leave Balances</h3>
              <a href="/candidate-leave-request" className="btn btn-secondary btn-xs">Apply for Leave</a>
            </div>
            <div className="grid-cols-3" style={{ textAlign: 'center', gap: '1rem' }}>
              <div style={{ border: '1px solid var(--border-color)', padding: '0.75rem', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--primary-navy)' }}>12</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Earned Leave (EL)</div>
              </div>
              <div style={{ border: '1px solid var(--border-color)', padding: '0.75rem', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--primary-navy)' }}>6</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Casual Leave (CL)</div>
              </div>
              <div style={{ border: '1px solid var(--border-color)', padding: '0.75rem', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--primary-navy)' }}>4</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Sick Leave (SL)</div>
              </div>
            </div>
          </div>

        </div>

        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          
          <div className="card">
            <h3 className="card-title" style={{ marginBottom: '1rem' }}>Employment Profile</h3>
            <div style={{ fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Client Partner:</span>
                <span style={{ fontWeight: '600' }}>Mahindra Corp</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Employee Code:</span>
                <span style={{ fontWeight: '600' }}>TEC-088</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>PF UAN Number:</span>
                <span style={{ fontWeight: '600' }}>100523485790</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>ESI IP Number:</span>
                <span style={{ fontWeight: '600' }}>3114589723</span>
              </div>
            </div>
            <a href="/candidate-profile" className="btn btn-secondary btn-xs" style={{ width: '100%', marginTop: '1rem' }}>View Full Profile</a>
          </div>

          
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Recent Payslip</h3>
              <a href="/candidate-payslips" className="btn btn-link btn-xs">All Payslips</a>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <span style={{ fontWeight: '600', fontSize: '0.9rem' }}>May 2026 Payslip</span>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Net Paid: ₹35,800</div>
              </div>
              <a href="/payslip" className="btn btn-navy btn-xs">📥 Download PDF</a>
            </div>
          </div>

        </div>
      </div>
    
        </AuthenticatedLayout>
    </RoleGuard>
    );
}
