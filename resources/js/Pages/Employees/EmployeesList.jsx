import React, { useEffect } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';
import './EmployeesList.css';

import RoleGuard from '../../Components/RoleGuard.jsx';
export default function EmployeesList() {
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
          <input type="text" className="form-control" placeholder="Search by Employee Code, Name or UAN..." style={{"padding":"0.4rem 0.75rem"}} />
        </div>
        <div>
          <select className="form-control" style={{"padding":"0.4rem 0.75rem"}} title="Select Client">
            <option value="">All Clients</option>
            <option value="mahindra">Mahindra Corp</option>
            <option value="tcs">Tata Consultancy Services</option>
            <option value="reliance">Reliance Digital</option>
          </select>
        </div>
        <div>
          <select className="form-control" style={{"padding":"0.4rem 0.75rem"}} title="Select Employment Type">
            <option value="">All Employment Types</option>
            <option value="contract">Agency Contract</option>
            <option value="eor">Pass-through EOR</option>
            <option value="internal">Internal Staff</option>
          </select>
        </div>
        <div>
          <select className="form-control" style={{"padding":"0.4rem 0.75rem"}} title="Select Status">
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="exited">Exited</option>
            <option value="pending">Pending Onboarding</option>
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
              <tr>
                <td>TEC-088</td>
                <td>
                  <a href="/employees/1" style={{"fontWeight":"600","color":"var(--primary-navy)"}}>Aarav Sharma</a>
                  <div style={{"fontSize":"0.75rem","color":"var(--text-muted)"}}>UAN: 100523485790</div>
                </td>
                <td>Mahindra Corp</td>
                <td>Senior Developer</td>
                <td><span className="badge badge-info">Pass-through EOR</span></td>
                <td>Jan 15, 2025</td>
                <td><span className="badge badge-success">Active</span></td>
                <td>
                  <a href="/employees/1" className="btn btn-secondary btn-xs">View Profile</a>
                  <a href="/employees/create?id=88" className="btn btn-navy btn-xs">Edit</a>
                </td>
              </tr>
              <tr>
                <td>TEC-121</td>
                <td>
                  <a href="/employees/1" style={{"fontWeight":"600","color":"var(--primary-navy)"}}>Neha Patil</a>
                  <div style={{"fontSize":"0.75rem","color":"var(--text-muted)"}}>UAN: 100523485121</div>
                </td>
                <td>Mahindra Corp</td>
                <td>QA Lead</td>
                <td><span className="badge badge-info">Pass-through EOR</span></td>
                <td>Mar 10, 2025</td>
                <td><span className="badge badge-success">Active</span></td>
                <td>
                  <a href="/employees/1" className="btn btn-secondary btn-xs">View Profile</a>
                  <a href="/employees/create?id=121" className="btn btn-navy btn-xs">Edit</a>
                </td>
              </tr>
              <tr>
                <td>TEC-142</td>
                <td>
                  <a href="/employees/1" style={{"fontWeight":"600","color":"var(--primary-navy)"}}>Karan Malhotra</a>
                  <div style={{"fontSize":"0.75rem","color":"var(--text-muted)"}}>UAN: 100523485142</div>
                </td>
                <td>Mahindra Corp</td>
                <td>UX Designer</td>
                <td><span className="badge badge-success">Agency Contract</span></td>
                <td>May 01, 2026</td>
                <td><span className="badge badge-success">Active</span></td>
                <td>
                  <a href="/employees/1" className="btn btn-secondary btn-xs">View Profile</a>
                  <a href="/employees/create?id=142" className="btn btn-navy btn-xs">Edit</a>
                </td>
              </tr>
              <tr>
                <td>TEC-168</td>
                <td>
                  <a href="/employees/1" style={{"fontWeight":"600","color":"var(--primary-navy)"}}>Vikram Rao</a>
                  <div style={{"fontSize":"0.75rem","color":"var(--text-muted)"}}>UAN: Pending</div>
                </td>
                <td>Reliance Digital</td>
                <td>Sales Exec</td>
                <td><span className="badge badge-success">Agency Contract</span></td>
                <td>June 01, 2026</td>
                <td>
                  <span className="badge badge-warning">Onboarding</span>
                  <span className="badge badge-gold" style={{"fontSize":"0.7rem","padding":"0.2rem 0.5rem","marginLeft":"0.4rem"}} title="Mandatory KYC documents incomplete">4/7 docs</span>
                </td>
                <td>
                  <a href="/employees/1" className="btn btn-secondary btn-xs">View Profile</a>
                  <a href="/employees/create?id=168" className="btn btn-navy btn-xs">Edit</a>
                </td>
              </tr>
              <tr>
                <td>TEC-045</td>
                <td>
                  <a href="/employees/1" style={{"fontWeight":"600","color":"var(--primary-navy)"}}>Siddharth Sen</a>
                  <div style={{"fontSize":"0.75rem","color":"var(--text-muted)"}}>UAN: 100523480045</div>
                </td>
                <td>Tata Consultancy Services</td>
                <td>Operations Exec</td>
                <td><span className="badge badge-success">Agency Contract</span></td>
                <td>Aug 10, 2024</td>
                <td><span className="badge badge-danger">Exited</span></td>
                <td>
                  <a href="/employees/1" className="btn btn-secondary btn-xs">View Profile</a>
                  <span className="badge badge-neutral">Settled</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        {/*  Pagination Container  */}
        <div className="pagination-container">
          <div className="pagination-info">
            Showing <strong>1</strong> to <strong>5</strong> of <strong>24</strong> employees
          </div>
          <ul className="pagination">
            <li className="page-item disabled={true}"><a className="page-link" href="#">Prev</a></li>
            <li className="page-item active"><a className="page-link" href="#">1</a></li>
            <li className="page-item"><a className="page-link" href="#" onClick={(event) => { alert('Loading page 2...'); return false; }}>2</a></li>
            <li className="page-item"><a className="page-link" href="#" onClick={(event) => { alert('Loading page 3...'); return false; }}>3</a></li>
            <li className="page-item"><a className="page-link" href="#" onClick={(event) => { alert('Loading page 4...'); return false; }}>4</a></li>
            <li className="page-item"><a className="page-link" href="#" onClick={(event) => { alert('Loading next page...'); return false; }}>Next</a></li>
          </ul>
        </div>
      </div>
    

            </div>
        </AuthenticatedLayout>
    </RoleGuard>
    );
}
