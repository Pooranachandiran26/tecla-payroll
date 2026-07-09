import React from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';

import RoleGuard from '../../Components/RoleGuard.jsx';

export default function EmployeeProfile({ employee: empProp }) {
    const employee = empProp?.data || empProp || {};
    const firstInitial = employee.full_name ? employee.full_name.charAt(0).toUpperCase() : '?';

    return (
        <RoleGuard allowedRoles={['employee']}>
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
              <div className="avatar" style={{ width: '80px', height: '80px', fontSize: '2rem' }}>{firstInitial}</div>
              <div>
                <h3 style={{ marginBottom: '0.25rem', fontSize: '1.5rem' }}>{employee.full_name || 'N/A'}</h3>
                <span className={`badge badge-${employee.status === 'active' ? 'success' : 'warning'}`}>
                  {employee.status === 'active' ? 'Active Employee' : employee.status}
                </span>
              </div>
            </div>
            
            <h4 style={{ marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>Employment Information</h4>
            <div className="grid-cols-2" style={{ gap: '1rem', marginBottom: '1.5rem' }}>
              <div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Employee Code</div>
                <div style={{ fontWeight: '500' }}>{employee.employee_code || 'N/A'}</div>
              </div>
              <div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Designation</div>
                <div style={{ fontWeight: '500' }}>{employee.designation || 'N/A'}</div>
              </div>
              <div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Client Partner</div>
                <div style={{ fontWeight: '500' }}>{employee.client_name || 'N/A'}</div>
              </div>
              <div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Date of Joining</div>
                <div style={{ fontWeight: '500' }}>{employee.date_of_joining || 'N/A'}</div>
              </div>
            </div>

            <h4 style={{ marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>Contact Details</h4>
            <div className="grid-cols-2" style={{ gap: '1rem' }}>
              <div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Personal Email</div>
                <div style={{ fontWeight: '500' }}>{employee.personal_email || 'N/A'}</div>
              </div>
              <div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Phone Number</div>
                <div style={{ fontWeight: '500' }}>{employee.phone_number || 'N/A'}</div>
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Bank Details</h3>
              <button className="btn btn-secondary btn-xs" disabled>Request Change</button>
            </div>
            <div style={{ backgroundColor: 'var(--bg-light)', padding: '1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '1.5rem' }}>🏦</span>
                <div>
                  <div style={{ fontWeight: '600', color: 'var(--primary-navy)' }}>{employee.bank_name || 'Bank Not Added'}</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Salary Account</div>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Account Number:</span>
                <span style={{ fontFamily: 'monospace', fontWeight: '500' }}>{employee.bank_account_number || 'N/A'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>IFSC Code:</span>
                <span style={{ fontFamily: 'monospace', fontWeight: '500' }}>{employee.bank_ifsc || 'N/A'}</span>
              </div>
            </div>
          </div>

          <div className="card">
            <h3 className="card-title" style={{ marginBottom: '1rem' }}>Statutory Profile</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border-color)' }}>
                <div>
                  <div style={{ fontWeight: '500' }}>Provident Fund (PF)</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    UAN: {employee.uan_number ? employee.uan_number : 'Not Available'}
                  </div>
                </div>
                <span className={`badge badge-${employee.pf_applicable ? 'success' : 'neutral'}`}>
                  {employee.pf_applicable ? 'Active' : 'Not Applicable'}
                </span>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border-color)' }}>
                <div>
                  <div style={{ fontWeight: '500' }}>ESIC</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    IP: {employee.esic_number ? employee.esic_number : 'Not Available'}
                  </div>
                </div>
                <span className={`badge badge-${employee.esi_applicable ? 'success' : 'neutral'}`}>
                  {employee.esi_applicable ? 'Active' : 'Not Applicable'}
                </span>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border-color)' }}>
                <div style={{ fontWeight: '500' }}>Professional Tax (PT)</div>
                <span className={`badge badge-${employee.pt_applicable ? 'success' : 'neutral'}`}>
                  {employee.pt_applicable ? 'Deducted' : 'Not Applicable'}
                </span>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontWeight: '500' }}>Income Tax (TDS)</div>
                <span className="badge badge-info">{employee.tds_regime === 'new' ? 'New Regime' : 'Old Regime'}</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    
        </AuthenticatedLayout>
    </RoleGuard>
    );
}
