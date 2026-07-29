import React, { useState, useRef, useEffect } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AuthenticatedLayout from '../../Layouts/AuthenticatedLayout';
import Card from '../../Components/ui/Card';
import Badge from '../../Components/ui/Badge';
import DataTable from '../../Components/ui/DataTable';
import { 
  Users, 
  Building2, 
  IndianRupee, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  UserPlus, 
  TrendingUp, 
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CreditCard,
  FileSpreadsheet,
  Filter,
  ExternalLink,
  Search,
  ChevronDown,
  Calendar,
  MapPin,
  Briefcase
} from 'lucide-react';
import RoleGuard from '../../Components/RoleGuard.jsx';
import { useRole } from '../../Contexts/RoleContext.jsx';

function SearchableClientDropdown({ allClientsList, selectedClientId, selectedClient, themeColor }) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredClients = allClientsList.filter(c => 
    c.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.client_code && c.client_code.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleSelect = (clientId) => {
    setIsOpen(false);
    setSearchTerm('');
    router.get(route('dashboard'), clientId ? { client_id: clientId } : {}, { preserveState: true, preserveScroll: true });
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 bg-white/90 hover:bg-white border border-slate-300 px-3.5 py-2 rounded-lg text-xs font-semibold text-slate-800 shadow-sm transition-all hover:border-indigo-400"
      >
        <Filter className="w-4 h-4 text-indigo-600 shrink-0" />
        <span className="truncate max-w-[200px]">
          {selectedClient ? `${selectedClient.company_name} (${selectedClient.client_code})` : `All Client Partners (${allClientsList.length})`}
        </span>
        <ChevronDown className={`w-4 h-4 text-indigo-600 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-72 sm:w-80 bg-white border border-slate-200 text-slate-800 rounded-xl shadow-2xl p-3 z-[9999] animate-in fade-in zoom-in-95 duration-150">
          
          <div className="relative mb-2.5">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              autoFocus
              placeholder="Search client by name or code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-9 pr-8 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 shadow-inner"
            />
            {searchTerm && (
              <button 
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                ✕
              </button>
            )}
          </div>

          <div className="max-h-60 overflow-y-auto space-y-1 pr-1">
            <button
              type="button"
              onClick={() => handleSelect(null)}
              className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-between ${
                !selectedClientId 
                  ? 'bg-indigo-600 text-white font-bold shadow-sm' 
                  : 'hover:bg-slate-100 text-slate-700'
              }`}
            >
              <div className="flex items-center gap-2">
                <span>🏢 All Client Partners</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${!selectedClientId ? 'bg-indigo-700 text-white' : 'bg-slate-100 text-slate-600 border border-slate-200'}`}>
                  ({allClientsList.length})
                </span>
              </div>
              {!selectedClientId && <CheckCircle2 className="w-4 h-4 text-white" />}
            </button>

            {filteredClients.length > 0 ? (
              filteredClients.map(c => {
                const isSelected = selectedClientId === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => handleSelect(c.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-between ${
                      isSelected 
                        ? 'bg-indigo-50 border border-indigo-200 text-indigo-950 font-bold shadow-sm' 
                        : 'hover:bg-slate-100 text-slate-800'
                    }`}
                  >
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2 font-semibold">
                        <span>{c.company_name}</span>
                        <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${isSelected ? 'bg-indigo-200 text-indigo-900 font-bold' : 'bg-slate-100 text-slate-600 border border-slate-200'}`}>
                          {c.client_code}
                        </span>
                      </div>
                      <span className={`text-[10px] font-normal mt-0.5 ${isSelected ? 'text-indigo-700' : 'text-slate-500'}`}>
                        {c.contract_type === 'eor' ? 'Pass-through EOR' : 'Agency Contract'}
                      </span>
                    </div>
                    {isSelected && <CheckCircle2 className="w-4 h-4 text-indigo-600" />}
                  </button>
                );
              })
            ) : (
              <div className="text-center py-4 text-xs text-slate-400 italic">
                No clients match "{searchTerm}"
              </div>
            )}
          </div>

          {selectedClientId && (
            <div className="mt-2 pt-2 border-t border-slate-100 text-right">
              <button
                type="button"
                onClick={() => handleSelect(null)}
                className="text-[11px] text-indigo-600 hover:text-indigo-800 font-bold inline-flex items-center gap-1"
              >
                <span>Clear Filter</span> ✕
              </button>
            </div>
          )}

        </div>
      )}
    </div>
  );
}

export default function Dashboard({ 
  selectedClientId = null,
  selectedClient = null,
  allClientsList = [],
  metrics = {}, 
  topDesignations = [],
  topDepartments = [],
  workLocations = [],
  todayAttendance = {}, 
  recentEmployees = [], 
  topClients = [], 
  recentRevisions = [], 
  recentPayrollRuns = [], 
  currentPeriod = 'July 2026',
  themeColor = '#082d9b'
}) {
  const { role } = useRole();

  const formatCurrency = (val) => {
    const num = parseFloat(val) || 0;
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(num);
  };

  const punchPct = todayAttendance.completionPct || 0;
  const strokeDashoffset = 283 - (283 * punchPct) / 100;

  return (
    <RoleGuard allowedRoles={['admin', 'manager']}>
      <AuthenticatedLayout>
        <Head title={selectedClient ? `${selectedClient.company_name} Analytics` : "Executive Operations Command Center"} />

        {/* Light Glassmorphism Hero Header Banner */}
        <div 
          className="mb-6 rounded-2xl p-6 shadow-sm relative border border-slate-200/80 transition-all duration-300 font-sans z-20 bg-gradient-to-r from-white via-indigo-50/40 to-slate-50/70 backdrop-blur-xl"
        >
          <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
            <div className="absolute -top-10 -right-10 w-64 h-64 bg-indigo-200/25 rounded-full filter blur-3xl"></div>
            <div className="absolute -bottom-10 -left-10 w-64 h-64 bg-emerald-200/25 rounded-full filter blur-3xl"></div>
          </div>

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200/80 px-2.5 py-0.5 rounded-full">
                <Sparkles className="w-3 h-3 text-indigo-600" />
                <span>Operations Overview</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-semibold text-[#1F3864] tracking-tight flex items-center gap-2 mt-1">
                {selectedClient ? selectedClient.company_name : "Payroll & Operations Overview"}
              </h1>
              <p className="text-xs sm:text-sm text-gray-500 font-normal max-w-2xl leading-relaxed">
                {selectedClient 
                  ? `Real-time workforce metrics, shift attendance, and monthly payroll totals for ${selectedClient.company_name}.`
                  : "Overview of workforce attendance, payroll disbursements, statutory compliance, and pending approval queues."}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <SearchableClientDropdown 
                allClientsList={allClientsList}
                selectedClientId={selectedClientId}
                selectedClient={selectedClient}
                themeColor={themeColor}
              />

              <div className="bg-emerald-50 border border-emerald-300/80 px-3 py-2 rounded-lg text-xs font-semibold text-emerald-800 flex items-center gap-2 shadow-sm">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                Cycle: <span className="text-slate-900 font-bold">{currentPeriod}</span>
              </div>

              <Link
                href={route('employees.create')}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#082d9b] hover:bg-indigo-900 text-white font-bold text-xs rounded-lg shadow-md transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <UserPlus className="w-4 h-4 text-white" />
                <span>+ Add Employee</span>
              </Link>
            </div>
          </div>

          {selectedClient && (
            <div className="mt-4 pt-3 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-4 text-xs font-normal">
              <div className="flex items-center gap-4 text-slate-700">
                <span>Client Code: <strong className="text-indigo-700 font-bold">{selectedClient.client_code}</strong></span>
                <span>• Model: <strong className="text-slate-900 font-bold">{selectedClient.contract_type === 'eor' ? 'Pass-through EOR' : 'Agency Contract'}</strong></span>
                <span>• Active Staff: <strong className="text-emerald-700 font-bold">{selectedClient.employees_count || 0} Staff</strong></span>
              </div>
              <Link
                href={route('clients.show', selectedClient.id)}
                className="text-xs font-bold text-indigo-700 hover:text-indigo-900 flex items-center gap-1 underline"
              >
                View Full Client Profile <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}
        </div>

        {/* Approval Alerts Banner */}
        {metrics.totalPendingAlerts > 0 ? (
          <div className="mb-6 bg-amber-50 border border-amber-300 rounded-xl p-4 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5 sm:mt-0">
                <AlertTriangle className="w-5 h-5 animate-bounce" />
              </div>
              <div>
                <div className="font-bold text-amber-950 text-sm flex items-center gap-2">
                  <span>Action Required: {metrics.totalPendingAlerts} Pending Approvals in Queue</span>
                </div>
                <div className="text-xs text-amber-900 font-medium mt-1 flex flex-wrap gap-x-4 gap-y-1">
                  {metrics.pendingSalaryRevisions > 0 && (
                    <span className="flex items-center gap-1"><TrendingUp className="w-3.5 h-3.5 text-amber-700 inline" /> <strong>{metrics.pendingSalaryRevisions}</strong> Salary Revision Requests</span>
                  )}
                  {metrics.pendingBankRequests > 0 && (
                    <span className="flex items-center gap-1"><Building2 className="w-3.5 h-3.5 text-amber-700 inline" /> <strong>{metrics.pendingBankRequests}</strong> Bank Change Requests</span>
                  )}
                  {metrics.pendingDaySwaps > 0 && (
                    <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-amber-700 inline" /> <strong>{metrics.pendingDaySwaps}</strong> Day Swap Requests</span>
                  )}
                  {metrics.pendingLeaves > 0 && (
                    <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5 text-amber-700 inline" /> <strong>{metrics.pendingLeaves}</strong> Leave Requests</span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {metrics.pendingSalaryRevisions > 0 && (
                <Link
                  href={route('employees.index')}
                  className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-lg shadow transition-all"
                >
                  Review Revisions
                </Link>
              )}
              {metrics.pendingBankRequests > 0 && (
                <Link
                  href={route('employees.bank-change-requests')}
                  className="px-3.5 py-1.5 bg-white border border-amber-400 text-amber-950 hover:bg-amber-100 font-bold text-xs rounded-lg shadow-sm transition-all"
                >
                  Bank Requests
                </Link>
              )}
            </div>
          </div>
        ) : (
          <div className="mb-6 bg-emerald-50 border border-emerald-300 rounded-xl p-3 flex items-center justify-between text-xs text-emerald-950 font-medium shadow-sm">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600 shrink-0" />
              <span>All approval queues are up to date. Zero pending salary revisions or bank requests.</span>
            </div>
            <span className="font-semibold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-300">
              ✓ Clear Queue
            </span>
          </div>
        )}

        {/* Top Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 font-sans">
          
          <div className="card metric-card hover-lift">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="metric-label">Active Workforce</span>
                <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center">
                  <Users className="w-4.5 h-4.5" />
                </div>
              </div>
              <div className="metric-value">{metrics.totalActiveEmployees || 0}</div>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs mt-3">
              <span className="text-emerald-700 font-semibold flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5" /> Active Staff
              </span>
              <span className="text-slate-500 font-normal">{metrics.totalOnboarding || 0} onboarding</span>
            </div>
          </div>

          <div className="card metric-card hover-lift">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="metric-label">
                  {selectedClient ? "Contract Type" : "Client Partners"}
                </span>
                <div className="w-9 h-9 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center">
                  <Building2 className="w-4.5 h-4.5" />
                </div>
              </div>
              <div className="metric-value">
                {selectedClient ? (selectedClient.contract_type === 'eor' ? 'EOR' : 'Agency') : (metrics.totalClients || 0)}
              </div>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs mt-3">
              <span className="text-purple-700 font-semibold">
                {selectedClient ? `Code: ${selectedClient.client_code}` : `${metrics.eorClientsCount || 0} EOR / ${metrics.agencyClientsCount || 0} Agency`}
              </span>
              <span className="text-slate-400">Active</span>
            </div>
          </div>

          <div className="card metric-card hover-lift">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="metric-label">Est. Monthly CTC Cost</span>
                <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
                  <IndianRupee className="w-4.5 h-4.5" />
                </div>
              </div>
              <div className="metric-value text-slate-900">
                {formatCurrency(metrics.monthlyCtcTotal)}
              </div>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs mt-3">
              <span className="text-amber-800 font-semibold">Gross Monthly Payroll</span>
              <span className="text-slate-400">Calculated</span>
            </div>
          </div>

          {role === 'manager' ? (
            <div className="card metric-card locked-card relative overflow-hidden">
              <div className="locked-blur select-none">
                <span className="metric-label">Est. Net Take Home</span>
                <div className="metric-value">₹XX,XX,XXX</div>
              </div>
              <div className="locked-overlay">
                <span className="locked-badge mb-1">🔒 Confidential</span>
                <span className="text-xs font-semibold text-slate-700">Admin Access Required</span>
              </div>
            </div>
          ) : (
            <div className="card metric-card hover-lift">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="metric-label">Est. Net Take Home</span>
                  <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                    <TrendingUp className="w-4.5 h-4.5" />
                  </div>
                </div>
                <div className="metric-value text-slate-900">
                  {formatCurrency(metrics.monthlyNetTakeHomeTotal)}
                </div>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs mt-3">
                <span className="text-emerald-700 font-semibold">Direct Employee Payout</span>
                <span className="text-slate-400">85% CTC</span>
              </div>
            </div>
          )}
        </div>

        {/* UNIFIED SINGLE PAGE LAYOUT - ALL MODULE SECTIONS */}
        <div className="space-y-6 font-sans">

          {/* Section 1: Shift Attendance Snapshot & Module Palette */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            <div className="card lg:col-span-2">
              <div className="card-header">
                <span className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                  </span>
                  Today's Shift Attendance Live Snapshot
                </span>

                <Link 
                  href={route('payroll.live-monitor')} 
                  className="px-3 py-1.5 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-indigo-700 font-semibold text-xs rounded-lg transition-all flex items-center gap-1.5 shadow-sm"
                >
                  <Clock className="w-3.5 h-3.5 text-indigo-600" /> Live Monitor
                </Link>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-center">
                <div className="sm:col-span-1 flex flex-col items-center justify-center p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="relative w-24 h-24 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="45" stroke="#E2E8F0" strokeWidth="8" fill="transparent" />
                      <circle 
                        cx="50" 
                        cy="50" 
                        r="45" 
                        stroke="#10B981" 
                        strokeWidth="8" 
                        fill="transparent" 
                        strokeDasharray="283"
                        strokeDashoffset={strokeDashoffset}
                        strokeLinecap="round"
                        className="transition-all duration-1000 ease-out"
                      />
                    </svg>
                    <div className="absolute flex flex-col items-center">
                      <span className="text-lg font-bold text-slate-900">{punchPct}%</span>
                      <span className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">Punched</span>
                    </div>
                  </div>
                </div>

                <div className="sm:col-span-3 grid grid-cols-3 gap-3 text-center">
                  <div className="bg-emerald-50/80 p-3.5 rounded-xl border border-emerald-200">
                    <div className="text-2xl font-bold text-emerald-700">{todayAttendance.punchedIn || 0}</div>
                    <div className="text-xs font-semibold text-emerald-900 mt-1">Punched In</div>
                  </div>
                  <div className="bg-amber-50/80 p-3.5 rounded-xl border border-amber-200">
                    <div className="text-2xl font-bold text-amber-700">{todayAttendance.notPunched || 0}</div>
                    <div className="text-xs font-semibold text-amber-900 mt-1">Not Punched</div>
                  </div>
                  <div className="bg-indigo-50/80 p-3.5 rounded-xl border border-indigo-200">
                    <div className="text-2xl font-bold text-indigo-700">{todayAttendance.totalActive || 0}</div>
                    <div className="text-xs font-semibold text-indigo-900 mt-1">Total Staff</div>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100">
                <div className="flex justify-between items-center text-xs text-slate-600 font-semibold mb-1">
                  <span>Shift Punch Completion Progress</span>
                  <span>{todayAttendance.punchedIn || 0} / {todayAttendance.totalActive || 0} Punched In ({punchPct}%)</span>
                </div>
                <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                  <div 
                    className="h-full bg-emerald-500 transition-all duration-500 rounded-full"
                    style={{ width: `${punchPct}%` }}
                  ></div>
                </div>
              </div>
            </div>

            {/* Quick Palette */}
            <Card title="Module Operations Palette">
              <div className="grid grid-cols-1 gap-2 text-xs font-semibold">
                <Link 
                  href={route('employees.create')} 
                  className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-white hover:border-indigo-300 flex items-center justify-between transition-all group"
                >
                  <div className="flex items-center gap-2.5">
                    <UserPlus className="w-4 h-4 text-indigo-600" />
                    <span className="text-slate-800">Add New Employee</span>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-1 transition-transform" />
                </Link>

                <Link 
                  href={route('clients.create')} 
                  className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-white hover:border-purple-300 flex items-center justify-between transition-all group"
                >
                  <div className="flex items-center gap-2.5">
                    <Building2 className="w-4 h-4 text-purple-600" />
                    <span className="text-slate-800">Add Client Partner</span>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-1 transition-transform" />
                </Link>

                <Link 
                  href={route('employees.bulk-upload')} 
                  className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-white hover:border-emerald-300 flex items-center justify-between transition-all group"
                >
                  <div className="flex items-center gap-2.5">
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                    <span className="text-slate-800">Bulk Excel Import</span>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-1 transition-transform" />
                </Link>

                <Link 
                  href={route('payroll.processing')} 
                  className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-white hover:border-amber-300 flex items-center justify-between transition-all group"
                >
                  <div className="flex items-center gap-2.5">
                    <IndianRupee className="w-4 h-4 text-amber-700" />
                    <span className="text-slate-800">Run Monthly Payroll</span>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-1 transition-transform" />
                </Link>

                <Link 
                  href={route('employees.bank-change-requests')} 
                  className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-white hover:border-blue-300 flex items-center justify-between transition-all group"
                >
                  <div className="flex items-center gap-2.5">
                    <CreditCard className="w-4 h-4 text-blue-600" />
                    <span className="text-slate-800">Bank Change Queue</span>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </Card>

          </div>

          {/* Section 2: Statutory Liabilities & Document Verification Health */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card title="Est. Monthly Employer Statutory Costs" className="md:col-span-2">
              <div className="grid grid-cols-2 gap-4 text-center">
                <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-xl">
                  <div className="text-xs font-semibold text-indigo-900 uppercase">Est. Employer EPF Contribution</div>
                  <div className="text-xl font-bold text-indigo-700 mt-1">{formatCurrency(metrics.estEmployerPfTotal)}</div>
                  <div className="text-[11px] text-indigo-600 mt-0.5">12% EPF + 1% Admin/EDLI</div>
                </div>

                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                  <div className="text-xs font-semibold text-emerald-900 uppercase">Est. Employer ESIC Contribution</div>
                  <div className="text-xl font-bold text-emerald-700 mt-1">{formatCurrency(metrics.estEmployerEsiTotal)}</div>
                  <div className="text-[11px] text-emerald-600 mt-0.5">3.25% ESIC for Gross ≤ ₹21k</div>
                </div>
              </div>
            </Card>

            <Card title="Document Verification Health">
              <div className="space-y-3 text-xs">
                <div className="flex justify-between items-center p-3 bg-slate-50 border border-slate-200 rounded-lg font-semibold">
                  <span>Bank Account Verified</span>
                  <span className="font-bold text-emerald-700">{metrics.verifiedBankCount || 0} / {metrics.totalActiveEmployees || 0} ({metrics.bankVerificationPct || 0}%)</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-slate-50 border border-slate-200 rounded-lg font-semibold">
                  <span>PAN Card Number Verified</span>
                  <span className="font-bold text-indigo-700">{metrics.verifiedPanCount || 0} / {metrics.totalActiveEmployees || 0}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-slate-50 border border-slate-200 rounded-lg font-semibold">
                  <span>Aadhaar Number Verified</span>
                  <span className="font-bold text-purple-700">{metrics.verifiedAadhaarCount || 0} / {metrics.totalActiveEmployees || 0}</span>
                </div>
              </div>
            </Card>
          </div>

          {/* Section 3: Statutory Enrolment & Departments Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Statutory Enrolments Coverage */}
            <Card title="Statutory Coverage & Enrolments">
              <div className="space-y-3 text-xs">
                <div className="flex justify-between items-center p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
                  <span className="font-semibold text-indigo-900">PF Enrolled Active Staff</span>
                  <span className="font-bold text-indigo-800 text-sm">{metrics.pfEnrolledCount || 0} Staff</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                  <span className="font-semibold text-emerald-900">ESIC Covered Active Staff</span>
                  <span className="font-bold text-emerald-800 text-sm">{metrics.esiEnrolledCount || 0} Staff</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-purple-50 border border-purple-200 rounded-lg">
                  <span className="font-semibold text-purple-900">PT Deducted Active Staff</span>
                  <span className="font-bold text-purple-800 text-sm">{metrics.ptEnrolledCount || 0} Staff</span>
                </div>
              </div>
            </Card>

            {/* Department Breakdown */}
            <Card title="Department Distribution">
              {topDepartments.length > 0 ? (
                <div className="space-y-2 text-xs font-semibold">
                  {topDepartments.map((dept, idx) => (
                    <div key={idx} className="flex justify-between items-center p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                      <span className="text-slate-800 font-semibold">{dept.department || 'General Operations'}</span>
                      <span className="font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">{dept.count} Staff</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-xs text-slate-500">General Operations Department</div>
              )}
            </Card>

            {/* Work Locations */}
            <Card title="Work Location Breakdown">
              {workLocations.length > 0 ? (
                <div className="space-y-2 text-xs font-semibold">
                  {workLocations.map((loc, idx) => (
                    <div key={idx} className="flex justify-between items-center p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                      <span className="text-slate-800 font-semibold flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-indigo-600" />
                        {loc.work_location}
                      </span>
                      <span className="font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">{loc.count} Staff</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-xs text-slate-500">Corporate HQ Location</div>
              )}
            </Card>

          </div>

          {/* Section 4: Workforce & Probation Module Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card title="Active Probation Tracker" className="md:col-span-2">
              <div className="p-4 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-950 flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                  <div>
                    <span className="font-bold block text-sm">Active Staff under Probation: {metrics.employeesUnderProbation || 0}</span>
                    <span className="font-normal text-amber-900">Probation period must end before employee promotion requests can be processed.</span>
                  </div>
                </div>
                <span className="px-3 py-1 bg-amber-200 text-amber-950 font-bold rounded-full text-xs shrink-0">
                  {metrics.employeesUnderProbation || 0} Staff
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 text-center">
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                  <div className="text-xs font-semibold text-slate-500 uppercase">Pass-through EOR Staff</div>
                  <div className="text-2xl font-bold text-indigo-700 mt-1">{metrics.eorStaffCount || 0}</div>
                </div>
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                  <div className="text-xs font-semibold text-slate-500 uppercase">Agency Contract Staff</div>
                  <div className="text-2xl font-bold text-purple-700 mt-1">{metrics.agencyStaffCount || 0}</div>
                </div>
              </div>
            </Card>

            <Card title="Workforce Diversity">
              <div className="space-y-3 text-xs">
                <div className="flex justify-between items-center p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <span className="font-semibold text-blue-900">Male Employees</span>
                  <span className="font-bold text-blue-800 text-base">{metrics.maleCount || 0}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-pink-50 border border-pink-200 rounded-lg">
                  <span className="font-semibold text-pink-900">Female Employees</span>
                  <span className="font-bold text-pink-800 text-base">{metrics.femaleCount || 0}</span>
                </div>
              </div>
            </Card>
          </div>

          {/* Section 5: Tables Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {!selectedClient ? (
              <Card 
                title="Top Client Partners & Staff Distribution" 
                headerAction={
                  <Link href={route('clients.index')} className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
                    View All <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                }
                noPadding
              >
                <DataTable 
                  columns={[
                    { 
                      key: 'company_name', 
                      label: 'Client Company', 
                      render: (val, row) => (
                        <Link href={route('clients.show', row.id)} className="font-bold text-slate-900 hover:text-indigo-600">
                          {val} <span className="text-xs text-slate-400 font-normal">({row.client_code})</span>
                        </Link>
                      ) 
                    },
                    { 
                      key: 'contract_type', 
                      label: 'Model', 
                      render: val => (
                        <Badge variant={val === 'eor' ? 'info' : 'primary'}>
                          {val === 'eor' ? 'Pass-through EOR' : 'Agency Contract'}
                        </Badge>
                      ) 
                    },
                    { 
                      key: 'employees_count', 
                      label: 'Active Staff', 
                      render: val => <span className="font-bold text-slate-900">{val || 0} Staff</span> 
                    },
                    { 
                      key: 'actions', 
                      label: 'Action', 
                      render: (_, row) => (
                        <button 
                          type="button"
                          onClick={() => router.get(route('dashboard'), { client_id: row.id })}
                          className="px-2.5 py-1 text-xs font-semibold bg-indigo-50 text-indigo-700 rounded transition-all shadow-sm"
                        >
                          Filter
                        </button>
                      ) 
                    }
                  ]}
                  data={topClients}
                />
              </Card>
            ) : (
              <Card title="Pending Revisions Queue">
                {recentRevisions.length > 0 ? (
                  <div className="space-y-3 text-xs">
                    {recentRevisions.map(rev => (
                      <div key={rev.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-3 shadow-sm">
                        <div>
                          <div className="font-bold text-slate-900">{rev.employee?.full_name || 'Staff'}</div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            {rev.is_promotion ? (
                              <span className="font-semibold text-purple-700 bg-purple-100 px-2 py-0.5 rounded inline-flex items-center gap-1"><Sparkles className="w-3 h-3 text-purple-600" /> {rev.new_designation}</span>
                            ) : (
                              <span className="font-semibold text-blue-700 bg-blue-100 px-2 py-0.5 rounded inline-flex items-center gap-1"><TrendingUp className="w-3 h-3 text-blue-600" /> Revision</span>
                            )}
                          </div>
                        </div>

                        <Link 
                          href={route('employees.salary-revision.create', rev.employee_id)} 
                          style={{ backgroundColor: themeColor }}
                          className="px-3 py-1 text-white hover:opacity-90 font-semibold text-[11px] rounded-lg shadow-sm transition-all"
                        >
                          Review
                        </Link>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-xs text-slate-500">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-1.5" />
                    <div className="font-semibold text-slate-700">No Pending Revisions</div>
                  </div>
                )}
              </Card>
            )}

            <Card 
              title={selectedClient ? `${selectedClient.company_name} Staff Directory` : "Recent Employee Onboardings"} 
              headerAction={
                <Link href={route('employees.index')} className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
                  View All <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              }
              noPadding
            >
              <DataTable 
                columns={[
                  { 
                    key: 'full_name', 
                    label: 'Employee Name', 
                    render: (val, row) => (
                      <div>
                        <Link href={route('employees.show', row.id)} className="font-bold text-slate-900 hover:text-indigo-600">
                          {val}
                        </Link>
                        <div className="text-[11px] text-slate-500 font-mono">{row.employee_code}</div>
                      </div>
                    ) 
                  },
                  { key: 'client', label: 'Client Partner', render: val => <span className="font-medium text-slate-700">{val?.company_name || 'N/A'}</span> },
                  { key: 'designation', label: 'Designation', render: val => <span className="text-xs text-slate-600 font-normal">{val || 'Staff'}</span> },
                  { 
                    key: 'status', 
                    label: 'Status', 
                    render: val => (
                      <Badge variant={val === 'active' ? 'success' : 'warning'}>
                        {val === 'active' ? 'Active' : 'Onboarding'}
                      </Badge>
                    ) 
                  },
                  { 
                    key: 'actions', 
                    label: 'Actions', 
                    render: (_, row) => (
                      <Link 
                        href={route('employees.show', row.id)} 
                        className="px-2.5 py-1 text-xs font-semibold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded transition-all inline-block"
                      >
                        Profile
                      </Link>
                    ) 
                  }
                ]}
                data={recentEmployees}
              />
            </Card>
          </div>

          {/* Section 6: Top Designations + Loans + Tax Split */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card title="Top Staff Roles & Designations">
              {topDesignations.length > 0 ? (
                <div className="space-y-2.5 text-xs font-semibold">
                  {topDesignations.map((desig, idx) => (
                    <div key={idx} className="flex justify-between items-center p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                      <span className="text-slate-800 font-semibold">{desig.designation || 'General Staff'}</span>
                      <span className="font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">{desig.count} Staff</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-xs text-slate-500">No designation data available.</div>
              )}
            </Card>

            <Card title="Loans & Advances Module">
              <div className="space-y-3 text-center">
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                  <div className="text-xs font-semibold text-slate-500 uppercase">Active Employee Loans</div>
                  <div className="text-2xl font-bold text-slate-900 mt-1">{metrics.activeLoansCount || 0}</div>
                </div>
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                  <div className="text-xs font-semibold text-slate-500 uppercase">Total Outstanding Principal</div>
                  <div className="text-lg font-bold text-slate-900 mt-1">{formatCurrency(metrics.totalLoanPrincipalOutstanding)}</div>
                </div>
              </div>
            </Card>

            <Card title="Income Tax Regime Split">
              <div className="space-y-3 text-center">
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                  <div className="text-xs font-semibold text-emerald-900 uppercase">New Tax Regime</div>
                  <div className="text-2xl font-bold text-emerald-800 mt-1">{metrics.newTaxRegimeCount || 0}</div>
                </div>
                <div className="p-4 bg-slate-100 border border-slate-200 rounded-xl">
                  <div className="text-xs font-semibold text-slate-700 uppercase">Old Tax Regime</div>
                  <div className="text-2xl font-bold text-slate-800 mt-1">{metrics.oldTaxRegimeCount || 0}</div>
                </div>
              </div>
            </Card>
          </div>

        </div>

      </AuthenticatedLayout>
    </RoleGuard>
  );
}
