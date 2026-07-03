import React, { useEffect } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';
import './EmployeeForm.css';

import RoleGuard from '../../Components/RoleGuard.jsx';
export default function EmployeeForm() {
    useEffect(() => {
        // Load the legacy logic dynamically so it runs on client side after render
        import('./EmployeeFormLogic.js').then(module => {
            console.log('Legacy logic loaded for EmployeeForm');
        }).catch(err => console.error('Error loading legacy logic', err));
        
        return () => {
            // Cleanup logic if needed
        };
    }, []);

    return (
        <RoleGuard allowedRoles={['admin', 'executive']}>
    <AuthenticatedLayout>
            <Head title="Employee Form" />
            <div className="legacy-react-wrapper">
                
      <div style={{"marginBottom":"1.5rem"}}>
        <a href="/employees" style={{"fontSize":"0.85rem","fontWeight":"600"}}>← Back to Employees Directory</a>
        <h2 id="form-page-title" style={{"marginTop":"0.5rem"}}>Employee Configuration Form</h2>
        <p id="form-page-subtitle" style={{"color":"var(--text-muted)","fontSize":"0.9rem"}}>Configure personal profile, sensitive banking, custom salary breakdown, and statutory applicability overrides.</p>
      </div>



      <div className="grid-layout">
        {/*  Main Form Column  */}
        <div className="card">
          <form id="emp-form" onSubmit={(event) => { window.handleFormSubmit(event) }}>

            {/*  ══════════════════════════════════════════
                 SECTION 1: PERSONAL DETAILS
            ══════════════════════════════════════════  */}
            <h3 style={{"borderBottom":"1px solid var(--border-color)","paddingBottom":"0.5rem","marginBottom":"1.25rem","fontSize":"1.05rem"}}>
              Personal &amp; Employment Profile
            </h3>

            <div className="form-row">
              {/*  Full Name  */}
              <div className="form-group">
                <label htmlFor="emp-name">Full Name</label>
                <input type="text" id="emp-name" className="form-control" placeholder="As on PAN card" value="Aarav Sharma"
                  onBlur={(event) => { window.validateFullName() }} onInput={(event) => { window.syncNameFields(); window.validateFullName() }} />
                <div className="field-msg" id="msg-emp-name"></div>
                <div id="name-change-upload-container" style={{"display":"none","marginTop":"0.75rem","padding":"0.75rem 1rem","background":"var(--status-warning-bg)","borderLeft":"3px solid var(--status-warning)","borderRadius":"var(--radius-sm)"}}>
                  <div style={{"fontSize":"0.85rem","color":"var(--status-warning)","fontWeight":"600","marginBottom":"0.5rem"}}>
                    Name changes require a supporting document (e.g. marriage certificate, legal name change order). Upload before saving.
                  </div>
                  <input type="file" id="name-change-file" className="form-control" style={{"fontSize":"0.8rem","padding":"0.25rem"}} onChange={(event) => { window.validateFullName() }} />
                </div>
              </div>
              {/*  Employee Code  */}
              <div className="form-group hide-in-edit">
                <label htmlFor="emp-code">Employee Code</label>
                <input type="text" id="emp-code" className="form-control read-only-field" value="TEC-089 (auto-assigned on save)" readOnly={true} />
                <div className="field-msg info show" id="msg-emp-code" style={{"display":"block"}}>🔒 Auto-generated on save. Cannot be manually set.</div>
              </div>
            </div>

            <div className="form-row">
              {/*  Date of Birth  */}
              <div className="form-group hide-in-edit">
                <label htmlFor="dob">Date of Birth</label>
                <input type="date" id="dob" className="form-control" value="1998-04-12"
                  onChange={(event) => { window.validateAgeAtJoining() }} />
                <div className="field-msg" id="msg-dob"></div>
              </div>
              {/*  Personal Email  */}
              <div className="form-group">
                <label htmlFor="personal-email">Personal Email <span style={{"color":"var(--status-danger)"}}>*</span></label>
                <input type="email" id="personal-email" className="form-control" value="aarav.sharma@gmail.com"
                  onBlur={(event) => { window.validatePersonalEmail() }} onInput={(event) => { window.clearMsg('msg-personal-email','personal-email'); window.validatePersonalEmail() }} />
                <div className="field-msg" id="msg-personal-email"></div>
                <div id="msg-personal-email-notice" style={{"display":"none","marginTop":"0.4rem","fontSize":"0.8rem","color":"#64748B","fontStyle":"italic"}}>
                  A notification will be sent to the previous email address confirming this change.
                </div>
              </div>
            </div>

            <div className="form-row">
              {/*  Phone Number  */}
              <div className="form-group">
                <label htmlFor="phone">Phone Number <span style={{"color":"var(--status-danger)"}}>*</span></label>
                <input type="text" id="phone" className="form-control" value="9876543210" maxLength="10"
                  onBlur={(event) => { window.validatePhone() }} onInput={(event) => { window.clearMsg('msg-phone','phone'); window.validateEmergencyConflict() }} />
                <div className="field-msg" id="msg-phone"></div>
                <div className="inline-choice" id="phone-dup-choice" style={{"display":"none","marginTop":"0.5rem","gap":"0.5rem"}}>
                  <button type="button" className="btn btn-primary btn-xs" onClick={(event) => { window.acceptDuplicatePhone() }}>Yes, Continue</button>
                  <button type="button" className="btn btn-secondary btn-xs" onClick={(event) => { window.rejectDuplicatePhone() }}>Cancel</button>
                </div>
              </div>
              {/*  Emergency Contact  */}
              <div className="form-group">
                <label htmlFor="emergency-contact">Emergency Contact Number</label>
                <input type="text" id="emergency-contact" className="form-control" value="9876543211" maxLength="10"
                  onInput={(event) => { window.validateEmergencyConflict() }} onBlur={(event) => { window.validateEmergencyConflict() }} />
                <div className="field-msg" id="msg-emergency-contact"></div>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group hide-in-edit">
                <label htmlFor="client-partner">Client Partner</label>
                <select id="client-partner" className="form-control" onChange={(event) => { window.onClientChange() }}>
                  <option value="mahindra" >Mahindra Corp</option>
                  <option value="tcs">Tata Consultancy Services — EOR</option>
                  <option value="tcs_agency">Tata Consultancy Services — Agency</option>
                  <option value="reliance">Reliance Digital</option>
                  <option value="wipro">Wipro Ltd</option>
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="designation">Designation</label>
                <input type="text" id="designation" className="form-control" value="Senior Developer" required onInput={(event) => { window.checkDesignationChange() }} />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group hide-in-edit">
                <label htmlFor="emp-branch">Work Location / Branch <span style={{"color":"var(--status-danger)"}}>*</span></label>
                <select id="emp-branch" className="form-control" disabled={true} onChange={(event) => { window.onBranchChange() }}>
                  <option value="">— Select a client first —</option>
                </select>
                <div className="field-msg" id="msg-emp-branch"></div>
                <div id="branch-info-line" style={{"display":"none","marginTop":"0.4rem","fontSize":"0.75rem","color":"#64748B"}}></div>
              </div>
            </div>

            <div className="form-row hide-in-edit">
              {/*  Date of Joining  */}
              <div className="form-group">
                <label htmlFor="doj">Date of Joining</label>
                <input type="date" id="doj" className="form-control" value="2025-01-15"
                  onChange={(event) => { window.validateDoj(); window.validateAgeAtJoining() }} />
                <div className="field-msg" id="msg-doj"></div>
              </div>
              {/*  Employment Type  */}
              <div className="form-group">
                <label htmlFor="emp-type">Employment Model</label>
                <select id="emp-type" className="form-control" onChange={(event) => { window.onEmpTypeChange() }}>
                  <option value="eor" >Pass-through EOR</option>
                  <option value="contract">Agency Contract</option>
                  <option value="internal">Internal Staff</option>
                </select>
                <div className="field-msg" id="msg-emp-type"></div>
                <div id="emp-type-banner" style={{"display":"none","marginTop":"0.5rem","padding":"0.75rem","background":"#F8FAFC","borderLeft":"3px solid var(--primary-navy)","borderRadius":"var(--radius-sm)","fontSize":"0.8rem","color":"var(--text-dark)"}}></div>
              </div>
            </div>

            <div className="form-row">
              {/*  Prior Employment Flag  */}
              <div className="form-group hide-in-edit" style={{"flex":"1"}}>
                <label>Prior Employment Flag <span style={{"fontSize":"0.75rem","color":"var(--text-muted)"}}>(Required for Previous Employer KYC docs)</span></label>
                <div style={{"marginTop":"0.5rem"}}>
                  <label className="toggle-container">
                    <input type="checkbox" id="prior-employment-flag" className="toggle-input" defaultChecked={true} onChange={(event) => { document.window.getElementById('prior-emp-form-label').textContent = event.currentTarget.checked ? 'Yes' : 'No' }} />
                    <span className="toggle-switch"></span>
                    <span id="prior-emp-form-label" style={{"fontWeight":"600","color":"var(--primary-navy)"}}>Yes</span>
                  </label>
                </div>
              </div>
              {/*  Address  */}
              <div className="form-group" style={{"flex":"1"}}>
                <label htmlFor="address">Residential Address</label>
                <input type="text" id="address" className="form-control" value="Flat 4B, Andheri East, Mumbai" />
              </div>
            </div>

            <div className="hide-in-edit">
              {/*  ══════════════════════════════════════════
                   SECTION 2: BANK DETAILS
              ══════════════════════════════════════════  */}
              <h3 id="bank-section-title" style={{"borderBottom":"1px solid var(--border-color)","paddingBottom":"0.5rem","marginTop":"2rem","marginBottom":"0.75rem","fontSize":"1.05rem"}}>
                Secure Disbursement Details
              </h3>

              {/*  Info banner: always visible  */}
              <div className="section-banner info" id="bank-info-banner">
                🏦 <strong>Bank details can only be set here during initial employee creation.</strong>
                Once the employee is <em>Active</em>, bank changes must go through the
                <a href="/bank-change-requests" style={{"color":"var(--status-info)","fontWeight":"600"}}>Bank Change Requests approval flow</a>.
              </div>

              {/*  EDIT-ACTIVE locked state  */}
              <div id="bank-locked-section" style={{"display":"none","marginBottom":"1.5rem"}}>
                <div style={{"padding":"0.75rem 1rem","background":"#F8FAFC","border":"1px solid var(--border-color)","borderRadius":"var(--radius-sm)","fontSize":"0.85rem","color":"var(--text-muted)","display":"flex","alignItems":"center","gap":"0.5rem"}}>
                  <span style={{"fontWeight":"500","color":"var(--text-main)"}}>🔒 Locked — use <a href="/bank-change-requests" style={{"color":"var(--primary-navy)","fontWeight":"600","textDecoration":"underline"}}>Bank Change Requests</a> to update</span>
                </div>
              </div>

              {/*  Bank form fields (shown for Add / Edit-Onboarding)  */}
              <div id="bank-fields-section">
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="account-no">Account Number <span style={{"color":"var(--status-danger)"}}>*</span></label>
                    <input type="text" id="account-no" className="form-control" value="50100452398571"
                      onBlur={(event) => { window.validateAccountMatch() }} onInput={(event) => { window.clearMsg('msg-account-no','account-no') }} />
                    <div className="field-msg" id="msg-account-no"></div>
                  </div>
                  <div className="form-group">
                    <label htmlFor="account-no-confirm">Confirm Account Number <span style={{"color":"var(--status-danger)"}}>*</span></label>
                    <input type="text" id="account-no-confirm" className="form-control" value="50100452398571"
                      onBlur={(event) => { window.validateAccountMatch() }} onInput={(event) => { window.clearMsg('msg-account-no-confirm','account-no-confirm') }} />
                    <div className="field-msg" id="msg-account-no-confirm"></div>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="ifsc">IFSC Code <span style={{"color":"var(--status-danger)"}}>*</span></label>
                    <input type="text" id="ifsc" className="form-control" value="HDFC0000060"
                      onInput={(event) => { window.autoPopulateBank() }} onBlur={(event) => { window.validateIFSC() }} />
                    <div className="field-msg" id="msg-ifsc"></div>
                  </div>
                  <div className="form-group">
                    <label>Bank Name <span style={{"fontSize":"0.75rem","color":"var(--text-muted)"}}>(auto-populated)</span></label>
                    <input type="text" id="bank-name-display" className="form-control read-only-field" value="HDFC Bank" readOnly={true} />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Branch <span style={{"fontSize":"0.75rem","color":"var(--text-muted)"}}>(auto-populated)</span></label>
                    <input type="text" id="bank-branch-display" className="form-control read-only-field" value="Andheri East, Mumbai" readOnly={true} />
                  </div>
                  <div className="form-group">
                    <label htmlFor="account-holder">Account Holder Name</label>
                    <input type="text" id="account-holder" className="form-control" value="Aarav Sharma"
                      onBlur={(event) => { window.validateAccountHolderName() }} onInput={(event) => { window.clearMsg('msg-account-holder','account-holder') }} />
                    <div className="field-msg" id="msg-account-holder"></div>
                  </div>
                </div>
              </div>

              {/*  ══════════════════════════════════════════
                   SECTION 3: STATUTORY IDs
              ══════════════════════════════════════════  */}
              <h3 style={{"borderBottom":"1px solid var(--border-color)","paddingBottom":"0.5rem","marginTop":"2rem","marginBottom":"1.25rem","fontSize":"1.05rem"}}>
                Statutory Credentials
              </h3>

              <div className="form-row">
                {/*  PAN  */}
                <div className="form-group">
                  <label htmlFor="pan">Permanent Account Number (PAN)</label>
                  <input type="text" id="pan" className="form-control" value="ABCDE1234F"
                    onInput={(event) => { event.currentTarget.value=event.currentTarget.value.window.toUpperCase(); window.clearMsg('msg-pan','pan'); window.validateFullName(); }}
                    onBlur={(event) => { window.validatePAN() }} />
                  <div className="field-msg" id="msg-pan"></div>
                </div>
                {/*  Aadhaar  */}
                <div className="form-group">
                  <label htmlFor="aadhaar">Aadhaar Number</label>
                  <input type="text" id="aadhaar" className="form-control" value=""
                    placeholder="12-digit Aadhaar"
                    onFocus={(event) => { window.showAadhaarClear() }} onBlur={(event) => { window.maskAadhaar() }} onInput={(event) => { window.clearMsg('msg-aadhaar','aadhaar') }} />
                  <div className="aadhaar-masked" id="aadhaar-masked">••••••••7890</div>
                  <div className="field-msg" id="msg-aadhaar"></div>
                </div>
              </div>

              {/*  UAN  */}
              <div className="form-row">
                <div className="form-group">
                  <label>Provident Fund UAN</label>
                  <div className="radio-row">
                    <label>
                      <input type="radio" name="uan-mode" value="prior" id="uan-mode-prior" onChange={(event) => { window.onUanModeChange() }} defaultChecked={true} />
                      Has Prior PF (enter existing UAN)
                    </label>
                    <label>
                      <input type="radio" name="uan-mode" value="new" id="uan-mode-new" onChange={(event) => { window.onUanModeChange() }} />
                      Generate New UAN
                    </label>
                  </div>
                  <input type="text" id="uan" className="form-control" value="100523485790" placeholder="Universal Account Number"
                    onInput={(event) => { window.clearMsg('msg-uan','uan') }} />
                  <div className="field-msg" id="msg-uan"></div>
                </div>
                {/*  ESI Number (conditional)  */}
                <div className="form-group" id="esi-no-group">
                  <label htmlFor="esi-no">ESI IP Number</label>
                  <input type="text" id="esi-no" className="form-control" value="3114589723" placeholder="ESI Insurance IP No" />
                  <div className="field-msg info show" id="msg-esi-no" style={{"display":"block"}}>Visible only when ESI Applicable is ON.</div>
                </div>
              </div>

              {/*  ══════════════════════════════════════════
                   SECTION 4: SALARY STRUCTURE
              ══════════════════════════════════════════  */}
              <h3 id="salary-section-title" style={{"borderBottom":"1px solid var(--border-color)","paddingBottom":"0.5rem","marginTop":"2rem","marginBottom":"1.25rem","fontSize":"1.05rem"}}>
                Salary Structure &amp; Compensation (Monthly)
              </h3>

              {/*  Locked state for Active employees  */}
              <div id="salary-locked-msg" style={{"display":"none","marginBottom":"1.5rem"}}>
                <div style={{"padding":"0.75rem 1rem","background":"#F8FAFC","border":"1px solid var(--border-color)","borderRadius":"var(--radius-sm)","fontSize":"0.85rem","color":"var(--text-muted)","display":"flex","alignItems":"center","gap":"0.5rem"}}>
                  <span style={{"fontWeight":"500","color":"var(--text-main)"}}>🔒 Locked — use <a href="/employees/1/salary-revision" style={{"color":"var(--primary-navy)","fontWeight":"600","textDecoration":"underline"}}>Revise Salary</a> to update</span>
                </div>
              </div>

              <div id="salary-fields-section">
                <h4 style={{"fontSize":"0.95rem","color":"var(--primary-navy)","marginBottom":"1rem"}}>Earnings Breakdown</h4>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="basic-sal">1. Basic Pay (₹)</label>
                    <input type="number" id="basic-sal" className="form-control" value="22000"
                      onInput={(event) => { window.calculateGross(); window.validateBasicPct() }} />
                    <div className="field-msg" id="msg-basic-sal"></div>
                  </div>
                  <div className="form-group">
                    <label htmlFor="hra-sal">2. HRA (House Rent Allowance) (₹)</label>
                    <input type="number" id="hra-sal" className="form-control" value="11000" onInput={(event) => { window.calculateGross() }} />
                  </div>
                  <div className="form-group">
                    <label htmlFor="conveyance-sal">3. Conveyance (₹)</label>
                    <input type="number" id="conveyance-sal" className="form-control" value="1600" onInput={(event) => { window.calculateGross() }} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="da-sal">4. DA (Dearness Allowance) (₹)</label>
                    <input type="number" id="da-sal" className="form-control" value="0" onInput={(event) => { window.calculateGross() }} />
                  </div>
                  <div className="form-group">
                    <label htmlFor="medical-sal">5. Medical Allowance (₹)</label>
                    <input type="number" id="medical-sal" className="form-control" value="0" onInput={(event) => { window.calculateGross() }} />
                  </div>
                  <div className="form-group">
                    <label htmlFor="special-sal">6. Special Allowance (₹)</label>
                    <input type="number" id="special-sal" className="form-control" value="10400" onInput={(event) => { window.calculateGross() }} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="other-sal">7. Other Additions (₹)</label>
                    <input type="number" id="other-sal" className="form-control" value="0" onInput={(event) => { window.calculateGross() }} />
                  </div>
                  <div className="form-group">
                    <label htmlFor="arrears-sal">8. Arrears Amount (₹)</label>
                    <input type="number" id="arrears-sal" className="form-control" value="0" onInput={(event) => { window.calculateGross() }} />
                  </div>
                </div>

                <div style={{"backgroundColor":"var(--primary-navy)","color":"white","padding":"1rem","borderRadius":"var(--radius-sm)","display":"flex","justifyContent":"space-between","alignItems":"center","marginBottom":"2rem"}}>
                  <span style={{"fontWeight":"500"}}>Calculated Monthly Gross CTC:</span>
                  <span id="gross-display" style={{"fontSize":"1.5rem","fontWeight":"bold","color":"var(--accent-gold)"}}>₹45,000</span>
                </div>

                <h4 style={{"fontSize":"0.95rem","color":"var(--primary-navy)","marginBottom":"1rem"}}>Setup-Time Deductions</h4>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="pt-deduction">Professional Tax (₹)</label>
                    <input type="number" id="pt-deduction" className="form-control" value="200" />
                  </div>
                  <div className="form-group">
                    <label htmlFor="welfare-fund">Welfare Fund (₹)</label>
                    <input type="number" id="welfare-fund" className="form-control" value="0" />
                  </div>
                </div>
              </div>

              {/*  ══════════════════════════════════════════
                   SECTION 5: STATUTORY APPLICABILITY
              ══════════════════════════════════════════  */}
              <h3 style={{"borderBottom":"1px solid var(--border-color)","paddingBottom":"0.5rem","marginTop":"2rem","marginBottom":"0.5rem","fontSize":"1.05rem"}}>
                Statutory Applicability for This Employee
              </h3>
              <p style={{"color":"var(--text-muted)","fontSize":"0.75rem","marginBottom":"1.25rem"}}>
                ⚙️ <span id="inheritance-source-line" style={{"fontWeight":"500","color":"var(--primary-navy)"}}>Defaults inherited from client...</span> Toggling any setting below creates a per-employee override.
              </p>

              <div style={{"display":"flex","flexDirection":"column","gap":"1rem","backgroundColor":"#F8FAFC","padding":"1rem","borderRadius":"var(--radius-md)","border":"1px solid var(--border-color)","marginBottom":"1.5rem"}}>

                {/*  PF Toggle  */}
                <div>
                  <div style={{"display":"flex","alignItems":"center","justifyContent":"space-between"}}>
                    <div>
                      <div style={{"display":"flex","alignItems":"center","gap":"0.5rem"}}>
                        <strong style={{"fontSize":"0.85rem"}}>PF Contribution</strong>
                        <span className="badge badge-neutral" id="pf-tag">Inherited</span>
                      </div>
                      <span style={{"fontSize":"0.75rem","color":"var(--text-muted)"}}>Standard 12% Provident Fund deductions.</span>
                    </div>
                    <label className="toggle-container">
                      <input type="checkbox" className="toggle-input" defaultChecked={true} id="pf-toggle" onChange={(event) => { window.onPfToggleChange() }} />
                      <span className="toggle-switch"></span>
                    </label>
                  </div>
                  <div className="field-msg" id="msg-pf"></div>
                </div>

                <hr style={{"border":"0","borderTop":"1px solid var(--border-color)"}} />

                {/*  ESI Toggle  */}
                <div>
                  <div style={{"display":"flex","alignItems":"center","justifyContent":"space-between"}}>
                    <div>
                      <div style={{"display":"flex","alignItems":"center","gap":"0.5rem"}}>
                        <strong style={{"fontSize":"0.85rem"}}>ESI Contribution</strong>
                        <span className="badge badge-neutral" id="esi-tag">Inherited</span>
                        {/*  Tooltip  */}
                        <span className="tooltip-wrap">
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style={{"color":"var(--text-muted)","verticalAlign":"middle"}} stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                          <span className="tooltip-text">ESI auto-disables only at the start of a new contribution period (Apr–Sep or Oct–Mar) — not instantly mid-cycle, per ESI Act rules.</span>
                        </span>
                      </div>
                      <span style={{"fontSize":"0.75rem","color":"var(--text-muted)","display":"block"}} id="esi-subtext">Standard ESI Medical benefits deductions.</span>
                      <span className="badge badge-danger" id="esi-warning" style={{"display":"none","marginTop":"0.25rem"}}>
                        ⚠ Gross salary exceeds ESI threshold (₹21,000) — ESI does not apply.
                      </span>
                    </div>
                    <label className="toggle-container">
                      <input type="checkbox" className="toggle-input" id="esi-toggle" onChange={(event) => { window.onEsiToggleChange() }} />
                      <span className="toggle-switch"></span>
                    </label>
                  </div>
                </div>

                <hr style={{"border":"0","borderTop":"1px solid var(--border-color)"}} />

                {/*  TDS Toggle  */}
                <div>
                  <div style={{"display":"flex","alignItems":"center","justifyContent":"space-between"}}>
                    <div>
                      <div style={{"display":"flex","alignItems":"center","gap":"0.5rem"}}>
                        <strong style={{"fontSize":"0.85rem"}}>TDS (Tax Deducted at Source)</strong>
                        <span className="badge badge-gold" id="tds-tag">Overridden (TDS Custom)</span>
                      </div>
                      <span style={{"fontSize":"0.75rem","color":"var(--text-muted)"}}>Enable Monthly Tax calculations based on income declarations.</span>
                    </div>
                    <label className="toggle-container">
                      <input type="checkbox" className="toggle-input" defaultChecked={true} id="tds-toggle" onChange={(event) => { window.onTdsToggleChange() }} />
                      <span className="toggle-switch"></span>
                    </label>
                  </div>
                  <div className="field-msg" id="msg-tds"></div>

                  {/*  TDS Sub Fields  */}
                  <div id="tds-sub-fields" style={{"backgroundColor":"#FFFFFF","padding":"1rem","borderRadius":"var(--radius-sm)","border":"1px solid var(--border-color)","marginTop":"0.5rem"}}>
                    <div className="form-row">
                      <div className="form-group" style={{"marginBottom":"0"}}>
                        <label htmlFor="tax-regime">Income Tax Regime</label>
                        <select id="tax-regime" className="form-control" onChange={(event) => { window.markOverride('tds') }}>
                          <option value="old">Old Tax Regime</option>
                          <option value="new" >New Tax Regime (Section 115BAC)</option>
                          <option value="employee_choice">Employee Choice</option>
                        </select>
                      </div>
                      <div className="form-group" style={{"marginBottom":"0"}}>
                        <label htmlFor="declarations">Investment Declarations Submitted?</label>
                        <select id="declarations" className="form-control">
                          <option value="yes" >Yes, Verified on File</option>
                          <option value="no">No Declarations Received</option>
                        </select>
                      </div>
                    </div>
                    <div className="suggestion-chip" style={{"marginTop":"0.75rem","padding":"0.5rem 0.75rem","background":"#FEF9C3","borderRadius":"var(--radius-sm)","fontSize":"0.8rem"}}>
                      <span>💡 Based on declared CTC, New Regime may result in lower TDS.</span>
                      <span className="suggestion-action" onClick={(event) => { window.applyRegimeSuggestion() }} style={{"marginLeft":"0.5rem","cursor":"pointer","textDecoration":"underline","color":"var(--primary-navy)"}}>[Apply Suggestion]</span>
                    </div>
                  </div>
                </div>

                <hr style={{"border":"0","borderTop":"1px solid var(--border-color)"}} />

                {/*  PT Toggle  */}
                <div>
                  <div style={{"display":"flex","alignItems":"center","justifyContent":"space-between"}}>
                    <div>
                      <div style={{"display":"flex","alignItems":"center","gap":"0.5rem"}}>
                        <strong style={{"fontSize":"0.85rem"}}>Professional Tax (PT)</strong>
                        <span className="badge badge-neutral" id="pt-tag">Inherited</span>
                      </div>
                      <span style={{"fontSize":"0.75rem","color":"var(--text-muted)"}}>State-level tax based on location.</span>
                    </div>
                    <label className="toggle-container">
                      <input type="checkbox" className="toggle-input" id="pt-toggle" onChange={(event) => { window.markOverride('pt') }} />
                      <span className="toggle-switch"></span>
                    </label>
                  </div>
                </div>

                <hr style={{"border":"0","borderTop":"1px solid var(--border-color)"}} />

                {/*  LWF Toggle  */}
                <div>
                  <div style={{"display":"flex","alignItems":"center","justifyContent":"space-between"}}>
                    <div>
                      <div style={{"display":"flex","alignItems":"center","gap":"0.5rem"}}>
                        <strong style={{"fontSize":"0.85rem"}}>Labour Welfare Fund (LWF)</strong>
                        <span className="badge badge-neutral" id="lwf-tag">Inherited</span>
                      </div>
                      <span style={{"fontSize":"0.75rem","color":"var(--text-muted)"}}>State welfare fund contribution.</span>
                    </div>
                    <label className="toggle-container">
                      <input type="checkbox" className="toggle-input" id="lwf-toggle" onChange={(event) => { window.markOverride('lwf') }} />
                      <span className="toggle-switch"></span>
                    </label>
                  </div>
                </div>

                <hr style={{"border":"0","borderTop":"1px solid var(--border-color)"}} />

                {/*  Statutory Bonus Toggle  */}
                <div>
                  <div style={{"display":"flex","alignItems":"center","justifyContent":"space-between"}}>
                    <div>
                      <div style={{"display":"flex","alignItems":"center","gap":"0.5rem"}}>
                        <strong style={{"fontSize":"0.85rem"}}>Statutory Bonus</strong>
                        <span className="badge badge-neutral" id="bonus-tag">Inherited</span>
                      </div>
                      <span style={{"fontSize":"0.75rem","color":"var(--text-muted)"}}>Payment of Bonus Act compliance.</span>
                    </div>
                    <label className="toggle-container">
                      <input type="checkbox" className="toggle-input" id="bonus-toggle" onChange={(event) => { window.markOverride('bonus') }} />
                      <span className="toggle-switch"></span>
                    </label>
                  </div>
                </div>

                <hr style={{"border":"0","borderTop":"1px solid var(--border-color)"}} />

                {/*  Gratuity Mode Select  */}
                <div>
                  <div style={{"display":"flex","alignItems":"center","justifyContent":"space-between"}}>
                    <div>
                      <div style={{"display":"flex","alignItems":"center","gap":"0.5rem"}}>
                        <strong style={{"fontSize":"0.85rem"}}>Gratuity Mode</strong>
                        <span className="badge badge-neutral" id="gratuity-tag">Inherited</span>
                      </div>
                      <span style={{"fontSize":"0.75rem","color":"var(--text-muted)"}}>How gratuity is accrued in CTC.</span>
                    </div>
                    <div style={{"display":"flex","alignItems":"center","gap":"0.5rem"}}>
                      <select id="gratuity-select" className="form-control" style={{"width":"auto","padding":"0.2rem 0.5rem","fontSize":"0.8rem"}} onChange={(event) => { window.markOverride('gratuity') }}>
                        <option value="part_of_ctc">Part of CTC</option>
                        <option value="over_and_above">Over and Above</option>
                      </select>
                    </div>
                  </div>
                </div>

                <hr style={{"border":"0","borderTop":"1px solid var(--border-color)"}} />

                {/*  LOP Basis Select  */}
                <div>
                  <div style={{"display":"flex","alignItems":"center","justifyContent":"space-between"}}>
                    <div>
                      <div style={{"display":"flex","alignItems":"center","gap":"0.5rem"}}>
                        <strong style={{"fontSize":"0.85rem"}}>LOP Basis</strong>
                        <span className="badge badge-neutral" id="lop-tag">Inherited</span>
                      </div>
                      <span style={{"fontSize":"0.75rem","color":"var(--text-muted)"}}>Days used to calculate per-day wage.</span>
                    </div>
                    <div style={{"display":"flex","alignItems":"center","gap":"0.5rem"}}>
                      <select id="lop-select" className="form-control" style={{"width":"auto","padding":"0.2rem 0.5rem","fontSize":"0.8rem"}} onChange={(event) => { window.markOverride('lop') }}>
                        <option value="inherit_global">Global Default</option>
                        <option value="26_days">26 Days</option>
                        <option value="30_days">30 Days</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>{/*  end statutory toggles  */}
            </div>{/*  end hide-in-edit wrapper  */}

            {/*  ── Form Submit Row ──  */}
            <div id="edit-footer-note" style={{"display":"none","marginTop":"1.5rem","paddingTop":"1rem","borderTop":"1px solid var(--border-color)","textAlign":"center","fontSize":"0.85rem","color":"var(--text-muted)"}}>
              Looking to update bank details, salary, or statutory settings? Go to: <a href="/bank-change-requests" style={{"color":"var(--primary-navy)","fontWeight":"600","textDecoration":"underline"}}>Bank Change Requests</a> · <a href="/employees/1/salary-revision" style={{"color":"var(--primary-navy)","fontWeight":"600","textDecoration":"underline"}}>Revise Salary</a> · <a href="/employees/create?id=88&amp;mode=add" style={{"color":"var(--primary-navy)","fontWeight":"600","textDecoration":"underline"}}>Employee Configuration Form</a>
            </div>

            <div style={{"display":"flex","gap":"1rem","justifyContent":"flex-end","marginTop":"2rem"}}>
              <a href="/employees" className="btn btn-secondary">Cancel</a>
              <button type="submit" className="btn btn-primary" id="save-btn">Save Employee Configuration</button>
            </div>

          </form>
        </div>{/*  end main form card  */}

        {/*  Sidebar Guidelines  */}
        <div style={{"display":"flex","flexDirection":"column","gap":"1.5rem"}}>
          <div className="card" style={{"backgroundColor":"var(--primary-navy)","color":"white"}}>
            <h4 style={{"color":"white","marginBottom":"0.5rem"}}>Statutory Overrides Guide</h4>
            <p style={{"fontSize":"0.8rem","lineHeight":"1.4","opacity":"0.9","marginBottom":"0.75rem"}}>
              <strong>Inherited badge:</strong> The employee is following the default statutory configuration set at the client contract level.
            </p>
            <p style={{"fontSize":"0.8rem","lineHeight":"1.4","opacity":"0.9"}}>
              <strong>Overridden badge:</strong> The setting has been changed manually. This override will stick even if the client-level settings change in the future.
            </p>
          </div>

          {/*  Validation Summary Card  */}
          <div className="card" id="validation-summary-card" style={{"display":"none"}}>
            <h4 style={{"color":"var(--status-danger)","marginBottom":"0.75rem"}}>⛔ Blocking Errors</h4>
            <ul id="validation-summary-list" style={{"fontSize":"0.82rem","color":"var(--status-danger)","paddingLeft":"1.1rem","margin":"0","lineHeight":"1.8"}}></ul>
          </div>

          <div className="card">
            <h4 style={{"marginBottom":"0.75rem","fontSize":"0.95rem"}}>Validation Legend</h4>
            <div style={{"display":"flex","flexDirection":"column","gap":"0.5rem","fontSize":"0.8rem"}}>
              <div style={{"display":"flex","alignItems":"center","gap":"0.5rem"}}>
                <div style={{"width":"10px","height":"10px","borderRadius":"50%","background":"var(--status-danger)"}}></div>
                <span>Red — blocking error, save disabled={true}</span>
              </div>
              <div style={{"display":"flex","alignItems":"center","gap":"0.5rem"}}>
                <div style={{"width":"10px","height":"10px","borderRadius":"50%","background":"var(--status-warning)"}}></div>
                <span>Amber — non-blocking warning, confirm before saving</span>
              </div>
              <div style={{"display":"flex","alignItems":"center","gap":"0.5rem"}}>
                <div style={{"width":"10px","height":"10px","borderRadius":"50%","background":"#CBD5E1"}}></div>
                <span>Grey — informational note</span>
              </div>
            </div>
          </div>
        </div>
      </div>{/*  end grid-layout  */}
    
{/*  ── Employment Type Change Confirm Modal ──  */}
  <div className="modal-overlay" id="emp-type-modal">
    <div className="modal-box">
      <div className="modal-header">
        <h3>⚠ Confirm Employment Type Change</h3>
        <button className="modal-close" onClick={(event) => { window.cancelEmpTypeChange() }}>×</button>
      </div>
      <div>
        <p style={{"fontSize":"0.9rem","marginBottom":"1rem"}}>
          Changing employment type after payroll history exists <strong>only applies going forward</strong> — past months' filings are not affected. Confirm?
        </p>
        <div className="section-banner warn">
          Statutory filings (PF, ESI, TDS) for previous months remain under the old employment type classification. This change is prospective only.
        </div>
      </div>
      <div className="modal-footer">
        <button className="btn btn-secondary" onClick={(event) => { window.cancelEmpTypeChange() }}>Cancel</button>
        <button className="btn btn-primary" onClick={(event) => { window.confirmEmpTypeChange() }}>Yes, Change Going Forward</button>
      </div>
    </div>
  </div>
</div>
        </AuthenticatedLayout>
    </RoleGuard>
    );
}
