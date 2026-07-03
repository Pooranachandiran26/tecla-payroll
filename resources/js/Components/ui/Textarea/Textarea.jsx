import { classNames } from '../../../Utils/formatters';

export default function Textarea({
  label, name, value, onChange, placeholder,
  error, required = false, disabled = false, readOnly = false,
  hint, rows = 3, className = '', ...props
}) {
  return (
    <div className="form-group">
      {label && (
        <label htmlFor={name}>
          {label}
          {required && <span style={{ color: 'var(--status-danger)', marginLeft: '0.25rem' }}>*</span>}
        </label>
      )}
      <textarea
        id={name} name={name} value={value} onChange={onChange}
        placeholder={placeholder} disabled={disabled} readOnly={readOnly}
        required={required} rows={rows}
        className={classNames('form-control', error && 'is-invalid', className)}
        {...props}
      />
      {error && <div className="form-error">{error}</div>}
      {hint && !error && <div className="form-hint">{hint}</div>}
    </div>
  );
}
