import React, { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';
import RoleGuard from '../../Components/RoleGuard.jsx';

export default function ActivityLog({ logs }) {
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('');

    const getCategoryInfo = (action) => {
        const act = (action || '').toLowerCase();
        if (act.includes('settings_updated')) return { label: 'Settings Update', bg: '#F3F4F6', color: '#374151', border: '#D1D5DB' };
        if (act.includes('login_failed') || act.includes('lock')) return { label: 'Security Flag', bg: '#FEF2F2', color: '#991B1B', border: '#FECACA' };
        if (act.includes('login') || act.includes('logout') || act.includes('otp')) return { label: 'Authentication', bg: '#E0F2FE', color: '#0369A1', border: '#BAE6FD' };
        if (act.includes('test_sent')) return { label: 'Email Test', bg: '#EDE9FE', color: '#5B21B6', border: '#DDD6FE' };
        if (act.includes('user_created') || act.includes('invitation')) return { label: 'User Mgt', bg: '#ECFCCB', color: '#3F6212', border: '#D9F99D' };
        return { label: 'System Action', bg: '#F1F5F9', color: '#475569', border: '#E2E8F0' };
    };

    const resetFilter = () => {
        setSearchTerm('');
        setCategoryFilter('');
    };

    const filteredLogs = logs.data.filter(log => {
        const catInfo = getCategoryInfo(log.action);
        const matchCat = categoryFilter === '' || catInfo.label === categoryFilter;
        const searchableText = `${log.user?.name || ''} ${log.user?.email || 'System'} ${log.action} ${log.ip_address} ${catInfo.label}`.toLowerCase();
        const matchSearch = searchTerm === '' || searchableText.includes(searchTerm.toLowerCase());
        return matchCat && matchSearch;
    });

    const categoryBadges = [
        { label: 'Security Flag', bg: '#FEF2F2', color: '#991B1B', border: '#FECACA' },
        { label: 'Authentication', bg: '#E0F2FE', color: '#0369A1', border: '#BAE6FD' },
        { label: 'Settings Update', bg: '#F3F4F6', color: '#374151', border: '#D1D5DB' },
        { label: 'Email Test', bg: '#EDE9FE', color: '#5B21B6', border: '#DDD6FE' },
        { label: 'User Mgt', bg: '#ECFCCB', color: '#3F6212', border: '#D9F99D' },
        { label: 'System Action', bg: '#F1F5F9', color: '#475569', border: '#E2E8F0' },
    ];

    const badgeStyle = (c) => ({
        display: 'inline-block',
        background: c.bg,
        color: c.color,
        border: `1px solid ${c.border}`,
        padding: '0.15rem 0.6rem',
        borderRadius: '9999px',
        fontSize: '0.75rem',
        fontWeight: 500,
        whiteSpace: 'nowrap',
    });

    return (
        <RoleGuard allowedRoles={['admin']}>
            <AuthenticatedLayout>
                <Head title="Activity Log" />

                <style>{`
                    .al-page { max-width: 1200px; margin: 0 auto; padding: 1.5rem 1rem; }

                    .al-card {
                        background: #fff;
                        border: 1px solid #e5e7eb;
                        border-radius: 0.5rem;
                        box-shadow: 0 1px 3px rgba(0,0,0,0.06);
                    }

                    .al-filter-card {
                        padding: 1rem;
                        margin-bottom: 1.5rem;
                        display: flex;
                        gap: 1rem;
                        align-items: center;
                        flex-wrap: wrap;
                    }

                    .al-filter-label {
                        font-size: 0.85rem;
                        font-weight: 600;
                        color: var(--primary-navy, #1e3a8a);
                    }

                    .al-input {
                        padding: 0.4rem 0.75rem;
                        min-width: 220px;
                        border: 1px solid #d1d5db;
                        border-radius: 0.375rem;
                        font-size: 0.875rem;
                        color: #374151;
                        outline: none;
                        transition: border-color 0.15s;
                    }
                    .al-input:focus { border-color: #1e3a8a; box-shadow: 0 0 0 2px rgba(30,58,138,0.1); }
                    .al-input::placeholder { color: #9ca3af; }

                    .al-select {
                        padding: 0.4rem 0.75rem;
                        border: 1px solid #d1d5db;
                        border-radius: 0.375rem;
                        font-size: 0.875rem;
                        color: #374151;
                        background: #fff;
                        outline: none;
                        cursor: pointer;
                        min-width: 160px;
                    }
                    .al-select:focus { border-color: #1e3a8a; box-shadow: 0 0 0 2px rgba(30,58,138,0.1); }

                    .al-btn-navy {
                        padding: 0.4rem 1rem;
                        background: #1e3a8a;
                        color: #fff;
                        border: none;
                        border-radius: 0.375rem;
                        font-size: 0.875rem;
                        font-weight: 500;
                        cursor: pointer;
                        transition: background 0.15s;
                    }
                    .al-btn-navy:hover { background: #1e40af; }

                    .al-btn-secondary {
                        padding: 0.4rem 0.75rem;
                        background: #fff;
                        color: #475569;
                        border: 1px solid #cbd5e1;
                        border-radius: 0.375rem;
                        font-size: 0.875rem;
                        font-weight: 500;
                        cursor: pointer;
                        transition: background 0.15s;
                    }
                    .al-btn-secondary:hover { background: #f8fafc; }

                    .al-cat-legend {
                        display: flex;
                        flex-wrap: wrap;
                        gap: 0.5rem;
                        margin-bottom: 1rem;
                        font-size: 0.78rem;
                        align-items: center;
                    }
                    .al-cat-legend .legend-label {
                        font-size: 0.78rem;
                        font-weight: 600;
                        color: var(--text-muted, #6b7280);
                        opacity: 0.65;
                        margin-right: 0.1rem;
                    }

                    .al-table { width: 100%; border-collapse: collapse; }
                    .al-table thead th {
                        padding: 0.75rem 1.5rem;
                        text-align: left;
                        font-size: 0.875rem;
                        font-weight: 600;
                        color: #374151;
                        border-bottom: 1px solid #e5e7eb;
                        background: #fff;
                    }
                    .al-table tbody td {
                        padding: 0.75rem 1.5rem;
                        font-size: 0.875rem;
                        color: #374151;
                        border-bottom: 1px solid #f3f4f6;
                        vertical-align: top;
                    }
                    .al-table tbody tr:hover { background: #f9fafb; }

                    tr.row-danger { background-color: #FEF2F2 !important; }
                    tr.row-danger:hover { background-color: #FEE2E2 !important; }
                    tr.row-warn { background-color: #FFFBF5 !important; }
                    tr.row-warn:hover { background-color: #FFF3E0 !important; }

                    .action-cell { line-height: 1.5; }
                    .action-cell .action-employee { font-weight: 600; color: var(--primary-navy, #1e3a8a); }
                    .action-cell .action-detail { font-size: 0.8rem; color: var(--text-muted, #6b7280); margin-top: 0.15rem; }
                    .action-cell .action-flag { font-size: 0.75rem; color: var(--status-warning, #d97706); font-weight: 500; margin-top: 0.15rem; }

                    .al-pagination {
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                        padding: 0.75rem 1.5rem;
                        border-top: 1px solid #e5e7eb;
                        font-size: 0.875rem;
                        color: #6b7280;
                    }
                    .al-pagination-btns { display: flex; gap: 0.5rem; }
                    .al-pagination-btns a,
                    .al-pagination-btns button {
                        padding: 0.35rem 0.75rem;
                        border: 1px solid #d1d5db;
                        border-radius: 0.375rem;
                        font-size: 0.8rem;
                        font-weight: 500;
                        background: #fff;
                        color: #374151;
                        text-decoration: none;
                        cursor: pointer;
                    }
                    .al-pagination-btns a:hover { background: #f9fafb; }
                    .al-pagination-btns button:disabled {
                        background: #f9fafb;
                        color: #9ca3af;
                        cursor: not-allowed;
                        border-color: #e5e7eb;
                    }

                    .td-mono { font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace; }
                `}</style>

                <div className="al-page">
                    {/* Header */}
                    <div style={{ marginBottom: '1.5rem' }}>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginTop: '0.5rem', marginBottom: '0.25rem', color: '#1e293b' }}>
                            System Security Activity Log
                        </h2>
                        <p style={{ color: '#6b7280', fontSize: '0.9rem', margin: 0 }}>
                            Audit history of all operational events, salary modifications, profile edits, banking detail changes, and role assignments.
                        </p>
                    </div>

                    {/* Category Legend */}
                    <div className="al-cat-legend">
                        <span className="legend-label">Categories:</span>
                        {categoryBadges.map(c => (
                            <span key={c.label} style={badgeStyle(c)}>{c.label}</span>
                        ))}
                    </div>

                    {/* Filters */}
                    <div className="al-card al-filter-card">
                        <div className="al-filter-label">Filters:</div>
                        <input
                            type="text"
                            className="al-input"
                            placeholder="Search by user or action..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                        <select
                            className="al-select"
                            value={categoryFilter}
                            onChange={e => setCategoryFilter(e.target.value)}
                        >
                            <option value="">All Categories</option>
                            {categoryBadges.map(c => (
                                <option key={c.label} value={c.label}>{c.label}</option>
                            ))}
                        </select>
                        <button className="al-btn-navy" onClick={() => {}}>Apply Filter</button>
                        <button className="al-btn-secondary" onClick={resetFilter}>Reset</button>
                    </div>

                    {/* Logs Table */}
                    <div className="al-card">
                        <div style={{ overflowX: 'auto' }}>
                            <table className="al-table">
                                <thead>
                                    <tr>
                                        <th>User Account</th>
                                        <th>Category</th>
                                        <th>Action Description</th>
                                        <th>Client Scope</th>
                                        <th>IP Address</th>
                                        <th>Timestamp</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredLogs.length === 0 ? (
                                        <tr>
                                            <td colSpan="6" style={{ textAlign: 'center', padding: '2.5rem', color: '#6b7280' }}>
                                                No log entries match the selected filters.
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredLogs.map((log) => {
                                            const catInfo = getCategoryInfo(log.action);
                                            const isDanger = catInfo.label === 'Security Flag';

                                            return (
                                                <tr key={log.id} className={isDanger ? 'row-danger' : ''}>
                                                    <td>
                                                        <strong>{log.user ? log.user.name : 'System Job'}</strong>
                                                    </td>
                                                    <td>
                                                        <span style={badgeStyle(catInfo)}>{catInfo.label}</span>
                                                    </td>
                                                    <td className="action-cell">
                                                        <div>
                                                            <strong style={{ color: isDanger ? '#dc2626' : 'inherit' }}>
                                                                {log.action}
                                                            </strong>
                                                        </div>
                                                        {(log.auditable_type || (log.metadata && log.metadata.changes)) && (
                                                            <div className="action-detail">
                                                                {log.auditable_type && (
                                                                    <span>Target: {log.auditable_type.split('\\').pop()} #{log.auditable_id}</span>
                                                                )}
                                                                {log.metadata && log.metadata.changes && (
                                                                    <span style={{ marginLeft: log.auditable_type ? '0.5rem' : 0 }}>
                                                                        ({log.metadata.changes.length} field(s) changed)
                                                                    </span>
                                                                )}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td>Global</td>
                                                    <td className="td-mono">{log.ip_address || 'N/A'}</td>
                                                    <td>{new Date(log.created_at).toLocaleString()}</td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        {logs.total > 0 && (
                            <div className="al-pagination">
                                <div>
                                    Showing <strong>{logs.from || 0}</strong> to <strong>{logs.to || 0}</strong> of <strong>{logs.total}</strong> activity logs
                                </div>
                                <div className="al-pagination-btns">
                                    {logs.prev_page_url ? (
                                        <Link href={logs.prev_page_url}>Prev</Link>
                                    ) : (
                                        <button disabled>Prev</button>
                                    )}
                                    {logs.next_page_url ? (
                                        <Link href={logs.next_page_url}>Next</Link>
                                    ) : (
                                        <button disabled>Next</button>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </AuthenticatedLayout>
        </RoleGuard>
    );
}
