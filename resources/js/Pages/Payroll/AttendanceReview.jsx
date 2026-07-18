import React, { useState } from 'react';
import AuthenticatedLayout from '../../Layouts/AuthenticatedLayout';
import { Head, Link, router } from '@inertiajs/react';
import Button from '../../Components/ui/Button';
import DataTable from '../../Components/ui/DataTable';
import Badge from '../../Components/ui/Badge';
import Modal from '../../Components/ui/Modal';
import Select from '../../Components/ui/Select';
import useToast from '../../Hooks/useToast';
import axios from 'axios';
import RoleGuard from '../../Components/RoleGuard.jsx';
import { ShieldCheck, CheckCircle2, AlertTriangle, HelpCircle, Loader2 } from 'lucide-react';

export default function AttendanceReview({ initialBatches, clients, selectedMonth }) {
  const { showToast } = useToast();
  const [batches, setBatches] = useState(initialBatches || []);
  const [targetMonth, setTargetMonth] = useState(selectedMonth || '2026-07');

  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [verifyModalOpen, setVerifyModalOpen] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState(null);
  const [selectedClientName, setSelectedClientName] = useState('');

  // Details Preview Modal State
  const [detailData, setDetailData] = useState([]);
  const [detailLoading, setDetailLoading] = useState(false);

  // Pre-approval Log Verification Modal State
  const [verifyData, setVerifyData] = useState(null);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifySaving, setVerifySaving] = useState(false);

  const handleMonthChange = (e) => {
    const nextMonth = e.target.value;
    setTargetMonth(nextMonth);
    router.get('/payroll/attendance-review', { month: nextMonth }, { preserveState: true });
  };

  const openDetails = (clientId, clientName) => {
    setSelectedClientId(clientId);
    setSelectedClientName(clientName);
    setDetailsModalOpen(true);
    setDetailLoading(true);

    axios.get(`/payroll/attendance-review/${clientId}/details`, {
      params: { month: targetMonth }
    })
    .then(res => {
      setDetailData(res.data.rows || []);
      setDetailLoading(false);
    })
    .catch(err => {
      showToast({ message: 'Failed to fetch attendance details.', type: 'error' });
      setDetailLoading(false);
      setDetailsModalOpen(false);
    });
  };

  const openVerification = (clientId, clientName) => {
    setSelectedClientId(clientId);
    setSelectedClientName(clientName);
    setVerifyModalOpen(true);
    setVerifyLoading(true);
    setVerifyData(null);

    axios.get(`/payroll/attendance-review/${clientId}/verify`, {
      params: { month: targetMonth }
    })
    .then(res => {
      setVerifyData(res.data);
      setVerifyLoading(false);
    })
    .catch(err => {
      showToast({ message: 'Failed to run eligibility log verification.', type: 'error' });
      setVerifyLoading(false);
      setVerifyModalOpen(false);
    });
  };

  const markVerified = () => {
    if (!selectedClientId) return;
    setVerifySaving(true);

    axios.post(`/payroll/attendance-review/${selectedClientId}/verify`, {
      month: targetMonth
    })
    .then(res => {
      showToast({ message: `Attendance logs for ${selectedClientName} marked as verified.` });
      setVerifySaving(false);
      setVerifyModalOpen(false);
      // Reload Inertia props to show updated verified badge
      router.get('/payroll/attendance-review', { month: targetMonth }, { preserveState: false });
    })
    .catch(err => {
      showToast({ message: 'Failed to save verification status.', type: 'error' });
      setVerifySaving(false);
    });
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
      accessor: 'source',
      cell: (row) => {
        if (row.source === 'Spreadsheet Upload') {
          return <span className="text-[#1F3864] font-medium">🔵 Spreadsheet Upload</span>;
        } else if (row.source === 'Biometric portal / Punch-in') {
          return <span className="text-green-700 font-medium">🟢 Biometric portal / Punch-in</span>;
        } else {
          return <span className="text-gray-400 italic">No Data Yet</span>;
        }
      }
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
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Badge type="secondary">Coming Soon</Badge>
          <span className="text-[0.8rem] opacity-75">Agency Approved</span>
        </div>
      )
    },
    {
      header: 'Review Verification Status',
      accessor: 'status',
      cell: (row) => {
        if (row.status === 'verified') {
          return (
            <div className="flex flex-col gap-0.5">
              <Badge type="success">✓ Verified</Badge>
              <span className="text-[0.7rem] text-green-700 font-semibold max-w-[200px] leading-tight">
                {row.verifiedText}
              </span>
            </div>
          );
        }
        return (
          <div className="flex flex-col gap-0.5">
            <Badge type="warning">Not Verified</Badge>
            <span className="text-[0.7rem] text-amber-700 font-semibold max-w-[200px] leading-tight">
              Pre-payroll checklist pending verification.
            </span>
          </div>
        );
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
            <Button size="xs" variant="secondary" onClick={() => openDetails(row.id, row.client)}>
              View Details
            </Button>
            
            {row.source !== 'No Data Yet' && (
              <Button size="xs" variant="navy" onClick={() => openVerification(row.id, row.client)}>
                {row.status === 'verified' ? 'Re-verify logs' : 'Verify Logs'}
              </Button>
            )}
            
            {row.source !== 'No Data Yet' && (
              <Link href={route('payroll.processing')}>
                <Button size="xs" variant="primary">Process Payroll</Button>
              </Link>
            )}
          </div>
        );
      }
    }
  ];

  const detailColumns = [
    { header: 'Employee Name', accessor: 'name' },
    { header: 'Emp Code', accessor: 'code' },
    { header: 'Days Present', accessor: 'present', cell: (row) => <span>{row.present} Days</span> },
    { header: 'Days LOP', accessor: 'lop', cell: (row) => <span>{row.lop} Days</span> },
    { header: 'Leave Days', accessor: 'leave', cell: (row) => <span>{row.leave} Days</span> },
    { header: 'Source', accessor: 'source' },
    { 
      header: 'Status', 
      accessor: 'status',
      cell: (row) => <Badge type={row.status === 'Ready' ? 'success' : 'danger'}>{row.status}</Badge> 
    }
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
          <Link href={route('payroll.attendance-upload')}>
            <Button variant="primary">📤 Upload New Sheet</Button>
          </Link>
        </div>

        <div className="flex items-center justify-between gap-4 bg-white p-3 px-4 rounded-lg border border-gray-200 mb-6 flex-wrap">
          <div className="flex items-center gap-2 text-[0.9rem] font-semibold text-gray-500 flex-wrap">
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
          <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-gray-700 uppercase">Review Month:</label>
            <Select value={targetMonth} onChange={handleMonthChange} className="w-[180px] text-sm">
              <option value="2026-07">July 2026</option>
              <option value="2026-06">June 2026</option>
              <option value="2026-05">May 2026</option>
            </Select>
          </div>
        </div>

        <div className="card p-0 mb-6">
          <DataTable columns={columns} data={batches} />
        </div>

        {/* Details Modal */}
        <Modal isOpen={detailsModalOpen} onClose={() => setDetailsModalOpen(false)} title={`${selectedClientName} - Monthly Attendance Details`}>
          <div className="p-4">
            <p className="text-[0.85rem] text-gray-500 mb-4">Showing actual aggregated counts computed from daily attendance database records.</p>
            {detailLoading ? (
              <div className="flex flex-col items-center justify-center p-12 text-gray-500">
                <Loader2 className="w-8 h-8 animate-spin text-[#1F3864] mb-2" />
                <span>Loading employee data...</span>
              </div>
            ) : (
              <div className="border rounded max-h-[400px] overflow-y-auto">
                <DataTable columns={detailColumns} data={detailData} />
              </div>
            )}
          </div>
          <div className="flex justify-end gap-3 p-4 border-t border-gray-200 bg-gray-50 rounded-b-lg">
            <Button variant="secondary" onClick={() => setDetailsModalOpen(false)}>Close</Button>
          </div>
        </Modal>

        {/* Verify Modal */}
        <Modal isOpen={verifyModalOpen} onClose={() => setVerifyModalOpen(false)} title={`Pre-Approval Log Verification — ${selectedClientName}`}>
          <div className="p-4">
            {verifyLoading ? (
              <div className="flex flex-col items-center justify-center p-12 text-gray-500">
                <Loader2 className="w-8 h-8 animate-spin text-[#1F3864] mb-2" />
                <span>Running eligibility checks...</span>
              </div>
            ) : verifyData ? (
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded text-blue-800 text-sm">
                  <ShieldCheck className="w-5 h-5 flex-shrink-0" />
                  <div>
                    Checked <strong>{verifyData.total_checked}</strong> active employees.
                    <strong> {verifyData.eligible_count}</strong> are fully eligible for payroll processing.
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <h4 className="text-sm font-bold text-gray-700">Pre-Payroll Eligibility Checklist</h4>
                  
                  <div className="flex flex-col gap-2 max-h-[250px] overflow-y-auto">
                    {/* Eligible Green Markers */}
                    {verifyData.eligible_count === verifyData.total_checked && (
                      <div className="flex items-start gap-2 text-green-700 text-sm">
                        <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0 text-green-600" />
                        <span>All active employees passed all baseline validation tests successfully.</span>
                      </div>
                    )}

                    {/* Exclusions List */}
                    {verifyData.exclusions.map((exclusion, idx) => (
                      <div key={`ex-${idx}`} className="flex items-start gap-2 text-red-700 text-sm bg-red-50 p-2 rounded border border-red-100">
                        <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0 text-red-600" />
                        <span><strong>Exclusion:</strong> {exclusion}</span>
                      </div>
                    ))}

                    {/* Warnings List */}
                    {verifyData.warnings.map((warning, idx) => (
                      <div key={`wa-${idx}`} className="flex items-start gap-2 text-amber-700 text-sm bg-amber-50 p-2 rounded border border-amber-100">
                        <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0 text-amber-500" />
                        <span><strong>Warning:</strong> {warning}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="text-xs text-gray-500 italic border-t border-gray-100 pt-2 mt-2">
                  * Note: Verification is a point-in-time snapshot. It checks current document validity, bank info, and exit requests. Initiating a payroll run always re-evaluates eligibility live.
                </div>
              </div>
            ) : null}
          </div>
          <div className="flex justify-end gap-3 p-4 border-t border-gray-200 bg-gray-50 rounded-b-lg">
            <Button variant="secondary" onClick={() => setVerifyModalOpen(false)}>Cancel</Button>
            <Button 
              variant="success" 
              onClick={markVerified} 
              disabled={verifyLoading || verifySaving || !verifyData}
            >
              {verifySaving ? 'Saving...' : 'Mark as Verified'}
            </Button>
          </div>
        </Modal>

      </AuthenticatedLayout>
    </RoleGuard>
  );
}
