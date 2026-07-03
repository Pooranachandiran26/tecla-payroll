import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import useToast from '../../../Hooks/useToast';
import { classNames } from '../../../Utils/formatters';

const iconMap = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

const typeClassMap = {
  success: 'toast-success',
  error: 'toast-error',
  warning: 'toast-warning',
  info: 'toast-info',
};

export default function ToastContainer() {
  const { toasts, dismissToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="toast-container">
      {toasts.map((toast) => {
        const Icon = iconMap[toast.type] || Info;
        return (
          <div
            key={toast.id}
            className={classNames('toast', typeClassMap[toast.type] || 'toast-info', toast.exiting && 'toast-exit')}
          >
            <Icon size={20} style={{ flexShrink: 0, marginTop: '0.125rem' }} />
            <div style={{ flex: 1 }}>
              {toast.title && <div style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.125rem' }}>{toast.title}</div>}
              {toast.message && <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{toast.message}</div>}
            </div>
            <button
              onClick={() => dismissToast(toast.id)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.125rem', color: 'var(--text-muted)' }}
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
