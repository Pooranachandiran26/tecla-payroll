import { ChevronRight } from 'lucide-react';
import { Link } from '@inertiajs/react';

export default function PageHeader({ title, breadcrumbs = [], action }) {
  return (
    <div className="flex-row-between">
      <div>
        {breadcrumbs.length > 0 && (
          <div className="page-header-breadcrumb">
            {breadcrumbs.map((crumb, index) => (
              <span key={index} style={{ display: 'inline-flex', alignItems: 'center' }}>
                {index > 0 && <ChevronRight size={12} style={{ margin: '0 0.25rem' }} />}
                {crumb.url ? (
                  <Link href={crumb.url}>{crumb.label}</Link>
                ) : (
                  <span>{crumb.label}</span>
                )}
              </span>
            ))}
          </div>
        )}
        <h1 style={{ margin: 0, fontSize: '1.5rem' }}>{title}</h1>
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}
