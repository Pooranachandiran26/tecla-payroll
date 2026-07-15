import { classNames } from '../../../Utils/formatters';

const statusMap = {
  active:     'badge-success',
  approved:   'badge-success',
  paid:       'badge-success',
  filed:      'badge-success',
  pending:    'badge-warning',
  onboarding: 'badge-warning',
  draft:      'badge-warning',
  rejected:   'badge-danger',
  overdue:    'badge-danger',
  exited:     'badge-danger',
  inactive:   'badge-info',
  expiring:   'badge-info',
};

const defaultLabels = {
  active: 'Active', approved: 'Approved', paid: 'Paid', filed: 'Filed',
  pending: 'Pending', onboarding: 'Onboarding', draft: 'Draft',
  rejected: 'Rejected', overdue: 'Overdue', exited: 'Exited',
  inactive: 'Inactive', expiring: 'Expiring',
};

export default function Badge({ status, label, size = 'md', className = '', variant, type, children }) {
  const effectiveStatus = status || variant || type;
  const badgeClass = statusMap[effectiveStatus] || (effectiveStatus ? `badge-${effectiveStatus}` : 'badge-gold');
  const displayLabel = children || label || defaultLabels[effectiveStatus] || effectiveStatus;

  return (
    <span className={classNames(
      'badge',
      badgeClass,
      size === 'sm' && 'text-xs',
      className,
    )}>
      {displayLabel}
    </span>
  );
}
