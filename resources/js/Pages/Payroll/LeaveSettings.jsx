import React, { useState, useEffect } from 'react';
import AuthenticatedLayout from '../../Layouts/AuthenticatedLayout';
import { Head, Link, router, usePage } from '@inertiajs/react';
import Button from '../../Components/ui/Button';
import Badge from '../../Components/ui/Badge';
import { Settings, RefreshCw, Edit3, CheckCircle2, AlertTriangle, Info, Plus, X, Shield, Calendar } from 'lucide-react';
import RoleGuard from '../../Components/RoleGuard.jsx';

export default function LeaveSettings({ clients = [], selectedClientId, policies = [], balances = [], currentYear = 2026 }) {
  const { flash } = usePage().props;

  const [search, setSearch] = useState('');
  const [clientId, setClientId] = useState(selectedClientId || (clients.length > 0 ? clients[0].id : ''));
  const [viewTab, setViewTab] = useState('policies'); // 'policies' | 'balances'

  const [editingPolicy, setEditingPolicy] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    policy_name: '',
    leave_type: 'sick',
    annual_quota: 12,
    accrual_frequency: 'monthly',
    carry_forward_allowed: false,
    max_carry_forward_days: 0,
  });

  useEffect(() => {
    if (selectedClientId) {
      setClientId(selectedClientId);
    }
  }, [selectedClientId]);

  const applyFilters = () => {
    router.get(route('payroll.leave-settings'), {
      client_id: clientId,
      search: search
    }, { preserveState: true, preserveScroll: true });
  };

  const resetFilters = () => {
    setSearch('');
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

  const handleClientSelectChange = (e) => {
    const newId = e.target.value;
    setClientId(newId);
    router.get(route('payroll.leave-settings'), { client_id: newId, search }, { preserveState: true, preserveScroll: true });
  };

  const handleOpenCreate = () => {
    setEditingPolicy(null);
    setFormData({
      policy_name: '',
      leave_type: 'sick',
      annual_quota: 12,
      accrual_frequency: 'monthly',
      carry_forward_allowed: false,
      max_carry_forward_days: 0,
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (policy) => {
    setEditingPolicy(policy);
    setFormData({
      policy_name: policy.policy_name,
      leave_type: policy.leave_type,
      annual_quota: policy.annual_quota,
      accrual_frequency: policy.accrual_frequency,
      carry_forward_allowed: policy.carry_forward_allowed,
      max_carry_forward_days: policy.max_carry_forward_days,
    });
    setIsModalOpen(true);
  };

  const handleSavePolicy = (e) => {
    e.preventDefault();
    if (editingPolicy) {
      router.put(route('payroll.leave-settings.update', editingPolicy.id), formData, {
        onSuccess: () => setIsModalOpen(false),
      });
    } else {
      router.post(route('payroll.leave-settings.store'), { ...formData, client_id: clientId }, {
        onSuccess: () => setIsModalOpen(false),
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

  // Filter balances based on search
  const filteredBalances = balances.filter(b => {
    const name = `${b.employee?.first_name || ''} ${b.employee?.last_name || ''}`.toLowerCase();
    const code = (b.employee?.employee_id || '').toLowerCase();
    const q = search.toLowerCase();
    return name.includes(q) || code.includes(q);
  });

  // Filter policies based on search
  const filteredPolicies = policies.filter(p => {
    const name = (p.policy_name || '').toLowerCase();
    const type = (p.leave_type || '').toLowerCase();
    const q = search.toLowerCase();
    return name.includes(q) || type.includes(q);
  });

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

        {/* Filter Controls Bar (Same design as DaySwapRequests reference) */}
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-6 flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Search Employee / Policy</label>
            <input 
              type="text" 
              className="form-control w-full text-sm" 
              placeholder="Search by name, code..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={handleKeyPress}
            />
          </div>

          <div className="w-60">
            <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Client Filter</label>
            <select 
              className="form-control w-full text-sm" 
              value={clientId} 
              onChange={handleClientSelectChange}
            >
              {clients.map(c => (
                <option key={c.id} value={c.id}>
                  {c.company_name} ({c.client_code})
                </option>
              ))}
            </select>
          </div>

          <div className="w-48">
            <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">View Mode</label>
            <select 
              className="form-control w-full text-sm font-medium" 
              value={viewTab} 
              onChange={e => setViewTab(e.target.value)}
            >
              <option value="policies">Leave Policies ({policies.length})</option>
              <option value="balances">Employee Balances ({balances.length})</option>
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
                <p className="text-xs text-gray-500">Configure annual quotas, accrual schedules, and carry forward rules.</p>
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
                    <th className="py-3 px-4 text-left">Carry-Forward Rule</th>
                    <th className="py-3 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPolicies.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="text-center py-8 text-gray-500">
                        No leave policies found matching the specified filters.
                      </td>
                    </tr>
                  ) : (
                    filteredPolicies.map((policy) => (
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
                        <td className="py-3.5 px-4 capitalize text-slate-600 font-medium">
                          {policy.accrual_frequency.replace('_', ' ')}
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
          </div>
        )}

        {/* View Mode 2: Employee Balances Table */}
        {viewTab === 'balances' && (
          <div className="card p-0 overflow-hidden shadow-sm border border-gray-200 rounded-lg bg-white">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <div>
                <h3 className="text-base font-bold text-[#1F3864]">
                  Employee Leave Balances Audit Log ({currentYear})
                </h3>
                <p className="text-xs text-gray-500">Live per-employee allocated, carried over, used, and remaining balances.</p>
              </div>
              <Button variant="secondary" size="sm" onClick={handleSyncBalances} className="flex items-center gap-1 text-xs">
                <RefreshCw className="w-3.5 h-3.5 text-indigo-600" /> Sync Balances
              </Button>
            </div>

            <div className="overflow-x-auto">
              <table className="data-table w-full text-sm">
                <thead>
                  <tr>
                    <th className="py-3 px-4 text-left">Employee &amp; Code</th>
                    <th className="py-3 px-4 text-left">Leave Type</th>
                    <th className="py-3 px-4 text-left">Allocated Quota</th>
                    <th className="py-3 px-4 text-left">Carried Over</th>
                    <th className="py-3 px-4 text-left">Used Days</th>
                    <th className="py-3 px-4 text-left">Remaining Days</th>
                    <th className="py-3 px-4 text-left">Year-Start Snapshot Cap</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBalances.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="text-center py-8 text-gray-500">
                        No employee leave balances found matching the specified filters.
                      </td>
                    </tr>
                  ) : (
                    filteredBalances.map((b) => (
                      <tr key={b.id} className="border-b border-gray-100 hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-900">
                            {b.employee?.first_name} {b.employee?.last_name}
                          </div>
                          <div className="text-xs text-slate-400 font-mono">
                            {b.employee?.employee_id}
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 capitalize border border-slate-200">
                            {b.policy?.policy_name || b.policy?.leave_type}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-bold text-slate-900">
                          {b.allocated_days} days
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 font-medium">
                          {b.carried_over_days} days
                        </td>
                        <td className="py-3.5 px-4 text-amber-600 font-bold">
                          {b.used_days} days
                        </td>
                        <td className="py-3.5 px-4 text-emerald-600 font-bold">
                          {b.remaining_days} days
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="text-xs text-slate-500 bg-slate-100 px-2.5 py-1 rounded font-mono border border-slate-200">
                            {b.snapshot_max_carry_forward_days}d max cap
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Edit / Create Policy Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white border border-gray-200 rounded-xl max-w-md w-full p-6 shadow-xl space-y-4 relative">
              <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                <h3 className="text-base font-bold text-[#1F3864]">
                  {editingPolicy ? `Edit ${editingPolicy.policy_name}` : 'Configure New Leave Policy'}
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSavePolicy} className="space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Policy Display Name</label>
                  <input
                    type="text"
                    required
                    className="form-control w-full text-sm"
                    value={formData.policy_name}
                    onChange={(e) => setFormData({ ...formData, policy_name: e.target.value })}
                  />
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
                      step="0.5"
                      required
                      className="form-control w-full text-sm"
                      value={formData.annual_quota}
                      onChange={(e) => setFormData({ ...formData, annual_quota: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">Accrual Frequency</label>
                    <select
                      className="form-control w-full text-sm"
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
                      className="form-control w-full text-sm"
                      value={formData.carry_forward_allowed ? 'yes' : 'no'}
                      onChange={(e) => setFormData({ ...formData, carry_forward_allowed: e.target.value === 'yes' })}
                    >
                      <option value="no">No (Expire)</option>
                      <option value="yes">Yes (Carry Forward)</option>
                    </select>
                  </div>
                </div>

                {formData.carry_forward_allowed && (
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">Max Carry-Forward Days Cap</label>
                    <input
                      type="number"
                      step="0.5"
                      required
                      className="form-control w-full text-sm"
                      value={formData.max_carry_forward_days}
                      onChange={(e) => setFormData({ ...formData, max_carry_forward_days: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                )}

                {/* Warning note for mid-year cap changes */}
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 flex items-start space-x-2 text-[11px]">
                  <Info className="w-4 h-4 flex-shrink-0 text-amber-600 mt-0.5" />
                  <p>Lowering carry-forward caps mid-year applies from next year. Current year earned days remain protected under their year-start snapshot cap.</p>
                </div>

                <div className="flex justify-end space-x-3 pt-2">
                  <Button type="button" variant="secondary" size="sm" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                  <Button type="submit" variant="primary" size="sm">Save Policy &amp; Sync</Button>
                </div>
              </form>
            </div>
          </div>
        )}

      </AuthenticatedLayout>
    </RoleGuard>
  );
}
