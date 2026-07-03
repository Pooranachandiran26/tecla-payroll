import { classNames } from '../../../Utils/formatters';

export default function Card({
  children, title, subtitle, headerAction, noPadding = false, className = '', ...props
}) {
  return (
    <div className={classNames('card', className)} {...props}>
      {title && (
        <div className="card-header">
          <div>
            <h3 className="card-title">{title}</h3>
            {subtitle && <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>{subtitle}</p>}
          </div>
          {headerAction && <div>{headerAction}</div>}
        </div>
      )}
      <div style={noPadding ? { margin: '-1.5rem', marginTop: title ? 0 : '-1.5rem' } : undefined}>
        {children}
      </div>
    </div>
  );
}
