import { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { Check, AlertTriangle, Layers, Truck } from '../Icons';
import './KbHealth.css';

// SuperAdmin: lista modelos candidatos a promote private_org -> global.
export default function KbGovernance() {
  const candidates = useQuery(api.models.listPendingPromotion, { limit: 50 });
  const unresolvedAlerts = useQuery(api.kbIntegrity.listUnresolvedAlerts, { limit: 50 });
  const promote = useMutation(api.models.promoteToGlobal);
  const resolveAlert = useMutation(api.kbIntegrity.resolveAlert);
  const [busyId, setBusyId] = useState(null);

  const handlePromote = async (id) => {
    if (!confirm('Promover este modelo a global? Será visible para todas las orgs.')) return;
    setBusyId(id);
    try {
      await promote({ id });
    } catch (err) {
      alert(`Error: ${err.message ?? err}`);
    } finally {
      setBusyId(null);
    }
  };

  const handleResolve = async (id) => {
    setBusyId(id);
    try {
      await resolveAlert({ id });
    } catch (err) {
      alert(`Error: ${err.message ?? err}`);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="kb-governance">
      <section className="kb-section">
        <header className="kb-section__header">
          <Layers size={18} />
          <h3>Modelos pendientes de promotion</h3>
          <span className="kb-badge">{Array.isArray(candidates) ? candidates.length : 0}</span>
        </header>
        {candidates === undefined ? (
          <div className="kb-loading">Cargando…</div>
        ) : candidates.length === 0 ? (
          <div className="kb-empty">
            <Check size={24} />
            <p>Sin candidatos. Todos los modelos validados ya son globales o no tienen vehículos asociados.</p>
          </div>
        ) : (
          <ul className="kb-list">
            {candidates.map((c) => (
              <li key={c._id} className="kb-list-item">
                <div className="kb-list-item__main">
                  <strong>{c.make_nombre} {c.nombre}</strong>
                  <small>{c.equipment_class} · {c.vehicle_count} vehículo{c.vehicle_count > 1 ? 's' : ''}</small>
                </div>
                <button
                  className="kb-btn kb-btn--primary"
                  onClick={() => handlePromote(c._id)}
                  disabled={busyId === c._id}
                >
                  {busyId === c._id ? 'Promoviendo…' : 'Promover a global'}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="kb-section">
        <header className="kb-section__header">
          <AlertTriangle size={18} />
          <h3>Alertas de integridad sin resolver</h3>
          <span className="kb-badge kb-badge--warn">{Array.isArray(unresolvedAlerts) ? unresolvedAlerts.length : 0}</span>
        </header>
        {unresolvedAlerts === undefined ? (
          <div className="kb-loading">Cargando…</div>
        ) : unresolvedAlerts.length === 0 ? (
          <div className="kb-empty">
            <Check size={24} />
            <p>Sin alertas activas.</p>
          </div>
        ) : (
          <ul className="kb-list">
            {unresolvedAlerts.map((a) => (
              <li key={a._id} className={`kb-list-item kb-list-item--${a.severity}`}>
                <div className="kb-list-item__main">
                  <strong>{a.tipo}</strong>
                  <small>{a.mensaje}</small>
                  <span className="kb-list-item__date">
                    {new Date(a.detected_at).toLocaleString('es-PA')}
                  </span>
                </div>
                <button
                  className="kb-btn kb-btn--ghost"
                  onClick={() => handleResolve(a._id)}
                  disabled={busyId === a._id}
                >
                  Marcar resuelto
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
