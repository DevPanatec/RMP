import { lazy, Suspense } from 'react';
import { ConvexReactClient } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ClerkProvider, useAuth as useClerkAuth } from "@clerk/clerk-react";
import Login from './components/Login/Login';
import { AuthProvider, useAuth } from './context/AuthContext';

// Lazy load dashboards: cada uno entra en su propio chunk.
// Reduce el bundle inicial y permite que el conductor PWA cargue solo lo suyo.
const AdminDashboard = lazy(() => import('./pages/AdminDashboard/AdminDashboard'));
const ConductorDashboard = lazy(() => import('./pages/ConductorDashboard/ConductorDashboard'));
const KioskoApp = lazy(() => import('./pages/Kiosko/KioskoApp'));

const DashboardFallback = () => (
  <div className="loading-container">
    <div className="loading-spinner">
      <div className="rmp-logo">
        <img src="/icons/modules/Logo principal.png" alt="" style={{ width: '120px', height: 'auto', marginBottom: '20px' }} />
        <p>Cargando dashboard...</p>
      </div>
    </div>
  </div>
);
import { OrganizationProvider } from './context/OrganizationContext';
import { ProjectProvider } from './context/ProjectContext';
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
import { AsistenciaProvider } from './context/AsistenciaContext';
import { RRHHProvider } from './context/RRHHContext';
import { GooglePlacesProvider } from './context/GooglePlacesContext';
import { GooglePlacesErrorBoundary } from './components/ErrorBoundary';

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL);

const AppContent = () => {
  const { user, loading, signOut } = useAuth();

  const handleLogout = async () => {
    await signOut();
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner">
          <div className="rmp-logo">
            <img src="/icons/modules/Logo principal.png" alt="" style={{ width: '120px', height: 'auto', marginBottom: '20px' }} />
            <p>Cargando...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  // Mostrar dashboard según el tipo de usuario
  const renderDashboard = () => {
    switch (user.tipo) {
      case 'super_admin':
        return <AdminDashboard user={user} onLogout={handleLogout} userRole="super_admin" />;
      case 'admin':
        return <AdminDashboard user={user} onLogout={handleLogout} />;
      case 'viewer':
        return <AdminDashboard user={user} onLogout={handleLogout} userRole="viewer" />;
      case 'enterprise':
        return <AdminDashboard user={user} onLogout={handleLogout} userRole="enterprise" />;
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
    <OrganizationProvider>
      <ProjectProvider>
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
                            <AsistenciaProvider>
                              <RRHHProvider>
                                <Suspense fallback={<DashboardFallback />}>
                                  {renderDashboard()}
                                </Suspense>
                              </RRHHProvider>
                            </AsistenciaProvider>
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
      </ProjectProvider>
    </OrganizationProvider>
  );
}

function App() {
  // Kiosko standalone route: corre sin Clerk auth ni providers de dashboard.
  // Auth del kiosko = device_token validado server-side en cada mutation.
  const isKioskoRoute = typeof window !== 'undefined' && window.location.pathname.startsWith('/kiosko');

  if (isKioskoRoute) {
    return (
      <ClerkProvider publishableKey={import.meta.env.VITE_CLERK_PUBLISHABLE_KEY}>
        <ConvexProviderWithClerk client={convex} useAuth={useClerkAuth}>
          <Suspense fallback={<DashboardFallback />}>
            <KioskoApp />
          </Suspense>
        </ConvexProviderWithClerk>
      </ClerkProvider>
    );
  }

  return (
    <ClerkProvider publishableKey={import.meta.env.VITE_CLERK_PUBLISHABLE_KEY}>
      <ConvexProviderWithClerk client={convex} useAuth={useClerkAuth}>
        <GooglePlacesErrorBoundary>
          <GooglePlacesProvider>
            <AuthProvider>
              <AppContent />
            </AuthProvider>
          </GooglePlacesProvider>
        </GooglePlacesErrorBoundary>
      </ConvexProviderWithClerk>
    </ClerkProvider>
  );
}

export default App;
