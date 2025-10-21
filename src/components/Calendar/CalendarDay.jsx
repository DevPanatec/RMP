import ActivityIcon from './ActivityIcon';

const CalendarDay = ({ 
  date, 
  activities, 
  isToday, 
  isCurrentMonth = true,
  config, 
  onDayClick,
  viewMode 
}) => {
  const getDayName = (date) => {
    const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    return days[date.getDay()];
  };

  const isOverloaded = activities.length >= config.overloadThreshold;
  const visibleActivities = activities.slice(0, config.maxVisibleActivities);
  const hiddenCount = activities.length - config.maxVisibleActivities;

  const handleClick = () => {
    if (config.modalOnClick) {
      onDayClick(date, activities);
    }
  };

  if (viewMode === 'month') {
    return (
      <div 
        className={`calendar-month-day ${!isCurrentMonth ? 'other-month' : ''} ${isToday ? 'today' : ''} ${isOverloaded ? 'overloaded' : ''}`}
        onClick={handleClick}
      >
        <div className="month-day-number">{date.getDate()}</div>
        <div className="month-day-activities">
          {visibleActivities.map(activity => (
            <ActivityIcon key={activity.id} activity={activity} size="sm" />
          ))}
          {hiddenCount > 0 && (
            <div className="activity-overflow">
              +{hiddenCount}
            </div>
          )}
        </div>
        {config.showCounts && activities.length > 0 && (
          <div className="activity-count-badge">{activities.length}</div>
        )}
      </div>
    );
  }

  if (viewMode === 'week') {
    return (
      <div 
        className={`calendar-week-day ${isToday ? 'today' : ''} ${isOverloaded ? 'overloaded' : ''}`}
        onClick={handleClick}
      >
        <div className="week-day-header">
          <div className="day-name">{getDayName(date)}</div>
          <div className="day-number">{date.getDate()}</div>
        </div>
        <div className="week-day-activities">
          {activities.length === 0 ? (
            <div className="no-activities">Sin actividades</div>
          ) : (
            <>
              {visibleActivities.map(activity => (
                <div key={activity.id} className="activity-item">
                  <ActivityIcon activity={activity} size="md" />
                  <div className="activity-details">
                    <div className="activity-time">{activity.time}</div>
                    <div className="activity-title">{activity.title}</div>
                  </div>
                </div>
              ))}
              {hiddenCount > 0 && (
                <div className="activity-overflow-card">
                  <span>+{hiddenCount} más</span>
                  <small>Click para ver todas</small>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    );
  }

  if (viewMode === 'day') {
    return (
      <div className={`calendar-single-day ${isToday ? 'today' : ''}`}>
        <div className="single-day-header">
          <h3>{getDayName(date)}, {date.getDate()}</h3>
          {config.showCounts && (
            <span className="activity-count">{activities.length} actividad{activities.length !== 1 ? 'es' : ''}</span>
          )}
        </div>
        <div className="single-day-activities">
          {activities.length === 0 ? (
            <div className="no-activities-message">
              <p>No hay actividades programadas para este día</p>
            </div>
          ) : (
            activities.map(activity => (
              <div key={activity.id} className="activity-card">
                <div className="activity-card-header">
                  <ActivityIcon activity={activity} size="lg" />
                  <div className="activity-time-badge">{activity.time}</div>
                </div>
                <div className="activity-card-content">
                  <h4>{activity.title}</h4>
                  <div className="activity-meta">
                    <span className="activity-type-badge">{activity.type}</span>
                    <span className={`status-badge status-${activity.status}`}>
                      {activity.status}
                    </span>
                  </div>
                  {activity.data.descripcion && (
                    <p className="activity-description">{activity.data.descripcion}</p>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  return null;
};

export default CalendarDay;
