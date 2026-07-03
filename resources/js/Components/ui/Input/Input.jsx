import { classNames } from '../../../Utils/formatters';

export default function Input({
  label,
  name,
  type = 'text',
  value,
  onChange,
  placeholder,
  error,
  warning,
  info,
  required = false,
  disabled = false,
  readOnly = false,
  hint,
  prefix,
  suffix,
  className = '',
  noMargin = false,
  ...props
}) {
  const inputClasses = classNames(
    'form-control',
    error && 'is-invalid',
    warning && 'is-warning',
    prefix && 'search-box-input',
    className,
  );

  return (
    <div className={classNames("form-group", noMargin && "mb-0")} style={noMargin ? { marginBottom: 0 } : {}}>
      {label && (
        <label htmlFor={name}>
          {label}
          {required && <span style={{ color: 'var(--status-danger)', marginLeft: '0.25rem' }}>*</span>}
        </label>
      )}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        {prefix && (
          <span style={{
            position: 'absolute',
            left: '0.75rem',
            color: 'var(--text-muted)',
            pointerEvents: 'none',
            display: 'flex',
            alignItems: 'center',
          }}>
            {prefix}
          </span>
        )}
        <input
          id={name}
          name={name}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          readOnly={readOnly}
          required={required}
          className={inputClasses}
          style={{
            ...(prefix ? { paddingLeft: '2.25rem' } : {}),
            ...(suffix ? { paddingRight: '2.25rem' } : {}),
          }}
          {...props}
        />
        {suffix && (
          <span style={{
            position: 'absolute',
            right: '0.75rem',
            color: 'var(--text-muted)',
            display: 'flex',
            alignItems: 'center',
          }}>
            {suffix}
          </span>
        )}
      </div>
      {error && <div className="form-error">{error}</div>}
      {warning && !error && <div className="form-warning">{warning}</div>}
      {info && !error && !warning && <div className="form-hint" style={{ color: 'var(--status-info)' }}>{info}</div>}
      {hint && !error && !warning && !info && <div className="form-hint">{hint}</div>}
    </div>
  );
}
