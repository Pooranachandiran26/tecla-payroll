import React from 'react';
import { COMPANY_TYPES, INDUSTRIES, COUNTRIES } from '../constants/clientFormData';

export default function IdentitySection({ formData, errors, hints, onChange, onValidate, hook }) {
  const isIndia = formData.country === 'India';
  const isTrust = formData.companyType === 'trust';
  const isGovt = formData.companyType === 'govt';

  return (
    <>
      <div className="section-header">
        <div className="section-icon">🏢</div>
        <h3>Company Identity</h3>
        <span className="section-badge">MANDATORY</span>
      </div>

      {/* Company Name & Type */}
      <div className="form-row">
        <div className="form-group" style={{ flex: 2 }}>
          <label>Legal Company Name <span style={{ color: 'var(--status-danger)' }}>*</span></label>
          <input type="text" className={`form-control ${errors.companyName ? 'invalid' : ''}`}
            placeholder="e.g. Mahindra & Mahindra Limited"
            value={formData.companyName}
            onChange={e => { onChange('companyName', e.target.value); hook.markProgress(1); }} />
          <div className="field-hint">Enter the exact legal name as per MCA registration.</div>
        </div>
        <div className="form-group">
          <label>Company Type <span style={{ color: 'var(--status-danger)' }}>*</span></label>
          <select className={`form-control ${errors.companyType ? 'invalid' : ''}`}
            value={formData.companyType}
            onChange={e => hook.handleCompanyType(e.target.value)}>
            <option value="">-- Select --</option>
            {COMPANY_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
      </div>

      {/* Trust / NGO Registration */}
      {isTrust && (
        <div className="form-group" style={{ marginBottom: '1rem' }}>
          <label>Trust/NGO Registration Number <span style={{ color: 'var(--status-danger)' }}>*</span></label>
          <input type="text" className={`form-control ${errors.trustRegNo ? 'invalid' : ''}`}
            placeholder="e.g. REG/1234/2026"
            value={formData.trustRegNo}
            onChange={e => onChange('trustRegNo', e.target.value)} />
          <div className="field-hint">Required for tax-exempt verification.</div>
        </div>
      )}

      {/* GSTIN & GST Type (India only, not govt/trust) */}
      {isIndia && (
        <div className="form-row">
          {!isGovt && !isTrust && (
            <div className="form-group">
              <label>GSTIN <span style={{ color: 'var(--status-danger)' }}>*</span></label>
              <input type="text" className={`form-control ${errors.gstin ? 'invalid' : ''}`}
                placeholder="e.g. 27AAACM1234A1Z1" maxLength="15"
                style={{ textTransform: 'uppercase' }}
                value={formData.gstin}
                onChange={e => {
                  const val = hook.validateGSTIN(e.target.value);
                  onChange('gstin', val);
                }} />
              <div className={`field-hint ${hints.gstin?.type || ''}`}>
                {hints.gstin?.text || '15-character alphanumeric GST Identification Number.'}
              </div>
            </div>
          )}
          <div className="form-group">
            <label>GST Registration Type</label>
            <select className="form-control" value={formData.gstType}
              onChange={e => onChange('gstType', e.target.value)}>
              <option value="regular">Regular Taxpayer</option>
              <option value="composition">Composition Scheme</option>
              <option value="unregistered">Unregistered (Exempt)</option>
            </select>
          </div>
        </div>
      )}

      {/* PAN & TAN (India only) */}
      {isIndia && (
        <div className="form-row">
          <div className="form-group">
            <label>Company PAN <span style={{ color: 'var(--status-danger)' }}>*</span></label>
            <input type="text" className={`form-control ${errors.pan ? 'invalid' : ''}`}
              placeholder="e.g. AAACM1234A" maxLength="10"
              style={{ textTransform: 'uppercase' }}
              value={formData.pan}
              onChange={e => {
                const val = hook.validatePAN(e.target.value);
                onChange('pan', val);
              }} />
            <div className={`field-hint ${hints.pan?.type || ''}`}>
              {hints.pan?.text || '10-character PAN as per Income Tax.'}
            </div>
          </div>
          <div className="form-group">
            <label>TAN (Tax Deduction Account No.)</label>
            <input type="text" className={`form-control ${errors.tan ? 'invalid' : ''}`}
              placeholder="e.g. MUMD12345A" maxLength="10"
              style={{ textTransform: 'uppercase' }}
              value={formData.tan}
              onChange={e => {
                const val = hook.validateTAN(e.target.value);
                onChange('tan', val);
              }} />
            <div className={`field-hint ${hints.tan?.type || ''}`}>
              {hints.tan?.text || 'Required for TDS deduction filing.'}
            </div>
          </div>
        </div>
      )}

      {/* CIN & Incorporation Date */}
      <div className="form-row">
        <div className="form-group">
          <label>CIN / LLPIN <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(if applicable)</span></label>
          <input type="text" className="form-control" placeholder="e.g. U72900MH2010PTC123456"
            style={{ textTransform: 'uppercase' }}
            value={formData.cin}
            onChange={e => {
              const val = hook.validateCIN(e.target.value);
              onChange('cin', val);
            }} />
          <div className={`field-hint ${hints.cin?.type || ''}`}>
            {hints.cin?.text || '21-character Corporate Identity Number from MCA.'}
          </div>
        </div>
        <div className="form-group">
          <label>Date of Incorporation</label>
          <input type="date" className={`form-control ${errors.incorporationDate ? 'invalid' : ''}`}
            value={formData.incorporationDate}
            onChange={e => { onChange('incorporationDate', e.target.value); hook.checkIncorporation(e.target.value); }} />
          <div className="field-hint">Must be in the past. Used for gratuity eligibility calculations.</div>
        </div>
      </div>

      {/* Client Code */}
      <div className="form-group">
        <label>Client Code (Internal) <span style={{ color: 'var(--status-danger)' }}>*</span></label>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <input type="text" className={`form-control ${errors.clientCode ? 'invalid' : ''}`}
            placeholder="e.g. MAH-012" style={{ maxWidth: '200px' }}
            value={formData.clientCode}
            onChange={e => onChange('clientCode', e.target.value)} />
          <button type="button" className="btn btn-secondary" onClick={hook.autoGenerateCode}
            style={{ whiteSpace: 'nowrap' }}>
            ⚡ Auto-Generate
          </button>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            Unique internal reference code for payroll processing.
          </span>
        </div>
      </div>

      {/* Industry & Status */}
      <div className="form-row">
        <div className="form-group">
          <label>Industry / Sector</label>
          <select className="form-control" value={formData.industry}
            onChange={e => hook.handleIndustryChange(e.target.value)}>
            <option value="">-- Select Industry --</option>
            {INDUSTRIES.map(ind => <option key={ind} value={ind}>{ind}</option>)}
          </select>
          {formData.industry === 'Other' && (
            <div className="form-group" style={{ marginTop: '0.5rem' }}>
              <label>Sub-Industry / Specialization</label>
              <input type="text" className="form-control" placeholder="e.g. IT Staffing, Tech Consulting"
                value={formData.subIndustry}
                onChange={e => onChange('subIndustry', e.target.value)} />
            </div>
          )}
        </div>
        <div className="form-group">
          <label>Client Status</label>
          <select className="form-control" value={formData.clientStatus}
            onChange={e => onChange('clientStatus', e.target.value)}>
            <option value="onboarding">Onboarding (Draft)</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>
      </div>

      {/* Work Locations & Group Company */}
      <div className="form-row" style={{ marginTop: '1rem' }}>
        <div className="form-group">
          <label>Number of Work Locations</label>
          <input type="number" className="form-control" min="1"
            value={formData.workLocationsCount}
            onChange={e => onChange('workLocationsCount', e.target.value)} />
          <div className="field-hint">If &gt; 1, Professional Tax will be computed per candidate work state.</div>
        </div>
        <div className="form-group">
          <label style={{ display: 'block', marginBottom: '0.5rem' }}>Group / Holding Company</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.5rem' }}>
            <label className="toggle-container" style={{ margin: 0 }}>
              <input type="checkbox" className="toggle-input"
                checked={formData.isGroupCompany}
                onChange={e => onChange('isGroupCompany', e.target.checked)} />
              <span className="toggle-switch"></span>
            </label>
            <span style={{ fontSize: '0.875rem' }}>Is part of a Group Company</span>
          </div>
        </div>
      </div>

      {formData.isGroupCompany && (
        <div className="form-group" style={{ marginTop: '1rem' }}>
          <label>Parent Company</label>
          <input type="text" className="form-control" placeholder="Type parent company name..."
            value={formData.parentCompany}
            onChange={e => onChange('parentCompany', e.target.value)} />
          <div className="field-hint">Links this client under a parent for consolidated billing reports.</div>
        </div>
      )}
    </>
  );
}
