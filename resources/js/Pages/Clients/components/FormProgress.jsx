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
  Palette
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
  1: 'Identity',
  2: 'Address',
  3: 'Contacts',
  4: 'Contract',
  5: 'Statutory',
  6: 'Documents',
  7: 'Portal',
  8: 'SLA',
};

// In-House mode overrides
const INHOUSE_STEP_ICONS = {
  ...STEP_ICONS,
  7: Palette,  // Portal → Branding icon
};

const INHOUSE_STEP_LABELS = {
  ...STEP_LABELS,
  4: 'Payroll',     // Contract → Payroll Config
  7: 'Branding',    // Portal → Branding
  8: 'Calendar',    // SLA → Calendar
};

export default function FormProgress({ currentStep, sectionProgress, onTabClick, isInhouse = false }) {
  // In-House: skip Documents tab (step 6)
  const visibleSteps = isInhouse
    ? [1, 2, 3, 4, 5, 7, 8]
    : [1, 2, 3, 4, 5, 6, 7, 8];

  const icons = isInhouse ? INHOUSE_STEP_ICONS : STEP_ICONS;
  const labels = isInhouse ? INHOUSE_STEP_LABELS : STEP_LABELS;

  return (
    <div className="form-progress">
      {visibleSteps.map(stepNum => {
        const Icon = icons[stepNum];
        let cls = 'progress-step';
        if (stepNum === currentStep) cls += ' active';
        else if (stepNum < currentStep || sectionProgress[stepNum]) cls += ' complete';

        return (
          <div 
            key={stepNum} 
            className={cls} 
            onClick={() => onTabClick && onTabClick(stepNum)} 
            style={{ cursor: 'pointer' }}
            title={`Step ${stepNum}: ${labels[stepNum]}`}
          >
            <Icon size={14} style={{ flexShrink: 0 }} />
            <span>{labels[stepNum]}</span>
          </div>
        );
      })}
    </div>
  );
}
