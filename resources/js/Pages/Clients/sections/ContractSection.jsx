import React from 'react';
import { CONTRACT_TYPES, BILLING_MODELS, CURRENCIES, INVOICE_CYCLES, PAYMENT_NET_TERMS, OT_BILLING_RULES } from '../constants/clientFormData';

export default function ContractSection({ formData, errors, onChange, hook }) {
  const isIndia = formData.country === 'India';
  const showMarkup = formData.billingModel === 'markup';
  const showFixedCandidate = formData.billingModel === 'fixed_per_candidate';
  const showFixedMonthly = formData.billingModel === 'fixed_per_month';
  const showHourly = formData.billingModel === 'hourly';

  return (
    <>
      <div className="section-header">
        <div className="section-icon">📄</div>
        <h3>Contract Terms &amp; Billing Configuration</h3>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Contract Type <span style={{ color: 'var(--status-danger)' }}>*</span></label>
          <select className={`form-control ${errors.contractType ? 'invalid' : ''}`}
            value={formData.contractType} onChange={e => hook.handleContractTypeChange(e.target.value)}>
            <option value="">-- Select --</option>
            {CONTRACT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label>Billing Model <span style={{ color: 'var(--status-danger)' }}>*</span></label>
          <select className={`form-control ${errors.billingModel ? 'invalid' : ''}`}
            value={formData.billingModel} onChange={e => hook.handleBillingModelChange(e.target.value)}>
            <option value="">-- Select --</option>
            {BILLING_MODELS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </div>
      </div>

      {/* Dynamic billing fields */}
      {showMarkup && (
        <div className="conditional-field">
          <div className="form-row">
            <div className="form-group">
              <label>Markup / Commission Percentage (%) <span style={{ color: 'var(--status-danger)' }}>*</span></label>
              <input type="number" className="form-control" placeholder="e.g. 8.5" step="0.1" min="0" max="100"
                value={formData.markupPct} onChange={e => onChange('markupPct', e.target.value)} />
              <div className="field-hint">Applied on total CTC. Invoice = CTC × (1 + markup%).</div>
            </div>
            <div className="form-group">
              <label>Markup Applied On</label>
              <select className="form-control" value={formData.markupBase} onChange={e => onChange('markupBase', e.target.value)}>
                <option value="gross">Gross Salary (CTC)</option>
                <option value="basic">Basic Salary Only</option>
                <option value="ctc_minus_statutory">CTC minus Statutory Employer Contributions</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {showFixedCandidate && (
        <div className="conditional-field">
          <div className="form-group" style={{ maxWidth: '300px' }}>
            <label>Fixed Fee Per Candidate (₹) <span style={{ color: 'var(--status-danger)' }}>*</span></label>
            <input type="number" className="form-control" placeholder="e.g. 1500" min="0"
              value={formData.fixedFeeCandidate} onChange={e => onChange('fixedFeeCandidate', e.target.value)} />
            <div className="field-hint">Charged per active candidate per billing cycle.</div>
          </div>
        </div>
      )}

      {showFixedMonthly && (
        <div className="conditional-field">
          <div className="form-group" style={{ maxWidth: '300px' }}>
            <label>Monthly Retainer Amount (₹) <span style={{ color: 'var(--status-danger)' }}>*</span></label>
            <input type="number" className="form-control" placeholder="e.g. 50000" min="0"
              value={formData.fixedMonthlyRetainer} onChange={e => onChange('fixedMonthlyRetainer', e.target.value)} />
          </div>
        </div>
      )}

      {showHourly && (
        <div className="conditional-field">
          <div className="form-row">
            <div className="form-group">
              <label>Default Hourly Billing Rate (₹) <span style={{ color: 'var(--status-danger)' }}>*</span></label>
              <input type="number" className="form-control" placeholder="e.g. 800" min="0"
                value={formData.hourlyRate} onChange={e => onChange('hourlyRate', e.target.value)} />
            </div>
            <div className="form-group">
              <label>Standard Hours / Month</label>
              <input type="number" className="form-control" placeholder="e.g. 160" min="0"
                value={formData.standardHours} onChange={e => onChange('standardHours', e.target.value)} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Overtime (OT) Billing Rule</label>
              <select className="form-control" value={formData.otBilling} onChange={e => onChange('otBilling', e.target.value)}>
                {OT_BILLING_RULES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>OT Approval Mode</label>
              <select className="form-control" value={formData.otApproval} onChange={e => onChange('otApproval', e.target.value)}>
                <option value="timesheet">Client Timesheet Approval Required</option>
                <option value="auto">Auto-approved (based on punch-in/out)</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Contract Duration */}
      <h4 style={{ fontSize: '0.9rem', color: 'var(--primary-navy)', marginTop: '1.5rem', marginBottom: '1rem' }}>Contract Duration &amp; PO</h4>
      <div className="form-row">
        <div className="form-group">
          <label>Contract Start Date <span style={{ color: 'var(--status-danger)' }}>*</span></label>
          <input type="date" className={`form-control ${errors.contractStart ? 'invalid' : ''}`}
            value={formData.contractStart} onChange={e => onChange('contractStart', e.target.value)} />
        </div>
        <div className="form-group">
          <label>Contract End Date</label>
          <input type="date" className={`form-control ${errors.contractEnd ? 'invalid' : ''}`}
            value={formData.contractEnd}
            onChange={e => onChange('contractEnd', e.target.value)}
            onBlur={hook.validateContractDates} />
          <div className="field-hint">Leave blank for open-ended contracts.</div>
          {hook.hints.contractEnd && (
            <div className={`field-hint ${hook.hints.contractEnd.type === 'error' ? 'error' : hook.hints.contractEnd.type === 'success' ? 'success' : ''}`}>
              {hook.hints.contractEnd.text}
            </div>
          )}
        </div>
      </div>
      <div className="form-group">
        <label className="toggle-container" style={{ margin: 0 }}>
          <input type="checkbox" className="toggle-input"
            checked={formData.autoRenewal} onChange={e => onChange('autoRenewal', e.target.checked)} />
          <span className="toggle-switch"></span>
          <span style={{ fontSize: '0.875rem', fontWeight: 500, marginLeft: '0.75rem', display: 'inline-block', verticalAlign: 'middle' }}>Auto-Renewal (renew for same period if not terminated)</span>
        </label>
      </div>

      <div style={{ background: '#F8FAFC', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '1rem', marginTop: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
          <label className="toggle-container" style={{ margin: 0 }}>
            <input type="checkbox" className="toggle-input"
              checked={formData.poRequired} onChange={e => onChange('poRequired', e.target.checked)} />
            <span className="toggle-switch"></span>
          </label>
          <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>Purchase Order (PO) Required before invoicing</span>
        </div>
        {formData.poRequired && (
          <div className="form-row conditional-field">
            <div className="form-group">
              <label>PO Number <span style={{ color: 'var(--status-danger)' }}>*</span></label>
              <input type="text" className={`form-control ${errors.poNumber ? 'invalid' : ''}`}
                placeholder="e.g. PO/2026/00142"
                value={formData.poNumber} onChange={e => onChange('poNumber', e.target.value)} />
              <div className="field-hint">Invoice held as Draft until PO number is entered here.</div>
            </div>
            <div className="form-group">
              <label>PO Value (₹)</label>
              <input type="number" className="form-control" placeholder="e.g. 500000"
                value={formData.poValue} onChange={e => onChange('poValue', e.target.value)} />
              <div className="field-hint">Invoice generation blocked if cumulative invoices exceed this amount.</div>
            </div>
            <div className="form-group">
              <label>PO Validity Date</label>
              <input type="date" className="form-control"
                value={formData.poValidity} onChange={e => onChange('poValidity', e.target.value)} />
              <div className="field-hint">Invoice generation blocked after this date.</div>
            </div>
          </div>
        )}
      </div>

      {/* Invoice & Payment Terms */}
      <h4 style={{ fontSize: '0.9rem', color: 'var(--primary-navy)', marginTop: '1.5rem', marginBottom: '1rem' }}>Invoice &amp; Payment Terms</h4>
      <div className="form-row">
        <div className="form-group">
          <label>Invoicing Cycle</label>
          <select className="form-control" value={formData.invoiceCycle} onChange={e => onChange('invoiceCycle', e.target.value)}>
            {INVOICE_CYCLES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label>Payment Net Terms</label>
          <select className="form-control" value={formData.paymentTerms} onChange={e => onChange('paymentTerms', e.target.value)}>
            {PAYMENT_NET_TERMS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
      </div>
      <div className="form-row">
        <div className="form-group">
          <label>Contract Notice Period (days)</label>
          <input type="number" className="form-control" placeholder="30" value={formData.noticePeriod} onChange={e => onChange('noticePeriod', e.target.value)} />
        </div>
        <div className="form-group">
          <label>Credit Limit (₹)</label>
          <input type="number" className="form-control" placeholder="e.g. 1000000" value={formData.creditLimit} onChange={e => onChange('creditLimit', e.target.value)} />
        </div>
      </div>
      <div className="form-row">
        <div className="form-group">
          <label>Late Payment Penalty (%)</label>
          <input type="number" className="form-control" step="0.1" value={formData.latePenalty} onChange={e => onChange('latePenalty', e.target.value)} />
        </div>
        <div className="form-group">
          <label>Billing Currency</label>
          <select className="form-control" value={formData.billingCurrency} onChange={e => onChange('billingCurrency', e.target.value)}>
            {CURRENCIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>
      </div>

      {/* Taxation Config */}
      <h4 style={{ fontSize: '0.9rem', color: 'var(--primary-navy)', marginTop: '1.5rem', marginBottom: '1rem' }}>Taxation Configuration</h4>
      {isIndia ? (
        <div className="form-row">
          <div className="form-group">
            <label>GST Application Rate</label>
            <select className="form-control" value={formData.gstRate} onChange={e => hook.handleGSTRateChange(e.target.value)}>
              <option value="18">18% (Standard Services)</option>
              <option value="0">0% (SEZ / Export without payment of IGST)</option>
              <option value="exempt">Exempt</option>
            </select>
            {formData.gstRate === '0' && (
              <div className="form-group conditional-field" style={{ marginTop: '0.5rem' }}>
                <label>LUT Reference Number</label>
                <input type="text" className="form-control" placeholder="Required for SEZ 0% GST"
                  value={formData.lutRefNo} onChange={e => onChange('lutRefNo', e.target.value)} />
              </div>
            )}
          </div>
          <div className="form-group">
            <label>Reverse Charge Applicable</label>
            <div style={{ marginTop: '0.5rem' }}>
              <label className="toggle-container" style={{ margin: 0 }}>
                <input type="checkbox" className="toggle-input"
                  checked={formData.reverseCharge} onChange={e => onChange('reverseCharge', e.target.checked)} />
                <span className="toggle-switch"></span>
                <span style={{ fontSize: '0.875rem', fontWeight: 500, marginLeft: '0.75rem', display: 'inline-block', verticalAlign: 'middle' }}>Shift GST liability to client</span>
              </label>
              <div className="field-hint" style={{ marginTop: '0.5rem' }}>If active, invoice will bear 'Reverse Charge Applicable' note.</div>
            </div>
          </div>
          <div className="form-group">
            <label>TDS Applicable on Agency Invoice</label>
            <select className="form-control" value={formData.tdsApplicableAgency} onChange={e => hook.handleTDSChange(e.target.value)}>
              <option value="na">Not Applicable</option>
              <option value="1">1% (Sec 194C - Contract)</option>
              <option value="2">2% (Sec 194J - Tech Services)</option>
              <option value="10">10% (Sec 194J - Prof Services)</option>
              <option value="other">Other / Custom</option>
            </select>
            <div className="field-hint">
              {hook.getTDSPreview()}
            </div>
          </div>
        </div>
      ) : (
        <div className="info-box">
          🌐 <strong>International Billing:</strong> GST and Indian TDS rules are not applicable. Ensure Export of Services rules are followed for zero-rated invoicing.
        </div>
      )}

      {/* Invoice Output Config */}
      <h4 style={{ fontSize: '0.9rem', color: 'var(--primary-navy)', marginTop: '1.5rem', marginBottom: '1rem' }}>Invoice Output Preferences</h4>
      <div className="form-row">
        <div className="form-group">
          <label style={{ display: 'block', marginBottom: '0.5rem' }}>Preferred Delivery Format</label>
          <div style={{ display: 'flex', gap: '1.5rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
              <input type="checkbox" checked={formData.prefFormatPDF} onChange={e => onChange('prefFormatPDF', e.target.checked)} /> PDF Document
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
              <input type="checkbox" checked={formData.prefFormatXLSX} onChange={e => onChange('prefFormatXLSX', e.target.checked)} /> XLSX Backing Sheet
            </label>
          </div>
        </div>
      </div>
      <div className="form-group">
        <label>Invoice Footer Notes</label>
        <textarea className="form-control" rows="2" placeholder="e.g. Please include PO number in payment reference. NEFT preferred."
          value={formData.invoiceFooterNotes} onChange={e => onChange('invoiceFooterNotes', e.target.value)}></textarea>
        <div className="field-hint">Appears at the bottom of every invoice sent to this client.</div>
      </div>
    </>
  );
}
