import React from 'react';
import { usePage } from '@inertiajs/react';
import { PT_STATES, STATE_REG_OPTIONS } from '../constants/clientFormData';

export default function StatutorySection({ formData, onChange, hook }) {
  const { auth } = usePage().props;
  const canEdit = auth.user.role === 'admin';
  const lockProps = !canEdit ? { disabled: true, readOnly: true, title: "Statutory defaults can only be changed by an Agency Admin" } : {};
  return (
    <>
      <div className="section-header">
        <div className="section-icon">⚖️</div>
        <h3>Statutory Defaults for This Client</h3>
        <span className="section-badge">INHERITED BY CANDIDATES</span>
      </div>

      <div className="warn-box" style={{ marginBottom: '1rem' }}>
        ⚠️ These are <strong>default settings</strong> applied to ALL new candidates registered under this client.
        Individual overrides can be done on each candidate's profile page.
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>

        {/* PF */}
        <div className="stat-row">
          <div className="stat-info">
            <strong>Provident Fund (PF) — EPFO</strong>
            <span>Employee: 12% of Basic. Employer: 12% (3.67% EPF + 8.33% EPS). Applicable on Basic up to ₹15,000.</span>
          </div>
          <div className="stat-rate">
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>Wage Ceiling Override (₹)</div>
            <input type="number" className="stat-rate-input" placeholder="15000"
              value={formData.pfCeiling} onChange={e => hook.handlePFCeiling(e.target.value)} onWheel={e => e.target.blur()} {...lockProps} />
            <div className={`field-hint ${hook.getPFCeilingHint().type}`} style={{ fontSize: '0.65rem', marginTop: '0.2rem' }}>
              {hook.getPFCeilingHint().text}
            </div>
          </div>
          <div className="stat-toggle">
            <label className="toggle-container" title={lockProps.title}>
              <input type="checkbox" className="toggle-input"
                checked={formData.pfApplicable} onChange={e => onChange('pfApplicable', e.target.checked)} {...lockProps} />
              <span className="toggle-switch"></span>
            </label>
          </div>
        </div>

        {/* EPF Admin Charges */}
        <div className="stat-row" style={{ background: '#F8FAFC', border: '1px dashed var(--border-color)' }}>
          <div className="stat-info">
            <strong>EPF Admin Charges</strong>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>0.5% on EPF wages (minimum ₹500/month). Paid by employer to EPFO.</span>
          </div>
          <div className="stat-rate"></div>
          <div><span className="badge badge-neutral" style={{ fontSize: '0.65rem', background: 'var(--border-color)', color: 'var(--text-main)' }}>Auto-Computed</span></div>
        </div>

        {/* EDLI */}
        <div className="stat-row" style={{ background: '#F8FAFC', border: '1px dashed var(--border-color)' }}>
          <div className="stat-info">
            <strong>EDLI (Employees' Deposit Linked Insurance)</strong>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>0.5% on wages up to ₹15,000. Employer contribution only.</span>
          </div>
          <div className="stat-rate"></div>
          <div><span className="badge badge-neutral" style={{ fontSize: '0.65rem', background: 'var(--border-color)', color: 'var(--text-main)' }}>Auto-Computed</span></div>
        </div>

        {/* ESI */}
        <div className="stat-row">
          <div className="stat-info">
            <strong>Employee State Insurance (ESI) — ESIC</strong>
            <span>Employee: 0.75% of Gross. Employer: 3.25% of Gross. Applicable if Gross ≤ ₹21,000/month.</span>
          </div>
          <div className="stat-rate">
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>Gross Limit Override (₹)</div>
            <input type="number" className="stat-rate-input" placeholder="21000"
              value={formData.esiLimit} onChange={e => hook.handleESILimit(e.target.value)} onWheel={e => e.target.blur()} {...lockProps} />
            <div className={`field-hint ${hook.getESILimitHint().type}`} style={{ fontSize: '0.65rem', marginTop: '0.2rem' }}>
              {hook.getESILimitHint().text}
            </div>
          </div>
          <div className="stat-toggle">
            <label className="toggle-container" title={lockProps.title}>
              <input type="checkbox" className="toggle-input"
                checked={formData.esiApplicable} onChange={e => onChange('esiApplicable', e.target.checked)} {...lockProps} />
              <span className="toggle-switch"></span>
            </label>
          </div>
        </div>

        {/* PT */}
        <div className="stat-row">
          <div className="stat-info">
            <strong>Professional Tax (PT) — State Govt.</strong>
            <span>Deducted per state-specific slabs. Maharashtra: Max ₹200/month. Computed from candidate work location.</span>
          </div>
          <div className="stat-rate">
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>Override State Slab</div>
            <select className="stat-rate-input" value={formData.ptState} onChange={e => onChange('ptState', e.target.value)} {...lockProps}>
              {PT_STATES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          <div className="stat-toggle">
            <label className="toggle-container" title={lockProps.title}>
              <input type="checkbox" className="toggle-input"
                checked={formData.ptApplicable} onChange={e => onChange('ptApplicable', e.target.checked)} {...lockProps} />
              <span className="toggle-switch"></span>
            </label>
          </div>
        </div>

        {/* LWF */}
        <div className="stat-row">
          <div className="stat-info">
            <strong>Labour Welfare Fund (LWF) — State Govt.</strong>
            <span>Bi-annual or annual deduction. Amount varies by state (e.g. Maharashtra: ₹6 employee + ₹12 employer per June & Dec).</span>
          </div>
          <div className="stat-rate">
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>LWF Frequency</div>
            <select className="stat-rate-input" value={formData.lwfFrequency} onChange={e => onChange('lwfFrequency', e.target.value)} {...lockProps}>
              <option value="biannual">Bi-Annual (Jun & Dec)</option>
              <option value="annual">Annual (Dec only)</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>
          <div className="stat-toggle">
            <label className="toggle-container" title={lockProps.title}>
              <input type="checkbox" className="toggle-input"
                checked={formData.lwfApplicable} onChange={e => onChange('lwfApplicable', e.target.checked)} {...lockProps} />
              <span className="toggle-switch"></span>
            </label>
          </div>
        </div>

        {/* TDS */}
        <div className="stat-row">
          <div className="stat-info">
            <strong>TDS (Tax Deducted at Source) — Income Tax Act</strong>
            <span>Deducted under Sec 192. New Regime is default since FY 2023-24. Employee can opt for Old Regime via declaration.</span>
          </div>
          <div className="stat-rate">
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>Default Tax Regime</div>
            <select className="stat-rate-input" value={formData.tdsRegime} onChange={e => onChange('tdsRegime', e.target.value)} {...lockProps}>
              <option value="new">New Regime (Default)</option>
              <option value="old">Old Regime</option>
              <option value="employee_choice">Employee's Choice</option>
            </select>
          </div>
          <div className="stat-toggle">
            <label className="toggle-container" title={lockProps.title}>
              <input type="checkbox" className="toggle-input"
                checked={formData.tdsApplicable} onChange={e => onChange('tdsApplicable', e.target.checked)} {...lockProps} />
              <span className="toggle-switch"></span>
            </label>
          </div>
        </div>

        {/* Gratuity */}
        <div className="stat-row">
          <div className="stat-info">
            <strong>Gratuity — Payment of Gratuity Act</strong>
            <span>4.81% of Basic (15 days wages per year). Payable after 5 years continuous service.</span>
          </div>
          <div className="stat-rate">
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>Gratuity Treatment</div>
            <select className="stat-rate-input" value={formData.gratuityMode} onChange={e => onChange('gratuityMode', e.target.value)} {...lockProps}>
              <option value="ctc_included">Deduct from CTC (Accrued)</option>
              <option value="over_above">Over & Above CTC (Client bears cost)</option>
              <option value="none">Not Accrued (Paid out on event)</option>
            </select>
          </div>
          <div className="stat-toggle">
            <label className="toggle-container" title={lockProps.title}>
              <input type="checkbox" className="toggle-input"
                checked={formData.gratuityApplicable} onChange={e => onChange('gratuityApplicable', e.target.checked)} {...lockProps} />
              <span className="toggle-switch"></span>
            </label>
          </div>
        </div>

        {/* Statutory Bonus */}
        <div className="stat-row">
          <div className="stat-info">
            <strong>Statutory Bonus — Payment of Bonus Act</strong>
            <span>Minimum 8.33%, Maximum 20% of Basic (or ₹7,000, whichever is higher) for Basic ≤ ₹21,000/month.</span>
          </div>
          <div className="stat-rate">
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>Accrual %</div>
            <input type="number" className="stat-rate-input" placeholder="8.33" step="0.01" max="20" min="8.33"
              value={formData.bonusPct} onChange={e => onChange('bonusPct', e.target.value)} onWheel={e => e.target.blur()} {...lockProps} />
          </div>
          <div className="stat-toggle">
            <label className="toggle-container" title={lockProps.title}>
              <input type="checkbox" className="toggle-input"
                checked={formData.bonusApplicable} onChange={e => onChange('bonusApplicable', e.target.checked)} {...lockProps} />
              <span className="toggle-switch"></span>
            </label>
          </div>
        </div>

        {/* LOP Calculation */}
        <div className="stat-row" style={{ border: 'none', background: 'none', padding: 0 }}>
          <div className="stat-info" style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '1rem' }}>
            <div>
              <strong style={{ fontSize: '0.85rem' }}>Loss of Pay (LOP) Divisor Basis</strong>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Denominator used for daily wage calculation (Basic / X).</div>
            </div>
            <select className="form-control" style={{ width: 'auto', minWidth: '320px', maxWidth: '100%' }}
              value={formData.lopBasis} onChange={e => onChange('lopBasis', e.target.value)} {...lockProps}>
              <option value="26">26 Working Days (excludes Sundays)</option>
              <option value="30">30 Calendar Days</option>
              <option value="calendar">Actual Calendar Days (28/29/30/31)</option>
              <option value="working">Actual Working Days in Month</option>
            </select>
          </div>
        </div>

      </div>

      {formData.hasAgencyBranches && (
        <div style={{ marginTop: '2rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h4 style={{ fontSize: '0.95rem', color: 'var(--primary-navy)', margin: 0 }}>State Registrations (Agency Branches)</h4>
            <button type="button" className="btn btn-secondary btn-xs" onClick={hook.addStateRegistration}>+ Add Registration</button>
          </div>
          {hook.stateRegistrations.map((reg, idx) => (
            <div key={idx} style={{ display: 'flex', gap: '1rem', marginBottom: '0.75rem', alignItems: 'center' }}>
              <select className="form-control" value={reg.state} onChange={e => hook.updateStateRegistration(idx, 'state', e.target.value)}>
                <option value="">-- State --</option>
                {STATE_REG_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
              <input type="text" className="form-control" placeholder="PT Registration Number"
                value={reg.ptRegNo} onChange={e => hook.updateStateRegistration(idx, 'ptRegNo', e.target.value)} />
              <input type="text" className="form-control" placeholder="LWF Registration Number"
                value={reg.lwfRegNo} onChange={e => hook.updateStateRegistration(idx, 'lwfRegNo', e.target.value)} />
              <button type="button" onClick={() => hook.removeStateRegistration(idx)}
                style={{ background: 'none', border: 'none', color: 'var(--status-danger)', cursor: 'pointer', fontSize: '1rem', padding: '0 0.5rem' }}>✖</button>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
