import { Head, router } from '@inertiajs/react';
import { useState } from 'react';
import AuthenticatedLayout from '../../Layouts/AuthenticatedLayout';
import RoleGuard from '../../Components/RoleGuard.jsx';
import {
  Monitor,
  Globe,
  Clock,
  ShieldX,
  ShieldAlert,
  Search,
  Users,
  Filter
} from 'lucide-react';

export default function AdminSessions({ sessions = {}, filters = {} }) {
  const [selected, setSelected] = useState([]);
  const [search, setSearch] = useState(filters.search || '');

  const data      = sessions.data || [];
  const total     = sessions.total || 0;
  const fromIdx   = sessions.from || 0;
  const toIdx     = sessions.to || 0;

  const handleSearch = (e) => {
    if (e) e.preventDefault();
    router.get(route('admin.sessions'), { search, page: 1 }, { preserveState: true });
  };

  const revokeSelected = () => {
    if (selected.length === 0) return;
    if (confirm(`Are you sure you want to revoke ${selected.length} session(s)?`)) {
      router.post(route('admin.sessions.bulk-revoke'), { ids: selected }, {
        onSuccess: () => setSelected([])
      });
    }
  };

  const allChecked = selected.length === data.length && data.length > 0;

  return (
    <RoleGuard allowedRoles={['admin', 'manager']} moduleKey="admin">
      <AuthenticatedLayout>
        <Head title="Active Sessions" />
        <div className="legacy-react-wrapper">

          {/* Header Row */}
          <div className="flex-row-between">
            <div>
              <h2>Active Sessions</h2>
              <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
                Monitor and manage all active user sessions across the system. Revoke any suspicious session instantly.
              </p>
            </div>
            <div style={{ display: "flex", gap: "0.75rem" }}>
              {selected.length > 0 && (
                <button
                  type="button"
                  onClick={revokeSelected}
                  className="btn btn-danger"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  <ShieldAlert size={14} /> Revoke {selected.length} Selected
                </button>
              )}
            </div>
          </div>

          {/* Filter Card */}
          <div className="card" style={{ padding: "1rem", marginBottom: "1.5rem", display: "flex", gap: "1rem", alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ fontSize: "0.85rem", fontWeight: "600", color: "var(--primary-navy)", display: "inline-flex", alignItems: "center", gap: "4px" }}>
              <Filter size={14} /> Search Sessions:
            </div>
            <div style={{ flex: "1", minWidth: "250px" }}>
              <input
                type="text"
                className="form-control"
                placeholder="Search by User Name, Email or IP Address..."
                style={{ padding: "0.4rem 0.75rem" }}
                value={search}
                onChange={e => setSearch(e.target.value)}
                onKeyPress={e => e.key === 'Enter' && handleSearch(e)}
              />
            </div>
            <button
              className="btn btn-navy"
              style={{ padding: "0.4rem 1rem", display: 'inline-flex', alignItems: 'center', gap: '5px' }}
              onClick={handleSearch}
            >
              <Search size={14} /> Search
            </button>
          </div>

          {/* Table Card */}
          <div className="card">
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: '40px' }}>
                      <input
                        type="checkbox"
                        checked={allChecked}
                        onChange={e => setSelected(e.target.checked ? data.map(s => s.id) : [])}
                      />
                    </th>
                    <th>User Account</th>
                    <th>IP Address</th>
                    <th>Device & Platform</th>
                    <th>Last Active</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data && data.length > 0 ? (
                    data.map((row) => (
                      <tr key={row.id}>
                        <td>
                          <input
                            type="checkbox"
                            checked={selected.includes(row.id)}
                            onChange={e => {
                              if (e.target.checked) setSelected([...selected, row.id]);
                              else setSelected(selected.filter(id => id !== row.id));
                            }}
                          />
                        </td>
                        <td>
                          <div style={{ fontWeight: '600', color: 'var(--primary-navy)' }}>{row.name}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{row.email}</div>
                        </td>
                        <td style={{ fontFamily: 'monospace', fontWeight: '600' }}>
                          <span className="badge badge-info" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <Globe size={12} /> {row.ip_address}
                          </span>
                        </td>
                        <td>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', fontWeight: 600, color: '#334155' }}>
                            <Monitor size={14} style={{ color: 'var(--text-muted)' }} />
                            {row.browser} on {row.platform}
                          </span>
                        </td>
                        <td style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: '#475569' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <Clock size={12} style={{ color: 'var(--text-muted)' }} /> {row.last_active}
                          </span>
                        </td>
                        <td>
                          <button
                            type="button"
                            className="btn btn-danger btn-xs"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                            onClick={() => {
                              if (confirm('Revoke this session?')) {
                                router.delete(route('admin.sessions.destroy', row.id));
                              }
                            }}
                          >
                            <ShieldX size={12} /> Revoke
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6" style={{ textAlign: "center", padding: "2.5rem", color: "var(--text-muted)" }}>
                        No active session records found matching the search query.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Container */}
            <div className="pagination-container">
              <div className="pagination-info">
                Showing <strong>{fromIdx}</strong> to <strong>{toIdx}</strong> of <strong>{total}</strong> active sessions
              </div>
              <ul className="pagination">
                {sessions.links?.map((link, idx) => (
                  <li key={idx} className={`page-item ${link.active ? 'active' : ''} ${!link.url ? 'disabled' : ''}`}>
                    <button
                      type="button"
                      className="page-link"
                      onClick={() => {
                        if (link.url) {
                          const urlObj = new URL(link.url);
                          const pageVal = urlObj.searchParams.get('page');
                          router.get(route('admin.sessions'), { search, page: pageVal }, { preserveState: true, preserveScroll: true });
                        }
                      }}
                      dangerouslySetInnerHTML={{ __html: link.label }}
                    ></button>
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
