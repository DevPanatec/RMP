import { useState, useMemo } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { Download, RefreshCw } from '../Icons';
import toast from 'react-hot-toast';

const today = () => new Date().toISOString().slice(0, 10);
const daysAgo = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
};

const ReporteTab = () => {
  const [desde, setDesde] = useState(() => daysAgo(14));
  const [hasta, setHasta] = useState(() => today());

  const reporte = useQuery(api.asistencia.reportes.reporteHoras, {
    fecha_desde: desde,
    fecha_hasta: hasta,
  });
  const recalcularDia = useMutation(api.asistencia.jornadasCron.recalcularDia);

  const totales = useMemo(() => {
    if (!reporte) return null;
    return reporte.reduce(
      (acc, r) => ({
        empleados: acc.empleados + 1,
        horas: acc.horas + r.horas_trabajadas,
        tarde_min: acc.tarde_min + r.minutos_tarde,
        ausente_min: acc.ausente_min + r.minutos_ausente,
        extras_min: acc.extras_min + r.extras_diurna_min + r.extras_nocturna_min + r.extras_feriado_min + r.extras_domingo_min,
      }),
      { empleados: 0, horas: 0, tarde_min: 0, ausente_min: 0, extras_min: 0 },
    );
  }, [reporte]);

  const handleExportCSV = () => {
    if (!reporte || reporte.length === 0) {
      toast.error('Sin datos para exportar');
      return;
    }
    const headers = [
      'Empleado', 'Cédula', 'Cargo',
      'Días completos', 'Días ausente', 'Días permiso',
      'Horas trabajadas', 'Min tarde', 'Min ausente',
      'HE diurna (min)', 'HE nocturna (min)', 'HE feriado (min)', 'HE domingo (min)',
      'Permisos count',
    ];
    const rows = reporte.map((r) => [
      r.nombre, r.cedula, r.cargo,
      r.dias_completos, r.dias_ausente, r.dias_permiso,
      r.horas_trabajadas, r.minutos_tarde, r.minutos_ausente,
      r.extras_diurna_min, r.extras_nocturna_min, r.extras_feriado_min, r.extras_domingo_min,
      r.permisos_count,
    ]);
    const csv = [headers, ...rows]
      .map((row) => row.map(csvCell).join(','))
      .join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `asistencia_${desde}_a_${hasta}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('CSV descargado');
  };

  const handleRecalcular = async () => {
    if (!confirm(`Recalcular jornadas desde ${desde} hasta ${hasta}? Puede tardar.`)) return;
    try {
      // Recalcular día por día (cron interno se reagenda en chunks)
      let d = desde;
      while (d <= hasta) {
        await recalcularDia({ fecha: d });
        d = nextDay(d);
      }
      toast.success('Recálculo lanzado. Refrescá en unos segundos.');
    } catch (e) {
      toast.error(e.message || 'Error');
    }
  };

  return (
    <div>
      <div className="asi-toolbar">
        <h3 className="asi-section-title">Reporte de horas</h3>
        <div className="asi-form-row">
          <label className="asi-form-row__inline">
            <span>Desde</span>
            <input
              type="date"
              className="asi-input asi-input--inline"
              value={desde}
              onChange={(e) => setDesde(e.target.value)}
            />
          </label>
          <label className="asi-form-row__inline">
            <span>Hasta</span>
            <input
              type="date"
              className="asi-input asi-input--inline"
              value={hasta}
              onChange={(e) => setHasta(e.target.value)}
            />
          </label>
          <button className="asi-btn" onClick={handleRecalcular} title="Recalcular jornadas">
            <RefreshCw size={14} /> Recalcular
          </button>
          <button className="asi-btn asi-btn--primary" onClick={handleExportCSV}>
            <Download size={14} /> Exportar CSV
          </button>
        </div>
      </div>

      {totales && (
        <div className="asi-stats-row">
          <Stat label="Empleados" value={totales.empleados} />
          <Stat label="Horas trabajadas" value={totales.horas.toFixed(2)} />
          <Stat label="Tarde (h)" value={(totales.tarde_min / 60).toFixed(1)} />
          <Stat label="Ausente (h)" value={(totales.ausente_min / 60).toFixed(1)} />
          <Stat label="Extras aprobadas (h)" value={(totales.extras_min / 60).toFixed(1)} />
        </div>
      )}

      <table className="asi-table">
        <thead>
          <tr>
            <th>Empleado</th>
            <th>Días OK</th>
            <th>Aus.</th>
            <th>Permiso</th>
            <th>Horas trab.</th>
            <th>Tarde (m)</th>
            <th>HE diur</th>
            <th>HE noct</th>
            <th>HE feriad</th>
            <th>HE dom</th>
          </tr>
        </thead>
        <tbody>
          {(reporte ?? []).map((r) => (
            <tr key={r.empleado_id}>
              <td>{r.nombre}</td>
              <td>{r.dias_completos}</td>
              <td>{r.dias_ausente}</td>
              <td>{r.dias_permiso}</td>
              <td>{r.horas_trabajadas}</td>
              <td>{r.minutos_tarde}</td>
              <td>{r.extras_diurna_min}</td>
              <td>{r.extras_nocturna_min}</td>
              <td>{r.extras_feriado_min}</td>
              <td>{r.extras_domingo_min}</td>
            </tr>
          ))}
          {reporte && reporte.length === 0 && (
            <tr><td colSpan={10} className="asi-table__empty">Sin datos en el rango.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

const Stat = ({ label, value }) => (
  <div className="asi-stat">
    <div className="asi-stat__label">{label}</div>
    <div className="asi-stat__value">{value}</div>
  </div>
);

const csvCell = (v) => {
  if (v == null) return '';
  const s = String(v);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
};

const nextDay = (iso) => {
  const d = new Date(iso + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
};

export default ReporteTab;
