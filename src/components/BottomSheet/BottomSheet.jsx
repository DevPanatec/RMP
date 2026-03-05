import React, { useState, useRef } from 'react';
import { ChevronUp, ChevronDown, CheckCircle, Navigation, Radio, Package, Clock, AlertTriangle, X } from 'lucide-react';
import './BottomSheet.css';

const BottomSheet = ({
  isExpanded = false,
  onToggle,
  stops = [],
  completedStops = [],
  currentStop = 0,
  onCompleteStop,
  progressPercentage = 0,
  isMobile = false,
  onTerminateRoute,
  onCompleteRoute
}) => {
  const [startY, setStartY] = useState(0);
  const [currentY, setCurrentY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const sheetRef = useRef(null);
  const DRAG_THRESHOLD = 50; // Umbral para cambiar estado (50px)

  // Estados: 'collapsed' | 'expanded'
  const [sheetState, setSheetState] = useState(isExpanded ? 'expanded' : 'collapsed');

  // Gestos táctiles (solo mobile) - solo en el header, no en botones
  const handleTouchStart = (e) => {
    if (!isMobile) return;
    // No iniciar drag si el usuario toca un botón o elemento interactivo
    if (e.target.closest('button, a, input, select, textarea, [role="button"]')) return;
    setStartY(e.touches[0].clientY);
    setIsDragging(true);
  };

  const handleTouchMove = (e) => {
    if (!isMobile || !isDragging) return;
    const deltaY = startY - e.touches[0].clientY;
    setCurrentY(deltaY);

    // Aplicar transform en tiempo real
    if (sheetRef.current) {
      const translateY = sheetState === 'expanded'
        ? Math.max(0, -deltaY)
        : Math.min(0, -deltaY);
      sheetRef.current.style.transform = `translateY(${translateY}px)`;
    }
  };

  const handleTouchEnd = () => {
    if (!isMobile || !isDragging) return;

    const deltaY = currentY;

    // Lógica de snap
    if (sheetState === 'collapsed' && deltaY > DRAG_THRESHOLD) {
      setSheetState('expanded');
      onToggle?.(true);
    } else if (sheetState === 'expanded' && deltaY < -DRAG_THRESHOLD) {
      setSheetState('collapsed');
      onToggle?.(false);
    }

    // Reset transform
    if (sheetRef.current) {
      sheetRef.current.style.transform = '';
    }

    setIsDragging(false);
    setCurrentY(0);
  };

  // Click handler para desktop
  const handleToggleClick = () => {
    const newState = sheetState === 'collapsed' ? 'expanded' : 'collapsed';
    setSheetState(newState);
    onToggle?.(newState === 'expanded');
  };

  // Helper functions (reutilizar de RouteTimeline)
  const getStopStatus = (stop, currentStopIndex) => {
    if (stop.completada === false && stop.motivo_no_completada) return 'skipped';
    if (stop.completada) return 'completed';
    if (stop.index === currentStopIndex) return 'current';
    return 'pending';
  };

  const getStopIcon = (status) => {
    if (status === 'skipped') return <AlertTriangle size={18} />;
    if (status === 'completed') return <CheckCircle size={18} />;
    if (status === 'current') return <Navigation size={18} />;
    return <Radio size={18} />;
  };

  return (
    <div
      ref={sheetRef}
      className={`bottom-sheet bottom-sheet--${sheetState} ${isMobile ? 'bottom-sheet--mobile' : 'bottom-sheet--desktop'}`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Handle Header */}
      <div
        className="bottom-sheet-header"
        onClick={!isMobile ? handleToggleClick : undefined}
      >
        <div className="bottom-sheet-handle-bar"></div>
        <div className="bottom-sheet-summary">
          <div className="bottom-sheet-title">
            <span className="summary-icon">≡</span>
            <span className="summary-text">
              {completedStops.length}/{stops.length} Paradas Completadas
            </span>
          </div>
          <button
            className="bottom-sheet-toggle-btn"
            onClick={isMobile ? handleToggleClick : undefined}
            aria-label={sheetState === 'collapsed' ? 'Expandir' : 'Colapsar'}
          >
            {sheetState === 'collapsed' ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </button>
        </div>
      </div>

      {/* Stops List */}
      <div className="bottom-sheet-content">
        <div className="bottom-sheet-stops">
          {stops.map((stop, index) => {
            const status = getStopStatus(stop, currentStop);
            const canComplete = !stop.completada && status === 'current';

            return (
              <div key={index} className={`stop-item-compact stop-item--${status}`}>
                <div className="stop-icon-container">
                  {getStopIcon(status)}
                </div>

                <div className="stop-details">
                  <div className="stop-name">
                    {stop.direccion || stop.nombre || `Parada ${stop.orden}`}
                  </div>
                  {status === 'skipped' && (
                    <div className="stop-category stop-category--skipped">
                      <AlertTriangle size={12} />
                      <span>{stop.motivo_no_completada || 'No completada'}</span>
                    </div>
                  )}
                  {stop.completada && stop.category && (
                    <div className="stop-category">
                      <Package size={12} />
                      <span>Carga {stop.category}</span>
                      {stop.timestamp && (
                        <>
                          <Clock size={12} />
                          <span>{stop.timestamp}</span>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {canComplete && (
                  <button
                    className="btn-complete-compact"
                    onClick={() => onCompleteStop(index)}
                  >
                    <CheckCircle size={16} />
                    <span>Completar</span>
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Route action buttons */}
        {isMobile && (onCompleteRoute || onTerminateRoute) && (
          <div className="bottom-sheet-actions">
            {onCompleteRoute && (
              <button
                className="bottom-sheet-action-btn bottom-sheet-action-btn--success"
                onClick={onCompleteRoute}
              >
                <CheckCircle size={18} />
                <span>Finalizar Ruta</span>
              </button>
            )}
            {onTerminateRoute && (
              <button
                className="bottom-sheet-action-btn bottom-sheet-action-btn--danger"
                onClick={onTerminateRoute}
              >
                <X size={18} />
                <span>Cancelar Ruta</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default BottomSheet;
