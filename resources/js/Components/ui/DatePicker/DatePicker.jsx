import { classNames } from '../../../Utils/formatters';

export default function DatePicker({
  label, name, value, onChange, min, max,
  disabled = false, required = false, error, className = '',
}) {
  return (
    <div className="form-group">
      {label && (
        <label htmlFor={name}>
          {label}
          {required && <span style={{ color: 'var(--status-danger)', marginLeft: '0.25rem' }}>*</span>}
        </label>
      )}
      <input
        type="date" id={name} name={name}
        value={value} onChange={onChange}
        min={min} max={max}
        disabled={disabled} required={required}
        className={classNames('form-control', error && 'is-invalid', className)}
      />
      {error && <div className="form-error">{error}</div>}
    </div>
  );
}
