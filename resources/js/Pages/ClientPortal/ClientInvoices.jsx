import React from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';

import RoleGuard from '../../Components/RoleGuard.jsx';
export default function ClientInvoices() {
    return (
        <RoleGuard allowedRoles={['admin', 'executive', 'client']}>
    <AuthenticatedLayout>
            <Head title="Client Invoices" />
            
      <div className="flex-row-between">
        <div>
          <h2>Billing Invoices</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Review billing history, download corporate invoices,
            and register payment transfers.</p>
        </div>
      </div>

      
      <div className="card">
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Invoice Number</th>
                <th>Target Period</th>
                <th>Total Invoice Value</th>
                <th>Payment Terms</th>
                <th>Due Date</th>
                <th>Disbursed Status</th>
                <th>Invoice Document</th>
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
