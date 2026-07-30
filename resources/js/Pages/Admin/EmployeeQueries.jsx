import React, { useState } from 'react';
import AuthenticatedLayout from '../../Layouts/AuthenticatedLayout';
import { Head, Link, useForm, router } from '@inertiajs/react';
import RoleGuard from '../../Components/RoleGuard.jsx';
import Modal from '../../Components/ui/Modal';
import Button from '../../Components/ui/Button';
import Badge from '../../Components/ui/Badge';
import useToast from '../../Hooks/useToast.jsx';
import { ArrowLeft, MessageSquare, Clock, CheckCircle2, Filter, RotateCcw, Building2, Eye, Send } from 'lucide-react';

export default function EmployeeQueries({ queries = [], stats = { total: 0, pending: 0, resolved: 0 }, pendingCount = 0, clients = [], filters = {} }) {
  const { showToast } = useToast();
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
    if (!selectedQuery || !data.admin_response.trim()) return;

    post(route('admin.employee-queries.respond', selectedQuery.id), {
      onSuccess: (page) => {
        showToast({ message: page.props.flash?.success || 'Query response recorded successfully.', type: 'success' });
        reset();
        setSelectedQuery(null);
      },
      onError: () => {
        showToast({ message: 'Failed to record response. Please check inputs.', type: 'error' });
      }
    });
  };

  const getCategoryBadgeVariant = (category) => {
    switch (category) {
      case 'payroll': return 'info';
      case 'attendance': return 'warning';
      case 'leave': return 'neutral';
      case 'benefits': return 'success';
      default: return 'neutral';
    }
  };

  const totalQueriesCount = stats.total || queries.length;
  const pendingQueriesCount = stats.pending !== undefined ? stats.pending : pendingCount;
  const resolvedQueriesCount = stats.resolved !== undefined ? stats.resolved : (totalQueriesCount - pendingQueriesCount);

  return (
    <RoleGuard allowedRoles={['admin', 'manager']}>
      <AuthenticatedLayout>
        <Head title="Employee Queries Queue" />

        <div className="mb-6">
          <Link href={route('employees.index')} className="text-[0.85rem] font-semibold text-[#1F3864] hover:underline inline-flex items-center gap-1">
            <ArrowLeft size={14} /> Back to Employees Directory
          </Link>
          <h2 className="text-2xl font-bold text-[#1F3864] mt-2 mb-1">Employee Queries &amp; Support Queue</h2>
          <p className="text-gray-500 text-sm">Review, respond to, and resolve support queries submitted by employees across client organizations.</p>
        </div>

        {/* Summary KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100 flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm font-medium mb-1">Total Queries</p>
              <h3 className="text-3xl font-bold text-[#1F3864]">{totalQueriesCount}</h3>
            </div>
            <div className="h-12 w-12 bg-blue-50 rounded-full flex items-center justify-center text-[#1F3864]">
              <MessageSquare size={24} />
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100 flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm font-medium mb-1">Pending Response</p>
              <h3 className="text-3xl font-bold text-amber-600">{pendingQueriesCount}</h3>
            </div>
            <div className="h-12 w-12 bg-amber-50 rounded-full flex items-center justify-center text-amber-600">
              <Clock size={24} />
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100 flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm font-medium mb-1">Resolved Queries</p>
              <h3 className="text-3xl font-bold text-green-600">{resolvedQueriesCount}</h3>
            </div>
            <div className="h-12 w-12 bg-green-50 rounded-full flex items-center justify-center text-green-600">
              <CheckCircle2 size={24} />
            </div>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-6 flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Search Employee / Client / Subject</label>
            <input 
              type="text" 
              className="form-control w-full text-sm" 
              placeholder="Search by name, code, subject..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={handleKeyPress}
            />
          </div>
          <div className="w-48">
            <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Client Filter</label>
            <select 
              className="form-control w-full text-sm" 
              value={clientId} 
              onChange={e => setClientId(e.target.value)}
            >
              <option value="">All Clients</option>
              {clients.map(c => (
                <option key={c.id} value={c.id}>{c.company_name}</option>
              ))}
            </select>
          </div>
          <div className="w-40">
            <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Category</label>
            <select 
              className="form-control w-full text-sm" 
              value={categoryFilter} 
              onChange={e => setCategoryFilter(e.target.value)}
            >
              <option value="all">All Categories</option>
              <option value="payroll">Payroll</option>
              <option value="attendance">Attendance</option>
              <option value="leave">Leave</option>
              <option value="benefits">Benefits</option>
              <option value="general">General</option>
            </select>
          </div>
          <div className="w-40">
            <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Status</label>
            <select 
              className="form-control w-full text-sm" 
              value={statusFilter} 
              onChange={e => setStatusFilter(e.target.value)}
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="resolved">Resolved</option>
            </select>
          </div>
          <div className="flex gap-2">
            <Button variant="primary" size="sm" onClick={applyFilters} className="inline-flex items-center gap-1.5">
              <Filter size={14} /> Apply Filters
            </Button>
            <Button variant="secondary" size="sm" onClick={resetFilters} className="inline-flex items-center gap-1.5">
              <RotateCcw size={14} /> Reset
            </Button>
          </div>
        </div>

        {/* Data Table */}
        <div className="card p-0">
          <div className="overflow-x-auto">
            <table className="data-table w-full">
              <thead>
                <tr>
                  <th>Employee &amp; Code</th>
                  <th>Client Organization</th>
                  <th>Category &amp; Subject</th>
                  <th>Submitted Date</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {queries.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center py-8 text-gray-500">
                      No employee queries found matching specified filters.
                    </td>
                  </tr>
                ) : (
                  queries.map((q) => (
                    <tr key={q.id}>
                      <td>
                        <div className="font-semibold text-gray-900">
                          {q.employee ? q.employee.full_name : '—'}
                        </div>
                        <div className="text-xs text-gray-500 font-mono">
                          {q.employee ? q.employee.employee_code : '—'}
                        </div>
                      </td>
                      <td>
                        <span className="font-medium text-gray-800 flex items-center gap-1.5">
                          <Building2 size={15} className="text-gray-500 shrink-0" /> {q.client ? q.client.company_name : '—'}
                        </span>
                      </td>
                      <td>
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant={getCategoryBadgeVariant(q.category)}>
                            {q.category.toUpperCase()}
                          </Badge>
                          <span className="font-semibold text-gray-900">{q.subject}</span>
                        </div>
                        <div className="text-xs text-gray-500 truncate max-w-md">
                          {q.message}
                        </div>
                      </td>
                      <td className="text-gray-600">
                        {new Date(q.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="text-center">
                        <Badge variant={q.status === 'resolved' ? 'success' : 'warning'}>
                          {q.status === 'resolved' ? 'RESOLVED' : 'PENDING'}
                        </Badge>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <Button
                          size="sm"
                          variant={q.status === 'resolved' ? 'secondary' : 'primary'}
                          className="inline-flex items-center gap-1.5"
                          onClick={() => {
                            setSelectedQuery(q);
                            setData('admin_response', q.admin_response || '');
                          }}
                        >
                          {q.status === 'resolved' ? (
                            <><Eye size={14} /> View Details</>
                          ) : (
                            <><MessageSquare size={14} /> Respond &amp; Resolve</>
                          )}
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal Dialog */}
        <Modal 
          isOpen={!!selectedQuery} 
          onClose={() => setSelectedQuery(null)} 
          title="Employee Query Details & Response"
        >
          {selectedQuery && (
            <form onSubmit={handleRespond} className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-2 text-sm">
                <div className="flex justify-between border-b border-gray-200 pb-2">
                  <span className="text-gray-500 font-medium">Employee:</span>
                  <span className="font-bold text-gray-900">
                    {selectedQuery.employee ? `${selectedQuery.employee.full_name} (${selectedQuery.employee.employee_code})` : '—'}
                  </span>
                </div>
                <div className="flex justify-between border-b border-gray-200 pb-2">
                  <span className="text-gray-500 font-medium">Client Organization:</span>
                  <span className="font-bold text-gray-900">{selectedQuery.client ? selectedQuery.client.company_name : '—'}</span>
                </div>
                <div className="flex justify-between border-b border-gray-200 pb-2">
                  <span className="text-gray-500 font-medium">Category &amp; Subject:</span>
                  <span className="font-bold text-gray-900">[{selectedQuery.category.toUpperCase()}] {selectedQuery.subject}</span>
                </div>
                <div>
                  <span className="text-gray-600 block mb-1 font-semibold">Employee Message:</span>
                  <div className="bg-white p-3 rounded border border-gray-200 text-gray-800 whitespace-pre-line leading-relaxed text-xs">
                    {selectedQuery.message}
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">
                  Admin Response / Resolution Note
                </label>
                <textarea
                  rows={4}
                  className="form-control w-full text-sm"
                  placeholder="Type your response to the employee here..."
                  value={data.admin_response}
                  onChange={(e) => setData('admin_response', e.target.value)}
                />
                {errors.admin_response && <span className="text-red-500 text-xs mt-1">{errors.admin_response}</span>}
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button variant="secondary" onClick={() => setSelectedQuery(null)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" loading={processing} className="inline-flex items-center gap-1.5">
                  <Send size={14} /> Submit Response &amp; Resolve
                </Button>
              </div>
            </form>
          )}
        </Modal>
      </AuthenticatedLayout>
    </RoleGuard>
  );
}
