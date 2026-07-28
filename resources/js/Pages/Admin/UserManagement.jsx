import { Head, useForm, router } from '@inertiajs/react';
import { useState } from 'react';
import AuthenticatedLayout from '../../Layouts/AuthenticatedLayout';
import Card from '../../Components/ui/Card';
import Button from '../../Components/ui/Button';
import Input from '../../Components/ui/Input';
import Select from '../../Components/ui/Select';
import DataTable from '../../Components/ui/DataTable';
import Modal from '../../Components/ui/Modal';
import Pagination from '../../Components/ui/Pagination';
import { Building2, Shield, UserCheck, Plus, Edit2, CheckCircle2 } from 'lucide-react';

export default function UserManagement({ users, unlinkedEmployees = [], unlinkedClients = [], allClients = [], filters = {} }) {
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [editingManager, setEditingManager] = useState(null);
  const [editClientIds, setEditClientIds] = useState([]);

  const { tab = 'system', search = '' } = filters;
  const [searchQuery, setSearchQuery] = useState(search);

  const handleTabChange = (newTab) => {
    router.get(route('admin.users'), { tab: newTab, search: searchQuery }, { preserveState: true, preserveScroll: true });
  };

  const handleSearch = (e) => {
    if (e.key === 'Enter' || e.type === 'click') {
      router.get(route('admin.users'), { tab, search: searchQuery }, { preserveState: true, preserveScroll: true });
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
    const existingIds = (user.managed_clients || []).map(c => c.id);
    setEditClientIds(existingIds);
  };

  const columns = [
    { label: 'Name', key: 'name', render: (_, row) => <span className="font-bold text-slate-900">{row.name}</span> },
    { label: 'Email', key: 'email', render: (_, row) => <span className="font-mono text-xs text-slate-600">{row.email}</span> },
    { label: 'Role', key: 'role', render: (_, row) => (
      <span className="capitalize font-semibold text-xs px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
        {row.role}
      </span>
    )},
    { label: 'Status', key: 'status', render: (_, row) => (
      <span className={`px-2 py-0.5 rounded text-xs font-bold ${
        row.status === 'active' ? 'bg-emerald-100 text-emerald-800' : row.status === 'locked' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'
      }`}>
        {row.status}
      </span>
    )}
  ];

  if (tab === 'employees') {
    columns.push({ 
      label: 'Client Partner', 
      key: 'client', 
      render: (_, row) => row.employee?.client?.company_name || '-'
    });
  } else if (tab === 'clients') {
    columns.push({ 
      label: 'Company', 
      key: 'company', 
      render: (_, row) => row.client?.company_name || '-'
    });
  } else {
    // For System Staff tab (Admins & Managers)
    columns.push({ 
      label: 'Assigned Clients / Scope', 
      key: 'scope', 
      render: (_, row) => {
        if (row.role === 'admin') {
          return <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">🌐 Full System Admin Access (All Clients)</span>;
        }
        if (row.role === 'manager') {
          const managed = row.managed_clients || [];
          return (
            <div className="flex flex-wrap items-center gap-1.5">
              {managed.length > 0 ? (
                managed.map(c => (
                  <span key={c.id} className="text-[11px] font-bold text-indigo-800 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                    🏢 {c.company_name} ({c.client_code})
                  </span>
                ))
              ) : (
                <span className="text-xs text-amber-700 font-semibold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">⚠️ No clients assigned</span>
              )}
              <button
                type="button"
                onClick={() => openManagerEditModal(row)}
                className="text-[11px] font-bold text-indigo-600 hover:text-indigo-900 underline ml-1"
              >
                Edit Scope
              </button>
            </div>
          );
        }
        return '-';
      }
    });
  }

  return (
    <AuthenticatedLayout>
      <Head title="User Management" />
      
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 font-sans">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">User Management</h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">Manage user accounts, roles, and client-level access control.</p>
        </div>
        
        <Button variant="primary" onClick={() => setShowInviteModal(true)} className="flex items-center gap-1.5">
          <Plus className="w-4 h-4" /> Invite User
        </Button>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4 border-b border-slate-200 pb-4 font-sans">
        <div className="flex space-x-6">
          <button 
            className={`pb-4 px-2 -mb-[17px] font-bold text-xs transition-colors ${tab === 'system' ? 'border-b-2 border-indigo-600 text-indigo-700' : 'text-slate-500 hover:text-slate-700'}`}
            onClick={() => handleTabChange('system')}
          >
            System Staff (Admins & Managers)
          </button>
          <button 
            className={`pb-4 px-2 -mb-[17px] font-bold text-xs transition-colors ${tab === 'clients' ? 'border-b-2 border-indigo-600 text-indigo-700' : 'text-slate-500 hover:text-slate-700'}`}
            onClick={() => handleTabChange('clients')}
          >
            Client Partners
          </button>
          <button 
            className={`pb-4 px-2 -mb-[17px] font-bold text-xs transition-colors ${tab === 'employees' ? 'border-b-2 border-indigo-600 text-indigo-700' : 'text-slate-500 hover:text-slate-700'}`}
            onClick={() => handleTabChange('employees')}
          >
            Employees
          </button>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center">
            <input 
              type="text" 
              placeholder="Search users..." 
              className="form-control rounded-r-none h-9 w-64 text-xs"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearch}
            />
            <Button variant="primary" className="rounded-l-none h-9 text-xs" onClick={handleSearch}>Search</Button>
          </div>
        </div>
      </div>

      <Card className="p-0 border border-slate-200 shadow-sm rounded-xl overflow-hidden font-sans">
        <DataTable columns={columns} data={users.data || []} />
        {users && users.total > 0 && (
          <div className="px-6 py-4 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-50/60 text-xs">
            <div className="text-slate-500 font-medium">
              Showing <strong>{users.from || 0}</strong> to <strong>{users.to || 0}</strong> of <strong>{users.total}</strong> users
            </div>
            <Pagination
              currentPage={users.current_page}
              totalPages={users.last_page}
              totalItems={users.total}
              itemsPerPage={users.per_page}
              onPageChange={(page) => {
                router.get(route('admin.users'), { tab, search, page }, { preserveState: true, preserveScroll: true });
              }}
            />
          </div>
        )}
      </Card>

      {/* Invite User Modal */}
      <Modal isOpen={showInviteModal} onClose={() => setShowInviteModal(false)} title="Invite New User">
        <form onSubmit={submit} className="font-sans space-y-4">
          <Input label="Name" name="name" value={data.name} onChange={e => setData('name', e.target.value)} error={errors.name} required />
          <Input label="Email" type="email" name="email" value={data.email} onChange={e => setData('email', e.target.value)} error={errors.email} required />
          
          <Select 
            label="Role" 
            name="role" 
            value={data.role} 
            onChange={e => setData('role', e.target.value)} 
            options={[
              { value: 'employee', label: 'Employee' },
              { value: 'client', label: 'Client Partner' },
              { value: 'manager', label: 'Manager' },
              { value: 'admin', label: 'Admin' }
            ]} 
          />

          {data.role === 'employee' && (
            <Select 
              label="Link to Employee Profile *"
              name="employee_id" 
              value={data.employee_id} 
              onChange={e => setData('employee_id', e.target.value)} 
              error={errors.employee_id} 
              required
              options={[
                { value: '', label: '-- Select Employee --' },
                ...unlinkedEmployees.map(emp => ({ value: emp.id, label: `${emp.full_name} (${emp.code})` }))
              ]}
            />
          )}

          {data.role === 'client' && (
            <Select 
              label="Link to Client Profile *"
              name="client_id" 
              value={data.client_id} 
              onChange={e => setData('client_id', e.target.value)} 
              error={errors.client_id} 
              required
              options={[
                { value: '', label: '-- Select Client --' },
                ...unlinkedClients.map(client => ({ value: client.id, label: `${client.company_name} (${client.code})` }))
              ]}
            />
          )}

          {data.role === 'manager' && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-indigo-600" /> Assign Managed Clients for this Manager:
              </label>
              <p className="text-[11px] text-slate-500 font-medium mb-2">
                Select specific client partners. This manager will only see workforce, attendance, and payroll data for these selected clients upon login.
              </p>

              <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                {allClients.map(c => {
                  const isChecked = (data.assigned_client_ids || []).includes(c.id);
                  return (
                    <label key={c.id} className={`flex items-center justify-between p-2 rounded-lg border text-xs font-semibold cursor-pointer transition-all ${
                      isChecked ? 'bg-indigo-50 border-indigo-300 text-indigo-950 font-bold' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}>
                      <div className="flex items-center gap-2">
                        <input 
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleClientToggle(c.id)}
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span>🏢 {c.company_name} ({c.code})</span>
                      </div>
                      {isChecked && <CheckCircle2 className="w-4 h-4 text-indigo-600" />}
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
            <Button type="button" variant="secondary" onClick={() => setShowInviteModal(false)}>Cancel</Button>
            <Button type="submit" variant="primary" disabled={processing}>{processing ? 'Sending...' : 'Send Invitation'}</Button>
          </div>
        </form>
      </Modal>

      {/* Edit Manager Scope Modal */}
      {editingManager && (
        <Modal isOpen={true} onClose={() => setEditingManager(null)} title={`Assign Clients for ${editingManager.name}`}>
          <form onSubmit={handleSaveManagerClients} className="font-sans space-y-4">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-indigo-600" /> Select Managed Clients for {editingManager.name}:
              </label>
              <p className="text-[11px] text-slate-500 font-medium mb-2">
                This manager will have strict access restricted ONLY to the selected clients across all dashboards and reports.
              </p>

              <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
                {allClients.map(c => {
                  const isChecked = editClientIds.includes(c.id);
                  return (
                    <label key={c.id} className={`flex items-center justify-between p-2 rounded-lg border text-xs font-semibold cursor-pointer transition-all ${
                      isChecked ? 'bg-indigo-50 border-indigo-300 text-indigo-950 font-bold' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}>
                      <div className="flex items-center gap-2">
                        <input 
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            if (isChecked) {
                              setEditClientIds(editClientIds.filter(id => id !== c.id));
                            } else {
                              setEditClientIds([...editClientIds, c.id]);
                            }
                          }}
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span>🏢 {c.company_name} ({c.code})</span>
                      </div>
                      {isChecked && <CheckCircle2 className="w-4 h-4 text-indigo-600" />}
                    </label>
                  );
                })}
              </div>
            </div>

            <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
              <Button type="button" variant="secondary" onClick={() => setEditingManager(null)}>Cancel</Button>
              <Button type="submit" variant="primary">Save Assigned Scope</Button>
            </div>
          </form>
        </Modal>
      )}
    </AuthenticatedLayout>
  );
}
