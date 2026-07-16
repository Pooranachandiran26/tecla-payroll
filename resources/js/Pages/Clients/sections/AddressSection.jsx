import React from 'react';
import { INDIAN_STATES, COUNTRIES } from '../constants/clientFormData';

export default function AddressSection({ formData, errors, onChange, hook }) {
  const isIndia = formData.country === 'India';

  return (
    <>
      <div className="section-header">
        <div className="section-icon">📍</div>
        <h3>Registered &amp; Billing Address</h3>
      </div>

      {/* Registered Address */}
      <div className="form-group">
        <label>Registered Office Address Line 1 <span style={{ color: 'var(--status-danger)' }}>*</span></label>
        <input type="text" className={`form-control ${errors.regAddressLine1 ? 'invalid' : ''}`}
          placeholder="Building Name, Street" value={formData.regAddressLine1}
          onChange={e => onChange('regAddressLine1', e.target.value)} />
        {errors.regAddressLine1 && <div className={`field-msg ${errors.regAddressLine1?.type || 'error'} show`}>{errors.regAddressLine1?.msg || errors.regAddressLine1}</div>}
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Address Line 2</label>
          <input type="text" className="form-control" placeholder="Area, Locality"
            value={formData.regAddressLine2}
            onChange={e => onChange('regAddressLine2', e.target.value)} />
        </div>
        <div className="form-group">
          <label>City <span style={{ color: 'var(--status-danger)' }}>*</span></label>
          <input type="text" className={`form-control ${errors.regCity ? 'invalid' : ''}`}
            placeholder="e.g. Mumbai" value={formData.regCity}
            onChange={e => onChange('regCity', e.target.value)} />
          {errors.regCity && <div className={`field-msg ${errors.regCity?.type || 'error'} show`}>{errors.regCity?.msg || errors.regCity}</div>}
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>State <span style={{ color: 'var(--status-danger)' }}>*</span></label>
          <select className={`form-control ${errors.regState ? 'invalid' : ''}`}
            value={formData.regState}
            onChange={e => onChange('regState', e.target.value)}>
            <option value="">-- Select State --</option>
            {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          {errors.regState && <div className={`field-msg ${errors.regState?.type || 'error'} show`}>{errors.regState?.msg || errors.regState}</div>}
        </div>
        <div className="form-group">
          <label>PIN Code <span style={{ color: 'var(--status-danger)' }}>*</span></label>
          <input type="text" className={`form-control ${errors.regPin ? 'invalid' : ''}`}
            placeholder="e.g. 400018" maxLength="6" value={formData.regPin}
            onChange={e => {
              const val = hook.validatePIN(e.target.value);
              onChange('regPin', val);
            }} />
          {errors.regPin && <div className={`field-msg ${errors.regPin?.type || 'error'} show`}>{errors.regPin?.msg || errors.regPin}</div>}
        </div>
        <div className="form-group">
          <label>Country</label>
          <select className="form-control" value={formData.country}
            onChange={e => hook.handleCountryChange(e.target.value)}>
            {COUNTRIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>
      </div>

      {/* Non-India: Tax ID & Registration Number */}
      {!isIndia && (
        <div className="form-row" style={{ marginTop: '1rem' }}>
          <div className="form-group">
            <label>Tax ID (Generic) <span style={{ color: 'var(--status-danger)' }}>*</span></label>
            <input type="text" className={`form-control ${errors.taxId ? 'invalid' : ''}`}
              placeholder="e.g. EIN-12345678" value={formData.taxId}
              onChange={e => onChange('taxId', e.target.value)} />
            {errors.taxId && <div className={`field-msg ${errors.taxId?.type || 'error'} show`}>{errors.taxId?.msg || errors.taxId}</div>}
          </div>
          <div className="form-group">
            <label>Registration Number <span style={{ color: 'var(--status-danger)' }}>*</span></label>
            <input type="text" className={`form-control ${errors.regNo ? 'invalid' : ''}`}
              placeholder="e.g. REG-87654321" value={formData.regNo}
              onChange={e => onChange('regNo', e.target.value)} />
            {errors.regNo && <div className={`field-msg ${errors.regNo?.type || 'error'} show`}>{errors.regNo?.msg || errors.regNo}</div>}
          </div>
        </div>
      )}

      {/* Billing Address Toggle */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem',
        padding: '0.75rem 1rem', background: '#F0F9FF',
        borderRadius: 'var(--radius-sm)', border: '1px solid #BAE6FD',
      }}>
        <label className="toggle-container" style={{ margin: 0 }}>
          <input type="checkbox" className="toggle-input"
            checked={formData.billingSame}
            onChange={e => onChange('billingSame', e.target.checked)} />
          <span className="toggle-switch"></span>
        </label>
        <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>
          Billing address is same as Registered address
        </span>
      </div>

      {!formData.billingSame && (
        <div>
          <h4 style={{ fontSize: '0.9rem', color: 'var(--primary-navy)', marginBottom: '1rem' }}>
            Billing Address (for Invoice)
          </h4>
          <div className="form-group">
            <label>Billing Address Line 1</label>
            <input type="text" className="form-control" placeholder="Building Name, Street"
              value={formData.billAddressLine1}
              onChange={e => onChange('billAddressLine1', e.target.value)} />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>City</label>
              <input type="text" className="form-control" value={formData.billCity}
                onChange={e => onChange('billCity', e.target.value)} />
            </div>
            <div className="form-group">
              <label>State</label>
              <select className="form-control" value={formData.billState}
                onChange={e => onChange('billState', e.target.value)}>
                <option value="">-- Select State --</option>
                {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>PIN Code</label>
              <input type="text" className="form-control" maxLength="6"
                value={formData.billPin}
                onChange={e => onChange('billPin', e.target.value)} />
            </div>
          </div>
        </div>
      )}

      {/* Client Branches / Work Locations */}
      <div style={{
        marginTop: '1.5rem', borderTop: '2px solid var(--border-color)',
        paddingTop: '1.25rem',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div>
            <h4 style={{ fontSize: '0.95rem', color: 'var(--primary-navy)', margin: 0 }}>
              🏢 Client Branches / Work Locations
            </h4>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              Each branch with employees requires a separate GSTIN for compliance.
            </p>
          </div>
          {hook.clientBranches.length < formData.workLocationsCount && !(formData.workLocationsCount === 1 && hook.clientBranches.length === 0) && (
            <button type="button" className="btn btn-secondary"
              onClick={() => hook.addClientBranch()}>
              + Add Branch
            </button>
          )}
        </div>

        {formData.workLocationsCount === 1 ? (
          <div style={{
            padding: '1rem', background: 'var(--bg-light)', borderLeft: '4px solid var(--primary-blue)',
            borderRadius: 'var(--radius-sm)', fontSize: '0.9rem', color: 'var(--primary-navy)'
          }}>
            <strong>Note:</strong> Since "Number of Work Locations" is 1, a default "Head Office" branch is automatically synced with your Registered Office address and GSTIN. You do not need to manually add or edit it.
          </div>
        ) : (
          <div id="client-branches-container" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {hook.clientBranches.map((branch, idx) => (
              <BranchCard key={branch.id} branch={branch} idx={idx}
                errors={errors}
                totalBranches={hook.clientBranches.length}
                onUpdate={hook.updateClientBranch}
                onRemove={hook.removeClientBranch}
                onPrimaryChange={hook.handlePrimaryBranchChange}
                onValidateGSTIN={hook.validateBranchGSTIN} />
            ))}
          </div>
        )}
      </div>

      {/* Agency Branches Toggle */}
      <div style={{ marginTop: '1.5rem' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem',
          padding: '0.75rem 1rem', background: '#FFFBEB',
          borderRadius: 'var(--radius-sm)', border: '1px solid #FDE68A',
        }}>
          <label className="toggle-container" style={{ margin: 0 }}>
            <input type="checkbox" className="toggle-input"
              checked={formData.hasAgencyBranches}
              onChange={e => onChange('hasAgencyBranches', e.target.checked)} />
            <span className="toggle-switch"></span>
          </label>
          <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>
            This client has separate Tecla agency branch registrations
          </span>
        </div>
        {formData.hasAgencyBranches && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <strong style={{ fontSize: '0.85rem', color: 'var(--primary-navy)' }}>Tecla Agency Branches</strong>
              <button type="button" className="btn btn-secondary" onClick={hook.addAgencyBranch} style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}>
                + Add Agency Branch
              </button>
            </div>
            {hook.agencyBranches.map(ab => (
              <div key={ab.id} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', alignItems: 'center' }}>
                <input type="text" className="form-control" placeholder="Branch Name" style={{ flex: 1 }}
                  value={ab.name} onChange={e => hook.updateAgencyBranch(ab.id, 'name', e.target.value)} />
                <input type="text" className="form-control" placeholder="State" style={{ flex: 1 }}
                  value={ab.state} onChange={e => hook.updateAgencyBranch(ab.id, 'state', e.target.value)} />
                <input type="text" className="form-control" placeholder="GSTIN" style={{ flex: 1 }}
                  value={ab.gstin} onChange={e => hook.updateAgencyBranch(ab.id, 'gstin', e.target.value)} />
                <button type="button" onClick={() => hook.removeAgencyBranch(ab.id)}
                  style={{ background: 'none', border: 'none', color: 'var(--status-danger)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, padding: 0 }}>
                  🗑 Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

// ── Branch Card Sub-component ─────────────────
function BranchCard({ branch, idx, errors = {}, totalBranches, onUpdate, onRemove, onPrimaryChange, onValidateGSTIN }) {
  const BRANCH_STATES = [
    'Tamil Nadu', 'Maharashtra', 'Karnataka', 'Delhi (NCT)',
    'Telangana', 'Gujarat', 'West Bengal', 'Rajasthan', 'Uttar Pradesh',
  ];

  return (
    <div className="client-branch-card" style={{
      background: '#FAFBFC', border: '1px solid var(--border-color)',
      borderRadius: 'var(--radius-md)', padding: '1rem', position: 'relative',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
        <strong style={{ fontSize: '0.9rem', color: 'var(--primary-navy)' }}>Branch Details</strong>
        {totalBranches > 1 && (
          <button type="button" onClick={() => onRemove(branch.id)}
            style={{ background: 'none', border: 'none', color: 'var(--status-danger)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, padding: 0 }}>
            🗑 Remove Branch
          </button>
        )}
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Branch Name <span style={{ color: 'var(--status-danger)' }}>*</span></label>
          <input type="text" className={`form-control ${errors[`branches.${idx}.name`] ? 'invalid' : ''}`} placeholder="e.g. Chennai Office"
            value={branch.name}
            onChange={e => onUpdate(branch.id, 'name', e.target.value)} />
        </div>
        <div className="form-group">
          <label>Branch Code</label>
          <input type="text" className="form-control" readOnly
            style={{ background: '#f1f5f9', color: 'var(--text-muted)' }}
            value={branch.code} />
        </div>
      </div>

      <div className="form-group">
        <label>Address Line 1 <span style={{ color: 'var(--status-danger)' }}>*</span></label>
        <input type="text" className={`form-control ${errors[`branches.${idx}.addr1`] ? 'invalid' : ''}`} value={branch.addr1}
          onChange={e => onUpdate(branch.id, 'addr1', e.target.value)} />
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Address Line 2</label>
          <input type="text" className="form-control" value={branch.addr2}
            onChange={e => onUpdate(branch.id, 'addr2', e.target.value)} />
        </div>
        <div className="form-group">
          <label>City <span style={{ color: 'var(--status-danger)' }}>*</span></label>
          <input type="text" className={`form-control ${errors[`branches.${idx}.city`] ? 'invalid' : ''}`} value={branch.city}
            onChange={e => onUpdate(branch.id, 'city', e.target.value)} />
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>State <span style={{ color: 'var(--status-danger)' }}>*</span></label>
          <select className={`form-control ${errors[`branches.${idx}.state`] ? 'invalid' : ''}`} value={branch.state}
            onChange={e => { onUpdate(branch.id, 'state', e.target.value); onValidateGSTIN(branch.id); }}>
            <option value="">-- Select --</option>
            {BRANCH_STATES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label>PIN Code <span style={{ color: 'var(--status-danger)' }}>*</span></label>
          <input type="text" className={`form-control ${errors[`branches.${idx}.pin`] ? 'invalid' : ''}`} maxLength="6" value={branch.pin}
            onChange={e => onUpdate(branch.id, 'pin', e.target.value)} />
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>GSTIN <span style={{ color: 'var(--status-danger)' }}>*</span></label>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <input type="text" className={`form-control ${branch.gstinError ? 'invalid' : branch.gstinValid ? 'valid' : ''}`}
              maxLength="15" style={{ textTransform: 'uppercase' }}
              value={branch.gstin}
              onChange={e => { onUpdate(branch.id, 'gstin', e.target.value.toUpperCase()); onValidateGSTIN(branch.id); }}
              onBlur={() => onValidateGSTIN(branch.id)} />
            <span style={{ position: 'absolute', right: '10px', fontSize: '1.2rem' }}>
              {branch.gstinError ? '❌' : branch.gstinValid ? '✅' : ''}
            </span>
          </div>
          <div className="field-hint" style={{ color: 'var(--text-muted)' }}>
            Format: [State Code][10-digit PAN][1-char entity][1-char Z][1 alphanumeric check]
          </div>
          {branch.gstinError && (
            <div className="field-hint error" style={{ color: 'var(--status-danger)', fontWeight: 600, marginTop: '0.2rem' }}>
              {branch.gstinError}
            </div>
          )}
        </div>
        <div className="form-group">
          <label>GST Registration Type</label>
          <select className="form-control" value={branch.gstType}
            onChange={e => onUpdate(branch.id, 'gstType', e.target.value)}>
            <option value="Regular">Regular</option>
            <option value="Composition">Composition</option>
            <option value="Exempt">Exempt</option>
          </select>
        </div>
      </div>

      {/* Branch Finance POC */}
      <div style={{ borderTop: '1px solid var(--border-color)', margin: '1rem 0', paddingTop: '1rem' }}>
        <strong style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.75rem' }}>
          Branch Finance POC
        </strong>
        <div className="form-row">
          <div className="form-group">
            <label>Name <span style={{ color: 'var(--status-danger)' }}>*</span></label>
            <input type="text" className="form-control" value={branch.pocName}
              onChange={e => onUpdate(branch.id, 'pocName', e.target.value)} />
          </div>
          <div className="form-group">
            <label>Email <span style={{ color: 'var(--status-danger)' }}>*</span></label>
            <input type="email" className="form-control" value={branch.pocEmail}
              onChange={e => onUpdate(branch.id, 'pocEmail', e.target.value)} />
          </div>
          <div className="form-group">
            <label>Phone <span style={{ color: 'var(--status-danger)' }}>*</span></label>
            <input type="tel" className="form-control" maxLength="10" value={branch.pocPhone}
              onChange={e => onUpdate(branch.id, 'pocPhone', e.target.value)} />
          </div>
        </div>
      </div>

      {/* Primary Billing Branch */}
      <div style={{ background: '#F0F9FF', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid #BAE6FD' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0, cursor: 'pointer' }}>
          <input type="radio" name="primary-billing-branch"
            checked={branch.isPrimary}
            onChange={() => onPrimaryChange(branch.id)} />
          <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Primary Billing Branch</span>
        </label>
      </div>
    </div>
  );
}
