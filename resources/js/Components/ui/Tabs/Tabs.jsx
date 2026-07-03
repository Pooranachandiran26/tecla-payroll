import { classNames } from '../../../Utils/formatters';

export default function Tabs({
  tabs = [], activeTab, onChange, variant = 'underline',
}) {
  const isUnderline = variant === 'underline';

  return (
    <div className="tab-container">
      <ul className={isUnderline ? 'tab-headers' : 'tab-headers-pill'}>
        {tabs.map((tab) => (
          <li
            key={tab.key}
            className={classNames(activeTab === tab.key && 'active')}
            onClick={() => onChange(tab.key)}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
              {tab.icon && <tab.icon size={16} />}
              {tab.label}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
