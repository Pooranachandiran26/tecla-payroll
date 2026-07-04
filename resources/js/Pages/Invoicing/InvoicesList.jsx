import React, { useState, useEffect } from 'react';
import AuthenticatedLayout from '../../Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';
import Button from '../../Components/ui/Button';
import Badge from '../../Components/ui/Badge';

import RoleGuard from '../../Components/RoleGuard.jsx';
export default function InvoicesList() {
  const [role, setRole] = useState('admin');

  useEffect(() => {
    const savedRole = localStorage.getItem('payroll_role') || 'admin';
    setRole(savedRole);
  }, []);

  const invoices = [
    {
      id: 1,
      no: 'INV-2026-004',
      client: 'Mahindra Corp',
      value: '₹38,29,044',
      date: 'June 15, 2026',
      margin: '₹2,95,800 (8.5%)',
      status: 'awaiting'
    },
    {
      id: 2,
      no: 'INV-2026-003',
      client: 'Mahindra Corp',
      value: '₹39,50,000',
      date: 'May 15, 2026',
      margin: '₹30,950 (8.5%)',
      status: 'paid'
    },
    {
      id: 3,
      no: 'INV-2026-002',
      client: 'Tata Consultancy Services',
      value: '₹1,03,50,000',
      date: 'June 20, 2026',
      margin: '₹1,35,000 (Fixed Fee)',
      status: 'overdue'
    }
  ];

  return (
    <RoleGuard allowedRoles={['admin', 'manager']}>
    <AuthenticatedLayout>
      <Head title="Invoices List" />

      <div className="flex justify-between items-end mb-6">
        <div>
          <h2 className="text-2xl font-bold text-[#1F3864] mb-1">Client Invoices Registry</h2>
          <p className="text-gray-500 text-[0.9rem]">Track billing records, outstanding balances, and agency margins.</p>
        </div>
        <Link href="/invoices/generate">
          <Button variant="primary">➕ Create New Invoice</Button>
        </Link>
      </div>

      <div className="card p-0">
        <div className="w-full overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr>
                <th className="p-3 font-semibold text-gray-700 border-b border-gray-200">Invoice No</th>
                <th className="p-3 font-semibold text-gray-700 border-b border-gray-200">Client Partner</th>
                <th className="p-3 font-semibold text-gray-700 border-b border-gray-200">Total Value (CTC+Fee)</th>
                <th className="p-3 font-semibold text-gray-700 border-b border-gray-200">Due Date</th>
                {role !== 'manager' && (
                  <th className="p-3 font-semibold text-gray-700 border-b border-gray-200">Agency Margin (Profit)</th>
                )}
                <th className="p-3 font-semibold text-gray-700 border-b border-gray-200">Status</th>
                <th className="p-3 font-semibold text-gray-700 border-b border-gray-200">Actions</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="p-3"><strong>{inv.no}</strong></td>
                  <td className="p-3">{inv.client}</td>
                  <td className="p-3 font-bold">{inv.value}</td>
                  <td className="p-3">{inv.date}</td>
                  {role !== 'manager' && (
                    <td className="p-3 text-green-600 font-semibold">{inv.margin}</td>
                  )}
                  <td className="p-3">
                    {inv.status === 'awaiting' && <Badge type="warning">Awaiting Pay</Badge>}
                    {inv.status === 'paid' && <Badge type="success">Paid</Badge>}
                    {inv.status === 'overdue' && <Badge type="danger">Overdue</Badge>}
                  </td>
                  <td className="p-3">
                    <div className="flex gap-2">
                      <Button size="xs" variant="secondary" onClick={() => alert('Downloading PDF...')}>Download PDF</Button>
                      {inv.status === 'awaiting' && (
                        <Button size="xs" variant="navy" onClick={() => alert('Payment receipt record updated.')}>Mark Paid</Button>
                      )}
                      {inv.status === 'overdue' && (
                        <Button size="xs" variant="navy" onClick={() => alert('Payment reminder nudge email sent.')}>Remind</Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Pagination Container */}
        <div className="flex justify-between items-center p-4 border-t border-gray-200 bg-gray-50 text-[0.85rem] rounded-b-lg">
          <div>
            Showing <strong>1</strong> to <strong>3</strong> of <strong>18</strong> invoices
          </div>
          <div className="flex bg-white border border-gray-200 rounded-md overflow-hidden">
            <button className="px-3 py-1.5 border-r border-gray-200 text-gray-400 bg-gray-50 cursor-not-allowed" disabled>Prev</button>
            <button className="px-3 py-1.5 border-r border-gray-200 bg-[#1F3864] text-white font-medium">1</button>
            <button className="px-3 py-1.5 border-r border-gray-200 text-[#1F3864] hover:bg-gray-50" onClick={() => alert('Loading page 2...')}>2</button>
            <button className="px-3 py-1.5 border-r border-gray-200 text-[#1F3864] hover:bg-gray-50" onClick={() => alert('Loading page 3...')}>3</button>
            <button className="px-3 py-1.5 text-[#1F3864] hover:bg-gray-50" onClick={() => alert('Loading next page...')}>Next</button>
          </div>
        </div>
      </div>
      
    </AuthenticatedLayout>
    </RoleGuard>
  );
}
