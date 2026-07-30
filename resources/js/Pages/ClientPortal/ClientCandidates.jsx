import React, { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router } from '@inertiajs/react';
import RoleGuard from '../../Components/RoleGuard.jsx';
import Pagination from '../../Components/ui/Pagination';
import { Search, Building2 } from 'lucide-react';

export default function ClientCandidates({ client = {}, employees = {}, filters = {} }) {
  const [searchTerm, setSearchTerm] = useState(filters.search || '');
  const safeEmployees = employees.data || [];
  const safeClient = client || {};

  const handleSearch = () => {
    router.get(route('client.employees'), { search: searchTerm }, { preserveState: true, preserveScroll: true });
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <RoleGuard allowedRoles={['admin', 'manager', 'client']}>
      <AuthenticatedLayout>
        <Head title={safeClient.company_name ? `${safeClient.company_name} — Deployed Employees` : "Deployed Personnel"} />

        <div style={{ marginBottom: '1.5rem' }}>
          <div className="flex-row-between" style={{ marginTop: '0.5rem' }}>
            <div>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#1E293B', margin: 0 }}>
                Deployed Personnel Directory
              </h2>
              <p style={{ color: '#64748B', fontSize: '0.88rem', marginTop: '3px' }}>
                Active employee workforce currently deployed at <strong>{safeClient.company_name || 'your company'}</strong>.
              </p>
            </div>

            {safeClient.client_code && (
              <div style={{ fontSize: '0.85rem', backgroundColor: '#FFFFFF', padding: '0.45rem 0.9rem', borderRadius: '6px', border: '1px solid #CBD5E1', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Building2 size={16} color="#1E40AF" />
                <span>Code:</span>
                <span style={{ fontWeight: '700', color: '#1E40AF', fontFamily: 'monospace' }}>{safeClient.client_code}</span>
              </div>
            )}
          </div>
        </div>

        {/* Filters Toolbar */}
        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap', backgroundColor: '#FFFFFF', padding: '1rem', borderRadius: '8px', border: '1px solid #E2E8F0', alignItems: 'center' }}>
          <div style={{ flex: '1', minWidth: '240px', position: 'relative' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: '0.35rem', color: '#475569' }}>Search Employee</label>
            <div style={{ position: 'relative' }}>
              <Search size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
              <input
                type="text"
                placeholder="Search employee by name or code..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={handleKeyPress}
                style={{ width: '100%', paddingLeft: '32px', paddingRight: '12px', paddingTop: '6px', paddingBottom: '6px', fontSize: '0.85rem', border: '1px solid #CBD5E1', borderRadius: '6px' }}
              />
            </div>
          </div>

          <div style={{ marginTop: '1.25rem' }}>
            <button
              onClick={handleSearch}
              className="btn btn-navy"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '0.45rem 1rem' }}
            >
              <Search size={14} /> Search
            </button>
          </div>
        </div>

        {/* Employees Table Card */}
        <div className="card" style={{ backgroundColor: '#FFFFFF', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
          <div className="table-responsive">
            <table className="data-table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>Emp Code</th>
                  <th>Full Name</th>
                  <th>Designation</th>
                  <th>Gender</th>
                  <th>Joined Date</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {safeEmployees && safeEmployees.length > 0 ? (
                  safeEmployees.map((emp) => (
                    <tr key={emp.id}>
                      <td style={{ fontFamily: 'monospace', fontWeight: 600, fontSize: '0.82rem', color: '#1E40AF' }}>
                        {emp.employee_code}
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, color: '#1E293B' }}>
                          {emp.full_name || `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || '—'}
                        </div>
                        {emp.email && (
                          <div style={{ fontSize: '0.75rem', color: '#64748B', fontFamily: 'monospace' }}>
                            {emp.email}
                          </div>
                        )}
                      </td>
                      <td style={{ fontSize: '0.85rem', color: '#475569' }}>
                        {emp.designation || 'Staff'}
                      </td>
                      <td style={{ fontSize: '0.85rem', color: '#475569', textTransform: 'capitalize' }}>
                        {emp.gender || '—'}
                      </td>
                      <td style={{ fontSize: '0.82rem', color: '#475569' }}>
                        {emp.date_of_joining ? new Date(emp.date_of_joining).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                      </td>
                      <td>
                        <span className={`badge badge-${emp.status === 'active' ? 'success' : 'secondary'}`}>
                          {emp.status}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '2.5rem', color: '#64748B', fontSize: '0.88rem' }}>
                      No deployed employees found matching your search.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {employees && employees.total > 0 && (
            <div style={{ padding: '1rem 1.25rem', borderTop: '1px solid #F1F5F9', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ fontSize: '0.82rem', color: '#64748B' }}>
                Showing <strong>{employees.from || 0}</strong> to <strong>{employees.to || 0}</strong> of <strong>{employees.total}</strong> deployed personnel
              </div>
              <Pagination
                currentPage={employees.current_page}
                totalPages={employees.last_page}
                totalItems={employees.total}
                itemsPerPage={employees.per_page}
                onPageChange={(page) => {
                  const params = new URLSearchParams(window.location.search);
                  params.set('page', page);
                  window.location.search = params.toString();
                }}
              />
            </div>
          )}
        </div>
      </AuthenticatedLayout>
    </RoleGuard>
  );
}
