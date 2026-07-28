import React, { useState } from 'react';
import AuthenticatedLayout from '../../Layouts/AuthenticatedLayout';
import { Head, Link, router } from '@inertiajs/react';
import Button from '../../Components/ui/Button';
import DataTable from '../../Components/ui/DataTable';
import Badge from '../../Components/ui/Badge';
import Select from '../../Components/ui/Select';
import Input from '../../Components/ui/Input';
import RoleGuard from '../../Components/RoleGuard.jsx';
import Pagination from '../../Components/ui/Pagination';
import useToast from '../../Hooks/useToast';
import {
  RefreshCw,
  Upload,
  Search,
  Calendar,
  Radio,
  FileSpreadsheet,
  SlidersHorizontal,
  ArrowRight,
  CheckCircle2,
  XCircle,
  Umbrella,
  Info,
  Fingerprint,
  FileClock,
  PenLine,
  UserCheck,
  Users,
  AlertTriangle,
  Clock
} from 'lucide-react';

export default function LiveAttendanceMonitor({ clients, punches, selectedClientId, selectedDate }) {
  const { showToast } = useToast();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [clientId, setClientId] = useState(selectedClientId || '');
  const [date, setDate] = useState(selectedDate);
  const [search, setSearch] = useState('');

  const handleClientChange = (newClientId) => {
    setClientId(newClientId);
    router.get(route('payroll.live-monitor'), { client_id: newClientId, date: date }, { preserveState: false });
  };

  const handleDateChange = (newDate) => {
    setDate(newDate);
    router.get(route('payroll.live-monitor'), { client_id: clientId, date: newDate }, { preserveState: false });
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

  const filteredPunches = (punches.data || []).filter(p => {
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const presentCount = (punches.data || []).filter(p => p.status === 'present').length;
  const absentCount  = (punches.data || []).filter(p => p.status === 'absent').length;
  const leaveCount   = (punches.data || []).filter(p => p.status === 'leave').length;

  const todayStr     = new Date().toISOString().split('T')[0];
  const yesterdayStr = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  const isToday      = date === todayStr;

  const columns = [
    {
      header: 'Employee',
      accessor: 'employee',
      cell: (row) => (
        <div>
          <div className="font-bold text-slate-900 text-xs">{row.name}</div>
          <div className="text-[11px] text-slate-400 font-mono mt-0.5">{row.code}</div>
        </div>
      )
    },
    {
      header: 'Client Partner',
      accessor: 'clientName',
      cell: (row) => <span className="text-xs font-medium text-slate-700">{row.clientName}</span>
    },
    {
      header: 'Source',
      accessor: 'source',
      cell: (row) => {
        const srcMap = {
          'live_punch': { icon: <Fingerprint className="w-3.5 h-3.5 text-emerald-600" />, label: 'Live Punch', color: 'text-emerald-700' },
          'uploaded':   { icon: <FileSpreadsheet className="w-3.5 h-3.5 text-blue-600" />, label: 'Uploaded',   color: 'text-blue-700' },
          'override':   { icon: <PenLine className="w-3.5 h-3.5 text-orange-500" />,      label: 'Override',   color: 'text-orange-700' },
          'leave':      { icon: <Umbrella className="w-3.5 h-3.5 text-slate-500" />,      label: 'Leave',      color: 'text-slate-600' },
        };
        const src = srcMap[row.source?.toLowerCase()] || { icon: <FileClock className="w-3.5 h-3.5 text-slate-400" />, label: row.source, color: 'text-slate-600' };
        return (
          <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${src.color}`}>
            {src.icon} {src.label}
          </span>
        );
      }
    },
    {
      header: 'Shift Type',
      accessor: 'shift',
      cell: (row) => <span className="text-xs text-slate-600 font-medium">{row.shift || '—'}</span>
    },
    {
      header: 'Clock In',
      accessor: 'in',
      cell: (row) => (
        <span className="text-xs font-mono font-semibold text-slate-800 flex items-center gap-1">
          <Clock className="w-3 h-3 text-emerald-500" /> {row.in || '—'}
        </span>
      )
    },
    {
      header: 'Clock Out',
      accessor: 'out',
      cell: (row) => row.out === 'working'
        ? <Badge type="warning"><span className="flex items-center gap-1"><Radio className="w-3 h-3 animate-pulse" /> Still Working</span></Badge>
        : <span className="text-xs font-mono font-semibold text-slate-700 flex items-center gap-1"><Clock className="w-3 h-3 text-slate-400" /> {row.out || '—'}</span>
    },
    {
      header: 'Hours Logged',
      accessor: 'hours',
      cell: (row) => <span className="font-bold font-mono text-sm text-slate-900">{row.hours || '—'}</span>
    },
    {
      header: 'Status',
      accessor: 'status',
      cell: (row) => (
        <Badge type={row.status === 'present' ? 'success' : (row.status === 'leave' ? 'warning' : 'danger')}>
          <span className="flex items-center gap-1">
            {row.status === 'present'
              ? <CheckCircle2 className="w-3 h-3" />
              : row.status === 'leave'
                ? <Umbrella className="w-3 h-3" />
                : <XCircle className="w-3 h-3" />}
            {row.status === 'present' ? 'Present' : (row.status === 'leave' ? 'On Leave' : 'Not Clocked In')}
          </span>
        </Badge>
      )
    },
    {
      header: 'Override',
      accessor: 'actions',
      cell: () => (
        <button
          className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed inline-flex items-center gap-1.5"
          disabled
          title="Biometric overrides are handled directly in the Employee Portal"
        >
          <SlidersHorizontal className="w-3.5 h-3.5" /> Disabled
        </button>
      )
    }
  ];

  return (
    <RoleGuard allowedRoles={['admin', 'manager']}>
      <AuthenticatedLayout>
        <Head title="Live Attendance Monitor" />

        {/* Page Header */}
        <div className="mb-6 rounded-2xl p-6 bg-gradient-to-r from-white via-indigo-50/40 to-slate-50/70 backdrop-blur-xl border border-slate-200/80 shadow-sm font-sans">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 text-[11px] font-bold text-indigo-700 uppercase bg-indigo-100/70 border border-indigo-200 px-2.5 py-0.5 rounded-full mb-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
                <span>Live Attendance Feed</span>
              </div>
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                Live Attendance Monitor
              </h1>
              <p className="text-xs text-slate-600 font-medium mt-1 max-w-xl">
                {isToday
                  ? "Today's live punch feed — showing real-time clock-in status. Monthly totals for payroll are computed in Attendance Review after month closes."
                  : `Punch feed for ${new Date(date + 'T00:00:00').toLocaleDateString('en-IN', { month: 'long', day: 'numeric', year: 'numeric' })}. Monthly totals are computed in Attendance Review.`}
              </p>
            </div>

            <div className="flex flex-wrap gap-2 shrink-0">
              <button
                type="button"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 hover:border-indigo-400 hover:bg-indigo-50 text-slate-800 font-bold text-xs rounded-lg shadow-sm transition-all disabled:opacity-60"
              >
                <RefreshCw className={`w-4 h-4 text-indigo-600 ${isRefreshing ? 'animate-spin' : ''}`} />
                Refresh Feed
              </button>
              <Link href={route('payroll.attendance-upload')}>
                <button
                  type="button"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-[#082d9b] hover:bg-indigo-900 text-white font-bold text-xs rounded-lg shadow-md transition-all"
                >
                  <Upload className="w-4 h-4" />
                  Upload Spreadsheet
                </button>
              </Link>
            </div>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="card p-4 mb-4 flex gap-3 items-center flex-wrap border border-slate-200 shadow-sm rounded-xl font-sans">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600 uppercase tracking-wider shrink-0">
            <Search className="w-4 h-4 text-slate-400" /> Filters
          </div>

          <div className="flex-1 min-w-[180px]">
            <Input placeholder="Search employee name..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>

          <div className="min-w-[180px]">
            <Select value={clientId} onChange={(e) => handleClientChange(e.target.value)}>
              <option value="">All Client Partners</option>
              {clients.map(c => (
                <option key={c.id} value={c.id}>{c.company_name}</option>
              ))}
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              type="date"
              value={date}
              onChange={(e) => handleDateChange(e.target.value)}
              className="px-3 py-1.5 text-xs font-semibold bg-white border border-slate-300 rounded-lg shadow-sm text-slate-700 focus:ring-2 focus:ring-indigo-500 focus:outline-none h-[36px]"
            />
            <button
              type="button"
              onClick={() => handleDateChange(todayStr)}
              className={`px-3 py-1.5 text-xs font-bold border rounded-lg shadow-sm transition-all h-[36px] ${date === todayStr ? 'bg-[#082d9b] text-white border-[#082d9b]' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'}`}
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => handleDateChange(yesterdayStr)}
              className={`px-3 py-1.5 text-xs font-bold border rounded-lg shadow-sm transition-all h-[36px] ${date === yesterdayStr ? 'bg-[#082d9b] text-white border-[#082d9b]' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'}`}
            >
              Yesterday
            </button>
          </div>
        </div>

        {/* Source Key Legend */}
        <div className="mb-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-semibold text-slate-600">
          <span className="text-slate-500 font-bold uppercase text-[11px] tracking-wider">Attendance Source:</span>
          <span className="flex items-center gap-1.5"><Fingerprint className="w-3.5 h-3.5 text-emerald-600" /> Live Punch — Employee self-clocked</span>
          <span className="flex items-center gap-1.5"><FileSpreadsheet className="w-3.5 h-3.5 text-blue-600" /> Uploaded — Client submitted</span>
          <span className="flex items-center gap-1.5"><PenLine className="w-3.5 h-3.5 text-orange-500" /> Override — Manually corrected</span>
          <span className="flex items-center gap-1.5"><Umbrella className="w-3.5 h-3.5 text-slate-400" /> Leave — Approved absence</span>
        </div>

        {/* Priority Warning Banner */}
        <div className="mb-4 flex items-start gap-3 bg-amber-50 border border-amber-300 text-amber-900 p-3 px-4 rounded-xl text-xs font-semibold shadow-sm">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <span>If both a punch record and an uploaded timesheet exist for the same employee, the <strong>live punch always wins</strong> in payroll calculations. The uploaded timesheet is used only as a fallback.</span>
        </div>

        <div className="text-[11px] text-slate-400 italic mb-3 font-sans">
          This view resets daily. Payroll calculations use the full month's accumulated attendance from Attendance Review.
        </div>

        {/* Data Table Card */}
        <div className="card p-0 mb-5 border border-slate-200 shadow-sm rounded-xl overflow-hidden font-sans">
          <DataTable columns={columns} data={filteredPunches} />

          {punches && punches.total > 0 && (
            <div className="px-5 py-3.5 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-50/60">
              <div className="text-xs text-slate-500 font-medium">
                Showing <strong className="text-slate-900">{punches.from || 0}</strong> – <strong className="text-slate-900">{punches.to || 0}</strong> of <strong className="text-slate-900">{punches.total}</strong> records
              </div>
              <Pagination
                currentPage={punches.current_page}
                totalPages={punches.last_page}
                totalItems={punches.total}
                itemsPerPage={punches.per_page}
                onPageChange={(page) => {
                  const params = new URLSearchParams(window.location.search);
                  params.set('page', page);
                  window.location.search = params.toString();
                }}
              />
            </div>
          )}
        </div>

        {/* Summary Footer Bar */}
        <div className="card p-4 flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-50 border border-slate-200 shadow-sm rounded-xl font-sans mb-4">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-semibold">
            <span className="text-slate-600 font-bold uppercase text-[11px] tracking-wider flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-slate-500" /> Daily Summary:
            </span>
            <span className="flex items-center gap-1.5 text-emerald-700">
              <CheckCircle2 className="w-3.5 h-3.5" /> {presentCount} Present / Clocked In
            </span>
            <span className="flex items-center gap-1.5 text-red-600">
              <XCircle className="w-3.5 h-3.5" /> {absentCount} Not Clocked In
            </span>
            <span className="flex items-center gap-1.5 text-amber-700">
              <Umbrella className="w-3.5 h-3.5" /> {leaveCount} On Approved Leave
            </span>
          </div>
          <Link href={route('payroll.attendance-review')}>
            <button
              type="button"
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#082d9b] hover:bg-indigo-900 text-white font-bold text-xs rounded-lg shadow transition-all"
            >
              Attendance Review
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </Link>
        </div>

        <div className="text-center text-[11px] text-slate-400 italic font-sans">
          At month-end, daily punch records accumulate into a monthly batch visible in Attendance Review. Once the client approves the monthly timesheet, payroll can be processed.
        </div>

      </AuthenticatedLayout>
    </RoleGuard>
  );
}
