import { ConvexReactClient } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ClerkProvider, useAuth as useClerkAuth } from "@clerk/clerk-react";
import Login from './components/Login/Login';
import AdminDashboard from './pages/AdminDashboard/AdminDashboard';
import EnterpriseDashboard from './pages/EnterpriseDashboard/EnterpriseDashboard';
import ConductorDashboard from './pages/ConductorDashboard/ConductorDashboard';
import SeedUsers from './utils/SeedUsers';
import { AuthProvider, useAuth } from './context/AuthContext';
import { RiskReportsProvider } from './context/RiskReportsContext';
import { PersonnelProvider } from './context/PersonnelContext';
import { FleetProvider } from './context/FleetContext';
import { RoutesProvider } from './context/RoutesContext';
import { ReportsProvider } from './context/ReportsContext';
import { InventoryProvider } from './context/InventoryContext';
import { ScheduleProvider } from './context/ScheduleContext';
import { CleaningProvider } from './context/CleaningContext';
import { FumigationProvider } from './context/FumigationContext';
import { MaintenanceProvider } from './context/MaintenanceContext';

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL);

const AppContent = () => {
  const { user, loading, signOut } = useAuth();

  // Detectar si estamos en modo seed
  const isSeedMode = window.location.search.includes('seed');

  // Debug: ver estado en cada render
  console.log('🎯 AppContent render - loading:', loading, 'user:', user ? `${user.tipo} - ${user.nombre}` : 'null');

  const handleLogout = async () => {
    await signOut();
    console.log('Usuario deslogueado');
  };

  // Si estamos en modo seed, mostrar el componente de seed
  if (isSeedMode && !user) {
    // Auto-start si viene con ?seed&auto
    const autoStart = window.location.search.includes('auto');
    return <SeedUsers autoStart={autoStart} />;
  }

  // Mostrar pantalla de carga
  if (loading) {
    console.log('⏳ Mostrando pantalla de carga...');
    return (
      <div className="loading-container">
        <div className="loading-spinner">
          <div className="rmp-logo">
            <img src="/Favicon.png" alt="FMP Logo" style={{ width: '120px', height: '120px', marginBottom: '20px' }} />
            <p>Cargando...</p>
          </div>
        </div>
      </div>
    );
  }

  // Si no hay usuario logueado, mostrar login
  if (!user) {
    console.log('🔓 Mostrando login (sin usuario)');
    return <Login />;
  }

  console.log('✅ Mostrando dashboard para:', user.tipo);

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
      <PersonnelProvider>
        <FleetProvider>
          <RoutesProvider>
            <ReportsProvider>
              <InventoryProvider>
                <ScheduleProvider>
                  <CleaningProvider>
                    <FumigationProvider>
                      <MaintenanceProvider>
                        {renderDashboard()}
                      </MaintenanceProvider>
                    </FumigationProvider>
                  </CleaningProvider>
                </ScheduleProvider>
              </InventoryProvider>
            </ReportsProvider>
          </RoutesProvider>
        </FleetProvider>
      </PersonnelProvider>
    </RiskReportsProvider>
  );
}

function App() {
  return (
    <ClerkProvider publishableKey={import.meta.env.VITE_CLERK_PUBLISHABLE_KEY}>
      <ConvexProviderWithClerk client={convex} useAuth={useClerkAuth}>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </ConvexProviderWithClerk>
    </ClerkProvider>
  );
}

export default App;
