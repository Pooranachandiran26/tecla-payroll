import { Head, router, Link } from '@inertiajs/react';
import { useState } from 'react';
import AuthenticatedLayout from '../../../Layouts/AuthenticatedLayout';
import RoleGuard from '../../../Components/RoleGuard.jsx';
import Card from '../../../Components/ui/Card';
import Button from '../../../Components/ui/Button';
import Badge from '../../../Components/ui/Badge';
import { Download, FileText, Filter, Search, RefreshCw, ArrowLeft, ShieldAlert, Lock } from 'lucide-react';

export default function ReportsShow({
  reportKey = 'payroll_register',
  reportTitle = 'Reports Viewer',
  columns = {},
  reportData = {},
  kpis = {},
  clients = [],
  filters = {},
  userRole = 'admin',
}) {
  const [search, setSearch] = useState(filters.search || '');
  const [selectedClient, setSelectedClient] = useState(filters.client_id || '');
  const [selectedMonth, setSelectedMonth] = useState(filters.month || '');
  const [selectedStatus, setSelectedStatus] = useState(filters.status || '');
  const [perPage, setPerPage] = useState(filters.per_page || 10);

  const rows = reportData.data || [];
  const meta = reportData.meta || {};
  const columnKeys = Object.keys(columns);

  const goToPage = (pageNumber, newPerPage = perPage) => {
    router.get(
      route('admin.reports.show', reportKey),
      {
        month: selectedMonth,
        client_id: selectedClient,
        search: search,
        status: selectedStatus,
        page: pageNumber,
        per_page: newPerPage,
      },
      { preserveState: true, preserveScroll: true }
    );
  };

  const handlePerPageChange = (e) => {
    const val = parseInt(e.target.value, 10);
    setPerPage(val);
    goToPage(1, val);
  };

  const handleFilterSubmit = (e) => {
    e?.preventDefault();
    router.get(
      route('admin.reports.show', reportKey),
      {
        month: selectedMonth,
        client_id: selectedClient,
        search: search,
        status: selectedStatus,
        page: 1,
        per_page: perPage,
      },
      { preserveState: true, preserveScroll: true }
    );
  };

  const handleClearFilters = () => {
    setSearch('');
    setSelectedClient('');
    setSelectedMonth('');
    setSelectedStatus('');
    setPerPage(10);
    router.get(route('admin.reports.show', reportKey));
  };

  const handleExportCsv = () => {
    const params = new URLSearchParams({
      month: selectedMonth,
      client_id: selectedClient,
      search: search,
      status: selectedStatus,
    }).toString();

    window.location.href = route('admin.reports.export', reportKey) + '?' + params;
  };

  const handleExportPdf = () => {
    const params = new URLSearchParams({
      month: selectedMonth,
      client_id: selectedClient,
      search: search,
      status: selectedStatus,
    }).toString();

    window.location.href = route('admin.reports.pdf', reportKey) + '?' + params;
  };

  const formatCellValue = (key, val) => {
    if (val === null || val === undefined || val === '') return '—';

    // Currency fields
    const currencyFields = [
      'basic_pay', 'hra', 'gross_total', 'employee_pf', 'employee_esi',
      'professional_tax', 'lwf_deduction', 'tds_deduction', 'loan_emi_deduction',
      'net_pay', 'employer_pf', 'employer_esi', 'employer_lwf',
      'total_employer_statutory', 'total_ctc',
      'gross_salary_passthrough', 'gst_amount', 'grand_total'
    ];

    if (currencyFields.includes(key)) {
      const num = Number(val);
      return isNaN(num) ? val : '₹' + num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    if (key === 'agency_service_fee') {
      if (typeof val === 'string' && val.includes('N/A')) {
        return (
          <span className="font-mono text-xs text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 inline-flex items-center gap-1">
            <Lock size={10} /> {val}
          </span>
        );
      }
      const num = Number(val);
      return isNaN(num) ? val : '₹' + num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    // Status badges
    if (key === 'status') {
      const st = String(val).toLowerCase();
      const variant = st === 'paid' ? 'success' : st === 'overdue' ? 'danger' : st === 'sent' || st === 'raised' ? 'info' : 'neutral';
      return <Badge variant={variant}>{val}</Badge>;
    }

    // Days Overdue highlight
    if (key === 'days_overdue') {
      const days = Number(val);
      if (days > 0) {
        return <span className="font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-200">{days}d overdue</span>;
      }
      return <span className="text-gray-400">—</span>;
    }

    // PII fields styling
    if (key === 'bank_account_number' || key === 'pan_number') {
      const isMasked = String(val).includes('*');
      return (
        <span className={isMasked ? 'font-mono text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200' : 'font-mono font-medium'}>
          {val}
        </span>
      );
    }

    return String(val);
  };

  return (
    <RoleGuard allowedRoles={['admin', 'manager']} moduleKey="reports">
      <AuthenticatedLayout>
        <Head title={reportTitle} />

        {/* Top Header & Navigation */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
              <Link href={route('admin.reports.index')} className="hover:underline flex items-center gap-1">
                <ArrowLeft size={12} /> Reports Catalog
              </Link>
              <span>/</span>
              <span className="font-semibold text-gray-700">
                {reportKey === 'invoice_revenue' ? 'Billing & Invoicing' : 'Payroll & Compensation'}
              </span>
            </div>
            <h2 className="text-2xl font-bold text-gray-900">{reportTitle}</h2>
          </div>

          <div className="flex items-center gap-3">
            {userRole === 'manager' && (
              <Badge variant="warning" className="flex items-center gap-1">
                <ShieldAlert size={12} /> {reportKey === 'invoice_revenue' ? 'Margin Lock Active' : 'PII Masked'}
              </Badge>
            )}
            <Button variant="secondary" icon={FileText} onClick={handleExportPdf}>
              Export PDF
            </Button>
            <Button variant="primary" icon={Download} onClick={handleExportCsv}>
              Export CSV
            </Button>
          </div>
        </div>

        {/* Summary KPI Cards */}
        {reportKey === 'invoice_revenue' ? (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            <Card className="p-4 text-center">
              <span className="text-xs text-gray-500 font-semibold uppercase block">Total Invoiced</span>
              <span className="text-xl font-bold text-blue-900 mt-1 block">
                ₹{Number(kpis.total_invoiced || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </Card>

            <Card className="p-4 text-center">
              <span className="text-xs text-gray-500 font-semibold uppercase block">Total Collected (Paid)</span>
              <span className="text-xl font-bold text-emerald-700 mt-1 block">
                ₹{Number(kpis.total_collected || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </Card>

            <Card className="p-4 text-center">
              <span className="text-xs text-gray-500 font-semibold uppercase block">Total Outstanding</span>
              <span className="text-xl font-bold text-amber-700 mt-1 block">
                ₹{Number(kpis.total_outstanding || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </Card>

            <Card className="p-4 text-center bg-red-50/40 border-red-200">
              <span className="text-xs text-red-800 font-semibold uppercase block">Total Overdue</span>
              <span className="text-xl font-bold text-red-600 mt-1 block">
                ₹{Number(kpis.total_overdue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </Card>

            <Card className="p-4 text-center bg-blue-50/50 border-blue-200">
              <span className="text-xs text-blue-900 font-semibold uppercase block">Pass-Through CTC</span>
              <span className="text-xl font-bold text-blue-950 mt-1 block">
                ₹{Number(kpis.total_passthrough || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </Card>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            <Card className="p-4 text-center">
              <span className="text-xs text-gray-500 font-semibold uppercase block">Records Found</span>
              <span className="text-xl font-bold text-gray-900 mt-1 block">{kpis.total_rows || 0}</span>
            </Card>

            <Card className="p-4 text-center">
              <span className="text-xs text-gray-500 font-semibold uppercase block">Total Gross Salary</span>
              <span className="text-xl font-bold text-blue-900 mt-1 block">
                ₹{Number(kpis.total_gross || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </Card>

            <Card className="p-4 text-center">
              <span className="text-xs text-gray-500 font-semibold uppercase block">Emp Deductions</span>
              <span className="text-xl font-bold text-amber-700 mt-1 block">
                ₹{Number(kpis.total_employee_deductions || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </Card>

            <Card className="p-4 text-center">
              <span className="text-xs text-gray-500 font-semibold uppercase block">Net Disbursement</span>
              <span className="text-xl font-bold text-emerald-700 mt-1 block">
                ₹{Number(kpis.total_net || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </Card>

            <Card className="p-4 text-center bg-blue-50/50 border-blue-200">
              <span className="text-xs text-blue-900 font-semibold uppercase block">Full Pass-Through CTC</span>
              <span className="text-xl font-bold text-blue-950 mt-1 block">
                ₹{Number(kpis.total_ctc || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </Card>
          </div>
        )}

        {/* Filter Controls Bar */}
        <Card className="p-4 mb-6">
          <form onSubmit={handleFilterSubmit} className="flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-[180px]">
              <label className="block text-xs font-semibold text-gray-600 mb-1">Billing / Payroll Month</label>
              <input
                type="month"
                className="w-full text-xs rounded border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
              />
            </div>

            <div className="flex-1 min-w-[200px]">
              <label className="block text-xs font-semibold text-gray-600 mb-1">Client Partner</label>
              <select
                className="w-full text-xs rounded border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                value={selectedClient}
                onChange={(e) => setSelectedClient(e.target.value)}
              >
                <option value="">All Scoped Clients</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.company_name} ({c.client_code})
                  </option>
                ))}
              </select>
            </div>

            {reportKey === 'invoice_revenue' && (
              <div className="w-[150px]">
                <label className="block text-xs font-semibold text-gray-600 mb-1">Payment Status</label>
                <select
                  className="w-full text-xs rounded border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                >
                  <option value="">All Statuses</option>
                  <option value="draft">Draft</option>
                  <option value="finalized">Finalized</option>
                  <option value="raised">Raised / Sent</option>
                  <option value="paid">Paid</option>
                  <option value="overdue">Overdue</option>
                </select>
              </div>
            )}

            <div className="flex-2 min-w-[220px]">
              <label className="block text-xs font-semibold text-gray-600 mb-1">Search Keyword</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Invoice no, client name..."
                  className="w-full text-xs rounded border-gray-300 pl-8 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <Search size={14} className="absolute left-2.5 top-2 text-gray-400" />
              </div>
            </div>

            <div className="flex items-end gap-2 mt-4 md:mt-0">
              <Button type="submit" variant="primary" size="sm" icon={Filter}>
                Apply Filters
              </Button>
              <Button type="button" variant="secondary" size="sm" icon={RefreshCw} onClick={handleClearFilters}>
                Reset
              </Button>
            </div>
          </form>
        </Card>

        {/* Data Table */}
        <Card className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                  {columnKeys.map((key) => (
                    <th key={key} className="p-3 whitespace-nowrap">
                      {columns[key]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={columnKeys.length} className="p-8 text-center text-gray-500 italic">
                      No records match the selected report filters.
                    </td>
                  </tr>
                ) : (
                  rows.map((row, idx) => (
                    <tr key={idx} className="hover:bg-blue-50/40 transition-colors">
                      {columnKeys.map((key) => (
                        <td key={key} className={`p-3 whitespace-nowrap ${key === 'grand_total' ? 'font-bold text-blue-900 bg-blue-50/50' : ''}`}>
                          {formatCellValue(key, row[key])}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {meta && meta.total > 0 && (
            <div className="p-4 border-t border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs text-gray-600 bg-slate-50">
              <div className="flex flex-wrap items-center gap-4">
                <div>
                  Showing <strong>{meta.from || 0}</strong> to <strong>{meta.to || 0}</strong> of <strong>{meta.total || 0}</strong> entries
                </div>
                <div className="flex items-center gap-1.5 border-l border-slate-200 pl-4">
                  <label className="text-gray-500 font-medium">Rows per page:</label>
                  <select
                    className="text-xs rounded border-gray-300 py-1 px-2 font-semibold bg-white text-gray-700 shadow-sm focus:border-blue-500 focus:ring-blue-500 cursor-pointer"
                    value={perPage}
                    onChange={handlePerPageChange}
                  >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <Button
                  variant="secondary"
                  size="xs"
                  disabled={meta.current_page <= 1}
                  onClick={() => goToPage(meta.current_page - 1)}
                >
                  Previous
                </Button>

                <div className="flex items-center gap-1 mx-1">
                  {(() => {
                    const current = meta.current_page || 1;
                    const last = meta.last_page || 1;
                    const delta = 1;
                    const range = [];

                    for (let i = Math.max(2, current - delta); i <= Math.min(last - 1, current + delta); i++) {
                      range.push(i);
                    }

                    if (current - delta > 2) {
                      range.unshift('...');
                    }
                    if (current + delta < last - 1) {
                      range.push('...');
                    }

                    range.unshift(1);
                    if (last > 1) {
                      range.push(last);
                    }

                    return range.map((item, idx) => {
                      if (item === '...') {
                        return <span key={`dots-${idx}`} className="px-2 py-1 text-gray-400">...</span>;
                      }
                      const isActive = item === current;
                      return (
                        <button
                          key={`page-${item}`}
                          type="button"
                          onClick={() => goToPage(item)}
                          className={`px-3 py-1 rounded text-xs font-semibold transition-all ${
                            isActive
                              ? 'bg-blue-900 text-white shadow-sm'
                              : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                          }`}
                        >
                          {item}
                        </button>
                      );
                    });
                  })()}
                </div>

                <Button
                  variant="secondary"
                  size="xs"
                  disabled={meta.current_page >= meta.last_page}
                  onClick={() => goToPage(meta.current_page + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </Card>
      </AuthenticatedLayout>
    </RoleGuard>
  );
}
