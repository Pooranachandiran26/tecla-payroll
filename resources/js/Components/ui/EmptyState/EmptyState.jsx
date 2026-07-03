import { Inbox } from 'lucide-react';

export default function EmptyState({ icon: Icon = Inbox, title, message, action }) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">
        <Icon size={48} />
      </div>
      {title && <div className="empty-state-title">{title}</div>}
      {message && <div className="empty-state-message">{message}</div>}
      {action && <div>{action}</div>}
    </div>
  );
}
