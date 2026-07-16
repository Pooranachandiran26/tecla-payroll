import React, { useRef } from 'react';

export default function PortalSection({ formData, onChange, hook }) {
  const logoInputRef = useRef(null);

  const handleLogoClick = () => {
    if (logoInputRef.current) logoInputRef.current.click();
  };

  const handleLogoChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (file.size > 2 * 1024 * 1024) {
        if (hook?.showToast) hook.showToast('❌ Logo must be less than 2MB');
        return;
      }
      onChange('portalLogo', file);
    }
  };

  return (
    <>
      <div className="section-header">
        <div className="section-icon">🔐</div>
        <h3>Client Portal Access</h3>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
        <label className="toggle-container">
          <input type="checkbox" className="toggle-input"
            checked={formData.portalAccess} onChange={e => onChange('portalAccess', e.target.checked)} />
          <span className="toggle-switch"></span>
        </label>
        <div>
          <strong style={{ fontSize: '0.875rem', display: 'block' }}>Enable Client Self-Service Portal</strong>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Client can log in to view candidates, timesheets, invoices, and raise requests.</span>
        </div>
      </div>

      {formData.portalAccess && (
        <div style={{ background: '#FAFBFC', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '1rem' }}>
          <div className="form-row">
            <div className="form-group">
              <label>Portal Login Email</label>
              <input type="email" className="form-control" placeholder="admin@mahindra.com"
                value={formData.portalEmail} onChange={e => onChange('portalEmail', e.target.value)} />
              <div className="field-hint">Invitation email will be sent to this address.</div>
            </div>
            <div className="form-group">
              <label>Access Level</label>
              <select className="form-control" value={formData.portalAccessLevel} onChange={e => onChange('portalAccessLevel', e.target.value)}>
                <option value="view_only">View Only (Read-only)</option>
                <option value="approver">Approver (Can approve attendance)</option>
                <option value="full">Full Access (Manage candidates + invoices)</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', marginBottom: '1rem', marginTop: '0.5rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', cursor: 'pointer' }}>
              <input type="checkbox" style={{ width: '14px', height: '14px' }}
                checked={formData.portalViewSalary} onChange={e => onChange('portalViewSalary', e.target.checked)} /> View Salary Data
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', cursor: 'pointer' }}>
              <input type="checkbox" style={{ width: '14px', height: '14px' }}
                checked={formData.portalViewInvoices} onChange={e => onChange('portalViewInvoices', e.target.checked)} /> View Invoices
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', cursor: 'pointer' }}>
              <input type="checkbox" style={{ width: '14px', height: '14px' }}
                checked={formData.portalViewPayslips} onChange={e => onChange('portalViewPayslips', e.target.checked)} /> Download Payslips
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', cursor: 'pointer' }}>
              <input type="checkbox" style={{ width: '14px', height: '14px' }}
                checked={formData.portalRaiseRequests} onChange={e => onChange('portalRaiseRequests', e.target.checked)} /> Raise Support Requests
            </label>
          </div>

          {/* Advanced Security Options */}
          <div className="form-row" style={{ marginTop: '1rem', borderTop: '1px dashed var(--border-color)', paddingTop: '1rem' }}>
            <div className="form-group">
              <label style={{ display: 'block', marginBottom: '0.5rem' }}>Two-Factor Authentication (2FA)</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
                <label className="toggle-container" style={{ margin: 0 }}>
                  <input type="checkbox" className="toggle-input"
                    checked={formData.portal2fa} onChange={e => onChange('portal2fa', e.target.checked)} />
                  <span className="toggle-switch"></span>
                </label>
                <span style={{ fontSize: '0.85rem' }}>Enforce 2FA for all client logins</span>
              </div>
            </div>
            <div className="form-group">
              <label>Session Timeout (minutes)</label>
              <input type="number" className="form-control" min="15" max="480"
                value={formData.sessionTimeout} onChange={e => onChange('sessionTimeout', e.target.value)} />
              <div className="field-hint">User is logged out after this period of inactivity. Min: 15, Max: 480.</div>
            </div>
          </div>

          <div className="form-group" style={{ marginTop: '1rem' }}>
            <label>IP Whitelist</label>
            <textarea className="form-control" rows="2" placeholder="e.g. 192.168.1.0/24, 10.0.0.1"
              value={formData.ipWhitelist} onChange={e => onChange('ipWhitelist', e.target.value)}></textarea>
            <div className="field-hint">Leave blank for no IP restriction. Separate multiple CIDRs with commas.</div>
          </div>

          <div className="form-group" style={{ marginTop: '1rem' }}>
            <label>Client Logo Upload (for Portal Branding)</label>
            <div className="doc-upload-zone" style={{ padding: '1.5rem', cursor: 'pointer' }} onClick={handleLogoClick}>
              <div className="upload-icon" style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>🖼️</div>
              <p style={{ fontWeight: 600 }}>Click to upload logo</p>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>PNG, JPG, SVG — Max 2MB</p>
              {formData.portalLogo && (
                <div className="field-hint success" style={{ marginTop: '0.5rem', fontWeight: 600 }}>
                  Selected: {formData.portalLogo.name}
                </div>
              )}
            </div>
            <input type="file" ref={logoInputRef} style={{ display: 'none' }} accept="image/png, image/jpeg, image/svg+xml" onChange={handleLogoChange} />
          </div>
        </div>
      )}
    </>
  );
}
