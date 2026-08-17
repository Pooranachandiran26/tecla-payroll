import React, { useEffect } from 'react';
import { Head, Link } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import RoleGuard from '../../Components/RoleGuard.jsx';
import './ClientForm.css';

import useClientForm from './hooks/useClientForm';
import Toast from './components/Toast';
import FormProgress from './components/FormProgress';
import OnboardingSectionNav from './components/OnboardingSectionNav';

import IdentitySection from './sections/IdentitySection';
import AddressSection from './sections/AddressSection';
import ContactsSection from './sections/ContactsSection';
import ContractSection from './sections/ContractSection';
import StatutorySection from './sections/StatutorySection';
import DocumentsSection from './sections/DocumentsSection';
import PortalSection from './sections/PortalSection';
import SlaSection from './sections/SlaSection';

import {
  ArrowLeft,
  ArrowRight,
  Save,
  CheckCircle2,
  Trash2,
  RotateCcw,
  Building2,
  MapPin,
  Users,
  FileText,
  ShieldCheck,
  FolderOpen,
  Globe,
  Clock,
  Palette,
  Check
} from 'lucide-react';

const STEP_HEADER_META = {
  1: { icon: Building2, title: 'Identity', desc: 'Company details & registration' },
  2: { icon: MapPin, title: 'Address', desc: 'Locations & addresses' },
  3: { icon: Users, title: 'Contacts', desc: 'Primary contacts' },
  4: { icon: FileText, title: 'Contract', desc: 'Terms & billing' },
  5: { icon: ShieldCheck, title: 'Statutory', desc: 'Compliance details' },
  6: { icon: FolderOpen, title: 'Documents', desc: 'Upload documents' },
  7: { icon: Globe, title: 'Portal', desc: 'Portal access & users' },
  8: { icon: Clock, title: 'SLA', desc: 'Service level agreement' },
};

const INHOUSE_STEP_HEADER_META = {
  ...STEP_HEADER_META,
  4: { icon: FileText, title: 'Payroll', desc: 'Internal payroll settings' },
  7: { icon: Palette, title: 'Branding', desc: 'Payslip logo & colors' },
  8: { icon: Clock, title: 'Calendar', desc: 'Payroll processing dates' },
};

export default function ClientForm({ client, defaultLopBasis, gstSettings }) {
  const hook = useClientForm(defaultLopBasis, client);
  const {
    formData, errors, hints, currentStep,
    sectionProgress, completionPct, completionCount, uploadedDocs,
    isSubmitting, submitSuccess,
    handleInputChange: handleChange, handlePocChange, handlePocPrefChange,
    goToStep, nextStep, prevStep,
    saveDraft, clearDraft, submitForm, loadClientData
  } = hook;

  useEffect(() => {
    if (client) {
      loadClientData(client);
    }

    const preventWheelChange = (e) => {
      if (document.activeElement && document.activeElement.type === 'number') {
        document.activeElement.blur();
      }
    };
    window.addEventListener('wheel', preventWheelChange, { passive: true });
    return () => {
      window.removeEventListener('wheel', preventWheelChange);
    };
  }, [client, loadClientData]);

  // Scroll to top of window whenever active step/tab changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentStep]);

  const activeSteps = hook.getActiveSteps ? hook.getActiveSteps() : [1, 2, 3, 4, 5, 6, 7, 8];
  const totalStepCount = activeSteps.length;
  const isLastStep = currentStep === activeSteps[activeSteps.length - 1];

  const metaSource = hook.isInhouse ? INHOUSE_STEP_HEADER_META : STEP_HEADER_META;
  const currentMeta = metaSource[currentStep] || metaSource[1];
  const StepHeaderIcon = currentMeta.icon;

  return (
    <RoleGuard allowedRoles={['admin', 'manager']} moduleKey="clients">
      <AuthenticatedLayout>
        <Head title={client ? 'Edit Client — Tecla Payroll' : 'Add New Client — Tecla Payroll'} />

        <div className="legacy-react-wrapper">
          {/* Top Page Header */}
          <div className="client-form-header">
            <Link href={route('clients.index')} className="back-link">
              ← Back to Clients Directory
            </Link>
            <div className="header-title-row">
              <div>
                <h2>{client ? 'Edit Client Organization' : 'Add New Client Organization'}</h2>
                <p>
                  Create a new client profile by providing details in the following steps.
                </p>
              </div>
              <div className="header-actions">
                <button type="button" className="btn-save-draft" onClick={() => saveDraft(false)}>
                  <Save size={15} /> Save Draft
                </button>
                <button type="button" className="btn-activate-primary" onClick={submitForm} disabled={isSubmitting}>
                  <CheckCircle2 size={15} /> {isSubmitting ? 'Saving...' : 'Save & Activate Client'}
                </button>
              </div>
            </div>
          </div>

          {/* Top Horizontal Progress Indicator */}
          <FormProgress
            currentStep={currentStep}
            sectionProgress={sectionProgress}
            onTabClick={goToStep}
            isInhouse={hook.isInhouse}
          />

          {/* Main 2-Column Grid Layout (Left Nav + Expanded Form) */}
          <div className="onboarding-grid-container">
            {/* ═══════════════ LEFT COLUMN: VERTICAL STEPPER NAV ═══════════════ */}
            <div className="grid-col-left">
              <OnboardingSectionNav
                currentStep={currentStep}
                sectionProgress={sectionProgress}
                onStepSelect={goToStep}
                isInhouse={hook.isInhouse}
              />
            </div>

            {/* ═══════════════ MAIN EXPANDED FORM CONTENT ═══════════════ */}
            <div className="grid-col-middle">
              <div className="onboarding-form-card">
                {/* Active Section Header */}
                <div className="step-card-header">
                  <div className="step-header-left">
                    <div className="step-header-icon-box">
                      <StepHeaderIcon size={22} />
                    </div>
                    <div>
                      <h3 className="step-header-title">
                        {currentStep}. {currentMeta.title}
                      </h3>
                      <p className="step-header-subtitle">{currentMeta.desc}</p>
                    </div>
                  </div>
                  <span className="step-badge">
                    Step {currentStep} of {totalStepCount}
                  </span>
                </div>

                {/* Form Inputs Container */}
                <form onSubmit={(e) => e.preventDefault()} id="client-form">
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
                    <ContractSection formData={formData} errors={errors} onChange={handleChange} hook={hook} gstSettings={gstSettings} />
                  </div>

                  <div className={`form-step-section ${currentStep === 5 ? 'active' : ''}`} style={{ display: currentStep === 5 ? 'block' : 'none' }}>
                    <StatutorySection formData={formData} onChange={handleChange} hook={hook} />
                  </div>

                  {!hook.isInhouse && (
                    <div className={`form-step-section ${currentStep === 6 ? 'active' : ''}`} style={{ display: currentStep === 6 ? 'block' : 'none' }}>
                      <DocumentsSection formData={formData} hook={hook} />
                    </div>
                  )}

                  <div className={`form-step-section ${currentStep === 7 ? 'active' : ''}`} style={{ display: currentStep === 7 ? 'block' : 'none' }}>
                    <PortalSection formData={formData} onChange={handleChange} hook={hook} />
                  </div>

                  <div className={`form-step-section ${currentStep === 8 ? 'active' : ''}`} style={{ display: currentStep === 8 ? 'block' : 'none' }}>
                    <SlaSection formData={formData} errors={errors} onChange={handleChange} hook={hook} />
                  </div>
                </form>
              </div>
            </div>
          </div>

          {/* ═══════════════ STICKY BOTTOM NAVIGATION BAR ═══════════════ */}
          <div className="sticky-bottom-nav-wrapper">
            <div className="bottom-nav-content">
              <div className="bottom-nav-left" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <button
                  type="button"
                  className="btn-prev-secondary"
                  onClick={prevStep}
                  disabled={currentStep === 1}
                >
                  <ArrowLeft size={15} /> Back to Previous
                </button>

                <button
                  type="button"
                  className="btn-sticky-clear"
                  onClick={() => clearDraft()}
                  title="Reset form and clear saved draft"
                >
                  <RotateCcw size={14} /> Clear Draft
                </button>
              </div>

              <div className="bottom-nav-dots">
                {activeSteps.map((stepNum) => {
                  const isCurrent = stepNum === currentStep;
                  const isCompleted = stepNum < currentStep || sectionProgress[stepNum];

                  let dotCls = 'dot-step';
                  if (isCurrent) dotCls += ' active';
                  else if (isCompleted) dotCls += ' completed';
                  else dotCls += ' pending';

                  return (
                    <div
                      key={stepNum}
                      className={dotCls}
                      onClick={() => goToStep(stepNum)}
                      title={`Go to step ${stepNum}`}
                    >
                      {isCompleted ? <Check size={12} /> : stepNum}
                    </div>
                  );
                })}
              </div>

              <div className="bottom-nav-right">
                <button
                  type="button"
                  className="btn-save-draft"
                  onClick={() => saveDraft(false)}
                  title="Save draft progress"
                >
                  <Save size={14} /> Save Draft
                </button>

                {!isLastStep && (
                  <button type="button" className="btn-skip-link" onClick={nextStep}>
                    Skip for Now
                  </button>
                )}
                {!isLastStep ? (
                  <button type="button" className="btn-continue-primary" onClick={nextStep}>
                    Save & Continue <ArrowRight size={15} />
                  </button>
                ) : (
                  <button type="button" className="btn-activate-primary" onClick={submitForm} disabled={isSubmitting}>
                    <CheckCircle2 size={15} /> {isSubmitting ? 'Saving...' : 'Save & Activate Client'}
                  </button>
                )}
              </div>
            </div>
          </div>

          <Toast message={submitSuccess || ''} />
        </div>
      </AuthenticatedLayout>
    </RoleGuard>
  );
}