import React from 'react';
import { COMPANY_TYPES, INDUSTRIES, COUNTRIES } from '../constants/clientFormData';
import { Building2 } from 'lucide-react';

export default function IdentitySection({ formData, errors, hints, onChange, onValidate, hook }) {
  const isIndia = formData.country === 'India';
  const isTrust = formData.companyType === 'trust';
  const isGovt = formData.companyType === 'govt';

  return (
    <>
      <div className="section-header">
        <div className="section-icon"><Building2 size={18} /></div>
        <h3>Company Identity</h3>
        <span className="section-badge">MANDATORY</span>
      </div>

      {/* Row 1: Company Name & Type */}
      <div className="form-grid-3col">
        <div className="form-group col-span-2">
          <label>Legal Company Name <span style={{ color: 'var(--status-danger)' }}>*</span></label>
          <input type="text" className={`form-control ${errors.companyName ? 'invalid' : ''}`}
            placeholder="e.g. Mahindra & Mahindra Limited"
            value={formData.companyName}
            onChange={e => { onChange('companyName', e.target.value); hook.markProgress(1); }}
            onBlur={e => {
              if (e.target.value.trim() && !formData.clientCode && !hook.isEditMode && hook.autoGenerateCode) {
                hook.autoGenerateCode(e.target.value);
              }
            }} />

          {errors.companyName && <div className={`field-msg ${errors.companyName?.type || 'error'} show`}>{errors.companyName?.msg || errors.companyName}</div>}
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
          {errors.companyType && <div className={`field-msg ${errors.companyType?.type || 'error'} show`}>{errors.companyType?.msg || errors.companyType}</div>}
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
          {errors.trustRegNo && <div className={`field-msg ${errors.trustRegNo?.type || 'error'} show`}>{errors.trustRegNo?.msg || errors.trustRegNo}</div>}
          <div className="field-hint">Required for tax-exempt verification.</div>
        </div>
      )}

      {/* Row 2 & 3: Tax & Registration Details (3 Columns) */}
      {isIndia && (
        <>
          <div className="form-grid-3col">
            {!isGovt && !isTrust && (
              <div className="form-group">
                <label htmlFor="gstin">GSTIN <span style={{ color: 'var(--status-danger)' }}>*</span></label>
                <input type="text" id="gstin" name="gstin" className={`form-control ${errors.gstin ? 'invalid' : ''}`}
                  placeholder="e.g. 27AAACM1234A1Z1" maxLength="15"
                  style={{ textTransform: 'uppercase' }}
                  value={formData.gstin}
                  onBlur={async (e) => {
                    const val = e.target.value.trim();
                    if (!val || val.length !== 15) return;
                    try {
                      const ignoreId = hook.editId ? `&ignore_id=${hook.editId}` : '';
                      const res = await fetch(`/clients/check-unique?field=gstin&value=${encodeURIComponent(val)}${ignoreId}`);
                      const data = await res.json();
                      if (!data.available) {
                        hook.setErrors(prev => ({ ...prev, gstin: { msg: data.message, type: 'error' } }));
                      }
                    } catch (err) {}
                  }}
                  onChange={e => {
                    const val = hook.validateGSTIN(e.target.value);
                    onChange('gstin', val);
                  }} />
                {errors.gstin && <div className={`field-msg ${errors.gstin?.type || 'error'} show`}>{errors.gstin?.msg || errors.gstin}</div>}
                <div className={`field-hint ${hints?.gstin?.type || ''}`}>
                  {hints?.gstin?.text || '15-character GST Registration No.'}
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
            <div className="form-group">
              <label>Company PAN <span style={{ color: 'var(--status-danger)' }}>*</span></label>
              <input type="text" className={`form-control ${errors.pan ? 'invalid' : ''}`}
                placeholder="e.g. AAACM1234A" maxLength="10"
                style={{ textTransform: 'uppercase' }}
                value={formData.pan}
                onBlur={() => hook.checkLiveUniqueness('pan', formData.pan, 'pan')}
                onChange={e => {
                  const val = hook.validatePAN(e.target.value);
                  onChange('pan', val);
                }} />
              {errors.pan && <div className={`field-msg ${errors.pan?.type || 'error'} show`}>{errors.pan?.msg || errors.pan}</div>}
              <div className={`field-hint ${hints?.pan?.type || ''}`}>
                {hints?.pan?.text || '10-character PAN number.'}
              </div>
            </div>
          </div>

          <div className="form-grid-3col">
            <div className="form-group">
              <label>
                TAN (Tax Deduction Account) <span style={{ color: 'var(--status-danger)' }}>*</span>
              </label>
              <input type="text" className={`form-control ${errors.tan ? 'invalid' : ''}`}
                placeholder="e.g. MUMD12345A" maxLength="10"
                style={{ textTransform: 'uppercase' }}
                value={formData.tan}
                onBlur={() => hook.checkLiveUniqueness('tan', formData.tan, 'tan')}
                onChange={e => {
                  const val = hook.validateTAN(e.target.value);
                  onChange('tan', val);
                }} />
              {errors.tan && <div className={`field-msg ${errors.tan?.type || 'error'} show`}>{errors.tan?.msg || errors.tan}</div>}
              <div className={`field-hint ${hints?.tan?.type || ''}`}>
                {hints?.tan?.text || 'Required for TDS filing.'}
              </div>
            </div>
            <div className="form-group">
              <label>CIN / LLPIN <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span></label>
              <input type="text" className="form-control" placeholder="e.g. U72900MH2010PTC123456"
                style={{ textTransform: 'uppercase' }}
                value={formData.cin}
                onChange={e => {
                  const val = hook.validateCIN(e.target.value);
                  onChange('cin', val);
                }} />
              <div className={`field-hint ${hints?.cin?.type || ''}`}>
                {hints?.cin?.text || '21-char Corporate ID Number.'}
              </div>
            </div>
            <div className="form-group">
              <label>Date of Incorporation</label>
              <input type="date" className={`form-control ${errors.incorporationDate ? 'invalid' : ''}`}
                value={formData.incorporationDate}
                onChange={e => { onChange('incorporationDate', e.target.value); hook.checkIncorporation(e.target.value); }} />
              {errors.incorporationDate && <div className={`field-msg ${errors.incorporationDate?.type || 'error'} show`}>{errors.incorporationDate?.msg || errors.incorporationDate}</div>}
              <div className="field-hint">Used for gratuity eligibility.</div>
            </div>
          </div>
        </>
      )}

      {/* Row 4: Statutory EOR Codes & Client Code (3 Columns) */}
      <div className="form-grid-3col">
        <div className="form-group">
          <label style={{ color: 'var(--text-primary)' }}>PF Establishment Code <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(EOR)</span></label>
          <input type="text" className="form-control text-gray-700" placeholder="e.g. MH/BAN/1234567/000"
            style={{ textTransform: 'uppercase' }}
            value={formData.pfEstablishmentCode || ''}
            onChange={e => onChange('pfEstablishmentCode', e.target.value)} />
          <div className="field-hint">Client statutory PF code.</div>
        </div>
        <div className="form-group">
          <label style={{ color: 'var(--text-primary)' }}>ESI Code Number <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(EOR)</span></label>
          <input type="text" className="form-control text-gray-700" placeholder="e.g. 31001234560001001"
            style={{ textTransform: 'uppercase' }}
            value={formData.esiCodeNumber || ''}
            onChange={e => onChange('esiCodeNumber', e.target.value)} />
          <div className="field-hint">Client statutory ESI employer code.</div>
        </div>
        <div className="form-group">
          <label>Client Code (Internal) <span style={{ color: 'var(--status-danger)' }}>*</span></label>
          <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
            <input type="text" className={`form-control ${errors.clientCode ? 'invalid' : ''}`}
              placeholder="e.g. MAH-012"
              value={formData.clientCode}
              onBlur={() => hook.checkLiveUniqueness('client_code', formData.clientCode, 'clientCode')}
              onChange={e => onChange('clientCode', e.target.value.toUpperCase())} />
            <button type="button" className="btn btn-secondary btn-sm" onClick={hook.generateClientCode} title="Auto-generate from company name" style={{ whiteSpace: 'nowrap' }}>
              ⚡ Auto
            </button>
          </div>
          {errors.clientCode && <div className={`field-msg ${errors.clientCode?.type || 'error'} show`}>{errors.clientCode?.msg || errors.clientCode}</div>}
        </div>
      </div>

      <div className="form-grid-3col">
        <div className="form-group">
          <label>Industry / Sector <span style={{ color: 'var(--status-danger)' }}>*</span></label>
          <select className={`form-control ${errors.industry ? 'invalid' : ''}`}
            value={formData.industry} onChange={e => onChange('industry', e.target.value)}>
            <option value="">-- Select --</option>
            {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
          </select>
          {errors.industry && <div className={`field-msg ${errors.industry?.type || 'error'} show`}>{errors.industry?.msg || errors.industry}</div>}
        </div>
        <div className="form-group">
          <label>Client Status</label>
          <select className="form-control" value={formData.clientStatus} onChange={e => onChange('clientStatus', e.target.value)}>
            <option value="active">Active</option>
            <option value="onboarding">In Onboarding</option>
            <option value="suspended">Suspended</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
        <div className="form-group">
          <label>Number of Work Locations</label>
          <input type="number" className="form-control" placeholder="1" min="1" max="100"
            value={formData.workLocationsCount || '1'} onChange={e => onChange('workLocationsCount', e.target.value)} />
        </div>
      </div>

      {/* Group Company Toggle & Parent Company */}
      <div className="form-grid-3col" style={{ alignItems: 'center' }}>
        <div className="form-group col-span-3">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <label className="toggle-container" style={{ margin: 0 }}>
              <input type="checkbox" className="toggle-input"
                checked={formData.isGroupCompany}
                onChange={e => onChange('isGroupCompany', e.target.checked)} />
              <span className="toggle-switch"></span>
            </label>
            <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              Is part of a Group / Holding Company
            </span>
          </div>
        </div>

        {formData.isGroupCompany && (
          <div className="form-group col-span-3" style={{ marginTop: '0.25rem' }}>
            <label>Parent Company</label>
            <input type="text" className="form-control" placeholder="Type parent company name..."
              value={formData.parentCompany}
              onChange={e => onChange('parentCompany', e.target.value)} />
            <div className="field-hint">Links this client under a parent for consolidated billing reports.</div>
          </div>
        )}
      </div>
    </>
  );
}
