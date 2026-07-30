import { useState } from 'react';
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
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === 'password';
  const inputType = isPassword ? (showPassword ? 'text' : 'password') : type;

  const inputClasses = classNames(
    'form-control',
    error && 'is-invalid',
    warning && 'is-warning',
    prefix && 'search-box-input',
    className,
  );

  const renderSuffix = () => {
    if (isPassword) {
      return (
        <button 
          type="button" 
          onClick={() => setShowPassword(!showPassword)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', display: 'flex', outline: 'none' }}
          tabIndex="-1"
        >
          {showPassword ? (
             <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
          ) : (
             <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
          )}
        </button>
      );
    }
    return suffix;
  };

  const currentSuffix = renderSuffix();

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
          type={inputType}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          readOnly={readOnly}
          required={required}
          className={inputClasses}
          style={{
            ...(prefix ? { paddingLeft: '2.25rem' } : {}),
            ...(currentSuffix ? { paddingRight: '2.25rem' } : {}),
          }}
          {...props}
        />
        {currentSuffix && (
          <span style={{
            position: 'absolute',
            right: '0.75rem',
            color: 'var(--text-muted)',
            display: 'flex',
            alignItems: 'center',
          }}>
            {currentSuffix}
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
