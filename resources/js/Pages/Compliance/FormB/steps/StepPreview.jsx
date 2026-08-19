import { Info } from 'lucide-react';
import Card from '../../../../Components/ui/Card';
import Button from '../../../../Components/ui/Button';
import Badge from '../../../../Components/ui/Badge';
import Alert from '../../../../Components/ui/Alert';
import { formatINR } from '../formBUtils';

export default function StepPreview({ data, batch, generating, onBack, onDownload, onContinue }) {
  if (!data) return null;

  return (
    <Card title="Form B - Register of Wages" subtitle="Preview the generated Form B before download.">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <SummaryStat label="Payroll Status" value={<Badge status="locked" />} />
        <SummaryStat label="Selected Month" value={data.period_label} />
        <SummaryStat label="Total Employees" value={data.employee_count} />
        <SummaryStat label="Total Employment Payable" value={formatINR(data.emoluments.total)} />
      </div>

      <Alert
        type="info"
        icon={Info}
        message="This is a system-generated preview based on the selected payroll data. Please review the details carefully before downloading."
      />

      <div className="form-b-document" style={{
        marginTop: '1.25rem', border: '1px solid var(--border-color)', borderRadius: '8px',
        padding: '2rem', background: '#fff', maxWidth: '820px', marginLeft: 'auto', marginRight: 'auto',
        fontFamily: 'Georgia, serif',
      }}>
        <div style={{ textAlign: 'center', fontWeight: 700, fontSize: '1.1rem', textTransform: 'uppercase' }}>Form B</div>
        <div style={{ textAlign: 'center', fontSize: '0.95rem' }}>Register of Wages</div>
        <div style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
          (See Rule 29, Tamil Nadu Labour Welfare Fund Rules, 1973)
        </div>
        <div style={{ textAlign: 'center', fontSize: '0.85rem', marginBottom: '1.25rem' }}>For the Month of {data.period_label}</div>

        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '1.25rem', fontSize: '0.8rem' }}>
          <tbody>
            <DocRow label="Name of Establishment" value={data.establishment.name} />
            <DocRow label="Address" value={data.establishment.address || 'Not on file'} />
            <DocRow label="Registration Number" value={data.establishment.registration_number} />
            <DocRow label="State" value={data.establishment.state} />
          </tbody>
        </table>

        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--primary-navy)', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
          Statutory Register of Wages — Form B official columns (Rule 29)
        </div>
        <div className="table-responsive">
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.72rem', marginBottom: '1rem' }}>
            <thead>
              <tr>
                <th style={thStyle}>(1) Total Employees</th>
                <th style={thStyle}>(2) Total Emoluments Payable (incl. Basic, D.A., O.T., Bonus)</th>
                <th style={thStyle}>(3a) Fine</th>
                <th style={thStyle}>(3b) Other Deductions</th>
                <th style={thStyle}>(4) Amount Actually Paid</th>
                <th style={thStyle}>(5) Balance Due</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={tdCenter}>{data.employee_count}</td>
                <td style={tdCenter}>{formatINR(data.emoluments.total)}</td>
                <td style={tdCenter}>
                  {data.deductions.fine_available ? formatINR(data.deductions.fine) : <NotTracked />}
                </td>
                <td style={tdCenter}>{formatINR(data.deductions.other_deductions)}</td>
                <td style={tdCenter}>{formatINR(data.amount_actually_paid)}</td>
                <td style={tdCenter}>{formatINR(data.balance_due)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--primary-navy)', textTransform: 'uppercase', margin: '1.25rem 0 0.4rem' }}>
          Supporting Calculation (TECLA detail — not part of the official Form B columns)
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
          <tbody>
            <DocLine label="Basic Wages" value={formatINR(data.emoluments.basic_wages)} />
            <DocLine label="Dearness Allowance (D.A.)" value={formatINR(data.emoluments.da)} />
            <DocLine label="Overtime Wages (O.T.)" value={data.emoluments.ot_available ? formatINR(data.emoluments.ot) : <NotTracked />} />
            <DocLine label="Bonus" value={data.emoluments.bonus_available ? formatINR(data.emoluments.bonus) : <NotTracked />} />
            <DocLine label="Other Wage Components (HRA, Conveyance, Medical & Special Allowances)" value={formatINR(data.emoluments.other_wage_components)} />
            <DocLine label="= Total Emoluments Payable (matches column 2 above)" value={formatINR(data.emoluments.total)} bold />
            <tr><td colSpan={2} style={{ padding: '0.4rem 0' }} /></tr>
            <DocLine label="Fine" value={data.deductions.fine_available ? formatINR(data.deductions.fine) : <NotTracked />} />
            <DocLine label="Other Deductions (PF, ESI, PT, LWF, TDS, Loan EMI)" value={formatINR(data.deductions.other_deductions)} />
            <DocLine label="= Total Deductions, excludes Fine (matches column 3b above)" value={formatINR(data.deductions.total)} bold />
          </tbody>
        </table>

        <table style={{ width: '100%', marginTop: '2.5rem', fontSize: '0.78rem' }}>
          <tbody>
            <tr>
              <td style={{ borderTop: '1px solid #1e293b', paddingTop: '0.35rem', width: '33%' }}>Place</td>
              <td style={{ borderTop: '1px solid #1e293b', paddingTop: '0.35rem', width: '33%' }}>Date</td>
              <td style={{ borderTop: '1px solid #1e293b', paddingTop: '0.35rem', width: '34%' }}>Signature of Employer / Authorised Signatory</td>
            </tr>
          </tbody>
        </table>

        <div style={{ marginTop: '1.5rem', fontSize: '0.68rem', color: 'var(--text-muted)', borderTop: '1px dashed var(--border-color)', paddingTop: '0.6rem' }}>
          {data.form_layout_note}
        </div>
      </div>

      <div style={{ marginTop: '1.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Button variant="secondary" onClick={onBack}>Back</Button>
        <div style={{ display: 'flex', gap: '0.6rem' }}>
          <Button
            variant="outline"
            loading={generating}
            onClick={() => onDownload('xlsx')}
            disabled={generating}
          >
            Download Excel
          </Button>
          <Button
            variant="primary"
            loading={generating}
            onClick={() => onDownload('pdf')}
            disabled={generating}
          >
            Download PDF
          </Button>
        </div>
      </div>

      <div style={{ marginTop: '0.75rem', textAlign: 'right' }}>
        <Button variant="link" size="sm" onClick={onContinue}>More download options (Excel, CSV) →</Button>
      </div>
    </Card>
  );
}

const thStyle = { background: '#1F3864', color: '#fff', fontWeight: 700, padding: '0.4rem 0.3rem', border: '1px solid #1F3864', textAlign: 'center' };
const tdCenter = { padding: '0.5rem 0.3rem', border: '1px solid #E2E8F0', textAlign: 'center' };

function NotTracked() {
  return <span style={{ color: 'var(--text-muted)' }}>—</span>;
}

function DocRow({ label, value }) {
  return (
    <tr>
      <td style={{ fontWeight: 700, width: '35%', padding: '0.2rem 0' }}>{label}</td>
      <td style={{ padding: '0.2rem 0' }}>{value}</td>
    </tr>
  );
}

function DocLine({ label, value, bold }) {
  return (
    <tr style={bold ? { fontWeight: 700, background: '#F8FAFC' } : undefined}>
      <td style={{ padding: '0.3rem 0.4rem', borderBottom: '1px solid #E2E8F0' }}>{label}</td>
      <td style={{ padding: '0.3rem 0.4rem', borderBottom: '1px solid #E2E8F0', textAlign: 'right' }}>{value}</td>
    </tr>
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
