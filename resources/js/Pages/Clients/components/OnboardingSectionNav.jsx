import React from 'react';
import {
  Building2,
  MapPin,
  Users,
  FileText,
  ShieldCheck,
  FolderOpen,
  Globe,
  Clock,
  Palette,
  CheckCircle2,
  HelpCircle,
  ArrowRight
} from 'lucide-react';

const STEP_DATA = {
  1: { icon: Building2, title: 'Identity', desc: 'Company details & registration' },
  2: { icon: MapPin, title: 'Address', desc: 'Locations & addresses' },
  3: { icon: Users, title: 'Contacts', desc: 'Primary contacts' },
  4: { icon: FileText, title: 'Contract', desc: 'Terms & billing' },
  5: { icon: ShieldCheck, title: 'Statutory', desc: 'Compliance details' },
  6: { icon: FolderOpen, title: 'Documents', desc: 'Upload documents' },
  7: { icon: Globe, title: 'Portal', desc: 'Portal access & users' },
  8: { icon: Clock, title: 'SLA', desc: 'Service level agreement' },
};

const INHOUSE_OVERRIDES = {
  4: { icon: FileText, title: 'Payroll', desc: 'Internal payroll settings' },
  7: { icon: Palette, title: 'Branding', desc: 'Payslip logo & colors' },
  8: { icon: Clock, title: 'Calendar', desc: 'Payroll processing dates' },
};

export default function OnboardingSectionNav({
  currentStep,
  sectionProgress,
  onStepSelect,
  isInhouse = false
}) {
  const visibleSteps = isInhouse
    ? [1, 2, 3, 4, 5, 7, 8]
    : [1, 2, 3, 4, 5, 6, 7, 8];

  return (
    <div className="onboarding-nav-card card">
      <div className="onboarding-nav-header">
        <h4 className="nav-title">Onboarding Steps</h4>
        <span className="nav-count-badge">
          {currentStep} of {visibleSteps.length}
        </span>
      </div>

      <div className="onboarding-nav-list">
        {visibleSteps.map((stepNum) => {
          const baseData = STEP_DATA[stepNum];
          const overrideData = isInhouse && INHOUSE_OVERRIDES[stepNum] ? INHOUSE_OVERRIDES[stepNum] : null;
          const { icon: StepIcon, title, desc } = overrideData || baseData;

          const isCurrent = stepNum === currentStep;
          const isCompleted = stepNum < currentStep || sectionProgress[stepNum];
          const isPending = !isCurrent && !isCompleted;

          let itemCls = 'nav-item';
          if (isCurrent) itemCls += ' active';
          else if (isCompleted) itemCls += ' completed';
          else itemCls += ' pending';

          return (
            <div
              key={stepNum}
              className={itemCls}
              onClick={() => onStepSelect && onStepSelect(stepNum)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && onStepSelect && onStepSelect(stepNum)}
            >
              <div className="nav-item-left">
                <div className="nav-indicator">
                  {isCompleted ? (
                    <CheckCircle2 className="icon-completed" size={16} />
                  ) : (
                    <span className="nav-number">{stepNum}</span>
                  )}
                </div>
                <div className="nav-text">
                  <div className="nav-item-title">
                    <StepIcon size={14} className="nav-step-icon" />
                    <span>{stepNum}. {title}</span>
                  </div>
                  <div className="nav-item-desc">{desc}</div>
                </div>
              </div>

              <div className="nav-item-right">
                {isCurrent ? (
                  <span className="status-pill status-in-progress">In Progress</span>
                ) : isCompleted ? (
                  <span className="status-pill status-completed">Completed</span>
                ) : (
                  <span className="status-pill status-pending">Pending</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Need Help Support Banner */}
      <div className="nav-support-box">
        <div className="support-header">
          <HelpCircle size={18} className="support-icon" />
          <div>
            <h5 className="support-title">Need Help?</h5>
            <p className="support-desc">Contact our support team if you need any assistance while onboarding.</p>
          </div>
        </div>
        <a
          href="mailto:support@teclapayroll.com"
          target="_blank"
          rel="noopener noreferrer"
          className="support-link"
        >
          Contact Support <ArrowRight size={13} />
        </a>
      </div>
    </div>
  );
}
