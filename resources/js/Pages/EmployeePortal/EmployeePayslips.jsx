import React from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';

import RoleGuard from '../../Components/RoleGuard.jsx';
export default function EmployeePayslips() {
    return (
        <RoleGuard allowedRoles={['admin', 'manager', 'employee']}>
    <AuthenticatedLayout>
            <Head title="Employee Payslips" />
            
      <div style={{ marginBottom: '1.5rem' }}>
        <h2>My Salary Payslips</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>View history of payroll distributions and download detailed PDF tax receipts.</p>
      </div>

      
      <div className="card">
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Filing Month</th>
                <th>Employer Base Gross</th>
                <th>Statutory Deductions</th>
                <th>Net Disbursed Payout</th>
                <th>Disbursement Date</th>
                <th>Filing Receipt</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>May 2026</strong></td>
                <td>₹45,000.00</td>
                <td>₹9,200.00</td>
                <td style={{ fontWeight: '600', color: 'var(--primary-navy)' }}>₹35,800.00</td>
                <td>June 05, 2026</td>
                <td><span className="badge badge-success">✓ Disbursed</span></td>
                <td>
                  <a href="/payslip?id=may" className="btn btn-navy btn-xs">📥 Download PDF Receipt</a>
                </td>
              </tr>
              <tr>
                <td><strong>April 2026</strong></td>
                <td>₹45,000.00</td>
                <td>₹9,200.00</td>
                <td style={{ fontWeight: '600', color: 'var(--primary-navy)' }}>₹35,800.00</td>
                <td>May 05, 2026</td>
                <td><span className="badge badge-success">✓ Disbursed</span></td>
                <td>
                  <a href="/payslip?id=april" className="btn btn-navy btn-xs">📥 Download PDF Receipt</a>
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
