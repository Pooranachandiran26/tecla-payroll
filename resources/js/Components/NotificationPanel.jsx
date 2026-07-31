import { useState, useEffect, useRef } from 'react';
import { Link, router } from '@inertiajs/react';
import axios from 'axios';
import {
  Bell, BriefcaseBusiness, Clock, CreditCard, FileText,
  MessageSquare, X, CheckCheck, ChevronRight,
} from 'lucide-react';

const TYPE_META = {
  salary_revision: { icon: BriefcaseBusiness, color: '#6366F1', label: 'Salary Revision' },
  leave_request:   { icon: Clock,             color: '#F59E0B', label: 'Leave Request'   },
  bank_change:     { icon: CreditCard,         color: '#10B981', label: 'Bank Change'     },
  employee_query:  { icon: MessageSquare,      color: '#3B82F6', label: 'Employee Query'  },
  payroll_run:     { icon: FileText,           color: '#8B5CF6', label: 'Payroll Run'     },
  contract_expiry: { icon: Clock,              color: '#EF4444', label: 'Contract Expiry' },
  system:          { icon: Bell,               color: '#64748B', label: 'System'          },
};

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60)   return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function NotificationPanel({ unreadCount }) {
  const [open, setOpen]     = useState(false);
  const [items, setItems]   = useState([]);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef(null);

  const safeUnreadCount = Number(unreadCount || 0);

  // Fetch recent 10 notifications when panel opens
  useEffect(() => {
    if (!open) return;
    setLoading(true);

    axios.get(route('notifications.index') + '?json=1&per_page=10')
      .then(res => {
        const notifData = res.data?.notifications?.data || res.data?.props?.notifications?.data || res.data?.data || (Array.isArray(res.data) ? res.data : []);
        setItems(notifData);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load notifications:', err);
        setItems([]);
        setLoading(false);
      });
  }, [open]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleMarkRead = (id) => {
    router.post(route('notifications.read', id), {}, {
      preserveState: true,
      preserveScroll: true,
      onSuccess: () => {
        setItems(prev => (Array.isArray(prev) ? prev : []).map(n => n.id === id ? { ...n, read_at: new Date().toISOString() } : n));
      },
    });
  };

  const handleMarkAll = () => {
    router.post(route('notifications.readAll'), {}, {
      preserveScroll: true,
      onSuccess: () => {
        setItems(prev => (Array.isArray(prev) ? prev : []).map(n => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })));
        setOpen(false);
      },
    });
  };

  const handleItemClick = (item) => {
    if (!item.read_at) handleMarkRead(item.id);
    if (item.url) {
      setOpen(false);
      router.visit(item.url);
    }
  };

  const safeItems = Array.isArray(items) ? items : [];

  return (
    <div className="notif-panel-wrapper" ref={panelRef} style={{ position: 'relative' }}>
      {/* Bell trigger */}
      <button
        className="notif-bell"
        title={safeUnreadCount > 0 ? `${safeUnreadCount} unread notifications` : 'Notifications'}
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        style={{ position: 'relative' }}
      >
        <Bell size={20} />
        {safeUnreadCount > 0 && (
          <span className="notif-badge" style={{ position: 'absolute', top: '-4px', right: '-4px' }}>
            {safeUnreadCount > 99 ? '99+' : safeUnreadCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          className="notif-dropdown"
          style={{
            position: 'absolute',
            top: 'calc(100% + 10px)',
            right: 0,
            width: '360px',
            background: '#FFFFFF',
            borderRadius: '10px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
            border: '1px solid #E2E8F0',
            zIndex: 9999,
            animation: 'notifSlideDown 0.18s ease-out',
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.9rem 1rem', borderBottom: '1px solid #F1F5F9', backgroundColor: '#F8FAFC' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Bell size={16} color="#1E3A8A" />
              <span style={{ fontWeight: 700, fontSize: '0.88rem', color: '#1E293B' }}>Notifications</span>
              {safeUnreadCount > 0 && (
                <span style={{ background: '#1E3A8A', color: '#FFF', fontSize: '0.7rem', fontWeight: 700, borderRadius: '999px', padding: '1px 7px' }}>
                  {safeUnreadCount}
                </span>
              )}
            </div>
            <div style={{ display: 'flex', gap: '4px' }}>
              {safeUnreadCount > 0 && (
                <button
                  onClick={handleMarkAll}
                  style={{ fontSize: '0.75rem', color: '#3B82F6', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px', padding: '2px 6px', borderRadius: '4px' }}
                  title="Mark all as read"
                >
                  <CheckCheck size={13} /> Mark all read
                </button>
              )}
              <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', padding: '2px 4px', borderRadius: '4px' }}>
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Notification list */}
          <div style={{ maxHeight: '360px', overflowY: 'auto' }}>
            {loading && (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#64748B', fontSize: '0.85rem' }}>
                Loading…
              </div>
            )}

            {!loading && safeItems.length === 0 && (
              <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: '#94A3B8' }}>
                <Bell size={32} style={{ margin: '0 auto 0.75rem', display: 'block', opacity: 0.3 }} />
                <p style={{ fontSize: '0.85rem', margin: 0 }}>No notifications yet</p>
              </div>
            )}

            {!loading && safeItems.map((item) => {
              const meta  = TYPE_META[item.type] || TYPE_META.system;
              const Icon  = meta.icon;
              const isUnread = !item.read_at;

              return (
                <div
                  key={item.id}
                  onClick={() => handleItemClick(item)}
                  style={{
                    display: 'flex',
                    gap: '10px',
                    padding: '0.75rem 1rem',
                    cursor: item.url ? 'pointer' : 'default',
                    borderBottom: '1px solid #F8FAFC',
                    borderLeft: isUnread ? `3px solid ${meta.color}` : '3px solid transparent',
                    backgroundColor: isUnread ? '#F8FBFF' : '#FFFFFF',
                    transition: 'background 0.12s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = '#F1F5F9'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = isUnread ? '#F8FBFF' : '#FFFFFF'}
                >
                  {/* Icon */}
                  <div style={{ flexShrink: 0, width: 32, height: 32, borderRadius: '50%', background: meta.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: '2px' }}>
                    <Icon size={15} color={meta.color} />
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '4px' }}>
                      <p style={{ margin: 0, fontSize: '0.82rem', fontWeight: isUnread ? 700 : 500, color: '#1E293B', lineHeight: 1.3 }}>
                        {item.title}
                      </p>
                      <span style={{ fontSize: '0.7rem', color: '#94A3B8', flexShrink: 0, whiteSpace: 'nowrap' }}>
                        {timeAgo(item.created_at)}
                      </span>
                    </div>
                    <p style={{ margin: '3px 0 0', fontSize: '0.77rem', color: '#64748B', lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.body}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div style={{ borderTop: '1px solid #F1F5F9', padding: '0.6rem 1rem', textAlign: 'center' }}>
            <Link
              href={route('notifications.index')}
              style={{ fontSize: '0.8rem', color: '#3B82F6', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '3px', fontWeight: 600 }}
              onClick={() => setOpen(false)}
            >
              View all notifications <ChevronRight size={13} />
            </Link>
          </div>
        </div>
      )}

      {/* Slide-down keyframe */}
      <style>{`
        @keyframes notifSlideDown {
          from { opacity: 0; transform: translateY(-8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
