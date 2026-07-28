import React from 'react';
import { Head, Link } from '@inertiajs/react';
import AuthenticatedLayout from '../../Layouts/AuthenticatedLayout';
import StatsCard from '../../Components/ui/StatsCard';
import Card from '../../Components/ui/Card';
import Alert from '../../Components/ui/Alert';
import Badge from '../../Components/ui/Badge';
import Button from '../../Components/ui/Button';
import DataTable from '../../Components/ui/DataTable';
import { 
  Users, 
  Building2, 
  IndianRupee, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  UserPlus, 
  FileText, 
  TrendingUp, 
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Zap,
  Activity,
  Award,
  CreditCard
} from 'lucide-react';
import RoleGuard from '../../Components/RoleGuard.jsx';
import { useRole } from '../../Contexts/RoleContext.jsx';

export default function Dashboard({ 
  metrics = {}, 
  todayAttendance = {}, 
  recentEmployees = [], 
  topClients = [], 
  recentRevisions = [], 
  recentPayrollRuns = [], 
  currentPeriod = 'July 2026' 
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

  return (
    <RoleGuard allowedRoles={['admin', 'manager']}>
      <AuthenticatedLayout>
        <Head title="Executive HR & Payroll Dashboard" />

        {/* Dashboard Top Header & Quick Action Row */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-extrabold text-[#1F3864] tracking-tight flex items-center gap-2">
              <Activity className="w-7 h-7 text-indigo-600 animate-pulse" />
              Payroll & HR Operations Command Center
            </h1>
            <p className="text-sm text-slate-500 font-medium mt-1">
              Real-time monitoring of active workforce, client billings, pending approvals, and compliance alerts.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-white border border-slate-200 px-3.5 py-1.5 rounded-lg shadow-sm text-xs font-bold text-slate-700 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
              Current Cycle: <span className="text-[#1F3864] font-extrabold">{currentPeriod}</span>
            </div>

            <Link
              href={route('employees.create')}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#1F3864] hover:bg-[#162746] text-white font-bold text-xs rounded-lg shadow transition-all hover:scale-[1.02]"
            >
              <UserPlus className="w-4 h-4 text-amber-300" /> + Add Employee
            </Link>

            <Link
              href={route('clients.create')}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-indigo-800 font-bold text-xs rounded-lg shadow-sm transition-all"
            >
              <Building2 className="w-4 h-4 text-indigo-600" /> + Add Client
            </Link>
          </div>
        </div>

        {/* Smart Approval Alerts Banner */}
        {metrics.totalPendingAlerts > 0 ? (
          <div className="mb-6 bg-gradient-to-r from-amber-50 via-amber-50/80 to-amber-100/40 border border-amber-300 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5 sm:mt-0">
                <AlertTriangle className="w-5 h-5 animate-bounce" />
              </div>
              <div>
                <div className="font-extrabold text-amber-950 text-sm flex items-center gap-2">
                  <span>Action Required: {metrics.totalPendingAlerts} Pending Approvals in Queue</span>
                </div>
                <div className="text-xs text-amber-900 font-medium mt-0.5 flex flex-wrap gap-x-4 gap-y-1">
                  {metrics.pendingSalaryRevisions > 0 && (
                    <span>• 📈 <strong>{metrics.pendingSalaryRevisions}</strong> Salary Revision Requests</span>
                  )}
                  {metrics.pendingBankRequests > 0 && (
                    <span>• 🏦 <strong>{metrics.pendingBankRequests}</strong> Bank Change Requests</span>
                  )}
                  {metrics.pendingDaySwaps > 0 && (
                    <span>• 🔄 <strong>{metrics.pendingDaySwaps}</strong> Day Swap Requests</span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {metrics.pendingSalaryRevisions > 0 && (
                <Link
                  href={route('employees.index')}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-lg shadow transition-all"
                >
                  Review Revisions
                </Link>
              )}
              {metrics.pendingBankRequests > 0 && (
                <Link
                  href={route('employees.bank-change-requests')}
                  className="px-3 py-1.5 bg-white border border-amber-400 text-amber-900 hover:bg-amber-100 font-bold text-xs rounded-lg shadow-sm transition-all"
                >
                  Bank Requests
                </Link>
              )}
            </div>
          </div>
        ) : (
          <div className="mb-6 bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 flex items-center justify-between text-xs text-emerald-900 font-medium">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>All approval queues are up to date. No pending salary revisions or bank requests.</span>
            </div>
            <span className="font-bold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-300">
              ✓ Compliance Clear
            </span>
          </div>
        )}

        {/* Executive KPI Stats Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatsCard 
            title="Total Active Workforce" 
            value={metrics.totalActiveEmployees || 0} 
            trendStr={`${metrics.totalOnboarding || 0} onboarding`} 
            trendType="up"
            icon={Users}
          />
          <StatsCard 
            title="Active Client Partners" 
            value={metrics.totalClients || 0} 
            trendStr="EOR & Agency Models" 
            trendType="up"
            icon={Building2}
          />
          <StatsCard 
            title="Est. Monthly CTC Expenditure" 
            value={formatCurrency(metrics.monthlyCtcTotal)} 
            trendStr="Total Gross Payroll" 
            trendType="up"
            icon={IndianRupee}
          />
          
          {role === 'manager' ? (
            <div className="card metric-card locked-card bg-white p-4 rounded-xl border border-slate-200 relative overflow-hidden shadow-sm">
              <div className="locked-blur filter blur-sm">
                <span className="text-xs font-semibold text-slate-500 block">Est. Net Take Home</span>
                <span className="text-xl font-extrabold text-slate-900 block mt-1">₹XX,XX,XXX</span>
                <span className="text-xs text-emerald-600 font-bold block mt-1">🔒 Confidential Data</span>
              </div>
              <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-[2px] flex flex-col items-center justify-center text-white p-2 text-center">
                <span className="bg-amber-500 text-slate-950 font-bold text-[10px] uppercase px-2 py-0.5 rounded mb-1">🔒 Protected</span>
                <span className="text-xs font-bold">Admin Financial Access Required</span>
              </div>
            </div>
          ) : (
            <StatsCard 
              title="Est. Net Take Home" 
              value={formatCurrency(metrics.monthlyNetTakeHomeTotal)} 
              trendStr="Direct Employee Payout" 
              trendType="up"
              icon={TrendingUp}
            />
          )}
        </div>

        {/* Main Grid Content Area */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          
          {/* Column 1 & 2: Main Dashboard Widgets */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Live Attendance Snapshot */}
            <Card 
              title={
                <span className="flex items-center gap-2 text-slate-800 font-bold text-sm">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                  </span>
                  Today's Live Attendance Snapshot
                </span>
              }
              headerAction={
                <Link 
                  href={route('payroll.live-monitor')} 
                  className="px-3 py-1 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-indigo-700 font-bold text-xs rounded-md transition-all flex items-center gap-1"
                >
                  <Clock className="w-3.5 h-3.5" /> Live Monitor
                </Link>
              }
            >
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div className="bg-emerald-50/80 p-3.5 rounded-xl border border-emerald-200">
                  <div className="text-2xl font-extrabold text-emerald-700">{todayAttendance.punchedIn || 0}</div>
                  <div className="text-xs font-semibold text-emerald-900 mt-1">Punched In</div>
                </div>
                <div className="bg-amber-50/80 p-3.5 rounded-xl border border-amber-200">
                  <div className="text-2xl font-extrabold text-amber-700">{todayAttendance.notPunched || 0}</div>
                  <div className="text-xs font-semibold text-amber-900 mt-1">Not Punched In</div>
                </div>
                <div className="bg-indigo-50/80 p-3.5 rounded-xl border border-indigo-200">
                  <div className="text-2xl font-extrabold text-indigo-700">{todayAttendance.totalActive || 0}</div>
                  <div className="text-xs font-semibold text-indigo-900 mt-1">Total Active Staff</div>
                </div>
                <div className="bg-slate-100 p-3.5 rounded-xl border border-slate-200 flex flex-col items-center justify-center">
                  <div className="text-xl font-extrabold text-slate-800">{todayAttendance.completionPct || 0}%</div>
                  <div className="text-xs font-semibold text-slate-600 mt-0.5">Punch Rate</div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mt-4 pt-3 border-t border-slate-100">
                <div className="flex justify-between items-center text-xs text-slate-600 font-semibold mb-1">
                  <span>Shift Punch Progress</span>
                  <span>{todayAttendance.punchedIn || 0} / {todayAttendance.totalActive || 0} Punched In</span>
                </div>
                <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-emerald-500 transition-all duration-500 rounded-full"
                    style={{ width: `${todayAttendance.completionPct || 0}%` }}
                  ></div>
                </div>
              </div>
            </Card>

            {/* Top Active Client Partners Table */}
            <Card 
              title="Top Client Partners & Staff Distribution" 
              headerAction={
                <Link href={route('clients.index')} className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
                  View All Clients <ArrowRight className="w-3.5 h-3.5" />
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
                      <Link href={route('clients.show', row.id)} className="font-bold text-slate-900 hover:text-indigo-600 transition-colors">
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
                    render: val => <span className="font-extrabold text-slate-800">{val || 0} Staff</span> 
                  },
                  { 
                    key: 'actions', 
                    label: 'Action', 
                    render: (_, row) => (
                      <Link 
                        href={route('clients.show', row.id)} 
                        className="px-2.5 py-1 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded transition-all inline-block"
                      >
                        View Details
                      </Link>
                    ) 
                  }
                ]}
                data={topClients}
              />
            </Card>

            {/* Recent Onboarding Employees */}
            <Card 
              title="Recent Employee Onboardings" 
              headerAction={
                <Link href={route('employees.index')} className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
                  View All Staff <ArrowRight className="w-3.5 h-3.5" />
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
                        <div className="text-[11px] text-slate-500">{row.employee_code}</div>
                      </div>
                    ) 
                  },
                  { key: 'client', label: 'Client Partner', render: val => <span className="font-semibold text-slate-700">{val?.company_name || 'N/A'}</span> },
                  { key: 'designation', label: 'Designation', render: val => <span className="text-xs text-slate-600 font-medium">{val || 'Staff'}</span> },
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
                        className="px-2.5 py-1 text-xs font-bold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded transition-all inline-block"
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

          {/* Column 3: Quick Tools & Recent Revisions Sidebar */}
          <div className="space-y-6">
            
            {/* Quick Actions Shortcuts Box */}
            <Card title="Quick Operations Shortcuts">
              <div className="grid grid-cols-1 gap-2.5">
                <Link 
                  href={route('employees.create')} 
                  className="p-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 flex items-center justify-between transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                      <UserPlus className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900 group-hover:text-indigo-600">Onboard New Employee</div>
                      <div className="text-[11px] text-slate-500">Add staff member profile</div>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
                </Link>

                <Link 
                  href={route('employees.bulk-upload')} 
                  className="p-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 flex items-center justify-between transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900 group-hover:text-purple-600">Bulk Excel Upload</div>
                      <div className="text-[11px] text-slate-500">Import staff batch</div>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
                </Link>

                <Link 
                  href={route('payroll.processing')} 
                  className="p-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 flex items-center justify-between transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                      <IndianRupee className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900 group-hover:text-emerald-600">Run Monthly Payroll</div>
                      <div className="text-[11px] text-slate-500">Process & release payslips</div>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
                </Link>

                <Link 
                  href={route('employees.bank-change-requests')} 
                  className="p-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 flex items-center justify-between transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                      <CreditCard className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900 group-hover:text-amber-800">Bank Change Queue</div>
                      <div className="text-[11px] text-slate-500">Approve account updates</div>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </Card>

            {/* Pending Salary Revisions Queue */}
            <Card title="Pending Salary Revisions">
              {recentRevisions.length > 0 ? (
                <div className="space-y-3">
                  {recentRevisions.map(rev => (
                    <div key={rev.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs flex items-center justify-between gap-3">
                      <div>
                        <div className="font-bold text-slate-900">{rev.employee?.full_name || 'Employee'}</div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                          {rev.is_promotion ? (
                            <span className="font-bold text-purple-700 bg-purple-100 px-1.5 py-0.5 rounded">🎉 {rev.new_designation}</span>
                          ) : (
                            <span className="font-bold text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded">📈 Revision</span>
                          )}
                        </div>
                      </div>

                      <Link 
                        href={route('employees.salary-revision.create', rev.employee_id)} 
                        className="px-2.5 py-1 bg-[#1F3864] text-white hover:bg-[#162746] font-bold text-[11px] rounded shadow-sm transition-all"
                      >
                        Review
                      </Link>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-xs text-slate-500">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-1.5" />
                  <div className="font-bold text-slate-700">No Pending Revisions</div>
                  <div>All promotion & revision requests are resolved.</div>
                </div>
              )}
            </Card>

            {/* Compliance System Status */}
            <Card title="Compliance Health Check">
              <div className="space-y-2.5 text-xs">
                <div className="flex items-center justify-between p-2.5 bg-emerald-50 text-emerald-900 rounded-lg border border-emerald-200">
                  <span className="font-semibold flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" /> PF ECR Draft Rules
                  </span>
                  <span className="font-bold text-emerald-700">✓ Ready</span>
                </div>

                <div className="flex items-center justify-between p-2.5 bg-emerald-50 text-emerald-900 rounded-lg border border-emerald-200">
                  <span className="font-semibold flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" /> ESIC Contribution Caps
                  </span>
                  <span className="font-bold text-emerald-700">✓ Active</span>
                </div>

                <div className="flex items-center justify-between p-2.5 bg-indigo-50 text-indigo-900 rounded-lg border border-indigo-200">
                  <span className="font-semibold flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-indigo-600" /> Professional Tax Slabs
                  </span>
                  <span className="font-bold text-indigo-700">✓ Auto-Applied</span>
                </div>
              </div>
            </Card>

          </div>

        </div>

      </AuthenticatedLayout>
    </RoleGuard>
  );
}
