import React, { useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import AuthenticatedLayout from '../../Layouts/AuthenticatedLayout';
import RoleGuard from '../../Components/RoleGuard.jsx';
import Badge from '../../Components/ui/Badge';
import Pagination from '../../Components/ui/Pagination';
import { 
  FileSpreadsheet, 
  Clock, 
  CheckCircle2,
  XCircle,
  Eye,
  Loader2,
  X,
  Search,
  Download
} from 'lucide-react';
import axios from 'axios';

export default function AttendanceUploadHistory({ batches, kpis }) {
  const [selectedBatchDetails, setSelectedBatchDetails] = useState(null);
  const [loadingBatchId, setLoadingBatchId] = useState(null);
  const [detailFilter, setDetailFilter] = useState('all');
  const [detailSearch, setDetailSearch] = useState('');

  const handleViewDetails = async (batchId) => {
    setLoadingBatchId(batchId);
    try {
      const response = await axios.get(route('payroll.attendance.history.details', { batchId }));
      setSelectedBatchDetails(response.data);
      setDetailFilter('all');
      setDetailSearch('');
    } catch (error) {
      alert('Failed to load batch details: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoadingBatchId(null);
    }
  };

  const filteredDetailRows = (selectedBatchDetails?.rows || []).filter(row => {
    if (detailFilter !== 'all') {
      if (detailFilter === 'ready' && row.status !== 'ready') return false;
      if (detailFilter === 'error' && row.status !== 'error') return false;
    }
    if (detailSearch) {
      const term = detailSearch.toLowerCase();
      return (
        (row.full_name || '').toLowerCase().includes(term) ||
        (row.employee_code || '').toLowerCase().includes(term) ||
        (row.error_message || '').toLowerCase().includes(term)
      );
    }
    return true;
  });

  return (
    <RoleGuard allowedRoles={['admin', 'manager']} moduleKey="payroll">
      <AuthenticatedLayout>
        <Head title="Attendance Upload History" />

        {/* Top Header & Navigation Switcher */}
        <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-gray-500 mb-1 font-semibold">
              <Link href={route('payroll.attendance-review')} className="hover:underline text-[#1F3864]">Attendance Review</Link>
              <span>/</span>
              <span className="text-gray-700">Upload History</span>
            </div>
            <h2 className="text-2xl font-bold text-[#1F3864]">Attendance Upload History</h2>
          </div>

          {/* Tab Navigation Switcher */}
          <div className="flex items-center bg-gray-200/70 p-1 rounded-xl shadow-inner text-xs font-bold border border-gray-300/50">
            <Link
              href={route('payroll.attendance-upload')}
              className="px-4 py-2 rounded-lg text-gray-600 hover:text-gray-900 transition-all flex items-center gap-1.5"
            >
              <FileSpreadsheet className="w-4 h-4 text-[#1F3864]" />
              <span>Excel Uploader</span>
            </Link>
            <span className="px-4 py-2 rounded-lg bg-white text-[#1F3864] shadow-sm font-bold flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-indigo-600" />
              <span>Upload History</span>
            </span>
          </div>
        </div>

        {/* KPI Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[0.65rem] text-gray-400 font-bold uppercase tracking-wider block">Total Uploads</span>
              <span className="text-lg font-extrabold text-[#1F3864]">{kpis.total_uploads}</span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[0.65rem] text-gray-400 font-bold uppercase tracking-wider block">Total Records</span>
              <span className="text-lg font-extrabold text-[#1F3864]">{kpis.total_records.toLocaleString()}</span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-50 text-green-600 flex items-center justify-center font-bold">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[0.65rem] text-gray-400 font-bold uppercase tracking-wider block">Success Rate</span>
              <span className="text-lg font-extrabold text-[#1F3864]">{kpis.success_rate}%</span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[0.65rem] text-gray-400 font-bold uppercase tracking-wider block">Avg Speed</span>
              <span className="text-lg font-extrabold text-[#1F3864]">{kpis.avg_speed}</span>
            </div>
          </div>
        </div>

        {/* Batches Table Card */}
        <div className="card p-0 mb-6 overflow-hidden">
          <div className="p-4 border-b border-gray-200 bg-gray-50/50 flex justify-between items-center">
            <span className="font-bold text-[#1F3864] text-sm">Upload Batches</span>
            <span className="text-[0.7rem] text-gray-400 font-bold uppercase">{batches.total || 0} records</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-gray-200 text-gray-400 font-bold uppercase bg-gray-50/50">
                  <th className="py-3 px-4">File Name</th>
                  <th className="py-3 px-4">Client</th>
                  <th className="py-3 px-4">Target Month</th>
                  <th className="py-3 px-4 text-center">Total Records</th>
                  <th className="py-3 px-4 text-center">Success</th>
                  <th className="py-3 px-4 text-center">Failures</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Created By</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium text-gray-700">
                {batches.data && batches.data.length > 0 ? (
                  batches.data.map(batch => (
                    <tr key={batch.id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-indigo-900 max-w-[200px] truncate">{batch.file_name}</td>
                      <td className="py-3.5 px-4">{batch.client?.company_name || 'N/A'}</td>
                      <td className="py-3.5 px-4">
                        {batch.target_month ? new Date(batch.target_month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'N/A'}
                      </td>
                      <td className="py-3.5 px-4 text-center font-bold">{(batch.total_rows || 0).toLocaleString()}</td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[0.7rem] font-bold bg-green-50 text-green-700 border border-green-200">
                          <CheckCircle2 className="w-3 h-3" />
                          {(batch.valid_count || 0).toLocaleString()}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {batch.error_count > 0 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[0.7rem] font-bold bg-red-50 text-red-700 border border-red-200">
                            <XCircle className="w-3 h-3" />
                            {batch.error_count.toLocaleString()}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[0.7rem] font-bold bg-gray-50 text-gray-400 border border-gray-200">
                            0
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <Badge
                          status={
                            batch.status === 'completed' ? (batch.error_count > 0 ? 'pending' : 'active') :
                            batch.status === 'failed' ? 'rejected' : 'pending'
                          }
                          label={
                            batch.status === 'completed' 
                              ? (batch.error_count > 0 ? 'PARTIAL' : 'COMPLETED') 
                              : batch.status.toUpperCase()
                          }
                        />
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-[0.65rem]">
                            {batch.user?.name ? batch.user.name.charAt(0).toUpperCase() : 'U'}
                          </div>
                          <div>
                            <div className="font-bold text-gray-800 text-xs">{batch.user?.name || 'System'}</div>
                            <span className="text-[0.6rem] text-gray-400 uppercase font-semibold">{batch.user?.role || 'admin'}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-gray-600 font-medium whitespace-nowrap">
                        <div className="text-xs">{new Date(batch.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                        <div className="text-[0.6rem] text-gray-400">{new Date(batch.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</div>
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Success Download Button */}
                          <a
                            href={route('payroll.attendance.history.download-success', { batchId: batch.id })}
                            className="p-1.5 rounded-lg text-green-700 bg-green-50 hover:bg-green-100 border border-green-200 transition-all inline-flex items-center justify-center shadow-2xs"
                            title="Download Success Report (.CSV)"
                          >
                            <Download className="w-4 h-4 text-green-600" />
                          </a>

                          {/* Failure Download Button */}
                          <a
                            href={batch.error_count > 0 ? route('payroll.attendance.history.download-errors', { batchId: batch.id }) : '#'}
                            onClick={(e) => { if ((batch.error_count || 0) === 0) e.preventDefault(); }}
                            className={`p-1.5 rounded-lg text-red-700 bg-red-50 border border-red-200 transition-all inline-flex items-center justify-center shadow-2xs ${
                              (batch.error_count || 0) > 0 ? 'hover:bg-red-100 cursor-pointer' : 'opacity-40 cursor-not-allowed'
                            }`}
                            title={(batch.error_count || 0) > 0 ? "Download Failure Report (.CSV)" : "No Failures to Download"}
                          >
                            <Download className="w-4 h-4 text-red-600" />
                          </a>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="10" className="py-8 text-center text-gray-400 italic">No attendance upload batches found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {batches.links && batches.data.length > 0 && (
            <div className="p-4 border-t border-gray-100 bg-gray-50/30">
              <Pagination links={batches.links} />
            </div>
          )}
        </div>

        {/* View Details Slide-Over / Modal Popup */}
        {selectedBatchDetails && (
          <div className="fixed inset-0 z-50 overflow-hidden flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-xs animate-fade-in">
            <div className="relative bg-white rounded-2xl max-w-4xl w-full shadow-2xl overflow-hidden animate-slide-up flex flex-col max-h-[90vh]">
              {/* Modal Header */}
              <div className="p-5 border-b border-gray-150 bg-gray-50/50 flex justify-between items-center shrink-0">
                <div>
                  <h3 className="text-sm font-bold text-[#1F3864] flex items-center gap-2 max-w-[500px] truncate">
                    <span>📁</span> {selectedBatchDetails.batch.file_name}
                  </h3>
                  <span className="text-[0.65rem] text-gray-400 font-semibold block mt-0.5">
                    Uploaded by {selectedBatchDetails.batch.user?.name} on {new Date(selectedBatchDetails.batch.created_at).toLocaleString('en-US')}
                  </span>
                </div>
                <button 
                  onClick={() => setSelectedBatchDetails(null)}
                  className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-250 text-gray-500 hover:text-gray-700 transition-all flex items-center justify-center border border-gray-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Filter Tabs & Search Bar */}
              <div className="px-5 py-3 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-3 shrink-0">
                <div className="flex gap-1.5 bg-gray-100 p-1 rounded-xl text-[0.7rem] font-bold border border-gray-200/50">
                  <button
                    onClick={() => setDetailFilter('all')}
                    className={`px-3 py-1.5 rounded-lg transition-all ${detailFilter === 'all' ? 'bg-white text-indigo-900 shadow-xs' : 'text-gray-500 hover:text-gray-800'}`}
                  >
                    All ({selectedBatchDetails.rows.length})
                  </button>
                  <button
                    onClick={() => setDetailFilter('ready')}
                    className={`px-3 py-1.5 rounded-lg transition-all ${detailFilter === 'ready' ? 'bg-white text-green-700 shadow-xs' : 'text-gray-500 hover:text-gray-800'}`}
                  >
                    Success ({selectedBatchDetails.rows.filter(r => r.status === 'ready').length})
                  </button>
                  <button
                    onClick={() => setDetailFilter('error')}
                    className={`px-3 py-1.5 rounded-lg transition-all ${detailFilter === 'error' ? 'bg-white text-red-700 shadow-xs' : 'text-gray-500 hover:text-gray-800'}`}
                  >
                    Failure ({selectedBatchDetails.rows.filter(r => r.status === 'error').length})
                  </button>
                </div>

                <div className="relative w-full sm:w-60">
                  <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search employee..."
                    value={detailSearch}
                    onChange={(e) => setDetailSearch(e.target.value)}
                    className="w-full text-xs pl-8 pr-3 py-2 border border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-medium"
                  />
                </div>
              </div>

              {/* Data Table */}
              <div className="overflow-y-auto grow p-5">
                <table className="w-full text-left border-collapse text-[0.75rem]">
                  <thead>
                    <tr className="border-b border-gray-200 text-gray-400 font-bold uppercase pb-2">
                      <th className="py-2.5 px-3">Row</th>
                      <th className="py-2.5 px-3">Emp Code</th>
                      <th className="py-2.5 px-3">Full Name</th>
                      <th className="py-2.5 px-3">Days Present</th>
                      <th className="py-2.5 px-3">Days LOP</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Validation Message / Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 font-medium text-gray-700">
                    {filteredDetailRows.length > 0 ? (
                      filteredDetailRows.map((row, idx) => (
                        <tr key={row.id || idx} className="hover:bg-gray-50/60 transition-colors">
                          <td className="py-2.5 px-3 font-semibold text-gray-400">{row.id || idx + 1}</td>
                          <td className="py-2.5 px-3 font-bold text-indigo-950">{row.employee_code}</td>
                          <td className="py-2.5 px-3">{row.full_name || 'N/A'}</td>
                          <td className="py-2.5 px-3">{row.days_present} Days</td>
                          <td className="py-2.5 px-3">{row.days_lop} Days</td>
                          <td className="py-2.5 px-3">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${row.status === 'ready' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                              {row.status === 'ready' ? 'Success' : 'Error'}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-red-600 leading-snug font-semibold">{row.error_message || '—'}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="7" className="py-8 text-center text-gray-400 italic">No employees match filters.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Close Button */}
              <div className="p-4 border-t border-gray-150 bg-gray-50/50 flex justify-end shrink-0">
                <button
                  onClick={() => setSelectedBatchDetails(null)}
                  className="px-4 py-2 text-xs font-bold text-gray-700 bg-white hover:bg-gray-100 border border-gray-200 rounded-xl transition-all shadow-xs"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </AuthenticatedLayout>
    </RoleGuard>
  );
}
