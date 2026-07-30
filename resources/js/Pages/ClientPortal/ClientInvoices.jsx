import React from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';
import RoleGuard from '../../Components/RoleGuard.jsx';
import Pagination from '../../Components/ui/Pagination';
import { Download, Building2 } from 'lucide-react';

export default function ClientInvoices({ client = {}, invoices = {} }) {
  const safeInvoices = invoices.data || [];
  const safeClient = client || {};

  return (
    <RoleGuard allowedRoles={['admin', 'manager', 'client']}>
      <AuthenticatedLayout>
        <Head title={safeClient.company_name ? `${safeClient.company_name} — Invoices` : "Billing Invoices"} />

        <div style={{ marginBottom: '1.5rem' }}>
          <div className="flex-row-between" style={{ marginTop: '0.5rem' }}>
            <div>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#1E293B', margin: 0 }}>
                Corporate Billing Invoices
              </h2>
              <p style={{ color: '#64748B', fontSize: '0.88rem', marginTop: '3px' }}>
                Review generated payroll billing invoices and download official PDF tax invoices for <strong>{safeClient.company_name || 'your company'}</strong>.
              </p>
            </div>

            {safeClient.client_code && (
              <div style={{ fontSize: '0.85rem', backgroundColor: '#FFFFFF', padding: '0.45rem 0.9rem', borderRadius: '6px', border: '1px solid #CBD5E1', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Building2 size={16} color="#1E40AF" />
                <span>Code:</span>
                <span style={{ fontWeight: '700', color: '#1E40AF', fontFamily: 'monospace' }}>{safeClient.client_code}</span>
              </div>
            )}
          </div>
        </div>

        {/* Invoices Table Card */}
        <div className="card" style={{ backgroundColor: '#FFFFFF', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
          <div className="table-responsive">
            <table className="data-table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>Invoice Number</th>
                  <th>Billing Period</th>
                  <th>Total Invoice Value</th>
                  <th>Status</th>
                  <th>Due Date</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {safeInvoices && safeInvoices.length > 0 ? (
                  safeInvoices.map((inv) => (
                    <tr key={inv.id}>
                      <td style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.88rem', color: '#1E40AF' }}>
                        {inv.invoice_number}
                      </td>
                      <td style={{ fontSize: '0.85rem', color: '#475569' }}>
                        {inv.invoice_month || 'Monthly Payroll'}
                      </td>
                      <td style={{ fontWeight: 700, color: '#0F172A', fontSize: '0.9rem' }}>
                        ₹{(parseFloat(inv.grand_total) || 0).toLocaleString('en-IN')}
                      </td>
                      <td>
                        <span className={`badge badge-${inv.status === 'paid' ? 'success' : (inv.status === 'overdue' ? 'danger' : 'warning')}`}>
                          {inv.status}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.82rem', color: '#475569' }}>
                        {inv.due_date ? new Date(inv.due_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <a
                          href={route('invoices.download', inv.id)}
                          target="_blank"
                          rel="noreferrer"
                          className="btn btn-navy btn-xs"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                        >
                          <Download size={12} /> PDF Download
                        </a>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '2.5rem', color: '#64748B', fontSize: '0.88rem' }}>
                      No billing invoice records generated yet for {safeClient.company_name || 'your company'}.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {invoices && invoices.total > 0 && (
            <div style={{ padding: '1rem 1.25rem', borderTop: '1px solid #F1F5F9', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ fontSize: '0.82rem', color: '#64748B' }}>
                Showing <strong>{invoices.from || 0}</strong> to <strong>{invoices.to || 0}</strong> of <strong>{invoices.total}</strong> invoices
              </div>
              <Pagination
                currentPage={invoices.current_page}
                totalPages={invoices.last_page}
                totalItems={invoices.total}
                itemsPerPage={invoices.per_page}
                onPageChange={(page) => {
                  const params = new URLSearchParams(window.location.search);
                  params.set('page', page);
                  window.location.search = params.toString();
                }}
              />
            </div>
          )}
        </div>
      </AuthenticatedLayout>
    </RoleGuard>
  );
}
