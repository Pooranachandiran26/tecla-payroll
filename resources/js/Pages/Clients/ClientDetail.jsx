import React, { useEffect } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router, usePage } from '@inertiajs/react';
import './ClientDetail.css';

import RoleGuard from '../../Components/RoleGuard.jsx';
import ConfirmDialog from '../../Components/ui/ConfirmDialog';
import Input from '../../Components/ui/Input';
import useToast from '../../Hooks/useToast';

export default function ClientDetail({ client, employees }) {
  const { auth } = usePage().props;
  const { showToast } = useToast();
  const c = client.data || {};
  const [activeTab, setActiveTab] = React.useState('overview');

  const [deactivateDialog, setDeactivateDialog] = React.useState(false);
  const [deleteDialog, setDeleteDialog] = React.useState({ isOpen: false, confirmText: '', reason: '' });

  const handleDeactivate = () => {
    router.post(`/clients/${c.id}/deactivate`, {}, {
      onSuccess: () => {
        setDeactivateDialog(false);
        showToast({ type: 'success', title: 'Success', message: 'Client deactivated successfully.' });
      },
      onError: (errors) => {
        showToast({ type: 'error', title: 'Error', message: errors.error || 'Failed to deactivate client.' });
      }
    });
  };

  const handleRestore = () => {
    router.post(`/clients/${c.id}/restore`, {}, {
      onSuccess: () => {
        showToast({ type: 'success', title: 'Success', message: 'Client restored successfully.' });
      },
      onError: (errors) => {
        showToast({ type: 'error', title: 'Error', message: errors.error || 'Failed to restore client.' });
      }
    });
  };

  const handleDelete = () => {
    if (deleteDialog.confirmText !== 'DELETE') {
      showToast({ type: 'error', title: 'Error', message: 'Please type DELETE exactly.' });
      return;
    }
    if (deleteDialog.reason.length < 10) {
      showToast({ type: 'error', title: 'Error', message: 'Reason must be at least 10 characters.' });
      return;
    }

    router.delete(`/clients/${c.id}`, {
      data: {
        confirm_text: deleteDialog.confirmText,
        reason: deleteDialog.reason
      },
      onSuccess: () => {
        setDeleteDialog({ isOpen: false, confirmText: '', reason: '' });
        showToast({ type: 'success', title: 'Success', message: 'Client deleted successfully.' });
      },
      onError: (errors) => {
        showToast({ type: 'error', title: 'Error', message: errors.error || 'Failed to delete client.' });
      }
    });
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const mNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${String(d.getDate()).padStart(2, '0')} ${mNames[d.getMonth()]} ${d.getFullYear()}`;
  };

  return (
    <RoleGuard allowedRoles={['admin', 'manager']}>
      <AuthenticatedLayout>
        <Head title={`Client Detail: ${c.company_name}`} />
        <div className="legacy-react-wrapper">
                
      <div style={{"marginBottom":"1.5rem"}}>
        <a href="/clients" style={{"fontSize":"0.85rem","fontWeight":"600"}}>← Back to Clients Directory</a>

        <div className="client-header-container">
          <div>
            <div className="client-title-row">
              <h2>{c.company_name}</h2>
              <span className={`badge badge-${c.status === 'active' ? 'success' : c.status === 'suspended' ? 'warning' : 'secondary'} badge-status-lg`} id="current-status-badge">● {c.status}</span>
            </div>
            <div className="quick-meta">
              <span><strong>Client Code:</strong> {c.client_code}</span>
              <span><strong>Type:</strong> {c.contract_type}</span>
              <span><strong>Industry:</strong> {c.industry || 'N/A'}</span>
              <span><strong>Client Since:</strong> {formatDate(c.contract_start_date) || 'N/A'}</span>
            </div>
          </div>
          <div style={{"display":"flex","gap":"0.75rem","alignItems":"center"}}>
            {auth.user.role === 'admin' && (
              <button className="btn btn-danger" style={{ backgroundColor: 'var(--status-danger)', color: 'white', borderColor: 'var(--status-danger)' }} onClick={() => setDeleteDialog({ isOpen: true, confirmText: '', reason: '' })}>🗑️ Delete</button>
            )}
            
            {c.status === 'active' || c.status === 'onboarding' ? (
              <button className="btn btn-warning" style={{ backgroundColor: 'var(--status-warning)', color: 'white', borderColor: 'var(--status-warning)' }} onClick={() => setDeactivateDialog(true)}>⏸️ Deactivate</button>
            ) : null}

            {c.status === 'inactive' && auth.user.role === 'admin' ? (
              <button className="btn btn-success" style={{ backgroundColor: 'var(--status-success)', color: 'white', borderColor: 'var(--status-success)' }} onClick={handleRestore}>▶️ Restore</button>
            ) : null}

            <Link href={`/clients/${c.id}/edit`} className="btn btn-secondary">✏️ Edit Client</Link>
            <button className="btn btn-primary" title="Invoicing not built yet">🧾 Generate Invoice</button>
          </div>
        </div>
        
        {/*  Alert Banners  */}
        <div id="alert-banner-container" style={{"display":"flex","flexDirection":"column","gap":"0.5rem","marginTop":"1rem","marginBottom":"1rem"}}></div>
      </div>

      <ConfirmDialog
        isOpen={deactivateDialog}
        title="Deactivate Client"
        message="Are you sure you want to deactivate this client? Active employees will not be affected, but portal access and billing may be restricted."
        onClose={() => setDeactivateDialog(false)}
        onConfirm={handleDeactivate}
        confirmLabel="Deactivate"
        variant="warning"
      />

      <ConfirmDialog
        isOpen={deleteDialog.isOpen}
        title="Permanently Delete Client"
        message={`WARNING: You are about to permanently delete ${c.company_name}. This is a destructive operation.`}
        onClose={() => setDeleteDialog({ isOpen: false, confirmText: '', reason: '' })}
        onConfirm={handleDelete}
        confirmLabel="Permanent Delete"
        variant="danger"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            This action will cascade soft-deletes to all branches, contacts, and documents. Portal users will be suspended.
          </p>
          <Input 
            label="Type 'DELETE' to confirm" 
            value={deleteDialog.confirmText} 
            onChange={e => setDeleteDialog(prev => ({ ...prev, confirmText: e.target.value }))}
            placeholder="DELETE"
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reason for Deletion (Min 10 chars)</label>
            <textarea 
              className="w-full border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2"
              rows="3"
              value={deleteDialog.reason}
              onChange={e => setDeleteDialog(prev => ({ ...prev, reason: e.target.value }))}
              placeholder="e.g. Contract terminated, offboarding completed..."
            ></textarea>
          </div>
        </div>
      </ConfirmDialog>

      {/*  Tab Container  */}
      <div className="tab-container card" style={{"paddingTop":"0"}}>
        <ul className="tab-headers"
          style={{"padding":"0 1.5rem","background":"#FAFBFC","borderRadius":"var(--radius-md) var(--radius-md) 0 0","margin":"0 -1.5rem 1.5rem -1.5rem"}}>
          <li className={activeTab === 'overview' ? 'active' : ''} onClick={() => setActiveTab('overview')}>Overview</li>
          <li className={activeTab === 'candidates' ? 'active' : ''} onClick={() => setActiveTab('candidates')}>Deployed Candidates ({c.employees_count || 0})</li>
          <li className={activeTab === 'invoices' ? 'active' : ''} onClick={() => setActiveTab('invoices')}>Invoices & Payments</li>
          <li className={activeTab === 'documents' ? 'active' : ''} onClick={() => setActiveTab('documents')}>Documents ({c.documents?.length || 0})</li>
          <li className={activeTab === 'contacts' ? 'active' : ''} onClick={() => setActiveTab('contacts')}>Contacts ({c.contacts?.length || 0})</li>
          <li className={activeTab === 'sla' ? 'active' : ''} onClick={() => setActiveTab('sla')}>SLA & Settings</li>
          <li className={activeTab === 'activity' ? 'active' : ''} onClick={() => setActiveTab('activity')}>Activity Log</li>
        </ul>

        {/*  Tab 1: Overview  */}
        <div className={`tab-content ${activeTab === 'overview' ? 'active' : ''}`} style={{ display: activeTab === 'overview' ? 'block' : 'none' }}>

          <div className="grid-cols-4" style={{"marginBottom":"2rem"}}>
            <div className="card metric-card" style={{"background":"#FAFBFC","border":"none"}}>
              <span className="metric-label">Outstanding Dues</span>
              <span className="metric-value" style={{"color":"var(--text-color)"}} id="metric-outstanding">—</span>
              <span className="metric-trend" id="metric-credit-limit">Credit Limit: {c.credit_limit ? `₹${c.credit_limit}` : '—'}</span>
            </div>
            <div className="card metric-card" style={{"background":"#FAFBFC","border":"none"}}>
              <span className="metric-label">Active Candidates</span>
              <span className="metric-value" id="metric-active-candidates">{c.employees_count || 0}</span>
              <span className="metric-trend trend-up" id="metric-active-trend">—</span>
            </div>
            <div className="card metric-card" style={{"background":"#FAFBFC","border":"none"}}>
              <span className="metric-label">Credit Utilization</span>
              <span className="metric-value" id="metric-credit-utilization">—</span>
              <span className="metric-trend" id="metric-credit-util-bar" style={{"display":"block","background":"#E2E8F0","borderRadius":"4px","height":"6px","marginTop":"0.4rem","overflow":"hidden"}}><span id="metric-credit-util-fill" style={{"display":"block","background":"transparent","height":"100%","width":"0%"}}></span></span>
            </div>
            <div className="card metric-card" style={{"background":"#FAFBFC","border":"none"}}>
              <span className="metric-label">YTD Invoiced (2026)</span>
              <span className="metric-value" id="metric-ytd-invoiced">—</span>
              <span className="metric-trend"><span className="badge badge-success" id="metric-contract-expiry" style={{"fontSize":"0.72rem","padding":"0.2rem 0.4rem"}}>Contract: {formatDate(c.contract_end_date) || '—'}</span></span>
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
                  <div><strong>Company Type:</strong> <span style={{textTransform: 'capitalize'}}>{c.company_type || 'N/A'}</span></div>
                  <div><strong>Group Company:</strong> {c.is_group_company ? 'Yes' : 'No'}</div>
                  <div><strong>GSTIN:</strong> {c.gstin || 'N/A'}</div>
                  <div><strong>PAN:</strong> {c.pan_number || 'N/A'}</div>
                  <div><strong>Billing Model:</strong> <span style={{textTransform: 'capitalize'}}>{c.billing_model || 'N/A'}</span></div>
                  <div><strong>Invoice Cycle:</strong> <span style={{textTransform: 'capitalize'}}>{c.invoice_cycle || 'N/A'}</span></div>
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
        <div className={`tab-content ${activeTab === 'candidates' ? 'active' : ''}`} style={{ display: activeTab === 'candidates' ? 'block' : 'none' }}>
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
            <a href="/employees/create" className="btn btn-primary btn-xs" style={{"padding":"0.4rem 0.75rem"}}>➕ Add Candidate</a>
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
                {employees && employees.data && employees.data.length > 0 ? (
                  employees.data.map(emp => (
                    <tr key={emp.id}>
                      <td>{emp.employee_code || 'N/A'}</td>
                      <td><strong>{emp.first_name} {emp.last_name}</strong></td>
                      <td>{emp.designation || 'N/A'}</td>
                      <td>{emp.gross_salary ? `₹${parseFloat(emp.gross_salary).toLocaleString('en-IN')}` : 'N/A'}</td>
                      <td>
                        {emp.pf_applicable ? <span className="badge badge-success" style={{marginRight: '4px'}}>PF</span> : null}
                        {emp.esi_applicable ? <span className="badge badge-success" style={{marginRight: '4px'}}>ESI</span> : null}
                        {emp.tds_applicable ? <span className="badge badge-success">TDS</span> : null}
                      </td>
                      <td>{formatDate(emp.date_of_joining) || 'N/A'}</td>
                      <td><span className={`badge badge-${emp.status === 'active' ? 'success' : 'secondary'}`} style={{textTransform: 'capitalize'}}>{emp.status}</span></td>
                      <td><a href={`/employees/${emp.id}`} className="btn btn-secondary btn-xs">View Profile</a></td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="8" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                      No candidates have been deployed to this client yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          {employees && employees.links && employees.links.length > 3 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.25rem', marginTop: '1.5rem' }}>
              {employees.links.map((link, idx) => (
                link.url ? (
                  <Link 
                    key={idx}
                    href={link.url}
                    preserveState
                    preserveScroll
                    className={`btn btn-xs ${link.active ? 'btn-primary' : 'btn-secondary'}`}
                    dangerouslySetInnerHTML={{ __html: link.label }}
                  />
                ) : (
                  <span 
                    key={idx}
                    className="btn btn-xs btn-secondary" 
                    style={{ opacity: 0.5, cursor: 'not-allowed' }}
                    dangerouslySetInnerHTML={{ __html: link.label }}
                  />
                )
              ))}
            </div>
          )}
        </div>

        {/*  Tab 3: Invoices & Payments  */}
        <div className={`tab-content ${activeTab === 'invoices' ? 'active' : ''}`} style={{ display: activeTab === 'invoices' ? 'block' : 'none' }}>
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
        <div className={`tab-content ${activeTab === 'documents' ? 'active' : ''}`} style={{ display: activeTab === 'documents' ? 'block' : 'none' }}>
          <div style={{"display":"flex","justifyContent":"flex-end","marginBottom":"1.5rem"}}>
            <button className="btn btn-primary btn-xs" style={{"padding":"0.4rem 0.75rem"}}
              onClick={(event) => { document.getElementById('doc-upload-input').click() }}>➕ Upload Document</button>
            <input type="file" id="doc-upload-input" style={{"display":"none"}} onChange={(event) => { alert('Upload successful!') }} />
          </div>

          <div className="grid-cols-4" id="document-grid-container" style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))' }}>
            {c.documents && c.documents.length > 0 ? (
              c.documents.map(doc => (
                <div key={doc.id} className="card metric-card" style={{ background: '#FAFBFC', border: '1px solid var(--border-color)', padding: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <strong style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.9rem', wordBreak: 'break-word' }}>📄 {doc.document_type}</strong>
                    {doc.verification_status === 'verified' ? (
                      <span className="badge badge-success" style={{ fontSize: '0.7rem' }}>Verified</span>
                    ) : (
                      <span className="badge badge-warning" style={{ fontSize: '0.7rem' }}>Pending</span>
                    )}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>Uploaded: {formatDate(doc.created_at)}</div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <a href={`/clients/${c.id}/documents/${doc.id}/download`} target="_blank" rel="noreferrer" className="btn btn-secondary btn-xs" style={{ flex: 1, textAlign: 'center' }}>Download</a>
                  </div>
                </div>
              ))
            ) : (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', gridColumn: '1 / -1' }}>No documents uploaded.</div>
            )}
          </div>
        </div>

        {/*  Tab 5: Contacts  */}
        <div className={`tab-content ${activeTab === 'contacts' ? 'active' : ''}`} style={{ display: activeTab === 'contacts' ? 'block' : 'none' }}>
          <div className="grid-cols-3" id="contacts-grid-container" style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
            {c.contacts && c.contacts.length > 0 ? (
              c.contacts.map(contact => (
                <div key={contact.id} className="card metric-card" style={{ background: '#FAFBFC', border: '1px solid var(--border-color)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                    <strong>{contact.full_name}</strong>
                    <span className="badge badge-secondary" style={{ textTransform: 'capitalize' }}>{contact.contact_type}</span>
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{contact.designation || 'No designation'}</div>
                  <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <div>📧 {contact.email || 'N/A'}</div>
                    <div>📞 {contact.phone || 'N/A'}</div>
                  </div>
                </div>
              ))
            ) : (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', gridColumn: '1 / -1' }}>No contacts have been added.</div>
            )}
          </div>
        </div>

        {/*  Tab 6: Activity Log  */}
        <div className={`tab-content ${activeTab === 'activity' ? 'active' : ''}`} style={{ display: activeTab === 'activity' ? 'block' : 'none' }}>
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
        <div className={`tab-content ${activeTab === 'sla' ? 'active' : ''}`} style={{ display: activeTab === 'sla' ? 'block' : 'none' }}>
          <div className="grid-layout" id="sla-grid-container" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            <div className="card">
              <h3 style={{ fontSize: '1.05rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '1rem' }}>Payroll Calendar</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.875rem' }}>
                <div><strong>Cutoff Day:</strong> {c.cutoff_day || 'N/A'}</div>
                <div><strong>Payroll Lock Day:</strong> {c.payroll_lock_day || 'N/A'}</div>
                <div><strong>Invoice Raise Day:</strong> {c.invoice_raise_day || 'N/A'}</div>
                <div><strong>Salary Credit Day:</strong> {c.salary_credit_day || 'N/A'}</div>
                <div><strong>Invoice Dispute Window:</strong> {c.invoice_dispute_window_days !== null && c.invoice_dispute_window_days !== undefined ? `${c.invoice_dispute_window_days} Days` : 'N/A'}</div>
                <div><strong>Payroll Convention:</strong> <span style={{ textTransform: 'capitalize' }}>{c.payroll_convention || 'N/A'}</span></div>
                <div><strong>Notice Period:</strong> {c.notice_period_days || 0} Days</div>
              </div>
            </div>
            <div className="card">
              <h3 style={{ fontSize: '1.05rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '1rem' }}>Account Management</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem', fontSize: '0.875rem' }}>
                <div>
                  <strong style={{ display: 'block', marginBottom: '0.25rem' }}>Primary Account Manager:</strong>
                  {c.account_manager ? c.account_manager.name : 'Unassigned'}
                </div>
                <div>
                  <strong style={{ display: 'block', marginBottom: '0.25rem' }}>Backup Account Manager:</strong>
                  {c.backup_account_manager ? c.backup_account_manager.name : 'Unassigned'}
                </div>
                <div>
                  <strong style={{ display: 'block', marginBottom: '0.25rem' }}>Service Tier:</strong>
                  <span className={`badge badge-${c.sla_tier === 'premium' ? 'primary' : 'secondary'}`} style={{ textTransform: 'capitalize' }}>{c.sla_tier || 'Standard'}</span>
                </div>
              </div>
            </div>
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
