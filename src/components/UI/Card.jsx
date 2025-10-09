import './Card.css';

export const Card = ({ 
  children, 
  title,
  subtitle,
  variant = 'default',
  padding = 'default',
  hoverable = false,
  className = '' 
}) => {
  const baseClass = 'card-new';
  const variantClass = `card-new--${variant}`;
  const hoverClass = hoverable ? 'card-new--hoverable' : '';
  const paddingClass = `card-new--padding-${padding}`;
  
  return (
    <div className={`${baseClass} ${variantClass} ${hoverClass} ${paddingClass} ${className}`.trim()}>
      {(title || subtitle) && (
        <div className="card-new__header">
          {title && <h3 className="card-new__title">{title}</h3>}
          {subtitle && <p className="card-new__subtitle">{subtitle}</p>}
        </div>
      )}
      <div className="card-new__body">
        {children}
      </div>
    </div>
  );
};

export default Card;
