import Modal from '../Modal';
import Button from '../Button';
import { AlertTriangle } from 'lucide-react';

export default function ConfirmDialog({
  isOpen, onClose, onConfirm, title = 'Confirm Action',
  message = 'Are you sure?', confirmLabel = 'Confirm',
  cancelLabel = 'Cancel', variant = 'danger', loading = false,
}) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button variant={variant} onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
        <AlertTriangle size={24} style={{ color: 'var(--status-warning)', flexShrink: 0, marginTop: '0.125rem' }} />
        <p style={{ fontSize: '0.9rem', margin: 0 }}>{message}</p>
      </div>
    </Modal>
  );
}
