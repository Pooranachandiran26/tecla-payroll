import { Head, useForm, router, usePage } from '@inertiajs/react';
import { useState } from 'react';
import AuthenticatedLayout from '../../Layouts/AuthenticatedLayout';
import RoleGuard from '../../Components/RoleGuard.jsx';
import Modal from '../../Components/ui/Modal';
import ConfirmDialog from '../../Components/ui/ConfirmDialog';
import useToast from '../../Hooks/useToast';
import { 
    UserPlus, 
    Search, 
    Filter, 
    Shield, 
    Building2, 
    Users, 
    Edit2, 
    CheckCircle2, 
    AlertTriangle,
    RotateCw,
    Trash2,
    Send
} from 'lucide-react';

export default function UserManagement({ users = {}, unlinkedEmployees = [], unlinkedClients = [], allClients = [], filters = {} }) {
  const { auth } = usePage().props;
  const { showToast } = useToast();
  const currentUserId = auth?.user?.id;

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [editingManager, setEditingManager] = useState(null);
  const [editClientIds, setEditClientIds] = useState([]);
  const [scopeSearchQuery, setScopeSearchQuery] = useState('');

  const [editingPermissionsUser, setEditingPermissionsUser] = useState(null);
  const [selectedPermissions, setSelectedPermissions] = useState([]);
  const [deletingUser, setDeletingUser] = useState(null);
  const [resendingUserId, setResendingUserId] = useState(null);

  const handleResendInvite = (targetUser) => {
    setResendingUserId(targetUser.id);
    router.post(
      route('admin.users.resend-invite', targetUser.id),
      {},
      {
        onFinish: () => setResendingUserId(null),
        onError: (errs) => {
          showToast({ type: 'error', title: 'Error', message: errs.message || 'Failed to resend invitation.' });
        }
      }
    );
  };

  const handleDeleteUser = () => {
    if (!deletingUser) return;
    router.delete(route('admin.users.destroy', deletingUser.id), {
      onSuccess: () => {
        setDeletingUser(null);
      },
      onError: (errs) => {
        setDeletingUser(null);
        showToast({ type: 'error', title: 'Error', message: errs.message || 'Failed to delete user account.' });
      },
      onFinish: () => setDeletingUser(null),
    });
  };

  const AVAILABLE_MODULES = [
    { key: 'dashboard', label: 'Dashboard Overview', desc: 'Main executive dashboard metrics & pending queues' },
    { key: 'quick-access', label: 'Quick Access Navigation', desc: 'Quick launcher shortcuts' },
    { 
      key: 'clients', 
      label: 'Clients Directory', 
      desc: 'Client profiles, branch locations, and statutory setups',
      children: [
        { key: 'clients_index', label: 'All Clients Directory' },
        { key: 'clients_create', label: 'Add New Client' },
      ]
    },
    { 
      key: 'candidates', 
      label: 'Employees Directory', 
      desc: 'Employee master data, bulk upload, salary revisions & queues',
      children: [
        { key: 'emp_all', label: 'All Employees' },
        { key: 'emp_create', label: 'Add New Employee' },
        { key: 'emp_bulk_upload', label: 'Bulk Upload Employees' },
        { key: 'emp_salary_revisions', label: 'Salary Revisions Queue' },
        { key: 'emp_bank_change', label: 'Bank Change Requests' },
        { key: 'emp_day_swaps', label: 'Day Swap Requests' },
        { key: 'emp_leave_approval', label: 'Leave Approval Queue' },
        { key: 'emp_leave_settings', label: 'Client Leave Settings' },
        { key: 'emp_queries', label: 'Employee Queries' },
      ]
    },
    { 
      key: 'payroll', 
      label: 'Payroll & Invoicing', 
      desc: 'Attendance review, processing, approvals, payslips & invoices',
      children: [
        { key: 'payroll_live_monitor', label: 'Live Attendance Monitor' },
        { key: 'payroll_attendance_upload', label: 'Attendance Upload' },
        { key: 'payroll_attendance_review', label: 'Attendance Review' },
        { key: 'payroll_processing', label: 'Payroll Processing' },
        { key: 'payroll_approval', label: 'Payroll Approval' },
        { key: 'payroll_payslips', label: 'Payslips Viewer' },
        { key: 'payroll_invoices', label: 'Invoices List' },
      ]
    },
    { key: 'compliance', label: 'Compliance Reports', desc: 'PF, ESI, LWF, PT & Statutory tax reports' },
    { key: 'reports', label: 'Analytics Reports', desc: 'Executive payroll analytics & export reports' },
    { 
      key: 'admin', 
      label: 'Admin System Control', 
      desc: 'Activity logs, user management, sessions, templates',
      children: [
        { key: 'admin_activity_log', label: 'Activity Log' },
        { key: 'admin_users', label: 'User Management' },
        { key: 'admin_sessions', label: 'Active Sessions' },
        { key: 'admin_payslip_templates', label: 'Payslip Templates Customizer' },
        { key: 'admin_masters', label: 'Master Data Management' },
        { key: 'admin_settings', label: 'System Settings' },
      ]
    },
  ];

  const getAllModuleKeys = () => {
    const keys = [];
    AVAILABLE_MODULES.forEach(m => {
      keys.push(m.key);
      if (m.children) {
        m.children.forEach(c => keys.push(c.key));
      }
    });
    return keys;
  };

  const openPermissionsModal = (user) => {
    setEditingPermissionsUser(user);
    const existing = user.module_permissions || [];
    if (existing.length === 0) {
      setSelectedPermissions(getAllModuleKeys());
      return;
    }

    const normalized = [...existing];
    AVAILABLE_MODULES.forEach(mod => {
      if (mod.children && normalized.includes(mod.key)) {
        const childKeys = mod.children.map(c => c.key);
        const hasChildInExisting = childKeys.some(ck => normalized.includes(ck));
        if (!hasChildInExisting) {
          childKeys.forEach(ck => {
            if (!normalized.includes(ck)) normalized.push(ck);
          });
        }
      }
    });

    setSelectedPermissions(normalized);
  };

  const togglePermission = (key, parentKey = null) => {
    setSelectedPermissions(prev => {
      const isSelected = prev.includes(key);
      const mod = AVAILABLE_MODULES.find(m => m.key === key);

      if (mod && mod.children) {
        const childKeys = mod.children.map(c => c.key);
        if (isSelected) {
          return prev.filter(k => k !== key && !childKeys.includes(k));
        } else {
          return Array.from(new Set([...prev, key, ...childKeys]));
        }
      } else {
        if (isSelected) {
          return prev.filter(k => k !== key);
        } else {
          const next = [...prev, key];
          if (parentKey && !next.includes(parentKey)) {
            next.push(parentKey);
          }
          return next;
        }
      }
    });
  };

  const handleSavePermissions = () => {
    if (!editingPermissionsUser) return;
    router.put(
      route('admin.users.update-module-permissions', editingPermissionsUser.id),
      { module_permissions: selectedPermissions },
      {
        onSuccess: () => {
          setEditingPermissionsUser(null);
        }
      }
    );
  };

  const { tab = 'system', search = '' } = filters;
  const [searchQuery, setSearchQuery] = useState(search);

  const handleTabChange = (newTab) => {
    router.get(route('admin.users'), { tab: newTab, search: searchQuery }, { preserveState: true, preserveScroll: true });
  };

  const handleSearch = () => {
    router.get(route('admin.users'), { tab, search: searchQuery }, { preserveState: true, preserveScroll: true });
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const { data, setData, post, processing, errors, reset } = useForm({
    name: '',
    email: '',
    role: 'employee',
    employee_id: '',
    client_id: '',
    assigned_client_ids: [],
  });

  const submit = (e) => {
    e.preventDefault();
    post(route('admin.users.store'), {
      onSuccess: () => {
        setShowInviteModal(false);
        reset();
      }
    });
  };

  const handleClientToggle = (clientId) => {
    const current = data.assigned_client_ids || [];
    if (current.includes(clientId)) {
      setData('assigned_client_ids', current.filter(id => id !== clientId));
    } else {
      setData('assigned_client_ids', [...current, clientId]);
    }
  };

  const handleSaveManagerClients = (e) => {
    e.preventDefault();
    if (!editingManager) return;
    router.put(route('admin.users.update-managed-clients', editingManager.id), {
      assigned_client_ids: editClientIds
    }, {
      onSuccess: () => {
        setEditingManager(null);
        setEditClientIds([]);
      }
    });
  };

  const openManagerEditModal = (user) => {
    setEditingManager(user);
    setScopeSearchQuery('');
    const existingIds = (user.managed_clients || []).map(c => c.id);
    setEditClientIds(existingIds);
  };

  const usersList = users.data || [];

  return (
    <RoleGuard allowedRoles={['admin', 'manager']} moduleKey="admin">
      <AuthenticatedLayout>
        <Head title="User Management" />
        <div className="legacy-react-wrapper">

          {/* Header Row */}
          <div className="flex-row-between">
            <div>
              <h2>User Management</h2>
              <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
                Manage user accounts, system roles, and client-level access control.
              </p>
            </div>
            <div style={{ display: "flex", gap: "0.75rem" }}>
              <button 
                className="btn btn-navy"
                onClick={() => setShowInviteModal(true)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <UserPlus size={15} /> Invite User
              </button>
            </div>
          </div>

          {/* Category Pill Tabs Segmented Control */}
          <div style={{
            background: '#F1F5F9',
            borderRadius: '12px',
            padding: '5px',
            marginBottom: '1.25rem',
            display: 'flex',
            gap: '4px',
            overflowX: 'auto',
            alignItems: 'center',
            border: '1px solid #E2E8F0'
          }}>
            <button
              type="button"
              onClick={() => handleTabChange('system')}
              style={{
                padding: '0.45rem 0.85rem',
                fontSize: '0.82rem',
                fontWeight: tab === 'system' ? '700' : '600',
                color: tab === 'system' ? 'var(--primary-navy)' : '#64748B',
                background: tab === 'system' ? '#FFFFFF' : 'transparent',
                boxShadow: tab === 'system' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.15s ease'
              }}
            >
              <Shield size={14} style={{ color: tab === 'system' ? 'var(--primary-navy)' : '#94A3B8' }} />
              <span>System Staff (Admins & Managers)</span>
            </button>

            <button
              type="button"
              onClick={() => handleTabChange('clients')}
              style={{
                padding: '0.45rem 0.85rem',
                fontSize: '0.82rem',
                fontWeight: tab === 'clients' ? '700' : '600',
                color: tab === 'clients' ? 'var(--primary-navy)' : '#64748B',
                background: tab === 'clients' ? '#FFFFFF' : 'transparent',
                boxShadow: tab === 'clients' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.15s ease'
              }}
            >
              <Building2 size={14} style={{ color: tab === 'clients' ? 'var(--primary-navy)' : '#94A3B8' }} />
              <span>Client Partners</span>
            </button>

            <button
              type="button"
              onClick={() => handleTabChange('employees')}
              style={{
                padding: '0.45rem 0.85rem',
                fontSize: '0.82rem',
                fontWeight: tab === 'employees' ? '700' : '600',
                color: tab === 'employees' ? 'var(--primary-navy)' : '#64748B',
                background: tab === 'employees' ? '#FFFFFF' : 'transparent',
                boxShadow: tab === 'employees' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.15s ease'
              }}
            >
              <Users size={14} style={{ color: tab === 'employees' ? 'var(--primary-navy)' : '#94A3B8' }} />
              <span>Employees</span>
            </button>
          </div>

          {/* Filter Card */}
          <div className="card" style={{ padding: "1rem", marginBottom: "1.5rem", display: "flex", gap: "1rem", alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ fontSize: "0.85rem", fontWeight: "600", color: "var(--primary-navy)", display: "inline-flex", alignItems: "center", gap: "4px" }}>
              <Filter size={14} /> Search Users:
            </div>
            <div style={{ flex: "1", minWidth: "250px" }}>
              <input
                type="text"
                className="form-control"
                placeholder="Search by User Name or Email..."
                style={{ padding: "0.4rem 0.75rem" }}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyPress={handleKeyPress}
              />
            </div>
            <button
              className="btn btn-navy"
              style={{ padding: "0.4rem 1rem", display: 'inline-flex', alignItems: 'center', gap: '5px' }}
              onClick={handleSearch}
            >
              <Search size={14} /> Search
            </button>
          </div>

          {/* Table Card */}
          <div className="card">
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>User Account</th>
                    <th>Email Address</th>
                    <th>Role</th>
                    <th>Status</th>
                    {tab === 'employees' && <th>Client Partner</th>}
                    {tab === 'clients' && <th>Company</th>}
                    {tab === 'system' && <th>Assigned Scope / Access</th>}
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {usersList && usersList.length > 0 ? (
                    usersList.map((row) => (
                      <tr key={row.id}>
                        <td>
                          <div style={{ fontWeight: '600', color: 'var(--primary-navy)' }}>{row.name}</div>
                        </td>
                        <td style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: '#475569' }}>
                          {row.email}
                        </td>
                        <td>
                          <span className={`badge ${row.role === 'admin' ? 'badge-navy' : (row.role === 'manager' ? 'badge-info' : 'badge-secondary')}`}>
                            {row.role}
                          </span>
                        </td>
                        <td>
                          <span className={`badge badge-${row.status === 'active' ? 'success' : (row.status === 'locked' ? 'danger' : 'warning')}`}>
                            {row.status}
                          </span>
                        </td>
                        {tab === 'employees' && (
                          <td>{row.employee?.client?.company_name || '—'}</td>
                        )}
                        {tab === 'clients' && (
                          <td>{row.client?.company_name || '—'}</td>
                        )}
                        {tab === 'system' && (
                          <td>
                            {row.role === 'admin' ? (
                              <span className="badge badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                <CheckCircle2 size={12} /> Full System Admin Access
                              </span>
                            ) : row.role === 'manager' ? (
                              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.4rem' }}>
                                {(row.managed_clients || []).length > 0 ? (
                                  (row.managed_clients || []).map(c => (
                                    <span key={c.id} className="badge badge-info" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                      <Building2 size={12} /> {c.company_name}
                                    </span>
                                  ))
                                ) : (
                                  <span className="badge badge-warning" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                    <AlertTriangle size={12} /> No clients assigned
                                  </span>
                                )}
                              </div>
                            ) : (
                              '—'
                            )}
                          </td>
                        )}
                        <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'inline-flex', gap: '0.4rem', justifyContent: 'flex-end', alignItems: 'center' }}>
                            {row.status === 'invited' && (
                              <button
                                type="button"
                                className="btn btn-secondary btn-xs"
                                disabled={resendingUserId === row.id}
                                onClick={() => handleResendInvite(row)}
                                title="Resend invitation email"
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                              >
                                <RotateCw size={11} className={resendingUserId === row.id ? 'spin' : ''} />
                                {resendingUserId === row.id ? 'Sending...' : 'Resend Invite'}
                              </button>
                            )}

                            {tab === 'system' && row.role === 'manager' && (
                              <>
                                <button
                                  type="button"
                                  className="btn btn-secondary btn-xs"
                                  onClick={() => openManagerEditModal(row)}
                                  style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                                >
                                  <Edit2 size={11} /> Edit Scope
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-navy btn-xs"
                                  onClick={() => openPermissionsModal(row)}
                                  style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                                >
                                  <Shield size={11} /> Module Permissions
                                </button>
                              </>
                            )}

                            <button
                              type="button"
                              className="btn btn-danger btn-xs"
                              disabled={row.id === currentUserId}
                              onClick={() => setDeletingUser(row)}
                              title={row.id === currentUserId ? "Cannot delete your logged-in account" : "Delete user account"}
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', opacity: row.id === currentUserId ? 0.5 : 1 }}
                            >
                              <Trash2 size={11} /> Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={tab === 'system' ? 6 : 5} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                        No user records found matching the search criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Container */}
            <div className="pagination-container">
              <div className="pagination-info">
                Showing <strong>{users.from || 0}</strong> to <strong>{users.to || 0}</strong> of <strong>{users.total || 0}</strong> user accounts
              </div>
              <ul className="pagination">
                {users.links?.map((link, idx) => (
                  <li key={idx} className={`page-item ${link.active ? 'active' : ''} ${!link.url ? 'disabled' : ''}`}>
                    <button
                      type="button"
                      className="page-link"
                      onClick={() => {
                        if (link.url) {
                          const urlObj = new URL(link.url);
                          const pageVal = urlObj.searchParams.get('page');
                          router.get(route('admin.users'), { tab, search, page: pageVal }, { preserveState: true, preserveScroll: true });
                        }
                      }}
                      dangerouslySetInnerHTML={{ __html: link.label }}
                    ></button>
                  </li>
                ))}
              </ul>
            </div>

          </div>

        </div>

        {/* Invite User Modal */}
        <Modal isOpen={showInviteModal} onClose={() => setShowInviteModal(false)} title="Invite New User">
          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Name</label>
              <input className="form-control" value={data.name} onChange={e => setData('name', e.target.value)} required />
              {errors.name && <div style={{ color: '#dc2626', fontSize: '0.75rem', marginTop: '2px' }}>{errors.name}</div>}
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Email</label>
              <input type="email" className="form-control" value={data.email} onChange={e => setData('email', e.target.value)} required />
              {errors.email && <div style={{ color: '#dc2626', fontSize: '0.75rem', marginTop: '2px' }}>{errors.email}</div>}
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Role</label>
              <select className="form-control" value={data.role} onChange={e => setData('role', e.target.value)}>
                <option value="employee">Employee</option>
                <option value="client">Client Partner</option>
                <option value="manager">Manager</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            {data.role === 'employee' && (
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Link to Employee Profile *</label>
                <select className="form-control" value={data.employee_id} onChange={e => setData('employee_id', e.target.value)} required>
                  <option value="">-- Select Employee --</option>
                  {unlinkedEmployees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.full_name} ({emp.code})</option>
                  ))}
                </select>
              </div>
            )}

            {data.role === 'client' && (
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Link to Client Company *</label>
                <select className="form-control" value={data.client_id} onChange={e => setData('client_id', e.target.value)} required>
                  <option value="">-- Select Client --</option>
                  {unlinkedClients.map(c => (
                    <option key={c.id} value={c.id}>{c.company_name}</option>
                  ))}
                </select>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setShowInviteModal(false)}>Cancel</button>
              <button type="submit" className="btn btn-navy" disabled={processing}>Submit Invitation</button>
            </div>
          </form>
        </Modal>

        {/* Manager Scope Edit Modal */}
        <Modal 
          isOpen={!!editingManager} 
          onClose={() => { setEditingManager(null); setScopeSearchQuery(''); }} 
          title={`Edit Client Scope: ${editingManager?.name || ''}`}
        >
          <form onSubmit={handleSaveManagerClients} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
              <p style={{ fontSize: '0.85rem', color: '#64748B', margin: 0 }}>
                Select client partners authorized for <strong>{editingManager?.name}</strong>:
              </p>
              <span style={{ fontSize: '0.78rem', fontWeight: 700, padding: '0.2rem 0.6rem', borderRadius: '12px', backgroundColor: '#EFF6FF', color: '#1E40AF', border: '1px solid #BFDBFE' }}>
                Assigned: {editClientIds.length} of {allClients.length} clients
              </span>
            </div>

            {/* Live Search Input Bar */}
            <div style={{ position: 'relative', width: '100%' }}>
              <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
              <input
                type="text"
                placeholder="Search 1,000+ clients by name, code, or GSTIN..."
                value={scopeSearchQuery}
                onChange={(e) => setScopeSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  paddingLeft: '34px',
                  paddingRight: scopeSearchQuery ? '32px' : '12px',
                  paddingTop: '8px',
                  paddingBottom: '8px',
                  fontSize: '0.85rem',
                  border: '1px solid #CBD5E1',
                  borderRadius: '6px',
                  outline: 'none',
                  backgroundColor: '#F8FAFC'
                }}
              />
              {scopeSearchQuery && (
                <button
                  type="button"
                  onClick={() => setScopeSearchQuery('')}
                  style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'none', color: '#94A3B8', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem' }}
                >
                  ✕
                </button>
              )}
            </div>

            {/* Quick Action Buttons */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.78rem' }}>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => {
                    const filteredIds = allClients
                      .filter(c => {
                        if (!scopeSearchQuery.trim()) return true;
                        const q = scopeSearchQuery.toLowerCase().trim();
                        return (c.company_name && c.company_name.toLowerCase().includes(q)) ||
                               (c.client_code && c.client_code.toLowerCase().includes(q)) ||
                               (c.gstin && c.gstin.toLowerCase().includes(q));
                      })
                      .map(c => c.id);
                    setEditClientIds(Array.from(new Set([...editClientIds, ...filteredIds])));
                  }}
                  style={{ border: 'none', background: 'none', color: '#2563EB', fontWeight: 600, cursor: 'pointer', padding: 0 }}
                >
                  Select {scopeSearchQuery ? 'Matching' : 'All'}
                </button>
                <span style={{ color: '#CBD5E1' }}>|</span>
                <button
                  type="button"
                  onClick={() => {
                    const filteredIds = new Set(
                      allClients
                        .filter(c => {
                          if (!scopeSearchQuery.trim()) return true;
                          const q = scopeSearchQuery.toLowerCase().trim();
                          return (c.company_name && c.company_name.toLowerCase().includes(q)) ||
                                 (c.client_code && c.client_code.toLowerCase().includes(q)) ||
                                 (c.gstin && c.gstin.toLowerCase().includes(q));
                        })
                        .map(c => c.id)
                    );
                    setEditClientIds(editClientIds.filter(id => !filteredIds.has(id)));
                  }}
                  style={{ border: 'none', background: 'none', color: '#DC2626', fontWeight: 600, cursor: 'pointer', padding: 0 }}
                >
                  Deselect {scopeSearchQuery ? 'Matching' : 'All'}
                </button>
              </div>

              <span style={{ color: '#64748B' }}>
                Showing {
                  allClients.filter(c => {
                    if (!scopeSearchQuery.trim()) return true;
                    const q = scopeSearchQuery.toLowerCase().trim();
                    return (c.company_name && c.company_name.toLowerCase().includes(q)) ||
                           (c.client_code && c.client_code.toLowerCase().includes(q)) ||
                           (c.gstin && c.gstin.toLowerCase().includes(q));
                  }).length
                } clients
              </span>
            </div>

            {/* Checkboxes List */}
            <div style={{ maxHeight: '280px', overflowY: 'auto', border: '1px solid #E2E8F0', borderRadius: '8px', backgroundColor: '#FFFFFF' }}>
              {(() => {
                const filtered = allClients.filter(c => {
                  if (!scopeSearchQuery.trim()) return true;
                  const q = scopeSearchQuery.toLowerCase().trim();
                  return (c.company_name && c.company_name.toLowerCase().includes(q)) ||
                         (c.client_code && c.client_code.toLowerCase().includes(q)) ||
                         (c.gstin && c.gstin.toLowerCase().includes(q));
                });

                if (filtered.length === 0) {
                  return (
                    <div style={{ textAlign: 'center', padding: '2rem 1rem', color: '#64748B', fontSize: '0.85rem' }}>
                      No client partners found matching "<strong>{scopeSearchQuery}</strong>"
                    </div>
                  );
                }

                return filtered.map(client => {
                  const isChecked = editClientIds.includes(client.id);
                  return (
                    <label 
                      key={client.id} 
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'space-between',
                        padding: '0.5rem 0.75rem', 
                        cursor: 'pointer',
                        backgroundColor: isChecked ? '#EFF6FF' : 'transparent',
                        borderBottom: '1px solid #F1F5F9',
                        transition: 'background-color 0.15s ease'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            if (isChecked) {
                              setEditClientIds(editClientIds.filter(id => id !== client.id));
                            } else {
                              setEditClientIds([...editClientIds, client.id]);
                            }
                          }}
                          style={{ width: '16px', height: '16px', accentColor: '#1F3864' }}
                        />
                        <span style={{ fontSize: '0.88rem', fontWeight: 600, color: '#1E293B' }}>
                          {client.company_name}
                        </span>
                      </div>
                      {client.client_code && (
                        <span style={{ fontSize: '0.75rem', fontFamily: 'monospace', padding: '0.15rem 0.4rem', backgroundColor: isChecked ? '#DBEAFE' : '#F1F5F9', color: isChecked ? '#1E40AF' : '#475569', borderRadius: '4px', fontWeight: 600 }}>
                          {client.client_code}
                        </span>
                      )}
                    </label>
                  );
                });
              })()}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={() => { setEditingManager(null); setScopeSearchQuery(''); }}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-navy">Save Scope</button>
            </div>
          </form>
        </Modal>

        {/* Module Permissions Modal */}
        <Modal 
          isOpen={!!editingPermissionsUser} 
          onClose={() => setEditingPermissionsUser(null)}
          title={`Custom Module Permissions — ${editingPermissionsUser?.name}`}
          size="xl"
        >
          {editingPermissionsUser && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F8FAFC', padding: '0.6rem 0.85rem', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
                <span style={{ fontSize: '0.82rem', color: '#475569' }}>
                  Select top-level module tabs & sub-features authorized for <strong>{editingPermissionsUser.name}</strong>:
                </span>
                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#1E3A8A', backgroundColor: '#EFF6FF', padding: '0.2rem 0.5rem', borderRadius: '4px', border: '1px solid #BFDBFE' }}>
                  {selectedPermissions.length} / {getAllModuleKeys().length} Selected
                </span>
              </div>

              {/* 2-Column Grid Layout — No Vertical Scrollbar */}
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(2, 1fr)', 
                gap: '0.6rem'
              }}>
                {AVAILABLE_MODULES.map(mod => {
                  const isChecked = selectedPermissions.includes(mod.key);
                  const hasChildren = mod.children && mod.children.length > 0;

                  return (
                    <div 
                      key={mod.key}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        border: '1px solid ' + (isChecked ? '#93C5FD' : '#E2E8F0'),
                        borderRadius: '6px',
                        backgroundColor: isChecked ? '#F0F7FF' : '#FFFFFF',
                        padding: '0.55rem 0.75rem',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <label 
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          cursor: 'pointer',
                          marginBottom: hasChildren && isChecked ? '0.4rem' : 0
                        }}
                      >
                        <input 
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => togglePermission(mod.key)}
                          style={{ width: '15px', height: '15px', accentColor: '#1F3864' }}
                        />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '0.84rem', fontWeight: 700, color: isChecked ? '#1E3A8A' : '#1E293B', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span>{mod.label}</span>
                            {hasChildren && (
                              <span style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: 500 }}>
                                {mod.children.filter(c => selectedPermissions.includes(c.key)).length} / {mod.children.length}
                              </span>
                            )}
                          </div>
                        </div>
                      </label>

                      {/* Sub-module Granular Checkboxes */}
                      {hasChildren && isChecked && (
                        <div style={{ 
                          paddingTop: '0.4rem', 
                          marginTop: '0.2rem',
                          borderTop: '1px dashed #BFDBFE',
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: '0.3rem'
                        }}>
                          {mod.children.map(child => {
                            const isChildChecked = selectedPermissions.includes(child.key);
                            return (
                              <label 
                                key={child.key}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  fontSize: '0.74rem',
                                  fontWeight: isChildChecked ? 700 : 500,
                                  color: isChildChecked ? '#1E40AF' : '#475569',
                                  backgroundColor: isChildChecked ? '#DBEAFE' : '#F8FAFC',
                                  padding: '0.2rem 0.45rem',
                                  borderRadius: '4px',
                                  border: '1px solid ' + (isChildChecked ? '#93C5FD' : '#E2E8F0'),
                                  cursor: 'pointer',
                                  userSelect: 'none'
                                }}
                              >
                                <input 
                                  type="checkbox"
                                  checked={isChildChecked}
                                  onChange={() => togglePermission(child.key, mod.key)}
                                  style={{ width: '13px', height: '13px', accentColor: '#1E40AF' }}
                                />
                                <span>{child.label}</span>
                              </label>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Modal Footer Controls */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.6rem', borderTop: '1px solid #E2E8F0', marginTop: '0.25rem' }}>
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  <button
                    type="button"
                    className="btn btn-secondary btn-xs"
                    onClick={() => setSelectedPermissions(getAllModuleKeys())}
                  >
                    Select All
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary btn-xs"
                    onClick={() => setSelectedPermissions([])}
                  >
                    Clear All
                  </button>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button 
                    type="button" 
                    className="btn btn-secondary" 
                    onClick={() => setEditingPermissionsUser(null)}
                  >
                    Cancel
                  </button>
                  <button 
                    type="button" 
                    className="btn btn-navy"
                    onClick={handleSavePermissions}
                  >
                    Save Module Permissions
                  </button>
                </div>
              </div>
            </div>
          )}
        </Modal>

        {/* Delete Account Confirmation Modal */}
        <ConfirmDialog
          isOpen={!!deletingUser}
          title="Delete User Account"
          message={`Are you sure you want to delete ${deletingUser?.name || 'this user'} (${deletingUser?.email || ''})? This action cannot be undone.`}
          onClose={() => setDeletingUser(null)}
          onConfirm={handleDeleteUser}
          confirmLabel="Delete Account"
          cancelLabel="Cancel"
          variant="danger"
        />

      </AuthenticatedLayout>
    </RoleGuard>
  );
}
