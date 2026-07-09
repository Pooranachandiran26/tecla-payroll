import { ToastProvider } from '../Hooks/useToast';
import { usePage } from '@inertiajs/react';

export default function GuestLayout({ children }) {
  const { branding } = usePage().props;

  return (
    <ToastProvider>
      <div className="login-wrapper">
        <div className="login-card">
          <div className="login-header">
            <div className="login-logo">
              {branding?.logo_url ? (
                <img src={branding.logo_url} alt="Agency Logo" style={{ maxHeight: '48px', maxWidth: '200px', objectFit: 'contain' }} />
              ) : (
                <>
                  <svg width="32" height="32" viewBox="0 0 24 24">
                    <path d="M12 2L2 22h20L12 2zm0 6l5 10H7l5-10z"/>
                  </svg>
                  Tecla Payroll
                </>
              )}
            </div>
            <p className="login-subtitle">Sign in to your account</p>
          </div>
          {children}
        </div>
      </div>
    </ToastProvider>
  );
}
