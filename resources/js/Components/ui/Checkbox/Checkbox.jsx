export default function Checkbox({
  label, name, checked, onChange, disabled = false, hint, className = '',
}) {
  return (
    <div className={className} style={{ marginBottom: '0.75rem' }}>
      <label className="toggle-container" style={{ fontSize: '0.875rem' }}>
        <input
          type="checkbox"
          className="toggle-input"
          name={name}
          checked={checked}
          onChange={onChange}
          disabled={disabled}
        />
        <span className="toggle-switch" />
        {label}
      </label>
      {hint && <div className="form-hint" style={{ marginLeft: '3.25rem' }}>{hint}</div>}
    </div>
  );
}
