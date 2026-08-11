import React, { useEffect, useState } from 'react';
import axios from 'axios';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router } from '@inertiajs/react';
import { Upload, UserPlus, Eye, Edit, AlertCircle, Search, Filter } from 'lucide-react';
import './EmployeesList.css';

import RoleGuard from '../../Components/RoleGuard.jsx';

export default function EmployeesList({ employees = { data: [], links: [] }, clients = [], filters = {} }) {
    const [search, setSearch] = useState(filters.search || '');
    const [clientId, setClientId] = useState(filters.client_id || '');
    const [empModel, setEmpModel] = useState(filters.employment_model || '');
    const [status, setStatus] = useState(filters.status || '');
    const [revisionStatus, setRevisionStatus] = useState(filters.revision_status || '');
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [suggestions, setSuggestions] = useState([]);
    const [searchingSuggestions, setSearchingSuggestions] = useState(false);

    useEffect(() => {
        setClientId(filters.client_id || '');
    }, [filters.client_id]);

    const applyFilters = () => {
        setShowSuggestions(false);
        router.get(route('employees.index'), {
            search,
            client_id: clientId,
            employment_model: empModel,
            status: status,
            revision_status: revisionStatus
        }, { preserveState: true, preserveScroll: true });
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            applyFilters();
        }
    };

    const fetchSuggestions = (query = '') => {
        setSearchingSuggestions(true);
        axios.get(route('employees.suggestions'), { params: { q: query.trim() } })
            .then(res => {
                const serverResults = Array.isArray(res.data) ? res.data : [];
                setSuggestions(serverResults);
                setSearchingSuggestions(false);
            })
            .catch(() => {
                setSearchingSuggestions(false);
            });
    };

    // Live instant search across overall database when typing or focusing
    useEffect(() => {
        const query = search.trim();
        
        // Immediate local match preview if search text exists
        if (query.length > 0 && Array.isArray(employees?.data)) {
            const q = query.toLowerCase();
            const localMatches = employees.data.filter(emp => {
                const name = (emp.full_name || `${emp.first_name || ''} ${emp.last_name || ''}`).toLowerCase();
                const code = (emp.employee_code || '').toLowerCase();
                const uan = (emp.uan_number || '').toLowerCase();
                const desig = (emp.designation || '').toLowerCase();
                return name.includes(q) || code.includes(q) || uan.includes(q) || desig.includes(q);
            }).map(emp => ({
                id: emp.id,
                employee_code: emp.employee_code,
                full_name: emp.full_name || `${emp.first_name || ''} ${emp.last_name || ''}`.trim(),
                client_name: emp.client_name || (emp.client ? emp.client.company_name : 'No Client'),
                designation: emp.designation,
                uan_number: emp.uan_number,
            })).slice(0, 10);

            if (localMatches.length > 0) {
                setSuggestions(localMatches);
            }
        }

        // Fetch overall database suggestions from server
        const timer = setTimeout(() => {
            fetchSuggestions(query);
        }, 100);

        return () => clearTimeout(timer);
    }, [search, employees]);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (!e.target.closest('.employee-search-container')) {
                setShowSuggestions(false);
            }
        };
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, []);

    useEffect(() => {
        // Load the legacy logic dynamically so it runs on client side after render
        import('./EmployeesListLogic.js').then(module => {
            console.log('Legacy logic loaded for EmployeesList');
        }).catch(err => console.error('Error loading legacy logic', err));
    }, []);

    return (
        <RoleGuard allowedRoles={['admin', 'manager']} moduleKey="candidates">
    <AuthenticatedLayout>
            <Head title="Employees List" />
            <div className="legacy-react-wrapper">
                
      <div className="mb-6 flex justify-between items-end flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[#1F3864] mb-1">Employees Directory</h2>
          <p className="text-gray-500 text-[0.9rem]">Manage agency personnel, statutory rules, salary revisions, and leave balances.</p>
        </div>
        <div style={{"display":"flex","gap":"0.75rem"}}>
          <Link href={route('employees.bulk-upload')} className="btn btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <Upload size={15} /> Bulk Upload Employees
          </Link>
          <a href={route('employees.create')} className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <UserPlus size={15} /> Add New Employee
          </a>
        </div>
      </div>

      {/*  Filters Row  */}
      <div className="card" style={{"padding":"1rem","marginBottom":"1.5rem","display":"flex","gap":"1rem","alignItems":"center","flexWrap":"wrap"}}>
        <div style={{"fontSize":"0.85rem","fontWeight":"600","color":"var(--primary-navy)", display: 'inline-flex', alignItems: 'center', gap: '4px'}}>
          <Filter size={14} /> Filters:
        </div>
        <div className="employee-search-container" style={{ flex: '1', minWidth: '220px', position: 'relative' }}>
          <input 
            type="text" 
            className="form-control" 
            placeholder="Search by Employee Code, Name or UAN..." 
            style={{ padding: '0.4rem 0.75rem', width: '100%' }} 
            value={search} 
            onChange={e => {
              setSearch(e.target.value);
              setShowSuggestions(true);
            }} 
            onFocus={() => {
              setShowSuggestions(true);
              fetchSuggestions(search);
            }}
            onKeyPress={handleKeyPress} 
          />

          {showSuggestions && suggestions.length > 0 && (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 4px)',
                left: 0,
                right: 0,
                backgroundColor: '#FFFFFF',
                borderRadius: '8px',
                boxShadow: '0 10px 25px -5px rgba(0,0,0,0.15)',
                border: '1px solid #E2E8F0',
                zIndex: 100,
                maxHeight: '300px',
                overflowY: 'auto',
              }}
            >
              <div style={{ padding: '6px 12px', background: '#F8FAFC', fontSize: '0.72rem', fontWeight: 700, color: '#64748B', borderBottom: '1px solid #F1F5F9', textTransform: 'uppercase', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Employee Suggestions ({suggestions.length})</span>
                <span style={{ fontSize: '0.68rem', fontWeight: 400, color: '#94A3B8' }}>Click to filter</span>
              </div>
              {suggestions.map(emp => (
                <div
                  key={emp.id}
                  onClick={() => {
                    setSearch(emp.employee_code || emp.full_name);
                    setShowSuggestions(false);
                    router.get(route('employees.index'), {
                      search: emp.employee_code || emp.full_name,
                      client_id: clientId,
                      employment_model: empModel,
                      status: status,
                      revision_status: revisionStatus
                    }, { preserveState: true, preserveScroll: true });
                  }}
                  style={{
                    padding: '8px 12px',
                    cursor: 'pointer',
                    borderBottom: '1px solid #F8FAFC',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    transition: 'background 0.12s ease',
                  }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = '#F1F5F9'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = '#FFFFFF'}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#1E293B' }}>{emp.full_name}</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748B' }}>{emp.client_name || 'No Client'} • {emp.designation || 'Staff'}</div>
                  </div>
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, background: '#EFF6FF', color: '#1E40AF', padding: '2px 8px', borderRadius: '4px', border: '1px solid #DBEAFE' }}>
                    {emp.employee_code}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div>
          <select className="form-control" style={{"padding":"0.4rem 0.75rem"}} title="Select Client" value={clientId} onChange={e => setClientId(e.target.value)}>
            <option value="">Select Client</option>
            {clients && clients.map(c => (
               <option key={c.id} value={c.id}>{c.company_name}</option>
            ))}
          </select>
        </div>
        <div>
          <select className="form-control" style={{"padding":"0.4rem 0.75rem"}} title="Select Employment Type" value={empModel} onChange={e => setEmpModel(e.target.value)}>
            <option value="">Select Employment Type</option>
            <option value="agency_contract">Agency Contract</option>
            <option value="eor">Pass-through EOR</option>
            <option value="internal">Internal Staff</option>
          </select>
        </div>
        <div>
          <select className="form-control" style={{"padding":"0.4rem 0.75rem"}} title="Select Status" value={status} onChange={e => setStatus(e.target.value)}>
            <option value="">Select Status</option>
            <option value="active">Active</option>
            <option value="exited">Exited</option>
            <option value="onboarding">Onboarding</option>
          </select>
        </div>
        <div>
          <select className="form-control" style={{"padding":"0.4rem 0.75rem"}} title="Select Revision Status" value={revisionStatus} onChange={e => setRevisionStatus(e.target.value)}>
            <option value="">Select Revision</option>
            <option value="pending_approval">Pending Revision Approval</option>
            <option value="approved">Approved Revisions</option>
            <option value="none">No Revisions</option>
          </select>
        </div>
        <button className="btn btn-navy" style={{"padding":"0.4rem 1rem", display: 'inline-flex', alignItems: 'center', gap: '5px'}} onClick={applyFilters}>
          <Search size={14} /> Apply
        </button>
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
                <th>Created By</th>
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
                      <Link href={route('employees.show', emp.id)} style={{"fontWeight":"600","color":"var(--primary-navy)"}}>{emp.full_name}</Link>
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
                      <div style={{ fontSize: "0.85rem", fontWeight: "600", color: "#334155" }}>
                        {emp.creator_name || (emp.creator ? emp.creator.name : (emp.created_by ? `User #${emp.created_by}` : 'System Admin'))}
                      </div>
                      <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                        {emp.entry_source === 'bulk_upload' ? 'Bulk Upload' : 'Manual Entry'}
                      </div>
                    </td>
                    <td>
                      <div style={{"display":"flex","flexDirection":"column","gap":"0.4rem","alignItems":"flex-start"}}>
                        <span className={`badge badge-${emp.status === 'active' ? 'success' : emp.status === 'exited' ? 'danger' : 'warning'}`} style={{ whiteSpace: 'nowrap' }}>
                          {emp.status ? (emp.status.charAt(0).toUpperCase() + emp.status.slice(1)) : 'Unknown'}
                        </span>
                        <div style={{"display":"flex","gap":"0.4rem","flexWrap":"wrap"}}>
                            {emp.status === 'onboarding' && (
                              <span className="badge badge-gold" style={{"fontSize":"0.75rem", whiteSpace: 'nowrap'}}>
                                {emp.documents_verified_count || 0}/{emp.documents_required_count || 5} Docs
                              </span>
                            )}
                            {emp.documents && emp.documents.filter(d => d.status === 'pending').length > 0 && (
                                <span className="badge badge-danger" style={{"fontSize":"0.7rem", "padding":"0.2rem 0.4rem", whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: '3px'}}>
                                    <AlertCircle size={12} /> Action Required
                                </span>
                            )}
                            {emp.has_pending_revision && (
                                <span className="badge badge-warning" style={{"fontSize":"0.7rem", "padding":"0.2rem 0.4rem", whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: '3px'}}>
                                    <AlertCircle size={12} /> Revision Pending
                                </span>
                            )}
                        </div>
                      </div>
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <Link href={route('employees.salary-revision.create', emp.id)} className="btn btn-warning btn-xs" style={{"marginRight":"0.4rem", display: 'inline-flex', alignItems: 'center', gap: '4px'}}>
                        <Edit size={13} /> Revision
                      </Link>
                      <Link href={route('employees.show', emp.id)} className="btn btn-secondary btn-xs" style={{"marginRight":"0.4rem", display: 'inline-flex', alignItems: 'center', gap: '4px'}}>
                        <Eye size={13} /> View Profile
                      </Link>
                      <Link href={route('employees.edit', emp.id)} className="btn btn-navy btn-xs" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <Edit size={13} /> Edit
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="9" style={{ textAlign: "center", padding: "2rem" }}>No employees found.</td>
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
