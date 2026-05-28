import { useState } from 'react';
import { Layers, TrendingUp, DollarSign, FileText, Activity } from '../Icons';
import KbGovernance from './KbGovernance';
import CoverageDashboard from './CoverageDashboard';
import CostAnalytics from './CostAnalytics';
import IngestionCurator from './IngestionCurator';
import QueueStatus from './QueueStatus';
import './PlataformaGroup.css';

const TABS = [
  { id: 'governance', label: 'Governance', Icon: Layers },
  { id: 'coverage', label: 'Cobertura', Icon: TrendingUp },
  { id: 'queue', label: 'Queue', Icon: Activity },
  { id: 'curator', label: 'Curación', Icon: FileText },
  { id: 'cost', label: 'Costos IA', Icon: DollarSign },
];

// SuperAdmin: agrupa los 3 dashboards de Fase D en un solo top-tab "KB Health".
export default function KbHealthGroup() {
  const [activeTab, setActiveTab] = useState('governance');

  return (
    <div className="plataforma-group">
      <nav className="plataforma-group__tabs" role="tablist">
        {TABS.map(t => {
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
        {activeTab === 'governance' && <KbGovernance />}
        {activeTab === 'coverage' && <CoverageDashboard />}
        {activeTab === 'queue' && <QueueStatus />}
        {activeTab === 'curator' && <IngestionCurator />}
        {activeTab === 'cost' && <CostAnalytics />}
      </div>
    </div>
  );
}
