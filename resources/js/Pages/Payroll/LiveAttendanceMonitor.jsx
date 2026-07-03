import React, { useState, useEffect } from 'react';
import AuthenticatedLayout from '../../Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';
import Button from '../../Components/ui/Button';
import DataTable from '../../Components/ui/DataTable';
import Badge from '../../Components/ui/Badge';
import Select from '../../Components/ui/Select';
import Input from '../../Components/ui/Input';
import Modal from '../../Components/ui/Modal';
import useToast from '../../Hooks/useToast';

import RoleGuard from '../../Components/RoleGuard.jsx';
const initialPunches = [
  {
    id: 1,
    client: 'mahindra',
    clientName: 'Mahindra Corp',
    name: 'Aarav Sharma',
    code: 'TEC-088',
    source: '🟢 Live Punch',
    shift: 'General (09:00 - 18:00)',
    in: '09:42 AM',
    out: '06:15 PM',
    hours: '8h 33m',
    status: 'present'
  },
  {
    id: 2,
    client: 'mahindra',
    clientName: 'Mahindra Corp',
    name: 'Neha Patil',
    code: 'TEC-121',
    source: '🟢 Live Punch',
    shift: 'General (09:00 - 18:00)',
    in: '09:30 AM',
    out: 'working',
    hours: '8h 18m',
    status: 'present'
  },
  {
    id: 3,
    client: 'reliance',
    clientName: 'Reliance Digital',
    name: 'Vikram Rao',
    code: 'TEC-168',
    source: '🟢 Live Punch',
    shift: 'Retail Shift B',
    in: '10:05 AM',
    out: '07:00 PM',
    hours: '8h 55m',
    status: 'present'
  },
  {
    id: 4,
    client: 'mahindra',
    clientName: 'Mahindra Corp',
    name: 'Karan Malhotra',
    code: 'TEC-142',
    source: '🟢 Live Punch',
    shift: 'General (09:00 - 18:00)',
    in: '—',
    out: '—',
    hours: '0h 0m',
    status: 'absent'
  }
];

export default function LiveAttendanceMonitor() {
  const { showToast } = useToast();
  
  const [punches, setPunches] = useState(initialPunches);
  const [clientFilter, setClientFilter] = useState('mahindra');
  const [search, setSearch] = useState('');
  
  const [overrideModalOpen, setOverrideModalOpen] = useState(false);
  const [selectedEmp, setSelectedEmp] = useState(null);

  useEffect(() => {
    // Increment Neha Patil's live working timer slightly
    const interval = setInterval(() => {
      setPunches(prev => prev.map(p => {
        if (p.id === 2) {
          const match = p.hours.match(/(\d+)h\s+(\d+)m(?:\s+(\d+)s)?/);
          if (match) {
            let h = parseInt(match[1]);
            let m = parseInt(match[2]);
            let s = match[3] ? parseInt(match[3]) : 0;
            s++;
            if (s >= 60) { s = 0; m++; }
            if (m >= 60) { m = 0; h++; }
            return { ...p, hours: `${h}h ${m}m ${s}s` };
          }
        }
        return p;
      }));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const filteredPunches = punches.filter(p => {
    if (clientFilter && p.client !== clientFilter) return false;
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const readinessCounts = () => {
    if (clientFilter === 'mahindra') {
      return "3 employees ready for payroll | 1 missing attendance | 0 on approved leave";
    } else if (clientFilter === 'reliance') {
      return "1 employee ready for payroll | 0 missing attendance | 0 on approved leave";
    } else if (clientFilter === 'tcs') {
      return "0 employees ready for payroll | 0 missing attendance | 0 on approved leave";
    }
    return "4 employees ready for payroll | 1 missing attendance | 0 on approved leave";
  };

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
        <Badge type={row.status === 'present' ? 'success' : 'danger'}>
          {row.status === 'present' ? 'Present' : 'Not Clocked In'}
        </Badge>
      )
    },
    {
      header: 'Action Override',
      accessor: 'actions',
      cell: (row) => (
        <Button size="xs" variant="secondary" onClick={() => { setSelectedEmp(row.name); setOverrideModalOpen(true); }}>
          Override
        </Button>
      )
    }
  ];

  return (
    <RoleGuard allowedRoles={['admin', 'executive']}>
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
          <Button variant="secondary" onClick={() => showToast({ message: 'Live punch records refreshed.' })}>
            🔄 Refresh Live Punches
          </Button>
          <Link href="/payroll/attendance-upload">
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
          <Select value={clientFilter} onChange={(e) => setClientFilter(e.target.value)}>
            <option value="">All Clients</option>
            <option value="mahindra">Mahindra Corp</option>
            <option value="reliance">Reliance Digital</option>
            <option value="tcs">Tata Consultancy Services</option>
          </Select>
        </div>
        <div>
          <Select value="today">
            <option value="today">Today ({new Date('2026-06-25').toLocaleDateString('en-US', {month: 'long', day:'numeric', year:'numeric'})})</option>
            <option value="yesterday">Yesterday</option>
          </Select>
        </div>
        <div>
          <Select value="">
            <option value="">All Statuses</option>
            <option value="present">Present / Working</option>
            <option value="absent">Absent</option>
            <option value="leave">On Leave</option>
          </Select>
        </div>
        <Button variant="navy" className="py-1.5 px-4 h-auto min-h-0 text-sm">Apply</Button>
      </div>

      <div className="text-[0.85rem] text-gray-500 mb-2 flex items-center gap-4 flex-wrap">
        <strong>Attendance Source Key:</strong>
        <span>🟢 Live Punch = Employee self-clocked</span>
        <span>🔵 Uploaded = Client submitted</span>
        <span>🟠 Override = Manually corrected</span>
        <span>⚪ Leave = Approved absence</span>
      </div>

      <div className="bg-[#FFFBEB] border-l-4 border-l-[#F59E0B] text-[#92400E] p-2 px-3 rounded text-[0.85rem] mb-6">
        If both a punch record and an uploaded sheet exist for the same employee, the live punch always wins in payroll. The uploaded sheet is only used as a fallback.
      </div>

      <div className="text-[0.85rem] text-gray-500 italic mb-2">
        This view resets daily. Payroll uses the full month's accumulated attendance from Attendance Review, not this screen.
      </div>

      <div className="card p-0 mb-6">
        <DataTable columns={columns} data={filteredPunches} />
      </div>

      <div className="card p-4 flex justify-between items-center bg-slate-50 mb-6">
        <div className="text-[0.95rem] text-[#1F3864]">
          <strong>
            {clientFilter === 'mahindra' ? 'Mahindra Corp' : (clientFilter === 'reliance' ? 'Reliance Digital' : (clientFilter === 'tcs' ? 'Tata Consultancy Services' : 'All Clients'))} 
             {' — June 2026'}: 
          </strong> 
          {' '}{readinessCounts()}
        </div>
        <Link href="/payroll/attendance-review">
          <Button variant="primary" size="xs">→ Go to Attendance Review</Button>
        </Link>
      </div>

      <div className="text-center text-[0.85rem] text-gray-500 italic">
        At month-end, daily punch records accumulate into a monthly batch visible in Attendance Review. Once the client approves the monthly timesheet there, payroll can be processed.
      </div>

      {/* Override Modal */}
      <Modal isOpen={overrideModalOpen} onClose={() => setOverrideModalOpen(false)} title="Override Attendance Punch">
        <form onSubmit={(e) => { e.preventDefault(); setOverrideModalOpen(false); showToast({ message: 'Manual override applied to attendance record.', type: 'success' }); }}>
          <div className="p-4">
            <p className="text-[0.85rem] mb-4">
              Force modify the attendance record for <strong>{selectedEmp}</strong>.
            </p>
            <div className="flex gap-4 mb-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Force Clock-In Time</label>
                <Input type="time" defaultValue="09:00" />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Force Clock-Out Time</label>
                <Input type="time" defaultValue="18:00" />
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Override Status Code</label>
              <Select>
                <option value="present">Present (Standard Hour Deduction)</option>
                <option value="halfday">Half Day / Casual Leave combo</option>
                <option value="leave">On Approved Leave (Paid)</option>
                <option value="absent">Absent / Unpaid Leave</option>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Reason for Manual Override</label>
              <textarea className="w-full border border-gray-300 rounded-md p-2 text-sm focus:ring-1 focus:ring-[#B8860B] focus:border-[#B8860B]" rows="2" placeholder="Client request / biometric failure..." required></textarea>
            </div>
          </div>
          <div className="flex justify-end gap-3 p-4 border-t border-gray-200 bg-gray-50 rounded-b-lg">
            <Button type="button" variant="secondary" onClick={() => setOverrideModalOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary">Apply Manual Override</Button>
          </div>
        </form>
      </Modal>

    </AuthenticatedLayout>
    </RoleGuard>
  );
}
