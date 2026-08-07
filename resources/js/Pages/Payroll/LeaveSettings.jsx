import React, { useState, useEffect, useMemo, useRef } from 'react';
import AuthenticatedLayout from '../../Layouts/AuthenticatedLayout';
import { Head, Link, router, usePage } from '@inertiajs/react';
import Button from '../../Components/ui/Button';
import Badge from '../../Components/ui/Badge';
import Pagination from '../../Components/ui/Pagination/Pagination';
import { 
  Settings, 
  RefreshCw, 
  Edit3, 
  CheckCircle2, 
  AlertTriangle, 
  Info, 
  Plus, 
  X, 
  Shield, 
  Calendar, 
  UserCheck, 
  Search, 
  ChevronDown, 
  Check, 
  Building2 
} from 'lucide-react';
import RoleGuard from '../../Components/RoleGuard.jsx';

export default function LeaveSettings({ clients = [], selectedClientId, policies = [], balances = [], currentYear = 2026 }) {
  const { flash, errors: pageErrors = {} } = usePage().props;

  const [search, setSearch] = useState('');
  const [clientId, setClientId] = useState(selectedClientId || (clients.length > 0 ? clients[0].id : ''));
  const [viewTab, setViewTab] = useState('policies'); // 'policies' | 'balances'

  // Searchable Client Dropdown State
  const clientDropdownRef = useRef(null);
  const [isClientDropdownOpen, setIsClientDropdownOpen] = useState(false);
  const [clientSearchTerm, setClientSearchTerm] = useState('');

  // Pagination states
  const [policiesPage, setPoliciesPage] = useState(1);
  const [balancesPage, setBalancesPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  const [editingPolicy, setEditingPolicy] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formErrors, setFormErrors] = useState({});

  const [formData, setFormData] = useState({
    policy_name: '',
    leave_type: 'sick',
    annual_quota: 12,
    accrual_frequency: 'monthly',
    monthly_accrual_rate: 1.0,
    max_days_per_month: '',
    carry_forward_allowed: false,
    max_carry_forward_days: 0,
  });

  useEffect(() => {
    if (selectedClientId) {
      setClientId(selectedClientId);
    }
  }, [selectedClientId]);

  // Click outside to close client search dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (clientDropdownRef.current && !clientDropdownRef.current.contains(event.target)) {
        setIsClientDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Reset pagination when search or viewTab changes
  useEffect(() => {
    setPoliciesPage(1);
    setBalancesPage(1);
  }, [search, viewTab, clientId]);

  const applyFilters = () => {
    setPoliciesPage(1);
    setBalancesPage(1);
    router.get(route('payroll.leave-settings'), {
      client_id: clientId,
      search: search
    }, { preserveState: true, preserveScroll: true });
  };

  const resetFilters = () => {
    setSearch('');
    setPoliciesPage(1);
    setBalancesPage(1);
    setClientSearchTerm('');
    const defaultId = clients.length > 0 ? clients[0].id : '';
    setClientId(defaultId);
    setViewTab('policies');
    router.get(route('payroll.leave-settings'), { client_id: defaultId }, { preserveState: true, preserveScroll: true });
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      applyFilters();
    }
  };

  const handleOpenCreate = () => {
    setEditingPolicy(null);
    setFormErrors({});
    setFormData({
      policy_name: '',
      leave_type: 'sick',
      annual_quota: 12,
      accrual_frequency: 'monthly',
      monthly_accrual_rate: 1.0,
      max_days_per_month: '',
      carry_forward_allowed: false,
      max_carry_forward_days: 0,
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (policy) => {
    setEditingPolicy(policy);
    setFormErrors({});
    setFormData({
      policy_name: policy.policy_name,
      leave_type: policy.leave_type,
      annual_quota: policy.annual_quota,
      accrual_frequency: policy.accrual_frequency,
      monthly_accrual_rate: policy.monthly_accrual_rate || (policy.accrual_frequency === 'monthly' ? parseFloat((policy.annual_quota / 12).toFixed(2)) : 1.0),
      max_days_per_month: policy.max_days_per_month ? String(policy.max_days_per_month) : '',
      carry_forward_allowed: policy.carry_forward_allowed,
      max_carry_forward_days: policy.max_carry_forward_days,
    });
    setIsModalOpen(true);
  };

  const handleMonthlyRateChange = (rate) => {
    const numRate = parseFloat(rate) || 0;
    setFormData({
      ...formData,
      monthly_accrual_rate: rate,
      annual_quota: parseFloat((numRate * 12).toFixed(2))
    });
  };

  const handleSavePolicy = (e) => {
    e.preventDefault();
    setFormErrors({});

    const errs = {};
    if (!formData.policy_name.trim()) errs.policy_name = 'Policy name is required.';
    if (formData.annual_quota < 0) errs.annual_quota = 'Annual quota must be 0 or greater.';
    if (formData.accrual_frequency === 'monthly' && (formData.monthly_accrual_rate <= 0 || isNaN(formData.monthly_accrual_rate))) {
      errs.monthly_accrual_rate = 'Please enter a valid monthly rate (e.g. 1.0 or 2.0).';
    }

    if (Object.keys(errs).length > 0) {
      setFormErrors(errs);
      return;
    }

    if (editingPolicy) {
      router.put(route('payroll.leave-settings.update', editingPolicy.id), formData, {
        onSuccess: () => setIsModalOpen(false),
        onError: (errs) => setFormErrors(errs)
      });
    } else {
      router.post(route('payroll.leave-settings.store'), { ...formData, client_id: clientId }, {
        onSuccess: () => setIsModalOpen(false),
        onError: (errs) => setFormErrors(errs)
      });
    }
  };

  const handleSyncBalances = () => {
    if (!clientId) return;
    router.post(route('payroll.leave-settings.sync', clientId), {}, {
      preserveState: true,
      preserveScroll: true,
    });
  };

  // Group balances by Employee ID so each employee occupies exactly ONE row
  const groupedEmployeeBalances = useMemo(() => {
    const map = new Map();

    balances.forEach((b) => {
      const empId = b.employee_id;
      if (!map.has(empId)) {
        map.set(empId, {
          employee: b.employee,
          casual: null,
          sick: null,
          earned: null,
          other: [],
          totalAllocated: 0,
          totalUsed: 0,
          totalRemaining: 0,
        });
      }

      const item = map.get(empId);
      const leaveType = b.policy?.leave_type || '';
      const alloc = parseFloat(b.allocated_days || 0);
      const used = parseFloat(b.used_days || 0);
      const rem = parseFloat(b.remaining_days || 0);

      item.totalAllocated += alloc;
      item.totalUsed += used;
      item.totalRemaining += rem;

      if (leaveType === 'casual') item.casual = b;
      else if (leaveType === 'sick') item.sick = b;
      else if (leaveType === 'earned') item.earned = b;
      else item.other.push(b);
    });

    return Array.from(map.values()).filter((item) => {
      const name = `${item.employee?.first_name || ''} ${item.employee?.last_name || ''}`.toLowerCase();
      const code = (item.employee?.employee_code || item.employee?.employee_id || '').toLowerCase();
      const q = search.toLowerCase();
      return name.includes(q) || code.includes(q);
    });
  }, [balances, search]);

  // Filter policies based on search
  const filteredPolicies = policies.filter(p => {
    const name = (p.policy_name || '').toLowerCase();
    const type = (p.leave_type || '').toLowerCase();
    const q = search.toLowerCase();
    return name.includes(q) || type.includes(q);
  });

  // Filter client options in real-time based on client search input
  const filteredClientOptions = useMemo(() => {
    if (!clientSearchTerm.trim()) return clients;
    const q = clientSearchTerm.toLowerCase();
    return clients.filter(c => 
      (c.company_name || '').toLowerCase().includes(q) ||
      (c.client_code || '').toLowerCase().includes(q)
    );
  }, [clients, clientSearchTerm]);

  // Paginated data calculations
  const totalPoliciesCount = filteredPolicies.length;
  const totalPoliciesPages = Math.ceil(totalPoliciesCount / ITEMS_PER_PAGE) || 1;
  const paginatedPolicies = useMemo(() => {
    const start = (policiesPage - 1) * ITEMS_PER_PAGE;
    return filteredPolicies.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredPolicies, policiesPage]);

  const totalBalancesCount = groupedEmployeeBalances.length;
  const totalBalancesPages = Math.ceil(totalBalancesCount / ITEMS_PER_PAGE) || 1;
  const paginatedBalances = useMemo(() => {
    const start = (balancesPage - 1) * ITEMS_PER_PAGE;
    return groupedEmployeeBalances.slice(start, start + ITEMS_PER_PAGE);
  }, [groupedEmployeeBalances, balancesPage]);

  const selectedClientObj = clients.find(c => String(c.id) === String(clientId));

  return (
    <RoleGuard allowedRoles={['admin', 'manager', 'client']}>
      <AuthenticatedLayout>
        <Head title="Client Leave Settings" />

        <div className="mb-6">
          <Link href={route('employees.index')} className="text-[0.85rem] font-semibold text-[#1F3864] hover:underline">
            ← Back to Employees Directory
          </Link>
          <h2 className="text-2xl font-bold text-[#1F3864] mt-2 mb-1">
            Client &amp; Employee Leave Settings
          </h2>
          <p className="text-gray-500 text-sm">
            Configure client leave policies (Sick, Casual, Earned), annual quotas, carry-forward caps, and track per-employee balances.
          </p>
        </div>

        {/* Flash Banners */}
        {flash?.success && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center space-x-3 text-emerald-800 mb-6">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <p className="text-sm font-medium">{flash.success}</p>
          </div>
        )}

        {flash?.warning && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-center space-x-3 text-amber-800 mb-6">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
            <p className="text-sm font-medium">{flash.warning}</p>
          </div>
        )}

        {/* Filter Controls Bar */}
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-6 flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Search Employee / Policy</label>
            <input 
              type="text" 
              className="form-control w-full text-sm" 
              placeholder="Search by employee name, code..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={handleKeyPress}
            />
          </div>

          {/* Searchable Client Filter Dropdown */}
          <div className="w-72 relative" ref={clientDropdownRef}>
            <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Client Filter</label>
            
            <button
              type="button"
              onClick={() => setIsClientDropdownOpen(!isClientDropdownOpen)}
              className="form-control w-full text-sm font-medium text-left flex items-center justify-between bg-white border border-gray-300 hover:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 py-2 px-3 rounded-md shadow-2xs transition-all cursor-pointer"
            >
              <div className="flex items-center gap-2 truncate pr-2">
                <Building2 className="w-4 h-4 text-indigo-600 shrink-0" />
                <span className="truncate font-semibold text-slate-800">
                  {selectedClientObj ? `${selectedClientObj.company_name} (${selectedClientObj.client_code})` : 'Select Client...'}
                </span>
              </div>
              <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isClientDropdownOpen ? 'rotate-180 text-indigo-600' : ''}`} />
            </button>

            {/* Searchable Dropdown Popover */}
            {isClientDropdownOpen && (
              <div className="absolute left-0 right-0 top-full mt-1.5 z-40 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden animate-in fade-in duration-150 min-w-[320px]">
                {/* Search Input Box inside Dropdown */}
                <div className="p-2 border-b border-gray-100 bg-gray-50/90 sticky top-0 z-10">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      className="w-full pl-8 pr-7 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white font-medium"
                      placeholder="Search client by name or code..."
                      value={clientSearchTerm}
                      onChange={(e) => setClientSearchTerm(e.target.value)}
                      autoFocus
                    />
                    {clientSearchTerm && (
                      <button
                        type="button"
                        onClick={() => setClientSearchTerm('')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Filtered Clients List */}
                <div className="max-h-60 overflow-y-auto py-1 divide-y divide-gray-50">
                  {filteredClientOptions.length === 0 ? (
                    <div className="px-4 py-3.5 text-center text-xs text-gray-400 font-medium">
                      No client matching "{clientSearchTerm}"
                    </div>
                  ) : (
                    filteredClientOptions.map((c) => {
                      const isSelected = String(c.id) === String(clientId);
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            setClientId(c.id);
                            setIsClientDropdownOpen(false);
                            setClientSearchTerm('');
                            setPoliciesPage(1);
                            setBalancesPage(1);
                            router.get(route('payroll.leave-settings'), { client_id: c.id, search }, { preserveState: true, preserveScroll: true });
                          }}
                          className={`w-full text-left px-3.5 py-2.5 text-xs flex items-center justify-between transition-colors ${
                            isSelected ? 'bg-indigo-50/80 text-indigo-900 font-bold' : 'hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          <div className="truncate pr-2">
                            <span className="block font-semibold truncate">{c.company_name}</span>
                            <span className="text-[10px] text-slate-400 font-mono font-medium">{c.client_code}</span>
                          </div>
                          {isSelected && <Check className="w-4 h-4 text-indigo-600 shrink-0" />}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="w-48">
            <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">View Mode</label>
            <select 
              className="form-control w-full text-sm font-medium" 
              value={viewTab} 
              onChange={e => setViewTab(e.target.value)}
            >
              <option value="policies">Leave Policies ({policies.length})</option>
              <option value="balances">Employee Balances ({groupedEmployeeBalances.length} Employees)</option>
            </select>
          </div>

          <div className="flex gap-2">
            <Button variant="primary" size="sm" onClick={applyFilters}>Apply Filters</Button>
            <Button variant="secondary" size="sm" onClick={resetFilters}>Reset</Button>
            {viewTab === 'policies' ? (
              <Button variant="primary" size="sm" onClick={handleOpenCreate} className="flex items-center gap-1">
                <Plus className="w-3.5 h-3.5" /> Add Policy
              </Button>
            ) : (
              <Button variant="secondary" size="sm" onClick={handleSyncBalances} className="flex items-center gap-1">
                <RefreshCw className="w-3.5 h-3.5 text-indigo-600" /> Sync Balances
              </Button>
            )}
          </div>
        </div>

        {/* View Mode 1: Leave Policies Table */}
        {viewTab === 'policies' && (
          <div className="card p-0 overflow-hidden shadow-sm border border-gray-200 rounded-lg bg-white">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <div>
                <h3 className="text-base font-bold text-[#1F3864]">
                  Active Leave Policies for {selectedClientObj ? selectedClientObj.company_name : 'Selected Client'}
                </h3>
                <p className="text-xs text-gray-500">Configure annual quotas, monthly credit rates, accrual schedules, and carry forward rules.</p>
              </div>
              <Button variant="primary" size="sm" onClick={handleOpenCreate} className="flex items-center gap-1 text-xs">
                <Plus className="w-3.5 h-3.5" /> Add Leave Policy
              </Button>
            </div>

            <div className="overflow-x-auto">
              <table className="data-table w-full text-sm">
                <thead>
                  <tr>
                    <th className="py-3 px-4 text-left">Policy Name</th>
                    <th className="py-3 px-4 text-left">Leave Type</th>
                    <th className="py-3 px-4 text-left">Annual Quota</th>
                    <th className="py-3 px-4 text-left">Accrual Frequency</th>
                    <th className="py-3 px-4 text-left">Monthly Paid Cap</th>
                    <th className="py-3 px-4 text-left">Carry-Forward Rule</th>
                    <th className="py-3 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedPolicies.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="text-center py-8 text-gray-500">
                        No leave policies found matching the specified filters.
                      </td>
                    </tr>
                  ) : (
                    paginatedPolicies.map((policy) => (
                      <tr key={policy.id} className="border-b border-gray-100 hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4 font-semibold text-slate-900">
                          {policy.policy_name}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 capitalize border border-indigo-100">
                            {policy.leave_type}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-bold text-slate-800">
                          {policy.annual_quota} Days / Year
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 font-medium">
                          <span className="capitalize">{policy.accrual_frequency.replace('_', ' ')}</span>
                          {policy.accrual_frequency === 'monthly' && (
                            <span className="ml-1.5 text-xs text-indigo-700 font-semibold bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                              {policy.monthly_accrual_rate || 1.0}d / month
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          {policy.max_days_per_month ? (
                            <span className="inline-flex items-center text-xs font-bold text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded border border-amber-200">
                              Max {policy.max_days_per_month}d / Month
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400 font-medium">
                              Unlimited / No Cap
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          {policy.carry_forward_allowed ? (
                            <span className="inline-flex items-center text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                              Yes (Max {policy.max_carry_forward_days}d)
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400 font-medium">
                              No (Expires at year-end)
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <button
                            onClick={() => handleOpenEdit(policy)}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-[#1F3864] hover:text-indigo-800 bg-slate-100 hover:bg-slate-200 px-3 py-1 rounded transition-colors"
                          >
                            <Edit3 className="w-3.5 h-3.5" /> Edit
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {totalPoliciesCount > 0 && (
              <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/30">
                <Pagination
                  currentPage={policiesPage}
                  totalPages={totalPoliciesPages}
                  totalItems={totalPoliciesCount}
                  itemsPerPage={ITEMS_PER_PAGE}
                  onPageChange={(page) => setPoliciesPage(page)}
                />
              </div>
            )}
          </div>
        )}

        {/* View Mode 2: Single-Row Per Employee Leave Balances Table */}
        {viewTab === 'balances' && (
          <div className="card p-0 overflow-hidden shadow-sm border border-gray-200 rounded-lg bg-white">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <div>
                <h3 className="text-base font-bold text-[#1F3864]">
                  Employee Leave Balances Audit Log ({currentYear})
                </h3>
                <p className="text-xs text-gray-500">
                  Single-row summary displaying all leave balances (Casual, Sick, Earned) per employee.
                </p>
              </div>
              <Button variant="secondary" size="sm" onClick={handleSyncBalances} className="flex items-center gap-1 text-xs">
                <RefreshCw className="w-3.5 h-3.5 text-indigo-600" /> Sync Balances
              </Button>
            </div>

            <div className="overflow-x-auto">
              <table className="data-table w-full text-sm">
                <thead>
                  <tr>
                    <th className="py-3.5 px-4 text-left">Employee Name &amp; Code</th>
                    <th className="py-3.5 px-4 text-center">Casual Leave (CL)</th>
                    <th className="py-3.5 px-4 text-center">Sick Leave (SL)</th>
                    <th className="py-3.5 px-4 text-center">Earned Leave (EL)</th>
                    <th className="py-3.5 px-4 text-center">Total Remaining Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedBalances.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="text-center py-8 text-gray-500">
                        No employee leave balances found matching the specified filters.
                      </td>
                    </tr>
                  ) : (
                    paginatedBalances.map((row) => {
                      const emp = row.employee;
                      const empName = `${emp?.first_name || ''} ${emp?.last_name || ''}`.trim() || 'Employee';
                      const empCode = emp?.employee_code || emp?.employee_id || 'N/A';

                      const renderLeaveCell = (b, typeName, accentColor) => {
                        if (!b) {
                          return <span className="text-xs text-slate-400 font-medium">—</span>;
                        }
                        const rem = parseFloat(b.remaining_days || 0);
                        const alloc = parseFloat(b.allocated_days || 0);
                        const used = parseFloat(b.used_days || 0);

                        return (
                          <div className="flex flex-col items-center space-y-0.5">
                            <span className={`text-sm font-extrabold ${rem > 0 ? 'text-emerald-600' : 'text-slate-700'}`}>
                              {rem} / {alloc} Days
                            </span>
                            <span className="text-[11px] text-slate-500 font-medium">
                              Used: <strong className="text-amber-700">{used}d</strong>
                            </span>
                          </div>
                        );
                      };

                      return (
                        <tr key={emp?.id || Math.random()} className="border-b border-gray-100 hover:bg-slate-50/80 transition-colors">
                          <td className="py-4 px-4">
                            <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-800 flex items-center justify-center font-bold text-xs">
                                {empName.charAt(0)}
                              </div>
                              <div>
                                <span className="block hover:text-indigo-900">{empName}</span>
                                <span className="text-xs text-slate-400 font-mono font-medium">{empCode}</span>
                              </div>
                            </div>
                          </td>

                          <td className="py-4 px-4 text-center border-l border-gray-50">
                            {renderLeaveCell(row.casual, 'Casual Leave', 'sky')}
                          </td>

                          <td className="py-4 px-4 text-center border-l border-gray-50">
                            {renderLeaveCell(row.sick, 'Sick Leave', 'amber')}
                          </td>

                          <td className="py-4 px-4 text-center border-l border-gray-50">
                            {renderLeaveCell(row.earned, 'Earned Leave', 'emerald')}
                          </td>

                          <td className="py-4 px-4 text-center border-l border-gray-50 bg-slate-50/40">
                            <div className="flex flex-col items-center space-y-0.5">
                              <span className="text-base font-black text-indigo-950">
                                {row.totalRemaining} / {row.totalAllocated} Days
                              </span>
                              <span className="text-[11px] text-indigo-800 font-semibold bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                                Total Used: {row.totalUsed}d
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {totalBalancesCount > 0 && (
              <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/30">
                <Pagination
                  currentPage={balancesPage}
                  totalPages={totalBalancesPages}
                  totalItems={totalBalancesCount}
                  itemsPerPage={ITEMS_PER_PAGE}
                  onPageChange={(page) => setBalancesPage(page)}
                />
              </div>
            )}
          </div>
        )}

        {/* Edit / Create Policy Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-start justify-center pt-20 pb-8 bg-black/60 p-4 sm:p-6 overflow-y-auto">
            <div className="bg-white border border-gray-200 rounded-xl max-w-xl w-full p-6 shadow-2xl space-y-4 relative max-h-[85vh] flex flex-col my-auto">
              <div className="flex justify-between items-center border-b border-gray-100 pb-3 flex-shrink-0">
                <h3 className="text-base font-bold text-[#1F3864]">
                  {editingPolicy ? `Edit ${editingPolicy.policy_name}` : 'Configure New Leave Policy'}
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="overflow-y-auto pr-1 space-y-4 flex-1 text-xs">
                {Object.keys(formErrors).length > 0 && (
                  <div className="p-3.5 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-2 text-xs text-red-700">
                    <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                    <div className="space-y-0.5">
                      <strong className="block font-bold">Please correct the following errors:</strong>
                      {Object.values(formErrors).map((msg, i) => (
                        <p key={i}>• {msg}</p>
                      ))}
                    </div>
                  </div>
                )}

                <form id="leavePolicyForm" onSubmit={handleSavePolicy} noValidate className="space-y-4">
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">Policy Display Name</label>
                    <input
                      type="text"
                      className={`form-control w-full text-sm ${formErrors.policy_name ? 'border-red-400 focus:border-red-500' : ''}`}
                      value={formData.policy_name}
                      onChange={(e) => setFormData({ ...formData, policy_name: e.target.value })}
                    />
                    {formErrors.policy_name && (
                      <span className="text-red-500 text-[11px] font-semibold mt-1 block">⚠️ {formErrors.policy_name}</span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block font-semibold text-gray-700 mb-1">Leave Type</label>
                      <select
                        className="form-control w-full text-sm"
                        value={formData.leave_type}
                        onChange={(e) => setFormData({ ...formData, leave_type: e.target.value })}
                      >
                        <option value="sick">Sick Leave</option>
                        <option value="casual">Casual Leave</option>
                        <option value="earned">Earned Leave</option>
                        <option value="maternity">Maternity Leave</option>
                        <option value="paternity">Paternity Leave</option>
                        <option value="unpaid">Unpaid Leave</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold text-gray-700 mb-1">Annual Quota (Days)</label>
                      <input
                        type="number"
                        step="any"
                        className="form-control w-full text-sm font-bold text-slate-800"
                        value={formData.annual_quota}
                        onChange={(e) => setFormData({ ...formData, annual_quota: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block font-semibold text-gray-700 mb-1">Accrual Frequency</label>
                      <select
                        className="form-control w-full text-sm font-medium"
                        value={formData.accrual_frequency}
                        onChange={(e) => setFormData({ ...formData, accrual_frequency: e.target.value })}
                      >
                        <option value="monthly">Monthly</option>
                        <option value="annual_upfront">Annual Upfront</option>
                        <option value="quarterly">Quarterly</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold text-gray-700 mb-1">Allow Carry-Forward?</label>
                      <select
                        className="form-control w-full text-sm font-medium"
                        value={formData.carry_forward_allowed ? 'yes' : 'no'}
                        onChange={(e) => setFormData({ ...formData, carry_forward_allowed: e.target.value === 'yes' })}
                      >
                        <option value="no">No (Expire)</option>
                        <option value="yes">Yes (Carry Forward)</option>
                      </select>
                    </div>
                  </div>

                  {formData.accrual_frequency === 'monthly' && (
                    <div className={`p-3.5 bg-indigo-50/70 border rounded-xl space-y-2 ${formErrors.monthly_accrual_rate ? 'border-red-300 bg-red-50/30' : 'border-indigo-100'}`}>
                      <label className="block font-bold text-indigo-900">Monthly Credit Rate (Days / Month)</label>
                      <div className="flex items-center space-x-2">
                        <input
                          type="number"
                          step="any"
                          className="form-control text-sm w-36 font-bold text-indigo-900 border-indigo-200"
                          value={formData.monthly_accrual_rate}
                          onChange={(e) => handleMonthlyRateChange(e.target.value)}
                        />
                        <span className="text-xs text-indigo-800 font-semibold">days / month</span>
                      </div>

                      {formErrors.monthly_accrual_rate && (
                        <span className="text-red-600 text-[11px] font-semibold block">⚠️ {formErrors.monthly_accrual_rate}</span>
                      )}

                      <div className="flex items-center gap-2 pt-1 flex-wrap">
                        <span className="text-[11px] text-gray-500 font-medium">Quick Presets:</span>
                        <button
                          type="button"
                          onClick={() => handleMonthlyRateChange(1.0)}
                          className={`px-3 py-1 rounded-md text-xs font-bold transition-all shadow-sm ${formData.monthly_accrual_rate == 1.0 ? 'bg-indigo-600 text-white ring-2 ring-indigo-300' : 'bg-white text-indigo-700 border border-indigo-200 hover:bg-indigo-50'}`}
                        >
                          1 Day / Month (12d/yr)
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMonthlyRateChange(2.0)}
                          className={`px-3 py-1 rounded-md text-xs font-bold transition-all shadow-sm ${formData.monthly_accrual_rate == 2.0 ? 'bg-indigo-600 text-white ring-2 ring-indigo-300' : 'bg-white text-indigo-700 border border-indigo-200 hover:bg-indigo-50'}`}
                        >
                          2 Days / Month (24d/yr)
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="block font-bold text-amber-950">Max Paid Days Allowed Per Month</label>
                      <span className="text-[11px] text-amber-800 font-bold bg-amber-100 px-2 py-0.5 rounded">Optional Monthly Cap</span>
                    </div>
                    <p className="text-[11px] text-amber-900 leading-relaxed">
                      Limits paid days an employee can take in a single month. Excess days in that month are treated as Loss of Pay (LOP).
                    </p>
                    
                    <div className="flex items-center gap-2 pt-1 flex-wrap">
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, max_days_per_month: '1' })}
                        className={`px-3 py-1 rounded-md text-xs font-bold transition-all shadow-sm ${formData.max_days_per_month === '1' ? 'bg-amber-600 text-white ring-2 ring-amber-300' : 'bg-white text-amber-900 border border-amber-300 hover:bg-amber-100'}`}
                      >
                        Max 1 Day / Month
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, max_days_per_month: '2' })}
                        className={`px-3 py-1 rounded-md text-xs font-bold transition-all shadow-sm ${formData.max_days_per_month === '2' ? 'bg-amber-600 text-white ring-2 ring-amber-300' : 'bg-white text-amber-900 border border-amber-300 hover:bg-amber-100'}`}
                      >
                        Max 2 Days / Month
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, max_days_per_month: '' })}
                        className={`px-3 py-1 rounded-md text-xs font-bold transition-all shadow-sm ${formData.max_days_per_month === '' ? 'bg-slate-700 text-white ring-2 ring-slate-300' : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-100'}`}
                      >
                        No Cap (Unlimited)
                      </button>
                    </div>
                  </div>

                  {formData.carry_forward_allowed && (
                    <div>
                      <label className="block font-semibold text-gray-700 mb-1">Max Carry-Forward Days Cap</label>
                      <input
                        type="number"
                        step="any"
                        className="form-control w-full text-sm font-bold text-slate-800"
                        value={formData.max_carry_forward_days}
                        onChange={(e) => setFormData({ ...formData, max_carry_forward_days: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                  )}

                  <div className="p-3 bg-amber-50/90 border border-amber-200 rounded-lg text-amber-900 flex items-start space-x-2 text-[11px]">
                    <Info className="w-4 h-4 flex-shrink-0 text-amber-600 mt-0.5" />
                    <p>Lowering carry-forward caps mid-year applies from next year. Current year earned days remain protected under their year-start snapshot cap.</p>
                  </div>
                </form>
              </div>

              <div className="pt-3 border-t border-gray-100 flex justify-end items-center gap-3 flex-shrink-0 bg-white">
                <Button type="button" variant="secondary" size="sm" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" form="leavePolicyForm" variant="primary" size="sm" className="font-bold">
                  Save Policy &amp; Sync
                </Button>
              </div>
            </div>
          </div>
        )}

      </AuthenticatedLayout>
    </RoleGuard>
  );
}
