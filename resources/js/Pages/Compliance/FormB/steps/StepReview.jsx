import { Info, ShieldCheck, AlertTriangle } from 'lucide-react';
import Card from '../../../../Components/ui/Card';
import Button from '../../../../Components/ui/Button';
import Alert from '../../../../Components/ui/Alert';
import { formatINR } from '../formBUtils';

function InfoIcon({ text }) {
  return (
    <span title={text} style={{ display: 'inline-flex', color: 'var(--text-muted)', cursor: 'help', marginLeft: '0.3rem', verticalAlign: 'middle' }}>
      <Info size={13} />
    </span>
  );
}

function SystemCalculatedTag() {
  return (
    <span title="Calculated from locked payroll." style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.68rem', color: 'var(--status-success)', fontWeight: 600, cursor: 'help' }}>
      <ShieldCheck size={12} /> System calculated
    </span>
  );
}

function NotTrackedTag({ note }) {
  return (
    <span title={note} style={{ color: 'var(--text-muted)', cursor: note ? 'help' : 'default' }}>
      —
    </span>
  );
}

// amount === null/undefined AND available === false renders a dash instead of a currency figure —
// the value is genuinely unknown, never presented as a confirmed ₹0.00.
function Row({ particulars, details, amount, available = true, note, isTotal, statutoryRef }) {
  return (
    <tr style={isTotal ? { background: '#F1F5F9', fontWeight: 700 } : undefined}>
      <td>
        {particulars}
        {statutoryRef && <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 400 }}>{statutoryRef}</div>}
      </td>
      <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
        {details}
        {note && <div style={{ fontSize: '0.72rem', color: '#B45309', marginTop: '0.15rem' }}>{note}</div>}
      </td>
      <td className="text-right">
        {available ? formatINR(amount) : <NotTrackedTag note={note} />}
      </td>
      <td>{!isTotal && available && <SystemCalculatedTag />}</td>
    </tr>
  );
}

function SectionHeader({ children }) {
  return (
    <tr>
      <td colSpan={4} style={{ background: '#1F3864', color: '#fff', fontWeight: 700, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
        {children}
      </td>
    </tr>
  );
}

export default function StepReview({ data, onBack, onNext }) {
  if (!data) return null;

  return (
    <Card title="Form B - Review Data" subtitle="Review the data that will appear in Form B before preview.">
      <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: '8px', padding: '0.75rem 1rem', marginBottom: '1.25rem', fontSize: '0.82rem', color: '#1E3A8A' }}>
        These values are calculated from the selected locked payroll run ({data.period_label}, locked on {data.locked_on}).
        {data.form_layout_note && <div style={{ marginTop: '0.35rem', fontSize: '0.75rem' }}>{data.form_layout_note}</div>}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <SummaryStat label="Payroll Period" value={`${data.period_start} - ${data.period_end}`} />
        <SummaryStat label="Total Employees" value={data.employee_count} />
        <SummaryStat label="Net Disbursement" value={formatINR(data.net_payable)} />
        <SummaryStat label="Locked On" value={data.locked_on} />
      </div>

      <h4 style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
        Review Form B Values
      </h4>

      <div className="table-responsive">
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: '26%' }}>Particulars</th>
              <th style={{ width: '34%' }}>Details</th>
              <th style={{ width: '20%' }} className="text-right">Amount (₹)</th>
              <th style={{ width: '20%' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            <Row particulars="Total Number of Employees" statutoryRef="Column (1)" details="Employees included in the locked payroll run" amount={data.employee_count} />

            <SectionHeader>Total Emoluments Payable — supporting breakdown (Column 2)</SectionHeader>
            <Row particulars="Basic Wages" details="Sum of Basic Pay" amount={data.emoluments.basic_wages} />
            <Row particulars="Dearness Allowance (DA)" details="Sum of DA" amount={data.emoluments.da} />
            <Row
              particulars="Overtime Wages (O.T.)"
              details="Not separately identifiable in TECLA"
              note={data.emoluments.ot_note}
              amount={data.emoluments.ot}
              available={data.emoluments.ot_available}
            />
            <Row
              particulars="Bonus"
              details="Not separately identifiable in TECLA"
              note={data.emoluments.bonus_note}
              amount={data.emoluments.bonus}
              available={data.emoluments.bonus_available}
            />
            <Row particulars="Other Wage Components" details={data.emoluments.other_wage_components_note} amount={data.emoluments.other_wage_components} />
            <Row particulars="Total Emoluments Payable" statutoryRef="= Column (2)" details="Basic + DA + Other Wage Components" amount={data.emoluments.total} isTotal />

            <SectionHeader>Amounts Deducted — Column (3)</SectionHeader>
            <Row
              particulars="Fine"
              statutoryRef="Column (3a)"
              details="Disciplinary fines"
              note={data.deductions.fine_note}
              amount={data.deductions.fine}
              available={data.deductions.fine_available}
            />
            <Row particulars="Other Deductions" statutoryRef="Column (3b)" details="PF, ESI, PT, LWF, TDS, Loan EMI (grouped)" amount={data.deductions.other_deductions} />
            <Row particulars="Total Deductions" details={data.deductions.total_note} amount={data.deductions.total} isTotal />

            <SectionHeader>Payment</SectionHeader>
            <Row
              particulars={<span>Amount Actually Paid<InfoIcon text="Based on the locked payroll run. TECLA currently does not track bank payment confirmation." /></span>}
              statutoryRef="Column (4)"
              details="Net Pay from the locked payroll run"
              amount={data.amount_actually_paid}
            />
            <Row
              particulars={<span>Balance Due<InfoIcon text="Amount is based on the locked payroll net pay. Actual bank payment confirmation is not currently tracked in TECLA. Excludes Fine, which is not tracked." /></span>}
              statutoryRef="Column (5)"
              details="Total Emoluments Payable − Total Deductions − Amount Actually Paid"
              amount={data.balance_due}
            />
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: '1rem' }}>
        <Alert
          type="warning"
          icon={AlertTriangle}
          message="Overtime, Bonus and Fine are not tracked in TECLA. If any of these applied this payroll period, verify and add them manually to the register before filing with the Labour Welfare Fund Department."
        />
      </div>

      <div style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
        Based on the locked payroll run. TECLA currently does not track bank payment confirmation (payment status, UTR, or transaction reference).
      </div>

      <div style={{ marginTop: '1.75rem', display: 'flex', justifyContent: 'space-between' }}>
        <Button variant="secondary" onClick={onBack}>Back</Button>
        <Button variant="primary" onClick={onNext}>Continue to Preview →</Button>
      </div>
    </Card>
  );
}

function SummaryStat({ label, value }) {
  return (
    <div style={{ background: '#F8FAFC', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.6rem 0.85rem' }}>
      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--primary-navy)', marginTop: '0.15rem' }}>{value}</div>
    </div>
  );
}
