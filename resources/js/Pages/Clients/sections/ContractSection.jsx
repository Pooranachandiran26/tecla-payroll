import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { CONTRACT_TYPES, BILLING_MODELS, CURRENCIES, INVOICE_CYCLES, PAYMENT_NET_TERMS, OT_BILLING_RULES } from '../constants/clientFormData';
import { FileText, Globe, Building2 } from 'lucide-react';

export default function ContractSection({ formData, errors, onChange, hook, gstSettings }) {
  const isIndia = formData.country === 'India';
  const isInhouse = formData.billingModel === 'inhouse';
  const showMarkup = !isInhouse && formData.billingModel === 'markup';
  const showFixedCandidate = !isInhouse && formData.billingModel === 'fixed_per_candidate';
  const showFixedMonthly = !isInhouse && formData.billingModel === 'fixed_per_month';
  const showHourly = !isInhouse && formData.billingModel === 'hourly';
  const showLumpsum = !isInhouse && formData.billingModel === 'lumpsum';

  const [gstMasterRates, setGstMasterRates] = useState(gstSettings?.gst_rates || []);

  useEffect(() => {
    if (gstSettings?.gst_rates && Array.isArray(gstSettings.gst_rates) && gstSettings.gst_rates.length > 0) {
      setGstMasterRates(gstSettings.gst_rates);
    } else {
      axios.get(route('admin.settings.gst.show'))
        .then(res => {
          let rates = res.data?.gst_rates;
          if (typeof rates === 'string') {
            try { rates = JSON.parse(rates); } catch(e) {}
          }
          if (Array.isArray(rates) && rates.length > 0) {
            setGstMasterRates(rates);
          }
        })
        .catch(() => {});
    }
  }, [gstSettings]);

  return (
    <>
      <div className="section-header">
        <div className="section-icon"><FileText size={18} /></div>
        <h3>{isInhouse ? 'In-House Payroll Configuration' : 'Contract Terms & Billing Configuration'}</h3>
      </div>

      <div className="form-row">
        {/* Contract Type — hidden for In-House (auto-set to 'agency') */}
        {!isInhouse && (
          <div className="form-group">
            <label>Contract Type <span style={{ color: 'var(--status-danger)' }}>*</span></label>
            <select className={`form-control ${errors.contractType ? 'invalid' : ''}`}
              value={formData.contractType} onChange={e => hook.handleContractTypeChange(e.target.value)}>
              <option value="">-- Select --</option>
              {CONTRACT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            {errors.contractType && <div className={`field-msg ${errors.contractType?.type || 'error'} show`}>{errors.contractType?.msg || errors.contractType}</div>}
          </div>
        )}
        <div className="form-group">
          <label>Billing Model <span style={{ color: 'var(--status-danger)' }}>*</span></label>
          <select className={`form-control ${errors.billingModel ? 'invalid' : ''}`}
            value={formData.billingModel} onChange={e => hook.handleBillingModelChange(e.target.value)}>
            <option value="">-- Select --</option>
            {BILLING_MODELS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
          {errors.billingModel && <div className={`field-msg ${errors.billingModel?.type || 'error'} show`}>{errors.billingModel?.msg || errors.billingModel}</div>}
        </div>
      </div>

      {/* ═══ IN-HOUSE PAYROLL BANNER ═══ */}
      {isInhouse && (
        <div className="conditional-field" style={{
          background: 'linear-gradient(135deg, #EFF6FF 0%, #F0FDF4 100%)',
          padding: '1.25rem', borderRadius: 'var(--radius-md)',
          border: '1px solid #93C5FD', marginTop: '1rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '50%',
              background: 'linear-gradient(135deg, #3B82F6, #2563EB)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <Building2 size={18} color="white" />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#1E3A5F' }}>
                In-House Payroll Entity — Internal Staff Mode
              </div>
              <div style={{ fontSize: '0.78rem', color: '#475569', marginTop: '0.15rem' }}>
                Contract Type auto-set to <strong>Agency (Own Entity)</strong>
              </div>
            </div>
          </div>
          <div style={{ fontSize: '0.8rem', color: '#374151', lineHeight: '1.7', marginTop: '0.5rem', paddingLeft: '3rem' }}>
            <div>✅ Full payroll processing — Salary, PF, ESI, PT, TDS</div>
            <div>✅ Payslip & Form 16 generation</div>
            <div>✅ Statutory compliance & e-filing</div>
            <div style={{ color: '#6B7280', marginTop: '0.25rem' }}>❌ No client invoicing, billing, or markup tracking</div>
            <div style={{ color: '#6B7280' }}>❌ No PO tracking, credit limits, or payment terms</div>
          </div>
        </div>
      )}

      {/* Dynamic billing fields — hidden for In-House */}
      {showMarkup && (
        <div className="conditional-field">
          <div className="form-row">
            <div className="form-group">
              <label>Markup / Commission Percentage (%) <span style={{ color: 'var(--status-danger)' }}>*</span></label>
              <input type="number" className="form-control" placeholder="e.g. 8.5" step="0.1" min="0" max="100"
                value={formData.markupPct} onChange={e => onChange('markupPct', e.target.value)} />
              {errors.markupPct && <div className={`field-msg ${errors.markupPct?.type || 'error'} show`}>{errors.markupPct?.msg || errors.markupPct}</div>}
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
            {errors.fixedFeeCandidate && <div className={`field-msg ${errors.fixedFeeCandidate?.type || 'error'} show`}>{errors.fixedFeeCandidate?.msg || errors.fixedFeeCandidate}</div>}
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

      {showLumpsum && (
        <div className="conditional-field">
          <div className="form-group" style={{ maxWidth: '300px' }}>
            <label>Lump Sum Project Fee (₹) <span style={{ color: 'var(--status-danger)' }}>*</span></label>
            <input type="number" className="form-control" placeholder="e.g. 100000" min="0"
              value={formData.lumpsumFee} onChange={e => onChange('lumpsumFee', e.target.value)} />
            <div className="field-hint">Flat agency fee for the entire project, billed once per invoice cycle.</div>
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
                <option value="pre">Pre-approval Required</option>
                <option value="post">Timesheet Log (Post-facto)</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* ═══ CONTRACT DURATION — Simplified for In-House ═══ */}
      {isInhouse ? (
        /* In-House: Only show Contract Start Date */
        <>
          <h4 style={{ fontSize: '0.9rem', color: 'var(--primary-navy)', marginTop: '1.5rem', marginBottom: '1rem' }}>Entity Activation</h4>
          <div className="form-row">
            <div className="form-group" style={{ maxWidth: '300px' }}>
              <label>Entity Start Date <span style={{ color: 'var(--status-danger)' }}>*</span></label>
              <input type="date" className={`form-control ${errors.contractStart ? 'invalid' : ''}`}
                value={formData.contractStart} onChange={e => onChange('contractStart', e.target.value)} />
              {errors.contractStart && <div className={`field-msg ${errors.contractStart?.type || 'error'} show`}>{errors.contractStart?.msg || errors.contractStart}</div>}
              <div className="field-hint">Date from which payroll processing begins for this entity.</div>
            </div>
          </div>
        </>
      ) : (
        /* Normal Mode: Full Contract Duration & PO */
        <>
          <h4 style={{ fontSize: '0.9rem', color: 'var(--primary-navy)', marginTop: '1.5rem', marginBottom: '1rem' }}>Contract Duration & PO</h4>
          <div className="form-row">
            <div className="form-group">
              <label>Contract Start Date <span style={{ color: 'var(--status-danger)' }}>*</span></label>
              <input type="date" className={`form-control ${errors.contractStart ? 'invalid' : ''}`}
                value={formData.contractStart} onChange={e => onChange('contractStart', e.target.value)} />
              {errors.contractStart && <div className={`field-msg ${errors.contractStart?.type || 'error'} show`}>{errors.contractStart?.msg || errors.contractStart}</div>}
            </div>
            <div className="form-group">
              <label>Contract End Date</label>
              <input type="date" className={`form-control ${errors.contractEnd ? 'invalid' : ''}`}
                value={formData.contractEnd}
                onChange={e => onChange('contractEnd', e.target.value)}
                onBlur={hook.validateContractDates} />
              {errors.contractEnd && <div className={`field-msg ${errors.contractEnd?.type || 'error'} show`}>{errors.contractEnd?.msg || errors.contractEnd}</div>}
              <div className="field-hint">Leave blank for open-ended contracts.</div>
              {hook.hints.contractEnd && (
                <div className={`field-hint ${hook.hints.contractEnd.type === 'error' ? 'error' : hook.hints.contractEnd.type === 'success' ? 'success' : ''}`}>
                  {hook.hints.contractEnd.text}
                </div>
              )}
            </div>
          </div>
          <div style={{ background: '#F8FAFC', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '1rem', marginTop: '1rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', alignItems: 'center' }}>
              {/* Toggle 1: Auto Renewal */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <label className="toggle-container" style={{ margin: 0 }}>
                  <input type="checkbox" className="toggle-input"
                    checked={formData.autoRenewal} onChange={e => onChange('autoRenewal', e.target.checked)} />
                  <span className="toggle-switch"></span>
                </label>
                <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>Auto-Renewal (renew for same period if not terminated)</span>
              </div>

              {/* Toggle 2: PO Required */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <label className="toggle-container" style={{ margin: 0 }}>
                  <input type="checkbox" className="toggle-input"
                    checked={formData.poRequired} onChange={e => onChange('poRequired', e.target.checked)} />
                  <span className="toggle-switch"></span>
                </label>
                <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>Purchase Order (PO) Required before invoicing</span>
              </div>
            </div>

            {formData.poRequired && (
              <div className="form-row conditional-field" style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
                <div className="form-group">
                  <label>PO Number <span style={{ color: 'var(--status-danger)' }}>*</span></label>
                  <input type="text" className={`form-control ${errors.poNumber ? 'invalid' : ''}`}
                    placeholder="e.g. PO/2026/00142"
                    value={formData.poNumber} onChange={e => onChange('poNumber', e.target.value)} />
                  {errors.poNumber && <div className={`field-msg ${errors.poNumber?.type || 'error'} show`}>{errors.poNumber?.msg || errors.poNumber}</div>}
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
          <h4 style={{ fontSize: '0.9rem', color: 'var(--primary-navy)', marginTop: '1.5rem', marginBottom: '1rem' }}>Invoice & Payment Terms</h4>
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
                  {gstMasterRates.map((r, idx) => (
                    <option key={idx} value={r.rate}>{r.label || `${r.rate}%`}</option>
                  ))}
                  {formData.gstRate && 
                   !gstMasterRates.some(r => String(r.rate) === String(formData.gstRate)) && (
                    <option value={formData.gstRate}>{formData.gstRate}% (Saved Rate)</option>
                  )}
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
                {formData.tdsApplicableAgency === 'other' && (
                  <div className="form-group conditional-field" style={{ marginTop: '0.5rem' }}>
                    <label>Custom TDS Percentage (%) <span style={{ color: 'var(--status-danger)' }}>*</span></label>
                    <input type="number" className="form-control" placeholder="e.g. 5.0" step="0.1" min="0" max="100"
                      value={formData.customTdsPercentage || ''} onChange={e => onChange('customTdsPercentage', e.target.value)} />
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="info-box" style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
              <Globe size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div><strong>International Billing:</strong> GST and Indian TDS rules are not applicable. Ensure Export of Services rules are followed for zero-rated invoicing.</div>
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
      )}
    </>
  );
}