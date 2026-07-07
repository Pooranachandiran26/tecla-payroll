import React, { useEffect } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';
import './EmployeesList.css';

import RoleGuard from '../../Components/RoleGuard.jsx';
export default function EmployeesList({ employees = { data: [], links: [] }, clients = [], filters = {} }) {
    useEffect(() => {
        // Load the legacy logic dynamically so it runs on client side after render
        import('./EmployeesListLogic.js').then(module => {
            console.log('Legacy logic loaded for EmployeesList');
        }).catch(err => console.error('Error loading legacy logic', err));
        
        return () => {
            // Cleanup logic if needed
        };
    }, []);

    return (
        <RoleGuard allowedRoles={['admin', 'manager']}>
    <AuthenticatedLayout>
            <Head title="Employees List" />
            <div className="legacy-react-wrapper">
                
      <div className="flex-row-between">
        <div>
          <h2>Employees Directory</h2>
          <p style={{"color":"var(--text-muted)","fontSize":"0.9rem"}}>Manage agency personnel, statutory rules, salary revisions, and leave balances.</p>
        </div>
        <div style={{"display":"flex","gap":"0.75rem"}}>
          <a href="candidates-bulk-upload.html" className="btn btn-secondary">📥 Bulk Upload Employees</a>
          <a href="/employees/create" className="btn btn-primary">➕ Add New Employee</a>
        </div>
      </div>

      {/*  Filters Row  */}
      <div className="card" style={{"padding":"1rem","marginBottom":"1.5rem","display":"flex","gap":"1rem","alignItems":"center","flexWrap":"wrap"}}>
        <div style={{"fontSize":"0.85rem","fontWeight":"600","color":"var(--primary-navy)"}}>Filters:</div>
        <div style={{"flex":"1","minWidth":"200px"}}>
          <input type="text" className="form-control" placeholder="Search by Employee Code, Name or UAN..." style={{"padding":"0.4rem 0.75rem"}} defaultValue={filters.search} />
        </div>
        <div>
          <select className="form-control" style={{"padding":"0.4rem 0.75rem"}} title="Select Client" defaultValue={filters.client_id}>
            <option value="">All Clients</option>
            {clients && clients.map(c => (
               <option key={c.id} value={c.id}>{c.company_name}</option>
            ))}
          </select>
        </div>
        <div>
          <select className="form-control" style={{"padding":"0.4rem 0.75rem"}} title="Select Employment Type" defaultValue={filters.employment_model}>
            <option value="">All Employment Types</option>
            <option value="agency_contract">Agency Contract</option>
            <option value="eor">Pass-through EOR</option>
            <option value="internal">Internal Staff</option>
          </select>
        </div>
        <div>
          <select className="form-control" style={{"padding":"0.4rem 0.75rem"}} title="Select Status" defaultValue={filters.status}>
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="exited">Exited</option>
            <option value="onboarding">Onboarding</option>
          </select>
        </div>
        <button className="btn btn-navy" style={{"padding":"0.4rem 1rem"}}>Apply</button>
      </div>

      {/*  Table Card  */}
      <div className="card">
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Emp Code</th>
                <th>Employee Name</th>
                <th>Client Partner</th>
                <th>Role Designation</th>
                <th>Employment Type</th>
                <th>Date of Joining</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {employees.data && employees.data.length > 0 ? (
                employees.data.map(emp => (
                  <tr key={emp.id}>
                    <td>{emp.employee_code}</td>
                    <td>
                      <Link href={`/employees/${emp.id}`} style={{"fontWeight":"600","color":"var(--primary-navy)"}}>{emp.full_name}</Link>
                      <div style={{"fontSize":"0.75rem","color":"var(--text-muted)"}}>UAN: {emp.uan_number || 'Pending'}</div>
                    </td>
                    <td>{emp.client_name || 'No Client'}</td>
                    <td>{emp.designation}</td>
                    <td>
                      <span className={`badge ${emp.employment_model === 'eor' ? 'badge-info' : 'badge-success'}`}>
                        {emp.employment_model === 'eor' ? 'Pass-through EOR' : 'Agency Contract'}
                      </span>
                    </td>
                    <td>{emp.date_of_joining ? new Date(emp.date_of_joining).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' }) : ''}</td>
                    <td>
                      <span className={`badge badge-${emp.status === 'active' ? 'success' : emp.status === 'exited' ? 'danger' : 'warning'}`}>
                        {emp.status ? (emp.status.charAt(0).toUpperCase() + emp.status.slice(1)) : 'Unknown'}
                      </span>
                    </td>
                    <td>
                      <Link href={`/employees/${emp.id}`} className="btn btn-secondary btn-xs" style={{"marginRight":"0.5rem"}}>View Profile</Link>
                      <Link href={`/employees/${emp.id}/edit`} className="btn btn-navy btn-xs">Edit</Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" style={{ textAlign: "center", padding: "2rem" }}>No employees found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {/*  Pagination Container  */}
        <div className="pagination-container">
          <div className="pagination-info">
            Showing <strong>{employees.meta?.from || 0}</strong> to <strong>{employees.meta?.to || 0}</strong> of <strong>{employees.meta?.total || 0}</strong> employees
          </div>
          <ul className="pagination">
            {employees.meta?.links?.map((link, idx) => (
              <li key={idx} className={`page-item ${link.active ? 'active' : ''} ${!link.url ? 'disabled' : ''}`}>
                <Link className="page-link" href={link.url || '#'} dangerouslySetInnerHTML={{__html: link.label}}></Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    

            </div>
        </AuthenticatedLayout>
    </RoleGuard>
    );
}
