import { X } from 'lucide-react';
import { classNames } from '../../../Utils/formatters';

const sizeClasses = {
  sm: 'modal-box-sm',
  md: '',
  lg: 'modal-box-lg',
  xl: 'modal-box-xl',
  full: 'modal-box-full',
};

export default function Modal({
  isOpen, onClose, title, size = 'md', children, footer, closable = true,
}) {
  if (!isOpen) return null;

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget && closable) {
      onClose?.();
    }
  };

  return (
    <div
      className={classNames('modal-overlay', isOpen && 'active')}
      onClick={handleOverlayClick}
    >
      <div className={classNames('modal-box', sizeClasses[size] || '')}>
        <div className="modal-header">
          <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{title}</h3>
          {closable && (
            <button className="modal-close" onClick={onClose} type="button">
              <X size={18} />
            </button>
          )}
        </div>
        <div className="modal-body">
          {children}
        </div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
}
