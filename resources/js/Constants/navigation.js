// Navigation constants — all URLs use Ziggy route() absolute URLs
// supporting subdirectory deployments out of the box.

const safeRoute = (routeName, fallbackPath) => {
  try {
    if (typeof route === 'function' && route().has(routeName)) {
      return route(routeName);
    }
  } catch (e) {}
  return fallbackPath;
};

export const adminNav = [
  { name: 'Dashboard', url: safeRoute('dashboard', '/dashboard'), key: 'dashboard' },
  { name: 'Quick Access', url: safeRoute('quick-access', '/quick-access'), key: 'quick-access' },
  { name: 'Clients', url: safeRoute('clients.index', '/clients'), key: 'clients' },
  { name: 'Employees', url: safeRoute('employees.index', '/employees'), key: 'candidates' },
  { name: 'Payroll', url: safeRoute('payroll.live-monitor', '/payroll/live-monitor'), key: 'payroll' },
  { name: 'Compliance', url: safeRoute('compliance.index', '/compliance'), key: 'compliance' },
  { name: 'Reports', url: safeRoute('reports.index', '/reports'), key: 'reports' },
  { name: 'Admin', url: safeRoute('admin.activity-log', '/admin/activity-log'), key: 'admin' },
];

export const clientNav = [
  { name: 'Dashboard', url: safeRoute('client.dashboard', '/client/dashboard'), key: 'client-dashboard' },
  { name: 'Employees', url: safeRoute('client.employees', '/client/employees'), key: 'client-candidates' },
  { name: 'Attendance', url: safeRoute('client.attendance', '/client/attendance'), key: 'client-attendance' },
  { name: 'Invoices', url: safeRoute('client.invoices', '/client/invoices'), key: 'client-invoices' },
];

export const candidateNav = [
  { name: 'Dashboard', url: safeRoute('employee.dashboard', '/employee/dashboard'), key: 'candidate-dashboard' },
  { name: 'Attendance', url: safeRoute('employee.attendance', '/employee/attendance'), key: 'candidate-attendance' },
  { name: 'Leave', url: safeRoute('employee.leave', '/employee/leave'), key: 'candidate-leave' },
  { name: 'Day Swaps', url: safeRoute('employee.day-swaps.index', '/employee/attendance/day-swaps'), key: 'candidate-day-swaps' },
  { name: 'Payslips', url: safeRoute('employee.payslips', '/employee/payslips'), key: 'candidate-payslips' },
  { name: 'Profile', url: safeRoute('employee.profile', '/employee/profile'), key: 'candidate-profile' },
];

export const subNavs = {
  clients: [
    { name: 'All Clients', url: safeRoute('clients.index', '/clients') },
    { name: 'Add New Client', url: safeRoute('clients.create', '/clients/create') },
  ],
  candidates: [
    { name: 'All Employees', url: safeRoute('employees.index', '/employees') },
    { name: 'Add New', url: safeRoute('employees.create', '/employees/create') },
    { name: 'Bulk Upload', url: safeRoute('employees.bulk-upload', '/employees/bulk-upload') },
    { name: 'Bank Change Requests', url: safeRoute('employees.bank-change-requests', '/employees/bank-change-requests') },
    { name: 'Day Swap Requests', url: safeRoute('employees.day-swaps', '/day-swap-requests') },
    { name: 'Leave Approval Queue', url: safeRoute('leave-requests.index', '/leave-requests') },
  ],
  payroll: [
    { name: 'Live Attendance Monitor', url: safeRoute('payroll.live-monitor', '/payroll/live-monitor') },
    { name: 'Attendance Upload', url: safeRoute('payroll.attendance-upload', '/payroll/attendance-upload') },
    { name: 'Attendance Review', url: safeRoute('payroll.attendance-review', '/payroll/attendance-review') },
    { name: 'Processing', url: safeRoute('payroll.processing', '/payroll/processing') },
    { name: 'Approval', url: safeRoute('payroll.approval', '/payroll/approval') },
    { name: 'Payslips', url: safeRoute('payroll.payslips', '/payroll/payslips') },
    { name: 'Invoices', url: safeRoute('invoices.index', '/invoices') },
  ],
  compliance: [
    { name: 'Statutory Reports', url: safeRoute('compliance.index', '/compliance') },
  ],
  reports: [
    { name: 'Analytics Dashboard', url: safeRoute('reports.index', '/reports') },
  ],
  admin: [
    { name: 'Activity Log', url: safeRoute('admin.activity-log', '/admin/activity-log') },
    { name: 'User Management', url: safeRoute('admin.users', '/admin/users') },
    { name: 'Active Sessions', url: safeRoute('admin.sessions', '/admin/sessions') },
    { name: 'Settings', url: safeRoute('admin.settings', '/admin/settings') },
  ],
};

export function getPathname(url) {
  if (!url) return '';
  const cleanUrl = url.split('?')[0].split('#')[0];
  try {
    return new URL(cleanUrl).pathname;
  } catch (e) {
    try {
      return new URL(cleanUrl, window.location.origin).pathname;
    } catch (e2) {
      return cleanUrl;
    }
  }
}

export function getActiveCategory(currentPath, role) {
  const navLinks = role === 'client' ? clientNav
    : role === 'employee' ? candidateNav
    : adminNav;

  const currentPathname = getPathname(currentPath);

  // Direct match first
  for (const link of navLinks) {
    if (currentPathname === getPathname(link.url)) {
      return link.key;
    }
  }

  // Sub-nav match
  if (role === 'admin' || role === 'manager') {
    for (const [category, links] of Object.entries(subNavs)) {
      for (const link of links) {
        const linkPathname = getPathname(link.url);
        if (currentPathname === linkPathname || currentPathname.startsWith(linkPathname + '/')) {
          return category;
        }
      }
    }
  }

  // Fallback heuristics
  if (currentPathname.includes('client')) {
    if (role === 'client') {
      if (currentPathname.includes('dashboard')) return 'client-dashboard';
      if (currentPathname.includes('employee')) return 'client-candidates';
      if (currentPathname.includes('attendance')) return 'client-attendance';
      if (currentPathname.includes('invoice')) return 'client-invoices';
    }
    return 'clients';
  }
  if (currentPathname.includes('employee') || currentPathname.includes('salary') || currentPathname.includes('bank') || currentPathname.includes('leave')) {
    if (role === 'employee') {
      if (currentPathname.includes('dashboard')) return 'candidate-dashboard';
      if (currentPathname.includes('attendance')) return 'candidate-attendance';
      if (currentPathname.includes('leave')) return 'candidate-leave';
      if (currentPathname.includes('payslip')) return 'candidate-payslips';
      if (currentPathname.includes('profile')) return 'candidate-profile';
    }
    return 'candidates';
  }
  if (currentPathname.includes('attendance') || currentPathname.includes('payroll') || currentPathname.includes('payslip') || currentPathname.includes('invoice')) {
    return 'payroll';
  }
  if (currentPathname.includes('compliance')) return 'compliance';
  if (currentPathname.includes('report')) return 'reports';
  if (currentPathname.includes('activity') || currentPathname.includes('user') || currentPathname.includes('setting') || currentPathname.includes('session')) return 'admin';
  if (currentPathname.includes('quick-access')) return 'quick-access';

  return 'dashboard';
}
