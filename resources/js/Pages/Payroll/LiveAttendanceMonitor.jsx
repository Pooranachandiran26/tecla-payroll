import React, { useState } from 'react';
import AuthenticatedLayout from '../../Layouts/AuthenticatedLayout';
import { Head, Link, router } from '@inertiajs/react';
import Button from '../../Components/ui/Button';
import DataTable from '../../Components/ui/DataTable';
import Badge from '../../Components/ui/Badge';
import Select from '../../Components/ui/Select';
import Input from '../../Components/ui/Input';
import RoleGuard from '../../Components/RoleGuard.jsx';
import useToast from '../../Hooks/useToast';

export default function LiveAttendanceMonitor({ clients, punches, selectedClientId, selectedDate }) {
  const { showToast } = useToast();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [clientId, setClientId] = useState(selectedClientId || '');
  const [date, setDate] = useState(selectedDate);
  const [search, setSearch] = useState('');

  const handleClientChange = (newClientId) => {
    setClientId(newClientId);
    router.get('/payroll/live-monitor', { client_id: newClientId, date: date }, { preserveState: false });
  };

  const handleDateChange = (newDate) => {
    setDate(newDate);
    router.get('/payroll/live-monitor', { client_id: clientId, date: newDate }, { preserveState: false });
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

  const filteredPunches = punches.filter(p => {
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const presentCount = punches.filter(p => p.status === 'present').length;
  const absentCount = punches.filter(p => p.status === 'absent').length;
  const leaveCount = punches.filter(p => p.status === 'leave').length;

  const columns = [
    {
      header: 'Employee',
      accessor: 'employee',
      cell: (row) => (
        <>
          <strong>{row.name}</strong>
          <div className="text-xs text-gray-500">Emp Code: {row.code}</div>
        </>
      )
    },
    {
      header: 'Client Partner',
      accessor: 'clientName'
    },
    {
      header: 'Source',
      accessor: 'source',
      cell: (row) => <span className="font-medium">{row.source}</span>
    },
    {
      header: 'Shift Type',
      accessor: 'shift'
    },
    {
      header: 'Clock In Time',
      accessor: 'in'
    },
    {
      header: 'Clock Out Time',
      accessor: 'out',
      cell: (row) => row.out === 'working' ? <Badge type="warning">Still Working</Badge> : row.out
    },
    {
      header: 'Hours Logged Today',
      accessor: 'hours',
      cell: (row) => <span className="font-semibold font-mono">{row.hours}</span>
    },
    {
      header: 'Status',
      accessor: 'status',
      cell: (row) => (
        <Badge type={row.status === 'present' ? 'success' : (row.status === 'leave' ? 'warning' : 'danger')}>
          {row.status === 'present' ? 'Present' : (row.status === 'leave' ? 'On Leave' : 'Not Clocked In')}
        </Badge>
      )
    },
    {
      header: 'Action Override',
      accessor: 'actions',
      cell: (row) => (
        <button 
          className="px-3 py-1 text-xs font-semibold rounded bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed" 
          disabled 
          title="Biometric overrides are handled directly in the Employee Portal"
        >
          Override (Disabled)
        </button>
      )
    }
  ];

  // Helper date strings for options
  const todayStr = new Date().toISOString().split('T')[0];
  const yesterdayStr = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  return (
    <RoleGuard allowedRoles={['admin', 'manager']}>
      <AuthenticatedLayout>
        <Head title="Live Attendance Monitor" />

        <div className="flex justify-between items-end mb-6">
          <div>
            <h2 className="text-2xl font-bold text-[#1F3864] mb-1 flex items-center">
              <span className="w-3 h-3 bg-green-500 rounded-full inline-block mr-2 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]"></span>
              Live Attendance Monitor
            </h2>
            <p className="text-gray-500 text-sm">Today's live punch feed — showing who is clocked in right now. Monthly totals for payroll are computed in Attendance Review after the month closes.</p>
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={handleRefresh} loading={isRefreshing}>
              🔄 Refresh Live Punches
            </Button>
            <Link href={route('payroll.attendance-upload')}>
              <Button variant="primary">📤 Upload Spreadsheet Attendance</Button>
            </Link>
          </div>
        </div>

        <div className="card p-4 mb-6 flex gap-4 items-center flex-wrap">
          <div className="text-[0.85rem] font-semibold text-[#1F3864]">Filters:</div>
          <div className="flex-1 min-w-[150px]">
            <Input placeholder="Search by Employee Name..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div>
            <Select value={clientId} onChange={(e) => handleClientChange(e.target.value)}>
              <option value="">All Clients</option>
              {clients.map(c => (
                <option key={c.id} value={c.id}>{c.company_name}</option>
              ))}
            </Select>
          </div>
          <div>
            <Select value={date} onChange={(e) => handleDateChange(e.target.value)}>
              <option value={todayStr}>Today ({new Date(todayStr).toLocaleDateString('en-US', {month: 'long', day:'numeric', year:'numeric'})})</option>
              <option value={yesterdayStr}>Yesterday ({new Date(yesterdayStr).toLocaleDateString('en-US', {month: 'long', day:'numeric', year:'numeric'})})</option>
            </Select>
          </div>
        </div>

        <div className="text-[0.85rem] text-gray-500 mb-2 flex items-center gap-4 flex-wrap">
          <strong>Attendance Source Key:</strong>
          <span>🟢 Live Punch = Employee self-clocked</span>
          <span>🔵 Uploaded = Client submitted</span>
          <span>🟠 Override = Manually corrected</span>
          <span>⚪ Leave = Approved absence</span>
        </div>

        <div className="bg-[#FFFBEB] border-l-4 border-l-[#F59E0B] text-[#92400E] p-2 px-3 rounded text-[0.85rem] mb-6">
          If both a punch record and an uploaded timesheet exist for the same employee, the live punch always wins in payroll calculations. The uploaded timesheet is only used as a fallback.
        </div>

        <div className="text-[0.85rem] text-gray-500 italic mb-2">
          This view resets daily. Payroll calculations use the full month's accumulated attendance from Attendance Review.
        </div>

        <div className="card p-0 mb-6">
          <DataTable columns={columns} data={filteredPunches} />
        </div>

        <div className="card p-4 flex justify-between items-center bg-slate-50 mb-6">
          <div className="text-[0.95rem] text-[#1F3864]">
            <strong>Summary: </strong>
            <span>{presentCount} Present / Clocked In | {absentCount} Not Clocked In | {leaveCount} On Approved Leave</span>
          </div>
          <Link href={route('payroll.attendance-review')}>
            <Button variant="primary" size="xs">→ Go to Attendance Review</Button>
          </Link>
        </div>

        <div className="text-center text-[0.85rem] text-gray-500 italic">
          At month-end, daily punch records accumulate into a monthly batch visible in Attendance Review. Once the client approves the monthly timesheet there, payroll can be processed.
        </div>
      </AuthenticatedLayout>
    </RoleGuard>
  );
}
