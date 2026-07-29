import React, { useState } from 'react';
import AuthenticatedLayout from '../../Layouts/AuthenticatedLayout';
import { Head, Link, router } from '@inertiajs/react';
import RoleGuard from '../../Components/RoleGuard.jsx';
import useToast from '../../Hooks/useToast';
import {
  RefreshCw,
  Upload,
  Search,
  Calendar,
  Filter,
  Fingerprint,
  FileSpreadsheet,
  PenLine,
  Umbrella,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  AlertTriangle,
  SlidersHorizontal
} from 'lucide-react';

export default function LiveAttendanceMonitor({ clients = [], punches = {}, selectedClientId, selectedDate }) {
  const { showToast } = useToast();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [clientId, setClientId] = useState(selectedClientId || '');
  const [date, setDate] = useState(selectedDate || new Date().toISOString().split('T')[0]);
  const [search, setSearch] = useState('');

  const todayStr = new Date().toISOString().split('T')[0];
  const yesterdayStr = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  const isToday = date === todayStr;

  // Defensive data extraction
  const clientsList = Array.isArray(clients) ? clients : [];
  const punchesObj = punches || {};
  const punchesList = Array.isArray(punchesObj) ? punchesObj : (punchesObj.data || []);
  const punchesLinks = Array.isArray(punchesObj) ? [] : (punchesObj.links || []);
  const punchesTotal = Array.isArray(punchesObj) ? punchesObj.length : (punchesObj.total || 0);
  const punchesFrom = Array.isArray(punchesObj) ? (punchesObj.length > 0 ? 1 : 0) : (punchesObj.from || 0);
  const punchesTo = Array.isArray(punchesObj) ? punchesObj.length : (punchesObj.to || 0);

  const applyFilters = (newClientId = clientId, newDate = date) => {
    router.get(route('payroll.live-monitor'), {
      client_id: newClientId || undefined,
      date: newDate || undefined,
      search: search || undefined
    }, { preserveState: true, preserveScroll: true });
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      applyFilters();
    }
  };

  const handleClientChange = (e) => {
    const val = e.target.value;
    setClientId(val);
    applyFilters(val, date);
  };

  const handleDateChange = (newDate) => {
    setDate(newDate);
    applyFilters(clientId, newDate);
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    router.reload({
      onFinish: () => {
        setIsRefreshing(false);
        showToast({
          type: 'success',
          title: 'Live Feeds Updated',
          message: 'The attendance list has been successfully refreshed.',
        });
      }
    });
  };

  const filteredPunches = punchesList.filter(p => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (p.name || '').toLowerCase().includes(q) || (p.code || '').toLowerCase().includes(q);
  });

  const presentCount = punchesList.filter(p => p.status === 'present').length;
  const absentCount  = punchesList.filter(p => p.status === 'absent').length;
  const leaveCount   = punchesList.filter(p => p.status === 'leave').length;

  const getSourceBadge = (source) => {
    const srcMap = {
      'live_punch': { icon: <Fingerprint size={13} />, label: 'Live Punch', badgeClass: 'badge-success' },
      'uploaded':   { icon: <FileSpreadsheet size={13} />, label: 'Uploaded',   badgeClass: 'badge-info' },
      'override':   { icon: <PenLine size={13} />,      label: 'Override',   badgeClass: 'badge-warning' },
      'leave':      { icon: <Umbrella size={13} />,     label: 'Leave',      badgeClass: 'badge-secondary' },
    };
    return srcMap[(source || '').toLowerCase()] || { icon: <Clock size={13} />, label: source || 'Live Punch', badgeClass: 'badge-secondary' };
  };

  return (
    <RoleGuard allowedRoles={['admin', 'manager']}>
      <AuthenticatedLayout>
        <Head title="Live Attendance Monitor" />
        <div className="legacy-react-wrapper">

          {/* Header Row */}
          <div className="flex-row-between">
            <div>
              <h2>Live Attendance Monitor</h2>
              <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
                {isToday
                  ? "Today's live punch feed — showing real-time clock-in status. Monthly totals for payroll are computed in Attendance Review."
                  : `Punch feed for ${new Date(date + 'T00:00:00').toLocaleDateString('en-IN', { month: 'long', day: 'numeric', year: 'numeric' })}. Monthly totals are computed in Attendance Review.`}
              </p>
            </div>
            <div style={{ display: "flex", gap: "0.75rem" }}>
              <button
                type="button"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="btn btn-secondary"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} /> Refresh Feed
              </button>
              <Link 
                href={route('payroll.attendance-upload')} 
                className="btn btn-navy"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <Upload size={14} /> Upload Spreadsheet
              </Link>
            </div>
          </div>

          {/* Filter Card */}
          <div className="card" style={{ padding: "1rem", marginBottom: "1.5rem", display: "flex", gap: "1rem", alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ fontSize: "0.85rem", fontWeight: "600", color: "var(--primary-navy)", display: "inline-flex", alignItems: "center", gap: "4px" }}>
              <Filter size={14} /> Filters:
            </div>

            <div style={{ flex: "1", minWidth: "200px" }}>
              <input
                type="text"
                className="form-control"
                placeholder="Search by Employee Code or Name..."
                style={{ padding: "0.4rem 0.75rem" }}
                value={search}
                onChange={e => setSearch(e.target.value)}
                onKeyPress={handleKeyPress}
              />
            </div>

            <div>
              <select
                className="form-control"
                style={{ padding: "0.4rem 0.75rem" }}
                value={clientId}
                onChange={handleClientChange}
              >
                <option value="">All Client Partners</option>
                {clientsList.map(c => (
                  <option key={c.id} value={c.id}>{c.company_name}</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Calendar size={14} style={{ color: 'var(--text-muted)' }} />
              <input
                type="date"
                className="form-control"
                style={{ padding: "0.4rem 0.75rem" }}
                value={date}
                onChange={e => handleDateChange(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', gap: '0.4rem' }}>
              <button
                type="button"
                onClick={() => handleDateChange(todayStr)}
                className={`btn ${date === todayStr ? 'btn-navy' : 'btn-secondary'}`}
                style={{ padding: "0.4rem 0.75rem", fontSize: "0.8rem" }}
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => handleDateChange(yesterdayStr)}
                className={`btn ${date === yesterdayStr ? 'btn-navy' : 'btn-secondary'}`}
                style={{ padding: "0.4rem 0.75rem", fontSize: "0.8rem" }}
              >
                Yesterday
              </button>
            </div>

            <button
              className="btn btn-navy"
              style={{ padding: "0.4rem 1rem", display: 'inline-flex', alignItems: 'center', gap: '5px' }}
              onClick={() => applyFilters()}
            >
              <Search size={14} /> Apply
            </button>
          </div>

          {/* Attendance Source Legend & Alert */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.25rem', fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600 }}>
              <span style={{ color: 'var(--primary-navy)', fontWeight: 700, textTransform: 'uppercase', fontSize: '0.75rem' }}>Source Legend:</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><Fingerprint size={14} style={{ color: '#16a34a' }} /> Live Punch</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><FileSpreadsheet size={14} style={{ color: '#0284c7' }} /> Uploaded</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><PenLine size={14} style={{ color: '#ea580c' }} /> Override</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><Umbrella size={14} style={{ color: '#64748b' }} /> Leave</span>
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
              Resets daily. Monthly totals calculate in Attendance Review.
            </div>
          </div>

          {/* Priority Alert Banner */}
          <div className="card" style={{ padding: '0.75rem 1rem', marginBottom: '1.25rem', background: '#fffbeb', border: '1px solid #fde68a', color: '#92400e', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertTriangle size={16} style={{ color: '#d97706', flexShrink: 0 }} />
            <span>If both a punch record and an uploaded timesheet exist for the same employee, the <strong>live punch always wins</strong> in payroll calculations.</span>
          </div>

          {/* Table Card */}
          <div className="card">
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Emp Code</th>
                    <th>Employee Name</th>
                    <th>Client Partner</th>
                    <th>Source</th>
                    <th>Shift Type</th>
                    <th>Clock In</th>
                    <th>Clock Out</th>
                    <th>Hours Logged</th>
                    <th>Status</th>
                    <th>Override</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPunches && filteredPunches.length > 0 ? (
                    filteredPunches.map((row, idx) => {
                      const srcBadge = getSourceBadge(row.source);
                      return (
                        <tr key={idx}>
                          <td style={{ fontWeight: '600', fontFamily: 'monospace' }}>{row.code}</td>
                          <td>
                            <div style={{ fontWeight: '600', color: 'var(--primary-navy)' }}>{row.name}</div>
                          </td>
                          <td>{row.clientName}</td>
                          <td>
                            <span className={`badge ${srcBadge.badgeClass}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              {srcBadge.icon} {srcBadge.label}
                            </span>
                          </td>
                          <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{row.shift || '—'}</td>
                          <td style={{ fontFamily: 'monospace', fontWeight: '600' }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <Clock size={12} style={{ color: '#16a34a' }} /> {row.in || '—'}
                            </span>
                          </td>
                          <td style={{ fontFamily: 'monospace', fontWeight: '600' }}>
                            {row.out === 'working' ? (
                              <span className="badge badge-warning">Still Working</span>
                            ) : (
                              <span>{row.out || '—'}</span>
                            )}
                          </td>
                          <td style={{ fontWeight: '700', fontFamily: 'monospace' }}>{row.hours || '—'}</td>
                          <td>
                            <span className={`badge badge-${row.status === 'present' ? 'success' : (row.status === 'leave' ? 'warning' : 'danger')}`}>
                              {row.status === 'present' ? 'Present' : (row.status === 'leave' ? 'On Leave' : 'Not Clocked In')}
                            </span>
                          </td>
                          <td>
                            <button
                              className="btn btn-secondary btn-xs"
                              disabled
                              style={{ opacity: 0.6, cursor: 'not-allowed', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                              title="Biometric overrides are handled directly in the Employee Portal"
                            >
                              <SlidersHorizontal size={12} /> Disabled
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan="10" style={{ textAlign: "center", padding: "2.5rem", color: "var(--text-muted)" }}>
                        No punch records found for the selected date and filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Container */}
            {punchesLinks && punchesLinks.length > 0 && (
              <div className="pagination-container">
                <div className="pagination-info">
                  Showing <strong>{punchesFrom}</strong> to <strong>{punchesTo}</strong> of <strong>{punchesTotal}</strong> punch records
                </div>
                <ul className="pagination">
                  {punchesLinks.map((link, idx) => (
                    <li key={idx} className={`page-item ${link.active ? 'active' : ''} ${!link.url ? 'disabled' : ''}`}>
                      <Link className="page-link" href={link.url || '#'} dangerouslySetInnerHTML={{ __html: link.label }}></Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Summary Footer Card */}
          <div className="card" style={{ padding: '1rem 1.25rem', marginTop: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap', fontSize: '0.85rem', fontWeight: 600 }}>
              <span style={{ color: 'var(--primary-navy)', fontWeight: 700, textTransform: 'uppercase', fontSize: '0.75rem' }}>Daily Summary:</span>
              <span style={{ color: '#15803d', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <CheckCircle2 size={14} /> {presentCount} Present
              </span>
              <span style={{ color: '#b91c1c', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <XCircle size={14} /> {absentCount} Not Clocked In
              </span>
              <span style={{ color: '#b45309', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <Umbrella size={14} /> {leaveCount} On Leave
              </span>
            </div>
            <Link href={route('payroll.attendance-review')} className="btn btn-navy" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              Attendance Review <ArrowRight size={14} />
            </Link>
          </div>

        </div>
      </AuthenticatedLayout>
    </RoleGuard>
  );
}
