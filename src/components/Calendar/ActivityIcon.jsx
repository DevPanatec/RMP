import { Truck, Bug, Sparkles, Wrench, MapPin } from '../Icons';

const ICON_SIZE = { sm: 12, md: 16, lg: 20 };

const ActivityIcon = ({ activity, size = 'md' }) => {
  const getIcon = (type, pixelSize) => {
    switch (type) {
      case 'recoleccion':
        return <Truck size={pixelSize} aria-hidden="true" />;
      case 'fumigacion':
        return <Bug size={pixelSize} aria-hidden="true" />;
      case 'limpieza':
        return <Sparkles size={pixelSize} aria-hidden="true" />;
      case 'mantenimiento':
        return <Wrench size={pixelSize} aria-hidden="true" />;
      default:
        return <MapPin size={pixelSize} aria-hidden="true" />;
    }
  };

  const getColorClass = (type) => {
    switch (type) {
      case 'recoleccion':
        return 'activity-icon-recoleccion';
      case 'fumigacion':
        return 'activity-icon-fumigacion';
      case 'limpieza':
        return 'activity-icon-limpieza';
      case 'mantenimiento':
        return 'activity-icon-mantenimiento';
      default:
        return 'activity-icon-default';
    }
  };

  const sizeClass = `activity-icon-${size}`;
  const pixelSize = ICON_SIZE[size] || ICON_SIZE.md;

  return (
    <div
      className={`activity-icon ${sizeClass} ${getColorClass(activity.type)}`}
      title={activity.title}
    >
      {getIcon(activity.type, pixelSize)}
    </div>
  );
};

export default ActivityIcon;
