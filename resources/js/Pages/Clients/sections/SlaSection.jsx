import React from 'react';
import { usePage } from '@inertiajs/react';
import { CUTOFF_DAYS, PAYROLL_LOCK_DAYS, SALARY_CREDIT_DAYS, INVOICE_RAISE_DAYS, PAYROLL_CONVENTIONS } from '../constants/clientFormData';

export default function SlaSection({ formData, errors, onChange, hook }) {
  const { accountManagers = [] } = usePage().props;
  const showCustomCycle = formData.payrollMonthConvention === 'custom';

  return (
    <>
      <div className="section-header">
        <div className="section-icon">📅</div>
        <h3>SLA &amp; Payroll Calendar</h3>
      </div>

      <div className="info-box" style={{ marginBottom: '1rem' }}>
        📆 Define the payroll processing timeline for this client. These dates drive automated reminders and lock-outs.
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Attendance Cut-off Day (of month)</label>
          <select className="form-control" value={formData.attendanceCutoff} onChange={e => onChange('attendanceCutoff', e.target.value)}>
            {CUTOFF_DAYS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
          </select>
          <div className="field-hint">Attendance submitted after this date will be counted in next month.</div>
        </div>
        <div className="form-group">
          <label>Payroll Lock / Processing Day</label>
          <select className="form-control" value={formData.payrollLockDay} onChange={e => onChange('payrollLockDay', e.target.value)}>
            {PAYROLL_LOCK_DAYS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
          </select>
          <div className="field-hint">Payroll is locked and finalized by this date.</div>
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Salary Credit Day</label>
          <select className="form-control" value={formData.salaryCreditDay} onChange={e => onChange('salaryCreditDay', e.target.value)}>
            {SALARY_CREDIT_DAYS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label>Invoice Dispute Window (days)</label>
          <input type="number" className="form-control" placeholder="e.g. 7" min="1" max="30"
            value={formData.invoiceDisputeDays} onChange={e => onChange('invoiceDisputeDays', e.target.value)} />
          <div className="field-hint">Days client can raise a dispute after invoice is raised.</div>
        </div>
      </div>

      <div className="form-row" style={{ marginTop: '1rem' }}>
        <div className="form-group">
          <label>Invoice Raise Day <span style={{ color: 'var(--status-danger)' }}>*</span></label>
          <select className="form-control" value={formData.invoiceRaiseDay} onChange={e => onChange('invoiceRaiseDay', e.target.value)}>
            {INVOICE_RAISE_DAYS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
          </select>
          <div className="field-hint">Invoice is generated this many days after payroll is locked.</div>
        </div>
        <div className="form-group">
          <label>Payroll Month Convention</label>
          <select className="form-control" value={formData.payrollMonthConvention} onChange={e => onChange('payrollMonthConvention', e.target.value)}>
            {PAYROLL_CONVENTIONS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>
      </div>

      {showCustomCycle && (
        <div className="form-row" style={{ marginTop: '1rem' }}>
          <div className="form-group">
            <label>Cycle Start Day</label>
            <input type="number" className="form-control" min="1" max="28"
              value={formData.cycleStartDay} onChange={e => onChange('cycleStartDay', e.target.value)} />
          </div>
          <div className="form-group">
            <label>Cycle End Day</label>
            <input type="number" className="form-control" min="1" max="28"
              value={formData.cycleEndDay} onChange={e => onChange('cycleEndDay', e.target.value)} />
          </div>
        </div>
      )}

      <div className="form-row" style={{ marginTop: '1rem' }}>
        <div className="form-group">
          <label>Assigned Account Manager (Internal)</label>
          <select className="form-control" value={formData.accountManager} onChange={e => onChange('accountManager', e.target.value)}>
            <option value="">-- Assign Account Manager --</option>
            {accountManagers.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label>Backup Account Manager</label>
          <select className="form-control" value={formData.backupAccountManager} onChange={e => onChange('backupAccountManager', e.target.value)}>
            <option value="">-- Select Backup AM --</option>
            {accountManagers.filter(m => m.value != formData.accountManager).map(m => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
          <div className="field-hint">Backup CC'd on communications when primary AM is unavailable.</div>
        </div>
      </div>

      <div className="form-row" style={{ marginTop: '1rem', alignItems: 'center' }}>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label style={{ display: 'block', marginBottom: '0.5rem' }}>Auto-Reminder Schedule</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <label className="toggle-container" style={{ margin: 0 }}>
              <input type="checkbox" className="toggle-input"
                checked={formData.autoReminders} onChange={e => onChange('autoReminders', e.target.checked)} />
              <span className="toggle-switch"></span>
            </label>
            <span style={{ fontSize: '0.85rem' }}>Enable Automated Email Alerts</span>
          </div>
        </div>
      </div>

      {formData.autoReminders && (
        <div className="info-box" style={{ marginTop: '1rem', background: '#FFFBF0', borderColor: 'var(--accent-gold)' }}>
          ℹ️ <strong>System will auto-send:</strong> Attendance reminder 3 days before cut-off | Invoice reminder 2 days before due date | Overdue alert on Day 1, 7, 15 after due date
        </div>
      )}

      <div className="suggestion-chip" style={{
        marginTop: '1rem', display: 'block', padding: '0.5rem 0.75rem',
        background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 'var(--radius-sm)',
        fontSize: '0.8rem', color: '#166534'
      }}>
        {hook.getInvoicePreview()}
      </div>

      <div className="form-group" style={{ marginTop: '1.5rem' }}>
        <label>Internal Notes / Special Instructions</label>
        <textarea className="form-control" rows="3"
          placeholder="e.g. Client requires separate salary breakup for contract vs permanent staff. Invoice to be sent in both PDF and XLSX format."
          value={formData.clientNotes} onChange={e => onChange('clientNotes', e.target.value)}></textarea>
      </div>
    </>
  );
}
