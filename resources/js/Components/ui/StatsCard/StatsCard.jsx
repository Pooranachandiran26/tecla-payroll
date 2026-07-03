import { TrendingUp, TrendingDown } from 'lucide-react';
import Card from '../Card';

export default function StatsCard({
  title, value, trendStr, trendType, icon: Icon,
}) {
  return (
    <Card className="metric-card hover-lift">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h4 className="metric-label">{title}</h4>
          <div className="metric-value">{value}</div>
        </div>
        {Icon && (
          <div style={{
            backgroundColor: 'rgba(31, 56, 100, 0.1)',
            padding: '0.75rem',
            borderRadius: 'var(--radius-md)',
            color: 'var(--primary-navy)'
          }}>
            <Icon size={24} />
          </div>
        )}
      </div>
      
      {trendStr && (
        <div className={`metric-trend ${trendType === 'up' ? 'trend-up' : trendType === 'down' ? 'trend-down' : ''}`}>
          {trendType === 'up' && <TrendingUp size={14} />}
          {trendType === 'down' && <TrendingDown size={14} />}
          <span>{trendStr}</span>
        </div>
      )}
    </Card>
  );
}
