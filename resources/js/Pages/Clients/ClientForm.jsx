import React, { useEffect, useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import RoleGuard from '../../Components/RoleGuard.jsx';
import './ClientForm.css';

import useClientForm from './hooks/useClientForm';
import Toast from './components/Toast';
import FormProgress from './components/FormProgress';
import OnboardingSidebar from './components/OnboardingSidebar';

import IdentitySection from './sections/IdentitySection';
import AddressSection from './sections/AddressSection';
import ContactsSection from './sections/ContactsSection';
import ContractSection from './sections/ContractSection';
import StatutorySection from './sections/StatutorySection';
import DocumentsSection from './sections/DocumentsSection';
import PortalSection from './sections/PortalSection';
import SlaSection from './sections/SlaSection';

export default function ClientForm() {
  const hook = useClientForm();
  const {
    formData, errors, hints, currentStep,
    sectionProgress, completionPct, completionCount, uploadedDocs,
    isSubmitting, submitSuccess,
    handleInputChange: handleChange, handlePocChange, handlePocPrefChange,
    goToStep, nextStep, prevStep,
    saveDraft, submitForm
  } = hook;

  // Auto-save visual indicator
  const [lastSaved, setLastSaved] = useState(null);
  useEffect(() => {
    const timer = setInterval(() => {
      saveDraft(false); // silent save
      setLastSaved(new Date().toLocaleTimeString());
    }, 60000); // auto save every 1 min
    return () => clearInterval(timer);
  }, [saveDraft]);

  return (
    <RoleGuard allowedRoles={['admin', 'manager']}>
      <AuthenticatedLayout>
        <Head title="Add / Edit Client — Tecla Payroll" />
        
        <div className="legacy-react-wrapper">
          {/* Page Header */}
          <div style={{ marginBottom: '1.5rem' }}>
            <Link href="/clients" style={{ fontSize: '0.85rem', fontWeight: 600 }}>← Back to Clients Directory</Link>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: '0.5rem' }}>
              <div>
                <h2 style={{ marginBottom: '0.2rem' }}>Add New Client</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                  Complete all sections for full compliance. Fields marked <span style={{ color: 'var(--status-danger)' }}>*</span> are mandatory.
                </p>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                {lastSaved && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Auto-saved at {lastSaved}</span>}
                <button type="button" className="btn btn-secondary" onClick={() => saveDraft(true)}>💾 Save Draft</button>
                <button type="button" className="btn btn-primary" onClick={submitForm} disabled={isSubmitting}>
                  {isSubmitting ? 'Saving...' : '✅ Save & Activate Client'}
                </button>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <FormProgress currentStep={currentStep} sectionProgress={sectionProgress} />

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
                  <Link href="/clients" className="btn btn-secondary" style={{ marginRight: 'auto' }}>Cancel</Link>
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

            {/* ═══════════════ SIDEBAR ═══════════════ */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <OnboardingSidebar
                currentStep={currentStep}
                sectionProgress={sectionProgress}
                completionPct={completionPct}
                completionCount={completionCount}
                uploadedDocs={uploadedDocs}
              />
              
              <div className="card" style={{ background: 'var(--primary-navy)', color: 'white' }}>
                <h4 style={{ color: 'white', marginBottom: '0.75rem' }}>⚖️ Statutory Inheritance</h4>
                <p style={{ fontSize: '0.78rem', opacity: '0.9', lineHeight: '1.6' }}>
                  All statutory defaults you set here are <strong style={{ color: '#FDD835' }}>automatically inherited</strong> by
                  every new candidate onboarded under this client. Individual candidates can still be overridden on their profile page.
                </p>
              </div>
            </div>
          </div>

          <Toast message={submitSuccess || ''} />
        </div>
      </AuthenticatedLayout>
    </RoleGuard>
  );
}