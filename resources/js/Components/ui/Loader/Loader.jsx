import { Loader2 } from 'lucide-react';

export default function Loader({ size = 'md', fullPage = false, text }) {
  const iconSize = size === 'sm' ? 20 : size === 'lg' ? 40 : 28;

  const content = (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
      <Loader2 size={iconSize} className="loader-spinner" style={{ color: 'var(--primary-navy)' }} />
      {text && <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{text}</span>}
    </div>
  );

  if (fullPage) {
    return <div className="loader-fullpage">{content}</div>;
  }

  return content;
}
