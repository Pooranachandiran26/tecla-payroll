import { Head } from '@inertiajs/react';
import { useState } from 'react';
import AuthenticatedLayout from '../../Layouts/AuthenticatedLayout';
import Card from '../../Components/ui/Card';
import Badge from '../../Components/ui/Badge';
import Button from '../../Components/ui/Button';
import DataTable from '../../Components/ui/DataTable';
import Checkbox from '../../Components/ui/Checkbox';
import Modal from '../../Components/ui/Modal';
import Input from '../../Components/ui/Input';
import Select from '../../Components/ui/Select';
import useToast from '../../Hooks/useToast';
import { Plus } from 'lucide-react';

import RoleGuard from '../../Components/RoleGuard.jsx';
export default function UserManagement() {
  const { showToast } = useToast();
  const [modalOpen, setModalOpen] = useState(false);
  const [users, setUsers] = useState([
    { id: 1, name: 'Rajesh Kumar', empId: 'T-01', email: 'rajesh@tecla.in', role: 'Agency Admin', roleColor: 'success', scope: 'Full Operations & Margin', ip: 'Any IP (Cloud Access)', active: true },
    { id: 2, name: 'Sunita Verma', empId: 'T-05', email: 'sunita@tecla.in', role: 'Manager', roleColor: 'info', scope: 'Calculations (No Margin)', ip: '192.168.1.* (Office LAN)', active: true },
    { id: 3, name: 'Amit Khanna', empId: 'T-12', email: 'amit.k@tecla.in', role: 'Manager', roleColor: 'info', scope: 'Calculations (No Margin)', ip: '192.168.1.* (Office LAN)', active: false },
  ]);

  const toggleUser = (id, name) => {
    setUsers(users.map(u => u.id === id ? { ...u, active: !u.active } : u));
    showToast(`Status changed: Access configuration modified for ${name}.`);
  };

  const columns = [
    {
      key: 'name',
      label: 'Username / Profile',
      render: (val, row) => (
        <div>
          <strong>{val}</strong>
          <div className="text-xs text-gray-500">Emp ID: {row.empId}</div>
        </div>
      )
    },
    { key: 'email', label: 'Work Email Address' },
    {
      key: 'role',
      label: 'Role Assignment',
      render: (val, row) => <Badge variant={row.roleColor}>{val}</Badge>
    },
    { key: 'scope', label: 'Disbursement Scope' },
    { key: 'ip', label: 'Authorized IP Range', render: (val) => <span className="font-mono">{val}</span> },
    {
      key: 'active',
      label: 'Account Status',
      render: (val, row) => (
        <div className="flex items-center gap-2">
          <Checkbox checked={val} onChange={() => toggleUser(row.id, row.name)} noMargin />
          <span className={val ? 'text-sm' : 'text-sm text-red-600'}>{val ? 'Active' : 'Deactivated'}</span>
        </div>
      )
    },
    {
      key: 'actions',
      label: 'Actions',
      render: () => <Button variant="navy" size="xs">Edit Rules</Button>
    }
  ];

  return (
    <RoleGuard allowedRoles={['admin']}>
    <AuthenticatedLayout>
      <Head title="User Management" />
      
      <div className="flex justify-between items-end mb-6">
        <div>
          <h2 className="text-2xl font-bold">Internal User Directory</h2>
          <p className="text-gray-500 text-sm mt-1">Assign system roles, update access profiles, and manage system status locks.</p>
        </div>
        <Button variant="primary" onClick={() => setModalOpen(true)} icon={Plus}>Add System User</Button>
      </div>

      <Card noPadding>
        <DataTable columns={columns} data={users} keyField="id" />
      </Card>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Register New System User">
        <form onSubmit={e => { e.preventDefault(); showToast('System User registered successfully!'); setModalOpen(false); }}>
          <Input label="Full Name" required placeholder="e.g. Priyanjali Roy" />
          <Input label="Work Email" type="email" required placeholder="e.g. proy@tecla.in" />
          <div className="flex gap-4">
            <Select 
              label="System Role Scope" 
              className="flex-1"
              options={[
                { value: 'executive', label: 'Manager (Restricted Financial View)' },
                { value: 'admin', label: 'Agency Admin (Full Security View)' }
              ]} 
            />
          </div>
          <Input label="Allowed IP Addresses" placeholder="e.g. 192.168.1.*" value="192.168.1.*" onChange={() => {}} />
          <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-gray-200">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button variant="primary" type="submit">Create User Profile</Button>
          </div>
        </form>
      </Modal>
    </AuthenticatedLayout>
    </RoleGuard>
  );
}
