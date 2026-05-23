import { Component } from 'react';
import './GooglePlacesErrorBoundary.css';

/**
 * Error Boundary para capturar errores de carga de Google Places API
 * Muestra interfaz amigable cuando falla la inicialización de Google Maps
 */
class GooglePlacesErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error) {
    // Actualizar estado para mostrar UI de error
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log del error para debugging
    console.error('Google Places Error Boundary caught an error:', error, errorInfo);
    this.setState({
      error,
      errorInfo
    });
  }

  handleReload = () => {
    // Recargar la página para reintentar
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="google-places-error-boundary">
          <div className="error-content">
            <div className="error-icon">
              <svg
                width="64"
                height="64"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
            </div>

            <h2 className="error-title">Error al cargar servicios de mapas</h2>

            <p className="error-message">
              No se pudo inicializar Google Places API. Esto puede deberse a:
            </p>

            <ul className="error-reasons">
              <li>Problemas de conexión a internet</li>
              <li>Configuración incorrecta de API key</li>
              <li>Cuota de API excedida</li>
              <li>Restricciones de dominio en Google Cloud Console</li>
            </ul>

            <button
              className="btn btn--primary reload-button"
              onClick={this.handleReload}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="23 4 23 10 17 10"></polyline>
                <polyline points="1 20 1 14 7 14"></polyline>
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
              </svg>
              <span>Recargar página</span>
            </button>

            {/* Mostrar detalles técnicos en desarrollo */}
            {import.meta.env.DEV && this.state.error && (
              <details className="error-details">
                <summary>Detalles técnicos (solo visible en desarrollo)</summary>
                <pre className="error-stack">
                  <strong>Error:</strong> {this.state.error.toString()}
                  {this.state.errorInfo && (
                    <>
                      <br /><br />
                      <strong>Stack trace:</strong>
                      {this.state.errorInfo.componentStack}
                    </>
                  )}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default GooglePlacesErrorBoundary;
