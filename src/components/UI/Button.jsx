import './Button.css';

export const Button = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  fullWidth = false,
  icon,
  onClick,
  disabled = false,
  type = 'button',
  className = ''
}) => {
  const baseClass = 'btn-new';
  const variantClass = `btn-new--${variant}`;
  const sizeClass = `btn-new--${size}`;
  const widthClass = fullWidth ? 'btn-new--full' : '';
  
  return (
    <button
      type={type}
      className={`${baseClass} ${variantClass} ${sizeClass} ${widthClass} ${className}`.trim()}
      onClick={onClick}
      disabled={disabled}
    >
      {icon && <span className="btn-new__icon">{icon}</span>}
      <span className="btn-new__text">{children}</span>
    </button>
  );
};

export default Button;
