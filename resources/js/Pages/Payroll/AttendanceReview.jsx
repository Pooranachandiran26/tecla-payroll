import React, { useState } from 'react';
import AuthenticatedLayout from '../../Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';
import Button from '../../Components/ui/Button';
import DataTable from '../../Components/ui/DataTable';
import Badge from '../../Components/ui/Badge';
import Checkbox from '../../Components/ui/Checkbox';
import Modal from '../../Components/ui/Modal';
import useToast from '../../Hooks/useToast';

import RoleGuard from '../../Components/RoleGuard.jsx';
const initialBatches = [
  {
    id: 1,
    client: 'Mahindra Corp',
    month: 'June 2026',
    empCount: '42 Employees',
    source: 'Biometric portal / Punch-in',
    reqApproval: true,
    status: 'awaiting',
    sync: 'Pending'
  },
  {
    id: 2,
    client: 'Tata Consultancy Services',
    month: 'June 2026',
    empCount: '90 Employees',
    source: 'Spreadsheet Upload',
    reqApproval: true,
    status: 'awaiting',
    sync: 'Yesterday, 04:15 PM (Upload)'
  },
  {
    id: 3,
    client: 'Reliance Digital',
    month: 'June 2026',
    empCount: '22 Employees',
    source: 'Biometric portal / Punch-in',
    reqApproval: false,
    status: 'approved',
    sync: 'June 20, 2026 (Rule base)'
  }
];

export default function AttendanceReview() {
  const { showToast } = useToast();
  const [batches, setBatches] = useState(initialBatches);

  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [nudgeModalOpen, setNudgeModalOpen] = useState(false);
  const [verifyModalOpen, setVerifyModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState('');
  const [isVerified, setIsVerified] = useState(false);

  const toggleApprovalReq = (id) => {
    setBatches(prev => prev.map(b => b.id === id ? { ...b, reqApproval: !b.reqApproval } : b));
    showToast({ message: 'Approval workflow updated.' });
  };

  const simulateApprove = (id) => {
    setBatches(prev => prev.map(b => b.id === id ? { ...b, status: 'approved', sync: 'Today (Client Rep)' } : b));
  };

  const columns = [
    {
      header: 'Client Partner',
      accessor: 'client',
      cell: (row) => <strong>{row.client}</strong>
    },
    {
      header: 'Target Period',
      accessor: 'month'
    },
    {
      header: 'Employee Count',
      accessor: 'empCount',
      cell: (row) => <span className="font-semibold">{row.empCount}</span>
    },
    {
      header: 'Source Model',
      accessor: 'source'
    },
    {
      header: (
        <span className="flex items-center gap-1">
          Client Portal Approval Requirement
          <span 
            className="flex items-center justify-center w-4 h-4 rounded-full bg-blue-100 text-blue-800 text-[0.65rem] font-bold cursor-help"
            title="When ON — the client must log into their portal and approve this timesheet before payroll can run. When OFF (Skip Approval) — the agency approves directly."
          >?</span>
        </span>
      ),
      accessor: 'reqApproval',
      cell: (row) => (
        <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
          {/* Note: I don't have a toggle switch component, so I'll use Checkbox for now */}
          <Checkbox checked={row.reqApproval} onChange={() => toggleApprovalReq(row.id)} />
          <span>{row.reqApproval ? 'Approval Required' : 'Skip Approval'}</span>
        </label>
      )
    },
    {
      header: 'Status',
      accessor: 'status',
      cell: (row) => {
        if (row.status === 'awaiting') return <Badge type="warning">Awaiting Client Approval</Badge>;
        if (row.status === 'approved') {
          if (row.client === 'Reliance Digital') return <Badge type="info">Auto-Approved</Badge>;
          return <Badge type="success">✓ Client Approved</Badge>;
        }
        return null;
      }
    },
    {
      header: 'Last Synced / Updated',
      accessor: 'sync',
      cell: (row) => <span className="text-sm">{row.sync}</span>
    },
    {
      header: 'Actions',
      accessor: 'actions',
      cell: (row) => {
        return (
          <div className="flex gap-2 flex-wrap items-center">
            <Button size="xs" variant="secondary" onClick={() => { setSelectedClient(row.client); setDetailsModalOpen(true); }}>
              View Details
            </Button>
            
            {row.status === 'awaiting' && row.client === 'Mahindra Corp' && (
              <Button size="xs" variant="secondary" onClick={() => simulateApprove(row.id)}>
                Demo: Simulate Approving
              </Button>
            )}
            
            {row.status === 'awaiting' && row.client === 'Tata Consultancy Services' && (
              <>
                <Button size="xs" variant="secondary" onClick={() => setNudgeModalOpen(true)}>Nudge Client</Button>
                {isVerified ? (
                  <Badge type="success" className="mr-1">✓ Verified</Badge>
                ) : null}
                <Button size="xs" variant="navy" onClick={() => setVerifyModalOpen(true)}>
                  {isVerified ? 'Re-verify' : 'Verify Logs'}
                </Button>
              </>
            )}
            
            {row.status === 'approved' && (
              <>
                <Link href="/payroll/processing">
                  <Button size="xs" variant="navy">Process Payroll</Button>
                </Link>
                {row.client === 'Mahindra Corp' && (
                  <Button size="xs" variant="secondary" onClick={() => alert('Timesheet unlocked. Client notification dispatched.')}>
                    Unlock
                  </Button>
                )}
              </>
            )}
          </div>
        );
      }
    }
  ];

  const detailColumns = [
    { header: 'Employee Name', accessor: 'name' },
    { header: 'Emp Code', accessor: 'code' },
    { header: 'Days Present', accessor: 'present' },
    { header: 'Days LOP', accessor: 'lop' },
    { header: 'Leave Days', accessor: 'leave' },
    { header: 'Source', accessor: 'source' },
    { 
      header: 'Status', 
      accessor: 'status',
      cell: (row) => <Badge type={row.status === 'Ready' ? 'success' : 'danger'}>{row.status}</Badge> 
    }
  ];

  const detailData = [
    { name: 'Aarav Sharma', code: 'TEC-088', present: 24, lop: 0, leave: 2, source: '🟢 Live Punch', status: 'Ready' },
    { name: 'Neha Patil', code: 'TEC-121', present: 0, lop: 26, leave: 0, source: '🔴 No Attendance', status: 'Check Required' },
    { name: 'Vikram Rao', code: 'TEC-168', present: 26, lop: 0, leave: 0, source: '🔵 Uploaded', status: 'Ready' },
    { name: 'Karan Malhotra', code: 'TEC-142', present: 26, lop: 0, leave: 0, source: '🟢 Live Punch', status: 'Ready' },
    { name: 'Priya Singh', code: 'TEC-199', present: 26, lop: 0, leave: 0, source: '🟢 Live Punch', status: 'Ready' }
  ];

  return (
    <RoleGuard allowedRoles={['admin', 'manager']}>
    <AuthenticatedLayout>
      <Head title="Attendance Review" />

      <div className="flex justify-between items-end mb-6">
        <div>
          <h2 className="text-2xl font-bold text-[#1F3864] mb-1">Attendance Timesheets Review</h2>
          <p className="text-gray-500 text-sm">Verify client approval status, unlock timesheets, or initiate calculations for payroll runs.</p>
        </div>
        <Link href="/payroll/attendance-upload">
          <Button variant="primary">📤 Upload New Sheet</Button>
        </Link>
      </div>

      <div className="flex items-center gap-2 text-[0.9rem] font-semibold text-gray-500 bg-white p-3 px-4 rounded-lg border border-gray-200 mb-6 flex-wrap">
        <span>Live Punches / Upload</span>
        <span className="text-gray-300">→</span>
        <span className="text-amber-700 bg-amber-50 px-2.5 py-1 rounded border border-amber-200">Attendance Review — YOU ARE HERE</span>
        <span className="text-gray-300">→</span>
        <span>Processing</span>
        <span className="text-gray-300">→</span>
        <span>Approval</span>
        <span className="text-gray-300">→</span>
        <span>Payslips</span>
      </div>

      <div className="card p-0 mb-6">
        <DataTable columns={columns} data={batches} />
      </div>

      {/* Details Modal */}
      <Modal isOpen={detailsModalOpen} onClose={() => setDetailsModalOpen(false)} title={`${selectedClient} - Monthly Attendance Details`}>
        <div className="p-4">
          <p className="text-[0.85rem] text-gray-500 mb-4">Showing 5 of 42 employees — export full list for complete view.</p>
          <div className="border rounded">
            <DataTable columns={detailColumns} data={detailData} />
          </div>
        </div>
        <div className="flex justify-end gap-3 p-4 border-t border-gray-200 bg-gray-50 rounded-b-lg">
          <Button variant="secondary" onClick={() => setDetailsModalOpen(false)}>Close</Button>
          <Button variant="primary">📥 Export Full List</Button>
        </div>
      </Modal>

      {/* Nudge Modal */}
      <Modal isOpen={nudgeModalOpen} onClose={() => setNudgeModalOpen(false)} title="Send attendance approval reminder to Tata Consultancy Services?">
        <div className="p-4">
          <p className="text-[0.85rem] mb-4">POC: Sunita Verma (sunita@tcs.com)</p>
        </div>
        <div className="flex justify-end gap-3 p-4 border-t border-gray-200 bg-gray-50 rounded-b-lg">
          <Button variant="secondary" onClick={() => setNudgeModalOpen(false)}>Cancel</Button>
          <Button variant="primary" onClick={() => {
            setNudgeModalOpen(false);
            setBatches(prev => prev.map(b => b.id === 2 ? { ...b, sync: `Reminder sent today at ${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} — awaiting response.` } : b));
          }}>Send Reminder</Button>
        </div>
      </Modal>

      {/* Verify Modal */}
      <Modal isOpen={verifyModalOpen} onClose={() => setVerifyModalOpen(false)} title="Pre-Approval Log Verification — TCS June 2026">
        <div className="p-4">
          <ul className="text-[0.85rem] leading-loose">
            <li className="text-green-600">✓ Employee count matches: 90 of 90 records found in system</li>
            <li className="text-green-600">✓ No duplicate employee codes detected</li>
            <li className="text-green-600">✓ Date range valid: June 1–30 (30 calendar days)</li>
            <li className="text-yellow-600 font-bold">⚠ 3 employees have present days &gt; 27 — verify if OT or data entry error</li>
            <li className="text-green-600">✓ No negative LOP values</li>
          </ul>
        </div>
        <div className="flex justify-end gap-3 p-4 border-t border-gray-200 bg-gray-50 rounded-b-lg">
          <Button variant="warning" onClick={() => setVerifyModalOpen(false)}>Flag for Review</Button>
          <Button variant="success" onClick={() => { setIsVerified(true); setVerifyModalOpen(false); }}>Mark as Verified</Button>
        </div>
      </Modal>

    </AuthenticatedLayout>
    </RoleGuard>
  );
}
