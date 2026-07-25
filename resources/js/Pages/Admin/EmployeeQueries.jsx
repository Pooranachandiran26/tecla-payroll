import React, { useState } from 'react';
import AuthenticatedLayout from '../../Layouts/AuthenticatedLayout';
import { Head, useForm, router } from '@inertiajs/react';
import { MessageSquare, CheckCircle, Clock, Search, Filter, MessageCircle, User, Building, RotateCcw } from 'lucide-react';
import Button from '../../Components/ui/Button';

export default function EmployeeQueries({ queries = [], stats = { total: 0, pending: 0, resolved: 0 }, pendingCount = 0, clients = [], filters = {} }) {
  const [selectedQuery, setSelectedQuery] = useState(null);
  const [search, setSearch] = useState(filters.search || '');
  const [clientId, setClientId] = useState(filters.client_id || '');
  const [statusFilter, setStatusFilter] = useState(filters.status || 'all');
  const [categoryFilter, setCategoryFilter] = useState(filters.category || 'all');

  const { data, setData, post, processing, errors, reset } = useForm({
    admin_response: '',
  });

  const applyFilters = () => {
    router.get(
      route('admin.employee-queries.index'),
      {
        search,
        client_id: clientId,
        status: statusFilter,
        category: categoryFilter,
      },
      { preserveState: true, preserveScroll: true }
    );
  };

  const resetFilters = () => {
    setSearch('');
    setClientId('');
    setStatusFilter('all');
    setCategoryFilter('all');
    router.get(route('admin.employee-queries.index'), {}, { preserveState: true, preserveScroll: true });
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      applyFilters();
    }
  };

  const handleRespond = (e) => {
    e.preventDefault();
    if (!selectedQuery) return;

    post(route('admin.employee-queries.respond', selectedQuery.id), {
      onSuccess: () => {
        reset();
        setSelectedQuery(null);
      },
    });
  };

  const getCategoryBadgeClass = (category) => {
    switch (category) {
      case 'payroll':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'attendance':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'leave':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'benefits':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'resolved':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1 rounded-full">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> Resolved
          </span>
        );
      case 'in_progress':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1 rounded-full">
            <Clock className="w-3.5 h-3.5 text-blue-600" /> In Progress
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 px-3 py-1 rounded-full">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span> Pending
          </span>
        );
    }
  };

  const totalQueriesCount = stats.total || queries.length;
  const pendingQueriesCount = stats.pending !== undefined ? stats.pending : pendingCount;
  const resolvedQueriesCount = stats.resolved !== undefined ? stats.resolved : (totalQueriesCount - pendingQueriesCount);

  return (
    <AuthenticatedLayout>
      <Head title="Employee Queries & Support Queue" />

      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Header Title */}
        <div>
          <h1 className="text-2xl font-bold text-[#1F3864]">Employee Queries & Support Queue</h1>
          <p className="text-gray-500 text-sm mt-1">Review, respond to, and resolve support queries submitted by employees across client organizations.</p>
        </div>

        {/* Summary KPI Cards Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Total Queries</p>
              <h3 className="text-2xl font-bold text-[#1F3864] mt-1">{totalQueriesCount}</h3>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg text-[#1F3864]">
              <MessageSquare className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-amber-600">Pending Response</p>
              <h3 className="text-2xl font-bold text-amber-700 mt-1">{pendingQueriesCount}</h3>
            </div>
            <div className="p-3 bg-amber-50 rounded-lg text-amber-600">
              <Clock className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600">Resolved Queries</p>
              <h3 className="text-2xl font-bold text-emerald-700 mt-1">{resolvedQueriesCount}</h3>
            </div>
            <div className="p-3 bg-emerald-50 rounded-lg text-emerald-600">
              <CheckCircle className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Structured Filter Controls Bar */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
            {/* Search Input */}
            <div className="md:col-span-4">
              <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Search Employee / Client / Subject</label>
              <div className="relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search by name, code, subject..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={handleKeyPress}
                  className="w-full text-sm pl-9 pr-3 py-2 border-gray-300 rounded-lg focus:border-[#1F3864] focus:ring-[#1F3864]"
                />
              </div>
            </div>

            {/* Client Filter */}
            <div className="md:col-span-3">
              <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Client Filter</label>
              <select
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                className="w-full text-sm border-gray-300 rounded-lg focus:border-[#1F3864] focus:ring-[#1F3864]"
              >
                <option value="">All Clients</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.company_name}</option>
                ))}
              </select>
            </div>

            {/* Category Filter */}
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Category</label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full text-sm border-gray-300 rounded-lg focus:border-[#1F3864] focus:ring-[#1F3864]"
              >
                <option value="all">All Categories</option>
                <option value="payroll">Payroll</option>
                <option value="attendance">Attendance</option>
                <option value="leave">Leave</option>
                <option value="benefits">Benefits</option>
                <option value="general">General</option>
              </select>
            </div>

            {/* Status Filter */}
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full text-sm border-gray-300 rounded-lg focus:border-[#1F3864] focus:ring-[#1F3864]"
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending Only</option>
                <option value="resolved">Resolved Only</option>
              </select>
            </div>

            {/* Action Buttons */}
            <div className="md:col-span-1 flex gap-2">
              <Button variant="navy" size="md" onClick={applyFilters} className="w-full justify-center">
                <Filter className="w-4 h-4" />
              </Button>
              <Button variant="secondary" size="md" onClick={resetFilters} title="Reset Filters" className="justify-center">
                <RotateCcw className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Queries Table */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-xs">
              <thead className="bg-[#F8FAFC]">
                <tr>
                  <th className="px-5 py-3.5 text-left font-bold text-[#1F3864] uppercase tracking-wider">Employee</th>
                  <th className="px-5 py-3.5 text-left font-bold text-[#1F3864] uppercase tracking-wider">Client</th>
                  <th className="px-5 py-3.5 text-left font-bold text-[#1F3864] uppercase tracking-wider">Category &amp; Subject</th>
                  <th className="px-5 py-3.5 text-left font-bold text-[#1F3864] uppercase tracking-wider">Submitted Date</th>
                  <th className="px-5 py-3.5 text-center font-bold text-[#1F3864] uppercase tracking-wider">Status</th>
                  <th className="px-5 py-3.5 text-right font-bold text-[#1F3864] uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {queries.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-gray-400">
                      <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-30 text-[#1F3864]" />
                      <p className="font-medium text-sm text-gray-700">No employee queries found matching specified filters.</p>
                      <p className="text-xs text-gray-400 mt-1">Try resetting filters or adjusting search keywords.</p>
                    </td>
                  </tr>
                ) : (
                  queries.map((q) => (
                    <tr key={q.id} className="hover:bg-blue-50/40 transition-colors">
                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="font-bold text-gray-900 text-sm">
                          {q.employee ? q.employee.full_name : '—'}
                        </div>
                        <div className="text-xs text-gray-500 font-mono mt-0.5">
                          {q.employee ? q.employee.employee_code : '—'}
                        </div>
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-gray-100 border border-gray-200 font-medium text-gray-800 text-xs">
                          <Building className="w-3.5 h-3.5 text-[#1F3864]" />
                          <span>{q.client ? q.client.company_name : '—'}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${getCategoryBadgeClass(q.category)}`}>
                            {q.category}
                          </span>
                          <span className="font-semibold text-gray-900 text-sm">{q.subject}</span>
                        </div>
                        <div className="text-xs text-gray-500 line-clamp-1 max-w-lg">
                          {q.message}
                        </div>
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap text-gray-600 text-xs font-medium">
                        {new Date(q.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap text-center">
                        {getStatusBadge(q.status)}
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap text-right">
                        <Button
                          size="sm"
                          variant={q.status === 'resolved' ? 'secondary' : 'navy'}
                          onClick={() => {
                            setSelectedQuery(q);
                            setData('admin_response', q.admin_response || '');
                          }}
                        >
                          {q.status === 'resolved' ? 'View Details' : 'Respond & Resolve'}
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Response Modal */}
      {selectedQuery && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full p-6 shadow-2xl relative border border-gray-200 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between border-b border-gray-200 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-[#1F3864]" />
                <h3 className="font-bold text-base text-[#1F3864]">Employee Query Details</h3>
              </div>
              <button
                onClick={() => setSelectedQuery(null)}
                className="text-gray-400 hover:text-gray-600 font-bold text-lg p-1 rounded-full hover:bg-gray-100 transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-5 space-y-2.5 text-xs">
              <div className="flex justify-between border-b border-slate-200 pb-2">
                <span className="text-gray-500 font-medium">Employee:</span>
                <span className="font-bold text-gray-900">
                  {selectedQuery.employee ? `${selectedQuery.employee.full_name} (${selectedQuery.employee.employee_code})` : '—'}
                </span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-2">
                <span className="text-gray-500 font-medium">Client Organization:</span>
                <span className="font-bold text-gray-900">{selectedQuery.client ? selectedQuery.client.company_name : '—'}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-2">
                <span className="text-gray-500 font-medium">Category &amp; Subject:</span>
                <span className="font-bold text-gray-900">[{selectedQuery.category.toUpperCase()}] {selectedQuery.subject}</span>
              </div>
              <div>
                <span className="text-gray-600 block mb-1 font-semibold">Employee Message:</span>
                <div className="bg-white p-3 rounded-lg border border-slate-200 text-gray-800 whitespace-pre-line leading-relaxed text-xs">
                  {selectedQuery.message}
                </div>
              </div>
            </div>

            <form onSubmit={handleRespond} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1 uppercase tracking-wider">
                  Admin Response / Resolution Note
                </label>
                <textarea
                  rows={4}
                  placeholder="Type your response to the employee here..."
                  value={data.admin_response}
                  onChange={(e) => setData('admin_response', e.target.value)}
                  className="w-full text-sm border-gray-300 rounded-lg shadow-sm focus:border-[#1F3864] focus:ring-[#1F3864]"
                />
                {errors.admin_response && <p className="text-red-500 text-xs mt-1">{errors.admin_response}</p>}
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button variant="secondary" onClick={() => setSelectedQuery(null)}>
                  Cancel
                </Button>
                <Button type="submit" variant="navy" loading={processing}>
                  Submit Response &amp; Resolve
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AuthenticatedLayout>
  );
}
