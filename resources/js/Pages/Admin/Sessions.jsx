import { Head, router } from '@inertiajs/react';
import { useState } from 'react';
import AuthenticatedLayout from '../../Layouts/AuthenticatedLayout';
import Card from '../../Components/ui/Card';
import Button from '../../Components/ui/Button';
import Checkbox from '../../Components/ui/Checkbox';
import DataTable from '../../Components/ui/DataTable';

export default function AdminSessions({ sessions }) {
  const [selected, setSelected] = useState([]);

  const revokeSelected = () => {
    if (selected.length === 0) return;
    if (confirm(`Are you sure you want to revoke ${selected.length} session(s)?`)) {
      router.post('/admin/sessions/bulk-revoke', { ids: selected }, {
        onSuccess: () => setSelected([])
      });
    }
  };

  const columns = [
    { 
      label: <Checkbox checked={selected.length === sessions.length && sessions.length > 0} onChange={e => setSelected(e.target.checked ? sessions.map(s => s.id) : [])} />, 
      key: 'select',
      render: (_, row) => <Checkbox checked={selected.includes(row.id)} onChange={e => {
        if (e.target.checked) setSelected([...selected, row.id]);
        else setSelected(selected.filter(id => id !== row.id));
      }} />
    },
    { label: 'User', key: 'name', render: (_, row) => <div><div>{row.name}</div><div style={{fontSize: '0.8rem', color: 'var(--text-muted)'}}>{row.email}</div></div> },
    { label: 'IP Address', key: 'ip_address' },
    { label: 'Device', key: 'browser', render: (_, row) => `${row.browser} on ${row.platform}` },
    { label: 'Last Active', key: 'last_active' },
    { 
      label: 'Actions', 
      key: 'actions',
      render: (_, row) => (
        <Button variant="danger" onClick={() => router.delete(`/admin/sessions/${row.id}`, { onBefore: () => confirm('Revoke this session?') })}>
          Revoke
        </Button>
      )
    }
  ];

  return (
    <AuthenticatedLayout>
      <Head title="Active Sessions" />
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>All Active Sessions</h1>
          <p style={{ color: 'var(--text-muted)' }}>Monitor and manage active user sessions across the system.</p>
        </div>
        
        {selected.length > 0 && (
          <Button variant="danger" onClick={revokeSelected}>
            Revoke {selected.length} Selected
          </Button>
        )}
      </div>

      <Card>
        <DataTable columns={columns} data={sessions} />
      </Card>
    </AuthenticatedLayout>
  );
}
