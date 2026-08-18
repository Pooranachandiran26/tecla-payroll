import React, { useEffect, useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router, usePage } from '@inertiajs/react';
import './EmployeeDetail.css';
import useToast from '../../Hooks/useToast';

import RoleGuard from '../../Components/RoleGuard.jsx';
import ComingSoonFeature from '../../Components/ui/ComingSoonFeature';
import ConfirmDialog from '../../Components/ui/ConfirmDialog';
import TaxDeclarationTab from './components/TaxDeclarationTab';
import LoansAndAdvancesTab from './LoansAndAdvancesTab';
import HistoryTimeline from '../../Components/HistoryTimeline';

import { 
  Eye, 
  EyeOff, 
  FileText, 
  Image, 
  Check, 
  X, 
  Upload, 
  ArrowLeft, 
  Mail, 
  TrendingUp, 
  LogOut, 
  Edit, 
  Play, 
  Pause, 
  Trash2, 
  Lock, 
  Folder, 
  AlertTriangle 
} from 'lucide-react';

export default function EmployeeDetail({ employee: empProp }) {
    const employee = empProp?.data || empProp || {};
    const { auth, flash, attendanceRecords, attendanceStats, taxDeclaration, taxComparison, loans, salaryRevisions } = usePage().props;
    const { showToast } = useToast();
    const [deleteDialog, setDeleteDialog] = useState({ isOpen: false, confirmText: '', reason: '' });
    const [resendInviteDialogOpen, setResendInviteDialogOpen] = useState(false);
    const [reactivateDialogOpen, setReactivateDialogOpen] = useState(false);
    const [suspendDialogOpen, setSuspendDialogOpen] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('overview');
    const [showPan, setShowPan] = useState(false);
    const [showAadhaar, setShowAadhaar] = useState(false);
    const [showBankAccount, setShowBankAccount] = useState(false);

    const pendingDocsCount = employee.documents ? employee.documents.filter(d => d.status === 'pending').length : 0;

    const revisionsList = employee.salary_revisions || salaryRevisions || [];
    const latestApproved = revisionsList.find(r => r.status === 'approved');
    const effectiveFromDisplay = latestApproved?.effective_date
      ? new Date(latestApproved.effective_date).toLocaleDateString('en-US', { month: 'long', day: '2-digit', year: 'numeric' })
      : (employee.date_of_joining ? new Date(employee.date_of_joining).toLocaleDateString('en-US', { month: 'long', day: '2-digit', year: 'numeric' }) : 'April 01, 2026');

    useEffect(() => {
        // Load the legacy logic dynamically so it runs on client side after render
        import('./EmployeeDetailLogic.js').then(module => {
            console.log('Legacy logic loaded for EmployeeDetail');
        }).catch(err => console.error('Error loading legacy logic', err));
        
        return () => {
            // Cleanup logic if needed
        };
    }, []);

    
const ALL_DOCUMENTS = [
    { type: "pan_card", name: "PAN Card (copy)", req: "Always Required", isMandatory: true, icon: "file" },
    { type: "aadhaar_card", name: "Aadhaar Card (copy)", req: "Always Required", isMandatory: true, icon: "file" },
    { type: "bank_passbook", name: "Bank Proof (cancelled cheque / passbook)", req: "Always Required", isMandatory: true, icon: "file" },
    { type: "education_certificate", name: "Educational Certificates", req: "Optional", isMandatory: false, icon: "file" },
    { type: "offer_letter", name: "Signed Offer Letter / Employment Contract", req: "Always Required", isMandatory: true, icon: "file" },
    { type: "photo", name: "Photograph", req: "Always Required", isMandatory: true, icon: "image" },
    { type: "relieving_letter", name: "Previous Employer: Relieving Letter", req: "Conditional", isMandatory: true, conditional: true, icon: "file" },
    { type: "previous_payslips", name: "Previous Employer: Last 3 Months Payslips", req: "Conditional", isMandatory: true, conditional: true, icon: "file" },
    { type: "form16", name: "Previous Employer: Form 16", req: "Conditional", isMandatory: true, conditional: true, icon: "file" }
];

const renderDocumentRows = () => {
    let requiredTypes = ["pan_card", "aadhaar_card", "bank_passbook", "offer_letter", "photo"];
    if (employee.prior_employment_flag) {
        requiredTypes.push("relieving_letter", "previous_payslips", "form16");
    }
    // Also include optional
    const displayTypes = [...requiredTypes, "education_certificate"];

    return ALL_DOCUMENTS.filter(doc => displayTypes.includes(doc.type)).map((docDef, index) => {
        const uploadedDoc = employee.documents?.find(d => d.document_type === docDef.type);
        
        let statusBadge = <span className="badge badge-danger">Not Uploaded</span>;
        if (uploadedDoc) {
            if (uploadedDoc.status === "verified") statusBadge = <span className="badge badge-success">Verified</span>;
            else if (uploadedDoc.status === "rejected") statusBadge = <span className="badge badge-danger">Rejected</span>;
            else statusBadge = <span className="badge badge-warning">Pending Verification</span>;
        }

        let requirementBadge = <span className="badge badge-neutral" style={{"fontSize":"0.75rem"}}>{docDef.req}</span>;
        if (docDef.conditional) {
            requirementBadge = <span className="badge badge-gold" style={{"fontSize":"0.75rem"}}>{docDef.req}</span>;
        }

        return (
            <tr key={docDef.type}>
                <td>
                    <div style={{"fontWeight":"600","color":"var(--primary-navy)","display":"flex","alignItems":"center","gap":"0.5rem"}}>
                        <span>{docDef.icon === 'image' ? <Image size={16} className="text-[#1F3864]" /> : <FileText size={16} className="text-[#1F3864]" />}</span> {docDef.name}
                    </div>
                    <div style={{"fontSize":"0.75rem","color":"var(--text-muted)","marginLeft":"1.5rem","marginTop":"0.2rem"}}>
                        PDF, JPG, PNG (Max: 5MB)
                    </div>
                </td>
                <td>{requirementBadge}</td>
                <td>{statusBadge}</td>
                <td style={{"textAlign":"right"}}>
                    <div style={{"display":"flex","gap":"0.4rem","justifyContent":"flex-end","alignItems":"center"}}>
                        {uploadedDoc && (
                            <a 
                                href={route('employees.documents.view', { id: employee.id, docId: uploadedDoc.id })} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="btn btn-xs" 
                                style={{"backgroundColor":"var(--primary-navy)","color":"white","textDecoration":"none","display":"inline-flex","alignItems":"center","gap":"0.25rem"}}
                            >
                                <Eye size={13} /> View
                            </a>
                        )}
                        {uploadedDoc && uploadedDoc.status === "pending" && (
                            <>
                                <button className="btn btn-xs" style={{"backgroundColor":"var(--status-success)","color":"white", display: 'inline-flex', alignItems: 'center', gap: '3px'}} onClick={() => router.put(route('employees.documents.verify', { id: employee.id, docId: uploadedDoc.id }), { status: "verified" }, { preserveScroll: true, preserveState: true })}>
                                    <Check size={13} /> Verify
                                </button>
                                <button className="btn btn-danger btn-xs" style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }} onClick={() => {
                                    const reason = prompt("Rejection Reason:");
                                    if(reason) router.put(route('employees.documents.verify', { id: employee.id, docId: uploadedDoc.id }), { status: "rejected", rejection_reason: reason }, { preserveScroll: true, preserveState: true });
                                }}>
                                    <X size={13} /> Reject
                                </button>
                            </>
                        )}
                        {(!uploadedDoc || uploadedDoc.status === "rejected") && (
                            <div>
                                <input type="file" id={`file_${docDef.type}`} style={{display: "none"}} onChange={(e) => {
                                    if(e.target.files[0]) {
                                        const formData = new FormData();
                                        formData.append("document_type", docDef.type);
                                        formData.append("file", e.target.files[0]);
                                        router.post(route('employees.documents.store', employee.id), formData, { preserveScroll: true, preserveState: true });
                                    }
                                }} />
                                <button className="btn btn-navy btn-xs" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }} onClick={() => document.getElementById(`file_${docDef.type}`).click()}>
                                    <Upload size={13} /> Upload Document
                                </button>
                            </div>
                        )}
                    </div>
                </td>
            </tr>
        );
    });
};

    return (
        <RoleGuard allowedRoles={['admin', 'manager']}>
    <AuthenticatedLayout>
            <Head title="Employee Detail" />
            <div className="legacy-react-wrapper">
                
      <div style={{"marginBottom":"1.5rem"}}>
        <a href={route('employees.index')} style={{"fontSize":"0.85rem","fontWeight":"600", display: 'inline-flex', alignItems: 'center', gap: '5px'}}>
          <ArrowLeft size={14} /> Back to Employees Directory
        </a>
        <div className="flex-row-between" style={{ marginTop: '0.5rem', marginBottom: '0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'nowrap' }}>
            <h2 id="page-emp-name" style={{ margin: 0, whiteSpace: 'nowrap', fontSize: '1.5rem', fontWeight: 800 }}>{employee.full_name || 'Employee Profile'}</h2>
            <span className={`badge badge-${employee.status === 'active' ? 'success' : 'warning'}`} style={{ whiteSpace: 'nowrap' }}>{employee.status ? (employee.status.charAt(0).toUpperCase() + employee.status.slice(1)) : 'Active'}</span>
            {employee.status === 'onboarding' && (
                <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontStyle: 'italic', whiteSpace: 'nowrap' }}>
                  {employee.documents_verified_count || 0}/{employee.documents_required_count || 5} docs verified — {(employee.documents_required_count || 5) - (employee.documents_verified_count || 0)} remaining.
                </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
            {employee.personal_email && !employee.has_logged_in && (
                <button 
                    onClick={() => setResendInviteDialogOpen(true)} 
                    className="btn" 
                    style={{ backgroundColor: 'white', color: 'var(--primary-navy)', border: '1px solid var(--primary-navy)', display: 'inline-flex', alignItems: 'center', gap: '5px', whiteSpace: 'nowrap' }}
                >
                    <Mail size={15} /> Resend Invite
                </button>
            )}
            <a href={route('employees.salary-revision.create', employee.id)} className="btn btn-navy" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', whiteSpace: 'nowrap' }}>
              <TrendingUp size={15} /> Revise Salary
            </a>
            <a href={route('employees.exit.show', { id: employee.id, stage: 1 })} className="btn btn-danger" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', whiteSpace: 'nowrap' }}>
              <LogOut size={15} /> Initiate Exit Process
            </a>
            <Link href={route('employees.edit', employee.id)} className="btn btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', whiteSpace: 'nowrap' }}>
              <Edit size={15} /> Edit Profile
            </Link>
            
            {employee.status === 'onboarding' ? (
              <button 
                  className="btn btn-primary" 
                  style={{ backgroundColor: 'var(--status-success)', color: 'white', borderColor: 'var(--status-success)', display: 'inline-flex', alignItems: 'center', gap: '5px', whiteSpace: 'nowrap' }}
                  onClick={() => setReactivateDialogOpen(true)}
              >
                  <Play size={15} /> Activate Employee
              </button>
            ) : employee.status === 'suspended' ? (
              <button 
                  className="btn btn-primary" 
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', whiteSpace: 'nowrap' }}
                  onClick={() => setReactivateDialogOpen(true)}
              >
                  <Play size={15} /> Reactivate
              </button>
            ) : (
              <button 
                  className="btn btn-warning" 
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', whiteSpace: 'nowrap' }}
                  onClick={() => setSuspendDialogOpen(true)}
              >
                  <Pause size={15} /> Suspend
              </button>
            )}

            {auth.user.role === 'admin' && (
              <button 
                className="btn btn-danger" 
                style={{ backgroundColor: 'var(--status-danger)', color: 'white', borderColor: 'var(--status-danger)', display: 'inline-flex', alignItems: 'center', gap: '5px', whiteSpace: 'nowrap' }} 
                onClick={() => setDeleteDialog({ isOpen: true, confirmText: '', reason: '' })}
              >
                <Trash2 size={15} /> Delete
              </button>
            )}
          </div>
        </div>
      </div>

      <ConfirmDialog 
        isOpen={deleteDialog.isOpen}
        title="Delete Employee"
        message={`Are you sure you want to delete ${employee.full_name || 'this employee'}? This action cannot be undone and will soft-delete the employee and all related records.`}
        onClose={() => setDeleteDialog({ isOpen: false })}
        onConfirm={() => {
          router.delete(route('employees.destroy', employee.id), {
            data: { confirm_text: 'DELETE', reason: 'Deleted by admin via profile' },
            onFinish: () => setDeleteDialog({ isOpen: false })
          });
        }}
        confirmLabel="Delete Employee"
        cancelLabel="Cancel"
        variant="danger"
      />

      {/* Resend Invitation Modal */}
      <ConfirmDialog
        isOpen={resendInviteDialogOpen}
        title="Resend Invitation Email"
        message={`Are you sure you want to resend the invitation email to ${employee.full_name || 'this employee'} (${employee.personal_email})?`}
        confirmLabel="Resend Invite"
        cancelLabel="Cancel"
        variant="primary"
        loading={actionLoading}
        onClose={() => setResendInviteDialogOpen(false)}
        onConfirm={() => {
          setActionLoading(true);
          router.post(route('employees.resend-invitation', employee.id), {}, {
            preserveScroll: true,
            onFinish: () => {
              setActionLoading(false);
              setResendInviteDialogOpen(false);
            },
            onSuccess: (page) => {
              const flash = page.props.flash;
              if (flash?.error) {
                showToast({
                  type: 'error',
                  title: 'Invitation Error',
                  message: flash.error
                });
              } else {
                showToast({
                  type: 'success',
                  title: 'Invitation Sent',
                  message: flash?.success || `Invitation email sent successfully to ${employee.personal_email}`
                });
              }
            },
            onError: (errs) => {
              showToast({
                type: 'error',
                title: 'Send Failed',
                message: errs?.message || 'Failed to send invitation email.'
              });
            }
          });
        }}
      />

      {/* Reactivate Employee Modal */}
      <ConfirmDialog
        isOpen={reactivateDialogOpen}
        title="Reactivate Employee"
        message={`Are you sure you want to reactivate ${employee.full_name || 'this employee'}? Their status will be restored to Active.`}
        confirmLabel="Reactivate Employee"
        cancelLabel="Cancel"
        variant="primary"
        loading={actionLoading}
        onClose={() => setReactivateDialogOpen(false)}
        onConfirm={() => {
          setActionLoading(true);
          router.post(route('employees.activate', employee.id), {}, {
            preserveScroll: true,
            preserveState: true,
            onFinish: () => {
              setActionLoading(false);
              setReactivateDialogOpen(false);
            }
          });
        }}
      />

      {/* Suspend Employee Modal */}
      <ConfirmDialog
        isOpen={suspendDialogOpen}
        title="Suspend Employee"
        message={`Are you sure you want to suspend ${employee.full_name || 'this employee'}? They will be unable to access the portal while suspended.`}
        confirmLabel="Suspend Employee"
        cancelLabel="Cancel"
        variant="warning"
        loading={actionLoading}
        onClose={() => setSuspendDialogOpen(false)}
        onConfirm={() => {
          setActionLoading(true);
          router.post(route('employees.deactivate', employee.id), {}, {
            onFinish: () => {
              setActionLoading(false);
              setSuspendDialogOpen(false);
            }
          });
        }}
      />

      {/*  Tab Container  */}
      <div className="tab-container card">
        <ul className="tab-headers">
          <li className={activeTab === 'overview' ? 'active' : ''} onClick={() => setActiveTab('overview')} style={{ cursor: 'pointer' }}>Overview</li>
          <li className={activeTab === 'salary' ? 'active' : ''} onClick={() => setActiveTab('salary')} style={{ cursor: 'pointer' }}>Salary Structure &amp; History</li>
          <li className={activeTab === 'attendance' ? 'active' : ''} onClick={() => setActiveTab('attendance')} style={{ cursor: 'pointer' }}>Attendance Log ({attendanceStats ? attendanceStats.targetMonthDisplay : 'Current'})</li>
          <li className={activeTab === 'payslips' ? 'active' : ''} onClick={() => setActiveTab('payslips')} style={{ cursor: 'pointer' }}>Generated Payslips</li>
          <li className={activeTab === 'docs' ? 'active' : ''} onClick={() => setActiveTab('docs')} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            Documents
            {pendingDocsCount > 0 && (
                <span style={{ width: '8px', height: '8px', backgroundColor: 'var(--status-danger)', borderRadius: '50%', display: 'inline-block' }} title={`${pendingDocsCount} pending document(s)`}></span>
            )}
          </li>
          <li className={activeTab === 'tax' ? 'active' : ''} onClick={() => setActiveTab('tax')} style={{ cursor: 'pointer' }}>Tax Declaration</li>
          <li className={activeTab === 'loans' ? 'active' : ''} onClick={() => setActiveTab('loans')} style={{ cursor: 'pointer' }}>Loans &amp; Advances</li>
          <li className={activeTab === 'history' ? 'active' : ''} onClick={() => setActiveTab('history')} style={{ cursor: 'pointer' }}>History</li>
        </ul>

        {/*  Tab 1: Overview  */}
        <div className={`tab-content ${activeTab === 'overview' ? 'active' : ''}`} data-tab="overview">
          <div className="grid-layout">

            {/*  Left Profile Panel  */}
            <div style={{"display":"flex","flexDirection":"column","gap":"1.25rem"}}>
              <div style={{"display":"grid","gridTemplateColumns":"1fr 1fr","gap":"1.25rem"}}>
                <div>
                  <h4 className="data-label">Employee Code</h4>
                  <span className="data-value">{employee.employee_code || 'TEC-088'}</span>
                </div>
                <div>
                  <h4 className="data-label">Designation</h4>
                  <span className="data-value" id="display-designation">{employee.designation || 'Senior Developer'}</span>
                </div>
                <div>
                  <h4 className="data-label">Client Assignment</h4>
                  <span className="data-value">{employee.client_name || 'N/A'}</span>
                </div>
                <div>
                  <h4 className="data-label">Date of Joining</h4>
                  <span className="data-value">{employee.date_of_joining || 'N/A'}</span>
                </div>
                <div>
                  <h4 className="data-label">Gender</h4>
                  <span className="data-value" style={{"textTransform": "capitalize"}}>{employee.gender || 'N/A'}</span>
                </div>
                <div>
                  <h4 className="data-label">Blood Group</h4>
                  <span className="data-value">{employee.blood_group || 'N/A'}</span>
                </div>
                <div>
                  <h4 className="data-label">Father's Name</h4>
                  <span className="data-value">{employee.father_name || 'N/A'}</span>
                </div>
                {employee.marital_status === 'married' || employee.spouse_name ? (
                  <div>
                    <h4 className="data-label">Husband / Wife / Spouse Name</h4>
                    <span className="data-value">{employee.spouse_name || 'N/A'}</span>
                  </div>
                ) : (

                  <div>
                    <h4 className="data-label">Mother's Name</h4>
                    <span className="data-value">{employee.mother_name || 'N/A'}</span>
                  </div>
                )}
                <div>
                  <h4 className="data-label">Marital Status</h4>
                  <span className="data-value" style={{"textTransform": "capitalize"}}>{employee.marital_status || 'N/A'}</span>
                </div>
                <div>
                  <h4 className="data-label">PwD Status</h4>
                  <span className="data-value">
                    {employee.is_disabled ? (
                      <span className="badge badge-success" style={{ backgroundColor: "#DCFCE7", color: "#166534", border: "1px solid #86EFAC" }}>
                        PwD Benchmark {employee.disability_percentage ? `(${employee.disability_percentage}%)` : ''} {employee.disability_type ? `• ${employee.disability_type}` : ''}
                      </span>
                    ) : (
                      <span style={{ color: "var(--text-muted)" }}>No Disability (Standard ₹21,000 ESI)</span>
                    )}
                  </span>
                </div>
              </div>

              <hr style={{"border":"0","borderTop":"1px solid var(--border-color)"}} />

              {/*  Contact Details (editable via Edit Profile)  */}
              <div>
                <h4 className="data-label" style={{"marginBottom":"0.75rem"}}>Contact Information</h4>
                <div style={{"display":"grid","gridTemplateColumns":"1fr 1fr","gap":"0.75rem"}}>
                  <div>
                    <div style={{"fontSize":"0.75rem","color":"var(--text-muted)"}}>Personal Email</div>
                    <strong id="display-email" style={{"fontSize":"0.9rem"}}>{employee.personal_email || 'N/A'}</strong>
                  </div>
                  <div>
                    <div style={{"fontSize":"0.75rem","color":"var(--text-muted)"}}>Phone Number</div>
                    <strong id="display-phone" style={{"fontSize":"0.9rem"}}>{employee.phone_number || 'N/A'}</strong>
                  </div>
                  <div>
                    <div style={{"fontSize":"0.75rem","color":"var(--text-muted)"}}>Emergency Contact</div>
                    <strong id="display-emergency" style={{"fontSize":"0.9rem"}}>{employee.emergency_contact_phone || 'N/A'}</strong>
                  </div>
                  <div>
                    <div style={{"fontSize":"0.75rem","color":"var(--text-muted)"}}>Address</div>
                    <strong id="display-address" style={{"fontSize":"0.9rem"}}>{employee.residential_address || 'N/A'}</strong>
                  </div>
                </div>
              </div>

              <hr style={{"border":"0","borderTop":"1px solid var(--border-color)"}} />

              <div>
                <h4 className="data-label" style={{"marginBottom":"0.75rem"}}>Disbursement Bank Details</h4>
                <div style={{"display":"grid","gridTemplateColumns":"repeat(3, 1fr)","gap":"1rem","backgroundColor":"#F8FAFC","padding":"1rem","borderRadius":"var(--radius-sm)","border":"1px solid var(--border-color)"}}>
                  <div>
                    <div style={{"fontSize":"0.75rem","color":"var(--text-muted)"}}>Bank Name</div>
                    <strong style={{"fontSize":"0.9rem"}}>{employee.bank_name || 'N/A'}</strong>
                  </div>
                  <div>
                    <div style={{"fontSize":"0.75rem","color":"var(--text-muted)"}}>Account Number</div>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <strong style={{"fontSize":"0.9rem","fontFamily":"monospace"}}>
                        {showBankAccount ? (employee.raw_bank_account_number || employee.bank_account_number || 'N/A') : (employee.bank_account_number || 'N/A')}
                      </strong>
                      {employee.bank_account_number && (
                        <button
                          type="button"
                          onClick={() => setShowBankAccount(!showBankAccount)}
                          title={showBankAccount ? "Hide Account Number" : "Show Account Number"}
                          style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: '2px', color: showBankAccount ? 'var(--primary-navy)' : '#64748B' }}
                        >
                          {showBankAccount ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      )}
                    </div>
                  </div>
                  <div>
                    <div style={{"fontSize":"0.75rem","color":"var(--text-muted)"}}>IFSC Code</div>
                    <strong style={{"fontSize":"0.9rem"}}>{employee.bank_ifsc || 'N/A'}</strong>
                  </div>
                </div>
                <div style={{"marginTop":"0.5rem","fontSize":"0.75rem","color":"var(--text-muted)", display: 'flex', alignItems: 'center', gap: '4px'}}>
                  <Lock size={12} className="shrink-0 text-slate-500" /> Bank details can only be changed via the
                  <a href={route('employees.bank-change-requests')} style={{"color":"var(--primary-navy)","fontWeight":"600"}}>Bank Change Requests</a> approval flow.
                </div>
              </div>

              <hr style={{"border":"0","borderTop":"1px solid var(--border-color)"}} />

              {/*  Salary Summary Card  */}
              <div>
                <h4 className="data-label" style={{"marginBottom":"0.75rem"}}>Salary Summary</h4>
                <div style={{"display":"grid","gridTemplateColumns":"repeat(4, 1fr)","gap":"1rem","backgroundColor":"#F8FAFC","padding":"1rem","borderRadius":"var(--radius-sm)","border":"1px solid var(--border-color)"}}>
                  <div>
                    <div style={{"fontSize":"0.75rem","color":"var(--text-muted)"}}>Basic Pay</div>
                    <strong style={{"fontSize":"0.95rem","color":"var(--primary-navy)"}}>₹{Number(employee.basic_pay || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                  </div>
                  <div>
                    <div style={{"fontSize":"0.75rem","color":"var(--text-muted)"}}>HRA</div>
                    <strong style={{"fontSize":"0.95rem","color":"var(--primary-navy)"}}>₹{Number(employee.hra || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                  </div>
                  <div>
                    <div style={{"fontSize":"0.75rem","color":"var(--text-muted)"}}>Allowances</div>
                    <strong style={{"fontSize":"0.95rem","color":"var(--primary-navy)"}}>₹{(Number(employee.conveyance || 0) + Number(employee.da || 0) + Number(employee.medical_allowance || 0) + Number(employee.special_allowance || 0) + Number(employee.other_additions || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                  </div>
                  <div style={{"borderLeft":"2px solid var(--accent-gold)","paddingLeft":"0.75rem"}}>
                    <div style={{"fontSize":"0.75rem","color":"var(--text-muted)"}}>Total CTC / Month</div>
                    <strong style={{"fontSize":"1.05rem","color":"var(--accent-gold)"}}>₹{Number(employee.ctc_monthly || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                  </div>
                </div>
                <div style={{"marginTop":"0.5rem","fontSize":"0.75rem","color":"var(--text-muted)", display: 'flex', alignItems: 'center', gap: '4px'}}>
                  <Lock size={12} className="shrink-0 text-slate-500" /> Salary structure is read-only. Use <a href={route('employees.salary-revision.create', employee.id)} style={{"color":"var(--primary-navy)","fontWeight":"600"}}>Revise Salary</a> to apply promotions or increments.
                </div>
              </div>
            </div>

            {/*  Right Statutory Profile  */}
            <div>
              <div className="card" style={{"backgroundColor":"#F8FAFC","border":"1px solid var(--border-color)"}}>
                <h3 style={{"fontSize":"1rem","marginBottom":"1rem","borderBottom":"1px solid var(--border-color)","paddingBottom":"0.5rem"}}>Statutory Profile</h3>

                <div style={{"display":"flex","flexDirection":"column","gap":"0.75rem"}}>
                  <div style={{"display":"flex","justifyContent":"space-between","alignItems":"center"}}>
                    <span style={{"fontSize":"0.85rem","fontWeight":"500"}}>Provident Fund (PF):</span>
                    <span className={`badge badge-${employee.pf_applicable ? 'success' : 'neutral'}`}>{employee.pf_applicable ? 'PF Active' : 'Not Applicable'}</span>
                  </div>
                  <div style={{"fontSize":"0.75rem","color":"var(--text-muted)","marginTop":"-0.5rem","textAlign":"right"}}>
                    UAN: {employee.uan_number ? (
                      <span className="font-mono text-slate-800 font-semibold">{employee.uan_number}</span>
                    ) : (
                      <Link
                        href={`${route('employees.edit', employee.id)}?focus=uan#uan_number`}
                        style={{ color: 'var(--status-danger)', fontWeight: '700', textDecoration: 'underline', marginLeft: '4px' }}
                      >
                        Enter UAN Number ↗
                      </Link>
                    )} | Member ID: {employee.pf_member_id || 'Pending'} ({employee.member_relationship === 'S' ? 'Spouse' : 'Father'})
                  </div>

                  <div style={{"display":"flex","justifyContent":"space-between","alignItems":"center","marginTop":"0.25rem"}}>
                    <span style={{"fontSize":"0.85rem","fontWeight":"500"}}>Employee PF Basis:</span>
                    <span className={`badge ${employee.employee_pf_wage_basis === 'actual_basic_da' ? 'badge-gold' : 'badge-neutral'}`}>
                      {employee.employee_pf_wage_basis === 'actual_basic_da' ? 'Actual Basic + DA (Para 26(6))' : 'Statutory Ceiling (₹15,000 Max)'}
                    </span>
                  </div>

                  <div style={{"display":"flex","justifyContent":"space-between","alignItems":"center","marginTop":"0.25rem"}}>
                    <span style={{"fontSize":"0.85rem","fontWeight":"500"}}>Employer PF Basis:</span>
                    <span className={`badge ${employee.employer_pf_wage_basis === 'actual_basic_da' ? 'badge-gold' : 'badge-neutral'}`}>
                      {employee.employer_pf_wage_basis === 'actual_basic_da' ? 'Actual Basic + DA (Para 26(6))' : 'Statutory Ceiling (₹15,000 Max)'}
                    </span>
                  </div>

                  <div style={{"display":"flex","justifyContent":"space-between","alignItems":"center","marginTop":"0.25rem"}}>
                    <span style={{"fontSize":"0.85rem","fontWeight":"500"}}>Voluntary PF (VPF):</span>
                    <span className={`badge ${employee.vpf_enabled ? 'badge-success' : 'badge-neutral'}`}>
                      {employee.vpf_enabled 
                        ? `VPF Active (${employee.vpf_type === 'percentage' ? `${employee.vpf_value}%` : `₹${Number(employee.vpf_value || 0).toLocaleString('en-IN')}`})` 
                        : 'Not Opted'}
                    </span>
                  </div>
                  {employee.vpf_enabled && (
                    <div style={{"fontSize":"0.75rem","color":"var(--text-muted)","marginTop":"-0.25rem","textAlign":"right"}}>
                      VPF Monthly: <strong>₹{Number(employee.employee_vpf_monthly || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong> | Total EE PF: <strong>₹{Number(employee.total_employee_pf_monthly || ((employee.employee_pf_monthly || 0) + (employee.employee_vpf_monthly || 0))).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                    </div>
                  )}

                  {(employee.employee_pf_wage_basis === 'actual_basic_da' || employee.employer_pf_wage_basis === 'actual_basic_da') && (
                    <div style={{"display":"flex","justifyContent":"space-between","alignItems":"center","marginTop":"0.25rem"}}>
                      <span style={{"fontSize":"0.85rem","fontWeight":"500"}}>Joint Declaration Status:</span>
                      <span className={`badge ${employee.joint_declaration_status === 'approved' ? 'badge-success' : employee.joint_declaration_status === 'submitted' ? 'badge-info' : employee.joint_declaration_status === 'pending' ? 'badge-warning' : 'badge-neutral'}`}>
                        {employee.joint_declaration_status === 'approved' ? 'Approved by RPFC' : employee.joint_declaration_status === 'submitted' ? 'Submitted to EPFO' : employee.joint_declaration_status === 'pending' ? 'Pending Attestation' : 'Not Required'}
                      </span>
                    </div>
                  )}

                  <div style={{"display":"flex","justifyContent":"space-between","alignItems":"center","marginTop":"0.25rem"}}>
                    <span style={{"fontSize":"0.85rem","fontWeight":"500"}}>Pension Scheme (EPS):</span>
                    {(() => {
                      const dob = employee.date_of_birth;
                      const age = dob ? Math.floor((new Date() - new Date(dob)) / (365.25 * 24 * 60 * 60 * 1000)) : 0;
                      if (age >= 58) {
                        return <span className="badge badge-warning" title="EPS contribution is ₹0.00 due to Age 58+ statutory cutoff">Age 58+ Cutoff (0% EPS / 12% EPF)</span>;
                      }
                      return (
                        <span className={`badge badge-${employee.eps_applicable !== false ? 'success' : 'neutral'}`}>
                          {employee.eps_applicable !== false ? 'EPS Active (8.33% EPS / 3.67% EPF)' : 'Exempt (0% EPS / 12% EPF)'}
                        </span>
                      );
                    })()}
                  </div>

                  <div style={{"display":"flex","justifyContent":"space-between","alignItems":"center","marginTop":"0.25rem"}}>
                    <span style={{"fontSize":"0.85rem","fontWeight":"500"}}>Employer EPF (3.67% / Remainder):</span>
                    <strong style={{"fontSize":"0.85rem","color":"var(--primary-navy)"}}>₹{Number(employee.employer_epf_monthly || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                  </div>

                  <div style={{"display":"flex","justifyContent":"space-between","alignItems":"center","marginTop":"0.25rem"}}>
                    <span style={{"fontSize":"0.85rem","fontWeight":"500"}}>Employer EPS Pension:</span>
                    {(() => {
                      const dob = employee.date_of_birth;
                      const age = dob ? Math.floor((new Date() - new Date(dob)) / (365.25 * 24 * 60 * 60 * 1000)) : 0;
                      if (age >= 58) {
                        return <span style={{"fontSize":"0.8rem","color":"#D97706","fontWeight":"600"}}>₹0.00 <span className="text-amber-600 font-semibold">(Excluded — Age 58+ Cutoff)</span></span>;
                      }
                      if (employee.eps_applicable === false) {
                        return <span style={{"fontSize":"0.8rem","color":"#64748B","fontWeight":"600"}}>₹0.00 <span className="text-slate-500 font-semibold">(Excluded — EPS Disabled)</span></span>;
                      }
                      return <strong style={{"fontSize":"0.85rem","color":"var(--primary-navy)"}}>₹{Number(employee.employer_eps_monthly || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>;
                    })()}
                  </div>

                  <div style={{"display":"flex","justifyContent":"space-between","alignItems":"center","marginTop":"0.25rem"}}>
                    <span style={{"fontSize":"0.85rem","fontWeight":"500"}}>EDLI (0.5% Insurance):</span>
                    <strong>{employee.edli_monthly > 0 ? `₹${Number(employee.edli_monthly).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '₹0.00 (Exempted)'}</strong>
                  </div>

                  <div style={{"display":"flex","justifyContent":"space-between","alignItems":"center","marginTop":"0.25rem"}}>
                    <span style={{"fontSize":"0.85rem","fontWeight":"500"}}>EPF Admin Charges (0.5%):</span>
                    <strong>₹{Number(employee.epf_admin_monthly || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                  </div>

                  <hr style={{"border":"0","borderTop":"1px solid var(--border-color)"}} />

                  {employee.is_esi_active !== false && employee.esi_applicable ? (
                    <>
                      <div style={{"display":"flex","justifyContent":"space-between","alignItems":"center"}}>
                        <span style={{"fontSize":"0.85rem","fontWeight":"500"}}>State Insurance (ESI):</span>
                        <span className="badge badge-success">ESI Active</span>
                      </div>
                      <div style={{"fontSize":"0.75rem","color":"var(--text-muted)","marginTop":"-0.5rem","textAlign":"right"}}>
                        IP No: {employee.esic_number || (employee.esi_mode === 'new' ? 'Pending Registration' : 'N/A')}
                      </div>
                    </>
                  ) : (
                    Boolean(employee.health_insurance_provider || employee.health_insurance_policy_no || Number(employee.health_insurance_sum_insured || 0) > 0) || employee.client_health_insurance_enabled !== false ? (
                      <>
                        <div style={{"display":"flex","justifyContent":"space-between","alignItems":"center"}}>
                          <span style={{"fontSize":"0.85rem","fontWeight":"500"}}>Group Medical Insurance:</span>
                          <span className="badge badge-info" style={{ background: '#E0F2FE', color: '#0369A1' }}>Non-ESI Member</span>
                        </div>
                        <div style={{"fontSize":"0.75rem","color":"var(--text-muted)","marginTop":"-0.25rem","display":"flex","flexDirection":"column","alignItems":"flex-end","gap":"2px"}}>
                          <span>Provider: <strong>{employee.health_insurance_provider || 'Company Group Policy'}</strong></span>
                          <span>Policy No: <strong>{employee.health_insurance_policy_no || 'N/A'}</strong></span>
                          {Number(employee.health_insurance_sum_insured || 0) > 0 && (
                            <span>Sum Insured: <strong>₹{Number(employee.health_insurance_sum_insured).toLocaleString('en-IN')}</strong></span>
                          )}
                        </div>
                      </>
                    ) : (
                      <>
                        <div style={{"display":"flex","justifyContent":"space-between","alignItems":"center"}}>
                          <span style={{"fontSize":"0.85rem","fontWeight":"500"}}>State Insurance (ESI):</span>
                          <span className="badge badge-neutral">Not Applicable</span>
                        </div>
                        <div style={{"fontSize":"0.75rem","color":"var(--text-muted)","marginTop":"-0.5rem","textAlign":"right"}}>
                          Exempt (Gross &gt; ₹{employee.is_disabled ? '25,000 PwD' : '21,000'} ESI Ceiling)
                        </div>
                      </>
                    )
                  )}

                  <hr style={{"border":"0","borderTop":"1px solid var(--border-color)"}} />

                  <div style={{"display":"flex","justifyContent":"space-between","alignItems":"center"}}>
                    <span style={{"fontSize":"0.85rem","fontWeight":"500"}}>Professional Tax (PT):</span>
                    <span className={`badge badge-${employee.pt_applicable ? 'success' : 'neutral'}`}>{employee.pt_applicable ? 'PT Deducted' : 'Not Applicable'}</span>
                  </div>

                  <hr style={{"border":"0","borderTop":"1px solid var(--border-color)"}} />

                  <div style={{"display":"flex","justifyContent":"space-between","alignItems":"center"}}>
                    <span style={{"fontSize":"0.85rem","fontWeight":"500"}}>TDS &amp; Tax Setup:</span>
                    <button className="btn btn-secondary btn-xs" onClick={(event) => { window.switchTab('tax') }}>📊 View Tax Declaration Tab</button>
                  </div>
                  <div style={{"fontSize":"0.75rem","color":"var(--text-muted)","marginTop":"-0.5rem","textAlign":"right"}}>
                    Manage Regime &amp; Section 80C/80D Proofs
                  </div>
                </div>

                <div style={{"marginTop":"1rem","paddingTop":"1rem","borderTop":"1px solid var(--border-color)","fontSize":"0.75rem","color":"var(--text-muted)", display: 'flex', alignItems: 'center', gap: '4px'}}>
                  <Lock size={12} className="shrink-0 text-slate-500" />
                  <span>
                    Statutory toggles (PF/ESI/PT/TDS) can only be changed via the <a href={`${route('employees.create')}?id=${employee.id}&mode=edit-active`} style={{"color":"var(--primary-navy)","fontWeight":"500"}}>Employee Configuration Form</a> — not through Edit Profile.
                  </span>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/*  Tab 2: Salary Structure  */}
        <div className={`tab-content ${activeTab === 'salary' ? 'active' : ''}`} data-tab="salary">
          <div style={{"display":"flex","flexDirection":"column","gap":"2.5rem"}}>
            
            {/*  Net Pay Summary Card  */}
            <div style={{"backgroundColor":"var(--primary-navy)","color":"white","padding":"1.5rem","borderRadius":"var(--radius-md)","display":"flex","justifyContent":"space-between","alignItems":"center","boxShadow":"0 4px 12px rgba(0,0,0,0.1)"}}>
              <div>
                <h3 style={{"fontSize":"1.25rem","margin":"0 0 0.25rem 0","color":"white"}}>Net Pay (Monthly)</h3>
                <div style={{"fontSize":"0.85rem","color":"#CBD5E1"}}>Gross Total (₹{Number(employee.gross_monthly_salary || 0).toLocaleString('en-IN')}) − Total Deductions (₹{(Number(employee.gross_monthly_salary || 0) - Number(employee.net_take_home_monthly || 0)).toLocaleString('en-IN')})</div>
              </div>
              <div style={{"fontSize":"2.25rem","fontWeight":"bold","color":"var(--accent-gold)"}}>
                ₹{Number(employee.net_take_home_monthly || 0).toLocaleString('en-IN')}
              </div>
            </div>

            {/*  Current Active Salary Structure  */}
            <div>
              <div className="flex-row-between" style={{"marginBottom":"1rem"}}>
                <h3 style={{"fontSize":"1.1rem","margin":"0"}}>Active Compensation Breakdown (Earnings)</h3>
                <span className="badge badge-success" style={{"fontSize":"0.85rem","padding":"0.35rem 0.75rem"}}>Effective From: {effectiveFromDisplay}</span>
              </div>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Component Name</th>
                    <th>Type</th>
                    <th>Monthly Rate</th>
                    <th>Annual Equivalent</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><strong>1. Basic Pay</strong></td>
                    <td>Earnings</td>
                    <td>₹{Number(employee.basic_pay || 0).toLocaleString('en-IN')}</td>
                    <td>₹{(Number(employee.basic_pay || 0) * 12).toLocaleString('en-IN')}</td>
                  </tr>
                  <tr>
                    <td><strong>2. HRA (House Rent Allowance)</strong></td>
                    <td>Earnings</td>
                    <td>₹{Number(employee.hra || 0).toLocaleString('en-IN')}</td>
                    <td>₹{(Number(employee.hra || 0) * 12).toLocaleString('en-IN')}</td>
                  </tr>
                  <tr>
                    <td><strong>3. Conveyance</strong></td>
                    <td>Earnings</td>
                    <td>₹{Number(employee.conveyance || 0).toLocaleString('en-IN')}</td>
                    <td>₹{(Number(employee.conveyance || 0) * 12).toLocaleString('en-IN')}</td>
                  </tr>
                  <tr>
                    <td><strong>4. DA (Dearness Allowance)</strong></td>
                    <td>Earnings</td>
                    <td>₹{Number(employee.da || 0).toLocaleString('en-IN')}</td>
                    <td>₹{(Number(employee.da || 0) * 12).toLocaleString('en-IN')}</td>
                  </tr>
                  <tr>
                    <td><strong>5. Medical Allowance</strong></td>
                    <td>Earnings</td>
                    <td>₹{Number(employee.medical_allowance || 0).toLocaleString('en-IN')}</td>
                    <td>₹{(Number(employee.medical_allowance || 0) * 12).toLocaleString('en-IN')}</td>
                  </tr>
                  <tr>
                    <td><strong>6. Special Allowance</strong></td>
                    <td>Earnings</td>
                    <td>₹{Number(employee.special_allowance || 0).toLocaleString('en-IN')}</td>
                    <td>₹{(Number(employee.special_allowance || 0) * 12).toLocaleString('en-IN')}</td>
                  </tr>
                  <tr>
                    <td><strong>7. Other Additions</strong></td>
                    <td>Earnings</td>
                    <td>₹{Number(employee.other_additions || 0).toLocaleString('en-IN')}</td>
                    <td>₹{(Number(employee.other_additions || 0) * 12).toLocaleString('en-IN')}</td>
                  </tr>
                  <tr>
                    <td><strong>8. Arrears Amount</strong></td>
                    <td>Earnings</td>
                    <td>₹0</td>
                    <td>₹0</td>
                  </tr>
                  <tr style={{"backgroundColor":"var(--primary-navy-hover)","color":"white","fontWeight":"bold"}}>
                    <td style={{"color":"white"}}>Gross Total</td>
                    <td style={{"color":"white"}}>Total Earnings</td>
                    <td style={{"color":"var(--accent-gold)"}}>₹{Number(employee.gross_monthly_salary || 0).toLocaleString('en-IN')}</td>
                    <td style={{"color":"var(--accent-gold)"}}>₹{(Number(employee.gross_monthly_salary || 0) * 12).toLocaleString('en-IN')}</td>
                  </tr>
                </tbody>
              </table>

              <div className="flex-row-between" style={{"marginTop":"2.5rem","marginBottom":"1rem"}}>
                <h3 style={{"fontSize":"1.1rem","margin":"0"}}>Deductions Breakdown</h3>
                <span style={{"fontSize":"0.85rem","color":"var(--text-muted)"}}>Monthly Statutory &amp; Compliance Deductions</span>
              </div>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Component Name</th>
                    <th>Type</th>
                    <th>Monthly Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><strong>1. Employee PF (Mandatory)</strong></td>
                    <td>Deductions</td>
                    <td>₹{(employee.employee_pf_monthly || 0).toLocaleString('en-IN')}</td>
                  </tr>
                  {(employee.vpf_enabled || (employee.employee_vpf_monthly || 0) > 0) && (
                    <tr>
                      <td><strong>• Voluntary PF (VPF)</strong></td>
                      <td>Deductions (Voluntary)</td>
                      <td>₹{(employee.employee_vpf_monthly || 0).toLocaleString('en-IN')}</td>
                    </tr>
                  )}
                  <tr>
                    <td><strong>2. Employee ESIC</strong></td>
                    <td>Deductions</td>
                    <td>₹{(employee.employee_esi_monthly || 0).toLocaleString('en-IN')}</td>
                  </tr>
                  <tr>
                    <td><strong>3. Professional Tax</strong></td>
                    <td>Deductions</td>
                    <td>₹{(employee.pt_monthly || 0).toLocaleString('en-IN')}</td>
                  </tr>
                  <tr>
                    <td><strong>4. Welfare Fund</strong></td>
                    <td>Deductions</td>
                    <td>₹0</td>
                  </tr>
                  <tr>
                    <td><strong>5. LOP Deduction</strong></td>
                    <td>Deductions</td>
                    <td>₹0</td>
                  </tr>
                  <tr>
                    <td><strong>6. TDS</strong></td>
                    <td>Deductions</td>
                    <td>₹0</td>
                  </tr>
                  <tr style={{"backgroundColor":"#F1F5F9","fontWeight":"bold","borderTop":"2px solid var(--border-color)","borderBottom":"2px solid var(--border-color)"}}>
                    <td>Total Deductions</td>
                    <td>Total Deductions</td>
                    <td style={{"color":"var(--status-danger)"}}>₹{((employee.gross_monthly_salary || 0) - (employee.net_take_home_monthly || 0)).toLocaleString('en-IN')}</td>
                  </tr>
                  <tr style={{"backgroundColor":"var(--primary-navy)","color":"white","fontWeight":"bold"}}>
                    <td style={{"color":"white"}}>NET TAKE HOME</td>
                    <td style={{"color":"white"}}>Gross Earnings − Total Deductions</td>
                    <td style={{"color":"var(--accent-gold)"}}>₹{(employee.net_take_home_monthly || 0).toLocaleString('en-IN')}</td>
                  </tr>
                  <tr style={{"backgroundColor":"#FFFDF0","color":"#64748B"}}>
                    <td style={{ paddingLeft: '1.5rem' }}>
                      • {Number(employee.employer_eps_monthly || 0) > 0 ? '1a. Employer EPF Contribution (3.67%)' : '1. Employer EPF Contribution (12%)'}
                    </td>
                    <td><span className="badge badge-neutral">Employer PF Fund</span></td>
                    <td>₹{Number(employee.employer_epf_monthly || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  </tr>
                  {Number(employee.employer_eps_monthly || 0) > 0 && (
                    <tr style={{"backgroundColor":"#FFFDF0","color":"#64748B"}}>
                      <td style={{ paddingLeft: '1.5rem' }}>
                        • 1b. Employer EPS Contribution (8.33% Pension)
                      </td>
                      <td><span className="badge badge-neutral">Employer Pension Fund</span></td>
                      <td>₹{Number(employee.employer_eps_monthly || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    </tr>
                  )}
                  <tr style={{"backgroundColor":"#FFFDF0","color":"#64748B"}}>
                    <td style={{ paddingLeft: '1.5rem' }}>
                      • 2. EDLI (0.5%)
                      {Boolean(employee.edli_exempted) && <span style={{ marginLeft: '6px', fontSize: '0.7rem', color: '#166534', fontWeight: 'bold' }}>[Exempted]</span>}
                    </td>
                    <td><span className="badge badge-neutral">Insurance Fund</span></td>
                    <td>{employee.edli_monthly > 0 ? `₹${Number(employee.edli_monthly).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '₹0 (Exempted)'}</td>
                  </tr>
                  <tr style={{"backgroundColor":"#FFFDF0","color":"#64748B"}}>
                    <td style={{ paddingLeft: '1.5rem' }}>• 3. EPF Admin Charges (0.5%)</td>
                    <td><span className="badge badge-neutral">Employer Admin Fee</span></td>
                    <td>₹{Number(employee.epf_admin_monthly || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  </tr>
                  <tr style={{"backgroundColor":"#FEF3C7","color":"#92400E","fontWeight":"bold","borderTop":"1px dashed #F59E0B","borderBottom":"1px dashed #F59E0B"}}>
                    <td><strong>Total Employer PF & EPFO Charges</strong></td>
                    <td><span className="badge badge-warning" style={{ background: '#FDE68A', color: '#78350F' }}>PF Subtotal</span></td>
                    <td style={{ color: '#92400E', fontSize: '1.05rem' }}>₹{(employee.employer_pf_monthly || 0).toLocaleString('en-IN')}</td>
                  </tr>
                  <tr style={{"backgroundColor":"#FFFDF0","color":"#64748B"}}>
                    <td><strong>Employer ESIC Contribution</strong></td>
                    <td><span className="badge badge-neutral">Employer Cost</span></td>
                    <td>₹{(employee.employer_esi_monthly || 0).toLocaleString('en-IN')}</td>
                  </tr>
                  <tr style={{"backgroundColor":"#F1F5F9","fontWeight":"bold","borderTop":"2px solid var(--border-color)","borderBottom":"2px solid var(--border-color)","fontSize":"1.1rem"}}>
                    <td>COST TO COMPANY (CTC)</td>
                    <td>Gross Earnings + Employer Contributions</td>
                    <td style={{"color":"var(--primary-navy)"}}>₹{(employee.ctc_monthly || 0).toLocaleString('en-IN')}</td>
                  </tr>
                </tbody>
              </table>

              <div style={{"marginTop":"1rem","padding":"0.75rem 1rem","background":"#F8FAFC","border":"1px solid var(--border-color)","borderRadius":"var(--radius-sm)","fontSize":"0.8rem","color":"var(--text-muted)","display":"flex","alignItems":"center","gap":"0.5rem"}}>
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style={{"opacity":"0.45","flexShrink":"0"}}><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                Salary structure is <strong style={{"color":"var(--text-main)"}}>read-only</strong> for Active employees.
                To update compensation, use <a href={route('employees.salary-revision.create', employee.id)} style={{"color":"var(--primary-navy)","fontWeight":"600"}}>Revise Salary →</a>
              </div>
            </div>

            {/*  Salary History Table  */}
            <div>
              <div className="flex-row-between" style={{"marginBottom":"1rem"}}>
                <h3 style={{"fontSize":"1.1rem","margin":"0"}}>Salary Revision History &amp; Audit Trail</h3>
                <span style={{"fontSize":"0.85rem","color":"var(--text-muted)"}}>Maintained automatically via Revise Salary workflow</span>
              </div>
              <div className="table-responsive">
                <table className="data-table" id="salary-history-table">
                  <thead>
                    <tr>
                      <th>Old CTC</th>
                      <th>New CTC</th>
                      <th>% Change</th>
                      <th>Effective Date</th>
                      <th>Reason</th>
                      <th>Approved By</th>
                      <th style={{"textAlign":"right"}}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(!revisionsList || revisionsList.length === 0) ? (
                      <tr>
                        <td colSpan="7" style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                          No salary revision history recorded yet.
                        </td>
                      </tr>
                    ) : (
                      revisionsList.map((rev) => {
                        const oldCtc = Number(rev.old_ctc || 0);
                        const newCtc = Number(rev.new_ctc || 0);
                        const pctChange = oldCtc > 0 ? (((newCtc - oldCtc) / oldCtc) * 100).toFixed(1) : '0.0';
                        const effDateStr = rev.effective_date 
                          ? new Date(rev.effective_date).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })
                          : 'N/A';

                        return (
                          <tr key={rev.id}>
                            <td>₹{oldCtc.toLocaleString('en-IN')}</td>
                            <td><strong>₹{newCtc.toLocaleString('en-IN')}</strong></td>
                            <td>
                              <span className={`badge badge-${Number(pctChange) >= 0 ? 'success' : 'danger'}`}>
                                {Number(pctChange) >= 0 ? `+${pctChange}%` : `${pctChange}%`}
                              </span>
                            </td>
                            <td>{effDateStr}</td>
                            <td>{rev.reason_for_revision || 'Salary Adjustment'}</td>
                            <td>
                              <span className={`badge badge-${rev.status === 'approved' ? 'success' : rev.status === 'pending_approval' ? 'warning' : 'danger'}`} style={{ textTransform: 'capitalize' }}>
                                {rev.status === 'approved' ? `Approved (${rev.approver?.name || 'Admin'})` : rev.status.replace('_', ' ')}
                              </span>
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              <a href={route('employees.salary-revision.create', employee.id)} className="btn btn-link btn-xs">
                                View Revision →
                              </a>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/*  Tab 3: Attendance Log  */}
        <div className={`tab-content ${activeTab === 'attendance' ? 'active' : ''}`} data-tab="attendance">
          {attendanceRecords && attendanceStats ? (
          <div style={{"display":"flex","flexDirection":"column","gap":"2rem"}}>
            {/*  Monthly Summary Strip  */}
            <div className="card" style={{"border":"1px solid var(--border-color)","background":"#F8FAFC","padding":"1.25rem"}}>
              <div className="flex-row-between" style={{"marginBottom":"1rem","borderBottom":"1px solid var(--border-color)","paddingBottom":"0.75rem","flexWrap":"wrap","gap":"1rem"}}>
                <div style={{"display":"flex","alignItems":"center","gap":"1rem","flexWrap":"wrap"}}>
                  <h3 id="att-month-title" style={{"fontSize":"1.15rem","margin":"0","color":"var(--primary-navy)"}}>Attendance Summary ({attendanceStats.targetMonthDisplay})</h3>
                  <div style={{"display":"flex","alignItems":"center","background":"#FFFFFF","borderRadius":"var(--radius-md)","padding":"0.25rem","border":"1px solid var(--border-color)","boxShadow":"0 1px 2px rgba(0,0,0,0.05)"}}>
                    <input type="month" className="form-control" style={{"padding":"0.25rem 0.5rem","border":"none","background":"transparent","fontWeight":"bold"}}
                           value={attendanceStats.targetMonth}
                           onChange={(e) => router.get(route('employees.show', employee.id), { month: e.target.value }, { preserveState: true })}
                    />
                  </div>
                </div>
                <span className="badge badge-navy" style={{"fontSize":"0.85rem"}}>Biometric &amp; Portal Sync</span>
              </div>
              <div style={{"display":"grid","gridTemplateColumns":"repeat(4, 1fr)","gap":"1rem","textAlign":"center"}}>
                <div style={{"background":"white","padding":"1rem","borderRadius":"var(--radius-sm)","border":"1px solid var(--border-color)"}}>
                  <div style={{"fontSize":"0.75rem","color":"var(--text-muted)","textTransform":"uppercase","fontWeight":"600"}}>Present Days</div>
                  <div id="att-present-count" style={{"fontSize":"1.5rem","fontWeight":"700","color":"var(--status-success)","marginTop":"0.25rem"}}>{attendanceStats.present}</div>
                </div>
                <div style={{"background":"white","padding":"1rem","borderRadius":"var(--radius-sm)","border":"1px solid var(--border-color)"}}>
                  <div style={{"fontSize":"0.75rem","color":"var(--text-muted)","textTransform":"uppercase","fontWeight":"600"}}>Leave Days</div>
                  <div id="att-leave-count" style={{"fontSize":"1.5rem","fontWeight":"700","color":"var(--status-info)","marginTop":"0.25rem"}}>{attendanceStats.leave}</div>
                </div>
                <div style={{"background":"white","padding":"1rem","borderRadius":"var(--radius-sm)","border":"1px solid var(--border-color)"}}>
                  <div style={{"fontSize":"0.75rem","color":"var(--text-muted)","textTransform":"uppercase","fontWeight":"600"}}>Absent Days</div>
                  <div id="att-absent-count" style={{"fontSize":"1.5rem","fontWeight":"700","color":"var(--status-danger)","marginTop":"0.25rem"}}>{attendanceStats.absent}</div>
                </div>
                <div style={{"background":"white","padding":"1rem","borderRadius":"var(--radius-sm)","border":"1px solid var(--border-color)","borderBottom":"3px solid var(--accent-gold)"}}>
                  <div style={{"fontSize":"0.75rem","color":"var(--text-muted)","textTransform":"uppercase","fontWeight":"600"}}>Total Recorded</div>
                  <div id="att-total-count" style={{"fontSize":"1.5rem","fontWeight":"700","color":"var(--primary-navy)","marginTop":"0.25rem"}}>{attendanceStats.present + attendanceStats.leave + attendanceStats.absent}</div>
                </div>
              </div>
            </div>

            {/*  Calendar Grid  */}
            <div>
              <h4 style={{"fontSize":"1rem","marginBottom":"0.5rem","color":"var(--primary-navy)"}}>Monthly Calendar View</h4>
              <div className="calendar-grid" id="att-calendar-grid">
                <div className="calendar-day-header">Mon</div>
                <div className="calendar-day-header">Tue</div>
                <div className="calendar-day-header">Wed</div>
                <div className="calendar-day-header">Thu</div>
                <div className="calendar-day-header">Fri</div>
                <div className="calendar-day-header">Sat</div>
                <div className="calendar-day-header">Sun</div>

                {Array.from({ length: attendanceStats.startDayOfWeek - 1 }).map((_, i) => (
                  <div key={`empty-${i}`} className="calendar-day-cell other-month"></div>
                ))}
                
                {Array.from({ length: attendanceStats.daysInMonth }).map((_, i) => {
                  const dayNum = i + 1;
                  const dateStr = `${attendanceStats.targetMonth}-${String(dayNum).padStart(2, '0')}`;
                  const record = attendanceRecords.find(r => r.attendance_date.substring(0,10) === dateStr);
                  
                  let cellClass = "calendar-day-cell";
                  let indClass = "calendar-indicator";
                  let indText = "-";
                  
                  if (record) {
                    if (record.status === 'present') { cellClass += " present"; indClass += " present"; indText = "Present"; }
                    else if (record.status === 'absent') { cellClass += " absent"; indClass += " absent"; indText = "Absent"; }
                    else if (record.status === 'half_day') { cellClass += " half-day"; indClass += " half-day"; indText = "Half-day"; }
                    else if (record.status === 'leave') { cellClass += " leave"; indClass += " leave"; indText = "On Leave"; }
                  } else {
                     const isWeekend = new Date(dateStr).getDay() === 0 || new Date(dateStr).getDay() === 6;
                     if (isWeekend) { cellClass += " other-month"; indText = "Wknd"; }
                  }

                  return (
                    <div key={dayNum} className={cellClass}>
                      <span>{dayNum}</span>
                      <span className={indClass}>{indText}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/*  Daily Attendance Table  */}
            <div>
              <h4 style={{"fontSize":"1rem","marginBottom":"0.5rem","color":"var(--primary-navy)"}}>Daily Punch Logs</h4>
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Source</th>
                      <th>Punch-In Time</th>
                      <th>Punch-Out Time</th>
                      <th>Hours Worked</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendanceRecords.length === 0 ? (
                      <tr>
                        <td colSpan="6" style={{textAlign:"center", padding:"2rem", color:"var(--text-muted)"}}>No attendance records found for {attendanceStats.targetMonthDisplay}</td>
                      </tr>
                    ) : attendanceRecords.sort((a,b) => new Date(b.attendance_date) - new Date(a.attendance_date)).map(record => (
                      <tr key={record.id}>
                        <td>{new Date(record.attendance_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                        <td><span style={{fontSize:'0.75rem', color:'var(--text-muted)', textTransform:'uppercase'}}>{record.source}</span></td>
                        <td>{record.punch_in_time ? record.punch_in_time.substring(0,5) : '—'}</td>
                        <td>{record.punch_out_time ? record.punch_out_time.substring(0,5) : '—'}</td>
                        <td>{record.hours_worked ? `${Math.floor(record.hours_worked)}h ${Math.round((record.hours_worked % 1) * 60)}m` : '0h 00m'}</td>
                        <td>
                          {record.status === 'present' && <span className="badge badge-success">Present</span>}
                          {record.status === 'absent' && <span className="badge badge-danger">Absent</span>}
                          {record.status === 'half_day' && <span className="badge badge-warning">Half-day</span>}
                          {record.status === 'leave' && <span className="badge badge-info">On Leave</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          ) : (
            <div style={{"padding":"3rem 1rem","textAlign":"center","color":"var(--text-muted)","fontStyle":"italic"}}>
              Attendance records not loaded.
            </div>
          )}
        </div>



        {/*  Tab 4: Generated Payslips  */}
        <div className={`tab-content ${activeTab === 'payslips' ? 'active' : ''}`} data-tab="payslips">
          <div style={{"display":"flex","flexDirection":"column","gap":"1.5rem"}}>
            <div className="flex-row-between">
              <h3 style={{"fontSize":"1.1rem","margin":"0"}}>Generated Payslips Archive</h3>
              <span style={{"fontSize":"0.85rem","color":"var(--text-muted)"}}>Historical records compiled from active payroll runs</span>
            </div>
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Month</th>
                    <th>Gross Pay</th>
                    <th>Net Pay</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td colSpan="5" style={{"textAlign":"center","padding":"3rem 1rem","color":"var(--text-muted)","fontStyle":"italic"}}>
                      Payslips will be generated automatically here (Dependent on Payroll Module)
                    </td>
                  </tr>
                  {/*
                  <tr>
                    <td><strong>June 2026</strong></td>
                    <td>₹54,500</td>
                    <td><strong>₹48,000</strong> <span style={{"fontSize":"0.75rem","color":"var(--status-danger)"}}>(1 Absent Ded.)</span></td>
                    <td><span className="badge badge-warning">Generated</span></td>
                    <td><a href={route('payroll.payslips')} className="btn btn-secondary btn-xs">📥 Download PDF</a></td>
                  </tr>
                  <tr>
                    <td><strong>May 2026</strong></td>
                    <td>₹54,500</td>
                    <td><strong>₹50,000</strong></td>
                    <td><span className="badge badge-success">Disbursed</span></td>
                    <td><a href={route('payroll.payslips')} className="btn btn-secondary btn-xs">📥 Download PDF</a></td>
                  </tr>
                  <tr>
                    <td><strong>April 2026</strong></td>
                    <td>₹54,500</td>
                    <td><strong>₹50,000</strong></td>
                    <td><span className="badge badge-success">Disbursed</span></td>
                    <td><a href={route('payroll.payslips')} className="btn btn-secondary btn-xs">📥 Download PDF</a></td>
                  </tr>
                  <tr>
                    <td><strong>March 2026</strong></td>
                    <td>₹45,000</td>
                    <td><strong>₹41,000</strong></td>
                    <td><span className="badge badge-success">Disbursed</span></td>
                    <td><a href={route('payroll.payslips')} className="btn btn-secondary btn-xs">📥 Download PDF</a></td>
                  </tr>
                  */}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        
        {/*  Tab 5: Documents & KYC Checklist  */}
        <div className={`tab-content ${activeTab === 'docs' ? 'active' : ''}`} data-tab="docs">
          <div style={{"display":"flex","flexDirection":"column","gap":"2rem"}}>
            
            {/*  Overall Progress Summary  */}
            <div className="card" style={{"border":"1px solid var(--border-color)","background":"#F8FAFC"}}>
              <div style={{"display":"flex","justifyContent":"space-between","alignItems":"center","flexWrap":"wrap","gap":"1rem"}}>
                <div style={{"flex":"1","minWidth":"300px"}}>
                  <h3 style={{"fontSize":"1.15rem","marginBottom":"0.4rem","color":"var(--primary-navy)","display":"flex","alignItems":"center","gap":"0.5rem"}}>
                    <Folder size={18} className="text-[#1F3864]" /> Documents &amp; KYC Verification
                  </h3>
                  <div style={{"fontSize":"0.95rem","fontWeight":"600","color":"var(--accent-gold)","marginTop":"0.5rem"}}>
                    {employee.documents_verified_count || 0} of {employee.documents_required_count || 5} required documents verified
                  </div>
                  <div style={{"width":"100%","maxWidth":"400px","height":"8px","backgroundColor":"#E2E8F0","borderRadius":"100px","margin":"0.5rem 0","overflow":"hidden"}}>
                    <div style={{"width": `${((employee.documents_verified_count || 0) / (employee.documents_required_count || 5)) * 100}%`,"height":"100%","backgroundColor":"var(--status-success)","transition":"width var(--transition-normal)"}}></div>
                  </div>
                  {employee.status === "onboarding" && (
                  <p style={{"fontSize":"0.85rem","color":"var(--status-warning)","fontWeight":"500","margin":"0"}}>
                    ⚠ Submit and get all documents verified to activate this employee under {employee.client_name || "their assigned client"}.
                  </p>
                  )}
                </div>
                <div style={{"display":"flex","alignItems":"center","gap":"1rem","background":"#FFFFFF","padding":"0.75rem 1.25rem","borderRadius":"var(--radius-md)","border":"1px solid var(--border-color)","boxShadow":"var(--shadow-sm)","flexWrap":"wrap"}}>
                  <div style={{"display":"flex","flexDirection":"column"}}>
                    <span style={{"fontSize":"0.85rem","fontWeight":"600","color":"var(--primary-navy)"}}>Prior Employment Flag</span>
                    <span style={{"fontSize":"0.75rem","color":"var(--text-muted)"}}>Determines conditional docs</span>
                  </div>
                  <div style={{"fontSize":"0.85rem","fontWeight":"600","color":"var(--primary-navy)"}}>
                    {employee.prior_employment_flag ? "Yes" : "No"}
                  </div>
                </div>
              </div>
            </div>

            {/* UAN Number Status Block */}
            <div className="card" style={{ border: !employee.uan_number ? '2px solid var(--status-danger)' : '1px solid var(--border-color)', background: !employee.uan_number ? '#FFF5F5' : '#F0FDF4', padding: '1.25rem 1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  {!employee.uan_number ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', borderRadius: '50%', background: 'var(--status-danger)', flexShrink: 0 }}>
                      <AlertTriangle size={18} color="white" />
                    </span>
                  ) : (
                    <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', borderRadius: '50%', background: 'var(--status-success)', flexShrink: 0 }}>
                      <Check size={18} color="white" />
                    </span>
                  )}
                  <div>
                    <div style={{ fontWeight: '700', fontSize: '0.95rem', color: 'var(--primary-navy)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Lock size={15} /> UAN Number (Universal Account Number — PF)
                      <span style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--status-danger)' }}>* Required for Onboarding</span>
                    </div>
                    {employee.uan_number ? (
                      <div style={{ fontSize: '0.9rem', marginTop: '0.25rem', color: 'var(--status-success)', fontWeight: '600', letterSpacing: '0.08em', fontFamily: 'monospace' }}>
                        {employee.uan_number}
                        <span className="badge badge-success" style={{ marginLeft: '0.5rem', fontSize: '0.7rem' }}>Provided ✓</span>
                      </div>
                    ) : (
                      <div style={{ fontSize: '0.85rem', marginTop: '0.3rem', color: 'var(--status-danger)', fontWeight: '500' }}>
                        ⚠ UAN Number is missing. Employee cannot be activated without a valid 12-digit UAN. Please edit the employee profile to add the UAN before completing onboarding.
                      </div>
                    )}
                  </div>
                </div>
                {!employee.uan_number ? (
                  <Link
                    href={`${route('employees.edit', employee.id)}?focus=uan#uan_number`}
                    className="btn btn-danger"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', flexShrink: 0 }}
                  >
                    <Edit size={14} /> Enter UAN Number
                  </Link>
                ) : (
                  <Link
                    href={`${route('employees.edit', employee.id)}?focus=uan#uan_number`}
                    className="btn"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', flexShrink: 0, backgroundColor: 'white', border: '1px solid var(--border-color)', color: 'var(--primary-navy)' }}
                  >
                    <Edit size={14} /> Edit UAN
                  </Link>
                )}
              </div>
            </div>

            {/*  Documents List  */}
            <div className="card" style={{"padding":"0","overflow":"hidden","border":"1px solid var(--border-color)"}}>
              <div className="table-responsive">
                <table className="data-table" style={{"width":"100%"}}>
                  <thead>
                    <tr>
                      <th style={{"width":"35%"}}>Document Name</th>
                      <th style={{"width":"15%"}}>Requirement</th>
                      <th style={{"width":"20%"}}>Verification Status</th>
                      <th style={{"width":"30%","textAlign":"right"}}>Actions / Manager Controls</th>
                    </tr>
                  </thead>
                  <tbody>
                    {renderDocumentRows()}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/*  Tab 6: Tax Declaration  */}
        <div className={`tab-content ${activeTab === 'tax' ? 'active' : ''}`} data-tab="tax">
          <TaxDeclarationTab 
            employee={employee}
            taxDeclaration={taxDeclaration}
            taxComparison={taxComparison}
          />
        </div>

        {/*  Tab 7: Loans & Advances  */}
        <div className={`tab-content ${activeTab === 'loans' ? 'active' : ''}`} data-tab="loans">
          <LoansAndAdvancesTab employee={employee} loans={loans || []} />
        </div>

        {/*  Tab 8: History  */}
        <div className={`tab-content ${activeTab === 'history' ? 'active' : ''}`} data-tab="history">
          <HistoryTimeline revisions={salaryRevisions || []} isAdmin={true} />
        </div>
      </div>{/*  end tab-container  */}
    
{/*  ══════════════════════════════════════════════════
       EDIT PROFILE SIDE PANEL
  ══════════════════════════════════════════════════  */}
  <div className="edit-panel-overlay" id="edit-panel-overlay" onClick={(event) => { window.handleOverlayClick(event) }}>
    <div className="edit-panel" id="edit-panel">

      <div className="edit-panel-header">
        <div>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Edit size={18} /> Edit Profile</h3>
          <div style={{"fontSize":"0.75rem","opacity":"0.75","marginTop":"0.15rem"}}>Aarav Sharma · TEC-088</div>
        </div>
        <button className="close-btn" onClick={(event) => { window.closeEditPanel() }}>×</button>
      </div>

      <div className="edit-panel-body">

        {/*  ── Editable Fields ──  */}
        <div className="edit-section-label">Editable — Personal &amp; Contact Details</div>

        {/*  Full Name  */}
        <div className="form-group">
          <label htmlFor="ep-name">Full Name</label>
          <input type="text" id="ep-name" className="form-control" value="Aarav Sharma"
            onInput={(event) => { window.onNameChange() }} />
          {/*  Name-change document upload — only appears when name is modified  */}
          <div className="name-doc-upload" id="name-doc-upload">
            ⚠ <strong>Name changes require a supporting document</strong> (e.g. marriage certificate, legal name change order).
            Upload before saving.
            <input type="file" id="name-doc-file" accept=".pdf,.jpg,.jpeg,.png"
              onChange={(event) => { window.onNameDocUploaded() }} />
            <div className="ep-field-msg show" id="msg-name-doc" style={{"display":"block","marginTop":"0.3rem","fontSize":"0.75rem","color":"var(--status-warning)"}}>
              Document required — Save is disabled={true} until uploaded.
            </div>
          </div>
        </div>

        {/*  Designation  */}
        <div className="form-group">
          <label htmlFor="ep-designation">Designation / Role Label</label>
          <input type="text" id="ep-designation" className="form-control" value="Senior Developer"
            onInput={(event) => { window.onDesignationChange() }} />
          <div className="desig-changed-note" id="desig-changed-note">
            ⚠ Designation changed without a salary revision in this session.
            <a href={route('employees.salary-revision.create', employee.id)} style={{"color":"var(--status-warning)","fontWeight":"600"}}>Review Revise Salary →</a>
            This will be flagged in the <a href={route('admin.activity-log')} style={{"color":"var(--status-warning)","fontWeight":"600"}}>Activity Log</a>.
          </div>
        </div>

        {/*  Personal Email  */}
        <div className="form-group">
          <label htmlFor="ep-email">Personal Email</label>
          <input type="email" id="ep-email" className="form-control" value="aarav.sharma@gmail.com"
            onBlur={(event) => { window.validateEpEmail() }} />
          <div className="ep-field-msg" id="ep-msg-email"></div>
        </div>

        {/*  Phone  */}
        <div className="form-group">
          <label htmlFor="ep-phone">Phone Number</label>
          <input type="text" id="ep-phone" className="form-control" value="9876543210" maxLength="10"
            onBlur={(event) => { window.validateEpPhone() }} />
          <div className="ep-field-msg" id="ep-msg-phone"></div>
        </div>

        {/*  Emergency Contact  */}
        <div className="form-group">
          <label htmlFor="ep-emergency">Emergency Contact Number</label>
          <input type="text" id="ep-emergency" className="form-control" value="9876543211" maxLength="10"
            onInput={(event) => { window.validateEpEmergency() }} />
          <div className="ep-field-msg" id="ep-msg-emergency"></div>
        </div>

        {/*  Address  */}
        <div className="form-group">
          <label htmlFor="ep-address">Residential Address</label>
          <textarea id="ep-address" className="form-control" rows="2">Flat 4B, Andheri East, Mumbai</textarea>
        </div>

        {/*  ── Locked Sections (read-only display) ──  */}
        <div className="edit-section-label">
          {/*  padlock SVG  */}
          <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style={{"verticalAlign":"middle","marginRight":"3px"}}><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          Read-Only — Cannot be changed via Edit Profile
        </div>

        {/*  Employee Code  */}
        <div className="locked-section-block">
          <svg className="lock-icon" xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          <div className="lock-body">
            <div className="lock-title">Employee Code</div>
            <div className="lock-value">TEC-088</div>
            <div className="lock-note">System-assigned. Cannot be changed.</div>
          </div>
        </div>

        {/*  Date of Joining  */}
        <div className="locked-section-block">
          <svg className="lock-icon" xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          <div className="lock-body">
            <div className="lock-title">Date of Joining</div>
            <div className="lock-value">January 15, 2025</div>
            <div className="lock-note">Locked — payroll has been processed. Cannot be changed after first payroll run.</div>
          </div>
        </div>

        {/*  Bank Details  */}
        <div className="locked-section-block">
          <svg className="lock-icon" xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          <div className="lock-body">
            <div className="lock-title">Bank Details (HDFC Bank · ••••••••398571 · HDFC0000060)</div>
            <div className="lock-note">Locked — use <a href={route('employees.bank-change-requests')}>Bank Change Requests</a> to update disbursement account.</div>
          </div>
        </div>

        {/*  Statutory IDs  */}
        <div className="locked-section-block">
          <svg className="lock-icon" xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          <div className="lock-body">
            <div className="lock-title">Statutory IDs (PAN · Aadhaar · UAN · ESI No)</div>
            <div className="lock-note">Locked — use <a href={`${route('employees.create')}?id=${employee.id}&mode=edit-active`}>Employee Configuration Form</a> to update statutory credentials.</div>
          </div>
        </div>

        {/*  Salary Structure  */}
        <div className="locked-section-block">
          <svg className="lock-icon" xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          <div className="lock-body">
            <div className="lock-title">Salary Structure (Basic ₹22,000 · HRA ₹11,000 · Allowances ₹12,000 · CTC ₹45,000)</div>
            <div className="lock-note">Locked — use <a href={route('employees.salary-revision.create', employee.id)}>Revise Salary →</a> to update compensation.</div>
          </div>
        </div>

        {/*  PF / ESI / PT / TDS Toggles  */}
        <div className="locked-section-block">
          <svg className="lock-icon" xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          <div className="lock-body">
            <div className="lock-title">Statutory Applicability (PF · ESI · PT · TDS)</div>
            <div className="lock-note">Locked — use <a href={`${route('employees.create')}?id=${employee.id}&mode=edit-active`}>Employee Configuration Form</a> to change statutory override toggles.</div>
          </div>
        </div>

      </div>{/*  end edit-panel-body  */}

      <div className="edit-panel-footer">
        <button className="btn btn-secondary" onClick={(event) => { window.closeEditPanel() }}>Cancel</button>
        <button className="btn btn-primary" id="ep-save-btn" onClick={(event) => { window.saveEditProfile() }}>Save Changes</button>
      </div>
    </div>
  </div>
</div>
        </AuthenticatedLayout>
    </RoleGuard>
    );
}
