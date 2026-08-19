import { AlertTriangle, CheckCircle2, Lock } from 'lucide-react';
import Card from '../../../../Components/ui/Card';
import Button from '../../../../Components/ui/Button';
import Badge from '../../../../Components/ui/Badge';
import Alert from '../../../../Components/ui/Alert';
import EmptyState from '../../../../Components/ui/EmptyState';
import { formatINR } from '../formBUtils';

export default function StepPayrollSource({
  loading, runs, hasLockedRun, periodLabel, selectedRunId, onSelectRun, onBack, onNext,
}) {
  const selectedRun = runs.find((r) => r.id === selectedRunId);

  return (
    <Card title="2. Select Payroll Source" subtitle="Select the payroll run from which Form B data will be generated.">
      <Alert
        type="info"
        message="Form B should be generated only from a locked payroll run to ensure the payroll data cannot change after review."
      />

      <div style={{ marginTop: '1rem' }}>
        {loading ? (
          <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', padding: '1rem 0' }}>Loading payroll runs...</div>
        ) : !hasLockedRun ? (
          <EmptyState
            icon={AlertTriangle}
            title={`No locked payroll run is available for ${periodLabel || 'this period'}`}
            message="Lock the payroll run first, then return here to generate Form B."
          />
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th></th>
                  <th>Payroll Run</th>
                  <th>Payroll Period</th>
                  <th>Status</th>
                  <th className="text-right">Employees</th>
                  <th className="text-right">Net Disbursement</th>
                  <th>Locked On</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((run) => {
                  const selectable = run.status === 'locked';
                  const isSelected = selectedRunId === run.id;
                  return (
                    <tr
                      key={run.id}
                      onClick={() => selectable && onSelectRun(run.id)}
                      style={{
                        cursor: selectable ? 'pointer' : 'not-allowed',
                        opacity: selectable ? 1 : 0.55,
                        background: isSelected ? '#EFF6FF' : undefined,
                      }}
                    >
                      <td>
                        <input type="radio" checked={isSelected} disabled={!selectable} onChange={() => selectable && onSelectRun(run.id)} />
                      </td>
                      <td>
                        <strong>{run.label}</strong>
                        {run.recommended && (
                          <span style={{ marginLeft: '0.5rem' }}>
                            <Badge status="locked" label="Recommended" />
                          </span>
                        )}
                      </td>
                      <td>{run.period_start} to {run.period_end}</td>
                      <td><Badge status={run.status} /></td>
                      <td className="text-right">{run.employees}</td>
                      <td className="text-right">{formatINR(run.net_disbursement)}</td>
                      <td>{run.locked_on || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedRun && (
        <div style={{ marginTop: '1.25rem', background: '#F0FDF4', border: '1px solid #86EFAC', borderRadius: '8px', padding: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, color: '#166534', marginBottom: '0.6rem', fontSize: '0.85rem' }}>
            <Lock size={14} /> Selected Payroll Summary
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem', fontSize: '0.82rem' }}>
            <div><span style={{ color: 'var(--text-muted)' }}>Payroll Period</span><br /><strong>{selectedRun.period_start} - {selectedRun.period_end}</strong></div>
            <div><span style={{ color: 'var(--text-muted)' }}>Total Employees</span><br /><strong>{selectedRun.employees}</strong></div>
            <div><span style={{ color: 'var(--text-muted)' }}>Net Disbursement</span><br /><strong>{formatINR(selectedRun.net_disbursement)}</strong></div>
            <div><span style={{ color: 'var(--text-muted)' }}>Locked On</span><br /><strong>{selectedRun.locked_on}</strong></div>
          </div>
        </div>
      )}

      <div style={{ marginTop: '1.75rem', display: 'flex', justifyContent: 'space-between' }}>
        <Button variant="secondary" onClick={onBack}>Back</Button>
        <Button variant="primary" onClick={onNext} disabled={!selectedRunId}>Continue to Review Data →</Button>
      </div>
    </Card>
  );
}
