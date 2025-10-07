import { useState } from 'react';
import Login from './components/Login/Login';
import AdminDashboard from './pages/AdminDashboard/AdminDashboard';
import EnterpriseDashboard from './pages/EnterpriseDashboard/EnterpriseDashboard';
import ConductorDashboard from './pages/ConductorDashboard/ConductorDashboard';
import { SupabaseAuthProvider, useSupabaseAuth } from './context/SupabaseAuthContext';
import { SupabaseRiskReportsProvider } from './context/SupabaseRiskReportsContext';
import { SupabasePersonnelProvider } from './context/SupabasePersonnelContext';
import { SupabaseFleetProvider } from './context/SupabaseFleetContext';
import { SupabaseRoutesProvider } from './context/SupabaseRoutesContext';
import { SupabaseReportsProvider } from './context/SupabaseReportsContext';
import { SupabaseInventoryProvider } from './context/SupabaseInventoryContext';
import { SupabaseScheduleProvider } from './context/SupabaseScheduleContext';

const AppContent = () => {
  const { user, loading, signOut } = useSupabaseAuth();

  const handleLogout = async () => {
    await signOut();
    console.log('Usuario deslogueado');
  };

  // Mostrar pantalla de carga
  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner">
          <div className="rmp-logo">
            <h1>🌱 RMP</h1>
            <p>Cargando...</p>
          </div>
        </div>
      </div>
    );
  }

  // Si no hay usuario logueado, mostrar login
  if (!user) {
    return <Login />;
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
    <SupabaseRiskReportsProvider>
      <SupabasePersonnelProvider>
        <SupabaseFleetProvider>
          <SupabaseRoutesProvider>
            <SupabaseReportsProvider>
              <SupabaseInventoryProvider>
                <SupabaseScheduleProvider>
                  {renderDashboard()}
                </SupabaseScheduleProvider>
              </SupabaseInventoryProvider>
            </SupabaseReportsProvider>
          </SupabaseRoutesProvider>
        </SupabaseFleetProvider>
      </SupabasePersonnelProvider>
    </SupabaseRiskReportsProvider>
  );
}

function App() {
  return (
    <SupabaseAuthProvider>
      <AppContent />
    </SupabaseAuthProvider>
  );
}

export default App; 