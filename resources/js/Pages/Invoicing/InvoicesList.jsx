import React, { useState } from 'react';
import AuthenticatedLayout from '../../Layouts/AuthenticatedLayout';
import { Head, Link, usePage } from '@inertiajs/react';
import Button from '../../Components/ui/Button';
import Badge from '../../Components/ui/Badge';
import RoleGuard from '../../Components/RoleGuard.jsx';

export default function InvoicesList({ invoices }) {
    const { auth } = usePage().props;
    const role = auth?.user?.role || 'manager';

    return (
        <RoleGuard allowedRoles={['admin', 'manager']}>
            <AuthenticatedLayout>
                <Head title="Invoices List" />

                <div className="flex justify-between items-end mb-6">
                    <div>
                        <h2 className="text-2xl font-bold text-[#1F3864] mb-1">Client Invoices Registry</h2>
                        <p className="text-gray-500 text-[0.9rem]">Track billing records, outstanding balances, and agency service fees.</p>
                    </div>
                </div>

                <div className="card p-0">
                    <div className="w-full overflow-x-auto">
                        <table className="w-full text-left border-collapse text-sm">
                            <thead>
                                <tr>
                                    <th className="p-3 font-semibold text-gray-700 border-b border-gray-200">Invoice No</th>
                                    <th className="p-3 font-semibold text-gray-700 border-b border-gray-200">Client Partner</th>
                                    <th className="p-3 font-semibold text-gray-700 border-b border-gray-200">Branch Location</th>
                                    <th className="p-3 font-semibold text-gray-700 border-b border-gray-200">Total Value (CTC+Fee)</th>
                                    <th className="p-3 font-semibold text-gray-700 border-b border-gray-200">Due Date</th>
                                    {role !== 'manager' && (
                                        <th className="p-3 font-semibold text-gray-700 border-b border-gray-200">Agency Service Fee</th>
                                    )}
                                    <th className="p-3 font-semibold text-gray-700 border-b border-gray-200">Status</th>
                                    <th className="p-3 font-semibold text-gray-700 border-b border-gray-200">GST Type</th>
                                </tr>
                            </thead>
                            <tbody>
                                {invoices && invoices.length > 0 ? (
                                    invoices.map((inv) => (
                                        <tr key={inv.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                                             <td className="p-3">
                                                 <strong>{inv.invoice_number}</strong>
                                                 {inv.warning_notes && (
                                                     <div className="text-xs text-amber-600 font-medium mt-1" title={inv.warning_notes}>
                                                         ⚠️ Credit Limit Warning
                                                     </div>
                                                 )}
                                             </td>
                                             <td className="p-3">{inv.client ? inv.client.company_name : 'Unknown Client'}</td>
                                             <td className="p-3">{inv.branch ? inv.branch.branch_name : (inv.place_of_supply_state || '—')}</td>
                                             <td className="p-3 font-bold">₹{parseFloat(inv.grand_total).toLocaleString()}</td>
                                             <td className="p-3">
                                                 <div>{inv.due_date}</div>
                                                 {inv.dispute_window_expires_at && (
                                                     <div className="text-xs text-gray-400 font-medium mt-0.5">
                                                         Dispute Closes: {inv.dispute_window_expires_at}
                                                     </div>
                                                 )}
                                             </td>
                                             {role !== 'manager' && (
                                                 <td className="p-3 text-green-600 font-semibold">₹{parseFloat(inv.agency_service_fee).toLocaleString()}</td>
                                             )}
                                             <td className="p-3">
                                                 {inv.status === 'draft' && <Badge type="warning">Draft</Badge>}
                                                 {inv.status === 'raised' && <Badge type="active">Raised</Badge>}
                                                 {inv.status === 'paid' && <Badge type="success">Paid</Badge>}
                                                 {inv.status === 'overdue' && (
                                                     <div className="flex items-center">
                                                         <Badge type="danger">Overdue</Badge>
                                                         {parseFloat(inv.late_penalty_amount) > 0 && (
                                                             <span className="text-xs text-red-500 font-semibold ml-2" title="Late payment penalty accumulated">
                                                                 +₹{parseFloat(inv.late_penalty_amount).toLocaleString()} penalty
                                                             </span>
                                                         )}
                                                     </div>
                                                 )}
                                             </td>
                                            <td className="p-3 font-mono text-xs">{inv.gst_type === 'cgst_sgst' ? 'CGST + SGST (Intrastate)' : 'IGST (Interstate)'}</td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="8" style={{ textAlign: "center", padding: "3rem", color: "var(--text-muted)" }}>
                                            No billing invoices have been generated yet. Lock a payroll run to generate invoices.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </AuthenticatedLayout>
        </RoleGuard>
    );
}
