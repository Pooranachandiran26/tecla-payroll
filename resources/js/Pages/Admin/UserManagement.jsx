import { Head, useForm } from '@inertiajs/react';
import { useState } from 'react';
import AuthenticatedLayout from '../../Layouts/AuthenticatedLayout';
import Card from '../../Components/ui/Card';
import Button from '../../Components/ui/Button';
import Input from '../../Components/ui/Input';
import Select from '../../Components/ui/Select';
import DataTable from '../../Components/ui/DataTable';
import Modal from '../../Components/ui/Modal';

export default function UserManagement({ users, unlinkedEmployees = [], unlinkedClients = [] }) {
  const [showInviteModal, setShowInviteModal] = useState(false);

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
    )},
    { label: 'Linked Profile', key: 'profile', render: (_, row) => {
      if (row.role === 'employee' && row.employee) return row.employee.full_name;
      if (row.role === 'client' && row.client) return row.client.company_name;
      return '-';
    }}
  ];

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

      <Card>
        <DataTable columns={columns} data={users} />
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
