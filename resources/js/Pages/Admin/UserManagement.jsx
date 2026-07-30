import { Head, useForm, router } from '@inertiajs/react';
import { useState } from 'react';
import AuthenticatedLayout from '../../Layouts/AuthenticatedLayout';
import RoleGuard from '../../Components/RoleGuard.jsx';
import Modal from '../../Components/ui/Modal';
import { 
    UserPlus, 
    Search, 
    Filter, 
    Shield, 
    Building2, 
    Users, 
    Edit2, 
    CheckCircle2, 
    AlertTriangle 
} from 'lucide-react';

export default function UserManagement({ users = {}, unlinkedEmployees = [], unlinkedClients = [], allClients = [], filters = {} }) {
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [editingManager, setEditingManager] = useState(null);
  const [editClientIds, setEditClientIds] = useState([]);
  const [scopeSearchQuery, setScopeSearchQuery] = useState('');

  const [editingPermissionsUser, setEditingPermissionsUser] = useState(null);
  const [selectedPermissions, setSelectedPermissions] = useState([]);

  const AVAILABLE_MODULES = [
    { key: 'dashboard', label: 'Dashboard Overview', desc: 'Main executive dashboard metrics & pending queues' },
    { key: 'quick-access', label: 'Quick Access Navigation', desc: 'Quick launcher shortcuts' },
    { key: 'clients', label: 'Clients Directory', desc: 'Client profiles, branch locations, and statutory setups' },
    { key: 'candidates', label: 'Employees Directory', desc: 'Employee master data, bulk upload & salary revisions' },
    { key: 'payroll', label: 'Payroll & Invoicing', desc: 'Attendance review, payroll processing, approvals, payslips & invoices' },
    { key: 'compliance', label: 'Compliance Reports', desc: 'PF, ESI, LWF, PT & Statutory tax reports' },
    { key: 'reports', label: 'Analytics Reports', desc: 'Executive payroll analytics & export reports' },
    { key: 'admin', label: 'Admin System Control', desc: 'Activity logs, user management, sessions, templates' },
  ];

  const openPermissionsModal = (user) => {
    setEditingPermissionsUser(user);
    const existing = user.module_permissions || [];
    setSelectedPermissions(existing.length > 0 ? existing : AVAILABLE_MODULES.map(m => m.key));
  };

  const togglePermission = (moduleKey) => {
    setSelectedPermissions(prev => 
      prev.includes(moduleKey) ? prev.filter(k => k !== moduleKey) : [...prev, moduleKey]
    );
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
                    {tab === 'system' && <th style={{ textAlign: 'right' }}>Actions</th>}
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
                        {tab === 'system' && (
                          <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                            {row.role === 'manager' ? (
                              <div style={{ display: 'inline-flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
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
                              </div>
                            ) : (
                              '—'
                            )}
                          </td>
                        )}
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
        >
          {editingPermissionsUser && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <p style={{ fontSize: '0.85rem', color: '#64748B', margin: 0 }}>
                Select which top-level module tabs <strong>{editingPermissionsUser.name}</strong> is authorized to access:
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', maxHeight: '340px', overflowY: 'auto', paddingRight: '0.25rem' }}>
                {AVAILABLE_MODULES.map(mod => {
                  const isChecked = selectedPermissions.includes(mod.key);
                  return (
                    <label 
                      key={mod.key}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '0.75rem',
                        padding: '0.75rem',
                        border: '1px solid ' + (isChecked ? '#93C5FD' : '#E2E8F0'),
                        borderRadius: '8px',
                        backgroundColor: isChecked ? '#EFF6FF' : '#F8FAFC',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <input 
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => togglePermission(mod.key)}
                        style={{ marginTop: '3px', width: '16px', height: '16px' }}
                      />
                      <div>
                        <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#1E293B' }}>
                          {mod.label}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: '#64748B', marginTop: '1px' }}>
                          {mod.desc}
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.75rem', borderTop: '1px solid #E2E8F0' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-xs"
                  onClick={() => setSelectedPermissions(AVAILABLE_MODULES.map(m => m.key))}
                >
                  Select All Modules
                </button>

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

      </AuthenticatedLayout>
    </RoleGuard>
  );
}
