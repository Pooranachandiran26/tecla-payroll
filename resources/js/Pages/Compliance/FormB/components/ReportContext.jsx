import { Building2, MapPin, Scale, FileText, CheckCircle2, AlertTriangle } from 'lucide-react';
import Card from '../../../../Components/ui/Card';
import Select from '../../../../Components/ui/Select';

/**
 * Report Context — the fundamental Client/Establishment scope for this Form B, shown inline at
 * the top of the page instead of behind a modal. Client and Branch are user-editable selects;
 * State/Applicable Act/Legal Basis are always derived, never manually entered — they mirror
 * FormBGeneratorService::resolveContext() on the server (the actual enforcement point), so the
 * frontend only ever displays backend-derived Tamil-Nadu-applicability logic, never invents it.
 */
export default function ReportContext({ clients, clientId, branchId, context, onClientChange, onBranchChange }) {
  const selectedClient = clients.find((c) => c.id === clientId);
  const branches = selectedClient?.branches || [];

  const isApplicable = context?.form_b_applicable === true;
  const isKnown = !!context;

  return (
    <Card noPadding className="mb-4">
      <div style={{ padding: '1.1rem 1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <Building2 size={16} color="var(--primary-navy)" />
          <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--primary-navy)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Report Context
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', alignItems: 'start' }}>
          <div>
            <FieldLabel icon={Building2} text="Client / Company" />
            {clients.length === 0 ? (
              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', paddingTop: '0.3rem' }}>
                No clients available.
              </div>
            ) : (
              <Select
                name="report_context_client"
                value={clientId || ''}
                onChange={(e) => onClientChange(e.target.value ? parseInt(e.target.value, 10) : null)}
                options={clients.map((c) => ({ value: c.id, label: c.company_name }))}
                placeholder="Select client..."
                noMargin
              />
            )}
          </div>

          <div>
            <FieldLabel icon={MapPin} text="Establishment / Branch" />
            <Select
              name="report_context_branch"
              value={branchId || ''}
              onChange={(e) => onBranchChange(e.target.value ? parseInt(e.target.value, 10) : null)}
              options={branches.map((b) => ({ value: b.id, label: b.branch_name + (b.is_head_office ? ' (Head Office)' : '') }))}
              placeholder="All Branches (Client-wide)"
              disabled={!selectedClient || branches.length === 0}
              noMargin
            />
          </div>

          <DerivedField icon={MapPin} label="State / UT" value={isKnown ? context.state : '—'} />
          <DerivedField icon={Scale} label="Applicable Act" value={isKnown ? context.applicable_act : '—'} muted={isKnown && !isApplicable} />
        </div>

        {isKnown && (
          <div style={{
            marginTop: '1rem', paddingTop: '0.85rem', borderTop: '1px solid var(--border-color)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem',
          }}>
            <div>
              <FieldLabel icon={FileText} text="Legal Basis" />
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: isApplicable ? 'var(--text-main)' : 'var(--text-muted)', marginTop: '0.2rem' }}>
                {context.legal_basis}
              </div>
            </div>

            {isApplicable ? (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', fontWeight: 700, color: 'var(--status-success)', background: 'var(--status-success-bg)', padding: '0.3rem 0.65rem', borderRadius: '50px' }}>
                <CheckCircle2 size={13} /> Valid for Form B
              </span>
            ) : (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', fontWeight: 700, color: '#B45309', background: '#FFFBEB', border: '1px solid #FDE68A', padding: '0.3rem 0.65rem', borderRadius: '50px' }}>
                <AlertTriangle size={13} /> Not Applicable
              </span>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}

function FieldLabel({ icon: Icon, text }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.02em', marginBottom: '0.3rem' }}>
      <Icon size={11} /> {text}
    </div>
  );
}

function DerivedField({ icon, label, value, muted }) {
  return (
    <div>
      <FieldLabel icon={icon} text={label} />
      <div style={{ fontSize: '0.85rem', fontWeight: 700, color: muted ? 'var(--text-muted)' : 'var(--text-main)', paddingTop: '0.3rem' }}>
        {value || '—'}
      </div>
    </div>
  );
}
