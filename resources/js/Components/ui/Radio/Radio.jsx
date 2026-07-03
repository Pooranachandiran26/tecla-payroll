export default function Radio({
  label, name, value, checked, onChange, disabled = false,
}) {
  return (
    <label style={{
      display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
      cursor: disabled ? 'not-allowed' : 'pointer',
      fontSize: '0.875rem', opacity: disabled ? 0.6 : 1,
      marginBottom: '0.5rem',
    }}>
      <input
        type="radio" name={name} value={value}
        checked={checked} onChange={onChange} disabled={disabled}
        style={{ accentColor: 'var(--accent-gold)', width: '16px', height: '16px' }}
      />
      {label}
    </label>
  );
}
