export default function PasswordPolicyFeedback({ password, rules }) {
  if (!rules) return null;

  const checks = [];

  if (rules.min_length > 0) {
    checks.push({
      label: `At least ${rules.min_length} characters`,
      valid: password.length >= rules.min_length
    });
  }
  if (rules.require_mixed_case) {
    checks.push({
      label: 'One uppercase and one lowercase letter',
      valid: /[a-z]/.test(password) && /[A-Z]/.test(password)
    });
  }
  if (rules.require_numbers) {
    checks.push({
      label: 'One number',
      valid: /[0-9]/.test(password)
    });
  }
  if (rules.require_symbols) {
    checks.push({
      label: 'One symbol',
      valid: /[^a-zA-Z0-9]/.test(password)
    });
  }

  if (checks.length === 0) return null;

  return (
    <div style={{ fontSize: '0.85rem', marginTop: '-0.5rem', marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '0.35rem', paddingLeft: '0.25rem' }}>
      {checks.map((check, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', color: check.valid ? 'var(--status-success)' : 'var(--text-muted)' }}>
          <span style={{ marginRight: '0.5rem', display: 'flex' }}>
            {check.valid ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"></polyline></svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            )}
          </span>
          {check.label}
        </div>
      ))}
    </div>
  );
}
