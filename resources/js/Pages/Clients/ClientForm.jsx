import React, { useEffect, useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import RoleGuard from '../../Components/RoleGuard.jsx';
import './ClientForm.css';

import useClientForm from './hooks/useClientForm';
import Toast from './components/Toast';
import FormProgress from './components/FormProgress';

import IdentitySection from './sections/IdentitySection';
import AddressSection from './sections/AddressSection';
import ContactsSection from './sections/ContactsSection';
import ContractSection from './sections/ContractSection';
import StatutorySection from './sections/StatutorySection';
import DocumentsSection from './sections/DocumentsSection';
import PortalSection from './sections/PortalSection';
import SlaSection from './sections/SlaSection';

export default function ClientForm({ client, defaultLopBasis }) {
  const hook = useClientForm(defaultLopBasis, client);
  const {
    formData, errors, hints, currentStep,
    sectionProgress, completionPct, completionCount, uploadedDocs,
    isSubmitting, submitSuccess,
    handleInputChange: handleChange, handlePocChange, handlePocPrefChange,
    goToStep, nextStep, prevStep,
    saveDraft, submitForm, loadClientData
  } = hook;

  useEffect(() => {
    if (client) {
      loadClientData(client);
    }
  }, [client, loadClientData]);

  return (
    <RoleGuard allowedRoles={['admin', 'manager']}>
      <AuthenticatedLayout>
        <Head title="Add / Edit Client — Tecla Payroll" />
        
        <div className="legacy-react-wrapper">
          {/* Page Header */}
          <div style={{ marginBottom: '1.5rem' }}>
            <Link href={route('clients.index')} style={{ fontSize: '0.85rem', fontWeight: 600 }}>← Back to Clients Directory</Link>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: '0.5rem' }}>
              <div>
                <h2 style={{ marginBottom: '0.2rem' }}>{client ? 'Edit Client' : 'Add New Client'}</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                  Complete all sections for full compliance. Fields marked <span style={{ color: 'var(--status-danger)' }}>*</span> are mandatory.
                </p>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <button type="button" className="btn btn-secondary" onClick={() => saveDraft(false)}>💾 Save Draft</button>
                <button type="button" className="btn btn-primary" onClick={submitForm} disabled={isSubmitting}>
                  {isSubmitting ? 'Saving...' : '✅ Save & Activate Client'}
                </button>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <FormProgress currentStep={currentStep} sectionProgress={sectionProgress} onTabClick={goToStep} />

          <div className="grid-layout">
            {/* ═══════════════ MAIN FORM ═══════════════ */}
            <div className="card">
              <form onSubmit={e => e.preventDefault()}>
                <div className={`form-step-section ${currentStep === 1 ? 'active' : ''}`} style={{ display: currentStep === 1 ? 'block' : 'none' }}>
                  <IdentitySection formData={formData} errors={errors} hints={hints} onChange={handleChange} hook={hook} />
                </div>
                
                <div className={`form-step-section ${currentStep === 2 ? 'active' : ''}`} style={{ display: currentStep === 2 ? 'block' : 'none' }}>
                  <AddressSection formData={formData} errors={errors} onChange={handleChange} hook={hook} />
                </div>
                
                <div className={`form-step-section ${currentStep === 3 ? 'active' : ''}`} style={{ display: currentStep === 3 ? 'block' : 'none' }}>
                  <ContactsSection formData={formData} errors={errors} onChange={handleChange} onPocChange={handlePocChange} onPocPrefChange={handlePocPrefChange} hook={hook} />
                </div>
                
                <div className={`form-step-section ${currentStep === 4 ? 'active' : ''}`} style={{ display: currentStep === 4 ? 'block' : 'none' }}>
                  <ContractSection formData={formData} errors={errors} onChange={handleChange} hook={hook} />
                </div>
                
                <div className={`form-step-section ${currentStep === 5 ? 'active' : ''}`} style={{ display: currentStep === 5 ? 'block' : 'none' }}>
                  <StatutorySection formData={formData} onChange={handleChange} hook={hook} />
                </div>
                
                <div className={`form-step-section ${currentStep === 6 ? 'active' : ''}`} style={{ display: currentStep === 6 ? 'block' : 'none' }}>
                  <DocumentsSection formData={formData} hook={hook} />
                </div>
                
                <div className={`form-step-section ${currentStep === 7 ? 'active' : ''}`} style={{ display: currentStep === 7 ? 'block' : 'none' }}>
                  <PortalSection formData={formData} onChange={handleChange} hook={hook} />
                </div>
                
                <div className={`form-step-section ${currentStep === 8 ? 'active' : ''}`} style={{ display: currentStep === 8 ? 'block' : 'none' }}>
                  <SlaSection formData={formData} errors={errors} onChange={handleChange} hook={hook} />
                </div>

                {/* FORM ACTIONS */}
                <div style={{
                  display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', alignItems: 'center',
                  marginTop: '2.5rem', paddingTop: '1.5rem', borderTop: '2px solid var(--border-color)'
                }}>
                  <Link href={route('clients.index')} className="btn btn-secondary" style={{ marginRight: 'auto' }}>Cancel</Link>
                  <button type="button" className="btn btn-secondary" onClick={() => saveDraft(true)}>💾 Save as Draft</button>
                  
                  {currentStep > 1 && (
                    <button type="button" className="btn btn-secondary" onClick={prevStep}>← Previous Step</button>
                  )}
                  
                  {currentStep < 8 ? (
                    <button type="button" className="btn btn-primary" onClick={nextStep}>Next Step →</button>
                  ) : (
                    <button type="button" className="btn btn-primary" onClick={submitForm} disabled={isSubmitting}>
                      {isSubmitting ? 'Saving...' : '✅ Save & Activate Client'}
                    </button>
                  )}
                </div>
              </form>
            </div>

            {/* ═══════════════ SIDEBAR HELPER CARDS ═══════════════ */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              {currentStep === 1 && (
                <>
                  <div className="card" style={{ background: '#F0F9FF', border: '1px solid #BAE6FD' }}>
                    <h4 style={{ marginBottom: '0.75rem', fontSize: '0.9rem', color: '#0369A1' }}>🏢 Legal Identity & KYC</h4>
                    <p style={{ fontSize: '0.78rem', color: '#0C4A6E', margin: 0, lineHeight: '1.6' }}>Ensure the company name matches exactly as per MCA/Govt records to avoid compliance mismatches later.</p>
                  </div>
                  <div className="card" style={{ background: '#F0F9FF', border: '1px solid #BAE6FD' }}>
                    <h4 style={{ marginBottom: '0.75rem', fontSize: '0.9rem', color: '#0369A1' }}>🧾 Tax Registration</h4>
                    <p style={{ fontSize: '0.78rem', color: '#0C4A6E', margin: 0, lineHeight: '1.6' }}>GSTIN and PAN are cross-verified. Ensure the PAN characters match the corresponding GSTIN characters.</p>
                  </div>
                  <div className="card" style={{ background: '#F0F9FF', border: '1px solid #BAE6FD' }}>
                    <h4 style={{ marginBottom: '0.75rem', fontSize: '0.9rem', color: '#0369A1' }}>🔢 Identification Numbers</h4>
                    <p style={{ fontSize: '0.78rem', color: '#0C4A6E', margin: 0, lineHeight: '1.6' }}>TAN is strictly required for clients where TDS deduction filing is applicable on agency invoices.</p>
                  </div>
                </>
              )}

              {currentStep === 2 && (
                <>
                  <div className="card" style={{ background: '#F0FDF4', border: '1px solid #86EFAC' }}>
                    <h4 style={{ marginBottom: '0.75rem', fontSize: '0.9rem', color: '#166534' }}>📍 Registered vs Billing Address</h4>
                    <p style={{ fontSize: '0.78rem', color: '#14532D', margin: 0, lineHeight: '1.6' }}>The registered address must match the MCA records. Billing address determines GST state codes for invoicing.</p>
                  </div>
                  <div className="card" style={{ background: '#F0FDF4', border: '1px solid #86EFAC' }}>
                    <h4 style={{ marginBottom: '0.75rem', fontSize: '0.9rem', color: '#166534' }}>🏢 Branch Offices</h4>
                    <p style={{ fontSize: '0.78rem', color: '#14532D', margin: 0, lineHeight: '1.6' }}>Add multiple branches if you need to raise separate invoices or apply different state compliances for this client.</p>
                  </div>
                  <div className="card" style={{ background: '#F0FDF4', border: '1px solid #86EFAC' }}>
                    <h4 style={{ marginBottom: '0.75rem', fontSize: '0.9rem', color: '#166534' }}>⚡ PIN Code Auto-fill</h4>
                    <p style={{ fontSize: '0.78rem', color: '#14532D', margin: 0, lineHeight: '1.6' }}>Entering a valid 6-digit PIN code will automatically fetch and populate the associated City and State.</p>
                  </div>
                </>
              )}

              {currentStep === 3 && (
                <>
                  <div className="card" style={{ background: '#FEF2F2', border: '1px solid #FECACA' }}>
                    <h4 style={{ marginBottom: '0.75rem', fontSize: '0.9rem', color: '#991B1B' }}>👤 Primary POC</h4>
                    <p style={{ fontSize: '0.78rem', color: '#7F1D1D', margin: 0, lineHeight: '1.6' }}>The Primary POC acts as the main escalation contact for all overall engagements and contract renewals.</p>
                  </div>
                  <div className="card" style={{ background: '#FEF2F2', border: '1px solid #FECACA' }}>
                    <h4 style={{ marginBottom: '0.75rem', fontSize: '0.9rem', color: '#991B1B' }}>👔 Operational vs Billing</h4>
                    <p style={{ fontSize: '0.78rem', color: '#7F1D1D', margin: 0, lineHeight: '1.6' }}>Assign separate contacts for operations and billing to ensure invoices and daily updates reach the right teams.</p>
                  </div>
                  <div className="card" style={{ background: '#FEF2F2', border: '1px solid #FECACA' }}>
                    <h4 style={{ marginBottom: '0.75rem', fontSize: '0.9rem', color: '#991B1B' }}>📱 Communication Preferences</h4>
                    <p style={{ fontSize: '0.78rem', color: '#7F1D1D', margin: 0, lineHeight: '1.6' }}>Toggle Email, SMS, or WhatsApp preferences to dictate how automated alerts are routed to each contact.</p>
                  </div>
                </>
              )}

              {currentStep === 4 && (
                <>
                  <div className="card" style={{ background: '#FDF4FF', border: '1px solid #F5D0FE' }}>
                    <h4 style={{ marginBottom: '0.75rem', fontSize: '0.9rem', color: '#86198F' }}>💡 Billing Model Guide</h4>
                    <div style={{ fontSize: '0.78rem', color: '#701A75', lineHeight: '1.7' }}>
                      <div><strong>CTC + Markup:</strong> You bill CTC × (1 + markup%). Best for agency model.</div>
                      <div><strong>Fixed/Candidate:</strong> Flat fee per head per month. Predictable for client.</div>
                      <div><strong>Monthly Retainer:</strong> Flat monthly fee regardless of headcount.</div>
                      <div><strong>Hourly:</strong> Bill per hour worked. Common for consulting engagements.</div>
                    </div>
                  </div>
                  <div className="card" style={{ background: '#FDF4FF', border: '1px solid #F5D0FE' }}>
                    <h4 style={{ marginBottom: '0.75rem', fontSize: '0.9rem', color: '#86198F' }}>📅 Invoice & Payment Terms</h4>
                    <p style={{ fontSize: '0.78rem', color: '#701A75', margin: 0, lineHeight: '1.6' }}>Set the correct invoicing cycle and Net Terms to accurately generate alerts for outstanding dues.</p>
                  </div>
                  <div className="card" style={{ background: '#FDF4FF', border: '1px solid #F5D0FE' }}>
                    <h4 style={{ marginBottom: '0.75rem', fontSize: '0.9rem', color: '#86198F' }}>🧾 Taxation & RCM</h4>
                    <p style={{ fontSize: '0.78rem', color: '#701A75', margin: 0, lineHeight: '1.6' }}>Configure RCM if the client is liable to pay GST directly, and define TDS applicability on your agency invoices.</p>
                  </div>
                </>
              )}

              {currentStep === 5 && (
                <>
                  <div className="card" style={{ background: 'var(--primary-navy)', color: 'white' }}>
                    <h4 style={{ color: 'white', marginBottom: '0.75rem' }}>⚖️ Statutory Inheritance</h4>
                    <p style={{ fontSize: '0.78rem', opacity: '0.9', lineHeight: '1.6', margin: 0 }}>
                      All statutory defaults you set here are <strong style={{ color: '#FDD835' }}>automatically inherited</strong> by
                      every new candidate onboarded under this client.
                    </p>
                  </div>
                  <div className="card" style={{ background: '#F1F5F9', border: '1px solid #CBD5E1' }}>
                    <h4 style={{ marginBottom: '0.75rem', fontSize: '0.9rem', color: '#334155' }}>💰 PF & ESI Ceilings</h4>
                    <p style={{ fontSize: '0.78rem', color: '#475569', margin: 0, lineHeight: '1.6' }}>Standard PF statutory wage ceiling is ₹15,000 and ESIC limit is ₹21,000. Voluntary contributions will ignore these limits.</p>
                  </div>
                  <div className="card" style={{ background: '#F1F5F9', border: '1px solid #CBD5E1' }}>
                    <h4 style={{ marginBottom: '0.75rem', fontSize: '0.9rem', color: '#334155' }}>📋 Additional Compliance</h4>
                    <p style={{ fontSize: '0.78rem', color: '#475569', margin: 0, lineHeight: '1.6' }}>Configure Professional Tax (PT), Labour Welfare Fund (LWF), and statutory bonus structures to ensure accurate payroll.</p>
                  </div>
                </>
              )}

              {currentStep === 6 && (
                <>
                  <div className="card" style={{ background: '#FFF7ED', border: '1px solid #FDBA74' }}>
                    <h4 style={{ marginBottom: '0.75rem', fontSize: '0.9rem', color: '#9A3412' }}>📚 Document Guidelines</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.78rem', color: '#9A3412' }}>
                      <div>📜 <strong>MSA</strong> — Governs entire engagement. Mandatory before first invoice.</div>
                      <div>🔒 <strong>NDA</strong> — Required before sharing candidate data.</div>
                      <div>📋 <strong>Work Order</strong> — Scope of each deployment. Renew annually.</div>
                    </div>
                  </div>
                  <div className="card" style={{ background: '#FFF7ED', border: '1px solid #FDBA74' }}>
                    <h4 style={{ marginBottom: '0.75rem', fontSize: '0.9rem', color: '#9A3412' }}>📁 Upload Limits</h4>
                    <p style={{ fontSize: '0.78rem', color: '#9A3412', margin: 0, lineHeight: '1.6' }}>Supported formats include PDF, JPG, PNG, and XLSX. Maximum file size allowed is 10 MB per document.</p>
                  </div>
                  <div className="card" style={{ background: '#FFF7ED', border: '1px solid #FDBA74' }}>
                    <h4 style={{ marginBottom: '0.75rem', fontSize: '0.9rem', color: '#9A3412' }}>✔️ Verification Process</h4>
                    <p style={{ fontSize: '0.78rem', color: '#9A3412', margin: 0, lineHeight: '1.6' }}>Uploaded documents remain in 'Pending' state until manually reviewed and marked as 'Verified' by an authorized admin.</p>
                  </div>
                </>
              )}

              {currentStep === 7 && (
                <>
                  <div className="card" style={{ background: '#F5F3FF', border: '1px solid #C4B5FD' }}>
                    <h4 style={{ marginBottom: '0.75rem', fontSize: '0.9rem', color: '#5B21B6' }}>💻 Client Portal Capabilities</h4>
                    <p style={{ fontSize: '0.78rem', color: '#4C1D95', margin: 0, lineHeight: '1.6' }}>Providing portal access allows the client to securely view invoices, track candidate statuses, and download payslips.</p>
                  </div>
                  <div className="card" style={{ background: '#F5F3FF', border: '1px solid #C4B5FD' }}>
                    <h4 style={{ marginBottom: '0.75rem', fontSize: '0.9rem', color: '#5B21B6' }}>🔐 Access Security</h4>
                    <p style={{ fontSize: '0.78rem', color: '#4C1D95', margin: 0, lineHeight: '1.6' }}>For higher security, enforce Two-Factor Authentication (2FA) and strict session timeouts for the client portal.</p>
                  </div>
                  <div className="card" style={{ background: '#F5F3FF', border: '1px solid #C4B5FD' }}>
                    <h4 style={{ marginBottom: '0.75rem', fontSize: '0.9rem', color: '#5B21B6' }}>⚙️ Module Permissions</h4>
                    <p style={{ fontSize: '0.78rem', color: '#4C1D95', margin: 0, lineHeight: '1.6' }}>Granular permissions give you control over whether the client can view sensitive data like salary components or raise support requests.</p>
                  </div>
                </>
              )}

              {currentStep === 8 && (
                <>
                  <div className="card" style={{ background: '#ECFEFF', border: '1px solid #67E8F9' }}>
                    <h4 style={{ marginBottom: '0.75rem', fontSize: '0.9rem', color: '#155E75' }}>📅 Payroll Calendar</h4>
                    <p style={{ fontSize: '0.78rem', color: '#164E63', margin: 0, lineHeight: '1.6' }}>Define specific days for attendance cutoff, payroll locking, invoice generation, and final salary credits to maintain SLA targets.</p>
                  </div>
                  <div className="card" style={{ background: '#ECFEFF', border: '1px solid #67E8F9' }}>
                    <h4 style={{ marginBottom: '0.75rem', fontSize: '0.9rem', color: '#155E75' }}>🤝 Account Management</h4>
                    <p style={{ fontSize: '0.78rem', color: '#164E63', margin: 0, lineHeight: '1.6' }}>Assign dedicated Primary and Backup Account Managers so the client always has a clear point of contact.</p>
                  </div>
                  <div className="card" style={{ background: '#ECFEFF', border: '1px solid #67E8F9' }}>
                    <h4 style={{ marginBottom: '0.75rem', fontSize: '0.9rem', color: '#155E75' }}>⭐ SLA Tiers</h4>
                    <p style={{ fontSize: '0.78rem', color: '#164E63', margin: 0, lineHeight: '1.6' }}>Premium SLA tiers guarantee faster response times and dedicated dispute resolution windows for high-value clients.</p>
                  </div>
                </>
              )}

            </div>
          </div>

          <Toast message={submitSuccess || ''} />
        </div>
      </AuthenticatedLayout>
    </RoleGuard>
  );
}