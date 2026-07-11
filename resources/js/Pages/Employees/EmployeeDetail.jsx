import React, { useEffect, useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router, usePage } from '@inertiajs/react';
import './EmployeeDetail.css';
import useToast from '../../Hooks/useToast';

import RoleGuard from '../../Components/RoleGuard.jsx';
import ComingSoonFeature from '../../Components/ui/ComingSoonFeature';
import ConfirmDialog from '../../Components/ui/ConfirmDialog';
export default function EmployeeDetail({ employee: empProp }) {
    const employee = empProp?.data || empProp || {};
    const { auth, flash } = usePage().props;
    const { showToast } = useToast();
    const [deleteDialog, setDeleteDialog] = useState({ isOpen: false, confirmText: '', reason: '' });

    useEffect(() => {
        if (flash?.success) {
            showToast({ type: 'success', title: 'Success', message: flash.success });
        }
        if (flash?.error) {
            showToast({ type: 'error', title: 'Error', message: flash.error });
        }
    }, [flash, showToast]);
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
    { type: "pan_card", name: "PAN Card (copy)", req: "Always Required", isMandatory: true, icon: "📄" },
    { type: "aadhaar_card", name: "Aadhaar Card (copy)", req: "Always Required", isMandatory: true, icon: "📄" },
    { type: "bank_passbook", name: "Bank Proof (cancelled cheque / passbook)", req: "Always Required", isMandatory: true, icon: "📄" },
    { type: "education_certificate", name: "Educational Certificates", req: "Optional", isMandatory: false, icon: "📄" },
    { type: "offer_letter", name: "Signed Offer Letter / Employment Contract", req: "Always Required", isMandatory: true, icon: "📄" },
    { type: "photo", name: "Photograph", req: "Always Required", isMandatory: true, icon: "🖼" },
    { type: "relieving_letter", name: "Previous Employer: Relieving Letter", req: "Conditional", isMandatory: true, conditional: true, icon: "📄" },
    { type: "previous_payslips", name: "Previous Employer: Last 3 Months Payslips", req: "Conditional", isMandatory: true, conditional: true, icon: "📄" },
    { type: "form16", name: "Previous Employer: Form 16", req: "Conditional", isMandatory: true, conditional: true, icon: "📄" }
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
                        <span>{docDef.icon}</span> {docDef.name}
                    </div>
                    <div style={{"fontSize":"0.75rem","color":"var(--text-muted)","marginLeft":"1.5rem","marginTop":"0.2rem"}}>
                        PDF, JPG, PNG (Max: 5MB)
                    </div>
                </td>
                <td>{requirementBadge}</td>
                <td>{statusBadge}</td>
                <td style={{"textAlign":"right"}}>
                    {uploadedDoc ? (
                        <div style={{"display":"flex","gap":"0.4rem","justifyContent":"flex-end","alignItems":"center"}}>
                            {uploadedDoc.status === "pending" && (
                                <>
                                    <button className="btn btn-xs" style={{"backgroundColor":"var(--status-success)","color":"white"}} onClick={() => router.put(route('employees.documents.verify', { id: employee.id, docId: uploadedDoc.id }), { status: "verified" })}>✓ Verify</button>
                                    <button className="btn btn-danger btn-xs" onClick={() => {
                                        const reason = prompt("Rejection Reason:");
                                        if(reason) router.put(route('employees.documents.verify', { id: employee.id, docId: uploadedDoc.id }), { status: "rejected", rejection_reason: reason });
                                    }}>✕ Reject</button>
                                </>
                            )}
                            {(uploadedDoc.status === "verified" || uploadedDoc.status === "rejected") && (
                                <span style={{"fontSize":"0.75rem","color":"var(--text-muted)"}}>No actions available</span>
                            )}
                        </div>
                    ) : (
                        <div>
                            <input type="file" id={`file_${docDef.type}`} style={{display: "none"}} onChange={(e) => {
                                if(e.target.files[0]) {
                                    const formData = new FormData();
                                    formData.append("document_type", docDef.type);
                                    formData.append("file", e.target.files[0]);
                                    router.post(route('employees.documents.store', employee.id), formData);
                                }
                            }} />
                            <button className="btn btn-navy btn-xs" onClick={() => document.getElementById(`file_${docDef.type}`).click()}>📤 Upload Document</button>
                        </div>
                    )}
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
        <a href={route('employees.index')} style={{"fontSize":"0.85rem","fontWeight":"600"}}>← Back to Employees Directory</a>
        <div className="flex-row-between" style={{"marginTop":"0.5rem","marginBottom":"0"}}>
          <div style={{"display":"flex","alignItems":"center","gap":"1rem"}}>
            <h2 id="page-emp-name">{employee.full_name || 'Employee Profile'}</h2>
            <span className={`badge badge-${employee.status === 'active' ? 'success' : 'warning'}`}>{employee.status ? (employee.status.charAt(0).toUpperCase() + employee.status.slice(1)) : 'Active'}</span>
            {employee.status === 'onboarding' && (
                <span style={{"fontSize":"0.85rem","color":"var(--text-muted)","fontStyle":"italic"}}>
                  {employee.documents_verified_count || 0}/{employee.documents_required_count || 5} documents verified — {(employee.documents_required_count || 5) - (employee.documents_verified_count || 0)} remaining to activate.
                </span>
            )}
          </div>
          <div style={{"display":"flex","gap":"0.75rem"}}>
            {employee.personal_email && (
                <button 
                    onClick={() => {
                        if (confirm('Resend invitation email to this employee?')) {
                            router.post(route('employees.resend-invitation', employee.id));
                        }
                    }} 
                    className="btn" 
                    style={{"backgroundColor":"white","color":"var(--primary-navy)","border":"1px solid var(--primary-navy)"}}
                >
                    ✉️ Resend Invite
                </button>
            )}
            <a href={route('employees.salary-revision.create', employee.id)} className="btn btn-navy">📈 Revise Salary</a>
            <a href={route('employees.exit.show', { id: employee.id, stage: 1 })} className="btn btn-danger">🚪 Initiate Exit Process</a>
            <Link href={route('employees.edit', employee.id)} className="btn btn-secondary">✏️ Edit Profile</Link>
            
            {employee.status === 'suspended' ? (
              <button 
                  className="btn btn-primary" 
                  onClick={() => {
                      if (confirm('Are you sure you want to reactivate this employee?')) {
                          router.post(route('employees.activate', employee.id));
                      }
                  }}
              >
                  ▶️ Reactivate
              </button>
            ) : (
              <button 
                  className="btn btn-warning" 
                  onClick={() => {
                      if (confirm('Are you sure you want to suspend this employee?')) {
                          router.post(route('employees.deactivate', employee.id));
                      }
                  }}
              >
                  ⏸ Suspend
              </button>
            )}

            {auth.user.role === 'admin' && (
              <button 
                className="btn btn-danger" 
                style={{ backgroundColor: 'var(--status-danger)', color: 'white', borderColor: 'var(--status-danger)' }} 
                onClick={() => setDeleteDialog({ isOpen: true, confirmText: '', reason: '' })}
              >
                🗑️ Delete
              </button>
            )}
          </div>
        </div>
      </div>

      <ConfirmDialog 
        isOpen={deleteDialog.isOpen}
        title="Delete Employee"
        message={`Are you absolutely sure you want to delete ${employee.full_name}? This action cannot be undone and will soft-delete the employee and all related records.`}
        onClose={() => setDeleteDialog({ isOpen: false, confirmText: '', reason: '' })}
        onConfirm={() => {
          if (deleteDialog.confirmText !== 'DELETE') {
            alert('Please type DELETE to confirm.');
            return;
          }
          if (deleteDialog.reason.length < 10) {
            alert('Please provide a reason (min 10 characters).');
            return;
          }
          router.delete(route('employees.destroy', employee.id), {
            data: { confirm_text: deleteDialog.confirmText, reason: deleteDialog.reason },
            onFinish: () => setDeleteDialog({ isOpen: false, confirmText: '', reason: '' })
          });
        }}
        confirmLabel="Delete Employee"
        variant="danger"
      >
        <div className="space-y-4">
          <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.875rem', fontWeight: '500', color: '#374151' }}>
              Type 'DELETE' to confirm
            </label>
            <input 
              type="text"
              style={{ width: '100%', padding: '0.5rem', border: '1px solid #D1D5DB', borderRadius: '0.375rem' }}
              value={deleteDialog.confirmText} 
              onChange={e => setDeleteDialog(prev => ({ ...prev, confirmText: e.target.value }))}
              placeholder="DELETE"
            />
          </div>
          <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.875rem', fontWeight: '500', color: '#374151' }}>
              Reason for Deletion (Min 10 chars)
            </label>
            <textarea 
              style={{ width: '100%', padding: '0.5rem', border: '1px solid #D1D5DB', borderRadius: '0.375rem' }}
              rows="3"
              value={deleteDialog.reason}
              onChange={e => setDeleteDialog(prev => ({ ...prev, reason: e.target.value }))}
              placeholder="e.g. Contract terminated, offboarding completed..."
            ></textarea>
          </div>
        </div>
      </ConfirmDialog>

      {/*  Tab Container  */}
      <div className="tab-container card">
        <ul className="tab-headers">
          <li className="active" data-tab="overview">Overview</li>
          <li data-tab="salary">Salary Structure &amp; History</li>
          <li data-tab="attendance" id="tab-header-attendance">Attendance Log (June)</li>
          <li data-tab="payslips">Generated Payslips</li>
          <li data-tab="docs">Documents</li>
          <li data-tab="tax">Tax Declaration</li>
          <li data-tab="loans">Loans &amp; Advances</li>
        </ul>

        {/*  Tab 1: Overview  */}
        <div className="tab-content active" data-tab="overview">
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
                  <h4 className="data-label">Marital Status</h4>
                  <span className="data-value" style={{"textTransform": "capitalize"}}>{employee.marital_status || 'N/A'}</span>
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
                    <div style={{"fontSize":"0.75rem","color":"var(--text-muted)"}}>Account No (Masked)</div>
                    <strong style={{"fontSize":"0.9rem"}}>{employee.bank_account_number || 'N/A'}</strong>
                  </div>
                  <div>
                    <div style={{"fontSize":"0.75rem","color":"var(--text-muted)"}}>IFSC Code</div>
                    <strong style={{"fontSize":"0.9rem"}}>{employee.bank_ifsc || 'N/A'}</strong>
                  </div>
                </div>
                <div style={{"marginTop":"0.5rem","fontSize":"0.75rem","color":"var(--text-muted)"}}>
                  🔒 Bank details can only be changed via the
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
                    <strong style={{"fontSize":"0.95rem","color":"var(--primary-navy)"}}>₹{(employee.basic_pay || 0).toLocaleString('en-IN')}</strong>
                  </div>
                  <div>
                    <div style={{"fontSize":"0.75rem","color":"var(--text-muted)"}}>HRA</div>
                    <strong style={{"fontSize":"0.95rem","color":"var(--primary-navy)"}}>₹{(employee.hra || 0).toLocaleString('en-IN')}</strong>
                  </div>
                  <div>
                    <div style={{"fontSize":"0.75rem","color":"var(--text-muted)"}}>Allowances</div>
                    <strong style={{"fontSize":"0.95rem","color":"var(--primary-navy)"}}>₹{((employee.conveyance || 0) + (employee.da || 0) + (employee.medical_allowance || 0) + (employee.special_allowance || 0) + (employee.other_additions || 0)).toLocaleString('en-IN')}</strong>
                  </div>
                  <div style={{"borderLeft":"2px solid var(--accent-gold)","paddingLeft":"0.75rem"}}>
                    <div style={{"fontSize":"0.75rem","color":"var(--text-muted)"}}>Total CTC / Month</div>
                    <strong style={{"fontSize":"1.05rem","color":"var(--accent-gold)"}}>₹{(employee.ctc_monthly || 0).toLocaleString('en-IN')}</strong>
                  </div>
                </div>
                <div style={{"marginTop":"0.5rem","fontSize":"0.75rem","color":"var(--text-muted)"}}>
                  🔒 Salary structure is read-only. Use <a href={route('employees.salary-revision.create', employee.id)} style={{"color":"var(--primary-navy)","fontWeight":"600"}}>Revise Salary</a> to apply promotions or increments.
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
                    UAN: {employee.uan_number || 'N/A'}
                  </div>

                  <hr style={{"border":"0","borderTop":"1px solid var(--border-color)"}} />

                  <div style={{"display":"flex","justifyContent":"space-between","alignItems":"center"}}>
                    <span style={{"fontSize":"0.85rem","fontWeight":"500"}}>State Insurance (ESI):</span>
                    <span className={`badge badge-${employee.esi_applicable ? 'success' : 'neutral'}`}>{employee.esi_applicable ? 'ESI Active' : 'Not Applicable'}</span>
                  </div>
                  <div style={{"fontSize":"0.75rem","color":"var(--text-muted)","marginTop":"-0.5rem","textAlign":"right"}}>
                    IP No: {employee.esic_number || 'N/A'}
                  </div>

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

                <div style={{"marginTop":"1rem","paddingTop":"1rem","borderTop":"1px solid var(--border-color)","fontSize":"0.75rem","color":"var(--text-muted)"}}>
                  🔒 Statutory toggles (PF/ESI/PT/TDS) can only be changed via the
                  <a href={`${route('employees.create')}?id=${employee.id}&mode=edit-active`} style={{"color":"var(--primary-navy)","fontWeight":"500"}}>Employee Configuration Form</a>
                  — not through Edit Profile.
                </div>
              </div>
            </div>

          </div>
        </div>

        {/*  Tab 2: Salary Structure  */}
        <div className="tab-content" data-tab="salary">
          <div style={{"display":"flex","flexDirection":"column","gap":"2.5rem"}}>
            
            {/*  Net Pay Summary Card  */}
            <div style={{"backgroundColor":"var(--primary-navy)","color":"white","padding":"1.5rem","borderRadius":"var(--radius-md)","display":"flex","justifyContent":"space-between","alignItems":"center","boxShadow":"0 4px 12px rgba(0,0,0,0.1)"}}>
              <div>
                <h3 style={{"fontSize":"1.25rem","margin":"0 0 0.25rem 0","color":"white"}}>Net Pay (Monthly)</h3>
                <div style={{"fontSize":"0.85rem","color":"#CBD5E1"}}>Gross Total (₹{(employee.gross_monthly_salary || 0).toLocaleString('en-IN')}) − Total Deductions (₹{((employee.gross_monthly_salary || 0) - (employee.net_take_home_monthly || 0)).toLocaleString('en-IN')})</div>
              </div>
              <div style={{"fontSize":"2.25rem","fontWeight":"bold","color":"var(--accent-gold)"}}>
                ₹{(employee.net_take_home_monthly || 0).toLocaleString('en-IN')}
              </div>
            </div>

            {/*  Current Active Salary Structure  */}
            <div>
              <div className="flex-row-between" style={{"marginBottom":"1rem"}}>
                <h3 style={{"fontSize":"1.1rem","margin":"0"}}>Active Compensation Breakdown (Earnings)</h3>
                <span className="badge badge-success" style={{"fontSize":"0.85rem","padding":"0.35rem 0.75rem"}}>Effective From: April 01, 2026</span>
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
                    <td>₹{(employee.basic_pay || 0).toLocaleString('en-IN')}</td>
                    <td>₹{((employee.basic_pay || 0) * 12).toLocaleString('en-IN')}</td>
                  </tr>
                  <tr>
                    <td><strong>2. HRA (House Rent Allowance)</strong></td>
                    <td>Earnings</td>
                    <td>₹{(employee.hra || 0).toLocaleString('en-IN')}</td>
                    <td>₹{((employee.hra || 0) * 12).toLocaleString('en-IN')}</td>
                  </tr>
                  <tr>
                    <td><strong>3. Conveyance</strong></td>
                    <td>Earnings</td>
                    <td>₹{(employee.conveyance || 0).toLocaleString('en-IN')}</td>
                    <td>₹{((employee.conveyance || 0) * 12).toLocaleString('en-IN')}</td>
                  </tr>
                  <tr>
                    <td><strong>4. DA (Dearness Allowance)</strong></td>
                    <td>Earnings</td>
                    <td>₹{(employee.da || 0).toLocaleString('en-IN')}</td>
                    <td>₹{((employee.da || 0) * 12).toLocaleString('en-IN')}</td>
                  </tr>
                  <tr>
                    <td><strong>5. Medical Allowance</strong></td>
                    <td>Earnings</td>
                    <td>₹{(employee.medical_allowance || 0).toLocaleString('en-IN')}</td>
                    <td>₹{((employee.medical_allowance || 0) * 12).toLocaleString('en-IN')}</td>
                  </tr>
                  <tr>
                    <td><strong>6. Special Allowance</strong></td>
                    <td>Earnings</td>
                    <td>₹{(employee.special_allowance || 0).toLocaleString('en-IN')}</td>
                    <td>₹{((employee.special_allowance || 0) * 12).toLocaleString('en-IN')}</td>
                  </tr>
                  <tr>
                    <td><strong>7. Other Additions</strong></td>
                    <td>Earnings</td>
                    <td>₹{(employee.other_additions || 0).toLocaleString('en-IN')}</td>
                    <td>₹{((employee.other_additions || 0) * 12).toLocaleString('en-IN')}</td>
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
                    <td style={{"color":"var(--accent-gold)"}}>₹{(employee.gross_monthly_salary || 0).toLocaleString('en-IN')}</td>
                    <td style={{"color":"var(--accent-gold)"}}>₹{((employee.gross_monthly_salary || 0) * 12).toLocaleString('en-IN')}</td>
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
                    <td><strong>1. Employee PF</strong></td>
                    <td>Deductions</td>
                    <td>₹{(employee.employee_pf_monthly || 0).toLocaleString('en-IN')}</td>
                  </tr>
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
                    <td><strong>Employer PF Contribution</strong></td>
                    <td><span className="badge badge-neutral">Employer Cost</span></td>
                    <td>₹{(employee.employer_pf_monthly || 0).toLocaleString('en-IN')}</td>
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
                    <tr>
                      <td colSpan="7" style={{"textAlign":"center","padding":"3rem 1rem","color":"var(--text-muted)","fontStyle":"italic"}}>
                        Audit log will come soon (Dependent on Payroll Module)
                      </td>
                    </tr>
                    {/*
                    <tr>
                      <td>₹45,000</td>
                      <td><strong>₹54,500</strong></td>
                      <td><span className="badge badge-success">+21.1%</span></td>
                      <td>April 01, 2026</td>
                      <td>Annual Increment &amp; Performance Adjustment</td>
                      <td><strong>Rajesh - Agency Admin</strong></td>
                      <td style={{"textAlign":"right"}}>
                        <button className="btn btn-link btn-xs" onClick={(event) => { window.toggleBreakup('breakup-2026-04') }}>View Breakup ▼</button>
                      </td>
                    </tr>
                    <tr id="breakup-2026-04" style={{"display":"none","backgroundColor":"#F8FAFC"}}>
                      <td colSpan="7" style={{"padding":"1.5rem"}}>
                        <div style={{"background":"white","border":"1px solid var(--border-color)","borderRadius":"var(--radius-sm)","padding":"1.25rem","boxShadow":"0 1px 3px rgba(0,0,0,0.05)"}}>
                          <h4 style={{"fontSize":"0.95rem","color":"var(--primary-navy)","marginBottom":"1rem","borderBottom":"1px solid var(--border-color)","paddingBottom":"0.5rem"}}>
                            Compensation Breakup Snapshot (Effective April 01, 2026)
                          </h4>
                          <div style={{"marginBottom":"1rem","fontSize":"0.85rem","fontWeight":"bold","color":"var(--primary-navy)"}}>EARNINGS (Gross: ₹54,500)</div>
                          <div style={{"display":"grid","gridTemplateColumns":"repeat(auto-fit, minmax(140px, 1fr))","gap":"1rem","marginBottom":"1.5rem"}}>
                            <div style={{"background":"#F1F5F9","padding":"0.75rem","borderRadius":"var(--radius-sm)"}}>
                              <div style={{"fontSize":"0.75rem","color":"var(--text-muted)"}}>1. Basic Pay</div>
                              <div style={{"fontWeight":"600","color":"var(--text-main)","fontSize":"0.95rem"}}>₹35,000</div>
                            </div>
                            <div style={{"background":"#F1F5F9","padding":"0.75rem","borderRadius":"var(--radius-sm)"}}>
                              <div style={{"fontSize":"0.75rem","color":"var(--text-muted)"}}>2. HRA</div>
                              <div style={{"fontWeight":"600","color":"var(--text-main)","fontSize":"0.95rem"}}>₹14,000</div>
                            </div>
                            <div style={{"background":"#F1F5F9","padding":"0.75rem","borderRadius":"var(--radius-sm)"}}>
                              <div style={{"fontSize":"0.75rem","color":"var(--text-muted)"}}>3. Conveyance</div>
                              <div style={{"fontWeight":"600","color":"var(--text-main)","fontSize":"0.95rem"}}>₹1,600</div>
                            </div>
                            <div style={{"background":"#F1F5F9","padding":"0.75rem","borderRadius":"var(--radius-sm)"}}>
                              <div style={{"fontSize":"0.75rem","color":"var(--text-muted)"}}>4. DA</div>
                              <div style={{"fontWeight":"600","color":"var(--text-main)","fontSize":"0.95rem"}}>₹0</div>
                            </div>
                            <div style={{"background":"#F1F5F9","padding":"0.75rem","borderRadius":"var(--radius-sm)"}}>
                              <div style={{"fontSize":"0.75rem","color":"var(--text-muted)"}}>5. Medical Allowance</div>
                              <div style={{"fontWeight":"600","color":"var(--text-main)","fontSize":"0.95rem"}}>₹0</div>
                            </div>
                            <div style={{"background":"#F1F5F9","padding":"0.75rem","borderRadius":"var(--radius-sm)"}}>
                              <div style={{"fontSize":"0.75rem","color":"var(--text-muted)"}}>6. Special Allowance</div>
                              <div style={{"fontWeight":"600","color":"var(--text-main)","fontSize":"0.95rem"}}>₹3,900</div>
                            </div>
                            <div style={{"background":"#F1F5F9","padding":"0.75rem","borderRadius":"var(--radius-sm)"}}>
                              <div style={{"fontSize":"0.75rem","color":"var(--text-muted)"}}>7. Other Additions</div>
                              <div style={{"fontWeight":"600","color":"var(--text-main)","fontSize":"0.95rem"}}>₹0</div>
                            </div>
                            <div style={{"background":"#F1F5F9","padding":"0.75rem","borderRadius":"var(--radius-sm)"}}>
                              <div style={{"fontSize":"0.75rem","color":"var(--text-muted)"}}>8. Arrears Amount</div>
                              <div style={{"fontWeight":"600","color":"var(--text-main)","fontSize":"0.95rem"}}>₹0</div>
                            </div>
                          </div>

                          <div style={{"marginBottom":"1rem","fontSize":"0.85rem","fontWeight":"bold","color":"var(--status-danger)"}}>DEDUCTIONS (Total: ₹8,900)</div>
                          <div style={{"display":"grid","gridTemplateColumns":"repeat(auto-fit, minmax(140px, 1fr))","gap":"1rem"}}>
                            <div style={{"background":"#FFF5F5","padding":"0.75rem","borderRadius":"var(--radius-sm)","border":"1px solid #FEB2B2"}}>
                              <div style={{"fontSize":"0.75rem","color":"#991B1B"}}>1. Employee PF</div>
                              <div style={{"fontWeight":"600","color":"#991B1B","fontSize":"0.95rem"}}>₹4,200</div>
                            </div>
                            <div style={{"background":"#FFF5F5","padding":"0.75rem","borderRadius":"var(--radius-sm)","border":"1px solid #FEB2B2"}}>
                              <div style={{"fontSize":"0.75rem","color":"#991B1B"}}>2. Employee ESIC</div>
                              <div style={{"fontWeight":"600","color":"#991B1B","fontSize":"0.95rem"}}>₹0</div>
                            </div>
                            <div style={{"background":"#FFF5F5","padding":"0.75rem","borderRadius":"var(--radius-sm)","border":"1px solid #FEB2B2"}}>
                              <div style={{"fontSize":"0.75rem","color":"#991B1B"}}>3. Professional Tax</div>
                              <div style={{"fontWeight":"600","color":"#991B1B","fontSize":"0.95rem"}}>₹200</div>
                            </div>
                            <div style={{"background":"#FFF5F5","padding":"0.75rem","borderRadius":"var(--radius-sm)","border":"1px solid #FEB2B2"}}>
                              <div style={{"fontSize":"0.75rem","color":"#991B1B"}}>4. Welfare Fund</div>
                              <div style={{"fontWeight":"600","color":"#991B1B","fontSize":"0.95rem"}}>₹0</div>
                            </div>
                            <div style={{"background":"#FFF5F5","padding":"0.75rem","borderRadius":"var(--radius-sm)","border":"1px solid #FEB2B2"}}>
                              <div style={{"fontSize":"0.75rem","color":"#991B1B"}}>5. LOP Deduction</div>
                              <div style={{"fontWeight":"600","color":"#991B1B","fontSize":"0.95rem"}}>₹0</div>
                            </div>
                            <div style={{"background":"#FFF5F5","padding":"0.75rem","borderRadius":"var(--radius-sm)","border":"1px solid #FEB2B2"}}>
                              <div style={{"fontSize":"0.75rem","color":"#991B1B"}}>6. TDS</div>
                              <div style={{"fontWeight":"600","color":"#991B1B","fontSize":"0.95rem"}}>₹4,500</div>
                            </div>
                          </div>

                          <div style={{"marginTop":"1.5rem","padding":"1rem","background":"var(--primary-navy)","color":"white","borderRadius":"var(--radius-sm)","display":"flex","justifyContent":"space-between","fontWeight":"bold","fontSize":"1.1rem"}}>
                            <span>NET TAKE HOME</span>
                            <span style={{"color":"var(--accent-gold)"}}>₹45,600</span>
                          </div>

                          <div style={{"marginTop":"1.5rem","marginBottom":"1rem","fontSize":"0.85rem","fontWeight":"bold","color":"#64748B"}}>EMPLOYER CONTRIBUTIONS (Total: ₹4,200)</div>
                          <div style={{"display":"grid","gridTemplateColumns":"repeat(auto-fit, minmax(140px, 1fr))","gap":"1rem"}}>
                            <div style={{"background":"#FFFDF0","padding":"0.75rem","borderRadius":"var(--radius-sm)","border":"1px solid #FEF08A"}}>
                              <div style={{"fontSize":"0.75rem","color":"#854D0E"}}>1. Employer PF</div>
                              <div style={{"fontWeight":"600","color":"#854D0E","fontSize":"0.95rem"}}>₹4,200</div>
                            </div>
                            <div style={{"background":"#FFFDF0","padding":"0.75rem","borderRadius":"var(--radius-sm)","border":"1px solid #FEF08A"}}>
                              <div style={{"fontSize":"0.75rem","color":"#854D0E"}}>2. Employer ESIC</div>
                              <div style={{"fontWeight":"600","color":"#854D0E","fontSize":"0.95rem"}}>₹0</div>
                            </div>
                          </div>

                          <div style={{"marginTop":"1.5rem","padding":"1rem","background":"#F1F5F9","border":"2px dashed var(--border-color)","borderRadius":"var(--radius-sm)","display":"flex","justifyContent":"space-between","fontWeight":"bold","fontSize":"1.1rem","color":"var(--primary-navy)"}}>
                            <span>COST TO COMPANY (CTC)</span>
                            <span>₹58,700</span>
                          </div>
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td>₹38,000</td>
                      <td><strong>₹45,000</strong></td>
                      <td><span className="badge badge-success">+18.4%</span></td>
                      <td>Oct 01, 2025</td>
                      <td>Promotion (Mid-year Review)</td>
                      <td><strong>Rajesh - Agency Admin</strong></td>
                      <td style={{"textAlign":"right"}}>
                        <button className="btn btn-link btn-xs" onClick={(event) => { window.toggleBreakup('breakup-2025-10') }}>View Breakup ▼</button>
                      </td>
                    </tr>
                    <tr id="breakup-2025-10" style={{"display":"none","backgroundColor":"#F8FAFC"}}>
                      <td colSpan="7" style={{"padding":"1.5rem"}}>
                        <div style={{"background":"white","border":"1px solid var(--border-color)","borderRadius":"var(--radius-sm)","padding":"1.25rem","boxShadow":"0 1px 3px rgba(0,0,0,0.05)"}}>
                          <h4 style={{"fontSize":"0.95rem","color":"var(--primary-navy)","marginBottom":"1rem","borderBottom":"1px solid var(--border-color)","paddingBottom":"0.5rem"}}>
                            Compensation Breakup Snapshot (Effective Oct 01, 2025)
                          </h4>
                          <div style={{"marginBottom":"1rem","fontSize":"0.85rem","fontWeight":"bold","color":"var(--primary-navy)"}}>EARNINGS (Gross: ₹45,000)</div>
                          <div style={{"display":"grid","gridTemplateColumns":"repeat(auto-fit, minmax(140px, 1fr))","gap":"1rem","marginBottom":"1.5rem"}}>
                            <div style={{"background":"#F1F5F9","padding":"0.75rem","borderRadius":"var(--radius-sm)"}}>
                              <div style={{"fontSize":"0.75rem","color":"var(--text-muted)"}}>1. Basic Pay</div>
                              <div style={{"fontWeight":"600","color":"var(--text-main)","fontSize":"0.95rem"}}>₹22,000</div>
                            </div>
                            <div style={{"background":"#F1F5F9","padding":"0.75rem","borderRadius":"var(--radius-sm)"}}>
                              <div style={{"fontSize":"0.75rem","color":"var(--text-muted)"}}>2. HRA</div>
                              <div style={{"fontWeight":"600","color":"var(--text-main)","fontSize":"0.95rem"}}>₹11,000</div>
                            </div>
                            <div style={{"background":"#F1F5F9","padding":"0.75rem","borderRadius":"var(--radius-sm)"}}>
                              <div style={{"fontSize":"0.75rem","color":"var(--text-muted)"}}>3. Conveyance</div>
                              <div style={{"fontWeight":"600","color":"var(--text-main)","fontSize":"0.95rem"}}>₹1,600</div>
                            </div>
                            <div style={{"background":"#F1F5F9","padding":"0.75rem","borderRadius":"var(--radius-sm)"}}>
                              <div style={{"fontSize":"0.75rem","color":"var(--text-muted)"}}>4. DA</div>
                              <div style={{"fontWeight":"600","color":"var(--text-main)","fontSize":"0.95rem"}}>₹0</div>
                            </div>
                            <div style={{"background":"#F1F5F9","padding":"0.75rem","borderRadius":"var(--radius-sm)"}}>
                              <div style={{"fontSize":"0.75rem","color":"var(--text-muted)"}}>5. Medical Allowance</div>
                              <div style={{"fontWeight":"600","color":"var(--text-main)","fontSize":"0.95rem"}}>₹0</div>
                            </div>
                            <div style={{"background":"#F1F5F9","padding":"0.75rem","borderRadius":"var(--radius-sm)"}}>
                              <div style={{"fontSize":"0.75rem","color":"var(--text-muted)"}}>6. Special Allowance</div>
                              <div style={{"fontWeight":"600","color":"var(--text-main)","fontSize":"0.95rem"}}>₹10,400</div>
                            </div>
                            <div style={{"background":"#F1F5F9","padding":"0.75rem","borderRadius":"var(--radius-sm)"}}>
                              <div style={{"fontSize":"0.75rem","color":"var(--text-muted)"}}>7. Other Additions</div>
                              <div style={{"fontWeight":"600","color":"var(--text-main)","fontSize":"0.95rem"}}>₹0</div>
                            </div>
                            <div style={{"background":"#F1F5F9","padding":"0.75rem","borderRadius":"var(--radius-sm)"}}>
                              <div style={{"fontSize":"0.75rem","color":"var(--text-muted)"}}>8. Arrears Amount</div>
                              <div style={{"fontWeight":"600","color":"var(--text-main)","fontSize":"0.95rem"}}>₹0</div>
                            </div>
                          </div>

                          <div style={{"marginBottom":"1rem","fontSize":"0.85rem","fontWeight":"bold","color":"var(--status-danger)"}}>DEDUCTIONS (Total: ₹7,340)</div>
                          <div style={{"display":"grid","gridTemplateColumns":"repeat(auto-fit, minmax(140px, 1fr))","gap":"1rem"}}>
                            <div style={{"background":"#FFF5F5","padding":"0.75rem","borderRadius":"var(--radius-sm)","border":"1px solid #FEB2B2"}}>
                              <div style={{"fontSize":"0.75rem","color":"#991B1B"}}>1. Employee PF</div>
                              <div style={{"fontWeight":"600","color":"#991B1B","fontSize":"0.95rem"}}>₹2,640</div>
                            </div>
                            <div style={{"background":"#FFF5F5","padding":"0.75rem","borderRadius":"var(--radius-sm)","border":"1px solid #FEB2B2"}}>
                              <div style={{"fontSize":"0.75rem","color":"#991B1B"}}>2. Employee ESIC</div>
                              <div style={{"fontWeight":"600","color":"#991B1B","fontSize":"0.95rem"}}>₹0</div>
                            </div>
                            <div style={{"background":"#FFF5F5","padding":"0.75rem","borderRadius":"var(--radius-sm)","border":"1px solid #FEB2B2"}}>
                              <div style={{"fontSize":"0.75rem","color":"#991B1B"}}>3. Professional Tax</div>
                              <div style={{"fontWeight":"600","color":"#991B1B","fontSize":"0.95rem"}}>₹200</div>
                            </div>
                            <div style={{"background":"#FFF5F5","padding":"0.75rem","borderRadius":"var(--radius-sm)","border":"1px solid #FEB2B2"}}>
                              <div style={{"fontSize":"0.75rem","color":"#991B1B"}}>4. Welfare Fund</div>
                              <div style={{"fontWeight":"600","color":"#991B1B","fontSize":"0.95rem"}}>₹0</div>
                            </div>
                            <div style={{"background":"#FFF5F5","padding":"0.75rem","borderRadius":"var(--radius-sm)","border":"1px solid #FEB2B2"}}>
                              <div style={{"fontSize":"0.75rem","color":"#991B1B"}}>5. LOP Deduction</div>
                              <div style={{"fontWeight":"600","color":"#991B1B","fontSize":"0.95rem"}}>₹0</div>
                            </div>
                            <div style={{"background":"#FFF5F5","padding":"0.75rem","borderRadius":"var(--radius-sm)","border":"1px solid #FEB2B2"}}>
                              <div style={{"fontSize":"0.75rem","color":"#991B1B"}}>6. TDS</div>
                              <div style={{"fontWeight":"600","color":"#991B1B","fontSize":"0.95rem"}}>₹4,500</div>
                            </div>
                          </div>

                          <div style={{"marginTop":"1.5rem","padding":"1rem","background":"var(--primary-navy)","color":"white","borderRadius":"var(--radius-sm)","display":"flex","justifyContent":"space-between","fontWeight":"bold","fontSize":"1.1rem"}}>
                            <span>NET TAKE HOME</span>
                            <span style={{"color":"var(--accent-gold)"}}>₹37,660</span>
                          </div>

                          <div style={{"marginTop":"1.5rem","marginBottom":"1rem","fontSize":"0.85rem","fontWeight":"bold","color":"#64748B"}}>EMPLOYER CONTRIBUTIONS (Total: ₹2,640)</div>
                          <div style={{"display":"grid","gridTemplateColumns":"repeat(auto-fit, minmax(140px, 1fr))","gap":"1rem"}}>
                            <div style={{"background":"#FFFDF0","padding":"0.75rem","borderRadius":"var(--radius-sm)","border":"1px solid #FEF08A"}}>
                              <div style={{"fontSize":"0.75rem","color":"#854D0E"}}>1. Employer PF</div>
                              <div style={{"fontWeight":"600","color":"#854D0E","fontSize":"0.95rem"}}>₹2,640</div>
                            </div>
                            <div style={{"background":"#FFFDF0","padding":"0.75rem","borderRadius":"var(--radius-sm)","border":"1px solid #FEF08A"}}>
                              <div style={{"fontSize":"0.75rem","color":"#854D0E"}}>2. Employer ESIC</div>
                              <div style={{"fontWeight":"600","color":"#854D0E","fontSize":"0.95rem"}}>₹0</div>
                            </div>
                          </div>

                          <div style={{"marginTop":"1.5rem","padding":"1rem","background":"#F1F5F9","border":"2px dashed var(--border-color)","borderRadius":"var(--radius-sm)","display":"flex","justifyContent":"space-between","fontWeight":"bold","fontSize":"1.1rem","color":"var(--primary-navy)"}}>
                            <span>COST TO COMPANY (CTC)</span>
                            <span>₹47,640</span>
                          </div>
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td>₹35,000</td>
                      <td><strong>₹38,000</strong></td>
                      <td><span className="badge badge-success">+8.6%</span></td>
                      <td>July 01, 2025</td>
                      <td>Market Correction</td>
                      <td><strong>Sunita - HR Manager</strong></td>
                      <td style={{"textAlign":"right"}}>
                        <button className="btn btn-link btn-xs" onClick={(event) => { window.toggleBreakup('breakup-2025-07') }}>View Breakup ▼</button>
                      </td>
                    </tr>
                    <tr id="breakup-2025-07" style={{"display":"none","backgroundColor":"#F8FAFC"}}>
                      <td colSpan="7" style={{"padding":"1.5rem"}}>
                        <div style={{"background":"white","border":"1px solid var(--border-color)","borderRadius":"var(--radius-sm)","padding":"1.25rem","boxShadow":"0 1px 3px rgba(0,0,0,0.05)"}}>
                          <h4 style={{"fontSize":"0.95rem","color":"var(--primary-navy)","marginBottom":"1rem","borderBottom":"1px solid var(--border-color)","paddingBottom":"0.5rem"}}>
                            Compensation Breakup Snapshot (Effective July 01, 2025)
                          </h4>
                          <div style={{"marginBottom":"1rem","fontSize":"0.85rem","fontWeight":"bold","color":"var(--primary-navy)"}}>EARNINGS (Gross: ₹38,000)</div>
                          <div style={{"display":"grid","gridTemplateColumns":"repeat(auto-fit, minmax(140px, 1fr))","gap":"1rem","marginBottom":"1.5rem"}}>
                            <div style={{"background":"#F1F5F9","padding":"0.75rem","borderRadius":"var(--radius-sm)"}}>
                              <div style={{"fontSize":"0.75rem","color":"var(--text-muted)"}}>1. Basic Pay</div>
                              <div style={{"fontWeight":"600","color":"var(--text-main)","fontSize":"0.95rem"}}>₹19,000</div>
                            </div>
                            <div style={{"background":"#F1F5F9","padding":"0.75rem","borderRadius":"var(--radius-sm)"}}>
                              <div style={{"fontSize":"0.75rem","color":"var(--text-muted)"}}>2. HRA</div>
                              <div style={{"fontWeight":"600","color":"var(--text-main)","fontSize":"0.95rem"}}>₹9,500</div>
                            </div>
                            <div style={{"background":"#F1F5F9","padding":"0.75rem","borderRadius":"var(--radius-sm)"}}>
                              <div style={{"fontSize":"0.75rem","color":"var(--text-muted)"}}>3. Conveyance</div>
                              <div style={{"fontWeight":"600","color":"var(--text-main)","fontSize":"0.95rem"}}>₹1,600</div>
                            </div>
                            <div style={{"background":"#F1F5F9","padding":"0.75rem","borderRadius":"var(--radius-sm)"}}>
                              <div style={{"fontSize":"0.75rem","color":"var(--text-muted)"}}>4. DA</div>
                              <div style={{"fontWeight":"600","color":"var(--text-main)","fontSize":"0.95rem"}}>₹0</div>
                            </div>
                            <div style={{"background":"#F1F5F9","padding":"0.75rem","borderRadius":"var(--radius-sm)"}}>
                              <div style={{"fontSize":"0.75rem","color":"var(--text-muted)"}}>5. Medical Allowance</div>
                              <div style={{"fontWeight":"600","color":"var(--text-main)","fontSize":"0.95rem"}}>₹0</div>
                            </div>
                            <div style={{"background":"#F1F5F9","padding":"0.75rem","borderRadius":"var(--radius-sm)"}}>
                              <div style={{"fontSize":"0.75rem","color":"var(--text-muted)"}}>6. Special Allowance</div>
                              <div style={{"fontWeight":"600","color":"var(--text-main)","fontSize":"0.95rem"}}>₹7,900</div>
                            </div>
                            <div style={{"background":"#F1F5F9","padding":"0.75rem","borderRadius":"var(--radius-sm)"}}>
                              <div style={{"fontSize":"0.75rem","color":"var(--text-muted)"}}>7. Other Additions</div>
                              <div style={{"fontWeight":"600","color":"var(--text-main)","fontSize":"0.95rem"}}>₹0</div>
                            </div>
                            <div style={{"background":"#F1F5F9","padding":"0.75rem","borderRadius":"var(--radius-sm)"}}>
                              <div style={{"fontSize":"0.75rem","color":"var(--text-muted)"}}>8. Arrears Amount</div>
                              <div style={{"fontWeight":"600","color":"var(--text-main)","fontSize":"0.95rem"}}>₹0</div>
                            </div>
                          </div>

                          <div style={{"marginBottom":"1rem","fontSize":"0.85rem","fontWeight":"bold","color":"var(--status-danger)"}}>DEDUCTIONS (Total: ₹5,480)</div>
                          <div style={{"display":"grid","gridTemplateColumns":"repeat(auto-fit, minmax(140px, 1fr))","gap":"1rem"}}>
                            <div style={{"background":"#FFF5F5","padding":"0.75rem","borderRadius":"var(--radius-sm)","border":"1px solid #FEB2B2"}}>
                              <div style={{"fontSize":"0.75rem","color":"#991B1B"}}>1. Employee PF</div>
                              <div style={{"fontWeight":"600","color":"#991B1B","fontSize":"0.95rem"}}>₹2,280</div>
                            </div>
                            <div style={{"background":"#FFF5F5","padding":"0.75rem","borderRadius":"var(--radius-sm)","border":"1px solid #FEB2B2"}}>
                              <div style={{"fontSize":"0.75rem","color":"#991B1B"}}>2. Employee ESIC</div>
                              <div style={{"fontWeight":"600","color":"#991B1B","fontSize":"0.95rem"}}>₹0</div>
                            </div>
                            <div style={{"background":"#FFF5F5","padding":"0.75rem","borderRadius":"var(--radius-sm)","border":"1px solid #FEB2B2"}}>
                              <div style={{"fontSize":"0.75rem","color":"#991B1B"}}>3. Professional Tax</div>
                              <div style={{"fontWeight":"600","color":"#991B1B","fontSize":"0.95rem"}}>₹200</div>
                            </div>
                            <div style={{"background":"#FFF5F5","padding":"0.75rem","borderRadius":"var(--radius-sm)","border":"1px solid #FEB2B2"}}>
                              <div style={{"fontSize":"0.75rem","color":"#991B1B"}}>4. Welfare Fund</div>
                              <div style={{"fontWeight":"600","color":"#991B1B","fontSize":"0.95rem"}}>₹0</div>
                            </div>
                            <div style={{"background":"#FFF5F5","padding":"0.75rem","borderRadius":"var(--radius-sm)","border":"1px solid #FEB2B2"}}>
                              <div style={{"fontSize":"0.75rem","color":"#991B1B"}}>5. LOP Deduction</div>
                              <div style={{"fontWeight":"600","color":"#991B1B","fontSize":"0.95rem"}}>₹0</div>
                            </div>
                            <div style={{"background":"#FFF5F5","padding":"0.75rem","borderRadius":"var(--radius-sm)","border":"1px solid #FEB2B2"}}>
                              <div style={{"fontSize":"0.75rem","color":"#991B1B"}}>6. TDS</div>
                              <div style={{"fontWeight":"600","color":"#991B1B","fontSize":"0.95rem"}}>₹3,000</div>
                            </div>
                          </div>

                          <div style={{"marginTop":"1.5rem","padding":"1rem","background":"var(--primary-navy)","color":"white","borderRadius":"var(--radius-sm)","display":"flex","justifyContent":"space-between","fontWeight":"bold","fontSize":"1.1rem"}}>
                            <span>NET TAKE HOME</span>
                            <span style={{"color":"var(--accent-gold)"}}>₹32,520</span>
                          </div>

                          <div style={{"marginTop":"1.5rem","marginBottom":"1rem","fontSize":"0.85rem","fontWeight":"bold","color":"#64748B"}}>EMPLOYER CONTRIBUTIONS (Total: ₹2,280)</div>
                          <div style={{"display":"grid","gridTemplateColumns":"repeat(auto-fit, minmax(140px, 1fr))","gap":"1rem"}}>
                            <div style={{"background":"#FFFDF0","padding":"0.75rem","borderRadius":"var(--radius-sm)","border":"1px solid #FEF08A"}}>
                              <div style={{"fontSize":"0.75rem","color":"#854D0E"}}>1. Employer PF</div>
                              <div style={{"fontWeight":"600","color":"#854D0E","fontSize":"0.95rem"}}>₹2,280</div>
                            </div>
                            <div style={{"background":"#FFFDF0","padding":"0.75rem","borderRadius":"var(--radius-sm)","border":"1px solid #FEF08A"}}>
                              <div style={{"fontSize":"0.75rem","color":"#854D0E"}}>2. Employer ESIC</div>
                              <div style={{"fontWeight":"600","color":"#854D0E","fontSize":"0.95rem"}}>₹0</div>
                            </div>
                          </div>

                          <div style={{"marginTop":"1.5rem","padding":"1rem","background":"#F1F5F9","border":"2px dashed var(--border-color)","borderRadius":"var(--radius-sm)","display":"flex","justifyContent":"space-between","fontWeight":"bold","fontSize":"1.1rem","color":"var(--primary-navy)"}}>
                            <span>COST TO COMPANY (CTC)</span>
                            <span>₹40,280</span>
                          </div>
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td>—</td>
                      <td><strong>₹35,000</strong></td>
                      <td><span className="badge badge-neutral">Base CTC</span></td>
                      <td>Jan 15, 2025</td>
                      <td>Initial Onboarding Structure Setup</td>
                      <td><strong>Rajesh - Agency Admin</strong></td>
                      <td style={{"textAlign":"right"}}>
                        <button className="btn btn-link btn-xs" onClick={(event) => { window.toggleBreakup('breakup-2025-01') }}>View Breakup ▼</button>
                      </td>
                    </tr>
                    <tr id="breakup-2025-01" style={{"display":"none","backgroundColor":"#F8FAFC"}}>
                      <td colSpan="7" style={{"padding":"1.5rem"}}>
                        <div style={{"background":"white","border":"1px solid var(--border-color)","borderRadius":"var(--radius-sm)","padding":"1.25rem","boxShadow":"0 1px 3px rgba(0,0,0,0.05)"}}>
                          <h4 style={{"fontSize":"0.95rem","color":"var(--primary-navy)","marginBottom":"1rem","borderBottom":"1px solid var(--border-color)","paddingBottom":"0.5rem"}}>
                            Compensation Breakup Snapshot (Effective Jan 15, 2025)
                          </h4>
                          <div style={{"marginBottom":"1rem","fontSize":"0.85rem","fontWeight":"bold","color":"var(--primary-navy)"}}>EARNINGS (Gross: ₹35,000)</div>
                          <div style={{"display":"grid","gridTemplateColumns":"repeat(auto-fit, minmax(140px, 1fr))","gap":"1rem","marginBottom":"1.5rem"}}>
                            <div style={{"background":"#F1F5F9","padding":"0.75rem","borderRadius":"var(--radius-sm)"}}>
                              <div style={{"fontSize":"0.75rem","color":"var(--text-muted)"}}>1. Basic Pay</div>
                              <div style={{"fontWeight":"600","color":"var(--text-main)","fontSize":"0.95rem"}}>₹17,500</div>
                            </div>
                            <div style={{"background":"#F1F5F9","padding":"0.75rem","borderRadius":"var(--radius-sm)"}}>
                              <div style={{"fontSize":"0.75rem","color":"var(--text-muted)"}}>2. HRA</div>
                              <div style={{"fontWeight":"600","color":"var(--text-main)","fontSize":"0.95rem"}}>₹8,750</div>
                            </div>
                            <div style={{"background":"#F1F5F9","padding":"0.75rem","borderRadius":"var(--radius-sm)"}}>
                              <div style={{"fontSize":"0.75rem","color":"var(--text-muted)"}}>3. Conveyance</div>
                              <div style={{"fontWeight":"600","color":"var(--text-main)","fontSize":"0.95rem"}}>₹1,600</div>
                            </div>
                            <div style={{"background":"#F1F5F9","padding":"0.75rem","borderRadius":"var(--radius-sm)"}}>
                              <div style={{"fontSize":"0.75rem","color":"var(--text-muted)"}}>4. DA</div>
                              <div style={{"fontWeight":"600","color":"var(--text-main)","fontSize":"0.95rem"}}>₹0</div>
                            </div>
                            <div style={{"background":"#F1F5F9","padding":"0.75rem","borderRadius":"var(--radius-sm)"}}>
                              <div style={{"fontSize":"0.75rem","color":"var(--text-muted)"}}>5. Medical Allowance</div>
                              <div style={{"fontWeight":"600","color":"var(--text-main)","fontSize":"0.95rem"}}>₹0</div>
                            </div>
                            <div style={{"background":"#F1F5F9","padding":"0.75rem","borderRadius":"var(--radius-sm)"}}>
                              <div style={{"fontSize":"0.75rem","color":"var(--text-muted)"}}>6. Special Allowance</div>
                              <div style={{"fontWeight":"600","color":"var(--text-main)","fontSize":"0.95rem"}}>₹7,150</div>
                            </div>
                            <div style={{"background":"#F1F5F9","padding":"0.75rem","borderRadius":"var(--radius-sm)"}}>
                              <div style={{"fontSize":"0.75rem","color":"var(--text-muted)"}}>7. Other Additions</div>
                              <div style={{"fontWeight":"600","color":"var(--text-main)","fontSize":"0.95rem"}}>₹0</div>
                            </div>
                            <div style={{"background":"#F1F5F9","padding":"0.75rem","borderRadius":"var(--radius-sm)"}}>
                              <div style={{"fontSize":"0.75rem","color":"var(--text-muted)"}}>8. Arrears Amount</div>
                              <div style={{"fontWeight":"600","color":"var(--text-main)","fontSize":"0.95rem"}}>₹0</div>
                            </div>
                          </div>

                          <div style={{"marginBottom":"1rem","fontSize":"0.85rem","fontWeight":"bold","color":"var(--status-danger)"}}>DEDUCTIONS (Total: ₹5,412.50)</div>
                          <div style={{"display":"grid","gridTemplateColumns":"repeat(auto-fit, minmax(140px, 1fr))","gap":"1rem"}}>
                            <div style={{"background":"#FFF5F5","padding":"0.75rem","borderRadius":"var(--radius-sm)","border":"1px solid #FEB2B2"}}>
                              <div style={{"fontSize":"0.75rem","color":"#991B1B"}}>1. Employee PF</div>
                              <div style={{"fontWeight":"600","color":"#991B1B","fontSize":"0.95rem"}}>₹2,100</div>
                            </div>
                            <div style={{"background":"#FFF5F5","padding":"0.75rem","borderRadius":"var(--radius-sm)","border":"1px solid #FEB2B2"}}>
                              <div style={{"fontSize":"0.75rem","color":"#991B1B"}}>2. Employee ESIC</div>
                              <div style={{"fontWeight":"600","color":"#991B1B","fontSize":"0.95rem"}}>₹612.50</div>
                            </div>
                            <div style={{"background":"#FFF5F5","padding":"0.75rem","borderRadius":"var(--radius-sm)","border":"1px solid #FEB2B2"}}>
                              <div style={{"fontSize":"0.75rem","color":"#991B1B"}}>3. Professional Tax</div>
                              <div style={{"fontWeight":"600","color":"#991B1B","fontSize":"0.95rem"}}>₹200</div>
                            </div>
                            <div style={{"background":"#FFF5F5","padding":"0.75rem","borderRadius":"var(--radius-sm)","border":"1px solid #FEB2B2"}}>
                              <div style={{"fontSize":"0.75rem","color":"#991B1B"}}>4. Welfare Fund</div>
                              <div style={{"fontWeight":"600","color":"#991B1B","fontSize":"0.95rem"}}>₹0</div>
                            </div>
                            <div style={{"background":"#FFF5F5","padding":"0.75rem","borderRadius":"var(--radius-sm)","border":"1px solid #FEB2B2"}}>
                              <div style={{"fontSize":"0.75rem","color":"#991B1B"}}>5. LOP Deduction</div>
                              <div style={{"fontWeight":"600","color":"#991B1B","fontSize":"0.95rem"}}>₹0</div>
                            </div>
                            <div style={{"background":"#FFF5F5","padding":"0.75rem","borderRadius":"var(--radius-sm)","border":"1px solid #FEB2B2"}}>
                              <div style={{"fontSize":"0.75rem","color":"#991B1B"}}>6. TDS</div>
                              <div style={{"fontWeight":"600","color":"#991B1B","fontSize":"0.95rem"}}>₹2,500</div>
                            </div>
                          </div>

                          <div style={{"marginTop":"1.5rem","padding":"1rem","background":"var(--primary-navy)","color":"white","borderRadius":"var(--radius-sm)","display":"flex","justifyContent":"space-between","fontWeight":"bold","fontSize":"1.1rem"}}>
                            <span>NET TAKE HOME</span>
                            <span style={{"color":"var(--accent-gold)"}}>₹29,587.50</span>
                          </div>

                          <div style={{"marginTop":"1.5rem","marginBottom":"1rem","fontSize":"0.85rem","fontWeight":"bold","color":"#64748B"}}>EMPLOYER CONTRIBUTIONS (Total: ₹2,712.50)</div>
                          <div style={{"display":"grid","gridTemplateColumns":"repeat(auto-fit, minmax(140px, 1fr))","gap":"1rem"}}>
                            <div style={{"background":"#FFFDF0","padding":"0.75rem","borderRadius":"var(--radius-sm)","border":"1px solid #FEF08A"}}>
                              <div style={{"fontSize":"0.75rem","color":"#854D0E"}}>1. Employer PF</div>
                              <div style={{"fontWeight":"600","color":"#854D0E","fontSize":"0.95rem"}}>₹2,100</div>
                            </div>
                            <div style={{"background":"#FFFDF0","padding":"0.75rem","borderRadius":"var(--radius-sm)","border":"1px solid #FEF08A"}}>
                              <div style={{"fontSize":"0.75rem","color":"#854D0E"}}>2. Employer ESIC</div>
                              <div style={{"fontWeight":"600","color":"#854D0E","fontSize":"0.95rem"}}>₹612.50</div>
                            </div>
                          </div>

                          <div style={{"marginTop":"1.5rem","padding":"1rem","background":"#F1F5F9","border":"2px dashed var(--border-color)","borderRadius":"var(--radius-sm)","display":"flex","justifyContent":"space-between","fontWeight":"bold","fontSize":"1.1rem","color":"var(--primary-navy)"}}>
                            <span>COST TO COMPANY (CTC)</span>
                            <span>₹37,712.50</span>
                          </div>
                        </div>
                      </td>
                    </tr>
                    */}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/*  Tab 3: Attendance  */}
        <div className="tab-content" data-tab="attendance">
          <div style={{"padding":"3rem 1rem","textAlign":"center","color":"var(--text-muted)","fontStyle":"italic"}}>
            Attendance records will come soon (Dependent on Employee Login Portal)
          </div>
          {false && (
          <div style={{"display":"flex","flexDirection":"column","gap":"2rem"}}>
            {/*  Monthly Summary Strip  */}
            <div className="card" style={{"border":"1px solid var(--border-color)","background":"#F8FAFC","padding":"1.25rem"}}>
              <div className="flex-row-between" style={{"marginBottom":"1rem","borderBottom":"1px solid var(--border-color)","paddingBottom":"0.75rem","flexWrap":"wrap","gap":"1rem"}}>
                <div style={{"display":"flex","alignItems":"center","gap":"1rem","flexWrap":"wrap"}}>
                  <h3 id="att-month-title" style={{"fontSize":"1.15rem","margin":"0","color":"var(--primary-navy)"}}>Attendance Summary (June 2026)</h3>
                  <div style={{"display":"flex","alignItems":"center","background":"#FFFFFF","borderRadius":"var(--radius-md)","padding":"0.25rem","border":"1px solid var(--border-color)","boxShadow":"0 1px 2px rgba(0,0,0,0.05)"}}>
                    <button className="btn btn-xs btn-secondary" onClick={(event) => { window.changeAttendanceMonth(-1) }} style={{"padding":"0.25rem 0.6rem","border":"none","background":"#F1F5F9","fontWeight":"bold","cursor":"pointer"}}>←</button>
                    <select id="attendance-month-select" onChange={(event) => { window.onAttendanceMonthSelect() }} style={{"background":"transparent","border":"none","fontWeight":"600","color":"var(--primary-navy)","padding":"0 0.5rem","cursor":"pointer","outline":"none"}}>
                      <option value="0">April 2026</option>
                      <option value="1">May 2026</option>
                      <option value="2" >June 2026</option>
                      <option value="3">July 2026</option>
                    </select>
                    <button className="btn btn-xs btn-secondary" onClick={(event) => { window.changeAttendanceMonth(1) }} style={{"padding":"0.25rem 0.6rem","border":"none","background":"#F1F5F9","fontWeight":"bold","cursor":"pointer"}}>→</button>
                  </div>
                </div>
                <span className="badge badge-navy" style={{"fontSize":"0.85rem"}}>Biometric &amp; Portal Sync</span>
              </div>
              <div style={{"display":"grid","gridTemplateColumns":"repeat(4, 1fr)","gap":"1rem","textAlign":"center"}}>
                <div style={{"background":"white","padding":"1rem","borderRadius":"var(--radius-sm)","border":"1px solid var(--border-color)"}}>
                  <div style={{"fontSize":"0.75rem","color":"var(--text-muted)","textTransform":"uppercase","fontWeight":"600"}}>Present Days</div>
                  <div id="att-present-count" style={{"fontSize":"1.5rem","fontWeight":"700","color":"var(--status-success)","marginTop":"0.25rem"}}>19 <span style={{"fontSize":"0.85rem","fontWeight":"500","color":"var(--text-muted)"}}>(+1 Half)</span></div>
                </div>
                <div style={{"background":"white","padding":"1rem","borderRadius":"var(--radius-sm)","border":"1px solid var(--border-color)"}}>
                  <div style={{"fontSize":"0.75rem","color":"var(--text-muted)","textTransform":"uppercase","fontWeight":"600"}}>Leave Days</div>
                  <div id="att-leave-count" style={{"fontSize":"1.5rem","fontWeight":"700","color":"var(--status-info)","marginTop":"0.25rem"}}>1</div>
                </div>
                <div style={{"background":"white","padding":"1rem","borderRadius":"var(--radius-sm)","border":"1px solid var(--border-color)"}}>
                  <div style={{"fontSize":"0.75rem","color":"var(--text-muted)","textTransform":"uppercase","fontWeight":"600"}}>Absent Days</div>
                  <div id="att-absent-count" style={{"fontSize":"1.5rem","fontWeight":"700","color":"var(--status-danger)","marginTop":"0.25rem"}}>1</div>
                </div>
                <div style={{"background":"white","padding":"1rem","borderRadius":"var(--radius-sm)","border":"1px solid var(--border-color)","borderBottom":"3px solid var(--accent-gold)"}}>
                  <div style={{"fontSize":"0.75rem","color":"var(--text-muted)","textTransform":"uppercase","fontWeight":"600"}}>Total Working Days</div>
                  <div id="att-total-count" style={{"fontSize":"1.5rem","fontWeight":"700","color":"var(--primary-navy)","marginTop":"0.25rem"}}>22</div>
                </div>
              </div>
            </div>

            {/*  Calendar Grid  */}
            <div>
              <h4 style={{"fontSize":"1rem","marginBottom":"0.5rem","color":"var(--primary-navy)"}}>Monthly Calendar View</h4>
              <div className="calendar-grid" id="att-calendar-grid">
                {/*  Day Headers  */}
                <div className="calendar-day-header">Mon</div>
                <div className="calendar-day-header">Tue</div>
                <div className="calendar-day-header">Wed</div>
                <div className="calendar-day-header">Thu</div>
                <div className="calendar-day-header">Fri</div>
                <div className="calendar-day-header">Sat</div>
                <div className="calendar-day-header">Sun</div>

                {/*  Week 1  */}
                <div className="calendar-day-cell present"><span>1</span><span className="calendar-indicator present">Present</span></div>
                <div className="calendar-day-cell present"><span>2</span><span className="calendar-indicator present">Present</span></div>
                <div className="calendar-day-cell present"><span>3</span><span className="calendar-indicator present">Present</span></div>
                <div className="calendar-day-cell present"><span>4</span><span className="calendar-indicator present">Present</span></div>
                <div className="calendar-day-cell present"><span>5</span><span className="calendar-indicator present">Present</span></div>
                <div className="calendar-day-cell other-month"><span>6</span><span className="calendar-indicator" style={{"color":"#94A3B8"}}>Wknd</span></div>
                <div className="calendar-day-cell other-month"><span>7</span><span className="calendar-indicator" style={{"color":"#94A3B8"}}>Wknd</span></div>

                {/*  Week 2  */}
                <div className="calendar-day-cell present"><span>8</span><span className="calendar-indicator present">Present</span></div>
                <div className="calendar-day-cell present"><span>9</span><span className="calendar-indicator present">Present</span></div>
                <div className="calendar-day-cell present"><span>10</span><span className="calendar-indicator present">Present</span></div>
                <div className="calendar-day-cell present"><span>11</span><span className="calendar-indicator present">Present</span></div>
                <div className="calendar-day-cell half-day"><span>12</span><span className="calendar-indicator half-day">Half-day</span></div>
                <div className="calendar-day-cell other-month"><span>13</span><span className="calendar-indicator" style={{"color":"#94A3B8"}}>Wknd</span></div>
                <div className="calendar-day-cell other-month"><span>14</span><span className="calendar-indicator" style={{"color":"#94A3B8"}}>Wknd</span></div>

                {/*  Week 3  */}
                <div className="calendar-day-cell present"><span>15</span><span className="calendar-indicator present">Present</span></div>
                <div className="calendar-day-cell present"><span>16</span><span className="calendar-indicator present">Present</span></div>
                <div className="calendar-day-cell present"><span>17</span><span className="calendar-indicator present">Present</span></div>
                <div className="calendar-day-cell present"><span>18</span><span className="calendar-indicator present">Present</span></div>
                <div className="calendar-day-cell absent"><span>19</span><span className="calendar-indicator absent">Absent</span></div>
                <div className="calendar-day-cell other-month"><span>20</span><span className="calendar-indicator" style={{"color":"#94A3B8"}}>Wknd</span></div>
                <div className="calendar-day-cell other-month"><span>21</span><span className="calendar-indicator" style={{"color":"#94A3B8"}}>Wknd</span></div>

                {/*  Week 4  */}
                <div className="calendar-day-cell present"><span>22</span><span className="calendar-indicator present">Present</span></div>
                <div className="calendar-day-cell leave"><span>23</span><span className="calendar-indicator leave">On Leave</span></div>
                <div className="calendar-day-cell present"><span>24</span><span className="calendar-indicator present">Present</span></div>
                <div className="calendar-day-cell present"><span>25</span><span className="calendar-indicator present">Present</span></div>
                <div className="calendar-day-cell present"><span>26</span><span className="calendar-indicator present">Present</span></div>
                <div className="calendar-day-cell other-month"><span>27</span><span className="calendar-indicator" style={{"color":"#94A3B8"}}>Wknd</span></div>
                <div className="calendar-day-cell other-month"><span>28</span><span className="calendar-indicator" style={{"color":"#94A3B8"}}>Wknd</span></div>

                {/*  Week 5  */}
                <div className="calendar-day-cell present"><span>29</span><span className="calendar-indicator present">Present</span></div>
                <div className="calendar-day-cell present"><span>30</span><span className="calendar-indicator present">Present</span></div>
                <div className="calendar-day-cell other-month"><span>1</span><span className="calendar-indicator" style={{"color":"#CBD5E1"}}>July</span></div>
                <div className="calendar-day-cell other-month"><span>2</span><span className="calendar-indicator" style={{"color":"#CBD5E1"}}>July</span></div>
                <div className="calendar-day-cell other-month"><span>3</span><span className="calendar-indicator" style={{"color":"#CBD5E1"}}>July</span></div>
                <div className="calendar-day-cell other-month"><span>4</span><span className="calendar-indicator" style={{"color":"#CBD5E1"}}>July</span></div>
                <div className="calendar-day-cell other-month"><span>5</span><span className="calendar-indicator" style={{"color":"#CBD5E1"}}>July</span></div>
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
                      <th>Punch-In Time</th>
                      <th>Punch-Out Time</th>
                      <th>Hours Worked</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>June 30, 2026</td>
                      <td>09:30 AM</td>
                      <td>06:15 PM</td>
                      <td>8h 45m</td>
                      <td><span className="badge badge-success">Present</span></td>
                    </tr>
                    <tr>
                      <td>June 29, 2026</td>
                      <td>09:28 AM</td>
                      <td>06:05 PM</td>
                      <td>8h 37m</td>
                      <td><span className="badge badge-success">Present</span></td>
                    </tr>
                    <tr>
                      <td>June 26, 2026</td>
                      <td>09:40 AM</td>
                      <td>06:10 PM</td>
                      <td>8h 30m</td>
                      <td><span className="badge badge-success">Present</span></td>
                    </tr>
                    <tr>
                      <td>June 25, 2026</td>
                      <td>09:42 AM</td>
                      <td>06:15 PM</td>
                      <td>8h 33m</td>
                      <td><span className="badge badge-success">Present</span></td>
                    </tr>
                    <tr>
                      <td>June 24, 2026</td>
                      <td>09:30 AM</td>
                      <td>06:05 PM</td>
                      <td>8h 35m</td>
                      <td><span className="badge badge-success">Present</span></td>
                    </tr>
                    <tr>
                      <td>June 23, 2026</td>
                      <td>—</td>
                      <td>—</td>
                      <td>0h 00m</td>
                      <td><span className="badge badge-info">On Leave (Sick)</span></td>
                    </tr>
                    <tr>
                      <td>June 22, 2026</td>
                      <td>09:35 AM</td>
                      <td>06:10 PM</td>
                      <td>8h 35m</td>
                      <td><span className="badge badge-success">Present</span></td>
                    </tr>
                    <tr>
                      <td>June 19, 2026</td>
                      <td>—</td>
                      <td>—</td>
                      <td>0h 00m</td>
                      <td><span className="badge badge-danger">Absent</span></td>
                    </tr>
                    <tr>
                      <td>June 18, 2026</td>
                      <td>09:25 AM</td>
                      <td>06:00 PM</td>
                      <td>8h 35m</td>
                      <td><span className="badge badge-success">Present</span></td>
                    </tr>
                    <tr>
                      <td>June 12, 2026</td>
                      <td>09:30 AM</td>
                      <td>01:30 PM</td>
                      <td>4h 00m</td>
                      <td><span className="badge badge-warning">Half-day</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          )}
        </div>

        {/*  Tab 4: Payslips  */}
        <div className="tab-content" data-tab="payslips">
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
                    <td><a href="/payroll/payslips" className="btn btn-secondary btn-xs">📥 Download PDF</a></td>
                  </tr>
                  <tr>
                    <td><strong>May 2026</strong></td>
                    <td>₹54,500</td>
                    <td><strong>₹50,000</strong></td>
                    <td><span className="badge badge-success">Disbursed</span></td>
                    <td><a href="/payroll/payslips" className="btn btn-secondary btn-xs">📥 Download PDF</a></td>
                  </tr>
                  <tr>
                    <td><strong>April 2026</strong></td>
                    <td>₹54,500</td>
                    <td><strong>₹50,000</strong></td>
                    <td><span className="badge badge-success">Disbursed</span></td>
                    <td><a href="/payroll/payslips" className="btn btn-secondary btn-xs">📥 Download PDF</a></td>
                  </tr>
                  <tr>
                    <td><strong>March 2026</strong></td>
                    <td>₹45,000</td>
                    <td><strong>₹41,000</strong></td>
                    <td><span className="badge badge-success">Disbursed</span></td>
                    <td><a href="/payroll/payslips" className="btn btn-secondary btn-xs">📥 Download PDF</a></td>
                  </tr>
                  */}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        
        {/*  Tab 5: Documents & KYC Checklist  */}
        <div className="tab-content" data-tab="docs">
          <div style={{"display":"flex","flexDirection":"column","gap":"2rem"}}>
            
            {/*  Overall Progress Summary  */}
            <div className="card" style={{"border":"1px solid var(--border-color)","background":"#F8FAFC"}}>
              <div style={{"display":"flex","justifyContent":"space-between","alignItems":"center","flexWrap":"wrap","gap":"1rem"}}>
                <div style={{"flex":"1","minWidth":"300px"}}>
                  <h3 style={{"fontSize":"1.15rem","marginBottom":"0.4rem","color":"var(--primary-navy)","display":"flex","alignItems":"center","gap":"0.5rem"}}>
                    <span>📂</span> Documents &amp; KYC Verification
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
        <div className="tab-content" data-tab="tax">
          <ComingSoonFeature 
            title="Tax Declaration"
            description="Employees will be able to log in and self-declare their tax-saving investments once the Payroll Module is fully connected."
            dependsOn={["Payroll Module"]}
            plannedFields={[
              "Section 80C investments (PPF, ELSS, life insurance)",
              "Section 80D health insurance premiums",
              "HRA declaration with landlord PAN and rent receipts",
              "Section 24b home loan interest",
              "Supporting proof document uploads",
              "Real-time TDS impact preview"
            ]}
          />
        </div>

        {/*  Tab 7: Loans & Advances  */}
        <div className="tab-content" data-tab="loans">
          <ComingSoonFeature 
            title="Loans & Advances"
            description="Salary advances and loan repayments will automatically deduct from monthly payslips once the Payroll Module is built."
            dependsOn={["Payroll Module"]}
            plannedFields={[
              "Agency-issued salary advance tracking",
              "Automatic monthly EMI deduction during payroll processing",
              "External loan/garnishment order tracking",
              "Repayment history"
            ]}
          />
        </div>
      </div>{/*  end tab-container  */}
    
{/*  ══════════════════════════════════════════════════
       EDIT PROFILE SIDE PANEL
  ══════════════════════════════════════════════════  */}
  <div className="edit-panel-overlay" id="edit-panel-overlay" onClick={(event) => { window.handleOverlayClick(event) }}>
    <div className="edit-panel" id="edit-panel">

      <div className="edit-panel-header">
        <div>
          <h3>✏️ Edit Profile</h3>
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
