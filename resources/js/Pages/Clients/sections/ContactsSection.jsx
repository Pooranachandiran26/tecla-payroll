import React from 'react';

export default function ContactsSection({ formData, errors, onChange, onPocChange, onPocPrefChange, hook }) {
  return (
    <>
      <div className="section-header">
        <div className="section-icon">👥</div>
        <h3>Contact Persons</h3>
        <span className="section-badge">MULTI-CONTACT</span>
      </div>

      <div className="info-box" style={{ marginBottom: '1rem' }}>
        💡 Add all contact persons with their roles. The <strong>Primary POC</strong> receives all payroll communications.
        <strong>Finance Contact</strong> receives invoices. <strong>HR Contact</strong> receives onboarding and exit emails.
      </div>

      {/* Primary POC */}
      <div style={{
        background: '#FAFBFC', border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-md)', padding: '1rem', marginBottom: '1rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
          <strong style={{ fontSize: '0.875rem', color: 'var(--primary-navy)' }}>👤 Primary Point of Contact (POC)</strong>
          <span className="badge" style={{ background: '#E0F2FE', color: '#0369A1', fontSize: '0.7rem', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>Receives All Comms</span>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Full Name <span style={{ color: 'var(--status-danger)' }}>*</span></label>
            <input type="text" className={`form-control ${errors['poc1.name'] ? 'invalid' : ''}`}
              placeholder="e.g. Vikas Mehta"
              value={formData.poc1.name}
              onChange={e => onPocChange('poc1', 'name', e.target.value)} />
          </div>
          <div className="form-group">
            <label>Designation</label>
            <input type="text" className="form-control" placeholder="e.g. HR Manager"
              value={formData.poc1.designation}
              onChange={e => onPocChange('poc1', 'designation', e.target.value)} />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Email <span style={{ color: 'var(--status-danger)' }}>*</span></label>
            <input type="email" className={`form-control ${errors['poc1.email'] ? 'invalid' : ''}`}
              placeholder="e.g. vikas@mahindra.com"
              value={formData.poc1.email}
              onChange={e => onPocChange('poc1', 'email', e.target.value)} />
          </div>
          <div className="form-group">
            <label>Phone <span style={{ color: 'var(--status-danger)' }}>*</span></label>
            <input type="tel" className={`form-control ${errors['poc1.phone'] ? 'invalid' : ''}`}
              placeholder="10-digit mobile" maxLength="10"
              value={formData.poc1.phone}
              onChange={e => onPocChange('poc1', 'phone', e.target.value)} />
          </div>
        </div>
        <div className="form-row" style={{ marginTop: '0.75rem', alignItems: 'center', gap: '1.5rem' }}>
          <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
            <label className="toggle-container" style={{ margin: 0 }}>
              <input type="checkbox" className="toggle-input"
                checked={formData.poc1.whatsappSame}
                onChange={e => onPocChange('poc1', 'whatsappSame', e.target.checked)} />
              <span className="toggle-switch"></span>
            </label>
            <span style={{ fontSize: '0.8rem' }}>WhatsApp same as Phone</span>
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label style={{ fontSize: '0.8rem', display: 'block', marginBottom: '0.25rem' }}>Communication Preferences</label>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <label style={{ fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.25rem', cursor: 'pointer', userSelect: 'none' }}>
                <input type="checkbox" checked={formData.poc1.prefs.email} onChange={e => onPocPrefChange('poc1', 'email', e.target.checked)} /> ✉️ Email
              </label>
              <label style={{ fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.25rem', cursor: 'pointer', userSelect: 'none' }}>
                <input type="checkbox" checked={formData.poc1.prefs.sms} onChange={e => onPocPrefChange('poc1', 'sms', e.target.checked)} /> 📱 SMS
              </label>
              <label style={{ fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.25rem', cursor: 'pointer', userSelect: 'none' }}>
                <input type="checkbox" checked={formData.poc1.prefs.wa} onChange={e => onPocPrefChange('poc1', 'wa', e.target.checked)} /> 💬 WhatsApp
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Finance POC */}
      <div style={{
        background: '#FAFBFC', border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-md)', padding: '1rem', marginBottom: '1rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
          <strong style={{ fontSize: '0.875rem', color: 'var(--primary-navy)' }}>💼 Finance / Accounts Contact</strong>
          <span className="badge" style={{ background: '#FEF3C7', color: '#B45309', fontSize: '0.7rem', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>Receives Invoices</span>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Full Name</label>
            <input type="text" className="form-control" placeholder="e.g. Ravi Joshi"
              value={formData.poc2.name} onChange={e => onPocChange('poc2', 'name', e.target.value)} />
          </div>
          <div className="form-group">
            <label>Designation</label>
            <input type="text" className="form-control" placeholder="e.g. Accounts Manager"
              value={formData.poc2.designation} onChange={e => onPocChange('poc2', 'designation', e.target.value)} />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Email</label>
            <input type="email" className="form-control" placeholder="e.g. accounts@mahindra.com"
              value={formData.poc2.email} onChange={e => onPocChange('poc2', 'email', e.target.value)} />
          </div>
          <div className="form-group">
            <label>Phone</label>
            <input type="tel" className="form-control" placeholder="10-digit mobile" maxLength="10"
              value={formData.poc2.phone} onChange={e => onPocChange('poc2', 'phone', e.target.value)} />
          </div>
        </div>
        <div className="form-row" style={{ marginTop: '0.75rem', alignItems: 'center', gap: '1.5rem' }}>
          <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
            <label className="toggle-container" style={{ margin: 0 }}>
              <input type="checkbox" className="toggle-input"
                checked={formData.poc2.whatsappSame} onChange={e => onPocChange('poc2', 'whatsappSame', e.target.checked)} />
              <span className="toggle-switch"></span>
            </label>
            <span style={{ fontSize: '0.8rem' }}>WhatsApp same as Phone</span>
          </div>
          <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
            <label className="toggle-container" style={{ margin: 0 }}>
              <input type="checkbox" className="toggle-input"
                checked={formData.poc2.ccInvoice} onChange={e => onPocChange('poc2', 'ccInvoice', e.target.checked)} />
              <span className="toggle-switch"></span>
            </label>
            <span style={{ fontSize: '0.8rem', fontWeight: 500 }}>CC on Invoice Email</span>
          </div>
        </div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
          Communication Preferences:
          <label style={{ marginLeft: '0.5rem', fontSize: '0.75rem', cursor: 'pointer' }}><input type="checkbox" checked={formData.poc2.prefs.email} onChange={e => onPocPrefChange('poc2', 'email', e.target.checked)} /> ✉️ Email</label>
          <label style={{ marginLeft: '0.5rem', fontSize: '0.75rem', cursor: 'pointer' }}><input type="checkbox" checked={formData.poc2.prefs.sms} onChange={e => onPocPrefChange('poc2', 'sms', e.target.checked)} /> 📱 SMS</label>
          <label style={{ marginLeft: '0.5rem', fontSize: '0.75rem', cursor: 'pointer' }}><input type="checkbox" checked={formData.poc2.prefs.wa} onChange={e => onPocPrefChange('poc2', 'wa', e.target.checked)} /> 💬 WhatsApp</label>
        </div>
      </div>

      {/* HR POC */}
      <div style={{
        background: '#FAFBFC', border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-md)', padding: '1rem', marginBottom: '1rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
          <strong style={{ fontSize: '0.875rem', color: 'var(--primary-navy)' }}>🏷️ HR / Onboarding Contact</strong>
          <span className="badge" style={{ background: '#DCFCE7', color: '#166534', fontSize: '0.7rem', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>Receives HR Notifications</span>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Full Name</label>
            <input type="text" className="form-control" placeholder="e.g. Priya Nair"
              value={formData.poc3.name} onChange={e => onPocChange('poc3', 'name', e.target.value)} />
          </div>
          <div className="form-group">
            <label>Designation</label>
            <input type="text" className="form-control" placeholder="e.g. HR Manager"
              value={formData.poc3.designation} onChange={e => onPocChange('poc3', 'designation', e.target.value)} />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Email</label>
            <input type="email" className="form-control" placeholder="e.g. hr@mahindra.com"
              value={formData.poc3.email} onChange={e => onPocChange('poc3', 'email', e.target.value)} />
          </div>
          <div className="form-group">
            <label>Phone</label>
            <input type="tel" className="form-control" placeholder="10-digit mobile" maxLength="10"
              value={formData.poc3.phone} onChange={e => onPocChange('poc3', 'phone', e.target.value)} />
          </div>
        </div>
        <div className="form-row" style={{ marginTop: '0.75rem', alignItems: 'center', gap: '1.5rem' }}>
          <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
            <label className="toggle-container" style={{ margin: 0 }}>
              <input type="checkbox" className="toggle-input"
                checked={formData.poc3.whatsappSame} onChange={e => onPocChange('poc3', 'whatsappSame', e.target.checked)} />
              <span className="toggle-switch"></span>
            </label>
            <span style={{ fontSize: '0.8rem' }}>WhatsApp same as Phone</span>
          </div>
          <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
            <label className="toggle-container" style={{ margin: 0 }}>
              <input type="checkbox" className="toggle-input"
                checked={formData.poc3.onboardingKits} onChange={e => onPocChange('poc3', 'onboardingKits', e.target.checked)} />
              <span className="toggle-switch"></span>
            </label>
            <span style={{ fontSize: '0.8rem', fontWeight: 500 }}>Receives Onboarding Kits</span>
          </div>
        </div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
          Communication Preferences:
          <label style={{ marginLeft: '0.5rem', fontSize: '0.75rem', cursor: 'pointer' }}><input type="checkbox" checked={formData.poc3.prefs.email} onChange={e => onPocPrefChange('poc3', 'email', e.target.checked)} /> ✉️ Email</label>
          <label style={{ marginLeft: '0.5rem', fontSize: '0.75rem', cursor: 'pointer' }}><input type="checkbox" checked={formData.poc3.prefs.sms} onChange={e => onPocPrefChange('poc3', 'sms', e.target.checked)} /> 📱 SMS</label>
          <label style={{ marginLeft: '0.5rem', fontSize: '0.75rem', cursor: 'pointer' }}><input type="checkbox" checked={formData.poc3.prefs.wa} onChange={e => onPocPrefChange('poc3', 'wa', e.target.checked)} /> 💬 WhatsApp</label>
        </div>
      </div>

      {/* Dynamic Additional Contacts */}
      <div id="extra-contacts-container">
        {hook.extraContacts.map((contact, idx) => (
          <div key={contact.id} style={{
            background: '#FAFBFC', border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)', padding: '1rem', marginBottom: '1rem', position: 'relative'
          }}>
            <button type="button" onClick={() => hook.removeExtraContact(contact.id)}
              style={{ position: 'absolute', top: '10px', right: '10px', background: 'none', border: 'none', color: 'var(--status-danger)', cursor: 'pointer', fontSize: '1rem' }}>
              ✖
            </button>
            <div className="form-group" style={{ maxWidth: '200px' }}>
              <label>Role</label>
              <select className="form-control" value={contact.role} onChange={e => hook.updateExtraContact(contact.id, 'role', e.target.value)}>
                <option value="operations">Operations</option>
                <option value="legal">Legal</option>
                <option value="compliance">Compliance</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Name</label>
                <input type="text" className="form-control" value={contact.name} onChange={e => hook.updateExtraContact(contact.id, 'name', e.target.value)} />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input type="email" className="form-control" value={contact.email} onChange={e => hook.updateExtraContact(contact.id, 'email', e.target.value)} />
              </div>
              <div className="form-group">
                <label>Phone</label>
                <input type="tel" className="form-control" value={contact.phone} onChange={e => hook.updateExtraContact(contact.id, 'phone', e.target.value)} />
              </div>
            </div>
          </div>
        ))}
      </div>
      <button type="button" className="btn btn-secondary btn-xs" onClick={() => hook.addExtraContact()} style={{ marginTop: '0.75rem', marginBottom: '1.5rem' }}>
        ➕ Add Another Contact
      </button>
    </>
  );
}
