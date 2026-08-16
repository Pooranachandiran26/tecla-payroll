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
  Check
} from 'lucide-react';

const STEP_ICONS = {
  1: Building2,
  2: MapPin,
  3: Users,
  4: FileText,
  5: ShieldCheck,
  6: FolderOpen,
  7: Globe,
  8: Clock,
};

const STEP_LABELS = {
  1: '1. Identity',
  2: '2. Address',
  3: '3. Contacts',
  4: '4. Contract',
  5: '5. Statutory',
  6: '6. Documents',
  7: '7. Portal',
  8: '8. SLA',
};

const INHOUSE_STEP_ICONS = {
  ...STEP_ICONS,
  7: Palette,
};

const INHOUSE_STEP_LABELS = {
  ...STEP_LABELS,
  4: '4. Payroll',
  7: '7. Branding',
  8: '8. Calendar',
};

export default function FormProgress({ currentStep, sectionProgress, onTabClick, isInhouse = false }) {
  const visibleSteps = isInhouse
    ? [1, 2, 3, 4, 5, 7, 8]
    : [1, 2, 3, 4, 5, 6, 7, 8];

  const icons = isInhouse ? INHOUSE_STEP_ICONS : STEP_ICONS;
  const labels = isInhouse ? INHOUSE_STEP_LABELS : STEP_LABELS;

  return (
    <div className="top-horizontal-stepper">
      {visibleSteps.map((stepNum, idx) => {
        const Icon = icons[stepNum];
        const isCurrent = stepNum === currentStep;
        const isCompleted = stepNum < currentStep || sectionProgress[stepNum];
        const isPending = !isCurrent && !isCompleted;

        let stepCls = 'stepper-item';
        if (isCurrent) stepCls += ' active';
        else if (isCompleted) stepCls += ' completed';
        else stepCls += ' pending';

        return (
          <React.Fragment key={stepNum}>
            <div
              className={stepCls}
              onClick={() => onTabClick && onTabClick(stepNum)}
              title={`Go to step ${stepNum}: ${labels[stepNum]}`}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && onTabClick && onTabClick(stepNum)}
            >
              <div className="stepper-circle">
                {isCompleted ? (
                  <Check size={14} className="check-icon" />
                ) : (
                  <Icon size={14} className="step-icon" />
                )}
              </div>
              <span className="stepper-label">{labels[stepNum]}</span>
            </div>

            {idx < visibleSteps.length - 1 && (
              <div
                className={`stepper-line ${
                  isCompleted
                    ? 'line-completed'
                    : isCurrent
                    ? 'line-active'
                    : 'line-pending'
                }`}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}
