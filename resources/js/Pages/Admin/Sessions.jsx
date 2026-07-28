import { Head, router } from '@inertiajs/react';
import { useState } from 'react';
import AuthenticatedLayout from '../../Layouts/AuthenticatedLayout';
import Card from '../../Components/ui/Card';
import Button from '../../Components/ui/Button';
import Checkbox from '../../Components/ui/Checkbox';
import DataTable from '../../Components/ui/DataTable';
import Pagination from '../../Components/ui/Pagination';
import {
  Monitor,
  Globe,
  Clock,
  ShieldX,
  ShieldAlert,
  Search,
  Users,
  Laptop,
  Smartphone,
  Wifi,
  Activity,
  Sparkles
} from 'lucide-react';

export default function AdminSessions({ sessions, filters = {} }) {
  const [selected, setSelected] = useState([]);
  const [search, setSearch] = useState(filters.search || '');

  const data      = sessions.data || [];
  const total     = sessions.total || 0;
  const perPage   = sessions.per_page || 15;
  const currPage  = sessions.current_page || 1;
  const lastPage  = sessions.last_page || 1;
  const fromIdx   = sessions.from || 0;
  const toIdx     = sessions.to || 0;

  const handleSearch = (e) => {
    e.preventDefault();
    router.get(route('admin.sessions'), { search, page: 1 }, { preserveState: true });
  };

  const handlePageChange = (page) => {
    router.get(route('admin.sessions'), { search, page }, { preserveState: true, preserveScroll: true });
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

  const columns = [
    {
      label: (
        <Checkbox
          checked={allChecked}
          onChange={e => setSelected(e.target.checked ? data.map(s => s.id) : [])}
        />
      ),
      key: 'select',
      render: (_, row) => (
        <Checkbox
          checked={selected.includes(row.id)}
          onChange={e => {
            if (e.target.checked) setSelected([...selected, row.id]);
            else setSelected(selected.filter(id => id !== row.id));
          }}
        />
      )
    },
    {
      label: 'User',
      key: 'name',
      render: (_, row) => (
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center shrink-0">
            {row.name?.substring(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="font-bold text-xs text-slate-900">{row.name}</div>
            <div className="text-[11px] text-slate-400 font-mono">{row.email}</div>
          </div>
        </div>
      )
    },
    {
      label: (
        <span className="flex items-center gap-1.5">
          <Globe className="w-3.5 h-3.5 text-slate-400" /> IP Address
        </span>
      ),
      key: 'ip_address',
      render: (_, row) => (
        <span className="font-mono text-xs font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
          {row.ip_address}
        </span>
      )
    },
    {
      label: (
        <span className="flex items-center gap-1.5">
          <Laptop className="w-3.5 h-3.5 text-slate-400" /> Device
        </span>
      ),
      key: 'browser',
      render: (_, row) => (
        <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
          <Monitor className="w-3.5 h-3.5 text-slate-400" />
          {row.browser} on {row.platform}
        </span>
      )
    },
    {
      label: (
        <span className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-slate-400" /> Last Active
        </span>
      ),
      key: 'last_active',
      render: (_, row) => (
        <span className="text-xs font-mono text-slate-600">{row.last_active}</span>
      )
    },
    {
      label: 'Action',
      key: 'actions',
      render: (_, row) => (
        <button
          type="button"
          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold bg-red-50 text-red-700 border border-red-200 hover:bg-red-600 hover:text-white rounded-lg transition-all shadow-sm"
          onClick={() => {
            if (confirm('Revoke this session?')) {
              router.delete(route('admin.sessions.destroy', row.id));
            }
          }}
        >
          <ShieldX className="w-3.5 h-3.5" /> Revoke
        </button>
      )
    }
  ];

  return (
    <AuthenticatedLayout>
      <Head title="Active Sessions" />

      {/* Page Header */}
      <div className="mb-6 rounded-2xl p-6 bg-gradient-to-r from-white via-indigo-50/40 to-slate-50/70 backdrop-blur-xl border border-slate-200/80 shadow-sm font-sans">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 text-[11px] font-bold text-indigo-700 uppercase bg-indigo-100/70 border border-indigo-200 px-2.5 py-0.5 rounded-full mb-2">
              <Sparkles className="w-3 h-3 text-indigo-600" />
              <span>Admin Security Panel</span>
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <Activity className="w-6 h-6 text-indigo-600" />
              All Active Sessions
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-1">
              Monitor and manage all active user sessions across the system. Revoke any suspicious session instantly.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="text-xs font-bold text-slate-700 bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-slate-500" />
              {total} Total Sessions
            </div>
            {selected.length > 0 && (
              <button
                type="button"
                onClick={revokeSelected}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-lg shadow-md transition-all"
              >
                <ShieldAlert className="w-4 h-4" />
                Revoke {selected.length} Selected
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="mb-4 font-sans">
        <form onSubmit={handleSearch} className="flex items-center gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, email or IP..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs font-semibold bg-white border border-slate-300 rounded-lg shadow-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-[#082d9b] hover:bg-indigo-900 text-white font-bold text-xs rounded-lg shadow transition-all flex items-center gap-1.5"
          >
            <Search className="w-3.5 h-3.5" /> Search
          </button>
          {filters.search && (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                router.get(route('admin.sessions'), {}, { preserveState: true });
              }}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg border border-slate-200 transition-all"
            >
              Clear
            </button>
          )}
        </form>
      </div>

      {/* Sessions Table */}
      <div className="card p-0 border border-slate-200 shadow-sm rounded-xl overflow-hidden mb-4 font-sans">
        <DataTable columns={columns} data={data} />

        {total > 0 && (
          <div className="px-5 py-3.5 border-t border-slate-100 bg-slate-50/60 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs text-slate-500 font-medium">
              Showing <strong className="text-slate-900">{fromIdx}</strong> – <strong className="text-slate-900">{toIdx}</strong> of <strong className="text-slate-900">{total}</strong> sessions
            </div>
            <Pagination
              currentPage={currPage}
              totalPages={lastPage}
              totalItems={total}
              itemsPerPage={perPage}
              onPageChange={handlePageChange}
            />
          </div>
        )}

        {total === 0 && (
          <div className="text-center py-10 text-xs text-slate-400 font-medium">
            <Wifi className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            No active sessions found.
          </div>
        )}
      </div>

    </AuthenticatedLayout>
  );
}
