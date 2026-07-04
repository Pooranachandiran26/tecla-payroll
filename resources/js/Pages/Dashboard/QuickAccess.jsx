import React from 'react';
import AuthenticatedLayout from '../../Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';
import { 
  Users, UserPlus, UserCircle, UploadCloud, Banknote, History, ExternalLink, Activity, 
  Settings, CheckSquare, Shield, FileText, Calendar, Lock 
} from 'lucide-react';
import { useRole } from '../../Contexts/RoleContext.jsx';
import RoleGuard from '../../Components/RoleGuard.jsx';

export default function QuickAccess() {
  const { role } = useRole();

  const config = {
    admin: {
      subtitle: 'You have full access to every module.',
      visible: ['employees', 'payroll', 'attendance', 'leave', 'compliance', 'reports-admin', 'client-portal', 'employee-portal'],
      locked: []
    },
    executive: {
      subtitle: 'Showing modules available to your role.',
      subtitleNote: 'Locked items require Agency Admin access.',
      visible: ['employees', 'payroll', 'attendance', 'leave', 'compliance', 'reports-admin', 'client-portal', 'employee-portal'],
      locked: ['qa-activity-log', 'qa-user-mgmt', 'qa-settings']
    },
    client: {
      subtitle: 'Showing your available modules.',
      visible: ['client-portal'],
      locked: []
    },
    candidate: {
      subtitle: 'Showing your available modules.',
      visible: ['employee-portal'],
      locked: []
    }
  };

  const currentConfig = config[role] || config.admin;

  /* ... renderBtn stays the same ... */

  const renderBtn = (id, href, icon, label, lockedTooltip = "Admin access only") => {
    const isLocked = currentConfig.locked.includes(id);

    if (isLocked) {
      return (
        <a href="#" className="qa-btn qa-btn--locked group relative flex flex-col items-center justify-start gap-2 p-4 pb-3 border-r border-b border-gray-200 bg-[#f6f7fa] opacity-62 cursor-not-allowed" id={id}>
          <div className="qa-btn-icon w-9 h-9 flex items-center justify-center rounded-lg bg-black/5 shrink-0">
            {React.cloneElement(icon, { stroke: '#94a3b8' })}
          </div>
          <span className="qa-btn-label text-[0.72rem] font-semibold text-[#94a3b8] text-center leading-tight max-w-[80px]">
            {label}
          </span>
          <span className="absolute top-1.5 right-1.5 w-4 h-4 flex items-center justify-center bg-slate-400/15 rounded text-slate-400">
            <Lock className="w-2.5 h-2.5" />
          </span>
          <div className="absolute bottom-[calc(100%+7px)] left-1/2 -translate-x-1/2 scale-95 bg-[#1F3864]/95 text-white text-[0.65rem] font-bold py-1 px-2 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 group-hover:scale-100 transition-all pointer-events-none z-20 shadow-lg tracking-wide">
            {lockedTooltip}
          </div>
          <div className="absolute bottom-[calc(100%+3px)] left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[#1F3864]/95 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20"></div>
        </a>
      );
    }

    return (
      <Link href={href} className="qa-btn flex flex-col items-center justify-start gap-2 p-4 pb-3 border-r border-b border-gray-200 bg-white transition-all hover:bg-[#f7f9ff] hover:shadow-[0_4px_14px_rgba(31,56,100,0.12)] hover:-translate-y-0.5 hover:border-[#B8860B] hover:z-10 cursor-pointer relative" id={id}>
        <div className="qa-btn-icon w-9 h-9 flex items-center justify-center rounded-lg bg-gradient-to-br from-[#1F3864]/8 to-[#1F3864]/4 shrink-0 transition-colors [&_svg]:stroke-[#1F3864]">
          {icon}
        </div>
        <span className="qa-btn-label text-[0.72rem] font-semibold text-gray-500 text-center leading-tight max-w-[80px] transition-colors">
          {label}
        </span>
        {/* Custom CSS overrides for hover in this specific block */}
        <style>{`
          #${id}:hover .qa-btn-icon { background: linear-gradient(135deg, rgba(184,134,11,0.15) 0%, rgba(184,134,11,0.07) 100%); }
          #${id}:hover .qa-btn-icon svg { stroke: #B8860B; }
          #${id}:hover .qa-btn-label { color: #1F3864; }
        `}</style>
      </Link>
    );
  };

  return (
    <RoleGuard allowedRoles={['admin', 'manager']}>
    <AuthenticatedLayout>

      <div className="mb-8">
        <h2 className="text-[1.55rem] font-bold text-[#1F3864] mb-1.5">Quick Access — All Modules</h2>
        <div className="text-gray-500 text-sm leading-relaxed flex items-center flex-wrap gap-2">
          {currentConfig.subtitle}
          {currentConfig.subtitleNote && (
            <span className="inline-flex items-center gap-1.5 text-yellow-600 font-semibold text-[0.85rem] bg-yellow-50 border border-[#f5c27a] rounded px-2 py-0.5 ml-1 align-middle">
              <Lock className="w-3.5 h-3.5 shrink-0" /> {currentConfig.subtitleNote}
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
        
        {currentConfig.visible.includes('employees') && (
          <div className="rounded-lg overflow-hidden border border-gray-200 shadow-sm bg-white">
            <div className="bg-gradient-to-r from-[#e8eef8] to-[#dde6f5] border-b border-[#c8d5ec] px-4 py-2.5 flex items-center gap-2">
              <Users className="w-[18px] h-[18px] text-[#1F3864]" strokeWidth={1.8} />
              <span className="text-[0.85rem] font-bold text-[#1F3864] uppercase tracking-wide">Employees</span>
            </div>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(90px,1fr))] gap-0">
              {renderBtn('qa-all-employees', '/employees', <Users strokeWidth={1.6} />, 'All Employees')}
              {renderBtn('qa-add-employee', '/employees/create', <UserPlus strokeWidth={1.6} />, 'Add New Employee')}
              {renderBtn('qa-employee-detail', '/employees/1', <UserCircle strokeWidth={1.6} />, 'Employee Detail')}
              {renderBtn('qa-bulk-upload', '/employees/bulk-upload', <UploadCloud strokeWidth={1.6} />, 'Bulk Upload')}
              {renderBtn('qa-bulk-salary', '/employees/salary-bulk-update', <Banknote strokeWidth={1.6} />, 'Bulk Salary Update')}
              {renderBtn('qa-salary-revision', '/employees/1/salary-revision', <History strokeWidth={1.6} />, 'Salary Revision')}
              {renderBtn('qa-employee-exit', '/employees/1/exit', <ExternalLink strokeWidth={1.6} />, 'Employee Exit / F&F')}
              {renderBtn('qa-bank-change', '/employees/bank-change-requests', <Banknote strokeWidth={1.6} />, 'Bank Change Requests')}
            </div>
          </div>
        )}

        {currentConfig.visible.includes('payroll') && (
          <div className="rounded-lg overflow-hidden border border-gray-200 shadow-sm bg-white">
            <div className="bg-gradient-to-r from-[#e8eef8] to-[#dde6f5] border-b border-[#c8d5ec] px-4 py-2.5 flex items-center gap-2">
              <Banknote className="w-[18px] h-[18px] text-[#1F3864]" strokeWidth={1.8} />
              <span className="text-[0.85rem] font-bold text-[#1F3864] uppercase tracking-wide">Payroll</span>
            </div>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(90px,1fr))] gap-0">
              {renderBtn('qa-payroll-proc', '/payroll/processing', <Banknote strokeWidth={1.6} />, 'Payroll Processing')}
              {renderBtn('qa-payroll-approval', '/payroll/approval', <CheckSquare strokeWidth={1.6} />, 'Payroll Approval')}
              {renderBtn('qa-payslip', '/payroll/payslip', <FileText strokeWidth={1.6} />, 'Payslip Viewer')}
              {renderBtn('qa-invoice-gen', '/invoices/generate', <FileText strokeWidth={1.6} />, 'Invoice Generation')}
              {renderBtn('qa-invoices-list', '/invoices', <FileText strokeWidth={1.6} />, 'Invoices List')}
            </div>
          </div>
        )}

        {currentConfig.visible.includes('attendance') && (
          <div className="rounded-lg overflow-hidden border border-gray-200 shadow-sm bg-white">
            <div className="bg-gradient-to-r from-[#e8eef8] to-[#dde6f5] border-b border-[#c8d5ec] px-4 py-2.5 flex items-center gap-2">
              <Calendar className="w-[18px] h-[18px] text-[#1F3864]" strokeWidth={1.8} />
              <span className="text-[0.85rem] font-bold text-[#1F3864] uppercase tracking-wide">Attendance</span>
            </div>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(90px,1fr))] gap-0">
              {renderBtn('qa-live-attendance', '/payroll/live-attendance', <Activity strokeWidth={1.6} />, 'Live Monitor')}
              {renderBtn('qa-attendance-upload', '/payroll/attendance-upload', <UploadCloud strokeWidth={1.6} />, 'Attendance Upload')}
              {renderBtn('qa-attendance-review', '/payroll/attendance-review', <CheckSquare strokeWidth={1.6} />, 'Attendance Review')}
            </div>
          </div>
        )}

        {currentConfig.visible.includes('leave') && (
          <div className="rounded-lg overflow-hidden border border-gray-200 shadow-sm bg-white">
            <div className="bg-gradient-to-r from-[#e8eef8] to-[#dde6f5] border-b border-[#c8d5ec] px-4 py-2.5 flex items-center gap-2">
              <Calendar className="w-[18px] h-[18px] text-[#1F3864]" strokeWidth={1.8} />
              <span className="text-[0.85rem] font-bold text-[#1F3864] uppercase tracking-wide">Leave</span>
            </div>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(90px,1fr))] gap-0">
              {renderBtn('qa-leave-queue', '/employees/leave-approval', <CheckSquare strokeWidth={1.6} />, 'Leave Approval Queue')}
            </div>
          </div>
        )}

        {currentConfig.visible.includes('compliance') && (
          <div className="rounded-lg overflow-hidden border border-gray-200 shadow-sm bg-white">
            <div className="bg-gradient-to-r from-[#e8eef8] to-[#dde6f5] border-b border-[#c8d5ec] px-4 py-2.5 flex items-center gap-2">
              <Shield className="w-[18px] h-[18px] text-[#1F3864]" strokeWidth={1.8} />
              <span className="text-[0.85rem] font-bold text-[#1F3864] uppercase tracking-wide">Compliance</span>
            </div>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(90px,1fr))] gap-0">
              {renderBtn('qa-statutory', '/compliance', <Shield strokeWidth={1.6} />, 'Statutory Reports')}
            </div>
          </div>
        )}

        {currentConfig.visible.includes('reports-admin') && (
          <div className="rounded-lg overflow-hidden border border-gray-200 shadow-sm bg-white">
            <div className="bg-gradient-to-r from-[#e8eef8] to-[#dde6f5] border-b border-[#c8d5ec] px-4 py-2.5 flex items-center gap-2">
              <Activity className="w-[18px] h-[18px] text-[#1F3864]" strokeWidth={1.8} />
              <span className="text-[0.85rem] font-bold text-[#1F3864] uppercase tracking-wide">Reports & Admin</span>
            </div>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(90px,1fr))] gap-0">
              {renderBtn('qa-analytics', '/reports/analytics', <Activity strokeWidth={1.6} />, 'Analytics Dashboard')}
              {renderBtn('qa-activity-log', '/admin/activity-log', <History strokeWidth={1.6} />, 'Activity Log')}
              {renderBtn('qa-user-mgmt', '/admin/users', <Users strokeWidth={1.6} />, 'User Management')}
              {renderBtn('qa-settings', '/admin/settings', <Settings strokeWidth={1.6} />, 'Settings')}
            </div>
          </div>
        )}

        {currentConfig.visible.includes('client-portal') && (
          <div className="rounded-lg overflow-hidden border border-gray-200 shadow-sm bg-white">
            <div className="bg-gradient-to-r from-[#e8eef8] to-[#dde6f5] border-b border-[#c8d5ec] px-4 py-2.5 flex items-center gap-2">
              <Users className="w-[18px] h-[18px] text-[#1F3864]" strokeWidth={1.8} />
              <span className="text-[0.85rem] font-bold text-[#1F3864] uppercase tracking-wide">Client Portal</span>
            </div>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(90px,1fr))] gap-0">
              {renderBtn('qa-client-dash', '/client/dashboard', <Activity strokeWidth={1.6} />, 'Client Dashboard')}
              {renderBtn('qa-client-employees', '/client/employees', <Users strokeWidth={1.6} />, 'Client\'s Employees')}
              {renderBtn('qa-client-attendance', '/client/attendance', <Calendar strokeWidth={1.6} />, 'Attendance Approval')}
              {renderBtn('qa-client-invoices', '/client/invoices', <FileText strokeWidth={1.6} />, 'Client Invoices')}
            </div>
          </div>
        )}

        {currentConfig.visible.includes('employee-portal') && (
          <div className="rounded-lg overflow-hidden border border-gray-200 shadow-sm bg-white">
            <div className="bg-gradient-to-r from-[#e8eef8] to-[#dde6f5] border-b border-[#c8d5ec] px-4 py-2.5 flex items-center gap-2">
              <UserCircle className="w-[18px] h-[18px] text-[#1F3864]" strokeWidth={1.8} />
              <span className="text-[0.85rem] font-bold text-[#1F3864] uppercase tracking-wide">Employee Portal</span>
            </div>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(90px,1fr))] gap-0">
              {renderBtn('qa-emp-dash', '/employee/dashboard', <Activity strokeWidth={1.6} />, 'Employee Dashboard')}
              {renderBtn('qa-emp-attendance', '/employee/attendance', <Calendar strokeWidth={1.6} />, 'Employee Attendance')}
              {renderBtn('qa-emp-leave', '/employee/leave', <History strokeWidth={1.6} />, 'Leave Request')}
              {renderBtn('qa-emp-payslips', '/employee/payslips', <FileText strokeWidth={1.6} />, 'Employee Payslips')}
              {renderBtn('qa-emp-profile', '/employee/profile', <UserCircle strokeWidth={1.6} />, 'Employee Profile')}
            </div>
          </div>
        )}

      </div>
    </AuthenticatedLayout>
    </RoleGuard>
  );
}
