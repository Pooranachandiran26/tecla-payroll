import { classNames } from '../../../Utils/formatters';

export default function Select({
  label,
  name,
  value,
  onChange,
  options = [],
  placeholder,
  error,
  disabled = false,
  required = false,
  hint,
  className = '',
  children,
  noMargin = false,
  ...props
}) {
  return (
    <div className={classNames("form-group", noMargin && "mb-0")} style={noMargin ? { marginBottom: 0 } : {}}>
      {label && (
        <label htmlFor={name}>
          {label}
          {required && <span style={{ color: 'var(--status-danger)', marginLeft: '0.25rem' }}>*</span>}
        </label>
      )}
      <select
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        disabled={disabled}
        required={required}
        className={classNames('form-control', error && 'is-invalid', className)}
        title={label || name}
        {...props}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} disabled={opt.disabled}>
            {opt.label}
          </option>
        ))}
        {children}
      </select>
      {error && <div className="form-error">{error}</div>}
      {hint && !error && <div className="form-hint">{hint}</div>}
    </div>
  );
}
