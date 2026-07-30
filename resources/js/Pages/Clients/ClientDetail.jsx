import React, { useEffect } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router, usePage } from '@inertiajs/react';
import './ClientDetail.css';

import RoleGuard from '../../Components/RoleGuard.jsx';
import ConfirmDialog from '../../Components/ui/ConfirmDialog';
import Input from '../../Components/ui/Input';
import useToast from '../../Hooks/useToast';
import Modal from '../../Components/ui/Modal';
import Button from '../../Components/ui/Button';
import Badge from '../../Components/ui/Badge';
import { 
  ArrowLeft, Trash2, PauseCircle, PlayCircle, Edit3, Receipt, 
  Building2, Users, FolderOpen, UserCheck, Clock, History, 
  Calendar, Plus, AlertTriangle, CheckCircle2, UserPlus, 
  UploadCloud, FileText, Mail, Phone, CreditCard, Smartphone, MessageSquare, Eye
} from 'lucide-react';

export default function ClientDetail({ client, employees, activityLogs = [] }) {
  const { auth } = usePage().props;
  const { showToast } = useToast();
  const c = client.data || {};
  const [activeTab, setActiveTab] = React.useState('overview');

  const [logCategoryFilter, setLogCategoryFilter] = React.useState('all');
  const [logStartDate, setLogStartDate] = React.useState('');
  const [logEndDate, setLogEndDate] = React.useState('');
  const [selectedLogModal, setSelectedLogModal] = React.useState(null);

  const [deactivateDialog, setDeactivateDialog] = React.useState(false);
  const [deleteDialog, setDeleteDialog] = React.useState({ isOpen: false, confirmText: '', reason: '' });

  const [holidayModalOpen, setHolidayModalOpen] = React.useState(false);
  const [holidayForm, setHolidayForm] = React.useState({ holiday_date: '', name: '', is_optional: false });
  const [holidayProcessing, setHolidayProcessing] = React.useState(false);
  const [holidayError, setHolidayError] = React.useState(null);
  const [deleteHolidayDialog, setDeleteHolidayDialog] = React.useState({ isOpen: false, holiday: null });

  const handleAddHoliday = (e) => {
    e.preventDefault();
    setHolidayProcessing(true);
    setHolidayError(null);

    router.post(route('clients.holidays.store', c.id), holidayForm, {
      onFinish: () => setHolidayProcessing(false),
      onSuccess: (page) => {
        setHolidayModalOpen(false);
        setHolidayForm({ holiday_date: '', name: '', is_optional: false });
        if (page.props.flash?.success) showToast({ type: 'success', title: 'Success', message: page.props.flash.success });
      },
      onError: (errs) => {
        if (errs.holiday_date) {
          setHolidayError(errs.holiday_date);
        } else if (errs.name) {
          setHolidayError(errs.name);
        } else {
          setHolidayError('Failed to add holiday. Please check form inputs.');
        }
      }
    });
  };

  const handleDeleteHoliday = () => {
    if (!deleteHolidayDialog.holiday) return;
    setHolidayProcessing(true);

    router.delete(route('clients.holidays.destroy', [c.id, deleteHolidayDialog.holiday.id]), {
      onFinish: () => setHolidayProcessing(false),
      onSuccess: (page) => {
        setDeleteHolidayDialog({ isOpen: false, holiday: null });
        if (page.props.flash?.success) showToast({ type: 'success', title: 'Success', message: page.props.flash.success });
      },
      onError: (errs) => {
        showToast({ type: 'error', title: 'Error', message: errs.error || 'Failed to delete holiday.' });
      }
    });
  };

  const handleDeactivate = () => {
    router.post(route('clients.deactivate', c.id), {}, {
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
    router.post(route('clients.restore', c.id), {}, {
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

    router.delete(route('clients.destroy', c.id), {
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
    <RoleGuard allowedRoles={['admin', 'manager']} moduleKey="clients">
      <AuthenticatedLayout>
        <Head title={`Client Detail: ${c.company_name}`} />
        <div className="legacy-react-wrapper">
                
      <div style={{"marginBottom":"1.5rem"}}>
        <Link href={route('clients.index')} style={{ fontSize: "0.85rem", fontWeight: "600", display: "inline-flex", alignItems: "center", gap: "5px" }}>
          <ArrowLeft size={14} /> Back to Clients Directory
        </Link>

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
              <button className="btn btn-danger" style={{ backgroundColor: 'var(--status-danger)', color: 'white', borderColor: 'var(--status-danger)', display: 'inline-flex', alignItems: 'center', gap: '5px' }} onClick={() => setDeleteDialog({ isOpen: true, confirmText: '', reason: '' })}>
                <Trash2 size={15} /> Delete
              </button>
            )}
            
            {c.status === 'active' || c.status === 'onboarding' ? (
              <button className="btn btn-warning" style={{ backgroundColor: 'var(--status-warning)', color: 'white', borderColor: 'var(--status-warning)', display: 'inline-flex', alignItems: 'center', gap: '5px' }} onClick={() => setDeactivateDialog(true)}>
                <PauseCircle size={15} /> Deactivate
              </button>
            ) : null}

            {c.status === 'inactive' && auth.user.role === 'admin' ? (
              <button className="btn btn-success" style={{ backgroundColor: 'var(--status-success)', color: 'white', borderColor: 'var(--status-success)', display: 'inline-flex', alignItems: 'center', gap: '5px' }} onClick={handleRestore}>
                <PlayCircle size={15} /> Restore
              </button>
            ) : null}

            <Link href={route('clients.edit', c.id)} className="btn btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
              <Edit3 size={15} /> Edit Client
            </Link>
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
            onPaste={e => e.preventDefault()}
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
          <li className={activeTab === 'overview' ? 'active' : ''} onClick={() => setActiveTab('overview')} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <Building2 size={15} /> Overview
          </li>
          <li className={activeTab === 'candidates' ? 'active' : ''} onClick={() => setActiveTab('candidates')} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <Users size={15} /> Deployed Candidates ({c.employees_count || 0})
          </li>
          <li className={activeTab === 'invoices' ? 'active' : ''} onClick={() => setActiveTab('invoices')} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <Receipt size={15} /> Invoices & Payments
          </li>
          <li className={activeTab === 'documents' ? 'active' : ''} onClick={() => setActiveTab('documents')} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <FolderOpen size={15} /> Documents ({c.documents?.length || 0})
          </li>
          <li className={activeTab === 'contacts' ? 'active' : ''} onClick={() => setActiveTab('contacts')} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <UserCheck size={15} /> Contacts ({c.contacts?.length || 0})
          </li>
          <li className={activeTab === 'sla' ? 'active' : ''} onClick={() => setActiveTab('sla')} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <Clock size={15} /> SLA & Settings
          </li>
          <li className={activeTab === 'activity' ? 'active' : ''} onClick={() => setActiveTab('activity')} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <History size={15} /> Activity Log
          </li>
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

              {/* Client Holiday Calendar */}
              <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                  <h3 style={{ fontSize: '1.05rem', margin: 0, color: 'var(--primary-navy)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Calendar size={18} /> Client Holiday Calendar
                  </h3>
                  <Button variant="primary" size="sm" onClick={() => { setHolidayError(null); setHolidayModalOpen(true); }} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <Plus size={14} /> Add Holiday
                  </Button>
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                  Configured paid holidays for {c.company_name}. AttendanceResolutionService automatically applies these holidays during payroll run resolution.
                </p>
                <div className="overflow-x-auto">
                  <table className="data-table w-full" style={{ fontSize: '0.85rem' }}>
                    <thead>
                      <tr>
                        <th>Holiday Date</th>
                        <th>Holiday Name</th>
                        <th>Type</th>
                        <th style={{ textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(!c.holidays || c.holidays.length === 0) ? (
                        <tr>
                          <td colSpan="4" style={{ textAlign: 'center', padding: '1.5rem', color: '#94A3B8' }}>
                            No holidays configured for this client yet. Click "+ Add Holiday" to configure holidays.
                          </td>
                        </tr>
                      ) : (
                        c.holidays.map((h) => (
                          <tr key={h.id}>
                            <td><strong className="font-mono">{h.holiday_date}</strong></td>
                            <td>{h.name}</td>
                            <td>
                              <Badge variant={h.is_optional ? 'warning' : 'success'}>
                                {h.is_optional ? 'Optional' : 'Mandatory'}
                              </Badge>
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              <Button
                                size="sm"
                                variant="danger"
                                onClick={() => setDeleteHolidayDialog({ isOpen: true, holiday: h })}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                              >
                                <Trash2 size={13} /> Delete
                              </Button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
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
                  <AlertTriangle size={16} />
                  <span><strong>Warning:</strong> PO Value is critically low or exhausted. Invoicing may be blocked.</span>
                </div>
              </div>
            </div>

            {/*  Right Col  */}
            <div style={{"display":"flex","flexDirection":"column","gap":"1.5rem"}}>
              <div className="card" style={{"borderLeft":"3px solid var(--status-success)"}}>
                <h3 style={{"fontSize":"1.05rem","marginBottom":"1rem"}}>Onboarding Status</h3>
                <div style={{"display":"flex","flexDirection":"column","gap":"0.5rem","fontSize":"0.85rem"}}>
                  <div style={{"display":"flex","alignItems":"center","gap":"0.5rem"}}>
                    <CheckCircle2 size={15} color="var(--status-success)" /> Company Identity Configured
                  </div>
                  <div style={{"display":"flex","alignItems":"center","gap":"0.5rem"}}>
                    <CheckCircle2 size={15} color="var(--status-success)" /> Contacts Added
                  </div>
                  <div style={{"display":"flex","alignItems":"center","gap":"0.5rem"}}>
                    <CheckCircle2 size={15} color="var(--status-success)" /> Billing Terms Agreed
                  </div>
                  <div style={{"display":"flex","alignItems":"center","gap":"0.5rem"}}>
                    <CheckCircle2 size={15} color="var(--status-success)" /> Statutory Defaults Set
                  </div>
                  <div style={{"display":"flex","alignItems":"center","gap":"0.5rem"}}>
                    <CheckCircle2 size={15} color="var(--status-success)" /> Critical Documents Uploaded
                  </div>
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
             <Link href={route('employees.create')} className="btn btn-primary btn-xs" style={{ padding: "0.4rem 0.75rem", display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
               <UserPlus size={14} /> Add Candidate
             </Link>
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
                      <td>
                        <Link href={route('employees.show', emp.id)} className="font-mono text-xs text-slate-600 hover:text-indigo-600 hover:underline">
                          {emp.employee_code || 'N/A'}
                        </Link>
                      </td>
                      <td>
                        <Link href={route('employees.show', emp.id)} className="font-bold text-[#1F3864] hover:text-indigo-600 hover:underline">
                          {emp.full_name}
                        </Link>
                      </td>
                      <td>{emp.designation || 'N/A'}</td>
                      <td>{emp.gross_monthly_salary ? `₹${parseFloat(emp.gross_monthly_salary).toLocaleString('en-IN')}` : 'N/A'}</td>
                      <td>
                        {emp.pf_applicable ? <span className="badge badge-success" style={{marginRight: '4px'}}>PF</span> : null}
                        {emp.esi_applicable ? <span className="badge badge-success" style={{marginRight: '4px'}}>ESI</span> : null}
                        {emp.tds_applicable ? <span className="badge badge-success">TDS</span> : null}
                      </td>
                      <td>{formatDate(emp.date_of_joining) || 'N/A'}</td>
                      <td><span className={`badge badge-${emp.status === 'active' ? 'success' : 'secondary'}`} style={{textTransform: 'capitalize'}}>{emp.status}</span></td>
                       <td><Link href={route('employees.show', emp.id)} className="btn btn-secondary btn-xs">View Profile</Link></td>
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
                {c.invoices && c.invoices.length > 0 ? (
                  c.invoices.map(inv => {
                    const totalAmt = parseFloat(inv.grand_total || 0);
                    const marginAmt = parseFloat(inv.agency_service_fee || 0);
                    const penaltyAmt = parseFloat(inv.late_penalty_amount || 0);
                    
                    return (
                      <tr key={inv.id}>
                        <td><strong>{inv.invoice_number}</strong></td>
                        <td>{formatDate(inv.invoice_month) || inv.invoice_month}</td>
                        <td>{formatDate(inv.created_at)}</td>
                        <td>{formatDate(inv.due_date)}</td>
                        <td>
                          <strong>₹{Math.round(totalAmt).toLocaleString('en-IN')}</strong>
                          {penaltyAmt > 0 && (
                            <div style={{ fontSize: '0.72rem', color: 'var(--status-danger)' }}>
                              +₹{Math.round(penaltyAmt).toLocaleString('en-IN')} late fee
                            </div>
                          )}
                        </td>
                        <td>₹{Math.round(marginAmt).toLocaleString('en-IN')}</td>
                        <td>
                          <span className={`badge badge-${inv.status === 'paid' ? 'success' : inv.status === 'overdue' ? 'danger' : 'warning'}`} style={{ textTransform: 'capitalize' }}>
                            {inv.status}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '0.4rem' }}>
                            <button className="btn btn-secondary btn-xs" title="Download Invoice" onClick={() => showToast({ type: 'info', title: 'Download Triggered', message: 'Downloading invoice PDF...' })}>Download</button>
                            {inv.status !== 'paid' && (
                              <button className="btn btn-navy btn-xs" onClick={() => showToast({ type: 'info', title: 'Payment Window', message: 'Please record payment through the Invoices Registry page.' })}>Record Payment</button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="8" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                      No invoices available for this client.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/*  Tab 4: Documents  */}
        <div className={`tab-content ${activeTab === 'documents' ? 'active' : ''}`} style={{ display: activeTab === 'documents' ? 'block' : 'none' }}>
          <div style={{"display":"flex","justifyContent":"flex-end","marginBottom":"1.5rem"}}>
            <button className="btn btn-primary btn-xs" style={{ padding: "0.4rem 0.75rem", display: 'inline-flex', alignItems: 'center', gap: '4px' }}
              onClick={(event) => { document.getElementById('doc-upload-input').click() }}>
              <UploadCloud size={14} /> Upload Document
            </button>
            <input type="file" id="doc-upload-input" style={{"display":"none"}} onChange={(event) => { alert('Upload successful!') }} />
          </div>

          <div className="grid-cols-4" id="document-grid-container" style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))' }}>
            {c.documents && c.documents.length > 0 ? (
              c.documents.map(doc => (
                <div key={doc.id} className="card metric-card" style={{ background: '#FAFBFC', border: '1px solid var(--border-color)', padding: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <strong style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.9rem', wordBreak: 'break-word' }}>
                      <FileText size={16} color="var(--primary-navy)" /> {doc.document_type}
                    </strong>
                    {doc.verification_status === 'verified' ? (
                      <span className="badge badge-success" style={{ fontSize: '0.7rem' }}>Verified</span>
                    ) : (
                      <span className="badge badge-warning" style={{ fontSize: '0.7rem' }}>Pending</span>
                    )}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>Uploaded: {formatDate(doc.created_at)}</div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                     <a href={route('clients.documents.download', { client: c.id, document: doc.id })} target="_blank" rel="noreferrer" className="btn btn-secondary btn-xs" style={{ flex: 1, textAlign: 'center' }}>Download</a>
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
              c.contacts.map(contact => {
                const prefsArray = Array.isArray(contact.communication_preferences) ? contact.communication_preferences : [];
                const hasEmail = contact.preference_email !== false && contact.preference_email !== 0;
                const hasSms = Boolean(contact.preference_sms) || prefsArray.includes('SMS');
                const hasWa = Boolean(contact.preference_whatsapp) || prefsArray.includes('WhatsApp') || prefsArray.includes('wa');

                return (
                  <div key={contact.id} className="card metric-card" style={{ background: '#FAFBFC', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                        <strong style={{ fontSize: '0.95rem', color: 'var(--primary-navy)' }}>{contact.full_name}</strong>
                        <span className="badge badge-secondary" style={{ textTransform: 'capitalize', fontSize: '0.72rem' }}>{contact.contact_type}</span>
                      </div>
                      <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{contact.designation || 'No designation'}</div>
                      <div style={{ marginTop: '0.6rem', fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Mail size={13} color="var(--primary-navy)" /> <span>{contact.email || 'N/A'}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Phone size={13} color="var(--primary-navy)" /> <span>{contact.phone || 'N/A'}</span>
                        </div>
                      </div>
                    </div>

                    <div style={{ marginTop: '0.85rem', paddingTop: '0.6rem', borderTop: '1px dashed var(--border-color)' }}>
                      <div style={{ fontSize: '0.73rem', fontWeight: '600', color: 'var(--primary-navy)', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <MessageSquare size={12} /> Communication Preferences
                      </div>
                      <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                        {hasEmail && (
                          <span className="badge" style={{ background: '#EEF2FF', color: '#4338CA', fontSize: '0.7rem', display: 'inline-flex', alignItems: 'center', gap: '3px', padding: '0.15rem 0.45rem', borderRadius: '4px' }}>
                            <Mail size={11} /> Email
                          </span>
                        )}
                        {hasSms && (
                          <span className="badge" style={{ background: '#F0F9FF', color: '#0369A1', fontSize: '0.7rem', display: 'inline-flex', alignItems: 'center', gap: '3px', padding: '0.15rem 0.45rem', borderRadius: '4px' }}>
                            <Smartphone size={11} /> SMS
                          </span>
                        )}
                        {hasWa && (
                          <span className="badge" style={{ background: '#DCFCE7', color: '#15803D', fontSize: '0.7rem', display: 'inline-flex', alignItems: 'center', gap: '3px', padding: '0.15rem 0.45rem', borderRadius: '4px' }}>
                            <MessageSquare size={11} /> WhatsApp
                          </span>
                        )}
                        {Boolean(contact.cc_on_invoice) && (
                          <span className="badge" style={{ background: '#FEF3C7', color: '#B45309', fontSize: '0.7rem', padding: '0.15rem 0.45rem', borderRadius: '4px' }}>
                            CC on Invoice
                          </span>
                        )}
                        {Boolean(contact.receive_onboarding_kits) && (
                          <span className="badge" style={{ background: '#F3E8FF', color: '#6B21A8', fontSize: '0.7rem', padding: '0.15rem 0.45rem', borderRadius: '4px' }}>
                            Onboarding Kits
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', gridColumn: '1 / -1' }}>No contacts have been added.</div>
            )}
          </div>
        </div>

        {/*  Tab 6: Activity Log  */}
        <div className={`tab-content ${activeTab === 'activity' ? 'active' : ''}`} style={{ display: activeTab === 'activity' ? 'block' : 'none' }}>
          {(() => {
            const filteredLogs = (activityLogs || []).filter(log => {
              if (logCategoryFilter !== 'all' && log.category !== logCategoryFilter) return false;
              if (logStartDate && log.date_raw && log.date_raw < logStartDate) return false;
              if (logEndDate && log.date_raw && log.date_raw > logEndDate) return false;
              return true;
            });

            return (
              <>
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 mb-6 flex flex-wrap gap-4 items-end">
                  <div className="flex-1 min-w-[160px]">
                    <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Log Type / Category</label>
                    <select 
                      className="form-control w-full text-xs" 
                      value={logCategoryFilter} 
                      onChange={(e) => setLogCategoryFilter(e.target.value)}
                    >
                      <option value="all">All Categories</option>
                      <option value="Client Profile">Client Profile</option>
                      <option value="Billing">Billing &amp; Invoicing</option>
                      <option value="Compliance">Compliance &amp; Docs</option>
                      <option value="Portal">Portal &amp; Employees</option>
                      <option value="Account Manager">Account Manager</option>
                    </select>
                  </div>
                  <div className="flex-1 min-w-[160px]">
                    <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Start Date</label>
                    <input 
                      type="date" 
                      className="form-control w-full text-xs" 
                      value={logStartDate} 
                      onChange={(e) => setLogStartDate(e.target.value)} 
                    />
                  </div>
                  <div className="flex-1 min-w-[160px]">
                    <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">End Date</label>
                    <input 
                      type="date" 
                      className="form-control w-full text-xs" 
                      value={logEndDate} 
                      onChange={(e) => setLogEndDate(e.target.value)} 
                    />
                  </div>
                  {(logCategoryFilter !== 'all' || logStartDate || logEndDate) && (
                    <button 
                      type="button" 
                      className="btn btn-secondary btn-xs"
                      onClick={() => { setLogCategoryFilter('all'); setLogStartDate(''); setLogEndDate(''); }}
                    >
                      Reset Filters
                    </button>
                  )}
                </div>
                
                <div className="card p-0 overflow-hidden">
                  <table className="table w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase text-[11px]">
                      <tr>
                        <th className="py-3 px-4">Timestamp</th>
                        <th className="py-3 px-4">Performed By</th>
                        <th className="py-3 px-4">Category</th>
                        <th className="py-3 px-4">Action &amp; Details</th>
                        <th className="py-3 px-4">IP Address</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredLogs.length > 0 ? (
                        filteredLogs.map(log => (
                          <tr 
                            key={log.id} 
                            onClick={() => setSelectedLogModal(log)}
                            className="hover:bg-indigo-50/50 transition-colors cursor-pointer"
                            title="Click to view full field modification details"
                          >
                            <td className="py-3 px-4 font-mono text-slate-600 whitespace-nowrap">{log.created_at}</td>
                            <td className="py-3 px-4">
                              <div className="font-bold text-slate-900">{log.user}</div>
                              <div className="text-[10px] text-slate-400 font-mono">{log.user_email}</div>
                            </td>
                            <td className="py-3 px-4">
                              <Badge type={log.category === 'Billing' ? 'success' : log.category === 'Compliance' ? 'warning' : 'info'}>
                                {log.category}
                              </Badge>
                            </td>
                            <td className="py-3 px-4">
                              <div className="font-bold text-[#1F3864] mb-0.5">{log.action}</div>
                              <div className="text-slate-600 text-[11px] leading-snug">{log.details}</div>
                            </td>
                            <td className="py-3 px-4 font-mono text-slate-400 text-[11px]">{log.ip_address}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="5" className="text-center py-8 text-slate-400">
                            No activity logs found matching the selected filters.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Detailed Audit Log Modal */}
                <Modal 
                  show={Boolean(selectedLogModal)} 
                  onClose={() => setSelectedLogModal(null)} 
                  title="Activity Change Details"
                  maxWidth="2xl"
                >
                  {selectedLogModal && (
                    <div className="p-6 space-y-6">
                      {/* Metadata Header Card */}
                      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold text-slate-500 font-mono">{selectedLogModal.created_at}</span>
                          <Badge type={selectedLogModal.category === 'Billing' ? 'success' : selectedLogModal.category === 'Compliance' ? 'warning' : 'info'}>
                            {selectedLogModal.category}
                          </Badge>
                        </div>
                        <h3 className="text-lg font-bold text-[#1F3864] mb-1">{selectedLogModal.action}</h3>
                        <div className="text-xs text-slate-600 flex flex-wrap gap-x-4 gap-y-1 mt-2 border-t border-slate-200/80 pt-2">
                          <span><strong>User:</strong> {selectedLogModal.user} ({selectedLogModal.user_email})</span>
                          <span><strong>IP Address:</strong> {selectedLogModal.ip_address}</span>
                        </div>
                      </div>

                      {/* Field Changes Table */}
                      <div>
                        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                          <History size={14} className="text-indigo-600" /> Exact Field Modifications
                        </h4>
                        {selectedLogModal.changes && selectedLogModal.changes.length > 0 ? (
                          <div className="border border-slate-200 rounded-lg overflow-hidden">
                            <table className="w-full text-left text-xs">
                              <thead className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold uppercase text-[10px]">
                                <tr>
                                  <th className="py-2.5 px-4">Field Name</th>
                                  <th className="py-2.5 px-4 text-rose-700">Previous Value (Before)</th>
                                  <th className="py-2.5 px-4 text-emerald-700">Updated Value (After)</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 bg-white">
                                {selectedLogModal.changes.map((chg, idx) => (
                                  <tr key={idx} className="hover:bg-slate-50/50">
                                    <td className="py-2.5 px-4 font-semibold text-slate-800">{chg.field}</td>
                                    <td className="py-2.5 px-4 font-mono text-rose-600 bg-rose-50/30">{chg.old_value || '—'}</td>
                                    <td className="py-2.5 px-4 font-mono text-emerald-600 bg-emerald-50/30">{chg.new_value || '—'}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-slate-600 text-xs">
                            <strong>Summary Details:</strong> {selectedLogModal.details}
                          </div>
                        )}
                      </div>

                      <div className="flex justify-end pt-2">
                        <Button variant="secondary" onClick={() => setSelectedLogModal(null)}>Close</Button>
                      </div>
                    </div>
                  )}
                </Modal>
              </>
            );
          })()}
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
                <div><strong>Weekly Off Pattern:</strong> <strong style={{ color: 'var(--primary-navy)' }}>{c.weekly_off_pattern || 'sat,sun'}</strong></div>
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
        <h3 style={{"margin":"0","fontSize":"1.15rem", display: 'flex', alignItems: 'center', gap: '6px'}}>
          <CreditCard size={18} /> Record Invoice Payment
        </h3>
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
        {/* Add Holiday Modal */}
        <Modal
          isOpen={holidayModalOpen}
          onClose={() => setHolidayModalOpen(false)}
          title={`Add Holiday for ${c.company_name}`}
        >
          <form onSubmit={handleAddHoliday} className="space-y-4 py-2">
            {holidayError && (
              <div className="p-3 bg-red-50 text-red-600 text-xs rounded border border-red-200">
                {holidayError}
              </div>
            )}
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Holiday Date *</label>
              <input
                type="date"
                className="form-control w-full text-sm"
                value={holidayForm.holiday_date}
                onChange={e => setHolidayForm({ ...holidayForm, holiday_date: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Holiday Name *</label>
              <input
                type="text"
                className="form-control w-full text-sm"
                placeholder="e.g. Independence Day"
                value={holidayForm.name}
                onChange={e => setHolidayForm({ ...holidayForm, name: e.target.value })}
                required
              />
            </div>
            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="is_optional"
                checked={holidayForm.is_optional}
                onChange={e => setHolidayForm({ ...holidayForm, is_optional: e.target.checked })}
              />
              <label htmlFor="is_optional" className="text-sm text-gray-700">Optional / Floating Holiday</label>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
              <Button variant="secondary" size="sm" type="button" onClick={() => setHolidayModalOpen(false)}>Cancel</Button>
              <Button variant="primary" size="sm" type="submit" disabled={holidayProcessing}>
                {holidayProcessing ? 'Saving...' : 'Save Holiday'}
              </Button>
            </div>
          </form>
        </Modal>

        {/* Delete Holiday Confirm Dialog */}
        <Modal
          isOpen={deleteHolidayDialog.isOpen}
          onClose={() => setDeleteHolidayDialog({ isOpen: false, holiday: null })}
          title="Delete Client Holiday"
        >
          <div className="py-2 space-y-4">
            <p className="text-sm text-gray-600">
              Are you sure you want to delete the holiday <strong>{deleteHolidayDialog.holiday?.name}</strong> on <strong>{deleteHolidayDialog.holiday?.holiday_date}</strong> for {c.company_name}?
            </p>
            <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded border border-amber-200">
              Note: Deleting a holiday will update future payroll attendance resolution for un-processed days. Locked historical payroll runs will remain immutable.
            </p>
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
              <Button variant="secondary" size="sm" onClick={() => setDeleteHolidayDialog({ isOpen: false, holiday: null })}>Cancel</Button>
              <Button variant="danger" size="sm" onClick={handleDeleteHoliday} disabled={holidayProcessing}>
                {holidayProcessing ? 'Deleting...' : 'Confirm Delete'}
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </AuthenticatedLayout>
  </RoleGuard>
  );
}
