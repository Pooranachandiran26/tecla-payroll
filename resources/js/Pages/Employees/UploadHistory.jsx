import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import RoleGuard from '@/Components/RoleGuard';
import Badge from '@/Components/ui/Badge';
import Pagination from '@/Components/ui/Pagination';
import { 
  FileSpreadsheet, 
  Clock, 
  FileText,
  CheckCircle2,
  XCircle,
  User,
  Layers,
  Eye,
  Loader2,
  X,
  Search,
  Download
} from 'lucide-react';
import axios from 'axios';

export default function UploadHistory({ 
  batches = { data: [], links: [] }, 
  stats = {}, 
  filters = {}, 
  uploaders = [], 
  auditLogs = [] 
}) {
  const [selectedBatchDetails, setSelectedBatchDetails] = useState(null);
  const [loadingBatchId, setLoadingBatchId] = useState(null);
  const [detailFilter, setDetailFilter] = useState('all');
  const [detailSearch, setDetailSearch] = useState('');

  const handleViewDetails = async (batchId) => {
    setLoadingBatchId(batchId);
    try {
      const response = await axios.get(route('employees.bulk-upload.history.details', { batchId }));
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
        (row.personal_email || '').toLowerCase().includes(term) ||
        (row.error_message || '').toLowerCase().includes(term)
      );
    }
    return true;
  });

  return (
    <RoleGuard allowedRoles={['admin', 'manager']}>
      <AuthenticatedLayout>
        <Head title="Upload History" />

        {/* Top Header & Navigation Switcher */}
        <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-gray-500 mb-1 font-semibold">
              <Link href={route('employees.index')} className="hover:underline text-[#1F3864]">Employees</Link>
              <span>/</span>
              <span className="text-gray-700">Upload History</span>
            </div>
            <h2 className="text-2xl font-bold text-[#1F3864]">Upload History</h2>
          </div>

          {/* Tab Navigation Switcher */}
          <div className="flex items-center bg-gray-200/70 p-1 rounded-xl shadow-inner text-xs font-bold border border-gray-300/50">
            <Link
              href={route('employees.bulk-upload')}
              className="px-4 py-2 rounded-lg text-gray-600 hover:text-gray-900 transition-all flex items-center gap-1.5"
            >
              <FileSpreadsheet className="w-4 h-4 text-indigo-600" />
              <span>Excel Uploader</span>
            </Link>
            <span className="px-4 py-2 rounded-lg bg-white text-[#1F3864] shadow-sm font-bold flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-[#1F3864]" />
              <span>Upload History</span>
            </span>
          </div>
        </div>

        {/* KPI Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[0.65rem] font-semibold text-gray-500 uppercase tracking-wider block">Total Uploads</span>
              <div className="text-xl font-black text-gray-900">{stats.total_batches || 0}</div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[0.65rem] font-semibold text-gray-500 uppercase tracking-wider block">Total Records</span>
              <div className="text-xl font-black text-gray-900">{(stats.total_records || 0).toLocaleString()}</div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-50 text-green-600 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[0.65rem] font-semibold text-gray-500 uppercase tracking-wider block">Success Rate</span>
              <div className="text-xl font-black text-green-700">{stats.success_rate || 100}%</div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[0.65rem] font-semibold text-gray-500 uppercase tracking-wider block">Avg Speed</span>
              <div className="text-xl font-black text-amber-800">{stats.avg_processing_time || '—'}</div>
            </div>
          </div>
        </div>

        {/* Simple Upload History Table */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-bold text-base text-[#1F3864] m-0 flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-indigo-600" />
              <span>Upload Batches</span>
            </h3>
            <span className="text-xs font-semibold text-gray-500">
              {batches.data.length} {batches.data.length === 1 ? 'record' : 'records'}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 uppercase tracking-wider font-bold">
                <tr>
                  <th className="py-3 px-4">File Name</th>
                  <th className="py-3 px-4 text-center">Total Records</th>
                  <th className="py-3 px-4 text-center">Success</th>
                  <th className="py-3 px-4 text-center">Failures</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Created By</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {batches.data.length > 0 ? (
                  batches.data.map(batch => (
                    <tr key={batch.id} className="hover:bg-gray-50/80 transition-colors">
                      {/* File Name */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                            <FileText className="w-4 h-4" />
                          </div>
                          <div className="font-bold text-gray-900 truncate max-w-[220px]" title={batch.file_name}>
                            {batch.file_name}
                          </div>
                        </div>
                      </td>

                      {/* Total Records */}
                      <td className="py-3.5 px-4 text-center">
                        <span className="font-black text-sm text-gray-900">{(batch.total_rows || 0).toLocaleString()}</span>
                      </td>

                      {/* Success */}
                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[0.7rem] font-bold bg-green-50 text-green-700 border border-green-200">
                          <CheckCircle2 className="w-3 h-3" />
                          {(batch.valid_count || 0).toLocaleString()}
                        </span>
                      </td>

                      {/* Failures */}
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

                      {/* Status */}
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

                      {/* Created By */}
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

                      {/* Date */}
                      <td className="py-3.5 px-4 text-gray-600 font-medium whitespace-nowrap">
                        <div className="text-xs">{new Date(batch.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                        <div className="text-[0.6rem] text-gray-400">{new Date(batch.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</div>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleViewDetails(batch.id)}
                            disabled={loadingBatchId !== null}
                            className="px-2.5 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-all flex items-center gap-1 inline-flex animate-fade-in"
                          >
                            {loadingBatchId === batch.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Eye className="w-3.5 h-3.5" />
                            )}
                            <span>View</span>
                          </button>

                          {batch.error_count > 0 && (
                            <a
                              href={route('employees.bulk-upload.history.download-errors', { batchId: batch.id })}
                              className="px-2.5 py-1.5 text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-all flex items-center gap-1 inline-flex shadow-xs"
                              title="Download Error Report (.CSV)"
                            >
                              <Download className="w-3.5 h-3.5 text-red-600" />
                              <span>Errors</span>
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="8" className="py-16 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <FileSpreadsheet className="w-10 h-10 text-gray-300" />
                        <span className="text-sm font-semibold text-gray-400">No upload history found</span>
                        <span className="text-xs text-gray-400">Upload an Excel file to see records here.</span>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {batches.links && batches.links.length > 3 && (
            <div className="p-4 border-t border-gray-100 flex items-center justify-between">
              <span className="text-xs text-gray-500 font-medium">Page {batches.current_page} of {batches.last_page}</span>
              <Pagination links={batches.links} />
            </div>
          )}
        </div>

        {/* Batch Details Popup Modal */}
        {selectedBatchDetails && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <div 
              className="absolute inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
              onClick={() => setSelectedBatchDetails(null)}
            />

            <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl flex flex-col z-10 max-h-[90vh] overflow-hidden animate-scale-up">
              {/* Modal Header */}
              <div className="p-6 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-[#1F3864] m-0">{selectedBatchDetails.batch.file_name}</h3>
                  <p className="text-xs text-gray-500 mt-0.5 font-medium">
                    Uploaded by <strong>{selectedBatchDetails.batch.user?.name || 'System'}</strong> on {new Date(selectedBatchDetails.batch.created_at).toLocaleString()}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedBatchDetails(null)}
                  className="p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-200 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-6 overflow-y-auto flex-1 space-y-4">
                {/* Filter and Search Bar */}
                <div className="flex items-center justify-between flex-wrap gap-3 pb-3 border-b border-gray-100">
                  <div className="flex items-center gap-1.5 bg-gray-100 p-1 rounded-xl text-xs font-semibold">
                    <button
                      onClick={() => setDetailFilter('all')}
                      className={`px-3 py-1.5 rounded-lg transition-all ${detailFilter === 'all' ? 'bg-white text-[#1F3864] shadow-sm font-bold' : 'text-gray-600 hover:text-gray-900'}`}
                    >
                      All ({(selectedBatchDetails.rows || []).length})
                    </button>
                    <button
                      onClick={() => setDetailFilter('ready')}
                      className={`px-3 py-1.5 rounded-lg transition-all ${detailFilter === 'ready' ? 'bg-white text-green-700 shadow-sm font-bold' : 'text-gray-600 hover:text-green-600'}`}
                    >
                      Success ({(selectedBatchDetails.rows || []).filter(r => r.status === 'ready').length})
                    </button>
                    <button
                      onClick={() => setDetailFilter('error')}
                      className={`px-3 py-1.5 rounded-lg transition-all ${detailFilter === 'error' ? 'bg-white text-red-700 shadow-sm font-bold' : 'text-gray-600 hover:text-red-600'}`}
                    >
                      Failure ({(selectedBatchDetails.rows || []).filter(r => r.status === 'error').length})
                    </button>
                  </div>

                  <div className="relative w-full sm:w-64">
                    <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search name or employee code..."
                      value={detailSearch}
                      onChange={(e) => setDetailSearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-gray-300 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 font-medium"
                    />
                  </div>
                </div>

                {/* Staging Rows Table */}
                <div className="border border-gray-200 rounded-xl overflow-hidden text-xs max-h-96 overflow-y-auto">
                  <table className="w-full text-left">
                    <thead className="bg-gray-100 font-bold text-gray-700">
                      <tr>
                        <th className="py-2.5 px-3">Row</th>
                        <th className="py-2.5 px-3">Emp Code</th>
                        <th className="py-2.5 px-3">Full Name</th>
                        <th className="py-2.5 px-3">Email</th>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3">Validation Message / Reason</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredDetailRows.length > 0 ? (
                        filteredDetailRows.map(r => (
                          <tr key={r.id} className={r.status === 'error' ? 'bg-red-50/50' : ''}>
                            <td className="py-2 px-3 font-mono font-bold text-gray-500">{r.row_no}</td>
                            <td className="py-2 px-3 font-semibold">{r.employee_code || '—'}</td>
                            <td className="py-2 px-3 font-bold text-gray-900">{r.full_name || '—'}</td>
                            <td className="py-2 px-3 text-gray-600">{r.personal_email || '—'}</td>
                            <td className="py-2 px-3">
                              <span className={`px-2 py-0.5 rounded text-[0.65rem] font-bold ${
                                r.status === 'ready' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                              }`}>
                                {r.status === 'ready' ? 'SUCCESS' : 'FAILURE'}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-xs font-medium">
                              <span className={r.status === 'error' ? 'text-red-700 font-semibold' : 'text-green-700'}>
                                {r.error_message || 'Valid'}
                              </span>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="6" className="py-8 text-center text-gray-400 font-medium">
                            No employees match filters.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-end">
                <button
                  onClick={() => setSelectedBatchDetails(null)}
                  className="px-4 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-xl transition-all shadow-sm"
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
