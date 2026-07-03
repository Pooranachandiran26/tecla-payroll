import React, { useEffect } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';
import './ClientDetail.css';

import RoleGuard from '../../Components/RoleGuard.jsx';
export default function ClientDetail() {
    useEffect(() => {
        // Load the legacy logic dynamically so it runs on client side after render
        import('./ClientDetailLogic.js').then(module => {
            console.log('Legacy logic loaded for ClientDetail');
        }).catch(err => console.error('Error loading legacy logic', err));
        
        return () => {
            // Cleanup logic if needed
        };
    }, []);

    return (
        <RoleGuard allowedRoles={['admin', 'executive']}>
    <AuthenticatedLayout>
            <Head title="Client Detail" />
            <div className="legacy-react-wrapper">
                
      <div style={{"marginBottom":"1.5rem"}}>
        <a href="/clients" style={{"fontSize":"0.85rem","fontWeight":"600"}}>← Back to Clients Directory</a>

        <div className="client-header-container">
          <div>
            <div className="client-title-row">
              <h2>Mahindra & Mahindra Limited</h2>
              <span className="badge badge-success badge-status-lg" id="current-status-badge">● Active</span>
            </div>
            <div className="quick-meta">
              <span><strong>Client Code:</strong> MAH-012</span>
              <span><strong>Type:</strong> Pass-through EOR</span>
              <span><strong>Industry:</strong> Automobile</span>
              <span><strong>Client Since:</strong> Jan 01, 2024</span>
            </div>
          </div>
          <div style={{"display":"flex","gap":"0.75rem","alignItems":"center"}}>
            <button className="btn btn-secondary" onClick={(event) => { window.openStatusModal() }}>🔄 Change Status</button>
            <a href="/clients/create?id=1" className="btn btn-secondary">✏️ Edit Client</a>
            <a href="#" className="btn btn-primary">🧾 Generate Invoice</a>
          </div>
        </div>
        
        {/*  Alert Banners  */}
        <div id="alert-banner-container" style={{"display":"flex","flexDirection":"column","gap":"0.5rem","marginTop":"1rem","marginBottom":"1rem"}}></div>
      </div>

      {/*  Tab Container  */}
      <div className="tab-container card" style={{"paddingTop":"0"}}>
        <ul className="tab-headers"
          style={{"padding":"0 1.5rem","background":"#FAFBFC","borderRadius":"var(--radius-md) var(--radius-md) 0 0","margin":"0 -1.5rem 1.5rem -1.5rem"}}>
          <li className="active" data-tab="overview">Overview</li>
          <li data-tab="candidates">Deployed Candidates (42)</li>
          <li data-tab="invoices">Invoices & Payments</li>
          <li data-tab="documents">Documents (5)</li>
          <li data-tab="contacts">Contacts</li>
          <li data-tab="sla">SLA & Settings</li>
          <li data-tab="activity">Activity Log</li>
        </ul>

        {/*  Tab 1: Overview  */}
        <div className="tab-content active" data-tab="overview">

          <div className="grid-cols-4" style={{"marginBottom":"2rem"}}>
            <div className="card metric-card" style={{"background":"#FAFBFC","border":"none"}}>
              <span className="metric-label">Outstanding Dues</span>
              <span className="metric-value" style={{"color":"var(--status-danger)"}} id="metric-outstanding">₹4,20,000</span>
              <span className="metric-trend" id="metric-credit-limit">Credit Limit: ₹10,00,000</span>
            </div>
            <div className="card metric-card" style={{"background":"#FAFBFC","border":"none"}}>
              <span className="metric-label">Active Candidates</span>
              <span className="metric-value" id="metric-active-candidates">42</span>
              <span className="metric-trend trend-up" id="metric-active-trend">▲ 2 added this month</span>
            </div>
            <div className="card metric-card" style={{"background":"#FAFBFC","border":"none"}}>
              <span className="metric-label">Credit Utilization</span>
              <span className="metric-value" id="metric-credit-utilization">42%</span>
              <span className="metric-trend" id="metric-credit-util-bar" style={{"display":"block","background":"#E2E8F0","borderRadius":"4px","height":"6px","marginTop":"0.4rem","overflow":"hidden"}}><span id="metric-credit-util-fill" style={{"display":"block","background":"var(--accent-gold)","height":"100%","width":"42%"}}></span></span>
            </div>
            <div className="card metric-card" style={{"background":"#FAFBFC","border":"none"}}>
              <span className="metric-label">YTD Invoiced (2026)</span>
              <span className="metric-value" id="metric-ytd-invoiced">₹8,15,000</span>
              <span className="metric-trend"><span className="badge badge-success" id="metric-contract-expiry" style={{"fontSize":"0.72rem","padding":"0.2rem 0.4rem"}}>Contract: Dec 31, 2026</span></span>
            </div>
          </div>

          <div className="grid-layout">
            {/*  Left Col  */}
            <div style={{"display":"flex","flexDirection":"column","gap":"1.5rem"}}>
              <div className="card">
                <h3
                  style={{"fontSize":"1.05rem","borderBottom":"1px solid var(--border-color)","paddingBottom":"0.5rem","marginBottom":"1rem"}}>
                  Company Profile Snapshot</h3>
                <div style={{"display":"grid","gridTemplateColumns":"1fr 1fr","gap":"1rem","fontSize":"0.875rem"}} id="profile-snapshot-grid">
                  {/*  Dynamically populated  */}
                </div>
              </div>

              {/*  PO Utilization Tracker  */}
              <div className="card" id="po-tracker-card" style={{"display":"none","borderLeft":"3px solid var(--accent-gold)"}}>
                <div style={{"display":"flex","justifyContent":"space-between","alignItems":"center","marginBottom":"1rem"}}>
                  <h3 style={{"fontSize":"1.05rem","margin":"0"}}>Purchase Order (PO) Utilization</h3>
                  <span className="badge badge-warning" id="po-status-badge">Active</span>
                </div>
                <div style={{"marginBottom":"0.5rem","display":"flex","justifyContent":"space-between","fontSize":"0.85rem"}}>
                  <span><strong>PO No:</strong> <span id="tracker-po-number"></span></span>
                  <span><strong>Valid Till:</strong> <span id="tracker-po-validity"></span></span>
                </div>
                
                <div style={{"background":"#F8FAFC","padding":"1rem","borderRadius":"var(--radius-md)","border":"1px solid var(--border-color)"}}>
                  <div style={{"display":"flex","justifyContent":"space-between","marginBottom":"0.5rem","fontSize":"0.85rem"}}>
                    <span>Utilized: <strong id="tracker-po-utilized" style={{"color":"var(--primary-navy)"}}>₹0</strong></span>
                    <span>Total Value: <strong id="tracker-po-value">₹0</strong></span>
                  </div>
                  <div style={{"background":"#E2E8F0","borderRadius":"4px","height":"8px","width":"100%","overflow":"hidden","marginBottom":"0.5rem"}}>
                    <div id="tracker-po-bar" style={{"background":"var(--accent-gold)","height":"100%","width":"0%","transition":"width 0.3s ease"}}></div>
                  </div>
                  <div style={{"display":"flex","justifyContent":"space-between","fontSize":"0.75rem","color":"var(--text-muted)"}}>
                    <span id="tracker-po-percentage">0% Consumed</span>
                    <span id="tracker-po-remaining">₹0 Remaining</span>
                  </div>
                </div>
                <div id="po-warning-alert" style={{"display":"flex","marginTop":"1rem","padding":"0.75rem","background":"#FFF5F5","border":"1px solid #FEB2B2","borderRadius":"var(--radius-sm)","color":"#C53030","fontSize":"0.8rem","gap":"0.5rem","alignItems":"center"}}>
                  <span>⚠️</span>
                  <span><strong>Warning:</strong> PO Value is critically low or exhausted. Invoicing may be blocked.</span>
                </div>
              </div>
            </div>

            {/*  Right Col  */}
            <div style={{"display":"flex","flexDirection":"column","gap":"1.5rem"}}>
              <div className="card" style={{"borderLeft":"3px solid var(--status-success)"}}>
                <h3 style={{"fontSize":"1.05rem","marginBottom":"1rem"}}>Onboarding Status</h3>
                <div style={{"display":"flex","flexDirection":"column","gap":"0.5rem","fontSize":"0.85rem"}}>
                  <div style={{"display":"flex","alignItems":"center","gap":"0.5rem"}}><span
                      style={{"color":"var(--status-success)"}}>✅</span> Company Identity Configured</div>
                  <div style={{"display":"flex","alignItems":"center","gap":"0.5rem"}}><span
                      style={{"color":"var(--status-success)"}}>✅</span> Contacts Added</div>
                  <div style={{"display":"flex","alignItems":"center","gap":"0.5rem"}}><span
                      style={{"color":"var(--status-success)"}}>✅</span> Billing Terms Agreed</div>
                  <div style={{"display":"flex","alignItems":"center","gap":"0.5rem"}}><span
                      style={{"color":"var(--status-success)"}}>✅</span> Statutory Defaults Set</div>
                  <div style={{"display":"flex","alignItems":"center","gap":"0.5rem"}}><span
                      style={{"color":"var(--status-success)"}}>✅</span> Critical Documents Uploaded</div>
                </div>
                <div
                  style={{"marginTop":"1rem","paddingTop":"0.75rem","borderTop":"1px solid var(--border-color)","fontSize":"0.8rem"}}>
                  <strong>Portal Access:</strong> Enabled (Approver role)
                </div>
              </div>
            </div>
          </div>
        </div>

        {/*  Tab 2: Deployed Candidates  */}
        <div className="tab-content" data-tab="candidates">
          <div style={{"display":"flex","justifyContent":"space-between","alignItems":"center","marginBottom":"1rem"}}>
            <div style={{"display":"flex","gap":"0.5rem"}}>
              <input type="text" className="form-control" placeholder="Search employee..."
                style={{"width":"250px","padding":"0.4rem 0.75rem"}} />
              <select className="form-control" style={{"width":"150px","padding":"0.4rem 0.75rem"}}>
                <option value="all">All Statuses</option>
                <option value="active" >Active</option>
                <option value="resigned">Resigned</option>
              </select>
            </div>
            <a href="/employees/create" className="btn btn-primary btn-xs" style={{"padding":"0.4rem 0.75rem"}}>➕ Add
              Candidate</a>
          </div>

          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Emp Code</th>
                  <th>Candidate Name</th>
                  <th>Designation</th>
                  <th>Gross Salary</th>
                  <th>Statutory Profile</th>
                  <th>Date Joined</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>TEC-088</td>
                  <td><strong>Aarav Sharma</strong></td>
                  <td>Senior Developer</td>
                  <td>₹45,000</td>
                  <td>
                    <span className="badge badge-success">PF</span>
                    <span className="badge badge-danger" title="Gross exceeds 21k limit">ESI Limit</span>
                    <span className="badge badge-success">TDS</span>
                  </td>
                  <td>Jan 15, 2025</td>
                  <td><span className="badge badge-success">Active</span></td>
                  <td><a href="/employees/1" className="btn btn-secondary btn-xs">View Profile</a></td>
                </tr>
                <tr>
                  <td>TEC-121</td>
                  <td><strong>Neha Patil</strong></td>
                  <td>QA Lead</td>
                  <td>₹32,000</td>
                  <td>
                    <span className="badge badge-success">PF</span>
                    <span className="badge badge-danger">ESI Limit</span>
                    <span className="badge badge-neutral">TDS Off</span>
                  </td>
                  <td>Mar 10, 2025</td>
                  <td><span className="badge badge-success">Active</span></td>
                  <td><a href="/employees/1" className="btn btn-secondary btn-xs">View Profile</a></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/*  Tab 3: Invoices & Payments  */}
        <div className="tab-content" data-tab="invoices">
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Invoice No</th>
                  <th>Billing Month</th>
                  <th>Issue Date</th>
                  <th>Due Date</th>
                  <th>Total Amount</th>
                  <th>Margin / Fee</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody id="invoice-table-body">
                {/*  Dynamically populated  */}
              </tbody>
            </table>
          </div>
        </div>

        {/*  Tab 4: Documents  */}
        <div className="tab-content" data-tab="documents">
          <div style={{"display":"flex","justifyContent":"flex-end","marginBottom":"1.5rem"}}>
            <button className="btn btn-primary btn-xs" style={{"padding":"0.4rem 0.75rem"}}
              onClick={(event) => { document.window.getElementById('doc-upload-input').window.click() }}>➕ Upload Document</button>
            <input type="file" id="doc-upload-input" style={{"display":"none"}} onChange={(event) => { alert('Upload successful!') }} />
          </div>

          <div className="doc-grid" id="document-grid-container">
            {/*  Dynamically populated  */}
          </div>
        </div>

        {/*  Tab 5: Contacts  */}
        <div className="tab-content" data-tab="contacts">
          <div className="grid-cols-3" id="contacts-grid-container">
            {/*  Dynamically populated  */}
          </div>
        </div>

        {/*  Tab 6: Activity Log  */}
        <div className="tab-content" data-tab="activity">
          <div style={{"display":"flex","gap":"0.75rem","marginBottom":"1.5rem","flexWrap":"wrap","background":"#F8FAFC","padding":"0.75rem","borderRadius":"var(--radius-sm)","border":"1px solid var(--border-color)"}}>
            <div style={{"flex":"1","minWidth":"150px"}}>
              <label style={{"fontSize":"0.75rem","fontWeight":"600","display":"block","marginBottom":"0.25rem"}}>Log Type</label>
              <select id="log-filter-type" className="form-control" style={{"padding":"0.35rem 0.5rem","height":"auto"}} onChange={(event) => { window.filterActivityLogs() }}>
                <option value="all">All Types</option>
                <option value="System">System</option>
                <option value="Billing">Billing</option>
                <option value="Compliance">Compliance</option>
                <option value="Portal">Portal</option>
                <option value="Account Manager">Account Manager</option>
              </select>
            </div>
            <div style={{"flex":"1","minWidth":"150px"}}>
              <label style={{"fontSize":"0.75rem","fontWeight":"600","display":"block","marginBottom":"0.25rem"}}>Start Date</label>
              <input type="date" id="log-filter-start" className="form-control" style={{"padding":"0.35rem 0.5rem","height":"auto"}} onChange={(event) => { window.filterActivityLogs() }} />
            </div>
            <div style={{"flex":"1","minWidth":"150px"}}>
              <label style={{"fontSize":"0.75rem","fontWeight":"600","display":"block","marginBottom":"0.25rem"}}>End Date</label>
              <input type="date" id="log-filter-end" className="form-control" style={{"padding":"0.35rem 0.5rem","height":"auto"}} onChange={(event) => { window.filterActivityLogs() }} />
            </div>
          </div>
          
          <div className="activity-timeline" id="activity-timeline-container">
            {/*  Dynamically populated  */}
          </div>
        </div>

        {/*  Tab 7: Settings & SLA  */}
        <div className="tab-content" data-tab="sla">
          <div className="grid-layout" id="sla-grid-container">
            {/*  Dynamically populated  */}
          </div>
        </div>

      </div>
    


  {/*  Status Change Modal  */}
  <div className="modal-overlay" id="status-modal">
    <div className="modal-box">
      <div className="modal-header">
        <h3 style={{"margin":"0","fontSize":"1.15rem"}}>Change Client Status</h3>
        <button className="modal-close" onClick={(event) => { window.closeStatusModal() }}>×</button>
      </div>
      <div>
        <p style={{"fontSize":"0.85rem","color":"var(--text-muted)","marginBottom":"1rem"}}>
          Updating the client status will affect billing and payroll processing for all associated candidates.
        </p>

        <div className="form-group">
          <label>New Status</label>
          <select id="new-status-select" className="form-control">
            <option value="active">Active</option>
            <option value="inactive">Inactive (Offboarded)</option>
            <option value="suspended">Suspended (Payment Default)</option>
          </select>
        </div>

        <div className="form-group">
          <label>Reason / Notes</label>
          <textarea className="form-control" rows="3" placeholder="Enter reason for status change..."></textarea>
        </div>

        <div className="form-group">
          <label
            style={{"display":"flex","alignItems":"center","gap":"0.5rem","fontSize":"0.85rem","fontWeight":"normal","cursor":"pointer"}}>
            <input type="checkbox" defaultChecked={true} style={{"width":"16px","height":"16px"}} />
            Halt payroll processing for all candidates under this client?
          </label>
        </div>
      </div>

      <div className="modal-footer">
        <button className="btn btn-secondary" onClick={(event) => { window.closeStatusModal() }}>Cancel</button>
        <button className="btn btn-primary" onClick={(event) => { window.confirmStatusChange() }}>Confirm Update</button>
      </div>
    </div>
  </div>

  {/*  Record Payment Modal  */}
  <div className="modal-overlay" id="payment-modal">
    <div className="modal-box">
      <div className="modal-header">
        <h3 style={{"margin":"0","fontSize":"1.15rem"}}>💰 Record Invoice Payment</h3>
        <button className="modal-close" onClick={(event) => { window.closePaymentModal() }}>×</button>
      </div>
      <div className="modal-body" style={{"paddingTop":"1rem","maxHeight":"70vh","overflowY":"auto"}}>
        <input type="hidden" id="pay-invoice-no" />
        
        <div style={{"display":"flex","justifyContent":"space-between","marginBottom":"1rem","background":"#F8FAFC","padding":"0.75rem","borderRadius":"var(--radius-sm)"}}>
          <div>
            <span style={{"fontSize":"0.75rem","color":"var(--text-muted)","display":"block"}}>Invoice Amount</span>
            <strong style={{"fontSize":"1rem","color":"var(--primary-navy)"}} id="pay-invoice-amount">₹0</strong>
          </div>
          <div>
            <span style={{"fontSize":"0.75rem","color":"var(--text-muted)","display":"block"}}>Pending Balance</span>
            <strong style={{"fontSize":"1rem","color":"var(--status-danger)"}} id="pay-invoice-pending">₹0</strong>
          </div>
        </div>

        <div className="form-row" style={{"marginBottom":"0.75rem"}}>
          <div className="form-group">
            <label htmlFor="pay-mode">Payment Mode <span style={{"color":"var(--status-danger)"}}>*</span></label>
            <select id="pay-mode" className="form-control">
              <option value="NEFT">NEFT / RTGS</option>
              <option value="UPI">UPI</option>
              <option value="Cheque">Cheque</option>
              <option value="Cash">Cash</option>
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="pay-ref">Reference / UTR Number <span style={{"color":"var(--status-danger)"}}>*</span></label>
            <input type="text" id="pay-ref" className="form-control" placeholder="e.g. UTR123456789" />
          </div>
        </div>

        <div className="form-row" style={{"marginBottom":"0.75rem"}}>
          <div className="form-group">
            <label htmlFor="pay-date">Transaction Date <span style={{"color":"var(--status-danger)"}}>*</span></label>
            <input type="date" id="pay-date" className="form-control" />
          </div>
          <div className="form-group">
            <label htmlFor="pay-amount">Amount Paid (₹) <span style={{"color":"var(--status-danger)"}}>*</span></label>
            <input type="number" id="pay-amount" className="form-control" placeholder="e.g. 420000" />
          </div>
        </div>

        <div className="form-group" style={{"marginBottom":"0.75rem"}}>
          <label htmlFor="pay-receipt">Upload Receipt / Proof</label>
          <input type="file" id="pay-receipt" className="form-control" />
          <div className="field-hint">PDF or Image of bank confirmation. Max 2MB.</div>
        </div>

        <div className="form-group" style={{"marginBottom":"0"}}>
          <label style={{"display":"flex","alignItems":"center","gap":"0.5rem","fontSize":"0.85rem","fontWeight":"normal","cursor":"pointer"}}>
            <input type="checkbox" id="pay-deduct-tds" />
            Deduct TDS at Source? (outstanding will be cleared assuming TDS withholding)
          </label>
        </div>
      </div>

      <div className="modal-footer">
        <button className="btn btn-secondary" onClick={(event) => { window.closePaymentModal() }}>Cancel</button>
        <button className="btn btn-primary" onClick={(event) => { window.confirmPaymentRecord() }}>Record Payment</button>
      </div>
    </div>
  </div>
  
            </div>
        </AuthenticatedLayout>
    </RoleGuard>
    );
}
