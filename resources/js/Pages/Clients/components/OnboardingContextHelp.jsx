import React from 'react';
import {
  Info,
  ShieldCheck,
  Clock,
  BookOpen,
  ArrowRight,
  CheckCircle2
} from 'lucide-react';

const STEP_HELP = {
  1: {
    whyTitle: 'Why we need this information?',
    whyDesc: 'Legal identity details ensure compliance with MCA records, GSTIN, PAN, and TAN validations across state jurisdictions.',
    guideText: 'Learn more about corporate identity & tax requirements.'
  },
  2: {
    whyTitle: 'Why we need location data?',
    whyDesc: 'Addresses determine GST tax jurisdictions, billing invoicing rules, and branch-level Professional Tax (PT) filings.',
    guideText: 'Read our multi-branch location setup guide.'
  },
  3: {
    whyTitle: 'Why we need this information?',
    whyDesc: 'Primary contacts help us communicate important updates, compliance notices, and support requests efficiently.',
    guideText: 'Learn more about client onboarding process.'
  },
  4: {
    whyTitle: 'Understanding billing models',
    whyDesc: 'Billing terms, markup percentages, and payment schedules drive automated monthly client invoicing and GST calculations.',
    guideText: 'Review agency billing models (CTC + Markup, Retainer).'
  },
  5: {
    whyTitle: 'Statutory inheritance rule',
    whyDesc: 'Statutory defaults (PF, ESI, PT, TDS, Bonus) defined here are automatically inherited by all candidates onboarded under this client.',
    guideText: 'View statutory inheritance & compliance rules guide.'
  },
  6: {
    whyTitle: 'Compliance audit trail',
    whyDesc: 'Compliance documents like MSA, NDA, and GST certificates are required for client audit trails and legal verification.',
    guideText: 'Download document templates & compliance checklist.'
  },
  7: {
    whyTitle: 'Client portal security',
    whyDesc: 'Portal access settings grant client administrators self-service access to invoices, reports, and employee payslips.',
    guideText: 'View client portal permission matrix.'
  },
  8: {
    whyTitle: 'Payroll calendar SLAs',
    whyDesc: 'SLA dates establish payroll locking, attendance cutoffs, and salary credit deadlines to prevent processing delays.',
    guideText: 'Read about payroll cutoff calendars & SLA tiers.'
  }
};

export default function OnboardingContextHelp({
  currentStep,
  completionPct,
  completionCount,
  totalSteps = 8
}) {
  const helpData = STEP_HELP[currentStep] || STEP_HELP[1];

  return (
    <div className="onboarding-sidebar-cards">
      {/* Overall Progress Card */}
      <div className="card progress-overview-card">
        <div className="progress-card-header">
          <h4 className="progress-title">Overall Progress</h4>
          <span className="progress-count">{completionCount} of {totalSteps} Completed</span>
        </div>

        <div className="progress-bar-wrapper">
          <div
            className="progress-bar-fill"
            style={{
              width: `${completionPct}%`,
              backgroundColor: completionPct === 100 ? '#10B981' : '#2563EB'
            }}
          />
        </div>

        <div className="progress-card-footer">
          <span className="progress-pct-label">{completionPct}% Completed</span>
          {completionPct === 100 && (
            <span className="progress-ready-badge">
              <CheckCircle2 size={13} /> Ready to Activate
            </span>
          )}
        </div>
      </div>

      {/* Card 1: Why we need this info? */}
      <div className="card help-card help-card-info">
        <div className="help-card-header">
          <Info size={18} className="help-icon help-icon-blue" />
          <h4 className="help-title">{helpData.whyTitle}</h4>
        </div>
        <p className="help-desc">{helpData.whyDesc}</p>
      </div>

      {/* Card 2: Security & Confidentiality */}
      <div className="card help-card help-card-security">
        <div className="help-card-header">
          <ShieldCheck size={18} className="help-icon help-icon-green" />
          <h4 className="help-title">Your data is secure</h4>
        </div>
        <p className="help-desc">
          We follow industry best practices and strict role-based encryption to keep your data safe and confidential.
        </p>
      </div>

      {/* Card 3: Save anytime */}
      <div className="card help-card help-card-draft">
        <div className="help-card-header">
          <Clock size={18} className="help-icon help-icon-amber" />
          <h4 className="help-title">Save anytime</h4>
        </div>
        <p className="help-desc">
          You can save your progress as draft at any step and continue later from where you left off.
        </p>
      </div>

      {/* Card 4: Need guidance? */}
      <div className="card help-card help-card-guide">
        <div className="help-card-header">
          <BookOpen size={18} className="help-icon help-icon-indigo" />
          <h4 className="help-title">Need guidance?</h4>
        </div>
        <p className="help-desc">{helpData.guideText}</p>
        <a
          href="#"
          onClick={(e) => { e.preventDefault(); alert('Refer to section help guides in Tecla Payroll documentation.'); }}
          className="guide-link"
        >
          View Help Guide <ArrowRight size={13} />
        </a>
      </div>
    </div>
  );
}
