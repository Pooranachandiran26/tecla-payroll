import React, { useEffect } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';
import './ClientsList.css';

import RoleGuard from '../../Components/RoleGuard.jsx';
export default function ClientsList() {
    useEffect(() => {
        // Load the legacy logic dynamically so it runs on client side after render
        import('./ClientsListLogic.js').then(module => {
            console.log('Legacy logic loaded for ClientsList');
        }).catch(err => console.error('Error loading legacy logic', err));
        
        return () => {
            // Cleanup logic if needed
        };
    }, []);

    return (
        <RoleGuard allowedRoles={['admin', 'manager']}>
    <AuthenticatedLayout>
            <Head title="Clients List" />
            <div className="legacy-react-wrapper">
                
      <div className="flex-row-between">
        <div>
          <h2>Clients Directory</h2>
          <p style={{"color":"var(--text-muted)","fontSize":"0.9rem"}}>Manage all client profiles, contracts, and view
            high-level payroll metrics.</p>
        </div>
        <a href="/clients/create" className="btn btn-primary">➕ Add New Client</a>
      </div>

      {/*  Advanced Filters Row  */}
      <div className="card"
        style={{"padding":"1rem","marginBottom":"1.5rem","display":"flex","gap":"1rem","alignItems":"center","flexWrap":"wrap"}}>
        <div style={{"fontSize":"0.85rem","fontWeight":"600","color":"var(--primary-navy)"}}>Filters:</div>

        <div style={{"flex":"1","minWidth":"200px"}}>
          <input type="text" id="search-input" className="form-control" placeholder="Search by Client Name, Code, GSTIN or PAN..."
            style={{"padding":"0.4rem 0.75rem"}} onInput={(event) => { window.applyFilters() }} />
        </div>

        <div>
          <select id="contract-type-filter" className="form-control" style={{"padding":"0.4rem 0.75rem"}} title="Contract Type" onChange={(event) => { window.applyFilters() }}>
            <option value="">All Contract Types</option>
            <option value="agency">Agency / Staffing</option>
            <option value="eor">EOR / Pass-through</option>
            <option value="hybrid">Hybrid</option>
          </select>
        </div>

        <div>
          <select id="onboarding-filter" className="form-control" style={{"padding":"0.4rem 0.75rem"}} title="Onboarding Status" onChange={(event) => { window.applyFilters() }}>
            <option value="">All Onboarding Status</option>
            <option value="complete">100% Complete</option>
            <option value="pending">Pending Configuration</option>
          </select>
        </div>

        <div>
          <select id="status-filter" className="form-control" style={{"padding":"0.4rem 0.75rem"}} title="Status" onChange={(event) => { window.applyFilters() }}>
            <option value="all">All Statuses</option>
            <option value="active" >Active Clients</option>
            <option value="inactive">Inactive / Offboarded</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>

        <div>
          <select id="industry-filter" className="form-control" style={{"padding":"0.4rem 0.75rem"}} title="Industry" onChange={(event) => { window.applyFilters() }}>
            <option value="">All Industries</option>
            <option value="Information Technology (IT)">IT</option>
            <option value="Banking, Financial Services & Insurance (BFSI)">BFSI</option>
            <option value="Manufacturing">Manufacturing</option>
            <option value="Healthcare & Pharmaceuticals">Healthcare</option>
            <option value="Retail & E-Commerce">Retail</option>
            <option value="Automobile">Automobile</option>
            <option value="Other">Other</option>
          </select>
        </div>

        <div>
          <select id="am-filter" className="form-control" style={{"padding":"0.4rem 0.75rem"}} title="Account Manager" onChange={(event) => { window.applyFilters() }}>
            <option value="">All Account Managers</option>
            <option value="sunita">Sunita Verma</option>
            <option value="rahul">Rahul Desai</option>
            <option value="priya">Priya Kapoor</option>
            <option value="amit">Amit Singh</option>
          </select>
        </div>

        <div>
          <select id="expiry-filter" className="form-control" style={{"padding":"0.4rem 0.75rem"}} title="Contract Expiry" onChange={(event) => { window.applyFilters() }}>
            <option value="">All Contract Expiries</option>
            <option value="30">Expiring in 30 days</option>
            <option value="60">Expiring in 60 days</option>
            <option value="90">Expiring in 90 days</option>
            <option value="expired">Already Expired</option>
          </select>
        </div>

        <label style={{"display":"flex","alignItems":"center","gap":"0.4rem","fontSize":"0.85rem","cursor":"pointer","userSelect":"none"}}>
          <input type="checkbox" id="overdue-filter" style={{"width":"16px","height":"16px"}} onChange={(event) => { window.applyFilters() }} />
          <span>Show Only Overdue</span>
        </label>

        <button className="btn btn-secondary" style={{"padding":"0.4rem 1rem","border":"none","color":"var(--text-muted)"}} onClick={(event) => { window.clearFilters() }}>Clear Filters</button>
      </div>

      {/*  Summary Strip  */}
      <div className="card" style={{"padding":"0.75rem 1.25rem","marginBottom":"1.5rem"}}>
        <div className="banner-info" id="summary-strip" style={{"margin":"0","fontSize":"0.85rem","fontWeight":"500","borderLeft":"4px solid var(--primary-navy)"}}>
          Total: <span id="summary-total" style={{"fontWeight":"700"}}>0</span> | 
          Active: <span id="summary-active" style={{"fontWeight":"700","color":"var(--status-success)"}}>0</span> | 
          Onboarding: <span id="summary-onboarding" style={{"fontWeight":"700","color":"var(--status-warning)"}}>0</span> | 
          Total Outstanding: <span id="summary-outstanding" style={{"fontWeight":"700","color":"var(--status-danger)"}}>₹0</span> | 
          Total Deployed: <span id="summary-deployed" style={{"fontWeight":"700"}}>0</span> candidates
        </div>
      </div>

      {/*  Bulk Actions Bar  */}
      <div className="bulk-actions-bar" id="bulk-actions">
        <div style={{"fontSize":"0.9rem","fontWeight":"500"}}>
          <span id="-count">0</span> clients 
        </div>
        <div style={{"display":"flex","gap":"0.5rem","flexWrap":"wrap"}}>
          <button className="btn btn-secondary btn-xs" style={{"background":"white","color":"var(--primary-navy)","border":"none"}}
            onClick={(event) => { window.exportCSV() }}>⬇️ Export CSV</button>
          <button className="btn btn-secondary btn-xs" style={{"background":"white","color":"var(--primary-navy)","border":"none"}}
            onClick={(event) => { window.bulkChangeStatus() }}>🔄 Change Status</button>
          <button className="btn btn-secondary btn-xs" style={{"background":"white","color":"var(--primary-navy)","border":"none"}}
            onClick={(event) => { window.bulkAssignAM() }}>👤 Assign AM</button>
          <button className="btn btn-secondary btn-xs" style={{"background":"white","color":"var(--primary-navy)","border":"none"}}
            onClick={(event) => { window.bulkSendReminder() }}>📧 Send Reminder</button>
          <button className="btn btn-danger btn-xs" style={{"border":"none"}}
            onClick={(event) => { window.bulkDelete() }}>🗑️ Delete Selected</button>
        </div>
      </div>

      {/*  Clients Table Card  */}
      <div className="card" style={{"padding":"0"}}>
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{"width":"40px","textAlign":"center"}}>
                  <input type="checkbox" id="select-all" onChange={(event) => { window.toggleAllCheckboxes(this) }} />
                </th>
                <th>Client Details</th>
                <th>Contract & Billing</th>
                <th>Onboarding</th>
                <th>Client Since</th>
                <th>Last Invoice</th>
                <th>Outstanding (₹)</th>
                <th style={{"textAlign":"center"}}>Active Candidates</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody id="clients-table-body">
              {/*  Rendered Dynamically  */}
            </tbody>
          </table>
        </div>

        {/*  Pagination  */}
        <div className="pagination">
          <div className="page-info" id="pagination-info">Showing 0 to 0 of 0 Clients</div>
          <div className="page-controls" id="pagination-controls">
            {/*  Rendered Dynamically  */}
          </div>
        </div>
      </div>
    


  <div id="toast" style={{"position":"fixed","bottom":"1.5rem","right":"1.5rem","background":"var(--primary-navy)","color":"white","padding":"0.75rem 1.25rem","borderRadius":"var(--radius-md)","fontSize":"0.875rem","fontWeight":"500","boxShadow":"var(--shadow-lg)","transform":"translateY(100px)","opacity":"0","transition":"all 0.3s","zIndex":"9999"}}></div>

  
            </div>
        </AuthenticatedLayout>
    </RoleGuard>
    );
}
