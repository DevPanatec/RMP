import { LayoutDashboard, AlertTriangle, Calendar, Clock, Lock } from '../Icons';
// Styles moved to src/styles/index.css under .app-subtab* (shared with Operations + Inventory).

// Sub-nav underline tabs — usa shared .app-subtab* (también usado por Operaciones e Inventario).

const SUB_TABS = [
  { id: 'monitoreo', label: 'Monitoreo', Icon: LayoutDashboard, gate: 'always' },
  { id: 'riesgos', label: 'Riesgos', Icon: AlertTriangle, gate: 'REC' },
  { id: 'cronograma', label: 'Cronograma', Icon: Clock, gate: 'ops' },
  { id: 'calendario', label: 'Calendario', Icon: Calendar, gate: 'ops' },
];

const CoreSubNav = ({
  activeSubTab,
  onChange,
  hasModulo,
  hasAnyOperacional,
  isViewer = false,
}) => {
  const isAvailable = (tab) => {
    if (tab.gate === 'always') return true;
    if (tab.gate === 'REC') return hasModulo('REC');
    if (tab.gate === 'ops') return hasAnyOperacional;
    return false;
  };

  const isLocked = (tab) => isViewer && tab.id === 'calendario';

  return (
    <div className="app-subtabs" role="tablist" aria-label="Secciones Core">
      {SUB_TABS.map((tab) => {
        if (!isAvailable(tab)) return null;
        const Icon = tab.Icon;
        const locked = isLocked(tab);
        const isActive = activeSubTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            disabled={locked}
            className={`app-subtab${isActive ? ' app-subtab--active' : ''}${locked ? ' app-subtab--locked' : ''}`}
            onClick={() => !locked && onChange(tab.id)}
            title={locked ? 'Sección bloqueada para tu cuenta' : tab.label}
          >
            <Icon strokeWidth={1.75} size={14} />
            <span>{tab.label}</span>
            {locked && <Lock strokeWidth={2} size={11} />}
          </button>
        );
      })}
    </div>
  );
};

export default CoreSubNav;
