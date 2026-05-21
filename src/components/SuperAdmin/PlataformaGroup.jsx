import { useState, useEffect } from 'react';
import { Shield, Briefcase } from '../Icons';
import PlataformaPanel from './PlataformaPanel';
import ProyectosComponent from '../Proyectos';
import './PlataformaGroup.css';

// Wrapper super_admin: agrupa Organizaciones (PlataformaPanel con métricas)
// y Proyectos bajo un solo top-tab "Plataforma".
// Reemplaza los 3 tabs separados (Organizaciones, Proyectos, Plataforma).
const TABS = [
  { id: 'organizaciones', label: 'Organizaciones', Icon: Shield },
  { id: 'proyectos', label: 'Proyectos', Icon: Briefcase },
];

const PlataformaGroup = () => {
  const [activeTab, setActiveTab] = useState('organizaciones');

  useEffect(() => {
    if (!TABS.find((t) => t.id === activeTab)) {
      setActiveTab('organizaciones');
    }
  }, [activeTab]);

  return (
    <div className="plataforma-group">
      <nav className="plataforma-group__tabs" role="tablist">
        {TABS.map((t) => {
          const Icon = t.Icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              className={`plataforma-group__tab ${isActive ? 'plataforma-group__tab--active' : ''}`}
              onClick={() => setActiveTab(t.id)}
            >
              <Icon strokeWidth={1.5} size={18} />
              <span>{t.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="plataforma-group__content">
        {activeTab === 'organizaciones' && <PlataformaPanel />}
        {activeTab === 'proyectos' && <ProyectosComponent />}
      </div>
    </div>
  );
};

export default PlataformaGroup;
