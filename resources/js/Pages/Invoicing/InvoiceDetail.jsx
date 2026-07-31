import React, { useState } from 'react';
import AuthenticatedLayout from '../../Layouts/AuthenticatedLayout';
import { Head, usePage, router, Link } from '@inertiajs/react';
import Badge from '../../Components/ui/Badge';
import RoleGuard from '../../Components/RoleGuard.jsx';
import Pagination from '../../Components/ui/Pagination';
import AddInvoiceFeeModal from '../../Components/AddInvoiceFeeModal';
import { ArrowLeft, Download, Plus, Send, Building, FileText, Calendar, DollarSign, Tag, Trash2, ShieldCheck } from 'lucide-react';
import './InvoiceDetail.css';
import { formatRupee, formatDate, getStatusBadgeType, calculateLineItemsSummary } from './InvoiceDetailLogic';

export default function InvoiceDetail({ invoice: initialInvoice, lineItems: paginatedLineItems }) {
    const { auth, flash, errors } = usePage().props;
    const role = auth?.user?.role || 'manager';
    const [invoice, setInvoice] = useState(initialInvoice);
    const [showFeeModal, setShowFeeModal] = useState(false);

    const handleFeeUpdated = (updatedInvoice) => {
        setInvoice(prev => ({
            ...prev,
            ...updatedInvoice,
            client: updatedInvoice.client || prev.client,
            branch: updatedInvoice.branch || prev.branch,
        }));
    };

    const handleDeleteFee = (feeId) => {
        if (confirm('Are you sure you want to remove this additional fee?')) {
            router.delete(route('invoices.fees.destroy', { id: invoice.id, feeId }), {
                preserveScroll: true,
                onSuccess: () => {
                    router.reload();
                }
            });
        }
    };

    const client = invoice.client || {};
    const branch = invoice.branch || {};
    const additionalFees = invoice.additional_fees || invoice.additionalFees || [];
    const gstin = invoice.branch_gstin || branch.gstin || client.decrypted_gstin || client.gstin || '—';

    // Support both paginated object and plain array
    const isPaginated = paginatedLineItems && Array.isArray(paginatedLineItems.data);
    const lineItemsList = isPaginated ? paginatedLineItems.data : (invoice.line_items || invoice.lineItems || []);
    const lineItemsTotal = isPaginated ? paginatedLineItems.total : lineItemsList.length;

    const lineSummary = calculateLineItemsSummary(lineItemsList);

    return (
        <RoleGuard allowedRoles={['admin', 'manager']} moduleKey="payroll">
            <AuthenticatedLayout>
                <Head title={`Invoice ${invoice.invoice_number}`} />

                <div className="legacy-react-wrapper invoice-detail-wrapper">
                    {/* Navigation Back Link */}
                    <div className="mb-4">
                        <Link
                            href={route('invoices.index')}
                            className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors"
                        >
                            <ArrowLeft size={16} /> Back to Client Invoices Registry
                        </Link>
                    </div>

                    {/* Header Row */}
                    <div className="invoice-detail-header">
                        <div>
                            <h2>
                                <FileText size={24} className="text-[#1F3864]" />
                                Invoice {invoice.invoice_number}
                                <Badge type={getStatusBadgeType(invoice.status)}>
                                    {invoice.status?.toUpperCase()}
                                </Badge>
                            </h2>
                            <p>
                                Issued for {client.company_name || 'Client'} ({branch.branch_name || invoice.place_of_supply_state || 'Branch'})
                            </p>
                        </div>

                        {/* Actions */}
                        <div className="invoice-detail-actions">
                            {invoice.status === 'draft' && (
                                <>
                                    <button
                                        type="button"
                                        onClick={() => setShowFeeModal(true)}
                                        className="btn btn-secondary"
                                        style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                                    >
                                        <Plus size={15} /> Add Fee
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (confirm(`Finalize Invoice ${invoice.invoice_number}? No further fees can be added once finalized.`)) {
                                                router.post(route('invoices.finalize', invoice.id));
                                            }
                                        }}
                                        className="btn"
                                        style={{ backgroundColor: '#D97706', color: '#fff', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                                    >
                                        <ShieldCheck size={15} /> Finalize Invoice
                                    </button>
                                </>
                            )}
                            <a
                                href={route('invoices.download', invoice.id)}
                                target="_blank"
                                rel="noreferrer"
                                className="btn btn-primary"
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                            >
                                <Download size={15} /> Download PDF
                            </a>
                            {invoice.status !== 'draft' && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (confirm(`Send Tax Invoice ${invoice.invoice_number} via email to client?`)) {
                                            router.post(route('invoices.send-email', invoice.id));
                                        }
                                    }}
                                    className="btn"
                                    style={{ backgroundColor: '#059669', color: '#fff', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                                >
                                    <Send size={15} /> {invoice.sent_at ? 'Resend Email' : 'Send Email'}
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Flash Notifications */}
                    {(flash?.success || flash?.message) && (
                        <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-md text-sm font-medium">
                            ✅ {flash.success || flash.message}
                        </div>
                    )}
                    {(flash?.error || errors?.error) && (
                        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-800 rounded-md text-sm font-medium">
                            ⚠️ {flash.error || errors.error}
                        </div>
                    )}

                    {/* Info Cards Grid */}
                    <div className="invoice-info-grid">
                        {/* Client & Branch Card */}
                        <div className="card">
                            <div className="invoice-card-title">
                                <Building size={16} /> Client & Billing Location
                            </div>
                            <div className="invoice-meta-list">
                                <div className="invoice-meta-row">
                                    <span className="label">Client Organization</span>
                                    <span className="value">{client.company_name || '—'}</span>
                                </div>
                                <div className="invoice-meta-row">
                                    <span className="label">Client Code</span>
                                    <span className="value">{client.client_code || '—'}</span>
                                </div>
                                <div className="invoice-meta-row">
                                    <span className="label">Branch Name</span>
                                    <span className="value">{branch.branch_name || '—'}</span>
                                </div>
                                <div className="invoice-meta-row">
                                    <span className="label">GSTIN</span>
                                    <span className="value font-mono">{gstin}</span>
                                </div>
                                <div className="invoice-meta-row">
                                    <span className="label">Place of Supply State</span>
                                    <span className="value">{invoice.place_of_supply_state || branch.state || '—'}</span>
                                </div>
                            </div>
                        </div>

                        {/* Financial Summary Card */}
                        <div className="card">
                            <div className="invoice-card-title">
                                <DollarSign size={16} /> Billing & Tax Breakdown
                            </div>
                            <div className="financial-summary-box">
                                <div className="financial-row">
                                    <span>Pass-Through Salary CTC</span>
                                    <span>{formatRupee(invoice.gross_salary_passthrough)}</span>
                                </div>
                                {role !== 'manager' && (
                                    <div className="financial-row">
                                        <span>Agency Service Fee</span>
                                        <span className="text-emerald-600 font-semibold">{formatRupee(invoice.agency_service_fee)}</span>
                                    </div>
                                )}
                                {additionalFees.length > 0 && (
                                    <div className="financial-row">
                                        <span>Additional Fees ({additionalFees.length})</span>
                                        <span className="text-blue-600 font-semibold">
                                            {formatRupee(additionalFees.reduce((acc, f) => acc + parseFloat(f.amount || 0), 0))}
                                        </span>
                                    </div>
                                )}
                                <div className="financial-row">
                                    <span>GST Type</span>
                                    <span className="font-mono text-xs">
                                        {invoice.gst_type === 'cgst_sgst' ? 'CGST (9%) + SGST (9%)' : 'IGST (18%)'}
                                    </span>
                                </div>
                                <div className="financial-row">
                                    <span>Total GST Amount</span>
                                    <span className="text-purple-700 font-semibold">{formatRupee(invoice.gst_amount)}</span>
                                </div>
                                <div className="financial-row total">
                                    <span>Grand Total Owed</span>
                                    <span>{formatRupee(invoice.grand_total)}</span>
                                </div>
                            </div>
                        </div>

                        {/* Dates & Status Meta Card */}
                        <div className="card">
                            <div className="invoice-card-title">
                                <Calendar size={16} /> Invoice Timeline & Metadata
                            </div>
                            <div className="invoice-meta-list">
                                <div className="invoice-meta-row">
                                    <span className="label">Payroll Month</span>
                                    <span className="value">{invoice.invoice_month || '—'}</span>
                                </div>
                                <div className="invoice-meta-row">
                                    <span className="label">Due Date</span>
                                    <span className="value">{formatDate(invoice.due_date)}</span>
                                </div>
                                <div className="invoice-meta-row">
                                    <span className="label">Dispute Window Closes</span>
                                    <span className="value">{formatDate(invoice.dispute_window_expires_at)}</span>
                                </div>
                                <div className="invoice-meta-row">
                                    <span className="label">Email Delivery Status</span>
                                    <span className="value">
                                        {invoice.sent_at ? `Sent on ${formatDate(invoice.sent_at)} (${invoice.send_count}x)` : 'Not Sent'}
                                    </span>
                                </div>
                                {invoice.warning_notes && (
                                    <div className="mt-2 p-2 bg-amber-50 border border-amber-200 text-amber-800 rounded text-xs">
                                        ⚠️ {invoice.warning_notes}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Employee Line Items Table (Paginated 15 per page) */}
                    <div className="card mb-6" style={{ padding: 0 }}>
                        <div className="p-4 border-b border-gray-100 flex justify-between items-center flex-wrap gap-2">
                            <h3 className="font-bold text-[#1F3864] text-base flex items-center gap-2">
                                <Tag size={16} /> Employee Pass-Through Line Items ({lineItemsTotal})
                            </h3>
                            <span className="text-sm font-semibold text-slate-600">
                                Page CTC Total: <strong>{formatRupee(lineSummary.totalLineCtc)}</strong>
                            </span>
                        </div>
                        <div className="table-responsive">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Employee Code</th>
                                        <th>Employee Name</th>
                                        <th>Gross Salary (₹)</th>
                                        <th>Employer Statutory Costs (₹)</th>
                                        <th>Total CTC Reimbursement (₹)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {lineItemsList.length > 0 ? (
                                        lineItemsList.map((item) => {
                                            const emp = item.employee || {};
                                            const gross = item.actual_gross !== undefined ? parseFloat(item.actual_gross) : parseFloat(item.gross_pay || 0);
                                            const stat = item.employer_statutory_total !== undefined ? parseFloat(item.employer_statutory_total) : (
                                                parseFloat(item.employer_pf || 0) +
                                                parseFloat(item.employer_esi || 0) +
                                                parseFloat(item.employer_lwf || 0)
                                            );
                                            const totalCtc = item.line_ctc !== undefined ? parseFloat(item.line_ctc) : (gross + stat);
                                            return (
                                                <tr key={item.id}>
                                                    <td className="font-mono text-xs">{emp.employee_code || '—'}</td>
                                                    <td style={{ fontWeight: 600, color: 'var(--primary-navy)' }}>
                                                        {emp.full_name || 'Employee'}
                                                    </td>
                                                    <td style={{ fontWeight: 500, color: '#334155' }}>{formatRupee(gross)}</td>
                                                    <td style={{ fontWeight: 600, color: '#059669' }}>{formatRupee(stat)}</td>
                                                    <td style={{ fontWeight: 700, color: 'var(--primary-navy)' }}>
                                                        {formatRupee(totalCtc)}
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    ) : (
                                        <tr>
                                            <td colSpan="5" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                                                No line items attached to this invoice.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Backend Pagination (Limit 15) */}
                        {isPaginated && paginatedLineItems.total > 0 && (
                            <div className="px-6 py-4 border-t border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4">
                                <div className="text-sm text-gray-500">
                                    Showing <strong>{paginatedLineItems.from || 0}</strong> to <strong>{paginatedLineItems.to || 0}</strong> of <strong>{paginatedLineItems.total}</strong> employee line items
                                </div>
                                {paginatedLineItems.last_page > 1 && (
                                    <Pagination
                                        currentPage={paginatedLineItems.current_page}
                                        totalPages={paginatedLineItems.last_page}
                                        totalItems={paginatedLineItems.total}
                                        itemsPerPage={paginatedLineItems.per_page}
                                        onPageChange={(page) => {
                                            router.get(route('invoices.show', invoice.id), { page }, { preserveScroll: true, preserveState: true });
                                        }}
                                    />
                                )}
                            </div>
                        )}
                    </div>

                    {/* Additional Fees Table */}
                    {additionalFees.length > 0 && (
                        <div className="card" style={{ padding: 0 }}>
                            <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                                <h3 className="font-bold text-[#1F3864] text-base flex items-center gap-2">
                                    <Plus size={16} /> Additional Fees
                                </h3>
                            </div>
                            <div className="table-responsive">
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>Description</th>
                                            <th>Fee Category</th>
                                            <th>Amount (₹)</th>
                                            {invoice.status === 'draft' && <th style={{ textAlign: 'center' }}>Actions</th>}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {additionalFees.map((fee) => (
                                            <tr key={fee.id}>
                                                <td>{fee.description}</td>
                                                <td>{fee.category || 'General Fee'}</td>
                                                <td style={{ fontWeight: 700, color: '#2563eb' }}>
                                                    {formatRupee(fee.amount)}
                                                </td>
                                                {invoice.status === 'draft' && (
                                                    <td style={{ textAlign: 'center' }}>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleDeleteFee(fee.id)}
                                                            className="text-red-600 hover:text-red-800 transition-colors p-1"
                                                            title="Delete Fee"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </td>
                                                )}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    <AddInvoiceFeeModal
                        isOpen={showFeeModal}
                        onClose={() => setShowFeeModal(false)}
                        invoice={invoice}
                        onFeeUpdated={handleFeeUpdated}
                    />
                </div>
            </AuthenticatedLayout>
        </RoleGuard>
    );
}
