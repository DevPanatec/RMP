import './ProgressBar.css';

export const ProgressBar = ({ 
  value = 0, 
  max = 100, 
  size = 'md',
  variant = 'primary',
  showLabel = false,
  className = '' 
}) => {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
  
  const baseClass = 'progress-bar';
  const sizeClass = `progress-bar--${size}`;
  const variantClass = `progress-bar--${variant}`;
  
  return (
    <div className={`${baseClass} ${sizeClass} ${className}`.trim()}>
      <div className="progress-bar__track">
        <div 
          className={`progress-bar__fill ${variantClass}`}
          style={{ width: `${percentage}%` }}
        >
          {showLabel && size !== 'sm' && (
            <span className="progress-bar__label">{Math.round(percentage)}%</span>
          )}
        </div>
      </div>
      {showLabel && size === 'sm' && (
        <span className="progress-bar__external-label">{Math.round(percentage)}%</span>
      )}
    </div>
  );
};

export default ProgressBar;
