import React from 'react';
import { WIZARD_STEPS } from '../constants/clientFormData';

export default function FormProgress({ currentStep, sectionProgress }) {
  return (
    <div className="form-progress">
      {WIZARD_STEPS.map(step => {
        let cls = 'progress-step';
        if (step.num === currentStep) cls += ' active';
        else if (step.num < currentStep || sectionProgress[step.num]) cls += ' complete';
        return (
          <div key={step.num} className={cls}>
            {step.label}
          </div>
        );
      })}
    </div>
  );
}
