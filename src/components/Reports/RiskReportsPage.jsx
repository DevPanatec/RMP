import { useState, useMemo } from 'react';
import {
  AlertTriangle,
  AlertOctagon,
  Wrench,
  Calendar,
  Filter,
  Search,
  MapPin,
  Eye,
  Camera,
} from '../Icons';
import { useRiskReports } from '../../context/RiskReportsContext';
import RiskReportDetailModal from './RiskReportDetailModal';
import './RiskReportsPage.css';

const SEV_LABEL = {
  critico: 'Crítico',
  alto: 'Alto',
  medio: 'Medio',
  bajo: 'Bajo',
};

const TIPO_RIESGO_LABEL = {
  mecanico: 'Mecánico',
  combustible: 'Combustible',
  seguridad: 'Seguridad',
  mantenimiento: 'Mantenimiento',
  bloqueo_via: 'Bloqueo de vía',
  seguridad_ciudadana: 'Seguridad ciudadana',
  climatico: 'Climático',
  manifestacion: 'Manifestación',
  accidente: 'Accidente',
  operacional: 'Operacional',
};

const parseDate = (s) => {
  if (!s) return null;
  if (typeof s === 'number') return new Date(s);
  if (s.includes('T')) return new Date(s);
  return new Date(s + 'T00:00:00');
};

const toIsoDate = (d) => d.toISOString().slice(0, 10);

const RiskReportsPage = () => {
  const { reports, loading } = useRiskReports();
  const [selectedReport, setSelectedReport] = useState(null);

  // Default range: últimos 30 días
  const [dateRange, setDateRange] = useState(() => ({
    desde: toIsoDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)),
    hasta: toIsoDate(new Date()),
  }));
  const [filterSeveridad, setFilterSeveridad] = useState('all');
  const [filterTipo, setFilterTipo] = useState('all'); // 'all' | 'interno' | 'externo'
  const [filterCategoria, setFilterCategoria] = useState('all');
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const desdeMs = parseDate(dateRange.desde)?.getTime() ?? 0;
    const hastaMs = (parseDate(dateRange.hasta)?.getTime() ?? Infinity) + 24 * 60 * 60 * 1000 - 1;

    return reports.filter((r) => {
      const fechaMs = parseDate(r.fecha_reporte || r.fechaCreacion)?.getTime() ?? 0;
      if (fechaMs < desdeMs || fechaMs > hastaMs) return false;
      if (filterSeveridad !== 'all' && r.nivel_severidad !== filterSeveridad) return false;
      if (filterTipo !== 'all' && r.tipo !== filterTipo) return false;
      if (filterCategoria !== 'all' && r.tipo_riesgo !== filterCategoria) return false;
      if (search) {
        const q = search.toLowerCase();
        const hay =
          (r.titulo || '').toLowerCase().includes(q) ||
          (r.descripcion || '').toLowerCase().includes(q) ||
          (r.conductor || '').toLowerCase().includes(q) ||
          (r.ubicacion || '').toLowerCase().includes(q);
        if (!hay) return false;
      }
      return true;
    });
  }, [reports, dateRange, filterSeveridad, filterTipo, filterCategoria, search]);

  const stats = useMemo(() => {
    const byCount = (key, val) => filtered.filter((r) => r[key] === val).length;
    return {
      total: filtered.length,
      critico: byCount('nivel_severidad', 'critico'),
      alto: byCount('nivel_severidad', 'alto'),
      medio: byCount('nivel_severidad', 'medio'),
      bajo: byCount('nivel_severidad', 'bajo'),
      internos: byCount('tipo', 'interno'),
      externos: byCount('tipo', 'externo'),
    };
  }, [filtered]);

  // Tipos disponibles desde la data (no hardcoded)
  const categoriasDisponibles = useMemo(() => {
    const set = new Set();
    reports.forEach((r) => r.tipo_riesgo && set.add(r.tipo_riesgo));
    return Array.from(set).sort();
  }, [reports]);

  const presetRange = (days) => {
    const hasta = new Date();
    const desde = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    setDateRange({ desde: toIsoDate(desde), hasta: toIsoDate(hasta) });
  };

  if (loading) {
    return <div className="rrp-loading">Cargando reportes de riesgo…</div>;
  }

  return (
    <div className="rrp">
      {/* Filtros */}
      <div className="rrp-filters">
        <div className="rrp-filters__row">
          <div className="rrp-filter">
            <label><Calendar size={12} strokeWidth={2} /> Desde</label>
            <input
              type="date"
              value={dateRange.desde}
              onChange={(e) => setDateRange((r) => ({ ...r, desde: e.target.value }))}
            />
          </div>
          <div className="rrp-filter">
            <label><Calendar size={12} strokeWidth={2} /> Hasta</label>
            <input
              type="date"
              value={dateRange.hasta}
              onChange={(e) => setDateRange((r) => ({ ...r, hasta: e.target.value }))}
            />
          </div>
          <div className="rrp-presets">
            <button type="button" onClick={() => presetRange(7)}>7d</button>
            <button type="button" onClick={() => presetRange(30)}>30d</button>
            <button type="button" onClick={() => presetRange(90)}>90d</button>
            <button type="button" onClick={() => presetRange(365)}>1a</button>
          </div>
        </div>

        <div className="rrp-filters__row">
          <div className="rrp-filter">
            <label><Filter size={12} strokeWidth={2} /> Severidad</label>
            <select value={filterSeveridad} onChange={(e) => setFilterSeveridad(e.target.value)}>
              <option value="all">Todas</option>
              <option value="critico">Crítico</option>
              <option value="alto">Alto</option>
              <option value="medio">Medio</option>
              <option value="bajo">Bajo</option>
            </select>
          </div>
          <div className="rrp-filter">
            <label><Filter size={12} strokeWidth={2} /> Tipo</label>
            <select value={filterTipo} onChange={(e) => setFilterTipo(e.target.value)}>
              <option value="all">Todos</option>
              <option value="interno">Interno</option>
              <option value="externo">Externo</option>
            </select>
          </div>
          <div className="rrp-filter">
            <label><Filter size={12} strokeWidth={2} /> Categoría</label>
            <select value={filterCategoria} onChange={(e) => setFilterCategoria(e.target.value)}>
              <option value="all">Todas</option>
              {categoriasDisponibles.map((c) => (
                <option key={c} value={c}>
                  {TIPO_RIESGO_LABEL[c] || c}
                </option>
              ))}
            </select>
          </div>
          <div className="rrp-filter rrp-filter--search">
            <label><Search size={12} strokeWidth={2} /> Buscar</label>
            <input
              type="text"
              placeholder="Título, descripción, conductor…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="rrp-stats">
        <div className="rrp-stat">
          <span className="rrp-stat__num">{stats.total}</span>
          <span className="rrp-stat__label">Total</span>
        </div>
        <div className="rrp-stat rrp-stat--critico">
          <span className="rrp-stat__num">{stats.critico}</span>
          <span className="rrp-stat__label">Crítico</span>
        </div>
        <div className="rrp-stat rrp-stat--alto">
          <span className="rrp-stat__num">{stats.alto}</span>
          <span className="rrp-stat__label">Alto</span>
        </div>
        <div className="rrp-stat rrp-stat--medio">
          <span className="rrp-stat__num">{stats.medio}</span>
          <span className="rrp-stat__label">Medio</span>
        </div>
        <div className="rrp-stat rrp-stat--bajo">
          <span className="rrp-stat__num">{stats.bajo}</span>
          <span className="rrp-stat__label">Bajo</span>
        </div>
        <div className="rrp-stat">
          <span className="rrp-stat__num">{stats.internos}</span>
          <span className="rrp-stat__label">Internos</span>
        </div>
        <div className="rrp-stat">
          <span className="rrp-stat__num">{stats.externos}</span>
          <span className="rrp-stat__label">Externos</span>
        </div>
      </div>

      {/* Lista */}
      {filtered.length === 0 ? (
        <div className="rrp-empty">
          <AlertTriangle size={28} strokeWidth={1.5} />
          <p>Sin reportes de riesgo en este rango.</p>
        </div>
      ) : (
        <div className="rrp-list">
          {filtered.map((r) => {
            const sev = (r.nivel_severidad || '').toLowerCase();
            const fecha = parseDate(r.fecha_reporte || r.fechaCreacion);
            const esExterno = r.tipo === 'externo';
            const fotos = r.fotos_storage_ids || [];
            return (
              <button
                key={r._id}
                type="button"
                className={`rrp-item rrp-item--sev-${sev}`}
                onClick={() => setSelectedReport(r)}
              >
                <div className="rrp-item__sev-bar" />
                <div className="rrp-item__main">
                  <div className="rrp-item__head">
                    <h4>{r.titulo}</h4>
                    <span className={`rrp-pill rrp-pill--sev-${sev}`}>{SEV_LABEL[sev] || r.nivel_severidad}</span>
                  </div>
                  <p className="rrp-item__desc">{r.descripcion}</p>
                  <div className="rrp-item__meta">
                    <span className="rrp-meta">
                      {esExterno ? <AlertOctagon size={11} strokeWidth={2} /> : <Wrench size={11} strokeWidth={2} />}
                      {esExterno ? 'Externo' : 'Interno'}
                    </span>
                    <span className="rrp-meta">{TIPO_RIESGO_LABEL[r.tipo_riesgo] || r.tipo_riesgo}</span>
                    <span className="rrp-meta">
                      <Calendar size={11} strokeWidth={2} />
                      {fecha?.toLocaleDateString('es-PA', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </span>
                    {(r.ubicacion || r.parada_nombre) && (
                      <span className="rrp-meta">
                        <MapPin size={11} strokeWidth={2} />
                        {r.parada_nombre || r.ubicacion}
                      </span>
                    )}
                    {fotos.length > 0 && (
                      <span className="rrp-meta rrp-meta--photos">
                        <Camera size={11} strokeWidth={2} />
                        {fotos.length}
                      </span>
                    )}
                  </div>
                </div>
                <div className="rrp-item__action">
                  <Eye size={14} strokeWidth={2} />
                </div>
              </button>
            );
          })}
        </div>
      )}

      {selectedReport && (
        <RiskReportDetailModal report={selectedReport} onClose={() => setSelectedReport(null)} />
      )}
    </div>
  );
};

export default RiskReportsPage;
