// Navigation constants — ported from payroll-new/assets/script.js
// All .html URLs replaced with Laravel route paths

export const adminNav = [
  { name: 'Dashboard', url: '/dashboard', key: 'dashboard' },
  { name: 'Quick Access', url: '/quick-access', key: 'quick-access' },
  { name: 'Clients', url: '/clients', key: 'clients' },
  { name: 'Employees', url: '/employees', key: 'candidates' },
  { name: 'Payroll', url: '/payroll/live-monitor', key: 'payroll' },
  { name: 'Compliance', url: '/compliance', key: 'compliance' },
  { name: 'Reports', url: '/reports', key: 'reports' },
  { name: 'Admin', url: '/admin/activity-log', key: 'admin' },
];

export const clientNav = [
  { name: 'Dashboard', url: '/client/dashboard', key: 'client-dashboard' },
  { name: 'Employees', url: '/client/employees', key: 'client-candidates' },
  { name: 'Attendance', url: '/client/attendance', key: 'client-attendance' },
  { name: 'Invoices', url: '/client/invoices', key: 'client-invoices' },
];

export const candidateNav = [
  { name: 'Dashboard', url: '/employee/dashboard', key: 'candidate-dashboard' },
  { name: 'Attendance', url: '/employee/attendance', key: 'candidate-attendance' },
  { name: 'Leave', url: '/employee/leave', key: 'candidate-leave' },
  { name: 'Payslips', url: '/employee/payslips', key: 'candidate-payslips' },
  { name: 'Profile', url: '/employee/profile', key: 'candidate-profile' },
];

export const subNavs = {
  clients: [
    { name: 'All Clients', url: '/clients' },
    { name: 'Add New Client', url: '/clients/create' },
  ],
  candidates: [
    { name: 'All Employees', url: '/employees' },
    { name: 'Add New', url: '/employees/create' },
    { name: 'Bulk Upload', url: '/employees/bulk-upload' },
    { name: 'Bulk Salary Update', url: '/employees/salary-bulk-update' },
    { name: 'Bank Change Requests', url: '/bank-change-requests' },
    { name: 'Leave Approval Queue', url: '/leave-approval' },
  ],
  payroll: [
    { name: 'Live Attendance Monitor', url: '/payroll/live-monitor' },
    { name: 'Attendance Upload', url: '/payroll/attendance-upload' },
    { name: 'Attendance Review', url: '/payroll/attendance-review' },
    { name: 'Processing', url: '/payroll/processing' },
    { name: 'Approval', url: '/payroll/approval' },
    { name: 'Payslips', url: '/payroll/payslips' },
    { name: 'Invoices', url: '/invoices' },
  ],
  compliance: [
    { name: 'Statutory Reports', url: '/compliance' },
  ],
  reports: [
    { name: 'Analytics Dashboard', url: '/reports' },
  ],
  admin: [
    { name: 'Activity Log', url: '/admin/activity-log' },
    { name: 'User Management', url: '/admin/users' },
    { name: 'Settings', url: '/admin/settings' },
  ],
};

// Role-based user display info
export const roleUserInfo = {
  admin:     { label: 'Rajesh',       roleLabel: 'Agency Admin' },
  executive: { label: 'Sunita',       roleLabel: 'Manager' },
  client:    { label: 'Mahindra Corp', roleLabel: 'Client Rep' },
  candidate: { label: 'Aarav Sharma', roleLabel: 'Developer' },
};

/**
 * Determine the active primary nav category from the current URL path.
 * Ports the fallback logic from script.js L103-L146.
 */
export function getActiveCategory(currentPath, role) {
  const navLinks = role === 'client' ? clientNav
    : role === 'candidate' ? candidateNav
    : adminNav;

  // Direct match first
  for (const link of navLinks) {
    if (currentPath === link.url) {
      return link.key;
    }
  }

  // Sub-nav match
  if (role === 'admin' || role === 'executive') {
    for (const [category, links] of Object.entries(subNavs)) {
      for (const link of links) {
        if (currentPath === link.url || currentPath.startsWith(link.url + '/')) {
          return category;
        }
      }
    }
  }

  // Fallback heuristics
  if (currentPath.includes('client')) {
    if (role === 'client') {
      if (currentPath.includes('dashboard')) return 'client-dashboard';
      if (currentPath.includes('employee')) return 'client-candidates';
      if (currentPath.includes('attendance')) return 'client-attendance';
      if (currentPath.includes('invoice')) return 'client-invoices';
    }
    return 'clients';
  }
  if (currentPath.includes('employee') || currentPath.includes('salary') || currentPath.includes('bank') || currentPath.includes('leave')) {
    if (role === 'candidate') {
      if (currentPath.includes('dashboard')) return 'candidate-dashboard';
      if (currentPath.includes('attendance')) return 'candidate-attendance';
      if (currentPath.includes('leave')) return 'candidate-leave';
      if (currentPath.includes('payslip')) return 'candidate-payslips';
      if (currentPath.includes('profile')) return 'candidate-profile';
    }
    return 'candidates';
  }
  if (currentPath.includes('attendance') || currentPath.includes('payroll') || currentPath.includes('payslip') || currentPath.includes('invoice')) {
    return 'payroll';
  }
  if (currentPath.includes('compliance')) return 'compliance';
  if (currentPath.includes('report')) return 'reports';
  if (currentPath.includes('activity') || currentPath.includes('user') || currentPath.includes('setting')) return 'admin';
  if (currentPath.includes('quick-access')) return 'quick-access';

  return 'dashboard';
}
