import { useState } from 'react';
import Login from './components/Login/Login';
import AdminDashboard from './pages/AdminDashboard/AdminDashboard';
import EnterpriseDashboard from './pages/EnterpriseDashboard/EnterpriseDashboard';
import ConductorDashboard from './pages/ConductorDashboard/ConductorDashboard';
import { RiskReportsProvider } from './context/RiskReportsContext';

function App() {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = (userData) => {
    setIsLoading(true);
    
    // Simular un pequeño delay para mostrar que está procesando
    setTimeout(() => {
      console.log('Usuario logueado:', userData);
      setUser(userData);
      setIsLoading(false);
    }, 500);
  };

  const handleLogout = () => {
    setUser(null);
    console.log('Usuario deslogueado');
  };

  // Mostrar pantalla de carga
  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner">
          <div className="rmp-logo">
            <h1>RMP</h1>
            <p>Cargando...</p>
          </div>
        </div>
      </div>
    );
  }

  // Si no hay usuario logueado, mostrar login
  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  // Mostrar dashboard según el tipo de usuario
  const renderDashboard = () => {
    switch (user.tipo) {
      case 'admin':
        return <AdminDashboard user={user} onLogout={handleLogout} />;
      case 'enterprise':
        return <EnterpriseDashboard user={user} onLogout={handleLogout} />;
      case 'conductor':
        return <ConductorDashboard user={user} onLogout={handleLogout} />;
      default:
        return (
          <div className="error-container">
            <h1>Error</h1>
            <p>Tipo de usuario no reconocido: {user.tipo}</p>
            <button className="btn btn--primary" onClick={handleLogout}>
              Volver al Login
            </button>
          </div>
        );
    }
  };

  return (
    <RiskReportsProvider>
      {renderDashboard()}
    </RiskReportsProvider>
  );
}

export default App; 