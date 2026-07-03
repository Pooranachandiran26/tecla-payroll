import { getInitials, classNames } from '../../../Utils/formatters';

const colors = ['#1F3864', '#B8860B', '#2E7D32', '#C62828', '#1565C0', '#ED6C02', '#6A1B9A', '#00695C'];

function hashColor(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

export default function Avatar({ name = '', size = 'md', color, className = '' }) {
  const bgColor = color || hashColor(name);
  const sizeClass = size === 'sm' ? 'avatar-sm' : size === 'lg' ? 'avatar-lg' : '';

  return (
    <div
      className={classNames('avatar', sizeClass, className)}
      style={{ backgroundColor: bgColor }}
      title={name}
    >
      {getInitials(name || '?')}
    </div>
  );
}
