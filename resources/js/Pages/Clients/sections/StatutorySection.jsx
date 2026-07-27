import React, { useEffect } from 'react';
import { usePage } from '@inertiajs/react';
import { PT_STATES, STATE_REG_OPTIONS } from '../constants/clientFormData';

const resolveStateName = (st, defaultState = 'Tamil Nadu') => {
  if (!st || st === 'auto') return defaultState;
  const s = String(st).toUpperCase();
  if (s === 'TN' || s === 'TAMIL NADU') return 'Tamil Nadu';
  if (s === 'MH' || s === 'MAHARASHTRA') return 'Maharashtra';
  if (s === 'KA' || s === 'KARNATAKA') return 'Karnataka';
  if (s === 'WB' || s === 'WEST BENGAL') return 'West Bengal';
  if (s === 'TS' || s === 'TELANGANA') return 'Telangana';
  if (s === 'AP' || s === 'ANDHRA PRADESH') return 'Andhra Pradesh';
  if (s === 'NA') return 'Not Applicable';
  return st;
};

const getPtSlabList = (state) => {
  if (state === 'Tamil Nadu') {
    return [
      { range: 'Gross ≤ ₹3,500/mo', amount: '₹0.00' },
      { range: 'Gross ₹3,501 – ₹5,000/mo', amount: '₹30.00/mo (₹180/6-mo)' },
      { range: 'Gross ₹5,001 – ₹7,500/mo', amount: '₹70.83/mo (₹425/6-mo)' },
      { range: 'Gross ₹7,501 – ₹10,000/mo', amount: '₹155.00/mo (₹930/6-mo)' },
      { range: 'Gross ₹10,001 – ₹12,500/mo', amount: '₹170.83/mo (₹1,025/6-mo)' },
      { range: 'Gross > ₹12,500/mo', amount: '₹208.33/mo (₹1,250/6-mo)' },
    ];
  }
  if (state === 'Maharashtra') {
    return [
      { range: 'Gross ≤ ₹7,500/mo', amount: '₹0.00' },
      { range: 'Gross ₹7,501 – ₹10,000/mo', amount: '₹175.00/mo' },
      { range: 'Gross > ₹10,000/mo', amount: '₹200.00/mo (₹300 in Feb)' },
    ];
  }
  if (state === 'Karnataka') {
    return [
      { range: 'Gross ≤ ₹24,999/mo', amount: '₹0.00' },
      { range: 'Gross ≥ ₹25,000/mo', amount: '₹200.00/mo' },
    ];
  }
  if (state === 'West Bengal') {
    return [
      { range: 'Gross ≤ ₹10,000/mo', amount: '₹0.00' },
      { range: 'Gross ₹10,001 – ₹15,000/mo', amount: '₹110.00/mo' },
      { range: 'Gross ₹15,001 – ₹25,000/mo', amount: '₹130.00/mo' },
      { range: 'Gross ₹25,001 – ₹40,000/mo', amount: '₹150.00/mo' },
      { range: 'Gross > ₹40,000/mo', amount: '₹200.00/mo' },
    ];
  }
  if (state === 'Telangana' || state === 'Andhra Pradesh') {
    return [
      { range: 'Gross ≤ ₹15,000/mo', amount: '₹0.00' },
      { range: 'Gross ₹15,001 – ₹20,000/mo', amount: '₹150.00/mo' },
      { range: 'Gross > ₹20,000/mo', amount: '₹200.00/mo' },
    ];
  }
  return [
    { range: 'Standard State Slabs', amount: 'Deducted per state act' }
  ];
};

const getPtPreview = (ptState, regState) => {
  const resolved = resolveStateName(ptState, regState || 'Tamil Nadu');
  if (ptState === 'NA' || resolved === 'Not Applicable') {
    return {
      state: 'Not Applicable',
      slabs: [{ range: 'All Gross Salaries', amount: '₹0.00 (Exempt)' }]
    };
  }
  if (ptState === 'auto') {
    return {
      state: `Auto (${resolved})`,
      slabs: getPtSlabList(resolved),
      note: resolved === 'Maharashtra' ? '* Female employees gross ≤ ₹25,000/mo are ₹0 exempt.' : null
    };
  }
  return {
    state: resolved,
    slabs: getPtSlabList(resolved),
    note: resolved === 'Maharashtra' ? '* Female employees gross ≤ ₹25,000/mo are ₹0 exempt.' : null
  };
};

const getLwfPreview = (lwfFrequency, regState, ptState) => {
  const state = resolveStateName(ptState === 'auto' ? regState : ptState, regState || 'Tamil Nadu');

  const freqLabel = (lwfFrequency === 'biannual' || lwfFrequency === 'bi-annual')
    ? 'Bi-Annual (Jun & Dec)'
    : lwfFrequency === 'monthly'
      ? 'Monthly'
      : 'Annual (Dec Only)';

  if (state === 'Maharashtra') {
    return {
      state: 'Maharashtra',
      emp: '₹25.00',
      empr: '₹75.00',
      total: '₹100.00',
      schedule: freqLabel,
    };
  }
  if (state === 'Karnataka') {
    return {
      state: 'Karnataka',
      emp: '₹50.00',
      empr: '₹100.00',
      total: '₹150.00',
      schedule: freqLabel,
    };
  }
  if (state === 'Tamil Nadu') {
    return {
      state: 'Tamil Nadu',
      emp: '₹20.00',
      empr: '₹40.00',
      total: '₹60.00',
      schedule: freqLabel,
    };
  }
  return {
    state: state || 'State Govt.',
    emp: 'State Rate',
    empr: 'State Rate',
    total: 'Per State Act',
    schedule: freqLabel,
  };
};

export default function StatutorySection({ formData, onChange, hook }) {
  const { auth } = usePage().props;
  const canEdit = auth.user.role === 'admin';
  const lockProps = !canEdit ? { disabled: true, readOnly: true, title: "Statutory defaults can only be changed by an Agency Admin" } : {};

  // Auto-sync LWF frequency on initial form load & state change
  useEffect(() => {
    const resolved = resolveStateName(formData.ptState, formData.regState || 'Tamil Nadu');
    if (resolved === 'Tamil Nadu' || resolved === 'Karnataka') {
      if (formData.lwfFrequency !== 'annual') {
        onChange('lwfFrequency', 'annual');
      }
    } else if (resolved === 'Maharashtra') {
      if (formData.lwfFrequency !== 'biannual' && formData.lwfFrequency !== 'bi-annual') {
        onChange('lwfFrequency', 'biannual');
      }
    }
  }, [formData.ptState, formData.regState]);
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
            <input type="number" className="stat-rate-input" placeholder="15000" max="15000" min="0"
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
        <div className="stat-row" style={{ flexWrap: 'wrap', background: formData.edliExempted ? '#F0FDF4' : '#F8FAFC', border: formData.edliExempted ? '1px solid #86EFAC' : '1px dashed var(--border-color)' }}>
          <div className="stat-info">
            <strong>EDLI (Employees' Deposit Linked Insurance) — Sec 17(2A)</strong>
            <span>0.5% on wages up to ₹15,000. Employer contribution only.</span>
            {Boolean(formData.edliExempted) ? (
              <small style={{ color: '#15803D', display: 'block', marginTop: '4px', fontWeight: '600' }}>
                🛡️ EDLI Exempted Establishment: Approved group life insurance active. EDLI contribution set to ₹0.00 (Reduces total Employer PF contribution from ₹1,950 to ₹1,875). Employer EPF (12%) and Admin Charges (0.5%) remain active.
              </small>
            ) : (
              <small style={{ color: 'var(--text-muted)', display: 'block', marginTop: '4px' }}>
                Standard EPFO EDLI rate (0.5% up to ₹15k = ₹75/mo) is <strong>auto-computed</strong> into total Employer PF cost (₹1,950 total). Turn toggle ON if establishment is EDLI Exempted under Sec 17(2A).
              </small>
            )}
          </div>
          <div className="stat-rate" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {Boolean(formData.edliExempted) ? (
              <span className="badge badge-success" style={{ fontSize: '0.7rem', padding: '0.25rem 0.5rem', background: '#DCFCE7', color: '#15803D', border: '1px solid #86EFAC' }}>
                Exempted (₹0.00)
              </span>
            ) : (
              <span className="badge badge-neutral" style={{ fontSize: '0.65rem', background: 'var(--border-color)', color: 'var(--text-main)', padding: '0.25rem 0.5rem' }}>
                Auto-Computed (0.5%)
              </span>
            )}
          </div>
          <div className="stat-toggle">
            <label className="toggle-container" title={lockProps.title}>
              <input type="checkbox" className="toggle-input"
                checked={Boolean(formData.edliExempted)} onChange={e => onChange('edliExempted', e.target.checked)} {...lockProps} />
              <span className="toggle-switch"></span>
            </label>
          </div>
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
        <div className="stat-row" style={{ flexWrap: 'wrap' }}>
          <div className="stat-info">
            <strong>Professional Tax (PT) — State Govt.</strong>
            <span>Deducted per state-specific slabs. Computed from candidate work location or client override state.</span>
          </div>
          <div className="stat-rate" style={{ minWidth: '240px' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>Override State Slab</div>
            <select className="stat-rate-input" value={formData.ptState} onChange={e => {
              const val = e.target.value;
              onChange('ptState', val);
              const resolved = resolveStateName(val, formData.regState || 'Tamil Nadu');
              if (resolved === 'Tamil Nadu' || resolved === 'Karnataka') {
                onChange('lwfFrequency', 'annual');
              } else if (resolved === 'Maharashtra') {
                onChange('lwfFrequency', 'biannual');
              }
            }} {...lockProps}>
              {PT_STATES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>

            {/* Live State PT Deduction Preview Box */}
            {formData.ptApplicable && (
              <div style={{
                marginTop: '0.5rem',
                padding: '0.5rem 0.75rem',
                background: '#F0F9FF',
                border: '1px solid #BAE6FD',
                borderRadius: '6px',
                fontSize: '0.72rem'
              }}>
                <div style={{ fontWeight: '700', color: '#0369A1', marginBottom: '0.35rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>⚡ PT Deduction Slabs ({getPtPreview(formData.ptState, formData.regState).state}):</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', color: '#0F172A' }}>
                  {getPtPreview(formData.ptState, formData.regState).slabs.map((s, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem' }}>
                      <span style={{ color: '#334155' }}>{s.range}:</span>
                      <strong style={{ color: '#0284C7', textAlign: 'right', whiteSpace: 'nowrap' }}>{s.amount}</strong>
                    </div>
                  ))}
                  {getPtPreview(formData.ptState, formData.regState).note && (
                    <div style={{ fontSize: '0.68rem', color: '#0284C7', marginTop: '0.2rem', fontStyle: 'italic' }}>
                      {getPtPreview(formData.ptState, formData.regState).note}
                    </div>
                  )}
                </div>
              </div>
            )}
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
        <div className="stat-row" style={{ flexWrap: 'wrap' }}>
          <div className="stat-info">
            <strong>Labour Welfare Fund (LWF) — State Govt.</strong>
            <span>Bi-annual or annual deduction based on state statutory rules.</span>
          </div>
          <div className="stat-rate" style={{ minWidth: '240px' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>LWF Frequency</div>
            <select className="stat-rate-input" value={formData.lwfFrequency} onChange={e => onChange('lwfFrequency', e.target.value)} {...lockProps}>
              <option value="annual">Annual (Dec only) — Default for TN & KA</option>
              <option value="biannual">Bi-Annual (Jun & Dec) — Default for MH</option>
              <option value="monthly">Monthly</option>
            </select>

            {/* Live State LWF Deduction Preview Box */}
            {Boolean(formData.lwfApplicable) && (() => {
              const lwfInfo = getLwfPreview(formData.lwfFrequency, formData.regState, formData.ptState);
              const activeState = lwfInfo.state;
              const isTnOrKa = activeState === 'Tamil Nadu' || activeState === 'Karnataka';
              const isMh = activeState === 'Maharashtra';
              const isStandardTnKa = isTnOrKa && formData.lwfFrequency === 'annual';
              const isStandardMh = isMh && (formData.lwfFrequency === 'biannual' || formData.lwfFrequency === 'bi-annual');

              return (
                <div style={{
                  marginTop: '0.5rem',
                  padding: '0.5rem 0.75rem',
                  background: '#FDF4FF',
                  border: '1px solid #F5D0FE',
                  borderRadius: '6px',
                  fontSize: '0.72rem'
                }}>
                  <div style={{ fontWeight: '700', color: '#86198F', marginBottom: '0.35rem' }}>
                    ⚡ LWF State Deductions ({activeState}):
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', color: '#0F172A' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem' }}>
                      <span style={{ color: '#475569' }}>Employee Contribution:</span>
                      <strong style={{ color: '#A21CAF' }}>{lwfInfo.emp}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem' }}>
                      <span style={{ color: '#475569' }}>Employer Contribution:</span>
                      <strong style={{ color: '#A21CAF' }}>{lwfInfo.empr}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', borderTop: '1px dashed #E9D5FF', paddingTop: '0.25rem', marginTop: '0.15rem' }}>
                      <span style={{ color: '#6B21A8', fontWeight: '600' }}>Schedule / Total:</span>
                      <strong style={{ color: '#7E22CE' }}>{lwfInfo.total} ({lwfInfo.schedule})</strong>
                    </div>

                    {/* Statutory Rule Compliance Badge */}
                    {isStandardTnKa && (
                      <div style={{ fontSize: '0.67rem', color: '#166534', background: '#DCFCE7', border: '1px solid #86EFAC', padding: '0.2rem 0.4rem', borderRadius: '4px', marginTop: '0.25rem' }}>
                        ✅ Statutory Rule Compliant: {activeState} LWF Act mandates Annual deduction in December.
                      </div>
                    )}
                    {isTnOrKa && !isStandardTnKa && (
                      <div style={{ fontSize: '0.67rem', color: '#991B1B', background: '#FEE2E2', border: '1px solid #FCA5A5', padding: '0.2rem 0.4rem', borderRadius: '4px', marginTop: '0.25rem' }}>
                        ⚠️ Non-Standard Setting: {activeState} LWF Act mandates Annual deduction in December. (Bi-Annual is standard in Maharashtra).
                      </div>
                    )}
                    {isStandardMh && (
                      <div style={{ fontSize: '0.67rem', color: '#166534', background: '#DCFCE7', border: '1px solid #86EFAC', padding: '0.2rem 0.4rem', borderRadius: '4px', marginTop: '0.25rem' }}>
                        ✅ Statutory Rule Compliant: Maharashtra LWF Act mandates Bi-Annual deduction in June & December.
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
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
        <div className="stat-row" style={{ flexWrap: 'wrap' }}>
          <div className="stat-info">
            <strong>Gratuity — Payment of Gratuity Act 1972</strong>
            <span>15 days wages per year calculated on <strong>Basic + DA</strong> at exit settlement.</span>
          </div>
          <div className="stat-rate" style={{ minWidth: '240px' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>Gratuity Treatment</div>
            <select className="stat-rate-input" value={formData.gratuityMode} onChange={e => onChange('gratuityMode', e.target.value)} {...lockProps}>
              <option value="ctc_included">Deduct from CTC (Accrued ~4.81%)</option>
              <option value="over_above">Over & Above CTC (Client bears cost)</option>
              <option value="none">Not Accrued (Paid out on event)</option>
            </select>

            {/* Live Gratuity Statutory Guidance Box */}
            {Boolean(formData.gratuityApplicable) && (
              <div style={{
                marginTop: '0.5rem',
                padding: '0.5rem 0.75rem',
                background: '#FFFBEB',
                border: '1px solid #FDE68A',
                borderRadius: '6px',
                fontSize: '0.72rem'
              }}>
                <div style={{ fontWeight: '700', color: '#B45309', marginBottom: '0.35rem' }}>
                  ⚖️ Gratuity Act Compliance (Sec 4(2)):
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', color: '#0F172A' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem' }}>
                    <span style={{ color: '#475569' }}>Formula Base:</span>
                    <strong style={{ color: '#D97706' }}>Basic + DA</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem' }}>
                    <span style={{ color: '#475569' }}>Calculation:</span>
                    <strong style={{ color: '#D97706' }}>15/26 × Years</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', borderTop: '1px dashed #FDE68A', paddingTop: '0.25rem', marginTop: '0.15rem' }}>
                    <span style={{ color: '#92400E', fontWeight: '600' }}>Eligibility (Permanent):</span>
                    <strong style={{ color: '#B45309' }}>4 yrs 240 days</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem' }}>
                    <span style={{ color: '#92400E', fontWeight: '600' }}>Eligibility (Contract):</span>
                    <strong style={{ color: '#B45309' }}>1 yr service</strong>
                  </div>
                </div>
              </div>
            )}
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
        <div className="stat-row" style={{ flexWrap: 'wrap' }}>
          <div className="stat-info">
            <strong>Statutory Bonus — Payment of Bonus Act 1965</strong>
            <span>Statutory annual bonus for eligible candidates earning Basic ≤ ₹21,000/month.</span>
          </div>
          <div className="stat-rate" style={{ minWidth: '240px' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>Accrual %</div>
            <input type="number" className="stat-rate-input" placeholder="8.33" step="0.01" max="20" min="8.33"
              value={formData.bonusPct} onChange={e => onChange('bonusPct', e.target.value)} onWheel={e => e.target.blur()} {...lockProps} />

            {/* Live Statutory Bonus Guidance Box */}
            {Boolean(formData.bonusApplicable) && (
              <div style={{
                marginTop: '0.5rem',
                padding: '0.5rem 0.75rem',
                background: '#ECFDF5',
                border: '1px solid #A7F3D0',
                borderRadius: '6px',
                fontSize: '0.72rem'
              }}>
                <div style={{ fontWeight: '700', color: '#047857', marginBottom: '0.35rem' }}>
                  ⚡ Payment of Bonus Act Rules (1965/2015):
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', color: '#0F172A' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem' }}>
                    <span style={{ color: '#475569' }}>Eligibility Ceiling:</span>
                    <strong style={{ color: '#059669' }}>Basic ≤ ₹21,000/mo</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem' }}>
                    <span style={{ color: '#475569' }}>Calculation Base:</span>
                    <strong style={{ color: '#059669' }}>min(Basic, ₹7,000)</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', borderTop: '1px dashed #A7F3D0', paddingTop: '0.25rem', marginTop: '0.15rem' }}>
                    <span style={{ color: '#065F46', fontWeight: '600' }}>Accrual & Payout:</span>
                    <strong style={{ color: '#047857' }}>{formData.bonusPct || '8.33'}% (Annual)</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem' }}>
                    <span style={{ color: '#065F46', fontWeight: '600' }}>Monthly Pay Impact:</span>
                    <strong style={{ color: '#047857' }}>₹0.00 (CTC Accrual)</strong>
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="stat-toggle">
            <label className="toggle-container" title={lockProps.title}>
              <input type="checkbox" className="toggle-input"
                checked={formData.bonusApplicable} onChange={e => onChange('bonusApplicable', e.target.checked)} {...lockProps} />
              <span className="toggle-switch"></span>
            </label>
          </div>
        </div>

        {/* Weekly Off Pattern */}
        <div className="stat-row">
          <div className="stat-info">
            <strong>Weekly Off Pattern — Attendance Resolution</strong>
            <span>Standard weekly off days for candidates under this client. Used for LOP and attendance calculations.</span>
          </div>
          <div className="stat-rate" style={{ flex: 2, display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
              {[
                { id: 'sat,sun', label: 'Sat + Sun' },
                { id: 'sun', label: 'Sunday Only' },
                { id: 'fri,sat', label: 'Fri + Sat' }
              ].map(p => (
                <button
                  type="button"
                  key={p.id}
                  className={`btn btn-xs ${formData.weeklyOffPattern === p.id ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => onChange('weeklyOffPattern', p.id)}
                  {...lockProps}
                >
                  {p.label}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '0.35rem', marginTop: '0.25rem' }}>
              {[
                { id: 'mon', label: 'M' },
                { id: 'tue', label: 'T' },
                { id: 'wed', label: 'W' },
                { id: 'thu', label: 'T' },
                { id: 'fri', label: 'F' },
                { id: 'sat', label: 'S' },
                { id: 'sun', label: 'S' }
              ].map(d => {
                const currentArr = (formData.weeklyOffPattern || 'sat,sun').split(',').map(s => s.trim().toLowerCase());
                const isSelected = currentArr.includes(d.id);
                return (
                  <button
                    type="button"
                    key={d.id}
                    className="day-pill"
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      border: isSelected ? '1px solid var(--primary-navy)' : '1px solid #CBD5E1',
                      backgroundColor: isSelected ? 'var(--primary-navy)' : '#F8FAFC',
                      color: isSelected ? '#FFFFFF' : '#475569',
                      cursor: 'pointer'
                    }}
                    onClick={() => {
                      let nextArr = isSelected ? currentArr.filter(x => x !== d.id) : [...currentArr, d.id];
                      const dayOrder = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
                      nextArr.sort((a, b) => dayOrder.indexOf(a) - dayOrder.indexOf(b));
                      onChange('weeklyOffPattern', nextArr.join(','));
                    }}
                    {...lockProps}
                  >
                    {d.label}
                  </button>
                );
              })}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
              Current Pattern: <strong style={{ color: 'var(--primary-navy)' }}>{formData.weeklyOffPattern || 'sat,sun'}</strong>
            </div>
          </div>
        </div>

        {/* LOP Calculation */}
        <div className="stat-row" style={{ border: 'none', background: 'none', padding: 0 }}>
          <div className="stat-info" style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '1rem' }}>
            <div>
              <strong style={{ fontSize: '0.85rem' }}>Loss of Pay (LOP) Divisor Basis</strong>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Denominator used for daily wage calculation (Basic / 30). Standard fixed monthly divisor base.</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#F1F5F9', border: '1px solid #CBD5E1', padding: '0.4rem 0.85rem', borderRadius: '6px', fontWeight: 'bold', color: 'var(--primary-navy)', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
              🔒 Strictly 30 Days
            </div>
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
