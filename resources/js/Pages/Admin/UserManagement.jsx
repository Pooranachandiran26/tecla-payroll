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

export default function UserManagement({ users, unlinkedEmployees = [], unlinkedClients = [], filters = {} }) {
  const [showInviteModal, setShowInviteModal] = useState(false);
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

  const columns = [
    { label: 'Name', key: 'name' },
    { label: 'Email', key: 'email' },
    { label: 'Role', key: 'role', render: (_, row) => <span style={{ textTransform: 'capitalize' }}>{row.role}</span> },
    { label: 'Status', key: 'status', render: (_, row) => (
      <span style={{ 
        padding: '0.25rem 0.5rem', 
        borderRadius: '4px', 
        fontSize: '0.75rem',
        backgroundColor: row.status === 'active' ? '#dcfce7' : row.status === 'locked' ? '#fee2e2' : '#fef3c7',
        color: row.status === 'active' ? '#166534' : row.status === 'locked' ? '#991b1b' : '#92400e'
      }}>
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
    // For system tab, show linked profile generic column just in case
    columns.push({ label: 'Linked Profile', key: 'profile', render: (_, row) => {
      if (row.role === 'employee' && row.employee) return row.employee.full_name;
      if (row.role === 'client' && row.client) return row.client.company_name;
      return '-';
    }});
  }

  return (
    <AuthenticatedLayout>
      <Head title="User Management" />
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>User Management</h1>
          <p style={{ color: 'var(--text-muted)' }}>Manage access, roles, and invitations.</p>
        </div>
        
        <Button variant="primary" onClick={() => setShowInviteModal(true)}>
          Invite User
        </Button>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4 border-b border-gray-200 pb-4">
        <div className="flex space-x-6">
          <button 
            className={`pb-4 px-2 -mb-[17px] font-semibold text-sm transition-colors ${tab === 'system' ? 'border-b-2 border-primary-navy text-primary-navy' : 'text-gray-500 hover:text-gray-700'}`}
            onClick={() => handleTabChange('system')}
          >
            System Staff
          </button>
          <button 
            className={`pb-4 px-2 -mb-[17px] font-semibold text-sm transition-colors ${tab === 'clients' ? 'border-b-2 border-primary-navy text-primary-navy' : 'text-gray-500 hover:text-gray-700'}`}
            onClick={() => handleTabChange('clients')}
          >
            Client Partners
          </button>
          <button 
            className={`pb-4 px-2 -mb-[17px] font-semibold text-sm transition-colors ${tab === 'employees' ? 'border-b-2 border-primary-navy text-primary-navy' : 'text-gray-500 hover:text-gray-700'}`}
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
              className="form-control rounded-r-none h-10 w-64"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearch}
            />
            <Button variant="primary" className="rounded-l-none h-10" onClick={handleSearch}>Search</Button>
          </div>
        </div>
      </div>

      <Card className="p-0">
        <DataTable columns={columns} data={users.data || []} />
        {users && users.total > 0 && (
          <div className="px-6 py-4 border-t border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="text-sm text-gray-500">
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

      <Modal isOpen={showInviteModal} onClose={() => setShowInviteModal(false)} title="Invite New User">
        <form onSubmit={submit}>
          <Input label="Name" name="name" value={data.name} onChange={e => setData('name', e.target.value)} error={errors.name} required />
          <Input label="Email" type="email" name="email" value={data.email} onChange={e => setData('email', e.target.value)} error={errors.email} required />
          
          <Select 
            label="Role" 
            name="role" 
            value={data.role} 
            onChange={e => setData('role', e.target.value)} 
            options={[
              { value: 'employee', label: 'Employee' },
              { value: 'client', label: 'Client' },
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

          <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
            <Button type="button" variant="secondary" onClick={() => setShowInviteModal(false)}>Cancel</Button>
            <Button type="submit" variant="primary" disabled={processing}>{processing ? 'Sending...' : 'Send Invitation'}</Button>
          </div>
        </form>
      </Modal>
    </AuthenticatedLayout>
  );
}
