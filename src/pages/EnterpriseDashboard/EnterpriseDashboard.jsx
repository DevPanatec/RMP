import AdminDashboard from '../AdminDashboard/AdminDashboard';

const EnterpriseDashboard = ({ user, onLogout }) => {
  return <AdminDashboard user={user} onLogout={onLogout} userRole="enterprise" />;
};

export default EnterpriseDashboard;
