import React, { useRef } from 'react';
import { usePage, router } from '@inertiajs/react';
import { REQUIRED_DOC_TYPES, DOC_TYPE_LABELS, DOC_TYPE_ICONS } from '../constants/clientFormData';

export default function DocumentsSection({ formData, hook }) {
  const fileInputRef = useRef(null);

  const handleDocClick = (type) => {
    hook.setPendingDocType(type);
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.currentTarget.classList.add('dragover');
  };

  const handleDragLeave = (e) => {
    e.currentTarget.classList.remove('dragover');
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.currentTarget.classList.remove('dragover');
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      hook.processFiles(e.dataTransfer.files, hook.pendingDocType);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      hook.processFiles(e.target.files, hook.pendingDocType);
    }
  };

  const { auth } = usePage().props;
  const canVerify = auth.user.role === 'admin' || auth.user.role === 'manager';

  const handleVerify = (docDbId, status) => {
    if (!hook.editId) return;
    const reason = status === 'rejected' ? prompt("Enter rejection reason:") : null;
    if (status === 'rejected' && !reason) return;
    
    router.put(route('clients.documents.verify', { client: hook.editId, document: docDbId }), { status, reason }, { preserveScroll: true });
  };

  return (
    <>
      <div className="section-header">
        <div className="section-icon">📁</div>
        <h3>Compliance Documents</h3>
        <span className="section-badge">REQUIRED FOR ACTIVATION</span>
      </div>

      <div className="info-box" style={{ marginBottom: '1rem' }}>
        📋 Upload all required compliance documents. Supported formats: <strong>PDF, JPG, PNG, XLSX</strong>. Max size per file: <strong>10 MB</strong>.
        Documents are encrypted and stored securely.
      </div>

      {/* Quick upload buttons */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
        {REQUIRED_DOC_TYPES.map(type => (
          <button key={type} type="button" className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem' }}
            onClick={() => handleDocClick(type)}>
            {DOC_TYPE_ICONS[type]} {type === 'other' ? 'Other Document' : `Upload ${DOC_TYPE_LABELS[type]}`}
          </button>
        ))}
      </div>

      {/* Drag & Drop Upload Zone */}
      <div className="doc-upload-zone"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => handleDocClick('other')}
      >
        <div className="upload-icon">☁️</div>
        <p><strong>Drag &amp; drop files here</strong></p>
        <p>or click to browse from your computer</p>
        <p style={{ marginTop: '0.5rem', fontSize: '0.72rem', color: '#94A3B8' }}>PDF, JPG, PNG, XLSX — Max 10 MB per file</p>
      </div>
      <input type="file" ref={fileInputRef} multiple accept=".pdf,.jpg,.jpeg,.png,.xlsx,.xls" style={{ display: 'none' }}
        onChange={handleFileChange} />

      {/* Uploaded documents list */}
      <div className="doc-list" style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {hook.uploadedDocs.map(doc => (
          <div key={doc.id} className="doc-item" style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '0.75rem 1rem', background: '#F8FAFC', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span style={{ fontSize: '1.25rem' }}>{DOC_TYPE_ICONS[doc.type] || '📄'}</span>
              <div>
                <strong style={{ fontSize: '0.85rem', display: 'block', color: 'var(--primary-navy)' }}>
                  {doc.name}
                  {doc.verification_status && (
                    <span style={{ 
                      marginLeft: '0.5rem', padding: '0.1rem 0.4rem', borderRadius: '4px', fontSize: '0.65rem',
                      background: doc.verification_status === 'verified' ? '#DEF7EC' : doc.verification_status === 'rejected' ? '#FDE8E8' : '#FEF3C7',
                      color: doc.verification_status === 'verified' ? '#03543F' : doc.verification_status === 'rejected' ? '#9B1C1C' : '#92400E'
                    }}>
                      {doc.verification_status.toUpperCase()}
                    </span>
                  )}
                </strong>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{DOC_TYPE_LABELS[doc.type]} • {(doc.size / 1024 / 1024).toFixed(2)} MB</span>
                {doc.rejection_reason && (
                  <div style={{ fontSize: '0.7rem', color: '#9B1C1C', marginTop: '0.2rem' }}>Reason: {doc.rejection_reason}</div>
                )}
              </div>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              {doc.dbId && (
                <a href={route('clients.documents.download', { client: hook.editId, document: doc.dbId })} target="_blank" rel="noreferrer"
                  style={{ fontSize: '0.8rem', color: 'var(--primary-blue)', textDecoration: 'none', fontWeight: 600 }}>
                  ⬇️ Download
                </a>
              )}
              
              {doc.dbId && canVerify && doc.verification_status === 'pending' && (
                <>
                  <button type="button" onClick={() => handleVerify(doc.dbId, 'verified')} style={{ background: 'none', border: 'none', color: '#03543F', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>✅ Verify</button>
                  <button type="button" onClick={() => handleVerify(doc.dbId, 'rejected')} style={{ background: 'none', border: 'none', color: '#9B1C1C', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>❌ Reject</button>
                </>
              )}

              {!doc.dbId && (
                <button type="button" onClick={() => hook.removeDoc(doc.id)}
                  style={{ background: 'none', border: 'none', color: 'var(--status-danger)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>
                  🗑 Remove
                </button>
              )}
            </div>
          </div>
        ))}
        {hook.uploadedDocs.length === 0 && (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.85rem', border: '1px dashed var(--border-color)', borderRadius: 'var(--radius-sm)' }}>
            No documents uploaded yet.
          </div>
        )}
      </div>

      {/* Required documents checklist */}
      <div style={{ marginTop: '1.5rem', background: '#F8FAFC', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '0.75rem' }}>
        <div style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.75rem', color: 'var(--primary-navy)' }}>📌 Required Documents Checklist</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
          {REQUIRED_DOC_TYPES.filter(t => t !== 'other').map(type => {
            const isUploaded = hook.uploadedDocs.some(d => d.type === type);
            return (
              <div key={type} className={`checklist-item ${isUploaded ? 'done' : ''}`} style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span className="check-icon">{isUploaded ? '✅' : '⬜'}</span>
                <span style={{ textDecoration: isUploaded ? 'line-through' : 'none', color: isUploaded ? 'var(--text-muted)' : 'inherit' }}>
                  {DOC_TYPE_LABELS[type]}
                  {type === 'tan_doc' && <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginLeft: '0.25rem' }}>(Optional)</span>}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
