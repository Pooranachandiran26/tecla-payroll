// Navigation constants — all URLs use Ziggy route() absolute URLs
// supporting subdirectory deployments out of the box.

export const adminNav = [
  { name: 'Dashboard', url: route('dashboard'), key: 'dashboard' },
  { name: 'Quick Access', url: route('quick-access'), key: 'quick-access' },
  { name: 'Clients', url: route('clients.index'), key: 'clients' },
  { name: 'Employees', url: route('employees.index'), key: 'candidates' },
  { name: 'Payroll', url: route('payroll.live-monitor'), key: 'payroll' },
  { name: 'Compliance', url: route('compliance.index'), key: 'compliance' },
  { name: 'Reports', url: route('reports.index'), key: 'reports' },
  { name: 'Admin', url: route('admin.activity-log'), key: 'admin' },
];

export const clientNav = [
  { name: 'Dashboard', url: route('client.dashboard'), key: 'client-dashboard' },
  { name: 'Employees', url: route('client.employees'), key: 'client-candidates' },
  { name: 'Attendance', url: route('client.attendance'), key: 'client-attendance' },
  { name: 'Invoices', url: route('client.invoices'), key: 'client-invoices' },
];

export const candidateNav = [
  { name: 'Dashboard', url: route('employee.dashboard'), key: 'candidate-dashboard' },
  { name: 'Attendance', url: route('employee.attendance'), key: 'candidate-attendance' },
  { name: 'Leave', url: route('employee.leave'), key: 'candidate-leave' },
  { name: 'Payslips', url: route('employee.payslips'), key: 'candidate-payslips' },
  { name: 'Profile', url: route('employee.profile'), key: 'candidate-profile' },
];

export const subNavs = {
  clients: [
    { name: 'All Clients', url: route('clients.index') },
    { name: 'Add New Client', url: route('clients.create') },
  ],
  candidates: [
    { name: 'All Employees', url: route('employees.index') },
    { name: 'Add New', url: route('employees.create') },
    { name: 'Bulk Upload', url: route('employees.bulk-upload') },
    { name: 'Bulk Salary Update', url: route('employees.salary-bulk-update') },
    { name: 'Bank Change Requests', url: route('employees.bank-change-requests') },
    { name: 'Leave Approval Queue', url: route('leave-requests.index') },
  ],
  payroll: [
    { name: 'Live Attendance Monitor', url: route('payroll.live-monitor') },
    { name: 'Attendance Upload', url: route('payroll.attendance-upload') },
    { name: 'Attendance Review', url: route('payroll.attendance-review') },
    { name: 'Processing', url: route('payroll.processing') },
    { name: 'Approval', url: route('payroll.approval') },
    { name: 'Payslips', url: route('payroll.payslips') },
    { name: 'Invoices', url: route('invoices.index') },
  ],
  compliance: [
    { name: 'Statutory Reports', url: route('compliance.index') },
  ],
  reports: [
    { name: 'Analytics Dashboard', url: route('reports.index') },
  ],
  admin: [
    { name: 'Activity Log', url: route('admin.activity-log') },
    { name: 'User Management', url: route('admin.users') },
    { name: 'Active Sessions', url: route('admin.sessions') },
    { name: 'Settings', url: route('admin.settings') },
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
