import React, { useState, useCallback } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import DataTable from '@/Components/ui/DataTable';
import {
  ArrowLeft, Download, CheckCircle2, AlertCircle, Clock, Eye,
  MoreVertical, ChevronLeft, ChevronRight, Search, FileDown, FileText,
  AlertTriangle, Users, TrendingUp, ShieldCheck, Calendar, Filter
} from 'lucide-react';

/* ─── Reusable metric card matching Dashboard style with overflow protection ─── */
const MetricCard = ({ label, value, iconBg, icon, footerLeft, footerRight, footerLeftColor = 'text-emerald-700', isCode = false }) => {
  const isNotConfigured = value === 'Not Configured' || value === 'N/A' || !value;

  return (
    <div className="card metric-card hover-lift min-w-0" style={{ overflow: 'hidden', padding: '1rem' }}>
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="metric-label text-xs uppercase tracking-wider font-semibold text-slate-500">{label}</span>
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${iconBg}`}>
            {icon}
          </div>
        </div>

        <div className="min-h-[2.25rem] flex items-center">
          {isCode ? (
            isNotConfigured ? (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                Not Configured
              </span>
            ) : (
              <span 
                className="font-mono text-xs sm:text-sm font-bold text-slate-800 bg-slate-50 border border-slate-200/80 rounded px-2 py-1 truncate block w-full"
                title={String(value)}
              >
                {value}
              </span>
            )
          ) : (
            <div className="metric-value text-2xl font-bold text-slate-800 tracking-tight truncate w-full" title={String(value)}>
              {value}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs mt-3">
        <span className={`font-semibold flex items-center gap-1 truncate ${footerLeftColor}`}>{footerLeft}</span>
        <span className="text-slate-400 font-normal whitespace-nowrap ml-2">{footerRight}</span>
      </div>
    </div>
  );
};

/* ─── Status pill ─── */
const StatusPill = ({ status }) => {
  if (status === 'filed') return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Filed
    </span>
  );
  if (status === 'not_generated') return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
      Not Generated
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200/60">
      <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span> Pending
    </span>
  );
};

/* ─── Tab list ─── */
const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'pf_ecr',  label: 'PF ECR' },
  { key: 'esi',     label: 'ESI' },
  { key: 'pt',      label: 'PT' },
  { key: 'tds_24q', label: 'TDS 24Q' },
  { key: 'clra',    label: 'CLRA' },
  { key: 'gstr1',   label: 'GSTR-1' },
  { key: 'audit',   label: 'Audit Pack' },
];

/* ─── Statutory summary row with clean non-contradictory status ─── */
const StatRow = ({ abbr, status, dueDate, filedOn }) => {
  const isFiled = status === 'filed';
  const isNotGenerated = status === 'not_generated';

  return (
    <div className="flex items-center justify-between gap-3 p-3 bg-white border border-slate-100 rounded-xl hover:border-blue-200 transition-all shadow-sm">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-16 text-xs font-bold text-slate-700 uppercase tracking-wider truncate" title={abbr}>
          {abbr}
        </div>
        <StatusPill status={status} />
      </div>
      <div className="flex items-center gap-3 text-xs text-right flex-shrink-0">
        <span className="text-slate-400 font-normal">Due: <strong className="text-slate-600 font-semibold">{dueDate || '—'}</strong></span>
        {filedOn ? (
          <span className="text-emerald-700 font-semibold flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> {filedOn}
          </span>
        ) : isFiled ? (
          <span className="text-emerald-700 font-semibold flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Auto-Filed
          </span>
        ) : isNotGenerated ? (
          <span className="text-slate-400 italic">Not Generated</span>
        ) : (
          <span className="text-amber-600 font-medium">Pending Filing</span>
        )}
      </div>
    </div>
  );
};

export default function ClientComplianceDetails({
  client = {},
  period = '',
  statutory_statuses = {},
  pf_batches = { data: [], current_page: 1, last_page: 1, per_page: 10, total: 0, from: 0, to: 0 },
}) {
  const [activeTab, setActiveTab]   = useState('pf_ecr');
  const [search, setSearch]         = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [perPage, setPerPage]       = useState(10);

  // SERVER-SIDE pagination: navigate via Inertia with query params
  const navigate = useCallback((params = {}) => {
    router.get(
      route('compliance.client_details', client.id),
      { ...params },
      { preserveState: true, preserveScroll: true, replace: true }
    );
  }, [client.id]);

  const handleSearch = () => navigate({ search, status: statusFilter, per_page: perPage, pf_page: 1 });
  const handlePage   = (p) => navigate({ search, status: statusFilter, per_page: perPage, pf_page: p });
  const handlePerPage = (v) => { setPerPage(v); navigate({ search, status: statusFilter, per_page: v, pf_page: 1 }); };

  const fmt = (v) => v != null ? Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '—';
  const fmtMonth = (d) => {
    if (!d) return '—';
    try { return new Date(String(d)).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }); }
    catch { return String(d).substring(0, 7); }
  };
  const fmtDate = (d) => {
    if (!d) return '—';
    try {
      const dt = new Date(d);
      return (
        <div>
          <div>{dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
          <div className="text-[10px] text-gray-400">{dt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</div>
        </div>
      );
    } catch { return '—'; }
  };

  /* ── DataTable columns ── */
  const pfColumns = [
    {
      key: 'batch_no',
      label: 'Batch #',
      render: (_, row) => (
        <span className="font-mono font-semibold text-gray-800 text-xs">
          ECR-{String(row.created_at || new Date().getFullYear()).substring(0, 4)}-{String(row.id).padStart(2,'0')}-01
        </span>
      )
    },
    {
      key: 'wage_month',
      label: 'Month',
      render: (v) => <span className="text-gray-700">{fmtMonth(v)}</span>
    },
    {
      key: 'employee_count',
      label: 'Total Employees',
      render: (v) => <span className="font-semibold text-center block">{v || '—'}</span>
    },
    {
      key: 'total_ee_epf',
      label: 'EE Share (₹)',
      render: (v) => <span className="font-semibold text-gray-800">{fmt(v)}</span>
    },
    {
      key: 'total_er_epf',
      label: 'ER Share (₹)',
      render: (v) => <span className="font-semibold text-gray-800">{fmt(v)}</span>
    },
    {
      key: 'trrn',
      label: 'TRRN / Challan',
      render: (v, row) => (
        <span className="font-mono text-xs text-gray-600">
          {v || row.challan_number || <span className="text-gray-400 italic">Pending</span>}
        </span>
      )
    },
    {
      key: 'created_at',
      label: 'Filed On',
      render: (v) => <span className="text-xs">{fmtDate(v)}</span>
    },
    {
      key: 'status',
      label: 'Status',
      render: (v) => <StatusPill status={v === 'generated' ? 'filed' : (v || 'filed')} />
    },
    {
      key: 'actions',
      label: 'Action',
      render: (_, row) => (
        <div className="flex items-center gap-3">
          <a href={route('compliance.pf_ecr.download', row.id)}
            className="inline-flex items-center gap-1 text-blue-700 hover:text-blue-900 font-semibold text-xs transition-colors">
            <Eye className="w-3.5 h-3.5" /> View
          </a>
          <a href={route('compliance.pf_ecr.download', row.id)}
            className="inline-flex items-center gap-1 text-gray-500 hover:text-gray-800 font-semibold text-xs transition-colors">
            <Download className="w-3.5 h-3.5" /> Download .txt
          </a>
          <button className="text-gray-400 hover:text-gray-600 transition-colors">
            <MoreVertical className="w-3.5 h-3.5" />
          </button>
        </div>
      )
    }
  ];

  const ss = statutory_statuses;

  return (
    <AuthenticatedLayout>
      <Head title={`Client Compliance — ${client.name}`} />

      {/* ── Breadcrumb ── */}
      <div className="bg-white border-b border-gray-200 px-6 py-2.5 flex items-center gap-2 text-xs text-gray-500">
        <Link href={route('compliance.index')} className="hover:text-blue-700 transition-colors font-medium">
          Statutory Reports
        </Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-gray-800 font-semibold">Client Compliance Details</span>
      </div>

      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '1.5rem' }} className="space-y-5">

        {/* ── Page Header ── */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Link href={route('compliance.index')}
              className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-blue-700 mb-2 transition-colors font-medium">
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Register
            </Link>
            <div className="flex items-center gap-3">
              <h1 style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--primary-navy)' }}>
                {client.name}
              </h1>
              <span className={`badge ${client.status === 'active' ? 'badge-success' : 'badge-warning'}`}>
                {client.status === 'active' ? 'Active' : client.status}
              </span>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 2 }}>
              Headcount: <strong>{client.headcount}</strong>
            </p>
          </div>

          <button className="btn btn-secondary flex items-center gap-2">
            <FileDown className="w-4 h-4" /> Download Summary
          </button>
        </div>

        {/* ── KPI Metric Cards with Strict Grid Overflow Protection ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            label="Total Employees"
            value={client.headcount || 0}
            iconBg="bg-indigo-50 text-indigo-700"
            icon={<Users className="w-4 h-4" />}
            footerLeft={<><TrendingUp className="w-3.5 h-3.5" /> Active Staff</>}
            footerRight="Current Period"
            footerLeftColor="text-emerald-700"
          />
          <MetricCard
            label="PF Establishment"
            value={client.pf_code || 'Not Configured'}
            iconBg="bg-blue-50 text-blue-700"
            icon={<ShieldCheck className="w-4 h-4" />}
            footerLeft={ss.pf?.status === 'filed' ? 'Filed' : 'Pending Filing'}
            footerRight={ss.pf?.due_date ? `Due: ${ss.pf.due_date}` : ''}
            footerLeftColor={ss.pf?.status === 'filed' ? 'text-emerald-700' : 'text-red-600'}
            isCode={true}
          />
          <MetricCard
            label="ESI Code"
            value={client.esi_code || 'Not Configured'}
            iconBg="bg-emerald-50 text-emerald-700"
            icon={<ShieldCheck className="w-4 h-4" />}
            footerLeft={ss.esi?.status === 'filed' ? 'Filed' : 'Pending Filing'}
            footerRight={ss.esi?.due_date ? `Due: ${ss.esi.due_date}` : ''}
            footerLeftColor={ss.esi?.status === 'filed' ? 'text-emerald-700' : 'text-red-600'}
            isCode={true}
          />
          <MetricCard
            label="ECR Batches Filed"
            value={pf_batches.total}
            iconBg="bg-amber-50 text-amber-700"
            icon={<FileText className="w-4 h-4" />}
            footerLeft={<><Calendar className="w-3.5 h-3.5" /> {period}</>}
            footerRight="All Time"
            footerLeftColor="text-amber-700"
          />
        </div>

        {/* ── Statutory Status Summary Strip ── */}
        <div className="card p-4">
          <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--primary-navy)', marginBottom: '0.75rem' }}>
            Statutory Filing Status — {period}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <StatRow abbr="PF (ECR)"   status={ss.pf?.status}    dueDate={ss.pf?.due_date}    filedOn={ss.pf?.filed_on} />
            <StatRow abbr="ESI"        status={ss.esi?.status}   dueDate={ss.esi?.due_date}   filedOn={ss.esi?.filed_on} />
            <StatRow abbr="PT"         status={ss.pt?.status}    dueDate={ss.pt?.due_date}    filedOn={ss.pt?.filed_on} />
            <StatRow abbr="TDS (24Q)"  status={ss.tds?.status}   dueDate={ss.tds?.due_date}   filedOn={ss.tds?.filed_on} />
            <StatRow abbr="CLRA"       status={ss.clra?.status}  dueDate={ss.clra?.due_date}  filedOn={ss.clra?.filed_on} />
            <StatRow abbr="GSTR-1"     status="not_generated"    dueDate={ss.gstr1?.due_date || '—'} filedOn={null} />
          </div>
        </div>

        {/* ── Tab Navigation ── */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', overflowX: 'auto' }}>
            {TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                style={{
                  padding: '0.75rem 1.25rem',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                  borderBottom: activeTab === tab.key ? '2px solid var(--primary-blue)' : '2px solid transparent',
                  color: activeTab === tab.key ? 'var(--primary-blue)' : 'var(--text-muted)',
                  background: activeTab === tab.key ? 'rgba(59,130,246,0.04)' : 'transparent',
                  transition: 'all 0.15s',
                  cursor: 'pointer',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* ── PF ECR Tab ── */}
          {activeTab === 'pf_ecr' && (
            <div style={{ padding: '1.25rem' }}>
              {/* Sub-header */}
              <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                    <FileText className="w-4 h-4 text-blue-700" />
                  </div>
                  <div>
                    <h3 style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--primary-navy)' }}>
                      PF ECR – Filed Records
                    </h3>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 1 }}>
                      Electronic Challan cum Return (ECR) filed with EPFO portal.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <select className="form-control" style={{ width: 'auto', fontSize: '0.8rem', padding: '0.35rem 0.6rem' }}>
                    <option>2026-27</option><option>2025-26</option><option>2024-25</option>
                  </select>
                  <select className="form-control" style={{ width: 'auto', fontSize: '0.8rem', padding: '0.35rem 0.6rem' }}>
                    <option>August</option><option>July</option><option>June</option>
                  </select>
                  <a href={route('compliance.index')} className="btn btn-primary flex items-center gap-1.5" style={{ fontSize: '0.8rem', padding: '0.4rem 0.9rem' }}>
                    <FileDown className="w-3.5 h-3.5" /> Generate ECR (.txt)
                  </a>
                </div>
              </div>

              {/* Filters Row (matches Employees Directory style) */}
              <div className="flex flex-wrap items-center gap-3 mb-4 p-3 rounded-lg" style={{ background: '#f8fafc', border: '1px solid var(--border-color)' }}>
                <Filter className="w-4 h-4 text-gray-500 flex-shrink-0" />
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>Filters:</span>
                <div className="relative flex-1" style={{ minWidth: 200, maxWidth: 320 }}>
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by Batch # or TRRN..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSearch()}
                    className="form-control"
                    style={{ paddingLeft: '2rem', fontSize: '0.8rem', width: '100%' }}
                  />
                </div>
                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                  className="form-control"
                  style={{ width: 'auto', fontSize: '0.8rem' }}
                >
                  <option value="all">All Status</option>
                  <option value="generated">Generated</option>
                  <option value="filed">Filed</option>
                </select>
                <button onClick={handleSearch} className="btn btn-primary flex items-center gap-1.5" style={{ fontSize: '0.8rem', padding: '0.4rem 0.9rem' }}>
                  <Search className="w-3.5 h-3.5" /> Apply
                </button>
                <div className="flex items-center gap-1.5 ml-auto">
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Show</span>
                  <select
                    value={perPage}
                    onChange={e => handlePerPage(Number(e.target.value))}
                    className="form-control"
                    style={{ width: 64, fontSize: '0.8rem' }}
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                  </select>
                </div>
              </div>

              {/* DataTable — data comes server-paginated from pf_batches.data */}
              <DataTable columns={pfColumns} data={pf_batches.data} keyField="id" />

              {/* Server-Side Pagination Controls */}
              {pf_batches.total > 0 && (
                <div className="flex items-center justify-between mt-4 pt-3" style={{ borderTop: '1px solid var(--border-color)' }}>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    Showing {pf_batches.from} to {pf_batches.to} of {pf_batches.total} records
                  </p>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handlePage(pf_batches.current_page - 1)}
                      disabled={pf_batches.current_page <= 1}
                      className="btn btn-secondary"
                      style={{ padding: '0.3rem 0.6rem', minWidth: 32, opacity: pf_batches.current_page <= 1 ? 0.4 : 1 }}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    {Array.from({ length: Math.min(pf_batches.last_page, 5) }, (_, i) => i + 1).map(p => (
                      <button
                        key={p}
                        onClick={() => handlePage(p)}
                        className={`btn ${pf_batches.current_page === p ? 'btn-primary' : 'btn-secondary'}`}
                        style={{ padding: '0.3rem 0.6rem', minWidth: 32, fontSize: '0.78rem' }}
                      >
                        {p}
                      </button>
                    ))}
                    <button
                      onClick={() => handlePage(pf_batches.current_page + 1)}
                      disabled={pf_batches.current_page >= pf_batches.last_page}
                      className="btn btn-secondary"
                      style={{ padding: '0.3rem 0.6rem', minWidth: 32, opacity: pf_batches.current_page >= pf_batches.last_page ? 0.4 : 1 }}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Overview Tab ── */}
          {activeTab === 'overview' && (
            <div style={{ padding: '1.25rem' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--primary-navy)', marginBottom: '1rem' }}>
                Client Statutory Profile
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {[
                  { label: 'PF Est. Code', value: client.pf_code },
                  { label: 'ESI Code', value: client.esi_code },
                  { label: 'PAN', value: client.pan },
                  { label: 'TAN', value: client.tan },
                  { label: 'GSTIN', value: client.gstin },
                  { label: 'Headcount', value: `${client.headcount} Employees` },
                ].map(item => (
                  <div key={item.label} className="card p-3 min-w-0" style={{ background: '#f8fafc' }}>
                    <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 4 }}>{item.label}</div>
                    <div className="font-mono font-bold text-slate-800 text-sm truncate" title={item.value || '—'}>
                      {item.value === 'Not Configured' ? (
                        <span className="badge badge-warning text-xs font-normal">Not Configured</span>
                      ) : (
                        item.value || '—'
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Other tabs ── */}
          {!['pf_ecr', 'overview'].includes(activeTab) && (
            <div style={{ padding: '3rem', textAlign: 'center' }}>
              <FileText style={{ width: 40, height: 40, color: '#cbd5e1', margin: '0 auto 0.75rem' }} />
              <p style={{ fontWeight: 600, color: 'var(--text-muted)' }}>
                {TABS.find(t => t.key === activeTab)?.label} Records
              </p>
              <p style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: 4 }}>
                Generate the relevant report from the Statutory Compliance Center to view details here.
              </p>
            </div>
          )}
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
