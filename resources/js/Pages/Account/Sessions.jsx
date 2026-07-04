import { Head, router } from '@inertiajs/react';
import AuthenticatedLayout from '../../Layouts/AuthenticatedLayout';
import Card from '../../Components/ui/Card';
import Button from '../../Components/ui/Button';

export default function OwnSessions({ sessions }) {
  const revokeSession = (id) => {
    if (confirm('Are you sure you want to log out this device?')) {
      router.delete(`/account/sessions/${id}`);
    }
  };

  return (
    <AuthenticatedLayout>
      <Head title="My Sessions" />
      
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>Device History</h1>
        <p style={{ color: 'var(--text-muted)' }}>Manage the devices that are currently logged into your account.</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {sessions.map(session => (
          <Card key={session.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: '600' }}>
                {session.browser} on {session.platform}
                {session.is_current_device && <span style={{ marginLeft: '0.5rem', padding: '0.1rem 0.4rem', background: '#dcfce7', color: '#166534', borderRadius: '4px', fontSize: '0.75rem' }}>Current Device</span>}
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                IP: {session.ip_address} • Last active: {session.last_active}
              </div>
            </div>
            
            {!session.is_current_device && (
              <Button variant="danger" onClick={() => revokeSession(session.id)}>
                Sign Out
              </Button>
            )}
          </Card>
        ))}
      </div>
    </AuthenticatedLayout>
  );
}
