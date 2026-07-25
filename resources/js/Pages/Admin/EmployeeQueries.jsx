import React, { useState } from 'react';
import AuthenticatedLayout from '../../Layouts/AuthenticatedLayout';
import { Head, useForm, router } from '@inertiajs/react';
import { MessageSquare, CheckCircle, Clock, Search, Filter, MessageCircle, User, Building } from 'lucide-react';
import Button from '../../Components/ui/Button';

export default function EmployeeQueries({ queries = [], pendingCount = 0, filters = {} }) {
  const [selectedQuery, setSelectedQuery] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState(filters.status || 'all');
  const [categoryFilter, setCategoryFilter] = useState(filters.category || 'all');

  const { data, setData, post, processing, errors, reset } = useForm({
    admin_response: '',
  });

  const handleFilterChange = (newStatus, newCategory) => {
    setStatusFilter(newStatus);
    setCategoryFilter(newCategory);
    router.get(
      route('admin.employee-queries.index'),
      { status: newStatus, category: newCategory },
      { preserveState: true }
    );
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

  const filteredQueries = queries.filter((q) => {
    const searchLower = search.toLowerCase();
    const empName = q.employee ? `${q.employee.first_name} ${q.employee.last_name}`.toLowerCase() : '';
    const empCode = q.employee ? q.employee.employee_code.toLowerCase() : '';
    const clientName = q.client ? q.client.company_name.toLowerCase() : '';
    const subject = q.subject ? q.subject.toLowerCase() : '';

    return (
      empName.includes(searchLower) ||
      empCode.includes(searchLower) ||
      clientName.includes(searchLower) ||
      subject.includes(searchLower)
    );
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'resolved':
        return <span className="inline-flex items-center gap-1 text-xs font-semibold bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full"><CheckCircle className="w-3.5 h-3.5" /> Resolved</span>;
      case 'in_progress':
        return <span className="inline-flex items-center gap-1 text-xs font-semibold bg-blue-100 text-blue-800 px-2.5 py-0.5 rounded-full"><Clock className="w-3.5 h-3.5" /> In Progress</span>;
      default:
        return <span className="inline-flex items-center gap-1 text-xs font-semibold bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded-full"><Clock className="w-3.5 h-3.5" /> Pending</span>;
    }
  };

  return (
    <AuthenticatedLayout>
      <Head title="Employee Queries Queue" />

      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-[#1F3864]">Employee Queries & Support Queue</h1>
            <p className="text-gray-500 text-sm">Review, respond to, and resolve support queries submitted by employees across client organizations.</p>
          </div>
          {pendingCount > 0 && (
            <div className="bg-amber-50 border border-amber-200 text-amber-800 font-semibold text-xs px-3.5 py-2 rounded-lg flex items-center gap-2 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
              <span>{pendingCount} Pending Queries Awaiting Response</span>
            </div>
          )}
        </div>

        {/* Filter Controls */}
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1 min-w-[280px]">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by employee name, code, client, or subject..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full text-xs pl-9 pr-3 py-2 border-gray-300 rounded-md shadow-sm focus:border-[#1F3864] focus:ring-[#1F3864]"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-500" />
              <span className="text-xs font-medium text-gray-700">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => handleFilterChange(e.target.value, categoryFilter)}
                className="text-xs border-gray-300 rounded-md focus:border-[#1F3864] focus:ring-[#1F3864]"
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending Only</option>
                <option value="resolved">Resolved Only</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-gray-700">Category:</span>
              <select
                value={categoryFilter}
                onChange={(e) => handleFilterChange(statusFilter, e.target.value)}
                className="text-xs border-gray-300 rounded-md focus:border-[#1F3864] focus:ring-[#1F3864]"
              >
                <option value="all">All Categories</option>
                <option value="payroll">Payroll</option>
                <option value="attendance">Attendance</option>
                <option value="leave">Leave</option>
                <option value="benefits">Benefits</option>
                <option value="general">General</option>
              </select>
            </div>
          </div>
        </div>

        {/* Queries Table */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200 text-xs">
            <thead className="bg-[#F8FAFC]">
              <tr>
                <th className="px-4 py-3 text-left font-bold text-[#1F3864] uppercase tracking-wider">Employee</th>
                <th className="px-4 py-3 text-left font-bold text-[#1F3864] uppercase tracking-wider">Client</th>
                <th className="px-4 py-3 text-left font-bold text-[#1F3864] uppercase tracking-wider">Category & Subject</th>
                <th className="px-4 py-3 text-left font-bold text-[#1F3864] uppercase tracking-wider">Submitted Date</th>
                <th className="px-4 py-3 text-center font-bold text-[#1F3864] uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-right font-bold text-[#1F3864] uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {filteredQueries.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-gray-400">
                    <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p className="font-medium text-sm">No employee queries found matching your filters.</p>
                  </td>
                </tr>
              ) : (
                filteredQueries.map((q) => (
                  <tr key={q.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="font-semibold text-gray-900">
                        {q.employee ? q.employee.full_name : '—'}
                      </div>
                      <div className="text-[11px] text-gray-500 font-mono">
                        {q.employee ? q.employee.employee_code : '—'}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="font-medium text-gray-800 flex items-center gap-1">
                        <Building className="w-3.5 h-3.5 text-gray-400" />
                        {q.client ? q.client.company_name : '—'}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <span className="text-[10px] font-bold uppercase bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-100 mr-1.5">
                          {q.category}
                        </span>
                        <span className="font-medium text-gray-900">{q.subject}</span>
                      </div>
                      <div className="text-[11px] text-gray-500 truncate max-w-md mt-0.5">
                        {q.message}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-gray-600">
                      {new Date(q.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-center">
                      {getStatusBadge(q.status)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right">
                      <Button
                        size="sm"
                        variant={q.status === 'resolved' ? 'secondary' : 'primary'}
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

      {/* Response Modal */}
      {selectedQuery && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6 shadow-xl relative border border-gray-200">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-[#1F3864]" />
                <h3 className="font-bold text-base text-[#1F3864]">Employee Query Details</h3>
              </div>
              <button
                onClick={() => setSelectedQuery(null)}
                className="text-gray-400 hover:text-gray-600 font-bold text-lg"
              >
                ✕
              </button>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-4 space-y-2 text-xs">
              <div className="flex justify-between border-b border-gray-200 pb-2">
                <span className="text-gray-500">Employee:</span>
                <span className="font-bold text-gray-900">
                  {selectedQuery.employee ? `${selectedQuery.employee.full_name} (${selectedQuery.employee.employee_code})` : '—'}
                </span>
              </div>
              <div className="flex justify-between border-b border-gray-200 pb-2">
                <span className="text-gray-500">Client:</span>
                <span className="font-bold text-gray-900">{selectedQuery.client ? selectedQuery.client.company_name : '—'}</span>
              </div>
              <div className="flex justify-between border-b border-gray-200 pb-2">
                <span className="text-gray-500">Category & Subject:</span>
                <span className="font-bold text-gray-900">[{selectedQuery.category.toUpperCase()}] {selectedQuery.subject}</span>
              </div>
              <div>
                <span className="text-gray-500 block mb-1 font-semibold">Employee Message:</span>
                <div className="bg-white p-3 rounded border border-gray-200 text-gray-800 whitespace-pre-line leading-relaxed">
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
                  placeholder="Type your response to the employee..."
                  value={data.admin_response}
                  onChange={(e) => setData('admin_response', e.target.value)}
                  className="w-full text-xs border-gray-300 rounded-md shadow-sm focus:border-[#1F3864] focus:ring-[#1F3864]"
                />
                {errors.admin_response && <p className="text-red-500 text-xs mt-1">{errors.admin_response}</p>}
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <Button variant="secondary" type="button" onClick={() => setSelectedQuery(null)}>
                  Close
                </Button>
                <Button variant="primary" type="submit" loading={processing}>
                  Submit Response & Resolve
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AuthenticatedLayout>
  );
}
