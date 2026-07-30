import React from 'react';
import { Head, Link, usePage } from '@inertiajs/react';
import AuthenticatedLayout from '../Layouts/AuthenticatedLayout';
import { ShieldAlert, ArrowLeft, Home } from 'lucide-react';

export default function Error({ status = 403, title, message }) {
  const { auth } = usePage().props;
  const userRole = auth?.user?.role || 'guest';

  const dashboardRoute = userRole === 'client'
    ? route('client.dashboard')
    : userRole === 'employee'
    ? route('employee.dashboard')
    : route('dashboard');

  const displayMessage = message || 'You do not have permission to access this module or page.';

  return (
    <AuthenticatedLayout hideSubNav={true}>
      <Head title="403 Access Forbidden" />

      <div style={{ maxWidth: '580px', margin: '3rem auto 0', padding: '0 1rem' }}>
        <div className="card" style={{ backgroundColor: '#FFFFFF', borderRadius: '8px', border: '1px solid #E2E8F0', padding: '2.5rem 2rem', textAlign: 'center' }}>
          
          <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: '#FEF2F2', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem' }}>
            <ShieldAlert size={30} color="#DC2626" />
          </div>

          <h2 style={{ fontSize: '1.35rem', fontWeight: 700, color: '#1F3864', margin: '0 0 0.5rem 0' }}>
            403 — Access Restricted
          </h2>

          <p style={{ color: '#334155', fontSize: '0.92rem', lineHeight: 1.5, margin: '0 0 1.5rem 0' }}>
            {displayMessage}
          </p>

          <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '6px', padding: '0.75rem 1rem', marginBottom: '1.75rem', fontSize: '0.85rem', color: '#475569', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>User: <strong style={{ color: '#0F172A' }}>{auth?.user?.name || 'User'}</strong></span>
            <span style={{ textTransform: 'capitalize', fontWeight: 600, color: '#1F3864' }}>Role: {userRole}</span>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
            <button
              onClick={() => window.history.back()}
              className="btn"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: '#F1F5F9', border: '1px solid #CBD5E1', color: '#334155', padding: '0.5rem 1.25rem', fontSize: '0.85rem', fontWeight: 600, borderRadius: '6px', cursor: 'pointer' }}
            >
              <ArrowLeft size={15} /> Go Back
            </button>

            <Link
              href={dashboardRoute}
              className="btn btn-navy"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '0.5rem 1.25rem', fontSize: '0.85rem', fontWeight: 600, borderRadius: '6px' }}
            >
              <Home size={15} /> Return to Dashboard
            </Link>
          </div>

        </div>
      </div>
    </AuthenticatedLayout>
  );
}
