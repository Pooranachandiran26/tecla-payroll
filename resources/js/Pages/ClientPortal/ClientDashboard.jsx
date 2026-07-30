import React from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';
import RoleGuard from '../../Components/RoleGuard.jsx';
import { Building2, Users, FileText, CheckSquare, Clock, ArrowRight, ShieldCheck } from 'lucide-react';

export default function ClientDashboard({ client, metrics = {}, recentEmployees = [], recentInvoices = [] }) {
  const safeClient = client || {};
  const activeHeadcount = metrics.totalActiveEmployees || 0;
  const pendingAttendance = metrics.pendingAttendanceCount || 0;
  const outstandingAmount = metrics.totalOutstandingAmount || 0;

  return (
    <RoleGuard allowedRoles={['admin', 'manager', 'client']}>
      <AuthenticatedLayout>
        <Head title={safeClient.company_name ? `${safeClient.company_name} — Client Portal` : "Client Dashboard"} />
        
        <div style={{ marginBottom: '1.5rem' }}>
          <div className="flex-row-between" style={{ marginTop: '0.5rem' }}>
            <div>
              <h2 id="dashboard-welcome-title" style={{ fontSize: '1.5rem', fontWeight: '700', color: '#1E293B' }}>
                {safeClient.company_name ? `${safeClient.company_name} — Executive Portal` : 'Client Portal Dashboard'}
              </h2>
              <p id="dashboard-welcome-desc" style={{ color: '#64748B', fontSize: '0.9rem', marginTop: '2px' }}>
                Overview of active deployed employees, attendance verification, and billing invoices.
              </p>
            </div>

            {safeClient.client_code && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <div style={{ fontSize: '0.85rem', backgroundColor: '#FFFFFF', padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid #CBD5E1', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Building2 size={16} color="#1E40AF" />
                  <span>Client Code:</span>
                  <span style={{ fontWeight: '700', color: '#1E40AF', fontFamily: 'monospace' }}>{safeClient.client_code}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Dynamic Metric Cards Grid */}
        <div className="grid-cols-3" style={{ marginBottom: '1.5rem' }} id="dashboard-metrics-grid">
          <div className="card metric-card" id="metric-headcount" style={{ padding: '1.25rem', borderRadius: '10px', backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0' }}>
            <span className="metric-label" style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748B' }}>Active Deployed Workforce</span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '4px' }}>
              <span className="metric-value" style={{ fontSize: '1.8rem', fontWeight: 800, color: '#0F172A' }}>{activeHeadcount}</span>
              <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#059669', backgroundColor: '#ECFDF5', padding: '2px 8px', borderRadius: '12px' }}>Active Staff</span>
            </div>
          </div>

          <div className="card metric-card" id="metric-timesheets" style={{ padding: '1.25rem', borderRadius: '10px', backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0' }}>
            <span className="metric-label" style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748B' }}>Pending Attendance Logs</span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '4px' }}>
              <span className="metric-value" style={{ fontSize: '1.8rem', fontWeight: 800, color: pendingAttendance > 0 ? '#D97706' : '#0F172A' }}>{pendingAttendance}</span>
              <span style={{ fontSize: '0.78rem', fontWeight: 600, color: pendingAttendance > 0 ? '#D97706' : '#64748B', backgroundColor: pendingAttendance > 0 ? '#FEF3C7' : '#F1F5F9', padding: '2px 8px', borderRadius: '12px' }}>
                {pendingAttendance > 0 ? 'Verification Needed' : 'Up to Date'}
              </span>
            </div>
          </div>

          <div className="card metric-card" id="metric-invoices" style={{ padding: '1.25rem', borderRadius: '10px', backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0' }}>
            <span className="metric-label" style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748B' }}>Outstanding Invoices</span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '4px' }}>
              <span className="metric-value" style={{ fontSize: '1.8rem', fontWeight: 800, color: outstandingAmount > 0 ? '#DC2626' : '#059669' }}>
                ₹{outstandingAmount.toLocaleString('en-IN')}
              </span>
              <span style={{ fontSize: '0.78rem', fontWeight: 600, color: outstandingAmount > 0 ? '#DC2626' : '#059669', backgroundColor: outstandingAmount > 0 ? '#FEE2E2' : '#ECFDF5', padding: '2px 8px', borderRadius: '12px' }}>
                {outstandingAmount > 0 ? 'Payment Due' : 'Paid in Full'}
              </span>
            </div>
          </div>
        </div>

        <div className="grid-layout" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

            {/* Action Required Banner if Pending Attendance */}
            {pendingAttendance > 0 && (
              <div className="card" style={{ padding: '1.25rem', backgroundColor: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '10px' }}>
                <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <Clock size={18} color="#D97706" />
                  <h3 className="card-title" style={{ color: '#92400E', fontSize: '0.95rem', fontWeight: 700, margin: 0 }}>Action Required: Attendance Logs Verification</h3>
                </div>
                <p style={{ fontSize: '0.85rem', color: '#B45309', margin: '0 0 10px 0' }}>
                  You have {pendingAttendance} daily biometric attendance log entries awaiting verification.
                </p>
                <div>
                  <Link href={route('client.attendance')} className="btn btn-warning btn-xs" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                    Review & Verify Logs →
                  </Link>
                </div>
              </div>
            )}

            {/* Deployed Employees Table Card */}
            <div className="card" style={{ backgroundColor: '#FFFFFF', borderRadius: '10px', border: '1px solid #E2E8F0', padding: '1.25rem' }}>
              <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 className="card-title" style={{ fontSize: '1rem', fontWeight: 700, color: '#0F172A', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Users size={18} color="#1E40AF" /> Deployed Personnel ({activeHeadcount})
                </h3>
                <Link href={route('client.employees')} className="btn btn-secondary btn-xs" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  View All Personnel →
                </Link>
              </div>

              <div className="table-responsive">
                <table className="data-table" style={{ width: '100%' }}>
                  <thead>
                    <tr>
                      <th>Emp Code</th>
                      <th>Employee Name</th>
                      <th>Designation</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentEmployees && recentEmployees.length > 0 ? (
                      recentEmployees.map(emp => (
                        <tr key={emp.id}>
                          <td style={{ fontFamily: 'monospace', fontWeight: 600, fontSize: '0.8rem' }}>{emp.employee_code}</td>
                          <td style={{ fontWeight: 600, color: '#1E293B' }}>{emp.full_name || `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || '—'}</td>
                          <td style={{ fontSize: '0.85rem', color: '#475569' }}>{emp.designation || 'Staff'}</td>
                          <td>
                            <span className={`badge badge-${emp.status === 'active' ? 'success' : 'secondary'}`}>
                              {emp.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} style={{ textAlign: 'center', padding: '1.5rem', color: '#64748B', fontSize: '0.85rem' }}>
                          No active employees currently registered under {safeClient.company_name || 'this account'}.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

            {/* Invoices Summary Card */}
            <div className="card" style={{ backgroundColor: '#FFFFFF', borderRadius: '10px', border: '1px solid #E2E8F0', padding: '1.25rem' }}>
              <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 className="card-title" style={{ fontSize: '1rem', fontWeight: 700, color: '#0F172A', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <FileText size={18} color="#1E40AF" /> Corporate Invoices
                </h3>
                <Link href={route('client.invoices')} className="btn btn-secondary btn-xs">
                  All Invoices
                </Link>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {recentInvoices && recentInvoices.length > 0 ? (
                  recentInvoices.map(inv => (
                    <div key={inv.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.65rem 0.85rem', backgroundColor: '#F8FAFC', borderRadius: '6px', border: '1px solid #F1F5F9' }}>
                      <div>
                        <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1E293B' }}>{inv.invoice_number}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748B' }}>Period: {inv.invoice_month || 'Monthly'}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0F172A' }}>₹{(parseFloat(inv.grand_total) || 0).toLocaleString('en-IN')}</div>
                        <span className={`badge badge-${inv.status === 'paid' ? 'success' : 'danger'}`} style={{ fontSize: '0.7rem' }}>
                          {inv.status}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div style={{ textAlign: 'center', padding: '1rem', color: '#64748B', fontSize: '0.82rem' }}>
                    No invoice billing records generated yet.
                  </div>
                )}
              </div>
            </div>

            {/* Support Box */}
            <div className="card" style={{ backgroundColor: '#1E3A8A', color: '#FFFFFF', borderRadius: '10px', padding: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.5rem' }}>
                <ShieldCheck size={18} color="#60A5FA" />
                <h3 className="card-title" style={{ color: '#FFFFFF', fontSize: '0.95rem', fontWeight: 700, margin: 0 }}>Client Support & Account Desk</h3>
              </div>
              <p style={{ fontSize: '0.8rem', color: '#DBEAFE', margin: '0 0 1rem 0', lineHeight: 1.5 }}>
                For contract updates, billing inquiries, or emergency staff exits, contact your designated agency manager.
              </p>
              <div style={{ fontSize: '0.82rem', backgroundColor: 'rgba(255, 255, 255, 0.1)', padding: '0.65rem 0.85rem', borderRadius: '6px', border: '1px solid rgba(255, 255, 255, 0.15)' }}>
                <div><strong>Primary Contact:</strong> Support Desk</div>
                <div><strong>Support Email:</strong> support@tecla.in</div>
              </div>
            </div>

          </div>

        </div>
      </AuthenticatedLayout>
    </RoleGuard>
  );
}
