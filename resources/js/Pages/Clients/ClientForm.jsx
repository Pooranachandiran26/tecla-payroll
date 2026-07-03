import React, { useEffect } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';
import './ClientForm.css';

import RoleGuard from '../../Components/RoleGuard.jsx';
export default function ClientForm() {
    useEffect(() => {
        // Load the legacy logic dynamically so it runs on client side after render
        import('./ClientFormLogic.js').then(module => {
            console.log('Legacy logic loaded for ClientForm');
        }).catch(err => console.error('Error loading legacy logic', err));
        
        return () => {
            // Cleanup logic if needed
        };
    }, []);

    return (
        <RoleGuard allowedRoles={['admin', 'executive']}>
    <AuthenticatedLayout>
            <Head title="Client Form" />
            <div className="legacy-react-wrapper">
                
      {/*  Page Header  */}
      <div style={{"marginBottom":"1.5rem"}}>
        <a href="/clients" style={{"fontSize":"0.85rem","fontWeight":"600"}}>← Back to Clients Directory</a>
        <div style={{"display":"flex","alignItems":"flex-end","justifyContent":"space-between","marginTop":"0.5rem"}}>
          <div>
            <h2 style={{"marginBottom":"0.2rem"}} id="form-page-title">Add New Client</h2>
            <p style={{"color":"var(--text-muted)","fontSize":"0.9rem"}}>
              Complete all sections for full compliance. Fields marked <span
                style={{"color":"var(--status-danger)"}}>*</span> are mandatory.
            </p>
          </div>
          <div style={{"display":"flex","gap":"0.5rem"}}>
            <button type="button" className="btn btn-secondary" onClick={(event) => { window.saveDraft() }}>💾 Save Draft</button>
            <button type="button" className="btn btn-primary" onClick={(event) => { window.submitForm() }}>✅ Save & Activate Client</button>
          </div>
        </div>
      </div>

      {/*  Progress Bar  */}
      <div className="form-progress" id="form-progress">
        <div className="progress-step active" onClick={(event) => { window.goToStep(1) }} style={{"cursor":"pointer"}}>① Identity</div>
        <div className="progress-step" onClick={(event) => { window.goToStep(2) }} style={{"cursor":"pointer"}}>② Address</div>
        <div className="progress-step" onClick={(event) => { window.goToStep(3) }} style={{"cursor":"pointer"}}>③ Contacts</div>
        <div className="progress-step" onClick={(event) => { window.goToStep(4) }} style={{"cursor":"pointer"}}>④ Contract</div>
        <div className="progress-step" onClick={(event) => { window.goToStep(5) }} style={{"cursor":"pointer"}}>⑤ Statutory</div>
        <div className="progress-step" onClick={(event) => { window.goToStep(6) }} style={{"cursor":"pointer"}}>⑥ Documents</div>
        <div className="progress-step" onClick={(event) => { window.goToStep(7) }} style={{"cursor":"pointer"}}>⑦ Portal</div>
        <div className="progress-step" onClick={(event) => { window.goToStep(8) }} style={{"cursor":"pointer"}}>⑧ SLA</div>
      </div>

      <div className="grid-layout">
        {/*  ═══════════════ MAIN FORM ═══════════════  */}
        <div className="card">
          <form id="client-form" onSubmit={(event) => { event.window.preventDefault(); }}>

            <div className="form-step-section active" id="step-section-1">
              {/*  ══ SECTION 1: Company Identity ══  */}
            <div className="section-header">
              <div className="section-icon">🏢</div>
              <h3>Company Identity</h3>
              <span className="section-badge">MANDATORY</span>
            </div>

            <div className="form-row">
              <div className="form-group" style={{"flex":"2"}}>
                <label htmlFor="company-name">Legal Company Name <span style={{"color":"var(--status-danger)"}}>*</span></label>
                <input type="text" id="company-name" className="form-control" placeholder="e.g. Mahindra & Mahindra Limited"
                  required onInput={(event) => { window.markProgress(1) }} />
                <div className="field-hint" id="company-name-hint">Enter the exact legal name as per MCA registration.</div>
              </div>
              <div className="form-group">
                <label htmlFor="company-type">Company Type <span style={{"color":"var(--status-danger)"}}>*</span></label>
                <select id="company-type" className="form-control" required onChange={(event) => { window.handleCompanyType(event.currentTarget.value); window.markProgress(1); }}>
                  <option value="">-- Select --</option>
                  <option value="pvt_ltd">Private Limited (Pvt. Ltd.)</option>
                  <option value="pub_ltd">Public Limited (Ltd.)</option>
                  <option value="llp">Limited Liability Partnership (LLP)</option>
                  <option value="opc">One Person Company (OPC)</option>
                  <option value="partnership">Partnership Firm</option>
                  <option value="proprietorship">Sole Proprietorship</option>
                  <option value="trust">Trust / Society / NGO</option>
                  <option value="govt">Government / PSU</option>
                </select>
              </div>
            </div>

            {/*  Trust / NGO registration number  */}
            <div className="form-group" id="trust-reg-field" style={{"display":"none","marginBottom":"1rem"}}>
              <label htmlFor="trust-reg-no">Trust/NGO Registration Number <span style={{"color":"var(--status-danger)"}}>*</span></label>
              <input type="text" id="trust-reg-no" className="form-control" placeholder="e.g. REG/1234/2026" />
              <div className="field-hint">Required for tax-exempt verification.</div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="gstin">GSTIN <span style={{"color":"var(--status-danger)"}}>*</span></label>
                <input type="text" id="gstin" className="form-control" placeholder="e.g. 27AAACM1234A1Z1" maxLength="15"
                  style={{"textTransform":"uppercase"}} onInput={(event) => { window.validateGSTIN(this) }} required />
                <div className="field-hint" id="gstin-hint">15-character alphanumeric GST Identification Number.</div>
              </div>
              <div className="form-group">
                <label htmlFor="gst-type">GST Registration Type</label>
                <select id="gst-type" className="form-control">
                  <option value="regular">Regular Taxpayer</option>
                  <option value="composition">Composition Scheme</option>
                  <option value="unregistered">Unregistered (Exempt)</option>
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="pan">Company PAN <span style={{"color":"var(--status-danger)"}}>*</span></label>
                <input type="text" id="pan" className="form-control" placeholder="e.g. AAACM1234A" maxLength="10"
                  style={{"textTransform":"uppercase"}} onInput={(event) => { window.validatePAN(this) }} required />
                <div className="field-hint" id="pan-hint">10-character PAN as per Income Tax.</div>
              </div>
              <div className="form-group">
                <label htmlFor="tan">TAN (Tax Deduction Account No.)</label>
                <input type="text" id="tan" className="form-control" placeholder="e.g. MUMD12345A" maxLength="10"
                  style={{"textTransform":"uppercase"}} onInput={(event) => { window.validateTAN(this) }} />
                <div className="field-hint" id="tan-hint">Required for TDS deduction filing.</div>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="cin">CIN / LLPIN <span id="cin-required-label"
                    style={{"color":"var(--text-muted)","fontWeight":"400"}}>(if applicable)</span></label>
                <input type="text" id="cin" className="form-control" placeholder="e.g. U72900MH2010PTC123456"
                  style={{"textTransform":"uppercase"}} onInput={(event) => { window.validateCIN(this) }} />
                <div className="field-hint" id="cin-hint">21-character Corporate Identity Number from MCA.</div>
              </div>
              <div className="form-group">
                <label htmlFor="incorporation-date">Date of Incorporation</label>
                <input type="date" id="incorporation-date" className="form-control" onChange={(event) => { window.checkIncorporation(this) }} />
                <div className="field-hint">Must be in the past. Used for gratuity eligibility calculations.</div>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="client-code">Client Code (Internal) <span style={{"color":"var(--status-danger)"}}>*</span></label>
              <div style={{"display":"flex","gap":"0.5rem","alignItems":"center"}}>
                <input type="text" id="client-code" className="form-control" placeholder="e.g. MAH-012" required
                  style={{"maxWidth":"200px"}} />
                <button type="button" className="btn btn-secondary" onClick={(event) => { window.autoGenerateCode() }}
                  style={{"whiteSpace":"nowrap"}}>
                  ⚡ Auto-Generate
                </button>
                <span style={{"fontSize":"0.78rem","color":"var(--text-muted)"}}>Unique internal reference code for payroll
                  processing.</span>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="industry">Industry / Sector</label>
                <select id="industry" className="form-control" onChange={(event) => { window.handleIndustryChange(event.currentTarget.value) }}>
                  <option value="">-- Select Industry --</option>
                  <option>Information Technology (IT)</option>
                  <option>Banking, Financial Services & Insurance (BFSI)</option>
                  <option>Manufacturing</option>
                  <option>Healthcare & Pharmaceuticals</option>
                  <option>Retail & E-Commerce</option>
                  <option>Real Estate & Construction</option>
                  <option>Logistics & Supply Chain</option>
                  <option>Education & EdTech</option>
                  <option>Automobile</option>
                  <option>FMCG</option>
                  <option>Telecom</option>
                  <option>Other</option>
                </select>
                <div className="form-group" id="sub-industry-group" style={{"display":"none","marginTop":"0.5rem"}}>
                  <label htmlFor="sub-industry">Sub-Industry / Specialization</label>
                  <input type="text" id="sub-industry" className="form-control" placeholder="e.g. IT Staffing, Tech Consulting" />
                </div>
              </div>
              <div className="form-group">
                <label htmlFor="client-status">Client Status</label>
                <select id="client-status" className="form-control">
                  <option value="onboarding">Onboarding (Draft)</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>
            </div>

            {/*  Work Locations & Group Company  */}
            <div className="form-row" style={{"marginTop":"1rem"}}>
              <div className="form-group">
                <label htmlFor="work-locations-count">Number of Work Locations</label>
                <input type="number" id="work-locations-count" className="form-control" min="1" value="1" />
                <div className="field-hint">If &gt; 1, Professional Tax will be computed per candidate work state.</div>
              </div>
              <div className="form-group">
                <label style={{"display":"block","marginBottom":"0.5rem"}}>Group / Holding Company</label>
                <div style={{"display":"flex","alignItems":"center","gap":"0.75rem","marginTop":"0.5rem"}}>
                  <label className="toggle-container" style={{"margin":"0"}}>
                    <input type="checkbox" className="toggle-input" id="is-group-company" onChange={(event) => { window.toggleGroupCompany(this) }} />
                    <span className="toggle-switch"></span>
                  </label>
                  <span style={{"fontSize":"0.875rem"}}>Is part of a Group Company</span>
                </div>
              </div>
            </div>
            <div className="form-group" id="parent-company-group" style={{"display":"none","marginTop":"1rem"}}>
              <label htmlFor="parent-company">Parent Company</label>
              <input type="text" id="parent-company" className="form-control" placeholder="Type parent company name..." />
              <div className="field-hint">Links this client under a parent for consolidated billing reports.</div>
            </div>
            </div>{/*  end step-section-1  */}

            <div className="form-step-section" id="step-section-2">
              {/*  ══ SECTION 2: Address ══  */}
            <div className="section-header">
              <div className="section-icon">📍</div>
              <h3>Registered & Billing Address</h3>
            </div>

            <div className="form-group">
              <label htmlFor="reg-address-line1">Registered Office Address Line 1 <span
                  style={{"color":"var(--status-danger)"}}>*</span></label>
              <input type="text" id="reg-address-line1" className="form-control" placeholder="Building Name, Street"
                required />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="reg-address-line2">Address Line 2</label>
                <input type="text" id="reg-address-line2" className="form-control" placeholder="Area, Locality" />
              </div>
              <div className="form-group">
                <label htmlFor="reg-city">City <span style={{"color":"var(--status-danger)"}}>*</span></label>
                <input type="text" id="reg-city" className="form-control" placeholder="e.g. Mumbai" required />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="reg-state">State <span style={{"color":"var(--status-danger)"}}>*</span></label>
                <select id="reg-state" className="form-control" required onChange={(event) => { window.syncBillingState() }}>
                  <option value="">-- Select State --</option>
                  <option>Andhra Pradesh</option>
                  <option>Arunachal Pradesh</option>
                  <option>Assam</option>
                  <option>Bihar</option>
                  <option>Chhattisgarh</option>
                  <option>Goa</option>
                  <option>Gujarat</option>
                  <option>Haryana</option>
                  <option>Himachal Pradesh</option>
                  <option>Jharkhand</option>
                  <option>Karnataka</option>
                  <option>Kerala</option>
                  <option>Madhya Pradesh</option>
                  <option >Maharashtra</option>
                  <option>Manipur</option>
                  <option>Meghalaya</option>
                  <option>Mizoram</option>
                  <option>Nagaland</option>
                  <option>Odisha</option>
                  <option>Punjab</option>
                  <option>Rajasthan</option>
                  <option>Sikkim</option>
                  <option>Tamil Nadu</option>
                  <option>Telangana</option>
                  <option>Tripura</option>
                  <option>Uttar Pradesh</option>
                  <option>Uttarakhand</option>
                  <option>West Bengal</option>
                  <option>Delhi (NCT)</option>
                  <option>Chandigarh</option>
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="reg-pin">PIN Code <span style={{"color":"var(--status-danger)"}}>*</span></label>
                <input type="text" id="reg-pin" className="form-control" placeholder="e.g. 400018" maxLength="6"
                  onInput={(event) => { window.validatePIN(this) }} required />
              </div>
              <div className="form-group">
                <label htmlFor="country">Country</label>
                <select id="country" className="form-control" onChange={(event) => { window.handleCountryChange(event.currentTarget.value) }}>
                  <option value="India" >India</option>
                  <option value="USA">USA</option>
                  <option value="UAE">UAE</option>
                  <option value="UK">UK</option>
                  <option value="Singapore">Singapore</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            {/*  Generic Tax ID / Registration number row (shown only for non-India)  */}
            <div className="form-row" id="generic-tax-id-row" style={{"display":"none","marginTop":"1rem"}}>
              <div className="form-group">
                <label htmlFor="tax-id">Tax ID (Generic) <span style={{"color":"var(--status-danger)"}}>*</span></label>
                <input type="text" id="tax-id" className="form-control" placeholder="e.g. EIN-12345678" />
              </div>
              <div className="form-group">
                <label htmlFor="reg-no">Registration Number <span style={{"color":"var(--status-danger)"}}>*</span></label>
                <input type="text" id="reg-no" className="form-control" placeholder="e.g. REG-87654321" />
              </div>
            </div>

            {/*  Billing Address Toggle  */}
            <div
              style={{"display":"flex","alignItems":"center","gap":"0.75rem","marginBottom":"1rem","padding":"0.75rem 1rem","background":"#F0F9FF","borderRadius":"var(--radius-sm)","border":"1px solid #BAE6FD"}}>
              <label className="toggle-container" style={{"margin":"0"}}>
                <input type="checkbox" className="toggle-input" id="same-as-registered" defaultChecked={true}
                  onChange={(event) => { window.toggleBillingAddress(this) }} />
                <span className="toggle-switch"></span>
              </label>
              <span style={{"fontSize":"0.875rem","fontWeight":"500"}}>Billing address is same as Registered address</span>
            </div>

            <div id="billing-address-section" style={{"display":"none"}}>
              <h4 style={{"fontSize":"0.9rem","color":"var(--primary-navy)","marginBottom":"1rem"}}>Billing Address (for Invoice)
              </h4>
              <div className="form-group">
                <label htmlFor="bill-address-line1">Billing Address Line 1</label>
                <input type="text" id="bill-address-line1" className="form-control" placeholder="Building Name, Street" />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="bill-city">City</label>
                  <input type="text" id="bill-city" className="form-control" />
                </div>
                <div className="form-group">
                  <label htmlFor="bill-state">State</label>
                  <select id="bill-state" className="form-control">
                    <option value="">-- Select State --</option>
                    <option>Maharashtra</option>
                    <option>Karnataka</option>
                    <option>Delhi (NCT)</option>
                    <option>Tamil Nadu</option>
                    <option>Gujarat</option>
                    <option>Telangana</option>
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="bill-pin">PIN Code</label>
                  <input type="text" id="bill-pin" className="form-control" maxLength="6" />
                </div>
              </div>
            </div>

            {/*  Client Branches / Work Locations Section  */}
            <div id="client-branches-main-section" style={{"marginTop":"2rem","borderTop":"1px dashed var(--border-color)","paddingTop":"1.5rem","marginBottom":"1.5rem"}}>
              <div style={{"display":"flex","justifyContent":"space-between","alignItems":"center","marginBottom":"1rem"}}>
                <div>
                  <h4 style={{"fontSize":"1.1rem","color":"var(--primary-navy)","margin":"0"}}>Branch / Work Locations</h4>
                </div>
                <button type="button" className="btn btn-secondary btn-outline" onClick={(event) => { window.addClientBranch() }} style={{"border":"1px solid var(--border-color)"}}>➕ Add New Branch</button>
              </div>
              <div className="info-box" style={{"marginBottom":"1rem","borderLeftColor":"#0284c7","background":"#f0f9ff","color":"#0c4a6e"}}>
                💡 Each branch is treated as a separate billing entity. Invoices are raised branch-wise using that branch's GSTIN and billed to its Finance POC. Employees are assigned to a specific branch when they are onboarded.
              </div>
              
              <div id="client-branches-container" style={{"display":"flex","flexDirection":"column","gap":"1rem"}}>
                {/*  Branch Cards Appended Here  */}
              </div>
            </div>

            </div>{/*  end step-section-2  */}

            <div className="form-step-section" id="step-section-3">
              {/*  ══ SECTION 3: Contact Persons ══  */}
            <div className="section-header">
              <div className="section-icon">👥</div>
              <h3>Contact Persons</h3>
              <span className="section-badge">MULTI-CONTACT</span>
            </div>

            <div className="info-box" style={{"marginBottom":"1rem"}}>
              💡 Add all contact persons with their roles. The <strong>Primary POC</strong> receives all payroll
              communications.
              <strong>Finance Contact</strong> receives invoices. <strong>HR Contact</strong> receives onboarding and
              exit emails.
            </div>

            {/*  Primary POC  */}
            <div
              style={{"background":"#FAFBFC","border":"1px solid var(--border-color)","borderRadius":"var(--radius-md)","padding":"1rem","marginBottom":"1rem"}}>
              <div style={{"display":"flex","alignItems":"center","justifyContent":"space-between","marginBottom":"0.75rem"}}>
                <strong style={{"fontSize":"0.875rem","color":"var(--primary-navy)"}}>👤 Primary Point of Contact
                  (POC)</strong>
                <span className="badge badge-info">Receives All Comms</span>
              </div>
              <div className="form-row">
                <div className="form-group"><label>Full Name <span style={{"color":"var(--status-danger)"}}>*</span></label>
                  <input type="text" id="poc1-name" className="form-control" placeholder="e.g. Vikas Mehta" required />
                </div>
                <div className="form-group"><label>Designation</label>
                  <input type="text" id="poc1-designation" className="form-control" placeholder="e.g. HR Manager" />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group"><label>Email <span style={{"color":"var(--status-danger)"}}>*</span></label>
                  <input type="email" id="poc1-email" className="form-control" placeholder="e.g. vikas@mahindra.com"
                    required onInput={(event) => { window.validateEmail(this) }} />
                </div>
                <div className="form-group"><label>Phone <span style={{"color":"var(--status-danger)"}}>*</span></label>
                  <input type="tel" id="poc1-phone" className="form-control" placeholder="10-digit mobile" maxLength="10"
                    onInput={(event) => { window.validatePhone(this) }} required />
                </div>
              </div>
              <div className="form-row" style={{"marginTop":"0.75rem","alignItems":"center","gap":"1.5rem"}}>
                <div className="form-group" style={{"display":"flex","alignItems":"center","gap":"0.5rem","margin":"0"}}>
                  <label className="toggle-container" style={{"margin":"0"}}>
                    <input type="checkbox" className="toggle-input" id="poc1-whatsapp-same" defaultChecked={true} />
                    <span className="toggle-switch"></span>
                  </label>
                  <span style={{"fontSize":"0.8rem"}}>WhatsApp same as Phone</span>
                </div>
                <div className="form-group" style={{"margin":"0"}}>
                  <label style={{"fontSize":"0.8rem","display":"block","marginBottom":"0.25rem"}}>Communication Preferences</label>
                  <div style={{"display":"flex","gap":"0.75rem"}}>
                    <label style={{"fontSize":"0.78rem","display":"flex","alignItems":"center","gap":"0.25rem","cursor":"pointer","userSelect":"none"}}>
                      <input type="checkbox" id="poc1-pref-email" defaultChecked={true} /> ✉️ Email
                    </label>
                    <label style={{"fontSize":"0.78rem","display":"flex","alignItems":"center","gap":"0.25rem","cursor":"pointer","userSelect":"none"}}>
                      <input type="checkbox" id="poc1-pref-sms" defaultChecked={true} /> 📱 SMS
                    </label>
                    <label style={{"fontSize":"0.78rem","display":"flex","alignItems":"center","gap":"0.25rem","cursor":"pointer","userSelect":"none"}}>
                      <input type="checkbox" id="poc1-pref-wa" defaultChecked={true} /> 💬 WhatsApp
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/*  Finance POC  */}
            <div
              style={{"background":"#FAFBFC","border":"1px solid var(--border-color)","borderRadius":"var(--radius-md)","padding":"1rem","marginBottom":"1rem"}}>
              <div style={{"display":"flex","alignItems":"center","justifyContent":"space-between","marginBottom":"0.75rem"}}>
                <strong style={{"fontSize":"0.875rem","color":"var(--primary-navy)"}}>💼 Finance / Accounts Contact</strong>
                <span className="badge badge-warning">Receives Invoices</span>
              </div>
              <div className="form-row">
                <div className="form-group"><label>Full Name</label>
                  <input type="text" id="poc2-name" className="form-control" placeholder="e.g. Ravi Joshi" />
                </div>
                <div className="form-group"><label>Designation</label>
                  <input type="text" id="poc2-designation" className="form-control" placeholder="e.g. Accounts Manager" />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group"><label>Email</label>
                  <input type="email" id="poc2-email" className="form-control" placeholder="e.g. accounts@mahindra.com"
                    onInput={(event) => { window.validateEmail(this) }} />
                </div>
                <div className="form-group"><label>Phone</label>
                  <input type="tel" id="poc2-phone" className="form-control" placeholder="10-digit mobile" maxLength="10"
                    onInput={(event) => { window.validatePhone(this) }} />
                </div>
              </div>
              <div className="form-row" style={{"marginTop":"0.75rem","alignItems":"center","gap":"1.5rem"}}>
                <div className="form-group" style={{"display":"flex","alignItems":"center","gap":"0.5rem","margin":"0"}}>
                  <label className="toggle-container" style={{"margin":"0"}}>
                    <input type="checkbox" className="toggle-input" id="poc2-whatsapp-same" defaultChecked={true} />
                    <span className="toggle-switch"></span>
                  </label>
                  <span style={{"fontSize":"0.8rem"}}>WhatsApp same as Phone</span>
                </div>
                <div className="form-group" style={{"display":"flex","alignItems":"center","gap":"0.5rem","margin":"0"}}>
                  <label className="toggle-container" style={{"margin":"0"}}>
                    <input type="checkbox" className="toggle-input" id="poc2-cc-invoice" defaultChecked={true} />
                    <span className="toggle-switch"></span>
                  </label>
                  <span style={{"fontSize":"0.8rem","fontWeight":"500"}}>CC on Invoice Email</span>
                </div>
              </div>
              <div style={{"fontSize":"0.75rem","color":"var(--text-muted)","marginTop":"0.5rem"}}>
                Communication Preferences:
                <label style={{"marginLeft":"0.5rem","fontSize":"0.75rem","cursor":"pointer"}}><input type="checkbox" id="poc2-pref-email" defaultChecked={true} /> ✉️ Email</label>
                <label style={{"marginLeft":"0.5rem","fontSize":"0.75rem","cursor":"pointer"}}><input type="checkbox" id="poc2-pref-sms" /> 📱 SMS</label>
                <label style={{"marginLeft":"0.5rem","fontSize":"0.75rem","cursor":"pointer"}}><input type="checkbox" id="poc2-pref-wa" /> 💬 WhatsApp</label>
              </div>
            </div>

            {/*  HR POC  */}
            <div
              style={{"background":"#FAFBFC","border":"1px solid var(--border-color)","borderRadius":"var(--radius-md)","padding":"1rem","marginBottom":"1rem"}}>
              <div style={{"display":"flex","alignItems":"center","justifyContent":"space-between","marginBottom":"0.75rem"}}>
                <strong style={{"fontSize":"0.875rem","color":"var(--primary-navy)"}}>🏷️ HR / Onboarding Contact</strong>
                <span className="badge badge-success">Receives HR Notifications</span>
              </div>
              <div className="form-row">
                <div className="form-group"><label>Full Name</label>
                  <input type="text" id="poc3-name" className="form-control" placeholder="e.g. Priya Nair" />
                </div>
                <div className="form-group"><label>Email</label>
                  <input type="email" id="poc3-email" className="form-control" placeholder="e.g. hr@mahindra.com"
                    onInput={(event) => { window.validateEmail(this) }} />
                </div>
              </div>
              <div className="form-row" style={{"marginTop":"0.75rem","alignItems":"center","gap":"1.5rem"}}>
                <div className="form-group" style={{"display":"flex","alignItems":"center","gap":"0.5rem","margin":"0"}}>
                  <label className="toggle-container" style={{"margin":"0"}}>
                    <input type="checkbox" className="toggle-input" id="poc3-whatsapp-same" defaultChecked={true} />
                    <span className="toggle-switch"></span>
                  </label>
                  <span style={{"fontSize":"0.8rem"}}>WhatsApp same as Phone</span>
                </div>
                <div className="form-group" style={{"display":"flex","alignItems":"center","gap":"0.5rem","margin":"0"}}>
                  <label className="toggle-container" style={{"margin":"0"}}>
                    <input type="checkbox" className="toggle-input" id="poc3-onboarding-kits" defaultChecked={true} />
                    <span className="toggle-switch"></span>
                  </label>
                  <span style={{"fontSize":"0.8rem","fontWeight":"500"}}>Receives Onboarding Kits</span>
                </div>
              </div>
              <div style={{"fontSize":"0.75rem","color":"var(--text-muted)","marginTop":"0.5rem"}}>
                Communication Preferences:
                <label style={{"marginLeft":"0.5rem","fontSize":"0.75rem","cursor":"pointer"}}><input type="checkbox" id="poc3-pref-email" defaultChecked={true} /> ✉️ Email</label>
                <label style={{"marginLeft":"0.5rem","fontSize":"0.75rem","cursor":"pointer"}}><input type="checkbox" id="poc3-pref-sms" /> 📱 SMS</label>
                <label style={{"marginLeft":"0.5rem","fontSize":"0.75rem","cursor":"pointer"}}><input type="checkbox" id="poc3-pref-wa" /> 💬 WhatsApp</label>
              </div>
            </div>

            {/*  Dynamic Additional Contacts  */}
            <div id="extra-contacts-container"></div>
            <button type="button" className="btn btn-secondary btn-xs" onClick={(event) => { window.addExtraContact() }} style={{"marginTop":"0.75rem","marginBottom":"1.5rem"}}>
              ➕ Add Another Contact
            </button>
            </div>{/*  end step-section-3  */}

            <div className="form-step-section" id="step-section-4">
              {/*  ══ SECTION 4: Contract & Billing ══  */}
            <div className="section-header">
              <div className="section-icon">📄</div>
              <h3>Contract Terms & Billing Configuration</h3>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="contract-type">Contract Type <span style={{"color":"var(--status-danger)"}}>*</span></label>
                <select id="contract-type" className="form-control" required onChange={(event) => { window.handleContractTypeChange(this) }}>
                  <option value="">-- Select --</option>
                  <option value="agency">Agency Payroll (Staffing Model)</option>
                  <option value="eor">Employer of Record (EOR / Pass-through)</option>
                  <option value="hybrid">Hybrid (Agency + EOR)</option>
                  <option value="consulting">Consulting / Project Based</option>
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="billing-model">Billing Model <span style={{"color":"var(--status-danger)"}}>*</span></label>
                <select id="billing-model" className="form-control" required onChange={(event) => { window.handleBillingModelChange(this) }}>
                  <option value="">-- Select --</option>
                  <option value="markup">CTC + Markup Percentage (%)</option>
                  <option value="fixed_per_candidate">Fixed Fee Per Candidate (₹/candidate)</option>
                  <option value="fixed_per_month">Fixed Monthly Retainer (₹/month)</option>
                  <option value="lumpsum">Lump Sum Project Billing</option>
                  <option value="hourly">Hourly Rate Billing</option>
                </select>
              </div>
            </div>

            {/*  Dynamic billing fields  */}
            <div id="billing-markup-fields" className="conditional-field hidden">
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="markup-pct">Markup / Commission Percentage (%) <span
                      style={{"color":"var(--status-danger)"}}>*</span></label>
                  <input type="number" id="markup-pct" className="form-control" placeholder="e.g. 8.5" step="0.1" min="0"
                    max="100" />
                  <div className="field-hint">Applied on total CTC. Invoice = CTC × (1 + markup%).</div>
                </div>
                <div className="form-group">
                  <label htmlFor="markup-base">Markup Applied On</label>
                  <select id="markup-base" className="form-control">
                    <option value="gross">Gross Salary (CTC)</option>
                    <option value="basic">Basic Salary Only</option>
                    <option value="ctc_minus_statutory">CTC minus Statutory Employer Contributions</option>
                  </select>
                </div>
              </div>
            </div>

            <div id="billing-fixed-candidate-fields" className="conditional-field hidden">
              <div className="form-group" style={{"maxWidth":"300px"}}>
                <label htmlFor="fixed-fee-candidate">Fixed Fee Per Candidate (₹) <span
                    style={{"color":"var(--status-danger)"}}>*</span></label>
                <input type="number" id="fixed-fee-candidate" className="form-control" placeholder="e.g. 1500" min="0" />
                <div className="field-hint">Charged per active candidate per billing cycle.</div>
              </div>
            </div>

            <div id="billing-fixed-monthly-fields" className="conditional-field hidden">
              <div className="form-group" style={{"maxWidth":"300px"}}>
                <label htmlFor="fixed-monthly-retainer">Monthly Retainer Amount (₹) <span
                    style={{"color":"var(--status-danger)"}}>*</span></label>
                <input type="number" id="fixed-monthly-retainer" className="form-control" placeholder="e.g. 50000" min="0" />
              </div>
            </div>

            <div id="billing-hourly-fields" className="conditional-field hidden">
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="hourly-rate">Hourly Rate (₹/hr)</label>
                  <input type="number" id="hourly-rate" className="form-control" placeholder="e.g. 850" min="0" />
                </div>
                <div className="form-group">
                  <label htmlFor="standard-hours">Standard Working Hours / Month</label>
                  <input type="number" id="standard-hours" className="form-control" placeholder="e.g. 160" min="0" />
                </div>
              </div>
            </div>

            {/*  OT Billing Rules  */}
            <div className="form-row" style={{"marginTop":"1rem","marginBottom":"1rem","paddingTop":"1rem","borderTop":"1px solid var(--border-color)"}}>
              <div className="form-group">
                <label htmlFor="ot-billing">Overtime (OT) Billing Rule <span style={{"color":"var(--status-danger)"}}>*</span></label>
                <select id="ot-billing" className="form-control" required>
                  <option value="not_applicable">Not Applicable (No OT Billed)</option>
                  <option value="standard">Standard Rate (1.0x hourly rate)</option>
                  <option value="1_5x">1.5x Hourly Rate</option>
                  <option value="double">Double Time (2.0x hourly rate)</option>
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="ot-approval">OT Approval Workflow</label>
                <select id="ot-approval" className="form-control">
                  <option value="timesheet">Auto-approve via Timesheet</option>
                  <option value="manager">Client Manager Approval Required</option>
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="invoice-cycle">Invoice Generation Cycle</label>
                <select id="invoice-cycle" className="form-control">
                  <option value="monthly">Monthly (Last working day of month)</option>
                  <option value="biweekly">Bi-Weekly (Every 2 weeks)</option>
                  <option value="weekly">Weekly</option>
                  <option value="quarterly">Quarterly</option>
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="payment-terms">Payment Net Terms <span style={{"color":"var(--status-danger)"}}>*</span></label>
                <select id="payment-terms" className="form-control" required>
                  <option value="immediate">Due on Receipt (Immediate)</option>
                  <option value="net7">Net 7 Days</option>
                  <option value="net15" >Net 15 Days</option>
                  <option value="net30">Net 30 Days</option>
                  <option value="net45">Net 45 Days</option>
                  <option value="net60">Net 60 Days</option>
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="contract-start">Contract Start Date <span
                    style={{"color":"var(--status-danger)"}}>*</span></label>
                <input type="date" id="contract-start" className="form-control" required onChange={(event) => { window.validateContractDates() }} />
              </div>
              <div className="form-group">
                <label htmlFor="contract-end">Contract End Date</label>
                <input type="date" id="contract-end" className="form-control" onChange={(event) => { window.validateContractDates() }} />
                <div className="field-hint" id="contract-end-hint">Leave blank for open-ended contracts.</div>
              </div>
            </div>

            <div
              style={{"display":"flex","gap":"1.5rem","flexWrap":"wrap","padding":"0.75rem 1rem","background":"#F8FAFC","border":"1px solid var(--border-color)","borderRadius":"var(--radius-md)","marginBottom":"1.25rem"}}>
              <label style={{"display":"flex","alignItems":"center","gap":"0.5rem","fontSize":"0.875rem","cursor":"pointer"}}>
                <input type="checkbox" id="auto-renewal" style={{"width":"16px","height":"16px"}} />
                <span>Auto-Renewal (renew for same period if not terminated)</span>
              </label>
              <label style={{"display":"flex","alignItems":"center","gap":"0.5rem","fontSize":"0.875rem","cursor":"pointer"}}>
                <input type="checkbox" id="po-required" style={{"width":"16px","height":"16px"}} onChange={(event) => { window.togglePOFields(this) }} />
                <span>Purchase Order (PO) Required before invoicing</span>
              </label>
            </div>

            {/*  PO Fields (conditional)  */}
            <div id="po-fields" style={{"display":"none","background":"#FAFBFC","border":"1px dashed var(--border-color)","borderRadius":"var(--radius-md)","padding":"1rem","marginBottom":"1.25rem"}}>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="po-number">PO Number <span style={{"color":"var(--status-danger)"}}>*</span></label>
                  <input type="text" id="po-number" className="form-control" placeholder="e.g. PO/2026/00142" />
                  <div className="field-hint">Invoice held as Draft until PO number is entered here.</div>
                </div>
                <div className="form-group">
                  <label htmlFor="po-value">PO Value (₹)</label>
                  <input type="number" id="po-value" className="form-control" placeholder="e.g. 500000" />
                  <div className="field-hint">Invoice generation blocked if cumulative invoices exceed this amount.</div>
                </div>
              </div>
              <div className="form-group" style={{"maxWidth":"300px","marginBottom":"0"}}>
                <label htmlFor="po-validity">PO Validity Date</label>
                <input type="date" id="po-validity" className="form-control" />
                <div className="field-hint">Invoice generation blocked after this date.</div>
              </div>
            </div>

            {/*  Additional Contract / GST / TDS Preferences  */}
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="gst-rate">Applicable GST Rate <span style={{"color":"var(--status-danger)"}}>*</span></label>
                <select id="gst-rate" className="form-control" onChange={(event) => { window.handleGSTRateChange(event.currentTarget.value) }}>
                  <option value="18" >18% (Standard)</option>
                  <option value="12">40%</option>
                  <option value="5">5%</option>
                  <option value="0_exempt">0% (Exempt/SEZ)</option>
                  <option value="0_lut">0% + LUT Filed</option>
                </select>
              </div>
              <div className="form-group" id="lut-ref-group" style={{"display":"none"}}>
                <label htmlFor="lut-ref-no">LUT/Bond Reference No. <span style={{"color":"var(--status-danger)"}}>*</span></label>
                <input type="text" id="lut-ref-no" className="form-control" placeholder="e.g. LUT/2026-27/123" />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label style={{"display":"block","marginBottom":"0.5rem"}}>Reverse Charge Applicable</label>
                <div style={{"display":"flex","alignItems":"center","gap":"0.75rem","marginTop":"0.5rem"}}>
                  <label className="toggle-container" style={{"margin":"0"}}>
                    <input type="checkbox" className="toggle-input" id="reverse-charge" />
                    <span className="toggle-switch"></span>
                  </label>
                  <span style={{"fontSize":"0.875rem"}}>Shift GST liability to client</span>
                </div>
                <div className="field-hint">If active, invoice will bear 'Reverse Charge Applicable' note.</div>
              </div>
              <div className="form-group">
                <label htmlFor="tds-applicable-agency">TDS Applicable on Agency Invoice</label>
                <select id="tds-applicable-agency" className="form-control" onChange={(event) => { window.handleTDSChange(event.currentTarget.value) }}>
                  <option value="na" >Not Applicable</option>
                  <option value="1">1% — Sec 194C (Contractor)</option>
                  <option value="2">2% — Sec 194J (Professional)</option>
                  <option value="10">10% — Sec 194J (Professional)</option>
                  <option value="other">Other</option>
                </select>
                <div className="field-hint" id="tds-preview-hint">Net receivable = Invoice Amount</div>
              </div>
            </div>

            <div className="form-group">
              <label>Invoice Format Preference</label>
              <div style={{"display":"flex","gap":"1.5rem","marginTop":"0.25rem"}}>
                <label style={{"display":"flex","alignItems":"center","gap":"0.4rem","cursor":"pointer"}}>
                  <input type="checkbox" id="pref-format-pdf" defaultChecked={true} /> PDF Format
                </label>
                <label style={{"display":"flex","alignItems":"center","gap":"0.4rem","cursor":"pointer"}}>
                  <input type="checkbox" id="pref-format-xlsx" /> XLSX Format
                </label>
              </div>
            </div>

            <div className="form-group" style={{"marginBottom":"1.5rem"}}>
              <label htmlFor="invoice-footer-notes">Invoice Footer Notes</label>
              <textarea id="invoice-footer-notes" className="form-control" rows="3" placeholder="e.g. Please include PO number in payment reference. NEFT preferred."></textarea>
              <div className="field-hint">Appears at the bottom of every invoice sent to this client.</div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="notice-period">Contract Notice Period (days)</label>
                <input type="number" id="notice-period" className="form-control" placeholder="e.g. 30" min="0" value="30" />
                <div className="field-hint">Days notice required to terminate the contract.</div>
              </div>
              <div className="form-group">
                <label htmlFor="credit-limit">Credit Limit (₹)</label>
                <input type="number" id="credit-limit" className="form-control" placeholder="e.g. 1000000" min="0" />
                <div className="field-hint">Maximum outstanding receivable allowed.</div>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="late-penalty">Late Payment Penalty (%)</label>
                <input type="number" id="late-penalty" className="form-control" placeholder="e.g. 1.5" step="0.1" min="0"
                  max="36" />
                <div className="field-hint">% per month applied after due date. Standard: 1.5%/month.</div>
              </div>
              <div className="form-group">
                <label htmlFor="billing-currency">Billing Currency</label>
                <select id="billing-currency" className="form-control">
                  <option value="INR" >₹ INR (Indian Rupee)</option>
                  <option value="USD">$ USD (US Dollar)</option>
                  <option value="EUR">€ EUR (Euro)</option>
                  <option value="GBP">£ GBP (British Pound)</option>
                  <option value="SGD">S$ SGD (Singapore Dollar)</option>
                  <option value="AED">AED (UAE Dirham)</option>
                </select>
              </div>
            </div>
            </div>{/*  end step-section-4  */}

            <div className="form-step-section" id="step-section-5">
              {/*  ══ SECTION 5: Statutory Defaults ══  */}
            <div className="section-header">
              <div className="section-icon">⚖️</div>
              <h3>Statutory Defaults for This Client</h3>
              <span className="section-badge">INHERITED BY CANDIDATES</span>
            </div>

            <div className="warn-box" style={{"marginBottom":"1rem"}}>
              ⚠️ These are <strong>default settings</strong> applied to ALL new candidates registered under this client.
              Individual overrides can be done on each candidate's profile page.
            </div>

            <div style={{"display":"flex","flexDirection":"column","gap":"0.75rem"}}>

              {/*  PF  */}
              <div className="stat-row">
                <div className="stat-info">
                  <strong>Provident Fund (PF) — EPFO</strong>
                  <span>Employee: 12% of Basic. Employer: 12% (3.67% EPF + 8.33% EPS). Applicable on Basic up to
                    ₹15,000.</span>
                </div>
                <div className="stat-rate">
                  <div style={{"fontSize":"0.7rem","color":"var(--text-muted)","marginBottom":"0.2rem"}}>Wage Ceiling Override
                    (₹)</div>
                  <input type="number" className="stat-rate-input" id="pf-ceiling" placeholder="15000" value="15000" onChange={(event) => { window.handlePFCeiling(event.currentTarget.value) }} />
                  <div className="field-hint" id="pf-ceiling-hint" style={{"fontSize":"0.65rem","marginTop":"0.2rem","color":"var(--text-muted)"}}>Standard EPFO statutory wage ceiling is ₹15,000.</div>
                </div>
                <div className="stat-toggle">
                  <label className="toggle-container">
                    <input type="checkbox" className="toggle-input" id="pf-applicable" defaultChecked={true} />
                    <span className="toggle-switch"></span>
                  </label>
                </div>
              </div>

              {/*  EPF Admin Charges  */}
              <div className="stat-row" style={{"background":"#F8FAFC","border":"1px dashed var(--border-color)"}}>
                <div className="stat-info">
                  <strong>EPF Admin Charges</strong>
                  <span style={{"fontSize":"0.75rem","color":"var(--text-muted)"}}>0.5% on EPF wages (minimum ₹500/month). Paid by employer to EPFO.</span>
                </div>
                <div className="stat-rate"></div>
                <div><span className="badge badge-neutral" style={{"fontSize":"0.65rem","background":"var(--border-color)","color":"var(--text-main)"}}>Auto-Computed</span></div>
              </div>

              {/*  EDLI  */}
              <div className="stat-row" style={{"background":"#F8FAFC","border":"1px dashed var(--border-color)"}}>
                <div className="stat-info">
                  <strong>EDLI (Employees' Deposit Linked Insurance)</strong>
                  <span style={{"fontSize":"0.75rem","color":"var(--text-muted)"}}>0.5% on wages up to ₹15,000. Employer contribution only.</span>
                </div>
                <div className="stat-rate"></div>
                <div><span className="badge badge-neutral" style={{"fontSize":"0.65rem","background":"var(--border-color)","color":"var(--text-main)"}}>Auto-Computed</span></div>
              </div>

              {/*  ESI  */}
              <div className="stat-row">
                <div className="stat-info">
                  <strong>Employee State Insurance (ESI) — ESIC</strong>
                  <span>Employee: 0.75% of Gross. Employer: 3.25% of Gross. Applicable if Gross ≤ ₹21,000/month.</span>
                </div>
                <div className="stat-rate">
                  <div style={{"fontSize":"0.7rem","color":"var(--text-muted)","marginBottom":"0.2rem"}}>Gross Limit Override (₹)
                  </div>
                  <input type="number" className="stat-rate-input" id="esi-limit" placeholder="21000" value="21000" onChange={(event) => { window.handleESILimit(event.currentTarget.value) }} />
                  <div className="field-hint" id="esi-limit-hint" style={{"fontSize":"0.65rem","marginTop":"0.2rem","color":"var(--text-muted)"}}>Standard ESIC statutory gross wage ceiling is ₹21,000.</div>
                </div>
                <div className="stat-toggle">
                  <label className="toggle-container">
                    <input type="checkbox" className="toggle-input" id="esi-applicable" defaultChecked={true} />
                    <span className="toggle-switch"></span>
                  </label>
                </div>
              </div>

              {/*  PT  */}
              <div className="stat-row">
                <div className="stat-info">
                  <strong>Professional Tax (PT) — State Govt.</strong>
                  <span>Deducted per state-specific slabs. Maharashtra: Max ₹200/month. Computed from candidate work
                    location.</span>
                </div>
                <div className="stat-rate">
                  <div style={{"fontSize":"0.7rem","color":"var(--text-muted)","marginBottom":"0.2rem"}}>Override State Slab
                  </div>
                  <select className="stat-rate-input" id="pt-state">
                    <option value="auto">Auto (from location)</option>
                    <option value="MH">Maharashtra</option>
                    <option value="KA">Karnataka</option>
                    <option value="WB">West Bengal</option>
                    <option value="TN">Tamil Nadu</option>
                    <option value="AP">Andhra Pradesh</option>
                    <option value="TS">Telangana</option>
                    <option value="NA">Not Applicable</option>
                  </select>
                </div>
                <div className="stat-toggle">
                  <label className="toggle-container">
                    <input type="checkbox" className="toggle-input" id="pt-applicable" defaultChecked={true} />
                    <span className="toggle-switch"></span>
                  </label>
                </div>
              </div>

              {/*  LWF  */}
              <div className="stat-row">
                <div className="stat-info">
                  <strong>Labour Welfare Fund (LWF) — State Govt.</strong>
                  <span>Bi-annual or annual deduction. Amount varies by state (e.g. Maharashtra: ₹6 employee + ₹12
                    employer per June & Dec).</span>
                </div>
                <div className="stat-rate">
                  <div style={{"fontSize":"0.7rem","color":"var(--text-muted)","marginBottom":"0.2rem"}}>LWF Frequency</div>
                  <select className="stat-rate-input" id="lwf-frequency">
                    <option value="biannual">Bi-Annual (Jun & Dec)</option>
                    <option value="annual">Annual (Dec only)</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
                <div className="stat-toggle">
                  <label className="toggle-container">
                    <input type="checkbox" className="toggle-input" id="lwf-applicable" />
                    <span className="toggle-switch"></span>
                  </label>
                </div>
              </div>

              {/*  TDS  */}
              <div className="stat-row">
                <div className="stat-info">
                  <strong>TDS (Tax Deducted at Source) — Income Tax Act</strong>
                  <span>Deducted under Sec 192. New Regime is default since FY 2023-24. Employee can opt for Old Regime
                    via declaration.</span>
                </div>
                <div className="stat-rate">
                  <div style={{"fontSize":"0.7rem","color":"var(--text-muted)","marginBottom":"0.2rem"}}>Default Tax Regime</div>
                  <select className="stat-rate-input" id="tds-regime">
                    <option value="new">New Regime (Default)</option>
                    <option value="old">Old Regime</option>
                    <option value="employee_choice">Employee's Choice</option>
                  </select>
                </div>
                <div className="stat-toggle">
                  <label className="toggle-container">
                    <input type="checkbox" className="toggle-input" id="tds-applicable" defaultChecked={true} />
                    <span className="toggle-switch"></span>
                  </label>
                </div>
              </div>

              {/*  Gratuity  */}
              <div className="stat-row">
                <div className="stat-info">
                  <strong>Gratuity — Payment of Gratuity Act, 1972</strong>
                  <span>Applicable after 5 years of continuous service. Formula: (Last Basic × 15/26) × Years of
                    Service.</span>
                </div>
                <div className="stat-rate">
                  <div style={{"fontSize":"0.7rem","color":"var(--text-muted)","marginBottom":"0.2rem"}}>CTC Inclusion</div>
                  <select className="stat-rate-input" id="gratuity-mode">
                    <option value="ctc_included">Part of CTC</option>
                    <option value="over_ctc">Over & Above CTC</option>
                    <option value="na">Not in CTC</option>
                  </select>
                </div>
                <div className="stat-toggle">
                  <label className="toggle-container">
                    <input type="checkbox" className="toggle-input" id="gratuity-applicable" defaultChecked={true} />
                    <span className="toggle-switch"></span>
                  </label>
                </div>
              </div>

              {/*  Bonus  */}
              <div className="stat-row">
                <div className="stat-info">
                  <strong>Statutory Bonus — Payment of Bonus Act, 1965</strong>
                  <span>Applicable if salary ≤ ₹21,000. Minimum 8.33%, Maximum 20% of basic wages per year.</span>
                </div>
                <div className="stat-rate">
                  <div style={{"fontSize":"0.7rem","color":"var(--text-muted)","marginBottom":"0.2rem"}}>Bonus Rate (%)</div>
                  <input type="number" className="stat-rate-input" id="bonus-pct" placeholder="8.33" value="8.33"
                    step="0.01" min="8.33" max="20" />
                </div>
                <div className="stat-toggle">
                  <label className="toggle-container">
                    <input type="checkbox" className="toggle-input" id="bonus-applicable" />
                    <span className="toggle-switch"></span>
                  </label>
                </div>
              </div>

              {/*  LOP Basis Override  */}
              <div className="stat-row">
                <div className="stat-info">
                  <strong>Loss of Pay (LOP) Calculation Basis</strong>
                  <span>Determines the denominator for daily rate calculations during unapproved absences.</span>
                </div>
                <div className="stat-rate" style={{"width":"220px"}}>
                  <div style={{"fontSize":"0.7rem","color":"var(--text-muted)","marginBottom":"0.2rem"}}>Client Specific Basis</div>
                  <select className="stat-rate-input" id="client-lop-basis" style={{"width":"100%"}}>
                    <option value="inherit" >Inherit from Global Settings</option>
                    <option value="26">26 Working Days (excludes Sundays)</option>
                    <option value="30">30 Calendar Days</option>
                  </select>
                </div>
                <div className="stat-toggle">
                  {/*  No toggle needed  */}
                </div>
              </div>

              {/*  State-Wise PT & LWF Registrations  */}
              <div style={{"marginTop":"1rem","paddingTop":"1.5rem","borderTop":"1px dashed var(--border-color)"}}>
                <div style={{"display":"flex","justifyContent":"space-between","alignItems":"center","marginBottom":"1rem"}}>
                  <div>
                    <strong style={{"color":"var(--primary-navy)","fontSize":"0.95rem"}}>📍 State-wise PT & LWF Registrations</strong>
                    <p style={{"margin":"0","fontSize":"0.75rem","color":"var(--text-muted)"}}>Configure registration details for states where candidates are deployed.</p>
                  </div>
                  <button type="button" className="btn btn-secondary btn-xs" onClick={(event) => { window.addStateRegistration() }}>➕ Add State</button>
                </div>
                <div id="state-registrations-container" style={{"display":"flex","flexDirection":"column","gap":"0.75rem"}}>
                  {/*  Initial row  */}
                  <div className="form-row" style={{"background":"#FAFBFC","padding":"0.75rem","border":"1px solid var(--border-color)","borderRadius":"var(--radius-md)","alignItems":"center"}}>
                    <div className="form-group" style={{"marginBottom":"0","flex":"1"}}>
                      <label style={{"fontSize":"0.75rem"}}>State</label>
                      <select className="form-control" style={{"fontSize":"0.8rem","padding":"0.25rem"}}>
                        <option value="MH">Maharashtra</option>
                        <option value="KA">Karnataka</option>
                        <option value="DL">Delhi</option>
                        <option value="TN">Tamil Nadu</option>
                        <option value="TS">Telangana</option>
                      </select>
                    </div>
                    <div className="form-group" style={{"marginBottom":"0","flex":"1.5"}}>
                      <label style={{"fontSize":"0.75rem"}}>PT Registration No.</label>
                      <input type="text" className="form-control" style={{"fontSize":"0.8rem","padding":"0.25rem"}} placeholder="PT EC/RC number" />
                    </div>
                    <div className="form-group" style={{"marginBottom":"0","flex":"1.5"}}>
                      <label style={{"fontSize":"0.75rem"}}>LWF Registration No.</label>
                      <input type="text" className="form-control" style={{"fontSize":"0.8rem","padding":"0.25rem"}} placeholder="LWF Est. code" />
                    </div>
                    <button type="button" className="btn" style={{"background":"none","border":"none","color":"var(--status-danger)","cursor":"pointer","padding":"0 0.5rem"}} onClick={(event) => { event.currentTarget.parentElement.window.remove() }} title="Remove">🗑️</button>
                  </div>
                </div>
              </div>

            </div>
            </div>{/*  end step-section-5  */}

            

            <div className="form-step-section" id="step-section-6">
              {/*  ══ SECTION 6: Document Upload ══  */}
            <div className="section-header">
              <div className="section-icon">📁</div>
              <h3>Compliance Documents</h3>
              <span className="section-badge">REQUIRED FOR ACTIVATION</span>
            </div>

            <div className="info-box" style={{"marginBottom":"1rem"}}>
              📋 Upload all required compliance documents. Supported formats: <strong>PDF, JPG, PNG, XLSX</strong>. Max
              size per file: <strong>10 MB</strong>.
              Documents are encrypted and stored securely.
            </div>

            {/*  Quick upload buttons for specific doc types  */}
            <div style={{"display":"flex","gap":"0.5rem","flexWrap":"wrap","marginBottom":"1rem"}}>
              <button type="button" className="btn btn-secondary" style={{"fontSize":"0.8rem","padding":"0.4rem 0.75rem"}}
                onClick={(event) => { window.triggerDocUpload('agent_client_agreement') }}>🤝 Agent & Client Agreement</button>
              <button type="button" className="btn btn-secondary" style={{"fontSize":"0.8rem","padding":"0.4rem 0.75rem"}}
                onClick={(event) => { window.triggerDocUpload('msa') }}>📜 Upload MSA</button>
              <button type="button" className="btn btn-secondary" style={{"fontSize":"0.8rem","padding":"0.4rem 0.75rem"}}
                onClick={(event) => { window.triggerDocUpload('nda') }}>🔒 Upload NDA</button>
              <button type="button" className="btn btn-secondary" style={{"fontSize":"0.8rem","padding":"0.4rem 0.75rem"}}
                onClick={(event) => { window.triggerDocUpload('work_order') }}>📋 Work Order</button>
              <button type="button" className="btn btn-secondary" style={{"fontSize":"0.8rem","padding":"0.4rem 0.75rem"}}
                onClick={(event) => { window.triggerDocUpload('gst_cert') }}>🏛️ GST Certificate</button>
              <button type="button" className="btn btn-secondary" style={{"fontSize":"0.8rem","padding":"0.4rem 0.75rem"}}
                onClick={(event) => { window.triggerDocUpload('pan_card') }}>💳 PAN Card</button>
              <button type="button" className="btn btn-secondary" style={{"fontSize":"0.8rem","padding":"0.4rem 0.75rem"}}
                onClick={(event) => { window.triggerDocUpload('tan_doc') }}>📄 TAN Letter</button>
              <button type="button" className="btn btn-secondary" style={{"fontSize":"0.8rem","padding":"0.4rem 0.75rem"}}
                onClick={(event) => { window.triggerDocUpload('other') }}>📎 Other Document</button>
            </div>

            {/*  Drag & Drop Upload Zone  */}
            <div className="doc-upload-zone" id="upload-zone"
              onDragover={(event) => { event.window.preventDefault(); event.currentTarget.classList.window.add('dragover'); }}
              onDragleave={(event) => { event.currentTarget.classList.window.remove('dragover'); }} onDrop={(event) => { window.handleFileDrop(event); }}
              onClick={(event) => { document.window.getElementById('file-input').window.click() }}>
              <div className="upload-icon">☁️</div>
              <p><strong>Drag & drop files here</strong></p>
              <p>or click to browse from your computer</p>
              <p style={{"marginTop":"0.5rem","fontSize":"0.72rem","color":"#94A3B8"}}>PDF, JPG, PNG, XLSX — Max 10 MB per file
              </p>
            </div>
            <input type="file" id="file-input" multiple accept=".pdf,.jpg,.jpeg,.png,.xlsx,.xls" style={{"display":"none"}}
              onChange={(event) => { window.handleFileSelect(event) }} />
            <input type="hidden" id="pending-doc-type" value="other" />

            {/*  Uploaded documents list  */}
            <div className="doc-list" id="doc-list">
              {/*  Populated dynamically  */}
            </div>

            {/*  Required documents checklist  */}
            <div
              style={{"marginTop":"1rem","background":"#F8FAFC","border":"1px solid var(--border-color)","borderRadius":"var(--radius-sm)","padding":"0.75rem"}}>
              <div style={{"fontSize":"0.8rem","fontWeight":"600","marginBottom":"0.5rem","color":"var(--primary-navy)"}}>📌
                Required Documents Checklist</div>
              <div style={{"display":"grid","gridTemplateColumns":"1fr 1fr","gap":"0.25rem"}}>
                <div className="checklist-item" id="chk-agent_client_agreement"><span className="check-icon">⬜</span> Agent & Client Agreement</div>
                <div className="checklist-item" id="chk-msa"><span className="check-icon">⬜</span> Master Service Agreement (MSA)</div>
                <div className="checklist-item" id="chk-pan_card"><span className="check-icon">⬜</span> Company PAN Card</div>
                <div className="checklist-item" id="chk-gst_cert"><span className="check-icon">⬜</span> GST Registration Certificate</div>
                <div className="checklist-item" id="chk-work_order"><span className="check-icon">⬜</span> Work Order / Purchase Order</div>
                <div className="checklist-item" id="chk-nda"><span className="check-icon">⬜</span> Non-Disclosure Agreement (NDA)</div>
                <div className="checklist-item" id="chk-tan_doc"><span className="check-icon">⬜</span> TAN Allotment Letter <span id="tan-doc-status" style={{"fontSize":"0.7rem","color":"var(--text-muted)"}}>(Optional)</span></div>
              </div>
            </div>
            </div>{/*  end step-section-6  */}

            <div className="form-step-section" id="step-section-7">
              {/*  ══ SECTION 7: Portal Access ══  */}
            <div className="section-header">
              <div className="section-icon">🔐</div>
              <h3>Client Portal Access</h3>
            </div>

            <div style={{"display":"flex","alignItems":"center","gap":"0.75rem","marginBottom":"1rem"}}>
              <label className="toggle-container">
                <input type="checkbox" className="toggle-input" id="portal-access" onChange={(event) => { window.togglePortalFields(this) }} />
                <span className="toggle-switch"></span>
              </label>
              <div>
                <strong style={{"fontSize":"0.875rem","display":"block"}}>Enable Client Self-Service Portal</strong>
                <span style={{"fontSize":"0.75rem","color":"var(--text-muted)"}}>Client can log in to view candidates,
                  timesheets, invoices, and raise requests.</span>
              </div>
            </div>

            <div id="portal-fields"
              style={{"display":"none","background":"#FAFBFC","border":"1px solid var(--border-color)","borderRadius":"var(--radius-md)","padding":"1rem"}}>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="portal-email">Portal Login Email</label>
                  <input type="email" id="portal-email" className="form-control" placeholder="admin@mahindra.com" />
                  <div className="field-hint">Invitation email will be sent to this address.</div>
                </div>
                <div className="form-group">
                  <label htmlFor="portal-access-level">Access Level</label>
                  <select id="portal-access-level" className="form-control" onChange={(event) => { window.handleAccessLevel(event.currentTarget.value) }}>
                    <option value="view_only">View Only (Read-only)</option>
                    <option value="approver" >Approver (Can approve attendance)</option>
                    <option value="full">Full Access (Manage candidates + invoices)</option>
                  </select>
                </div>
              </div>
              <div style={{"display":"flex","gap":"0.5rem","flexWrap":"wrap","marginBottom":"1rem"}}>
                <label style={{"display":"flex","alignItems":"center","gap":"0.4rem","fontSize":"0.8rem","cursor":"pointer"}}>
                  <input type="checkbox" id="portal-view-salary" defaultChecked={true} style={{"width":"14px","height":"14px"}} /> View Salary
                  Data
                </label>
                <label style={{"display":"flex","alignItems":"center","gap":"0.4rem","fontSize":"0.8rem","cursor":"pointer"}}>
                  <input type="checkbox" id="portal-view-invoices" defaultChecked={true} style={{"width":"14px","height":"14px"}} /> View
                  Invoices
                </label>
                <label style={{"display":"flex","alignItems":"center","gap":"0.4rem","fontSize":"0.8rem","cursor":"pointer"}}>
                  <input type="checkbox" id="portal-view-payslips" style={{"width":"14px","height":"14px"}} /> Download Payslips
                </label>
                <label style={{"display":"flex","alignItems":"center","gap":"0.4rem","fontSize":"0.8rem","cursor":"pointer"}}>
                  <input type="checkbox" id="portal-raise-requests" defaultChecked={true} style={{"width":"14px","height":"14px"}} /> Raise
                  Support Requests
                </label>
              </div>

              {/*  New Portal Fields  */}
              <div className="form-row" style={{"marginTop":"1rem","borderTop":"1px dashed var(--border-color)","paddingTop":"1rem"}}>
                <div className="form-group">
                  <label style={{"display":"block","marginBottom":"0.5rem"}}>Two-Factor Authentication (2FA)</label>
                  <div style={{"display":"flex","alignItems":"center","gap":"0.5rem","marginTop":"0.5rem"}}>
                    <label className="toggle-container" style={{"margin":"0"}}>
                      <input type="checkbox" className="toggle-input" id="portal-2fa" defaultChecked={true} />
                      <span className="toggle-switch"></span>
                    </label>
                    <span style={{"fontSize":"0.85rem"}}>Enforce 2FA for all client logins</span>
                  </div>
                </div>
                <div className="form-group">
                  <label htmlFor="session-timeout">Session Timeout (minutes)</label>
                  <input type="number" id="session-timeout" className="form-control" min="15" max="480" value="60" />
                  <div className="field-hint">User is logged out after this period of inactivity. Min: 15, Max: 480.</div>
                </div>
              </div>

              <div className="form-group" style={{"marginTop":"1rem"}}>
                <label htmlFor="ip-whitelist">IP Whitelist</label>
                <textarea id="ip-whitelist" className="form-control" rows="2" placeholder="e.g. 192.168.1.0/24, 10.0.0.1"></textarea>
                <div className="field-hint">Leave blank for no IP restriction. Separate multiple CIDRs with commas.</div>
              </div>

              <div className="form-group" style={{"marginTop":"1rem"}}>
                <label>Client Logo Upload (for Portal Branding)</label>
                <div className="doc-upload-zone" style={{"padding":"1.5rem"}} onClick={(event) => { document.window.getElementById('logo-file-input').window.click() }}>
                  <div className="upload-icon" style={{"fontSize":"1.5rem","marginBottom":"0.25rem"}}>🖼️</div>
                  <p style={{"fontWeight":"600"}}>Click to upload logo</p>
                  <p style={{"fontSize":"0.72rem","color":"var(--text-muted)"}}>PNG, JPG, SVG — Max 2MB</p>
                  <div className="field-hint" id="logo-upload-hint" style={{"marginTop":"0.25rem"}}>No logo </div>
                </div>
                <input type="file" id="logo-file-input" style={{"display":"none"}} accept="image/png, image/jpeg, image/svg+xml" onChange={(event) => { window.handleLogoSelect(this) }} />
              </div>
            </div>
            </div>{/*  end step-section-7  */}

            <div className="form-step-section" id="step-section-8">
              {/*  ══ SECTION 8: SLA & Payroll Calendar ══  */}
            <div className="section-header">
              <div className="section-icon">📅</div>
              <h3>SLA & Payroll Calendar</h3>
            </div>

            <div className="info-box" style={{"marginBottom":"1rem"}}>
              📆 Define the payroll processing timeline for this client. These dates drive automated reminders and
              lock-outs.
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="attendance-cutoff">Attendance Cut-off Day (of month)</label>
                <select id="attendance-cutoff" className="form-control">
                  <option value="25">25th of month</option>
                  <option value="26">26th of month</option>
                  <option value="27">27th of month</option>
                  <option value="28" >28th of month</option>
                  <option value="eom">Last day of month</option>
                </select>
                <div className="field-hint">Attendance submitted after this date will be counted in next month.</div>
              </div>
              <div className="form-group">
                <label htmlFor="payroll-lock-day">Payroll Lock / Processing Day</label>
                <select id="payroll-lock-day" className="form-control">
                  <option value="1">1st of next month</option>
                  <option value="2">2nd of next month</option>
                  <option value="3" >3rd of next month</option>
                  <option value="4">4th of next month</option>
                  <option value="5">5th of next month</option>
                </select>
                <div className="field-hint">Payroll is locked and finalized by this date.</div>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="salary-credit-day">Salary Credit Day</label>
                <select id="salary-credit-day" className="form-control">
                  <option value="1">1st of month</option>
                  <option value="5">5th of month</option>
                  <option value="7" >7th of month</option>
                  <option value="10">10th of month</option>
                  <option value="eom">Last working day</option>
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="invoice-dispute-days">Invoice Dispute Window (days)</label>
                <input type="number" id="invoice-dispute-days" className="form-control" placeholder="e.g. 7" value="7"
                  min="1" max="30" />
                <div className="field-hint">Days client can raise a dispute after invoice is raised.</div>
              </div>
            </div>

            <div className="form-row" style={{"marginTop":"1rem"}}>
              <div className="form-group">
                <label htmlFor="invoice-raise-day">Invoice Raise Day <span style={{"color":"var(--status-danger)"}}>*</span></label>
                <select id="invoice-raise-day" className="form-control" onChange={(event) => { window.updateInvoiceDuePreview() }}>
                  <option value="Same as Payroll Lock Day">Same as Payroll Lock Day</option>
                  <option value="+1 Day">+1 Day</option>
                  <option value="+2 Days">+2 Days</option>
                  <option value="+3 Days">+3 Days</option>
                </select>
                <div className="field-hint">Invoice is generated this many days after payroll is locked.</div>
              </div>
              <div className="form-group">
                <label htmlFor="payroll-month-convention">Payroll Month Convention</label>
                <select id="payroll-month-convention" className="form-control" onChange={(event) => { window.handlePayrollConvention(event.currentTarget.value) }}>
                  <option value="calendar" >Calendar Month (1st–last day)</option>
                  <option value="custom">Custom Cycle</option>
                </select>
              </div>
            </div>

            <div className="form-row" id="custom-cycle-row" style={{"display":"none","marginTop":"1rem"}}>
              <div className="form-group">
                <label htmlFor="cycle-start-day">Cycle Start Day</label>
                <input type="number" id="cycle-start-day" className="form-control" min="1" max="28" value="1" />
              </div>
              <div className="form-group">
                <label htmlFor="cycle-end-day">Cycle End Day</label>
                <input type="number" id="cycle-end-day" className="form-control" min="1" max="28" value="28" />
              </div>
            </div>

            <div className="form-row" style={{"marginTop":"1rem"}}>
              <div className="form-group">
                <label htmlFor="account-manager">Assigned Account Manager (Internal)</label>
                <select id="account-manager" className="form-control" onChange={(event) => { window.updateBackupAMOptions(event.currentTarget.value) }}>
                  <option value="">-- Assign Account Manager --</option>
                  <option value="sunita">Sunita Verma</option>
                  <option value="rahul">Rahul Desai</option>
                  <option value="priya">Priya Kapoor</option>
                  <option value="amit">Amit Singh</option>
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="backup-account-manager">Backup Account Manager</label>
                <select id="backup-account-manager" className="form-control">
                  <option value="">-- Select Backup AM --</option>
                  <option value="sunita">Sunita Verma</option>
                  <option value="rahul">Rahul Desai</option>
                  <option value="priya">Priya Kapoor</option>
                  <option value="amit">Amit Singh</option>
                </select>
                <div className="field-hint">Backup CC'd on communications when primary AM is unavailable.</div>
              </div>
            </div>

            <div className="form-row" style={{"marginTop":"1rem","alignItems":"center"}}>
              <div className="form-group" style={{"marginBottom":"0"}}>
                <label style={{"display":"block","marginBottom":"0.5rem"}}>Auto-Reminder Schedule</label>
                <div style={{"display":"flex","alignItems":"center","gap":"0.5rem"}}>
                  <label className="toggle-container" style={{"margin":"0"}}>
                    <input type="checkbox" className="toggle-input" id="auto-reminders" defaultChecked={true} onChange={(event) => { window.toggleReminderInfo(this) }} />
                    <span className="toggle-switch"></span>
                  </label>
                  <span style={{"fontSize":"0.85rem"}}>Enable Automated Email Alerts</span>
                </div>
              </div>
            </div>

            <div className="info-box" id="reminder-info-box" style={{"marginTop":"1rem","background":"#FFFBF0","borderColor":"var(--accent-gold)"}}>
              ℹ️ <strong>System will auto-send:</strong> Attendance reminder 3 days before cut-off | Invoice reminder 2 days before due date | Overdue alert on Day 1, 7, 15 after due date
            </div>

            <div className="suggestion-chip" id="invoice-due-preview" style={{"marginTop":"1rem","display":"block","padding":"0.5rem 0.75rem","background":"#F0FDF4","border":"1px solid #BBF7D0","borderRadius":"var(--radius-sm)","fontSize":"0.8rem","color":"#166534"}}>
              Preview: Invoice raised on 3rd of month → Due on 18th (Net 15 days)
            </div>

            <div className="form-group">
              <label htmlFor="client-notes">Internal Notes / Special Instructions</label>
              <textarea id="client-notes" className="form-control" rows="3"
                placeholder="e.g. Client requires separate salary breakup for contract vs permanent staff. Invoice to be sent in both PDF and XLSX format."></textarea>
            </div>
            </div>{/*  end step-section-8  */}

            {/*  ══ FORM ACTIONS ══  */}
            <div
              style={{"display":"flex","gap":"0.75rem","justifyContent":"flex-end","alignItems":"center","marginTop":"2.5rem","paddingTop":"1.5rem","borderTop":"2px solid var(--border-color)"}}>
              <span id="autosave-indicator" style={{"fontSize":"0.75rem","color":"var(--text-muted)","marginRight":"auto","transition":"opacity 0.5s","opacity":"0"}}></span>
              <a href="/clients" className="btn btn-secondary" style={{"marginRight":"auto"}}>Cancel</a>
              <button type="button" className="btn btn-secondary" onClick={(event) => { window.saveDraft() }}>💾 Save as Draft</button>
              <button type="button" className="btn btn-secondary" id="btn-prev-step" onClick={(event) => { window.prevStep() }}>← Previous Step</button>
              <button type="button" className="btn btn-primary" id="btn-next-step" onClick={(event) => { window.nextStep() }}>Next Step →</button>
              <button type="button" className="btn btn-primary" id="btn-submit-form" onClick={(event) => { window.submitForm() }} style={{"display":"none"}}>✅ Save & Activate Client</button>
            </div>

          </form>
        </div>

        {/*  ═══════════════ SIDEBAR ═══════════════  */}
        <div style={{"display":"flex","flexDirection":"column","gap":"1.25rem"}}>

          {/*  Onboarding Completion Checklist  */}
          <div className="card">
            <h4 style={{"marginBottom":"1rem","fontSize":"0.95rem"}}>📋 Onboarding Checklist</h4>
            <div id="onboarding-checklist" style={{"display":"flex","flexDirection":"column","gap":"0.25rem"}}>
              <div className="checklist-item" id="ob-identity" onClick={(event) => { window.goToStep(1) }} style={{"cursor":"pointer"}}><span className="check-icon">⬜</span> Company Identity</div>
              <div className="checklist-item" id="ob-address" onClick={(event) => { window.goToStep(2) }} style={{"cursor":"pointer"}}><span className="check-icon">⬜</span> Address Details</div>
              <div className="checklist-item" id="ob-contacts" onClick={(event) => { window.goToStep(3) }} style={{"cursor":"pointer"}}><span className="check-icon">⬜</span> Contact Persons</div>
              <div className="checklist-item" id="ob-contract" onClick={(event) => { window.goToStep(4) }} style={{"cursor":"pointer"}}><span className="check-icon">⬜</span> Contract & Billing</div>
              <div className="checklist-item" id="ob-statutory" onClick={(event) => { window.goToStep(5) }} style={{"cursor":"pointer"}}><span className="check-icon">⬜</span> Statutory Config</div>
              <div className="checklist-item" id="ob-documents" onClick={(event) => { window.goToStep(6) }} style={{"cursor":"pointer"}}><span className="check-icon">⬜</span> Key Documents</div>
              <div className="checklist-item" id="ob-portal" onClick={(event) => { window.goToStep(7) }} style={{"cursor":"pointer"}}><span className="check-icon">⬜</span> Portal & Access</div>
              <div className="checklist-item" id="ob-sla" onClick={(event) => { window.goToStep(8) }} style={{"cursor":"pointer"}}><span className="check-icon">⬜</span> SLA & Calendar</div>
            </div>
            <div style={{"marginTop":"1rem"}}>
              <div style={{"fontSize":"0.75rem","color":"var(--text-muted)","marginBottom":"0.35rem"}}>Completion Progress</div>
              <div style={{"background":"#E2E8F0","borderRadius":"50px","height":"8px","overflow":"hidden"}}>
                <div id="progress-bar"
                  style={{"height":"100%","width":"0%","background":"var(--accent-gold)","transition":"width 0.4s","borderRadius":"50px"}}>
                </div>
              </div>
              <div id="progress-label" style={{"fontSize":"0.75rem","color":"var(--text-muted)","marginTop":"0.3rem"}}>0%
                complete</div>
            </div>
          </div>

          {/*  Statutory Rule Note  */}
          <div className="card" style={{"background":"var(--primary-navy)","color":"white"}}>
            <h4 style={{"color":"white","marginBottom":"0.75rem"}}>⚖️ Statutory Inheritance</h4>
            <p style={{"fontSize":"0.78rem","opacity":"0.9","lineHeight":"1.6"}}>
              All statutory defaults you set here are <strong style={{"color":"#FDD835"}}>automatically inherited</strong> by
              every new candidate onboarded under this client.
              Individual candidates can still be overridden on their profile page.
            </p>
          </div>

          {/*  Document Guidelines  */}
          <div className="card">
            <h4 style={{"marginBottom":"0.75rem","fontSize":"0.95rem"}}>📎 Document Guidelines</h4>
            <div style={{"display":"flex","flexDirection":"column","gap":"0.5rem","fontSize":"0.78rem","color":"var(--text-muted)"}}>
              <div>📜 <strong>MSA</strong> — Governs entire engagement. Mandatory before first invoice.</div>
              <div>🔒 <strong>NDA</strong> — Required before sharing candidate data.</div>
              <div>📋 <strong>Work Order</strong> — Scope of each deployment. Renew annually.</div>
              <div>🏛️ <strong>GST Certificate</strong> — Required for GST-compliant invoicing.</div>
              <div>💳 <strong>PAN Card</strong> — Required for TDS compliance.</div>
            </div>
          </div>

          {/*  Quick Stats  */}
          <div className="card" style={{"background":"#F0FDF4","border":"1px solid #86EFAC"}}>
            <h4 style={{"marginBottom":"0.75rem","fontSize":"0.9rem","color":"#166534"}}>💡 Billing Model Guide</h4>
            <div style={{"fontSize":"0.78rem","color":"#14532D","lineHeight":"1.7"}}>
              <div><strong>CTC + Markup:</strong> You bill CTC × (1 + markup%). Best for agency model.</div>
              <div><strong>Fixed/Candidate:</strong> Flat fee per head per month. Predictable for client.</div>
              <div><strong>Monthly Retainer:</strong> Flat monthly fee regardless of headcount. Best for managed
                services.</div>
              <div><strong>Hourly:</strong> Bill per hour worked. Common for consulting engagements.</div>
            </div>
          </div>

        </div>
      </div>
    


  {/*  ══ Toast Notification ══  */}
  <div id="toast" style={{"position":"fixed","bottom":"1.5rem","right":"1.5rem","background":"var(--primary-navy)","color":"white","padding":"0.75rem 1.25rem","borderRadius":"var(--radius-md)","fontSize":"0.875rem","fontWeight":"500","boxShadow":"var(--shadow-lg)","transform":"translateY(100px)","opacity":"0","transition":"all 0.3s","zIndex":"9999"}}>✅ Changes saved!</div>

  
            </div>
        </AuthenticatedLayout>
    </RoleGuard>
    );
}
