import { Inbox } from '../Icons';
import './EmptyState.css';

const EmptyState = ({
  icon: IconComponent = Inbox,
  title = 'Sin datos',
  description,
  action,
  size = 'md',
}) => {
  return (
    <div className={`empty-state empty-state--${size}`}>
      <div className="empty-state__icon">
        <IconComponent size={size === 'sm' ? 28 : 36} strokeWidth={1.5} />
      </div>
      <h4 className="empty-state__title">{title}</h4>
      {description && <p className="empty-state__description">{description}</p>}
      {action && <div className="empty-state__action">{action}</div>}
    </div>
  );
};

export default EmptyState;
