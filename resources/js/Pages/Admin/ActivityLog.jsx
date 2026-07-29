import React, { useState, useMemo } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router } from '@inertiajs/react';
import RoleGuard from '../../Components/RoleGuard.jsx';
import { 
    Download, 
    Search, 
    Filter, 
    RotateCcw, 
    ChevronRight, 
    ChevronDown, 
    ChevronUp, 
    Eye, 
    Edit3, 
    Calendar, 
    Info 
} from 'lucide-react';

// ─── Category config ──────────────────────────────────────────────────────────
const CATEGORIES = [
    { id: 'all',      label: 'All Activity',     color: '#1F3864', bg: '#EEF2FF', border: '#C7D2FE' },
    { id: 'security', label: 'Security',          color: '#991B1B', bg: '#FEF2F2', border: '#FECACA' },
    { id: 'auth',     label: 'Authentication',    color: '#0369A1', bg: '#E0F2FE', border: '#BAE6FD' },
    { id: 'employee', label: 'Employee',          color: '#065F46', bg: '#ECFDF5', border: '#A7F3D0' },
    { id: 'payroll',  label: 'Payroll',           color: '#92400E', bg: '#FFFBEB', border: '#FDE68A' },
    { id: 'settings', label: 'Settings',          color: '#374151', bg: '#F3F4F6', border: '#D1D5DB' },
    { id: 'usermgt',  label: 'User Mgt',          color: '#3F6212', bg: '#ECFCCB', border: '#D9F99D' },
    { id: 'system',   label: 'System',            color: '#475569', bg: '#F1F5F9', border: '#E2E8F0' },
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

function getCat(action) {
    const a = (action || '').toLowerCase();
    for (const c of CATEGORIES.slice(1)) {
        if (CAT_MATCHERS[c.id]?.(a)) return c;
    }
    return CATEGORIES[CATEGORIES.length - 1];
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
        <td colSpan={8} style={{ padding: '0.75rem 2rem', background: '#F8FAFC', borderBottom: '1px solid #E5E7EB' }}>
            <span style={{ fontSize: '0.8rem', color: '#94A3B8', fontStyle: 'italic' }}>No additional details recorded for this event.</span>
        </td>
    );

    return (
        <td colSpan={8} style={{ padding: '0.75rem 1.5rem 1rem 3rem', background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
            {changedKeys.length > 0 && (
                <div style={{ marginBottom: metadata ? '0.75rem' : 0 }}>
                    <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.5rem' }}>
                        Field Changes — {changedKeys.length} field{changedKeys.length > 1 ? 's' : ''} modified
                    </div>
                    <table style={{ borderCollapse: 'collapse', fontSize: '0.8rem', width: '100%', maxWidth: '700px', background: 'white', border: '1px solid #E2E8F0', borderRadius: '6px', overflow: 'hidden' }}>
                        <thead>
                            <tr style={{ background: '#F1F5F9' }}>
                                <th style={{ padding: '0.4rem 0.75rem', textAlign: 'left', color: '#475569', fontWeight: 700, width: '30%' }}>Field</th>
                                <th style={{ padding: '0.4rem 0.75rem', textAlign: 'left', color: '#DC2626', fontWeight: 700 }}>Before</th>
                                <th style={{ padding: '0.4rem 0.75rem', textAlign: 'left', color: '#059669', fontWeight: 700 }}>After</th>
                            </tr>
                        </thead>
                        <tbody>
                            {changedKeys.map((k) => {
                                const oldV = (ov || {})[k];
                                const newV = (nv || {})[k];
                                return (
                                    <tr key={k} style={{ borderTop: '1px solid #F1F5F9' }}>
                                        <td style={{ padding: '0.4rem 0.75rem', fontFamily: 'monospace', fontWeight: 600, color: '#374151' }}>{k}</td>
                                        <td style={{ padding: '0.4rem 0.75rem', background: '#FFF5F5', color: '#DC2626' }}>
                                            <s style={{ opacity: 0.7 }}>{oldV == null ? '—' : String(oldV)}</s>
                                        </td>
                                        <td style={{ padding: '0.4rem 0.75rem', background: '#F0FDF4', color: '#059669', fontWeight: 600 }}>
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
                    <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.4rem' }}>
                        Additional Info
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                        {Object.entries(metadata).map(([k, v]) => (
                            <span key={k} style={{ display: 'inline-flex', gap: '0.3rem', background: 'white', border: '1px solid #E2E8F0', borderRadius: '5px', padding: '0.2rem 0.6rem', fontSize: '0.78rem' }}>
                                <span style={{ color: '#64748B', fontWeight: 600 }}>{k}:</span>
                                <span style={{ color: '#1E293B', fontFamily: 'monospace' }}>{typeof v === 'object' ? JSON.stringify(v) : String(v ?? '—')}</span>
                            </span>
                        ))}
                    </div>
                </div>
            )}
        </td>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ActivityLog({ logs, filters: sf }) {
    const [activeTab, setActiveTab]   = useState('all');
    const [search, setSearch]         = useState(sf?.search || '');
    const [dateFrom, setDateFrom]     = useState(sf?.date_from || '');
    const [dateTo, setDateTo]         = useState(sf?.date_to || '');
    const [catFilter, setCatFilter]   = useState(sf?.category || '');
    const [expanded, setExpanded]     = useState(null);

    const applyFilters = () => {
        router.get(route('admin.activity-log'), {
            search: search || undefined,
            date_from: dateFrom || undefined,
            date_to: dateTo || undefined,
            category: catFilter || undefined,
        }, { preserveState: false, replace: true });
    };

    const resetFilters = () => {
        setSearch(''); setDateFrom(''); setDateTo(''); setCatFilter('');
        router.get(route('admin.activity-log'), {}, { preserveState: false, replace: true });
    };

    const displayed = useMemo(() => {
        const tab = CATEGORIES.find(c => c.id === activeTab) || CATEGORIES[0];
        return (logs?.data || []).filter(log =>
            tab.id === 'all' || CAT_MATCHERS[tab.id]?.((log.action || '').toLowerCase())
        );
    }, [logs?.data, activeTab]);

    const tabCounts = useMemo(() => {
        const all = logs?.data || [];
        return Object.fromEntries(CATEGORIES.map(c => [
            c.id,
            c.id === 'all' ? all.length : all.filter(l => CAT_MATCHERS[c.id]?.((l.action || '').toLowerCase())).length
        ]));
    }, [logs?.data]);

    return (
        <RoleGuard allowedRoles={['admin']}>
            <AuthenticatedLayout>
                <Head title="Activity Log" />

                <style>{`
                    .al2-page { max-width: 1380px; margin: 0 auto; padding: 0 0 2rem 0; }

                    /* ── Page Header ── */
                    .al2-header {
                        display: flex; justify-content: space-between; align-items: flex-start;
                        flex-wrap: wrap; gap: 1rem; margin-bottom: 1.25rem;
                    }
                    .al2-title { font-size: 1.55rem; font-weight: 800; color: #1e293b; margin: 0 0 0.2rem 0; }
                    .al2-sub   { font-size: 0.875rem; color: #64748B; margin: 0; }
                    .al2-export-btn {
                        display: inline-flex; align-items: center; gap: 0.4rem;
                        padding: 0.55rem 1.1rem;
                        background: #B45309; color: white; border: none; border-radius: 6px;
                        font-size: 0.85rem; font-weight: 600; cursor: pointer;
                        transition: background 0.15s; white-space: nowrap; text-decoration: none;
                    }
                    .al2-export-btn:hover { background: #92400E; }

                    /* ── Step breadcrumb ── */
                    .al2-step-bar {
                        display: flex; align-items: center; gap: 0; flex-wrap: wrap;
                        background: white; border: 1px solid #E2E8F0; border-radius: 8px;
                        padding: 0.6rem 1.25rem; margin-bottom: 1.25rem;
                        box-shadow: 0 1px 3px rgba(0,0,0,0.04);
                        justify-content: space-between;
                    }
                    .al2-step-left { display: flex; align-items: center; gap: 0; flex-wrap: wrap; }
                    .al2-step {
                        font-size: 0.82rem; font-weight: 500; color: #94A3B8;
                        display: flex; align-items: center; gap: 0;
                    }
                    .al2-step.active {
                        color: #B45309; font-weight: 700;
                        background: #FEF3C7; border-radius: 4px;
                        padding: 0.15rem 0.5rem;
                    }
                    .al2-step-arrow { color: #CBD5E1; margin: 0 0.3rem; display: inline-flex; align-items: center; }

                    /* ── Filter bar ── */
                    .al2-filter-bar {
                        display: flex; gap: 0.75rem; flex-wrap: wrap; align-items: flex-end;
                        margin-bottom: 1.25rem;
                    }
                    .al2-fgroup { display: flex; flex-direction: column; gap: 0.25rem; }
                    .al2-flabel { font-size: 0.72rem; font-weight: 700; color: #64748B; text-transform: uppercase; letter-spacing: 0.05em; }
                    .al2-finput, .al2-fselect {
                        padding: 0.42rem 0.75rem; border: 1px solid #D1D5DB; border-radius: 6px;
                        font-size: 0.85rem; color: #374151; background: white; outline: none;
                        transition: border-color 0.15s, box-shadow 0.15s;
                    }
                    .al2-finput { min-width: 210px; }
                    .al2-finput[type="date"] { min-width: 140px; }
                    .al2-fselect { min-width: 155px; cursor: pointer; }
                    .al2-finput:focus,.al2-fselect:focus { border-color: #1F3864; box-shadow: 0 0 0 3px rgba(31,56,100,0.08); }
                    .al2-finput::placeholder { color: #9CA3AF; }

                    .al2-btn-apply {
                        display: inline-flex; align-items: center; gap: 0.35rem;
                        padding: 0.42rem 1.1rem; background: #1F3864; color: white;
                        border: none; border-radius: 6px; font-size: 0.85rem; font-weight: 600;
                        cursor: pointer; align-self: flex-end; transition: background 0.15s;
                    }
                    .al2-btn-apply:hover { background: #1e40af; }
                    .al2-btn-reset {
                        display: inline-flex; align-items: center; gap: 0.35rem;
                        padding: 0.42rem 0.85rem; background: white; color: #64748B;
                        border: 1px solid #D1D5DB; border-radius: 6px; font-size: 0.85rem;
                        font-weight: 500; cursor: pointer; align-self: flex-end; transition: all 0.15s;
                    }
                    .al2-btn-reset:hover { background: #F8FAFC; }

                    /* ── Table card ── */
                    .al2-card {
                        background: white; border: 1px solid #E2E8F0; border-radius: 10px;
                        overflow: hidden; box-shadow: 0 1px 4px rgba(0,0,0,0.05);
                    }

                    /* ── Category Tab bar inside card ── */
                    .al2-tabbar {
                        display: flex; overflow-x: auto; border-bottom: 2px solid #E2E8F0;
                        scrollbar-width: none; background: white;
                    }
                    .al2-tabbar::-webkit-scrollbar { display: none; }
                    .al2-tab {
                        padding: 0.65rem 1.05rem; font-size: 0.8rem; font-weight: 600;
                        color: #64748B; border: none; background: none; cursor: pointer;
                        border-bottom: 2.5px solid transparent; margin-bottom: -2px;
                        white-space: nowrap; transition: all 0.15s; display: flex; align-items: center; gap: 0.35rem;
                    }
                    .al2-tab:hover { color: #1F3864; background: #F8FAFC; }
                    .al2-tab.active { color: #1F3864; border-bottom-color: #1F3864; background: #EEF2FF; }
                    .al2-tab-badge {
                        background: #E2E8F0; color: #64748B;
                        border-radius: 9999px; padding: 0.05rem 0.45rem;
                        font-size: 0.68rem; font-weight: 700;
                    }
                    .al2-tab.active .al2-tab-badge { background: #1F3864; color: white; }

                    /* ── Table ── */
                    .al2-table { width: 100%; border-collapse: collapse; }
                    .al2-table thead tr { border-bottom: 1px solid #E2E8F0; }
                    .al2-table thead th {
                        padding: 0.75rem 1.1rem; text-align: left;
                        font-size: 0.82rem; font-weight: 700; color: #1F3864;
                        background: white; white-space: nowrap;
                    }
                    .al2-table thead th:first-child { width: 40px; padding-left: 1.25rem; }

                    .al2-table tbody tr { border-bottom: 1px solid #F1F5F9; transition: background 0.1s; }
                    .al2-table tbody tr:hover { background: #FAFBFF; }
                    .al2-table tbody tr.al2-row-danger { background: #FEF2F2; }
                    .al2-table tbody tr.al2-row-danger:hover { background: #FEE2E2; }
                    .al2-table tbody tr.al2-expanded-parent { background: #EFF6FF; }
                    .al2-table tbody td { padding: 0.85rem 1.1rem; font-size: 0.855rem; color: #374151; vertical-align: middle; }
                    .al2-table tbody td:first-child { padding-left: 1.25rem; }

                    /* ── Status badges ── */
                    .al2-badge {
                        display: inline-block; padding: 0.22rem 0.65rem; border-radius: 9999px;
                        font-size: 0.72rem; font-weight: 600; white-space: nowrap;
                        border: 1px solid;
                    }

                    /* ── Expand toggle ── */
                    .al2-expand-btn {
                        width: 22px; height: 22px; border-radius: 50%; border: 1px solid #CBD5E1;
                        background: #F1F5F9; color: #64748B; font-size: 0.65rem; cursor: pointer;
                        display: inline-flex; align-items: center; justify-content: center;
                        transition: all 0.15s; flex-shrink: 0;
                    }
                    .al2-expand-btn:hover { background: #1F3864; color: white; border-color: #1F3864; }
                    .al2-expand-btn.open { background: #1F3864; color: white; border-color: #1F3864; }

                    /* ── Action buttons ── */
                    .al2-btn-detail {
                        display: inline-flex; align-items: center; gap: 0.35rem;
                        padding: 0.3rem 0.7rem; background: #1F3864; color: white;
                        border: none; border-radius: 5px; font-size: 0.75rem; font-weight: 600;
                        cursor: pointer; white-space: nowrap; text-decoration: none; transition: background 0.15s;
                    }
                    .al2-btn-detail:hover { background: #1e40af; }
                    .al2-btn-viewlog {
                        display: inline-flex; align-items: center; gap: 0.35rem;
                        padding: 0.3rem 0.7rem; background: #1F3864; color: white;
                        border: none; border-radius: 5px; font-size: 0.75rem; font-weight: 600;
                        cursor: pointer; white-space: nowrap; transition: background 0.15s;
                    }
                    .al2-btn-viewlog:hover { background: #1e40af; }
                    .al2-btn-changediff {
                        display: inline-flex; align-items: center; gap: 0.35rem;
                        padding: 0.3rem 0.7rem; background: #B45309; color: white;
                        border: none; border-radius: 5px; font-size: 0.75rem; font-weight: 600;
                        cursor: pointer; white-space: nowrap; transition: background 0.15s;
                    }
                    .al2-btn-changediff:hover { background: #92400E; }

                    /* ── User avatar ── */
                    .al2-avatar {
                        width: 30px; height: 30px; border-radius: 50%;
                        background: #1F3864; color: white;
                        display: inline-flex; align-items: center; justify-content: center;
                        font-size: 0.72rem; font-weight: 700; flex-shrink: 0;
                    }

                    /* ── Pagination ── */
                    .al2-pagination {
                        display: flex; align-items: center; justify-content: space-between;
                        padding: 0.85rem 1.25rem; border-top: 1px solid #E5E7EB;
                        font-size: 0.82rem; color: #64748B; flex-wrap: wrap; gap: 0.5rem;
                    }
                    .al2-page-btns { display: flex; gap: 0.3rem; flex-wrap: wrap; align-items: center; }
                    .al2-page-btns a, .al2-page-btns button {
                        padding: 0.3rem 0.6rem; border: 1px solid #D1D5DB; border-radius: 5px;
                        font-size: 0.78rem; font-weight: 500; background: white; color: #374151;
                        text-decoration: none; cursor: pointer; transition: all 0.12s;
                    }
                    .al2-page-btns a:hover { background: #EEF2FF; border-color: #1F3864; color: #1F3864; }
                    .al2-page-btns a.pg-active { background: #1F3864; color: white; border-color: #1F3864; }
                    .al2-page-btns button:disabled { background: #F9FAFB; color: #CBD5E1; cursor: not-allowed; }

                    /* ── Empty ── */
                    .al2-empty { text-align: center; padding: 3rem 1rem; color: #94A3B8; }
                    .al2-empty-icon { display: flex; justify-content: center; margin-bottom: 0.75rem; color: #94A3B8; }
                `}</style>

                <div className="al2-page">

                    {/* ── Page Header ── */}
                    <div className="al2-header">
                        <div>
                            <h2 className="al2-title">Activity Log</h2>
                            <p className="al2-sub">Full audit trail of all system events — logins, employee changes, payroll actions, settings, and more.</p>
                        </div>
                        <a
                            href={`${route('admin.activity-log')}?export=csv`}
                            className="al2-export-btn"
                        >
                            <Download size={15} /> Export CSV
                        </a>
                    </div>

                    {/* ── Step / Breadcrumb Bar ── */}
                    <div className="al2-step-bar">
                        <div className="al2-step-left">
                            {CATEGORIES.map((c, i) => (
                                <React.Fragment key={c.id}>
                                    <button
                                        className={`al2-step${activeTab === c.id ? ' active' : ''}`}
                                        onClick={() => setActiveTab(c.id)}
                                        style={{ border: 'none', background: activeTab === c.id ? '#FEF3C7' : 'none', cursor: 'pointer', padding: activeTab === c.id ? '0.15rem 0.5rem' : '0.15rem 0.2rem' }}
                                    >
                                        {c.label}
                                        {activeTab === c.id && <span style={{ marginLeft: '0.3rem', fontSize: '0.7rem', color: '#B45309' }}>— YOU ARE HERE</span>}
                                    </button>
                                    {i < CATEGORIES.length - 1 && (
                                        <span className="al2-step-arrow">
                                            <ChevronRight size={13} />
                                        </span>
                                    )}
                                </React.Fragment>
                            ))}
                        </div>

                        {/* Date filter on right */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#374151', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                                <Calendar size={13} className="text-slate-500" /> DATE RANGE:
                            </span>
                            <input type="date" className="al2-finput" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={{ minWidth: '130px', fontSize: '0.8rem', padding: '0.3rem 0.6rem' }} />
                            <span style={{ color: '#94A3B8', fontSize: '0.8rem' }}>to</span>
                            <input type="date" className="al2-finput" value={dateTo} onChange={e => setDateTo(e.target.value)} style={{ minWidth: '130px', fontSize: '0.8rem', padding: '0.3rem 0.6rem' }} />
                            <button className="al2-btn-apply" style={{ padding: '0.3rem 0.75rem', fontSize: '0.8rem' }} onClick={applyFilters}>Apply</button>
                        </div>
                    </div>

                    {/* ── Filter Bar ── */}
                    <div className="al2-filter-bar">
                        <div className="al2-fgroup">
                            <span className="al2-flabel">Search</span>
                            <input
                                type="text"
                                className="al2-finput"
                                placeholder="Search by user, action, IP..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && applyFilters()}
                            />
                        </div>
                        <div className="al2-fgroup">
                            <span className="al2-flabel">Category</span>
                            <select className="al2-fselect" value={catFilter} onChange={e => setCatFilter(e.target.value)}>
                                <option value="">All Categories</option>
                                {CATEGORIES.filter(c => c.id !== 'all').map(c => (
                                    <option key={c.id} value={c.id}>{c.label}</option>
                                ))}
                            </select>
                        </div>
                        <button className="al2-btn-apply" onClick={applyFilters}>
                            <Filter size={14} /> Apply Filter
                        </button>
                        <button className="al2-btn-reset" onClick={resetFilters}>
                            <RotateCcw size={14} /> Reset
                        </button>
                    </div>

                    {/* ── Main Table Card ── */}
                    <div className="al2-card">

                        {/* Category Tabs inside card */}
                        <div className="al2-tabbar">
                            {CATEGORIES.map(c => (
                                <button
                                    key={c.id}
                                    className={`al2-tab${activeTab === c.id ? ' active' : ''}`}
                                    onClick={() => { setActiveTab(c.id); setExpanded(null); }}
                                >
                                    {c.label}
                                    <span className="al2-tab-badge">{tabCounts[c.id]}</span>
                                </button>
                            ))}
                        </div>

                        {/* Table */}
                        <div style={{ overflowX: 'auto' }}>
                            <table className="al2-table">
                                <thead>
                                    <tr>
                                        <th></th>
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
                                    {displayed.length === 0 ? (
                                        <tr>
                                            <td colSpan={8}>
                                                <div className="al2-empty">
                                                    <div className="al2-empty-icon">
                                                        <Search size={36} />
                                                    </div>
                                                    <div style={{ fontWeight: 600, color: '#64748B', fontSize: '1rem' }}>No activity found</div>
                                                    <div style={{ marginTop: '0.25rem', fontSize: '0.85rem' }}>Try adjusting filters or date range.</div>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        displayed.map(log => {
                                            const cat = getCat(log.action);
                                            const isDanger = cat.id === 'security';
                                            const hasDetails = log.old_values || log.new_values || log.metadata;
                                            const isOpen = expanded === log.id;

                                            const changedCount = (() => {
                                                if (!log.old_values && !log.new_values) return 0;
                                                const keys = Array.from(new Set([...Object.keys(log.old_values || {}), ...Object.keys(log.new_values || {})]));
                                                return keys.filter(k => JSON.stringify((log.old_values || {})[k]) !== JSON.stringify((log.new_values || {})[k])).length;
                                            })();

                                            return (
                                                <React.Fragment key={log.id}>
                                                    <tr
                                                        className={isDanger ? 'al2-row-danger' : (isOpen ? 'al2-expanded-parent' : '')}
                                                        style={{ cursor: hasDetails ? 'pointer' : 'default' }}
                                                        onClick={() => hasDetails && setExpanded(isOpen ? null : log.id)}
                                                    >
                                                        {/* Expand toggle */}
                                                        <td style={{ width: '40px' }}>
                                                            {hasDetails && (
                                                                <button
                                                                    className={`al2-expand-btn${isOpen ? ' open' : ''}`}
                                                                    onClick={e => { e.stopPropagation(); setExpanded(isOpen ? null : log.id); }}
                                                                    title="View details"
                                                                >
                                                                    {isOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                                                                </button>
                                                            )}
                                                        </td>

                                                        {/* User */}
                                                        <td>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                                                <span className="al2-avatar">{(log.user?.name || 'S')[0].toUpperCase()}</span>
                                                                <div>
                                                                    <div style={{ fontWeight: 700, color: '#1e293b', fontSize: '0.85rem' }}>
                                                                        {log.user ? log.user.name : 'System'}
                                                                    </div>
                                                                    {log.user?.email && (
                                                                        <div style={{ fontSize: '0.72rem', color: '#94A3B8' }}>{log.user.email}</div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </td>

                                                        {/* Category badge */}
                                                        <td>
                                                            <span
                                                                className="al2-badge"
                                                                style={{ background: cat.bg, color: cat.color, borderColor: cat.border }}
                                                            >
                                                                {cat.label}
                                                            </span>
                                                        </td>

                                                        {/* Action description */}
                                                        <td>
                                                            <div style={{ fontWeight: 600, color: isDanger ? '#DC2626' : '#1e293b', fontSize: '0.855rem' }}>
                                                                {getLabel(log.action)}
                                                            </div>
                                                            <div style={{ fontSize: '0.75rem', color: '#94A3B8', marginTop: '0.15rem', fontFamily: 'monospace' }}>
                                                                {log.action}
                                                            </div>
                                                            {changedCount > 0 && (
                                                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.25rem', background: '#EFF6FF', color: '#1d4ed8', border: '1px solid #BFDBFE', borderRadius: '9999px', padding: '0.05rem 0.45rem', fontSize: '0.68rem', fontWeight: 600 }}>
                                                                    <Edit3 size={11} /> {changedCount} field{changedCount > 1 ? 's' : ''} changed
                                                                </span>
                                                            )}
                                                        </td>

                                                        {/* Target */}
                                                        <td>
                                                            {log.auditable_type ? (
                                                                <div>
                                                                    <div style={{ fontWeight: 600, color: '#374151', fontSize: '0.82rem' }}>
                                                                        {log.auditable_type.split('\\').pop()}
                                                                    </div>
                                                                    <div style={{ fontSize: '0.72rem', color: '#94A3B8' }}>#{log.auditable_id}</div>
                                                                </div>
                                                            ) : (
                                                                <span style={{ color: '#94A3B8', fontSize: '0.8rem' }}>Global</span>
                                                            )}
                                                        </td>

                                                        {/* IP */}
                                                        <td style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: '#475569' }}>
                                                            {log.ip_address || '—'}
                                                        </td>

                                                        {/* Timestamp */}
                                                        <td style={{ whiteSpace: 'nowrap' }}>
                                                            <div style={{ fontWeight: 600, color: '#374151', fontSize: '0.82rem' }}>
                                                                {new Date(log.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                            </div>
                                                            <div style={{ fontSize: '0.72rem', color: '#94A3B8' }}>
                                                                {new Date(log.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                                            </div>
                                                        </td>

                                                        {/* Actions */}
                                                        <td onClick={e => e.stopPropagation()}>
                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', alignItems: 'flex-start' }}>
                                                                {hasDetails && (
                                                                    <button
                                                                        className="al2-btn-viewlog"
                                                                        onClick={() => setExpanded(isOpen ? null : log.id)}
                                                                    >
                                                                        <Eye size={13} /> View Logs
                                                                    </button>
                                                                )}
                                                                {changedCount > 0 && (
                                                                    <button
                                                                        className="al2-btn-changediff"
                                                                        onClick={() => setExpanded(isOpen ? null : log.id)}
                                                                    >
                                                                        <Edit3 size={13} /> View Changes
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>

                                                    {/* Expanded detail row */}
                                                    {isOpen && (
                                                        <tr style={{ background: '#F8FAFC' }}>
                                                            <DiffPanel log={log} />
                                                        </tr>
                                                    )}
                                                </React.Fragment>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        {(logs?.total || 0) > 0 && (
                            <div className="al2-pagination">
                                <div>
                                    Showing <strong>{logs.from || 0}–{logs.to || 0}</strong> of <strong>{(logs.total || 0).toLocaleString()}</strong> activity logs
                                    {activeTab !== 'all' && (
                                        <span style={{ marginLeft: '0.5rem', color: '#94A3B8' }}>· {displayed.length} on this tab</span>
                                    )}
                                </div>
                                <div className="al2-page-btns">
                                    {logs.prev_page_url
                                        ? <Link href={logs.prev_page_url}>← Prev</Link>
                                        : <button disabled>← Prev</button>}
                                    {(logs.links || [])
                                        .filter(l => !['&laquo; Previous', 'Next &raquo;'].includes(l.label))
                                        .map((l, i) => l.url
                                            ? <Link key={i} href={l.url} className={l.active ? 'pg-active' : ''}>{l.label}</Link>
                                            : <button key={i} disabled>{l.label}</button>
                                        )}
                                    {logs.next_page_url
                                        ? <Link href={logs.next_page_url}>Next →</Link>
                                        : <button disabled>Next →</button>}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Legend strip */}
                    <div style={{ marginTop: '0.85rem', display: 'flex', flexWrap: 'wrap', gap: '0.4rem', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', marginRight: '0.25rem' }}>Categories:</span>
                        {CATEGORIES.filter(c => c.id !== 'all').map(c => (
                            <span key={c.id} className="al2-badge" style={{ background: c.bg, color: c.color, borderColor: c.border }}>
                                {c.label}
                            </span>
                        ))}
                        <span style={{ marginLeft: '0.5rem', fontSize: '0.72rem', color: '#94A3B8', display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
                            <Info size={13} /> Click row or "View Logs" to expand full change details
                        </span>
                    </div>
                </div>
            </AuthenticatedLayout>
        </RoleGuard>
    );
}
