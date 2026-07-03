import { X, CheckCircle, AlertTriangle, AlertCircle, Info } from 'lucide-react';
import { classNames } from '../../../Utils/formatters';

const typeConfig = {
  success: { class: 'alert-success', Icon: CheckCircle },
  warning: { class: 'alert-warning', Icon: AlertTriangle },
  danger:  { class: 'alert-danger',  Icon: AlertCircle },
  info:    { class: 'alert-info',    Icon: Info },
};

export default function Alert({
  type = 'info', title, message, dismissible = false, onDismiss, icon: CustomIcon,
}) {
  const config = typeConfig[type] || typeConfig.info;
  const IconComponent = CustomIcon || config.Icon;

  return (
    <div className={classNames('alert-widget', config.class)}>
      <span className="alert-icon">
        <IconComponent size={20} />
      </span>
      <div className="alert-text">
        {title && <strong>{title} </strong>}
        {message}
      </div>
      {dismissible && onDismiss && (
        <button onClick={onDismiss} className="btn-ghost" style={{ padding: '0.25rem', border: 'none', background: 'none', cursor: 'pointer' }}>
          <X size={16} />
        </button>
      )}
    </div>
  );
}
