import { useState } from 'react';
import { Truck, Bug, Sparkles, Layers } from '../Icons';
import RoutesComponent from '../Routes/RoutesComponent';
import UbicacionesComponent from '../Ubicaciones/UbicacionesComponent';
import { useFumigation } from '../../context/FumigationContext';
import { useCleaning } from '../../context/CleaningContext';
import { useRoutes } from '../../context/RoutesContext';
import './ServiciosComponent.css';

const TABS = [
  {
    id: 'recoleccion',
    label: 'Recolección',
    desc: 'Rutas con paradas, foto de portada y ubicación principal.',
    Icon: Truck,
  },
  {
    id: 'fumigacion',
    label: 'Fumigación',
    desc: 'Lugares de fumigación interna o externa con foto y GPS.',
    Icon: Bug,
  },
  {
    id: 'limpieza',
    label: 'Limpieza',
    desc: 'Salas y áreas de limpieza con foto y GPS.',
    Icon: Sparkles,
  },
];

const ServiciosComponent = ({ initialRoutes = [], onRoutesChange }) => {
  const [activeTab, setActiveTab] = useState('recoleccion');
  const { routes } = useRoutes();
  const { lugares: lugaresFum } = useFumigation();
  const { lugares: salas } = useCleaning();

  const counts = {
    recoleccion: routes?.length || 0,
    fumigacion: lugaresFum?.length || 0,
    limpieza: salas?.length || 0,
  };

  const activeMeta = TABS.find((t) => t.id === activeTab);

  const renderActive = () => {
    switch (activeTab) {
      case 'recoleccion':
        return (
          <RoutesComponent
            initialRoutes={initialRoutes}
            onRoutesChange={onRoutesChange}
          />
        );
      case 'fumigacion':
        return <UbicacionesComponent forceTipo="lugar" hideHeader />;
      case 'limpieza':
        return <UbicacionesComponent forceTipo="sala" hideHeader />;
      default:
        return null;
    }
  };

  return (
    <div className="servicios-component">
      <div className="servicios-header">
        <div className="servicios-header-left">
          <Layers strokeWidth={1.5} size={26} className="servicios-header-icon" />
          <div>
            <h2>Servicios</h2>
            <p>Gestiona los 3 tipos de servicios desde un solo lugar — recolección, fumigación y limpieza.</p>
          </div>
        </div>
      </div>

      <div className="servicios-tabs">
        {TABS.map((t) => {
          const Icon = t.Icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              className={`servicios-tab ${isActive ? 'servicios-tab--active' : ''}`}
              onClick={() => setActiveTab(t.id)}
            >
              <Icon strokeWidth={1.5} size={20} />
              <div className="servicios-tab-text">
                <span className="servicios-tab-label">{t.label}</span>
                <span className="servicios-tab-count">{counts[t.id]} registros</span>
              </div>
            </button>
          );
        })}
      </div>

      {activeMeta && (
        <div className="servicios-section-hint">
          <activeMeta.Icon size={16} />
          <span>{activeMeta.desc}</span>
        </div>
      )}

      <div className="servicios-content">
        {renderActive()}
      </div>
    </div>
  );
};

export default ServiciosComponent;
