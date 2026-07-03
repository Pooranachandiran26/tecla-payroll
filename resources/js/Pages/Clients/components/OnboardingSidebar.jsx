import React from 'react';
import { WIZARD_STEPS, REQUIRED_DOC_TYPES, DOC_TYPE_LABELS, DOC_TYPE_ICONS } from '../constants/clientFormData';

export default function OnboardingSidebar({
  currentStep, sectionProgress, completionPct, completionCount, uploadedDocs
}) {
  const checklistItems = [
    { id: 'ob-identity', label: 'Company Identity', step: 1 },
    { id: 'ob-address', label: 'Address & Locations', step: 2 },
    { id: 'ob-contacts', label: 'Contact Persons', step: 3 },
    { id: 'ob-contract', label: 'Contract & Billing', step: 4 },
    { id: 'ob-statutory', label: 'Statutory Defaults', step: 5 },
    { id: 'ob-documents', label: 'Compliance Docs', step: 6 },
    { id: 'ob-portal', label: 'Portal Access', step: 7 },
    { id: 'ob-sla', label: 'SLA & Calendar', step: 8 },
  ];

  const docChecklist = REQUIRED_DOC_TYPES.map(type => ({
    type, label: DOC_TYPE_LABELS[type], icon: DOC_TYPE_ICONS[type],
    uploaded: uploadedDocs.some(d => d.type === type),
  }));

  return (
    <div>
      {/* Completion Status */}
      <div className="card" style={{ marginBottom: '1rem' }}>
        <h4 style={{ fontSize: '0.9rem', marginBottom: '0.75rem', color: 'var(--primary-navy)' }}>
          📋 Onboarding Progress
        </h4>
        <div style={{
          height: '8px', background: 'var(--border-color)', borderRadius: '4px',
          overflow: 'hidden', marginBottom: '0.5rem',
        }}>
          <div style={{
            height: '100%', width: `${completionPct}%`, borderRadius: '4px',
            background: completionPct === 100 ? 'var(--status-success)' : 'var(--accent-gold)',
            transition: 'width 0.3s ease',
          }} />
        </div>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'right' }}>
          {completionCount}/8 sections • {completionPct}%
        </p>
      </div>

      {/* Section Checklist */}
      <div className="card" style={{ marginBottom: '1rem' }}>
        <h4 style={{ fontSize: '0.9rem', marginBottom: '0.75rem', color: 'var(--primary-navy)' }}>
          ✅ Section Checklist
        </h4>
        {checklistItems.map(item => {
          const isDone = item.step < currentStep || sectionProgress[item.step];
          return (
            <div key={item.id} id={item.id}
              className={`checklist-item${isDone ? ' done' : ''}`}
            >
              <span className="check-icon">{isDone ? '✅' : '⬜'}</span>
              <span>{item.label}</span>
            </div>
          );
        })}
      </div>

      {/* Document Readiness */}
      <div className="card" style={{ marginBottom: '1rem' }}>
        <h4 style={{ fontSize: '0.9rem', marginBottom: '0.75rem', color: 'var(--primary-navy)' }}>
          📂 Document Readiness
        </h4>
        {docChecklist.map(doc => (
          <div key={doc.type} style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            fontSize: '0.78rem', padding: '0.3rem 0',
            color: doc.uploaded ? 'var(--status-success)' : 'var(--text-muted)',
          }}>
            <span>{doc.icon}</span>
            <span style={{
              textDecoration: doc.uploaded ? 'line-through' : 'none',
              flex: 1,
            }}>
              {doc.label}
            </span>
            <span>{doc.uploaded ? '✅' : '⬜'}</span>
          </div>
        ))}
      </div>

      {/* Quick Reference */}
      <div className="card" style={{ background: '#FFF7ED', border: '1px solid #FDBA74' }}>
        <h4 style={{ marginBottom: '0.75rem', fontSize: '0.9rem', color: '#9A3412' }}>
          📚 Document Guidelines
        </h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
          <div>📜 <strong>MSA</strong> — Governs entire engagement. Mandatory before first invoice.</div>
          <div>🔒 <strong>NDA</strong> — Required before sharing candidate data.</div>
          <div>📋 <strong>Work Order</strong> — Scope of each deployment. Renew annually.</div>
          <div>🏛️ <strong>GST Certificate</strong> — Required for GST-compliant invoicing.</div>
          <div>💳 <strong>PAN Card</strong> — Required for TDS compliance.</div>
        </div>
      </div>

      {/* Billing Model Guide */}
      <div className="card" style={{ background: '#F0FDF4', border: '1px solid #86EFAC', marginTop: '1rem' }}>
        <h4 style={{ marginBottom: '0.75rem', fontSize: '0.9rem', color: '#166534' }}>
          💡 Billing Model Guide
        </h4>
        <div style={{ fontSize: '0.78rem', color: '#14532D', lineHeight: '1.7' }}>
          <div><strong>CTC + Markup:</strong> You bill CTC × (1 + markup%). Best for agency model.</div>
          <div><strong>Fixed/Candidate:</strong> Flat fee per head per month. Predictable for client.</div>
          <div><strong>Monthly Retainer:</strong> Flat monthly fee regardless of headcount. Best for managed services.</div>
          <div><strong>Hourly:</strong> Bill per hour worked. Common for consulting engagements.</div>
        </div>
      </div>
    </div>
  );
}
