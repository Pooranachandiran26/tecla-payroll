import React, { useState, useMemo } from 'react';
import AuthenticatedLayout from '../../Layouts/AuthenticatedLayout';
import { Head, Link, router } from '@inertiajs/react';
import RoleGuard from '../../Components/RoleGuard.jsx';
import { 
    Download, 
    Search, 
    Filter, 
    RotateCcw, 
    Eye,
    Layers,
    ShieldAlert,
    Key,
    Users,
    FileText,
    Sliders,
    UserCheck,
    Cpu
} from 'lucide-react';

// ─── Category config ──────────────────────────────────────────────────────────
const CATEGORIES = [
    { id: 'all',      label: 'All Activity',   icon: Layers },
    { id: 'security', label: 'Security',       icon: ShieldAlert },
    { id: 'auth',     label: 'Authentication', icon: Key },
    { id: 'employee', label: 'Employee',       icon: Users },
    { id: 'payroll',  label: 'Payroll',        icon: FileText },
    { id: 'settings', label: 'Settings',       icon: Sliders },
    { id: 'usermgt',  label: 'User Mgt',       icon: UserCheck },
    { id: 'system',   label: 'System',         icon: Cpu },
];

const CAT_MATCHERS = {
    security: a => /login_failed|lock|breach|inactive_access|session_revoked/.test(a),
    auth:     a => /^login$|^logout$|otp|password_reset|invitation_accepted/.test(a),
    employee: a => /employee\.|employee_|auto_activated|salary_revision|document_verified|document_rejected|bank_change/.test(a),
    payroll:  a => /payroll|payslip|pf_|esi_|tds_|lop/.test(a),
    settings: a => /settings|branding|company_profile|pt_slab|lwf_slab|gst|localization|file_upload|email\.settings/.test(a),
    usermgt:  a => /user_created|invitation|role_changed|user_suspended|user_reactivated/.test(a),
    system:   a => /email\.test|email\.send|export|bulk_upload/.test(a),
};

function getCatBadge(action) {
    const a = (action || '').toLowerCase();
    if (CAT_MATCHERS.security(a)) return { label: 'Security', badgeClass: 'badge-danger' };
    if (CAT_MATCHERS.auth(a))     return { label: 'Authentication', badgeClass: 'badge-info' };
    if (CAT_MATCHERS.employee(a)) return { label: 'Employee', badgeClass: 'badge-success' };
    if (CAT_MATCHERS.payroll(a))  return { label: 'Payroll', badgeClass: 'badge-warning' };
    if (CAT_MATCHERS.settings(a)) return { label: 'Settings', badgeClass: 'badge-secondary' };
    if (CAT_MATCHERS.usermgt(a))  return { label: 'User Mgt', badgeClass: 'badge-gold' };
    return { label: 'System', badgeClass: 'badge-navy' };
}

const ACTION_LABELS = {
    'login': 'Logged In',
    'logout': 'Logged Out',
    'login_failed': 'Login Failed',
    'account_locked': 'Account Locked',
    'inactive_access_revoked': 'Inactive Access Revoked',
    'otp.send_failed': 'OTP Send Failed',
    'password_reset': 'Password Reset',
    'invitation_created': 'Invitation Sent',
    'invitation_accepted': 'Invitation Accepted',
    'invitation.send_failed': 'Invitation Send Failed',
    'branding_updated': 'Branding Updated',
    'company_profile_updated': 'Company Profile Updated',
    'pt_slab_updated': 'PT Slab Updated',
    'lwf_slab_updated': 'LWF Slab Updated',
    'payroll_settings_updated': 'Payroll Settings Updated',
    'settings_updated': 'Settings Updated',
    'email.settings_updated': 'Email Settings Updated',
    'email.test_sent': 'Test Email Sent',
    'email.test_failed': 'Test Email Failed',
    'settings.localization_updated': 'Localization Updated',
    'settings.gst_updated': 'GST Settings Updated',
    'employee.auto_activated': 'Employee Auto-Activated',
    'employee.suspended': 'Employee Suspended',
    'employee.reactivated': 'Employee Reactivated',
    'employee.deleted': 'Employee Deleted',
    'employee.exit_initiated': 'Exit Initiated',
    'session_revoked': 'Session Revoked',
    'export.employee_data': 'Employee Data Exported',
    'payroll.approved': 'Payroll Run Approved',
    'payroll.locked': 'Payroll Run Locked',
    'leave.approved': 'Leave Request Approved',
    'bank_change.approved': 'Bank Change Approved',
};

function getLabel(action) {
    return ACTION_LABELS[action] || (action || '').replace(/_/g, ' ').replace(/\./g, ' › ');
}

// ─── Diff / Detail Expandable Panel ──────────────────────────────────────────
function DiffPanel({ log }) {
    const { old_values: ov, new_values: nv, metadata } = log;

    const changedKeys = useMemo(() => {
        const keys = Array.from(new Set([...Object.keys(ov || {}), ...Object.keys(nv || {})]));
        return keys.filter(k => JSON.stringify((ov || {})[k]) !== JSON.stringify((nv || {})[k]));
    }, [ov, nv]);

    if (!ov && !nv && !metadata) return (
        <tr className="diff-row">
            <td colSpan={7} style={{ padding: '0.75rem 1.5rem', background: '#f8fafc' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                    No additional details recorded for this event.
                </span>
            </td>
        </tr>
    );

    return (
        <tr className="diff-row">
            <td colSpan={7} style={{ padding: '1rem 1.5rem', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                {changedKeys.length > 0 && (
                    <div style={{ marginBottom: metadata ? '0.75rem' : 0 }}>
                        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary-navy)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
                            Field Changes ({changedKeys.length} field{changedKeys.length > 1 ? 's' : ''} modified)
                        </div>
                        <table className="data-table" style={{ width: '100%', maxWidth: '750px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
                            <thead>
                                <tr>
                                    <th style={{ padding: '0.4rem 0.75rem', textAlign: 'left', width: '30%' }}>Field</th>
                                    <th style={{ padding: '0.4rem 0.75rem', textAlign: 'left', color: '#dc2626' }}>Before</th>
                                    <th style={{ padding: '0.4rem 0.75rem', textAlign: 'left', color: '#16a34a' }}>After</th>
                                </tr>
                            </thead>
                            <tbody>
                                {changedKeys.map((k) => {
                                    const oldV = (ov || {})[k];
                                    const newV = (nv || {})[k];
                                    return (
                                        <tr key={k}>
                                            <td style={{ padding: '0.4rem 0.75rem', fontFamily: 'monospace', fontWeight: 600 }}>{k}</td>
                                            <td style={{ padding: '0.4rem 0.75rem', background: '#fef2f2', color: '#dc2626' }}>
                                                <s>{oldV == null ? '—' : String(oldV)}</s>
                                            </td>
                                            <td style={{ padding: '0.4rem 0.75rem', background: '#f0fdf4', color: '#16a34a', fontWeight: 600 }}>
                                                {newV == null ? '—' : String(newV)}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
                {metadata && Object.keys(metadata).length > 0 && (
                    <div>
                        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary-navy)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.4rem' }}>
                            Additional Context
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                            {Object.entries(metadata).map(([k, v]) => (
                                <span key={k} style={{ display: 'inline-flex', gap: '0.35rem', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '4px', padding: '0.25rem 0.6rem', fontSize: '0.8rem' }}>
                                    <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>{k}:</span>
                                    <span style={{ color: '#1e293b', fontFamily: 'monospace' }}>{typeof v === 'object' ? JSON.stringify(v) : String(v ?? '—')}</span>
                                </span>
                            ))}
                        </div>
                    </div>
                )}
            </td>
        </tr>
    );
}

// ─── Main Page Component ──────────────────────────────────────────────────────
export default function ActivityLog({ logs, categoryCounts = {}, filters: sf }) {
    const activeTab                   = sf?.category || 'all';
    const [search, setSearch]         = useState(sf?.search || '');
    const [dateFrom, setDateFrom]     = useState(sf?.date_from || '');
    const [dateTo, setDateTo]         = useState(sf?.date_to || '');
    const [expanded, setExpanded]     = useState(null);

    const applyFilters = (newCategory = activeTab) => {
        router.get(route('admin.activity-log'), {
            search: search || undefined,
            date_from: dateFrom || undefined,
            date_to: dateTo || undefined,
            category: newCategory === 'all' ? undefined : newCategory,
        }, { preserveState: true, preserveScroll: true });
    };

    const handleTabClick = (catId) => {
        applyFilters(catId);
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            applyFilters();
        }
    };

    const resetFilters = () => {
        setSearch(''); setDateFrom(''); setDateTo('');
        router.get(route('admin.activity-log'), {}, { preserveState: true, preserveScroll: true });
    };

    const displayedLogs = logs?.data || [];

    const exportCsvUrl = route('admin.activity-log', {
        search: search || undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        category: activeTab === 'all' ? undefined : activeTab,
        export: 'csv',
    });

    return (
        <RoleGuard allowedRoles={['admin']}>
            <AuthenticatedLayout>
                <Head title="Activity Log" />
                <div className="legacy-react-wrapper">
                    
                    {/* Header Row */}
                    <div className="flex-row-between">
                        <div>
                            <h2>Activity Log</h2>
                            <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
                                Full audit trail of all system events — logins, employee changes, payroll actions, settings, and more.
                            </p>
                        </div>
                        <div style={{ display: "flex", gap: "0.75rem" }}>
                            <a 
                                href={exportCsvUrl} 
                                className="btn btn-secondary" 
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                            >
                                <Download size={15} /> Export CSV
                            </a>
                        </div>
                    </div>

                    {/* Filter Card */}
                    <div className="card" style={{ padding: "1rem", marginBottom: "1.25rem", display: "flex", gap: "1rem", alignItems: "center", flexWrap: "wrap" }}>
                        <div style={{ fontSize: "0.85rem", fontWeight: "600", color: "var(--primary-navy)", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                            <Filter size={14} /> Filters:
                        </div>
                        <div style={{ flex: "1", minWidth: "220px" }}>
                            <input 
                                type="text" 
                                className="form-control" 
                                placeholder="Search by User, Action, or IP..." 
                                style={{ padding: "0.4rem 0.75rem" }} 
                                value={search} 
                                onChange={e => setSearch(e.target.value)} 
                                onKeyPress={handleKeyPress} 
                            />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>From:</span>
                            <input 
                                type="date" 
                                className="form-control" 
                                style={{ padding: "0.4rem 0.75rem" }} 
                                value={dateFrom} 
                                onChange={e => setDateFrom(e.target.value)} 
                            />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>To:</span>
                            <input 
                                type="date" 
                                className="form-control" 
                                style={{ padding: "0.4rem 0.75rem" }} 
                                value={dateTo} 
                                onChange={e => setDateTo(e.target.value)} 
                            />
                        </div>
                        <button 
                            className="btn btn-navy" 
                            style={{ padding: "0.4rem 1rem", display: 'inline-flex', alignItems: 'center', gap: '5px' }} 
                            onClick={() => applyFilters()}
                        >
                            <Search size={14} /> Apply
                        </button>
                        <button 
                            className="btn btn-secondary" 
                            style={{ padding: "0.4rem 1rem", display: 'inline-flex', alignItems: 'center', gap: '5px' }} 
                            onClick={resetFilters}
                        >
                            <RotateCcw size={14} /> Reset
                        </button>
                    </div>

                    {/* Category Pill Tabs Segmented Control */}
                    <div style={{
                        background: '#F1F5F9',
                        borderRadius: '12px',
                        padding: '5px',
                        marginBottom: '1.25rem',
                        display: 'flex',
                        gap: '4px',
                        overflowX: 'auto',
                        alignItems: 'center',
                        border: '1px solid #E2E8F0'
                    }}>
                        {CATEGORIES.map(cat => {
                            const isActive = activeTab === cat.id;
                            const IconComponent = cat.icon;
                            const count = categoryCounts[cat.id] !== undefined ? categoryCounts[cat.id] : 0;

                            return (
                                <button
                                    key={cat.id}
                                    type="button"
                                    onClick={() => handleTabClick(cat.id)}
                                    style={{
                                        padding: '0.45rem 0.85rem',
                                        fontSize: '0.82rem',
                                        fontWeight: isActive ? '700' : '600',
                                        color: isActive ? 'var(--primary-navy)' : '#64748B',
                                        background: isActive ? '#FFFFFF' : 'transparent',
                                        boxShadow: isActive ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                                        border: 'none',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        whiteSpace: 'nowrap',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        transition: 'all 0.15s ease'
                                    }}
                                >
                                    <IconComponent size={14} style={{ color: isActive ? 'var(--primary-navy)' : '#94A3B8' }} />
                                    <span>{cat.label}</span>
                                    <span style={{
                                        padding: '0.1rem 0.45rem',
                                        borderRadius: '9999px',
                                        fontSize: '0.7rem',
                                        fontWeight: '700',
                                        background: isActive ? 'var(--primary-navy)' : '#E2E8F0',
                                        color: isActive ? '#FFFFFF' : '#475569'
                                    }}>
                                        {count}
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Table Card */}
                    <div className="card">
                        <div className="table-responsive">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>User Account</th>
                                        <th>Category</th>
                                        <th>Action Description</th>
                                        <th>Target / Scope</th>
                                        <th>IP Address</th>
                                        <th>Timestamp</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {displayedLogs && displayedLogs.length > 0 ? (
                                        displayedLogs.map(log => {
                                            const isExp = expanded === log.id;
                                            const catBadge = getCatBadge(log.action);
                                            const hasDiff = !!(log.old_values || log.new_values || log.metadata);
                                            const userName = log.user ? log.user.name : (log.user_name || 'System');
                                            const userEmail = log.user ? log.user.email : (log.user_email || '—');
                                            const initials = userName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'S';

                                            return (
                                                <React.Fragment key={log.id}>
                                                    <tr style={{ background: isExp ? '#f8fafc' : 'transparent' }}>
                                                        <td>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                                                <div style={{
                                                                    width: '32px', height: '32px', borderRadius: '50%',
                                                                    background: 'var(--primary-navy)', color: '#fff',
                                                                    fontSize: '0.75rem', fontWeight: '700',
                                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                    flexShrink: 0
                                                                }}>
                                                                    {initials}
                                                                </div>
                                                                <div>
                                                                    <div style={{ fontWeight: '600', color: 'var(--primary-navy)' }}>{userName}</div>
                                                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{userEmail}</div>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td>
                                                            <span className={`badge ${catBadge.badgeClass}`}>
                                                                {catBadge.label}
                                                            </span>
                                                        </td>
                                                        <td>
                                                            <div style={{ fontWeight: '600', color: '#1e293b' }}>{getLabel(log.action)}</div>
                                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{log.action}</div>
                                                        </td>
                                                        <td>
                                                            <div style={{ fontSize: '0.85rem', fontWeight: '600', color: '#334155' }}>
                                                                {log.auditable_type ? log.auditable_type.split('\\').pop() : 'Global'}
                                                            </div>
                                                            {log.auditable_id && (
                                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                                                                    #{log.auditable_id}
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: '#475569' }}>
                                                            {log.ip_address || '—'}
                                                        </td>
                                                        <td style={{ whiteSpace: 'nowrap', fontSize: '0.8rem', color: '#475569' }}>
                                                            {log.created_at ? new Date(log.created_at).toLocaleString('en-IN', {
                                                                month: 'short', day: 'numeric', year: 'numeric',
                                                                hour: '2-digit', minute: '2-digit', hour12: true
                                                            }) : '—'}
                                                        </td>
                                                        <td style={{ whiteSpace: 'nowrap' }}>
                                                            {hasDiff ? (
                                                                <button
                                                                    type="button"
                                                                    className={`btn ${isExp ? 'btn-navy' : 'btn-secondary'} btn-xs`}
                                                                    style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                                                    onClick={() => setExpanded(isExp ? null : log.id)}
                                                                >
                                                                    <Eye size={13} /> {isExp ? 'Hide Details' : 'View Details'}
                                                                </button>
                                                            ) : (
                                                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>—</span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                    {isExp && <DiffPanel log={log} />}
                                                </React.Fragment>
                                            );
                                        })
                                    ) : (
                                        <tr>
                                            <td colSpan="7" style={{ textAlign: "center", padding: "2.5rem", color: "var(--text-muted)" }}>
                                                No activity log records found matching the selected filters.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination Container */}
                        <div className="pagination-container">
                            <div className="pagination-info">
                                Showing <strong>{logs?.from || 0}</strong> to <strong>{logs?.to || 0}</strong> of <strong>{logs?.total || 0}</strong> log records
                            </div>
                            <ul className="pagination">
                                {logs?.links?.map((link, idx) => (
                                    <li key={idx} className={`page-item ${link.active ? 'active' : ''} ${!link.url ? 'disabled' : ''}`}>
                                        <Link className="page-link" href={link.url || '#'} dangerouslySetInnerHTML={{ __html: link.label }}></Link>
                                    </li>
                                ))}
                            </ul>
                        </div>

                    </div>

                </div>
            </AuthenticatedLayout>
        </RoleGuard>
    );
}
