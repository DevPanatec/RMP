import './Badge.css';

export const Badge = ({ 
  children, 
  variant = 'default', 
  size = 'md',
  icon,
  className = '' 
}) => {
  const baseClass = 'badge';
  const variantClass = `badge--${variant}`;
  const sizeClass = `badge--${size}`;
  
  return (
    <span className={`${baseClass} ${variantClass} ${sizeClass} ${className}`.trim()}>
      {icon && <span className="badge__icon">{icon}</span>}
      <span className="badge__text">{children}</span>
    </span>
  );
};

export default Badge;
