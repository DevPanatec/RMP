import './DashboardKPI.css';

export const DashboardKPI = ({ icon: Icon, value, label, trend, className = '' }) => {
  return (
    <div className={`dashboard-kpi ${className}`.trim()}>
      <div className="dashboard-kpi__icon">
        {Icon && <Icon size={24} />}
      </div>
      <div className="dashboard-kpi__content">
        <div className="dashboard-kpi__value">{value}</div>
        <div className="dashboard-kpi__label">{label}</div>
        {trend && (
          <div className={`dashboard-kpi__trend dashboard-kpi__trend--${trend.type}`}>
            {trend.value}
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardKPI;
