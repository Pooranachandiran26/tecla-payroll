import React, { useState } from 'react';
import AuthenticatedLayout from '../../Layouts/AuthenticatedLayout';
import { Head, Link, useForm, router, usePage } from '@inertiajs/react';
import RoleGuard from '../../Components/RoleGuard.jsx';
import Modal from '../../Components/ui/Modal';
import Button from '../../Components/ui/Button';
import Badge from '../../Components/ui/Badge';
import useToast from '../../Hooks/useToast.jsx';
import { 
    TrendingUp, 
    Clock, 
    CheckCircle2, 
    XCircle, 
    Filter, 
    RotateCcw, 
    Building2, 
    Eye, 
    Check, 
    X,
    Search,
    IndianRupee,
    ArrowUpRight
} from 'lucide-react';

export default function SalaryRevisionsQueue({ 
    revisions = { data: [], links: [] }, 
    stats = { total: 0, pending: 0, approved: 0, rejected: 0 }, 
    clients = [], 
    filters = {} 
}) {
    const { showToast } = useToast();
    const { auth } = usePage().props;
    const [search, setSearch] = useState(filters.search || '');
    const [clientId, setClientId] = useState(filters.client_id || '');
    const [statusFilter, setStatusFilter] = useState(filters.status || 'pending_approval');

    const [selectedRevision, setSelectedRevision] = useState(null);
    const [actionType, setActionType] = useState(null); // 'approve' | 'reject'
    const [rejectionReason, setRejectionReason] = useState('');

    const { post, processing } = useForm();

    const applyFilters = () => {
        router.get(
            route('employees.salary-revisions-queue'),
            {
                search,
                client_id: clientId,
                status: statusFilter,
            },
            { preserveState: true, preserveScroll: true }
        );
    };

    const resetFilters = () => {
        setSearch('');
        setClientId('');
        setStatusFilter('pending_approval');
        router.get(route('employees.salary-revisions-queue'), {}, { preserveState: true, preserveScroll: true });
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            applyFilters();
        }
    };

    const handleActionSubmit = (e) => {
        e.preventDefault();
        if (!selectedRevision || !actionType) return;

        router.post(
            route('employees.salary-revision.approve', [selectedRevision.employee_id, selectedRevision.id]),
            {
                action: actionType,
                rejection_reason: actionType === 'reject' ? rejectionReason : '',
            },
            {
                onSuccess: () => {
                    setSelectedRevision(null);
                    setActionType(null);
                    setRejectionReason('');
                    showToast({
                        type: actionType === 'approve' ? 'success' : 'info',
                        message: actionType === 'approve' ? 'Salary revision approved successfully!' : 'Salary revision rejected.'
                    });
                },
                onError: (errs) => {
                    showToast({ type: 'error', message: errs.action || 'Failed to process revision action.' });
                }
            }
        );
    };

    const formatCurrency = (val) => {
        if (val === null || val === undefined) return '₹0';
        return '₹' + Math.round(parseFloat(val)).toLocaleString('en-IN');
    };

    return (
        <RoleGuard allowedRoles={['admin', 'manager']}>
            <AuthenticatedLayout>
                <Head title="Salary Revisions Queue" />
                <div className="legacy-react-wrapper">
                    
                    {/* Top Header */}
                    <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '1rem' }}>
                        <div>
                            <Link href={route('employees.index')} style={{ fontSize: '0.82rem', fontWeight: 600, color: '#64748B', display: 'inline-flex', alignItems: 'center', gap: '4px', marginBottom: '0.35rem' }}>
                                &larr; Back to Employees Directory
                            </Link>
                            <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--primary-navy, #1F3864)', margin: 0 }}>
                                Salary Revisions Queue
                            </h2>
                            <p style={{ color: '#64748B', fontSize: '0.88rem', marginTop: '0.2rem', margin: 0 }}>
                                Review, audit, and approve proposed CTC and salary structure revisions across client organizations.
                            </p>
                        </div>
                    </div>

                    {/* Stats Metric Cards */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                        <div className="card" style={{ padding: '1.1rem 1.25rem', borderLeft: '4px solid #3B82F6' }}>
                            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Total Requests
                            </div>
                            <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#0F172A', marginTop: '0.35rem' }}>
                                {stats.total}
                            </div>
                        </div>

                        <div className="card" style={{ padding: '1.1rem 1.25rem', borderLeft: '4px solid #D97706' }}>
                            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#D97706', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <Clock size={14} /> Pending Approval
                            </div>
                            <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#B45309', marginTop: '0.35rem' }}>
                                {stats.pending}
                            </div>
                        </div>

                        <div className="card" style={{ padding: '1.1rem 1.25rem', borderLeft: '4px solid #059669' }}>
                            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#059669', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <CheckCircle2 size={14} /> Approved Revisions
                            </div>
                            <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#047857', marginTop: '0.35rem' }}>
                                {stats.approved}
                            </div>
                        </div>

                        <div className="card" style={{ padding: '1.1rem 1.25rem', borderLeft: '4px solid #DC2626' }}>
                            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#DC2626', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <XCircle size={14} /> Rejected Revisions
                            </div>
                            <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#B91C1C', marginTop: '0.35rem' }}>
                                {stats.rejected}
                            </div>
                        </div>
                    </div>

                    {/* Filter Card */}
                    <div className="card" style={{ padding: '1rem 1.25rem', marginBottom: '1.5rem' }}>
                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                            <div style={{ flex: 1, minWidth: '220px' }}>
                                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#475569', marginBottom: '0.25rem', textTransform: 'uppercase' }}>
                                    Search Employee
                                </label>
                                <input
                                    type="text"
                                    className="form-control"
                                    placeholder="Search by name or code..."
                                    style={{ padding: '0.42rem 0.75rem', fontSize: '0.85rem' }}
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    onKeyPress={handleKeyPress}
                                />
                            </div>

                            <div style={{ minWidth: '200px' }}>
                                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#475569', marginBottom: '0.25rem', textTransform: 'uppercase' }}>
                                    Client Filter
                                </label>
                                <select
                                    className="form-control"
                                    style={{ padding: '0.42rem 0.75rem', fontSize: '0.85rem' }}
                                    value={clientId}
                                    onChange={(e) => setClientId(e.target.value)}
                                >
                                    <option value="">All Clients</option>
                                    {clients.map((c) => (
                                        <option key={c.id} value={c.id}>
                                            {c.company_name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div style={{ minWidth: '180px' }}>
                                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#475569', marginBottom: '0.25rem', textTransform: 'uppercase' }}>
                                    Status
                                </label>
                                <select
                                    className="form-control"
                                    style={{ padding: '0.42rem 0.75rem', fontSize: '0.85rem' }}
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                >
                                    <option value="pending_approval">Pending Approval</option>
                                    <option value="approved">Approved</option>
                                    <option value="rejected">Rejected</option>
                                    <option value="all">All Statuses</option>
                                </select>
                            </div>

                            <div style={{ display: 'flex', gap: '0.5rem', alignSelf: 'flex-end' }}>
                                <button
                                    type="button"
                                    className="btn btn-navy"
                                    style={{ padding: '0.42rem 1rem', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                                    onClick={applyFilters}
                                >
                                    <Filter size={14} /> Filter
                                </button>

                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    style={{ padding: '0.42rem 0.85rem', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                                    onClick={resetFilters}
                                >
                                    <RotateCcw size={14} /> Reset
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Table Card */}
                    <div className="card">
                        <div className="table-responsive">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Employee Code & Name</th>
                                        <th>Client Organization</th>
                                        <th>Old Gross / CTC</th>
                                        <th>New Gross / CTC</th>
                                        <th>Increase Delta</th>
                                        <th>Effective Date</th>
                                        <th>Status</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {revisions.data && revisions.data.length > 0 ? (
                                        revisions.data.map((rev) => {
                                            const oldCtc = parseFloat(rev.old_gross_pay || rev.old_basic_pay || 0);
                                            const newCtc = parseFloat(rev.new_gross_pay || rev.new_basic_pay || 0);
                                            const delta = newCtc - oldCtc;

                                            return (
                                                <tr key={rev.id}>
                                                    <td>
                                                        <Link 
                                                            href={route('employees.show', rev.employee_id)}
                                                            style={{ fontWeight: 700, color: 'var(--primary-navy, #1F3864)', display: 'block' }}
                                                        >
                                                            {rev.employee?.full_name || `Employee #${rev.employee_id}`}
                                                        </Link>
                                                        <span style={{ fontSize: '0.78rem', color: '#64748B' }}>
                                                            {rev.employee?.employee_code}
                                                        </span>
                                                    </td>

                                                    <td>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600, color: '#334155', fontSize: '0.85rem' }}>
                                                            <Building2 size={13} style={{ color: '#64748B' }} />
                                                            {rev.employee?.client?.company_name || '—'}
                                                        </div>
                                                    </td>

                                                    <td style={{ fontWeight: 600, color: '#64748B' }}>
                                                        {formatCurrency(rev.old_gross_pay || rev.old_basic_pay)}
                                                    </td>

                                                    <td style={{ fontWeight: 700, color: '#0F172A' }}>
                                                        {formatCurrency(rev.new_gross_pay || rev.new_basic_pay)}
                                                    </td>

                                                    <td>
                                                        {delta > 0 ? (
                                                            <span style={{ color: '#059669', fontWeight: 700, fontSize: '0.82rem', display: 'inline-flex', alignItems: 'center', gap: '2px', backgroundColor: '#ECFDF5', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                                                                <ArrowUpRight size={13} /> +{formatCurrency(delta)}
                                                            </span>
                                                        ) : (
                                                            <span style={{ color: '#64748B', fontSize: '0.82rem' }}>—</span>
                                                        )}
                                                    </td>

                                                    <td style={{ fontSize: '0.82rem', color: '#475569', fontWeight: 600 }}>
                                                        {rev.effective_date ? new Date(rev.effective_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                                                    </td>

                                                    <td>
                                                        <span className={`badge badge-${rev.status === 'approved' ? 'success' : (rev.status === 'rejected' ? 'danger' : 'warning')}`} style={{ whiteSpace: 'nowrap' }}>
                                                            {rev.status === 'pending_approval' ? 'Pending Approval' : (rev.status === 'approved' ? 'Approved' : 'Rejected')}
                                                        </span>
                                                    </td>

                                                    <td style={{ whiteSpace: 'nowrap' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                                            <Link
                                                                href={route('employees.salary-revision.create', rev.employee_id)}
                                                                className="btn btn-secondary btn-xs"
                                                                style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                                                            >
                                                                <Eye size={12} /> View Details
                                                            </Link>

                                                            {rev.status === 'pending_approval' && auth?.user?.role === 'admin' && (
                                                                <>
                                                                    <button
                                                                        type="button"
                                                                        className="btn btn-success btn-xs"
                                                                        onClick={() => {
                                                                            setSelectedRevision(rev);
                                                                            setActionType('approve');
                                                                        }}
                                                                        style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', backgroundColor: '#059669', color: '#ffffff' }}
                                                                    >
                                                                        <Check size={12} /> Approve
                                                                    </button>

                                                                    <button
                                                                        type="button"
                                                                        className="btn btn-danger btn-xs"
                                                                        onClick={() => {
                                                                            setSelectedRevision(rev);
                                                                            setActionType('reject');
                                                                            setRejectionReason('');
                                                                        }}
                                                                        style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                                                                    >
                                                                        <X size={12} /> Reject
                                                                    </button>
                                                                </>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    ) : (
                                        <tr>
                                            <td colSpan="8" style={{ textAlign: 'center', padding: '2.5rem', color: '#64748B' }}>
                                                No salary revision records found matching the search and client filters.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination Container */}
                        <div className="pagination-container">
                            <div className="pagination-info">
                                Showing <strong>{revisions.from || 0}</strong> to <strong>{revisions.to || 0}</strong> of <strong>{revisions.total || 0}</strong> revision requests
                            </div>
                            <ul className="pagination">
                                {revisions.links?.map((link, idx) => (
                                    <li key={idx} className={`page-item ${link.active ? 'active' : ''} ${!link.url ? 'disabled' : ''}`}>
                                        <Link 
                                            className="page-link" 
                                            href={link.url || '#'} 
                                            dangerouslySetInnerHTML={{ __html: link.label }}
                                        />
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>

                    {/* Action Confirmation Modal */}
                    <Modal 
                        isOpen={!!selectedRevision} 
                        onClose={() => setSelectedRevision(null)}
                        title={actionType === 'approve' ? 'Approve Salary Revision' : 'Reject Salary Revision'}
                    >
                        {selectedRevision && (
                            <form onSubmit={handleActionSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <div style={{ backgroundColor: '#F8FAFC', padding: '0.85rem', borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '0.85rem' }}>
                                    <div><strong>Employee:</strong> {selectedRevision.employee?.full_name} ({selectedRevision.employee?.employee_code})</div>
                                    <div><strong>Client:</strong> {selectedRevision.employee?.client?.company_name || '—'}</div>
                                    <div style={{ marginTop: '0.35rem', color: '#059669', fontWeight: 700 }}>
                                        New Basic: {formatCurrency(selectedRevision.new_basic_pay)} | Effective: {selectedRevision.effective_date}
                                    </div>
                                </div>

                                {actionType === 'reject' && (
                                    <div>
                                        <label style={{ fontSize: '0.82rem', fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>
                                            Rejection Reason *
                                        </label>
                                        <textarea
                                            className="form-control"
                                            rows="3"
                                            value={rejectionReason}
                                            onChange={(e) => setRejectionReason(e.target.value)}
                                            placeholder="Explain why this revision is being rejected..."
                                            required
                                        />
                                    </div>
                                )}

                                {actionType === 'approve' && (
                                    <p style={{ fontSize: '0.88rem', color: '#475569', margin: 0 }}>
                                        Are you sure you want to approve this salary revision? The employee structure will be updated immediately and notification email dispatched.
                                    </p>
                                )}

                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                                    <button 
                                        type="button" 
                                        className="btn btn-secondary" 
                                        onClick={() => setSelectedRevision(null)}
                                    >
                                        Cancel
                                    </button>

                                    <button 
                                        type="submit" 
                                        className={`btn ${actionType === 'approve' ? 'btn-success' : 'btn-danger'}`}
                                        disabled={processing}
                                    >
                                        {actionType === 'approve' ? 'Confirm Approval' : 'Confirm Rejection'}
                                    </button>
                                </div>
                            </form>
                        )}
                    </Modal>

                </div>
            </AuthenticatedLayout>
        </RoleGuard>
    );
}
