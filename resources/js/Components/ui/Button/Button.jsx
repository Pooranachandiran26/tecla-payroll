import { Loader2 } from 'lucide-react';
import { classNames } from '../../../Utils/formatters';

const variantClasses = {
  primary:   'btn-primary',
  secondary: 'btn-secondary',
  navy:      'btn-navy',
  danger:    'btn-danger',
  success:   'btn-success',
  warning:   'btn-warning',
  outline:   'btn-outline',
  ghost:     'btn-ghost',
  link:      'btn-link',
};

const sizeClasses = {
  xs: 'btn-xs',
  sm: 'btn-sm',
  md: '',
  lg: 'btn-lg',
};

export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon: Icon,
  iconPosition = 'left',
  fullWidth = false,
  rounded = false,
  onClick,
  type = 'button',
  className = '',
  children,
  ...props
}) {
  const isDisabled = disabled || loading;

  const classes = classNames(
    'btn',
    variantClasses[variant] || 'btn-primary',
    sizeClasses[size] || '',
    fullWidth && 'btn-full-width',
    rounded && 'rounded-full',
    isDisabled && 'disabled',
    className,
  );

  return (
    <button
      type={type}
      className={classes}
      disabled={isDisabled}
      onClick={onClick}
      {...props}
    >
      {loading && <Loader2 size={size === 'xs' ? 12 : size === 'sm' ? 14 : 16} className="loader-spinner" />}
      {!loading && Icon && iconPosition === 'left' && <Icon size={size === 'xs' ? 12 : size === 'sm' ? 14 : 16} />}
      {children}
      {!loading && Icon && iconPosition === 'right' && <Icon size={size === 'xs' ? 12 : size === 'sm' ? 14 : 16} />}
    </button>
  );
}
