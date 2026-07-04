import { Head, useForm } from '@inertiajs/react';
import { useState } from 'react';
import AuthenticatedLayout from '../../Layouts/AuthenticatedLayout';
import Card from '../../Components/ui/Card';
import Button from '../../Components/ui/Button';
import Input from '../../Components/ui/Input';
import Select from '../../Components/ui/Select';
import DataTable from '../../Components/ui/DataTable';
import Modal from '../../Components/ui/Modal';

export default function UserManagement({ users }) {
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
    post('/admin/users', {
      onSuccess: () => {
        setShowInviteModal(false);
        reset();
      }
    });
  };

  const columns = [
    { header: 'Name', accessor: 'name' },
    { header: 'Email', accessor: 'email' },
    { header: 'Role', accessor: 'role', render: (row) => <span style={{ textTransform: 'capitalize' }}>{row.role}</span> },
    { header: 'Status', accessor: 'status', render: (row) => (
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
    { header: 'Linked Profile', accessor: 'profile', render: (row) => {
      if (row.role === 'employee' && row.employee) return `${row.employee.first_name} ${row.employee.last_name}`;
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
            <Input label="Employee ID (Internal)" name="employee_id" type="text" value={data.employee_id} onChange={e => setData('employee_id', e.target.value)} error={errors.employee_id} required />
          )}

          {data.role === 'client' && (
            <Input label="Client ID (Internal)" name="client_id" type="text" value={data.client_id} onChange={e => setData('client_id', e.target.value)} error={errors.client_id} required />
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
