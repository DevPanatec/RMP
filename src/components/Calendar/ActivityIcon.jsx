const ActivityIcon = ({ activity, size = 'md' }) => {
  const getIcon = (type) => {
    switch (type) {
      case 'recoleccion':
        return '🚛';
      case 'fumigacion':
        return '🦟';
      case 'limpieza':
        return '🧹';
      case 'mantenimiento':
        return '🔧';
      default:
        return '📌';
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

  return (
    <div 
      className={`activity-icon ${sizeClass} ${getColorClass(activity.type)}`}
      title={activity.title}
    >
      {getIcon(activity.type)}
    </div>
  );
};

export default ActivityIcon;
