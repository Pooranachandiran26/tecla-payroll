import { Check } from 'lucide-react';

/**
 * Generic vertical stepper for multi-step workflows.
 * steps: [{ key, label }]
 * currentKey: key of the active step
 * completedKeys: array of keys already completed (shown with a green check)
 * onStepClick(key): optional, only called for steps the caller allows (completed or current)
 */
export default function Stepper({ steps = [], currentKey, completedKeys = [], onStepClick }) {
  return (
    <div className="stepper-vertical">
      {steps.map((step, index) => {
        const isCompleted = completedKeys.includes(step.key);
        const isCurrent = step.key === currentKey;
        const isClickable = typeof onStepClick === 'function' && (isCompleted || isCurrent);

        return (
          <div
            key={step.key}
            className={
              'stepper-item' +
              (isCurrent ? ' stepper-item-current' : '') +
              (isCompleted ? ' stepper-item-completed' : '') +
              (isClickable ? ' stepper-item-clickable' : '')
            }
            onClick={() => isClickable && onStepClick(step.key)}
          >
            <div className="stepper-marker">
              {isCompleted ? <Check size={14} /> : <span>{index + 1}</span>}
            </div>
            <div className="stepper-label">
              <div className="stepper-label-title">{step.label}</div>
              {step.description && <div className="stepper-label-desc">{step.description}</div>}
            </div>
            {index < steps.length - 1 && <div className="stepper-connector" />}
          </div>
        );
      })}
    </div>
  );
}
