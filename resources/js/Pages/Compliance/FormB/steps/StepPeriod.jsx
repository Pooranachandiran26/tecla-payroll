import { useState, useRef, useEffect } from 'react';
import { Info, Users, Wallet, AlertTriangle, HelpCircle, X, ExternalLink } from 'lucide-react';
import Card from '../../../../Components/ui/Card';
import Select from '../../../../Components/ui/Select';
import Button from '../../../../Components/ui/Button';
import Alert from '../../../../Components/ui/Alert';
import { formatINR, MONTH_OPTIONS, getYearOptions, computeDueDate } from '../formBUtils';

export default function StepPeriod({ year, month, onYearChange, onMonthChange, summary, loadingSummary, onNext, context, allowEarlyTesting = false }) {
  const dueDate = computeDueDate(year, month);
  const notApplicable = context && context.form_b_applicable === false;

  return (
    <Card title="1. Select Period" subtitle="Choose the payroll month this Form B register should cover.">
      {notApplicable && (
        <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem', color: '#B45309' }}>
          <AlertTriangle size={13} />
          Form B is unavailable for the establishment selected above — see Report Context. Change the client/branch to a Tamil Nadu establishment to continue.
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', maxWidth: '480px' }}>
        <Select
          label="Year"
          name="year"
          value={year}
          onChange={(e) => onYearChange(e.target.value)}
          options={getYearOptions()}
          placeholder="Select year..."
          required
          disabled={notApplicable}
        />
        <Select
          label="Month"
          name="month"
          value={month}
          onChange={(e) => onMonthChange(e.target.value)}
          options={MONTH_OPTIONS}
          placeholder="Select month..."
          required
          disabled={notApplicable}
        />
      </div>

      {dueDate && (
        <div style={{ margin: '0.75rem 0 1rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
          <span><strong>Due Date:</strong> <span style={{ color: 'var(--primary-navy)', fontWeight: 700 }}>{dueDate}</span></span>
          {allowEarlyTesting && (
            <span
              title="ALLOW_EARLY_FORM_B_PROCESSING is active — the payroll-cycle-end restriction is bypassed in this environment."
              style={{ fontSize: '0.68rem', fontWeight: 700, color: '#B45309', background: '#FFFBEB', border: '1px solid #FDE68A', padding: '0.15rem 0.55rem', borderRadius: '50px', cursor: 'help' }}
            >
              Testing Mode — early processing allowed
            </span>
          )}
        </div>
      )}

      <Alert
        type="info"
        icon={Info}
        message="Form B is required to be submitted on or before the 15th of the following month."
      />

      {month && (
        <div style={{ marginTop: '1.5rem' }}>
          <h4 style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
            Payroll Summary for This Period
          </h4>

          {loadingSummary ? (
            <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Loading payroll data...</div>
          ) : summary && summary.has_locked_run ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem' }}>
              <SummaryTile icon={Users} label="Total Employees" value={summary.total_employees} isCount />
              <SummaryTile icon={Wallet} label="Basic Wages" value={formatINR(summary.total_basic_wages)} />
              <SummaryTile icon={Wallet} label="DA" value={formatINR(summary.total_da)} daDetails={summary.da_details} />
              <SummaryTile icon={Wallet} label="Other Wage Components" value={formatINR(summary.total_other_wage_components)} />
            </div>
          ) : (
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              No locked payroll data available yet for this period. You can still continue — the next step will help you check payroll status.
            </div>
          )}
        </div>
      )}

      <div style={{ marginTop: '1.75rem', display: 'flex', justifyContent: 'flex-end' }}>
        <Button variant="primary" onClick={onNext} disabled={!year || !month || notApplicable}>Next →</Button>
      </div>
    </Card>
  );
}

function SummaryTile({ icon: Icon, label, value, isCount, daDetails }) {
  const [showPopover, setShowPopover] = useState(false);
  const popoverRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (popoverRef.current && !popoverRef.current.contains(event.target)) {
        setShowPopover(false);
      }
    }
    if (showPopover) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showPopover]);

  return (
    <div style={{ background: '#F8FAFC', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.75rem 1rem', position: 'relative' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
        <Icon size={12} /> {label}
        {daDetails && (
          <button
            type="button"
            onClick={() => setShowPopover(!showPopover)}
            aria-label="About DA"
            title="Click to see how DA is set"
            style={{
              background: 'none',
              border: 'none',
              padding: '0 2px',
              cursor: 'pointer',
              color: showPopover ? 'var(--primary-navy)' : 'var(--text-muted)',
              display: 'inline-flex',
              alignItems: 'center',
              borderRadius: '50%',
              transition: 'color 0.15s ease',
            }}
          >
            <HelpCircle size={13} />
          </button>
        )}
      </div>
      <div style={{ fontSize: isCount ? '1.1rem' : '0.95rem', fontWeight: 700, color: 'var(--primary-navy)', marginTop: '0.25rem' }}>
        {value}
      </div>

      {daDetails && showPopover && (
        <div
          ref={popoverRef}
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            left: 0,
            zIndex: 100,
            width: '300px',
            background: '#FFFFFF',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
            padding: '1rem',
            fontSize: '0.82rem',
            color: 'var(--text-main)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
            <span style={{ fontWeight: 700, color: 'var(--primary-navy)', fontSize: '0.88rem' }}>
              About DA
            </span>
            <button
              type="button"
              onClick={() => setShowPopover(false)}
              aria-label="Close DA info"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '2px', display: 'inline-flex' }}
            >
              <X size={14} />
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            <div style={{ fontSize: '0.78rem', color: '#1E293B', lineHeight: 1.4 }}>
              DA is a fixed rupee amount entered in each employee's Salary Structure — it is <strong>not</strong> calculated as a percentage of Basic.
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
              <div>
                <div style={{ fontSize: '0.68rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>Basic Wages</div>
                <div style={{ fontWeight: 700, color: 'var(--primary-navy)', fontSize: '0.88rem' }}>
                  {formatINR(daDetails.da_base)}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.68rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>DA Amount</div>
                <div style={{ fontWeight: 700, color: 'var(--primary-navy)', fontSize: '0.88rem' }}>
                  {formatINR(daDetails.da_amount)}
                </div>
              </div>
            </div>

            <div style={{ background: '#F8FAFC', padding: '0.5rem 0.65rem', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
              <div style={{ fontSize: '0.68rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>Effective DA Ratio (reference only)</div>
              <div style={{ fontWeight: 700, color: '#1E293B', fontSize: '0.85rem', marginTop: '0.1rem' }}>
                {daDetails.has_da_rate ? daDetails.da_rate_formatted : 'Not available for this period.'}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                Back-calculated from this period's totals (DA ÷ Basic) — shown for reference only. It is not a configured rate and is not used in any calculation.
              </div>
            </div>

            <a
              href={daDetails.da_configuration_url}
              target="_self"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.35rem',
                marginTop: '0.2rem',
                padding: '0.45rem 0.75rem',
                background: 'var(--primary-navy)',
                color: '#FFFFFF',
                fontWeight: 600,
                textDecoration: 'none',
                fontSize: '0.8rem',
                borderRadius: '6px',
              }}
            >
              View Employee Salary Structure <ExternalLink size={12} />
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
