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
                  <span>{branding?.agency_display_name || 'Tecla Payroll'}</span>
                </>
              )}
            </div>
            <h4 style={{ fontSize: '1rem', fontWeight: 600, color: '#1e293b', marginTop: '0.25rem' }}>
              {branding?.login_welcome_message || 'Sign in to your account'}
            </h4>
            <p className="login-subtitle">{branding?.portal_tagline || 'Enterprise Payroll & HR Portal'}</p>
          </div>
          {children}
        </div>
        {branding?.enable_footer_notice !== false && (
          <p className="login-footer-text">
            {branding?.footer_copyright_text || '© 2026 Tecla Payroll. All Rights Reserved.'}
          </p>
        )}
      </div>
    </ToastProvider>
  );
}
