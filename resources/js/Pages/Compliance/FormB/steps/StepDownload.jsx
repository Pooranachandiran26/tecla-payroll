import { CheckCircle2, FileText, FileSpreadsheet, FileCode2 } from 'lucide-react';
import Card from '../../../../Components/ui/Card';
import Button from '../../../../Components/ui/Button';
import Badge from '../../../../Components/ui/Badge';
import Select from '../../../../Components/ui/Select';
import { formatINR } from '../formBUtils';

export default function StepDownload({ data, onDownload, onBack }) {
  if (!data) return null;

  return (
    <Card title="Form B - Download / Export" subtitle="Download or export the finalized Form B for submission to the Labour Welfare Fund Department.">
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--status-success)', fontWeight: 700, fontSize: '0.9rem', marginBottom: '1.25rem' }}>
        <CheckCircle2 size={18} /> Form B is ready for download.
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem', marginBottom: '1.75rem' }}>
        <SummaryStat label="Month & Year" value={data.period_label} />
        <SummaryStat label="Total Employees" value={data.employee_count} />
        <SummaryStat label="Total Emoluments Payable" value={formatINR(data.emoluments.total)} />
        <SummaryStat label="Payroll Status" value={<Badge status="locked" />} />
        <SummaryStat label="Report Pages" value="1 page" />
      </div>

      <h4 style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
        Download Options
      </h4>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <FormatCard
          icon={FileText}
          title="PDF"
          recommended
          description="Best for official submission and printing."
          onClick={() => onDownload('pdf')}
        />
        <FormatCard
          icon={FileSpreadsheet}
          title="Excel (.xlsx)"
          description="Best for internal review and record keeping."
          onClick={() => onDownload('xlsx')}
        />
        <FormatCard
          icon={FileCode2}
          title="CSV (.csv)"
          description="Best for raw data export / system integration. Not the official statutory submission format."
          onClick={() => onDownload('csv')}
        />
      </div>

      <h4 style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
        Additional Settings
      </h4>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.75rem', maxWidth: '520px' }}>
        <div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem' }}>
            <input type="checkbox" checked disabled /> Include summary page
          </label>
          <div className="form-hint">The Form B summary page is always included.</div>
        </div>
        <Select
          label="Language"
          name="language"
          value="en"
          onChange={() => {}}
          options={[{ value: 'en', label: 'English' }]}
          hint="Additional languages coming soon."
          disabled
        />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Button variant="secondary" onClick={onBack}>Back</Button>
        <div style={{ display: 'flex', gap: '0.6rem' }}>
          <Button variant="outline" onClick={() => onDownload('csv')}>Download CSV</Button>
          <Button variant="outline" onClick={() => onDownload('xlsx')}>Download Excel</Button>
          <Button variant="primary" onClick={() => onDownload('pdf')}>Download PDF</Button>
        </div>
      </div>
    </Card>
  );
}

function FormatCard({ icon: Icon, title, description, recommended, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        border: recommended ? '1.5px solid #1F3864' : '1px solid var(--border-color)',
        borderRadius: '8px', padding: '1rem', cursor: 'pointer', background: recommended ? '#EFF6FF' : '#fff',
        transition: 'all 0.15s ease',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
        <Icon size={20} color="var(--primary-navy)" />
        {recommended && <Badge status="active" label="Recommended" />}
      </div>
      <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-main)' }}>{title}</div>
      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{description}</div>
    </div>
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
