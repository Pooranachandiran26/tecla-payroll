import React from 'react';
import { 
  Building2, 
  MapPin, 
  Users, 
  FileText, 
  ShieldCheck, 
  FolderOpen, 
  Globe, 
  Clock 
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

export default function FormProgress({ currentStep, sectionProgress, onTabClick }) {
  return (
    <div className="form-progress">
      {[1, 2, 3, 4, 5, 6, 7, 8].map(stepNum => {
        const Icon = STEP_ICONS[stepNum];
        let cls = 'progress-step';
        if (stepNum === currentStep) cls += ' active';
        else if (stepNum < currentStep || sectionProgress[stepNum]) cls += ' complete';

        return (
          <div 
            key={stepNum} 
            className={cls} 
            onClick={() => onTabClick && onTabClick(stepNum)} 
            style={{ cursor: 'pointer' }}
            title={`Step ${stepNum}: ${STEP_LABELS[stepNum]}`}
          >
            <Icon size={14} style={{ flexShrink: 0 }} />
            <span>{stepNum}. {STEP_LABELS[stepNum]}</span>
          </div>
        );
      })}
    </div>
  );
}
