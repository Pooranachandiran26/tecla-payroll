import React, { useState } from 'react';
import AuthenticatedLayout from '../../Layouts/AuthenticatedLayout';
import { Head, usePage } from '@inertiajs/react';
import Button from '../../Components/ui/Button';
import Badge from '../../Components/ui/Badge';
import RoleGuard from '../../Components/RoleGuard.jsx';
import Pagination from '../../Components/ui/Pagination';
import AddInvoiceFeeModal from '../../Components/AddInvoiceFeeModal';
import { Download, Plus, Tag } from 'lucide-react';

export default function InvoicesList({ invoices }) {
    const { auth } = usePage().props;
    const role = auth?.user?.role || 'manager';
    const [selectedFeeInvoice, setSelectedFeeInvoice] = useState(null);

    const handleFeeUpdated = (updatedInvoice) => {
        // Update local invoice state
        if (invoices && invoices.data) {
            const idx = invoices.data.findIndex(i => i.id === updatedInvoice.id);
            if (idx !== -1) {
                invoices.data[idx] = updatedInvoice;
            }
        }
        setSelectedFeeInvoice(updatedInvoice);
    };

    return (
        <RoleGuard allowedRoles={['admin', 'manager']} moduleKey="payroll">
            <AuthenticatedLayout>
                <Head title="Invoices List" />

                <div className="flex justify-between items-end mb-6">
                    <div>
                        <h2 className="text-2xl font-bold text-[#1F3864] mb-1">Client Invoices Registry</h2>
                        <p className="text-gray-500 text-[0.9rem]">Track billing records, pass-through salaries, additional fees, and agency service fees.</p>
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
                                    <th className="p-3 font-semibold text-gray-700 border-b border-gray-200">Pass-Through CTC (₹)</th>
                                    <th className="p-3 font-semibold text-gray-700 border-b border-gray-200">Due Date</th>
                                    {role !== 'manager' && (
                                        <th className="p-3 font-semibold text-gray-700 border-b border-gray-200">Agency Service Fee</th>
                                    )}
                                    <th className="p-3 font-semibold text-gray-700 border-b border-gray-200">Status</th>
                                    <th className="p-3 font-semibold text-gray-700 border-b border-gray-200">GST Type</th>
                                    <th className="p-3 font-semibold text-gray-700 border-b border-gray-200 text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {invoices && invoices.data && invoices.data.length > 0 ? (
                                    invoices.data.map((inv) => {
                                        const feesList = inv.additional_fees || inv.additionalFees || [];
                                        return (
                                            <tr key={inv.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                                                 <td className="p-3">
                                                     <strong>{inv.invoice_number}</strong>
                                                     {inv.warning_notes && (
                                                         <div className="text-xs text-amber-600 font-medium mt-1" title={inv.warning_notes}>
                                                             ⚠️ Credit Limit Warning
                                                         </div>
                                                     )}
                                                     {feesList.length > 0 && (
                                                         <div className="text-xs text-blue-600 font-semibold mt-1 flex items-center gap-1">
                                                             <Tag size={12} /> {feesList.length} Addl Fee(s)
                                                         </div>
                                                     )}
                                                 </td>
                                                 <td className="p-3">{inv.client ? inv.client.company_name : 'Unknown Client'}</td>
                                                 <td className="p-3">{inv.branch ? inv.branch.branch_name : (inv.place_of_supply_state || '—')}</td>
                                                 <td className="p-3 font-bold text-slate-800">
                                                     ₹{parseFloat(inv.gross_salary_passthrough).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                 </td>
                                                 <td className="p-3">
                                                     <div>{inv.due_date}</div>
                                                     {inv.dispute_window_expires_at && (
                                                         <div className="text-xs text-gray-400 font-medium mt-0.5">
                                                             Dispute Closes: {inv.dispute_window_expires_at}
                                                         </div>
                                                     )}
                                                 </td>
                                                 {role !== 'manager' && (
                                                     <td className="p-3 text-emerald-600 font-semibold">
                                                         ₹{parseFloat(inv.agency_service_fee).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                     </td>
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
                                                 <td className="p-3 text-center">
                                                     <div className="flex items-center justify-center gap-2">
                                                         {inv.status === 'draft' && (
                                                             <button
                                                                 type="button"
                                                                 onClick={() => setSelectedFeeInvoice(inv)}
                                                                 className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors border border-slate-300"
                                                                 title="Manage Additional Fees"
                                                             >
                                                                 <Plus size={13} /> Add Fee
                                                             </button>
                                                         )}
                                                         <a
                                                             href={route('invoices.download', inv.id)}
                                                             target="_blank"
                                                             rel="noreferrer"
                                                             className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                                                             title="Download Tax Invoice PDF"
                                                         >
                                                             <Download size={13} /> PDF
                                                         </a>
                                                         {inv.status !== 'draft' && (
                                                             <button
                                                                 type="button"
                                                                 onClick={() => {
                                                                     if (confirm(`Send Tax Invoice ${inv.invoice_number} via email to client?`)) {
                                                                         import('@inertiajs/react').then(({ router }) => {
                                                                             router.post(route('invoices.send-email', inv.id), {}, { preserveScroll: true });
                                                                         });
                                                                     }
                                                                 }}
                                                                 className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
                                                                 title={inv.sent_at ? `Sent on ${new Date(inv.sent_at).toLocaleDateString()} (${inv.send_count}x)` : 'Send Tax Invoice Email'}
                                                             >
                                                                 {inv.sent_at ? 'Resend Email' : 'Send Email'}
                                                             </button>
                                                         )}
                                                     </div>
                                                     {inv.sent_at && (
                                                         <div className="text-[10px] text-emerald-700 font-medium mt-1">
                                                             ✉️ Sent {new Date(inv.sent_at).toLocaleDateString()} ({inv.send_count}x)
                                                         </div>
                                                     )}
                                                 </td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan="9" style={{ textAlign: "center", padding: "3rem", color: "var(--text-muted)" }}>
                                            No billing invoices have been generated yet. Lock a payroll run to generate invoices.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {invoices && invoices.total > 0 && (
                        <div className="px-6 py-4 border-t border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4">
                            <div className="text-sm text-gray-500">
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

                <AddInvoiceFeeModal
                    isOpen={!!selectedFeeInvoice}
                    onClose={() => setSelectedFeeInvoice(null)}
                    invoice={selectedFeeInvoice}
                    onFeeUpdated={handleFeeUpdated}
                />
            </AuthenticatedLayout>
        </RoleGuard>
    );
}
