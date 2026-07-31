import React, { useState, useEffect, useRef } from 'react';
import AuthenticatedLayout from '../../Layouts/AuthenticatedLayout';
import { Head, usePage, router, Link } from '@inertiajs/react';
import Badge from '../../Components/ui/Badge';
import RoleGuard from '../../Components/RoleGuard.jsx';
import Pagination from '../../Components/ui/Pagination';
import AddInvoiceFeeModal from '../../Components/AddInvoiceFeeModal';
import { Eye, Download, Plus, Tag, Filter, RotateCcw, Search, FileText } from 'lucide-react';
import './InvoicesList.css';
import { formatRupee, formatDate, getStatusBadgeType, calculateSummaryStats } from './InvoicesListLogic';

export default function InvoicesList({ invoices, filters: serverFilters = {} }) {
    const { auth, flash, errors } = usePage().props;
    const role = auth?.user?.role || 'manager';
    const [selectedFeeInvoice, setSelectedFeeInvoice] = useState(null);

    const queryParams = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
    const [filters, setFilters] = useState({
        search: serverFilters.search || queryParams.get('search') || '',
        status: serverFilters.status || queryParams.get('status') || 'all',
        gstType: queryParams.get('gstType') || 'all',
    });

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    const clearFilters = () => {
        setFilters({
            search: '',
            status: 'all',
            gstType: 'all',
        });
    };

    const handleFeeUpdated = (updatedInvoice) => {
        if (invoices && invoices.data) {
            const idx = invoices.data.findIndex(i => i.id === updatedInvoice.id);
            if (idx !== -1) {
                invoices.data[idx] = {
                    ...invoices.data[idx],
                    ...updatedInvoice,
                    client: updatedInvoice.client || invoices.data[idx].client,
                    branch: updatedInvoice.branch || invoices.data[idx].branch,
                };
            }
        }
        setSelectedFeeInvoice(updatedInvoice);
    };

    // Filter invoices locally or from server
    const rawData = invoices?.data || [];
    const filteredInvoices = rawData.filter(inv => {
        if (filters.search) {
            const term = filters.search.toLowerCase();
            const invNum = (inv.invoice_number || '').toLowerCase();
            const clientName = (inv.client?.company_name || '').toLowerCase();
            const branchName = (inv.branch?.branch_name || inv.place_of_supply_state || '').toLowerCase();
            const gstin = (inv.branch_gstin || inv.branch?.gstin || inv.client?.decrypted_gstin || inv.client?.gstin || '').toLowerCase();
            if (!invNum.includes(term) && !clientName.includes(term) && !branchName.includes(term) && !gstin.includes(term)) {
                return false;
            }
        }
        if (filters.status && filters.status !== 'all') {
            if (inv.status !== filters.status) return false;
        }
        if (filters.gstType && filters.gstType !== 'all') {
            if (inv.gst_type !== filters.gstType) return false;
        }
        return true;
    });

    const stats = calculateSummaryStats(rawData);

    return (
        <RoleGuard allowedRoles={['admin', 'manager']} moduleKey="payroll">
            <AuthenticatedLayout>
                <Head title="Client Invoices Registry" />

                <div className="legacy-react-wrapper invoices-list-wrapper">
                    {/* Header Row */}
                    <div className="invoices-header">
                        <div>
                            <h2>Client Invoices Registry</h2>
                            <p>Track billing records, pass-through salaries, additional fees, GST tax, and agency service fees.</p>
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

                    {/* Advanced Filters Row */}
                    <div className="card invoices-filters-card">
                        <div className="invoices-filters-label">
                            <Filter size={15} /> Filters:
                        </div>

                        <div style={{ flex: '1', minWidth: '220px' }}>
                            <input
                                type="text"
                                name="search"
                                className="form-control"
                                placeholder="Search by Invoice No, Client Partner, GSTIN, Branch..."
                                style={{ padding: '0.4rem 0.75rem' }}
                                value={filters.search}
                                onChange={handleFilterChange}
                            />
                        </div>

                        <div>
                            <select
                                name="status"
                                className="form-control"
                                style={{ padding: '0.4rem 0.75rem' }}
                                title="Invoice Status"
                                value={filters.status}
                                onChange={handleFilterChange}
                            >
                                <option value="all">All Statuses</option>
                                <option value="draft">Draft</option>
                                <option value="finalized">Finalized</option>
                                <option value="raised">Raised</option>
                                <option value="sent">Sent</option>
                                <option value="paid">Paid</option>
                                <option value="overdue">Overdue</option>
                            </select>
                        </div>

                        <div>
                            <select
                                name="gstType"
                                className="form-control"
                                style={{ padding: '0.4rem 0.75rem' }}
                                title="GST Type"
                                value={filters.gstType}
                                onChange={handleFilterChange}
                            >
                                <option value="all">All GST Types</option>
                                <option value="cgst_sgst">CGST + SGST (Intrastate)</option>
                                <option value="igst">IGST (Interstate)</option>
                            </select>
                        </div>

                        <button
                            className="btn btn-secondary"
                            style={{ padding: '0.4rem 1rem', border: 'none', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                            onClick={clearFilters}
                        >
                            <RotateCcw size={13} /> Clear Filters
                        </button>
                    </div>

                    {/* Summary Stats Bar */}
                    <div className="card invoices-stats-card">
                        <span>Total Invoices: {stats.totalCount}</span>
                        <span className="stat-divider">|</span>
                        <span className="stat-highlight">Drafts: {stats.draftCount}</span>
                        <span className="stat-divider">|</span>
                        <span>Pass-Through CTC: {formatRupee(stats.totalPassthrough)}</span>
                        <span className="stat-divider">|</span>
                        <span className="stat-success">Agency Fee: {formatRupee(stats.totalAgencyFee)}</span>
                        <span className="stat-divider">|</span>
                        <span>GST Collected: {formatRupee(stats.totalGst)}</span>
                        <span className="stat-divider">|</span>
                        <span>Grand Total: <strong>{formatRupee(stats.grandTotal)}</strong></span>
                    </div>

                    {/* Invoices Data Table Card (Single Screen Fit, No Horizontal Scroll) */}
                    <div className="card invoices-table-card" style={{ padding: '0' }}>
                        <div className="invoices-table-container">
                            <table className="data-table invoices-table">
                                <thead>
                                    <tr>
                                        <th>Invoice No</th>
                                        <th>Client & Branch</th>
                                        <th>Pass-Through (₹)</th>
                                        {role !== 'manager' && (
                                            <th>Agency Fee</th>
                                        )}
                                        <th>GST Amount</th>
                                        <th>Grand Total</th>
                                        <th>Due Date</th>
                                        <th>Status</th>
                                        <th className="actions-col">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredInvoices && filteredInvoices.length > 0 ? (
                                        filteredInvoices.map((inv) => {
                                            const feesList = inv.additional_fees || inv.additionalFees || [];
                                            const resolvedGstin = inv.branch_gstin || inv.branch?.gstin || inv.client?.decrypted_gstin || inv.client?.gstin || '—';
                                            const branchName = inv.branch?.branch_name || inv.place_of_supply_state || 'HQ';
                                            return (
                                                <tr key={inv.id}>
                                                    <td>
                                                        <div className="invoice-number-cell">
                                                            <span className="number">{inv.invoice_number}</span>
                                                            {inv.warning_notes && (
                                                                <div className="warning-tag" title={inv.warning_notes}>
                                                                    ⚠️ Credit Warning
                                                                </div>
                                                            )}
                                                            {feesList.length > 0 && (
                                                                <div className="fee-tag">
                                                                    <Tag size={11} /> {feesList.length} Addl Fee
                                                                </div>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <div className="client-branch-cell">
                                                            <span className="company-name">{inv.client ? inv.client.company_name : 'Unknown Client'}</span>
                                                            <span className="branch-meta">
                                                                <span>{branchName}</span>
                                                                <span>•</span>
                                                                <span className="gstin-code">{resolvedGstin}</span>
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td style={{ fontWeight: 700, color: '#334155' }}>
                                                        {formatRupee(inv.gross_salary_passthrough)}
                                                    </td>
                                                    {role !== 'manager' && (
                                                        <td style={{ fontWeight: 600, color: '#059669' }}>
                                                            {formatRupee(inv.agency_service_fee)}
                                                        </td>
                                                    )}
                                                    <td style={{ fontWeight: 600, color: '#7E22CE' }}>
                                                        {formatRupee(inv.gst_amount || 0)}
                                                    </td>
                                                    <td style={{ fontWeight: 700, color: 'var(--primary-navy)' }}>
                                                        {formatRupee(inv.grand_total || 0)}
                                                    </td>
                                                    <td>
                                                        <div className="invoice-due-cell">
                                                            <span className="due-date">{inv.due_date ? formatDate(inv.due_date) : '—'}</span>
                                                            {inv.dispute_window_expires_at && (
                                                                <span className="dispute-date">
                                                                    Dispute Closes: {formatDate(inv.dispute_window_expires_at)}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                                            <Badge type={getStatusBadgeType(inv.status)}>
                                                                {inv.status === 'draft' && 'Draft'}
                                                                {inv.status === 'finalized' && 'Finalized'}
                                                                {inv.status === 'raised' && 'Raised'}
                                                                {inv.status === 'sent' && 'Sent'}
                                                                {inv.status === 'paid' && 'Paid'}
                                                                {inv.status === 'overdue' && 'Overdue'}
                                                            </Badge>
                                                        </div>
                                                    </td>
                                                    <td className="actions-col">
                                                        <div className="invoice-actions-group">
                                                            {/* Dedicated View Page Button */}
                                                            <Link
                                                                href={route('invoices.show', inv.id)}
                                                                className="invoice-action-btn view-btn"
                                                                title="View Full Invoice Details"
                                                            >
                                                                <Eye size={13} /> View
                                                            </Link>

                                                            {/* PDF Download Button */}
                                                            <a
                                                                href={route('invoices.download', inv.id)}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                className="invoice-action-btn pdf-btn"
                                                                title="Download Tax Invoice PDF"
                                                            >
                                                                <Download size={13} /> PDF
                                                            </a>

                                                            {/* Draft Status Actions */}
                                                            {inv.status === 'draft' && (
                                                                <>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setSelectedFeeInvoice(inv)}
                                                                        className="invoice-action-btn secondary"
                                                                        title="Manage Additional Fees"
                                                                    >
                                                                        <Plus size={13} /> Fee
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                            if (confirm(`Finalize Invoice ${inv.invoice_number}? No further fees can be added once finalized.`)) {
                                                                                router.post(route('invoices.finalize', inv.id), {}, { preserveScroll: true });
                                                                            }
                                                                        }}
                                                                        className="invoice-action-btn warning"
                                                                        title="Finalize & Issue Tax Invoice"
                                                                    >
                                                                        Finalize
                                                                    </button>
                                                                </>
                                                            )}

                                                            {/* Email Action for Issued Invoices */}
                                                            {inv.status !== 'draft' && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        if (confirm(`Send Tax Invoice ${inv.invoice_number} via email to client?`)) {
                                                                            router.post(route('invoices.send-email', inv.id), {}, { preserveScroll: true });
                                                                        }
                                                                    }}
                                                                    className="invoice-action-btn success"
                                                                    title={inv.sent_at ? `Sent on ${new Date(inv.sent_at).toLocaleDateString()} (${inv.send_count}x)` : 'Send Tax Invoice Email'}
                                                                >
                                                                    {inv.sent_at ? 'Resend' : 'Send'}
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    ) : (
                                        <tr>
                                            <td colSpan="9" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                                                No billing invoices match the selected filter parameters.
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
                </div>
            </AuthenticatedLayout>
        </RoleGuard>
    );
}
