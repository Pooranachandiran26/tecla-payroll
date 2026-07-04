import React from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';

import RoleGuard from '../../Components/RoleGuard.jsx';
export default function EmployeeProfile() {
    return (
        <RoleGuard allowedRoles={['admin', 'manager', 'employee']}>
    <AuthenticatedLayout>
            <Head title="Employee Profile" />
            
      <div style={{ marginBottom: '1.5rem' }}>
        <h2>My Employee Profile</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>View your employment details, statutory information, and manage bank accounts.</p>
      </div>

      <div className="grid-layout">
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '1.5rem' }}>
              <div className="avatar" style={{ width: '80px', height: '80px', fontSize: '2rem' }}>A</div>
              <div>
                <h3 style={{ marginBottom: '0.25rem', fontSize: '1.5rem' }}>Aarav Sharma</h3>
                <span className="badge badge-success">Active Employee</span>
              </div>
            </div>
            
            <h4 style={{ marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>Employment Information</h4>
            <div className="grid-cols-2" style={{ gap: '1rem', marginBottom: '1.5rem' }}>
              <div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Employee Code</div>
                <div style={{ fontWeight: '500' }}>TEC-088</div>
              </div>
              <div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Designation</div>
                <div style={{ fontWeight: '500' }}>Senior Developer</div>
              </div>
              <div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Client Partner</div>
                <div style={{ fontWeight: '500' }}>Mahindra Corp</div>
              </div>
              <div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Date of Joining</div>
                <div style={{ fontWeight: '500' }}>15 Jan 2024</div>
              </div>
            </div>

            <h4 style={{ marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>Contact Details</h4>
            <div className="grid-cols-2" style={{ gap: '1rem' }}>
              <div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Personal Email</div>
                <div style={{ fontWeight: '500' }}>aarav.sharma89@example.com</div>
              </div>
              <div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Phone Number</div>
                <div style={{ fontWeight: '500' }}>+91 98765 43210</div>
              </div>
            </div>
          </div>
        </div>

        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Bank Details</h3>
              <button className="btn btn-secondary btn-xs" >Request Change</button>
            </div>
            <div style={{ backgroundColor: 'var(--bg-light)', padding: '1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '1.5rem' }}>🏦</span>
                <div>
                  <div style={{ fontWeight: '600', color: 'var(--primary-navy)' }}>HDFC Bank</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Salary Account</div>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Account Number:</span>
                <span style={{ fontFamily: 'monospace', fontWeight: '500' }}>●●●●●398571</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>IFSC Code:</span>
                <span style={{ fontFamily: 'monospace', fontWeight: '500' }}>HDFC0000060</span>
              </div>
            </div>
          </div>

          <div className="card">
            <h3 className="card-title" style={{ marginBottom: '1rem' }}>Statutory Profile</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border-color)' }}>
                <div>
                  <div style={{ fontWeight: '500' }}>Provident Fund (PF)</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>UAN: 100523485790</div>
                </div>
                <span className="badge badge-success">Active</span>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border-color)' }}>
                <div>
                  <div style={{ fontWeight: '500' }}>ESIC</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>IP: 3114589723</div>
                </div>
                <span className="badge badge-warning">Active Transition</span>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border-color)' }}>
                <div style={{ fontWeight: '500' }}>Professional Tax (PT)</div>
                <span className="badge badge-neutral">Deducted</span>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontWeight: '500' }}>Income Tax (TDS)</div>
                <span className="badge badge-info">New Regime</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    
        </AuthenticatedLayout>
    </RoleGuard>
    );
}
