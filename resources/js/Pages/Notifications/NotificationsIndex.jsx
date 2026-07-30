import React, { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router, usePage } from '@inertiajs/react';
import RoleGuard from '../../Components/RoleGuard.jsx';
import Pagination from '../../Components/ui/Pagination';
import {
  Bell, BriefcaseBusiness, Clock, CreditCard, FileText,
  MessageSquare, CheckCheck, Filter,
} from 'lucide-react';

const TYPE_META = {
  salary_revision: { icon: BriefcaseBusiness, color: '#6366F1', label: 'Salary Revision'  },
  leave_request:   { icon: Clock,             color: '#F59E0B', label: 'Leave Request'    },
  bank_change:     { icon: CreditCard,         color: '#10B981', label: 'Bank Change'      },
  employee_query:  { icon: MessageSquare,      color: '#3B82F6', label: 'Employee Query'   },
  payroll_run:     { icon: FileText,           color: '#8B5CF6', label: 'Payroll Run'      },
  contract_expiry: { icon: Clock,              color: '#EF4444', label: 'Contract Expiry'  },
  system:          { icon: Bell,               color: '#64748B', label: 'System'           },
};

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60)    return 'just now';
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function NotificationsIndex({ notifications = {}, unreadCount = 0, filters = {} }) {
  const [filterStatus, setFilterStatus] = useState(filters.filter || 'all');
  const [filterType,   setFilterType]   = useState(filters.type   || 'all');

  const applyFilters = (newFilter, newType) => {
    const params = {};
    if (newFilter && newFilter !== 'all') params.filter = newFilter;
    if (newType   && newType   !== 'all') params.type   = newType;
    router.get(route('notifications.index'), params, { preserveScroll: true });
  };

  const handleMarkRead = (id) => {
    router.post(route('notifications.read', id), {}, {
      preserveScroll: true,
      preserveState: true,
    });
  };

  const handleMarkAll = () => {
    router.post(route('notifications.readAll'), {}, { preserveScroll: true });
  };

  const data = notifications.data || [];

  return (
    <RoleGuard allowedRoles={['admin', 'manager']}>
      <AuthenticatedLayout>
        <Head title="Notifications — Tecla Payroll" />

        {/* Page Header */}
        <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#1E293B', margin: 0 }}>
              Notification Centre
            </h2>
            <p style={{ color: '#64748B', fontSize: '0.88rem', marginTop: '3px' }}>
              In-app alerts for salary revisions, leave requests, bank changes, and employee queries.
            </p>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAll}
              className="btn btn-navy"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.84rem' }}
            >
              <CheckCheck size={15} /> Mark All Read ({unreadCount})
            </button>
          )}
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1.25rem', backgroundColor: '#FFFFFF', padding: '0.85rem 1rem', borderRadius: '8px', border: '1px solid #E2E8F0', alignItems: 'center' }}>
          <Filter size={15} color="#64748B" />

          <div style={{ display: 'flex', gap: '4px' }}>
            {['all', 'unread', 'read'].map(f => (
              <button
                key={f}
                onClick={() => { setFilterStatus(f); applyFilters(f, filterType); }}
                style={{
                  padding: '4px 12px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 600, border: 'none', cursor: 'pointer',
                  background: filterStatus === f ? '#1E3A8A' : '#F1F5F9',
                  color: filterStatus === f ? '#FFFFFF' : '#475569',
                  transition: 'all 0.15s',
                }}
              >
                {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>

          <div style={{ width: '1px', height: '20px', background: '#E2E8F0' }} />

          <select
            value={filterType}
            onChange={(e) => { setFilterType(e.target.value); applyFilters(filterStatus, e.target.value); }}
            style={{ fontSize: '0.82rem', border: '1px solid #CBD5E1', borderRadius: '6px', padding: '4px 8px', color: '#374151', background: '#FFFFFF' }}
          >
            <option value="all">All Types</option>
            {Object.entries(TYPE_META).map(([key, meta]) => (
              <option key={key} value={key}>{meta.label}</option>
            ))}
          </select>
        </div>

        {/* Notifications Table Card */}
        <div className="card" style={{ backgroundColor: '#FFFFFF', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
          {data.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
              <Bell size={40} style={{ margin: '0 auto 1rem', display: 'block', color: '#CBD5E1' }} />
              <p style={{ color: '#94A3B8', fontSize: '0.9rem', margin: 0 }}>No notifications match your current filters.</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="data-table" style={{ width: '100%' }}>
                <thead>
                  <tr>
                    <th style={{ width: '32px' }}></th>
                    <th>Notification</th>
                    <th>Type</th>
                    <th>Received</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'center' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((item) => {
                    const meta   = TYPE_META[item.type] || TYPE_META.system;
                    const Icon   = meta.icon;
                    const isUnread = !item.read_at;

                    return (
                      <tr
                        key={item.id}
                        style={{ borderLeft: isUnread ? `3px solid ${meta.color}` : '3px solid transparent', backgroundColor: isUnread ? '#F8FBFF' : 'transparent' }}
                      >
                        <td>
                          <div style={{ width: 28, height: 28, borderRadius: '50%', background: meta.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Icon size={13} color={meta.color} />
                          </div>
                        </td>
                        <td>
                          <div style={{ fontWeight: isUnread ? 700 : 500, fontSize: '0.85rem', color: '#1E293B' }}>{item.title}</div>
                          <div style={{ fontSize: '0.77rem', color: '#64748B', marginTop: '2px' }}>{item.body}</div>
                        </td>
                        <td>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.77rem', fontWeight: 600, color: meta.color, background: meta.color + '15', padding: '2px 8px', borderRadius: '12px' }}>
                            {meta.label}
                          </span>
                        </td>
                        <td style={{ fontSize: '0.8rem', color: '#64748B', whiteSpace: 'nowrap' }}>
                          {timeAgo(item.created_at)}
                        </td>
                        <td>
                          {isUnread
                            ? <span className="badge badge-primary" style={{ fontSize: '0.72rem' }}>Unread</span>
                            : <span className="badge badge-secondary" style={{ fontSize: '0.72rem' }}>Read</span>
                          }
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                            {item.url && (
                              <a
                                href={item.url}
                                className="btn btn-navy btn-xs"
                                style={{ fontSize: '0.75rem', padding: '3px 10px' }}
                              >
                                View
                              </a>
                            )}
                            {isUnread && (
                              <button
                                onClick={() => handleMarkRead(item.id)}
                                className="btn btn-xs"
                                style={{ fontSize: '0.75rem', padding: '3px 10px', background: '#F1F5F9', border: '1px solid #E2E8F0', color: '#475569', borderRadius: '6px', cursor: 'pointer' }}
                              >
                                Mark read
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {notifications.total > 0 && (
            <div style={{ padding: '1rem 1.25rem', borderTop: '1px solid #F1F5F9', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ fontSize: '0.82rem', color: '#64748B' }}>
                Showing <strong>{notifications.from || 0}</strong> to <strong>{notifications.to || 0}</strong> of <strong>{notifications.total}</strong> notifications
              </div>
              <Pagination
                currentPage={notifications.current_page}
                totalPages={notifications.last_page}
                totalItems={notifications.total}
                itemsPerPage={notifications.per_page}
                onPageChange={(page) => {
                  const params = new URLSearchParams(window.location.search);
                  params.set('page', page);
                  window.location.search = params.toString();
                }}
              />
            </div>
          )}
        </div>
      </AuthenticatedLayout>
    </RoleGuard>
  );
}
