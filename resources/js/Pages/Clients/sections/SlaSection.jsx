import React from 'react';
import { usePage } from '@inertiajs/react';
import { CUTOFF_DAYS, PAYROLL_LOCK_DAYS, SALARY_CREDIT_DAYS, INVOICE_RAISE_DAYS, PAYROLL_CONVENTIONS } from '../constants/clientFormData';
import Select2 from '../../../Components/ui/Select2';
import { Clock, Calendar, Info } from 'lucide-react';

export default function SlaSection({ formData, errors, onChange, hook }) {
  const { accountManagers = [] } = usePage().props;
  const showCustomCycle = formData.payrollMonthConvention === 'custom';
  const isInhouse = formData.billingModel === 'inhouse';

  // Helper to resolve timeline order for a lock day value
  const getLockOrder = (val) => {
    const found = PAYROLL_LOCK_DAYS.find(d => String(d.value) === String(val));
    if (found) return found.order;
    const num = parseInt(val, 10);
    return !isNaN(num) && num <= 15 ? 100 + num : (num || 103);
  };

  const selectedLockOrder = getLockOrder(formData.payrollLockDay);

  // Filter salary credit days to strictly show days AFTER the selected payroll lock day
  const availableSalaryCreditDays = SALARY_CREDIT_DAYS.filter(d => d.order > selectedLockOrder);

  const handleLockDayChange = (newVal) => {
    onChange('payrollLockDay', newVal);
    const newLockOrder = getLockOrder(newVal);
    const validDays = SALARY_CREDIT_DAYS.filter(d => d.order > newLockOrder);

    // Check if current credit day is invalid (<= newLockOrder)
    const currentCreditOption = SALARY_CREDIT_DAYS.find(d => String(d.value) === String(formData.salaryCreditDay));
    const currentCreditOrder = currentCreditOption ? currentCreditOption.order : 0;

    if (currentCreditOrder <= newLockOrder && validDays.length > 0) {
      // Pick first valid credit day or smart default
      const defaultOption = validDays.find(d => d.value === '30_current' || d.value === 'eom_current' || d.value === '7' || d.value === '10') || validDays[0];
      onChange('salaryCreditDay', defaultOption.value);
    }
  };

  return (
    <>
      <div className="section-header">
        <div className="section-icon"><Clock size={18} /></div>
        <h3>{isInhouse ? 'Payroll Calendar' : 'SLA & Payroll Calendar'}</h3>
      </div>

      <div className="info-box" style={{ marginBottom: '1rem', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
        <Calendar size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
        <div>
          {isInhouse
            ? 'Define the payroll processing timeline for this internal entity. These dates drive payroll lock and salary credit schedules.'
            : 'Define the payroll processing timeline for this client. These dates drive automated reminders and lock-outs.'
          }
        </div>
      </div>

      {/* 1. Payroll Month Convention */}
      <div className="form-row">
        <div className="form-group">
          <label>Payroll Month Convention</label>
          <Select2
            value={formData.payrollMonthConvention}
            onChange={val => onChange('payrollMonthConvention', val)}
            options={PAYROLL_CONVENTIONS}
            searchable={false}
          />
          <div className="field-hint">Choose standard calendar month (1st to EOM) or custom attendance cycle dates.</div>
        </div>
      </div>

      {/* 1b. Custom Cycle Dates if custom */}
      {showCustomCycle && (
        <div className="form-row" style={{ marginTop: '0.5rem' }}>
          <div className="form-group">
            <label>Cycle Start Day</label>
            <input type="number" className="form-control" min="1" max="31"
              value={formData.cycleStartDay} onChange={e => onChange('cycleStartDay', e.target.value)} />
            <div className="field-hint">e.g. 21 (Attendance cycle start day)</div>
          </div>
          <div className="form-group">
            <label>Cycle End Day (Attendance Cutoff)</label>
            <input type="number" className="form-control" min="1" max="31"
              value={formData.cycleEndDay} onChange={e => onChange('cycleEndDay', e.target.value)} />
            <div className="field-hint">e.g. 20 (Attendance cutoff day)</div>
          </div>
        </div>
      )}

      {/* Timeline & Lock Days (3 Columns) */}
      <div className="form-grid-3col" style={{ marginTop: '1rem' }}>
        <div className="form-group">
          <label>Payroll Lock / Processing Day</label>
          <Select2
            value={formData.payrollLockDay}
            onChange={handleLockDayChange}
            options={PAYROLL_LOCK_DAYS}
            searchable={true}
            placeholder="Select Lock Day..."
          />
          <div className="field-hint">Locked by this date.</div>
        </div>

        <div className="form-group">
          <label>Salary Credit Day</label>
          <Select2
            value={formData.salaryCreditDay}
            onChange={val => onChange('salaryCreditDay', val)}
            options={availableSalaryCreditDays}
            searchable={true}
            placeholder="Select Credit Day..."
          />
          <div className="field-hint">Bank credit target.</div>
        </div>

        {!isInhouse && (
          <div className="form-group">
            <label>Invoice Raise Day <span style={{ color: 'var(--status-danger)' }}>*</span></label>
            <Select2
              value={formData.invoiceRaiseDay}
              onChange={val => onChange('invoiceRaiseDay', val)}
              options={INVOICE_RAISE_DAYS}
              searchable={false}
            />
            <div className="field-hint">Generated post-lock.</div>
          </div>
        )}
      </div>

      {/* AM & Dispute Window (3 Columns) */}
      {!isInhouse && (
        <div className="form-grid-3col" style={{ marginTop: '0.5rem' }}>
          <div className="form-group">
            <label>Invoice Dispute Window (days)</label>
            <input type="number" className="form-control" placeholder="e.g. 7" min="1" max="30"
              value={formData.invoiceDisputeDays} onChange={e => onChange('invoiceDisputeDays', e.target.value)} />
          </div>
          <div className="form-group">
            <label>Assigned Account Manager (AM)</label>
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
          </div>
        </div>
      )}

      {/* Auto-Reminder — hidden for In-House (no invoice reminders) */}
      {!isInhouse && (
        <>
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
            <div className="info-box" style={{ marginTop: '1rem', background: '#FFFBF0', borderColor: 'var(--accent-gold)', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
              <Info size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div><strong>System will auto-send:</strong> Attendance reminder 3 days before cut-off | Invoice reminder 2 days before due date | Overdue alert on Day 1, 7, 15 after due date</div>
            </div>
          )}

          <div className="suggestion-chip" style={{
            marginTop: '1rem', display: 'block', padding: '0.5rem 0.75rem',
            background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 'var(--radius-sm)',
            fontSize: '0.8rem', color: '#166534'
          }}>
            {hook.getInvoicePreview()}
          </div>
        </>
      )}

      <div className="form-group" style={{ marginTop: '1.5rem' }}>
        <label>Internal Notes / Special Instructions</label>
        <textarea className="form-control" rows="3"
          placeholder={isInhouse
            ? "e.g. Internal payroll for own development team. Salary processed on 1st of every month."
            : "e.g. Client requires separate salary breakup for contract vs permanent staff. Invoice to be sent in both PDF and XLSX format."
          }
          value={formData.clientNotes} onChange={e => onChange('clientNotes', e.target.value)}></textarea>
      </div>
    </>
  );
}
