import React from 'react';
import { WIZARD_STEPS } from '../constants/clientFormData';

export default function FormProgress({ currentStep, sectionProgress, onTabClick }) {
  return (
    <div className="form-progress">
      {WIZARD_STEPS.map(step => {
        let cls = 'progress-step';
        if (step.num === currentStep) cls += ' active';
        else if (step.num < currentStep || sectionProgress[step.num]) cls += ' complete';
        return (
          <div key={step.num} className={cls} onClick={() => onTabClick && onTabClick(step.num)} style={{ cursor: 'pointer' }}>
            {step.label}
          </div>
        );
      })}
    </div>
  );
}
