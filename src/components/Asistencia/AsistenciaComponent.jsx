import { useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { useAsistencia } from '../../context/AsistenciaContext';
import { useOrganization } from '../../context/OrganizationContext';
import { usePersonnel } from '../../context/PersonnelContext';
import {
  Clock, MapPin, Lock, Users, Activity, Plus, Trash2, Copy, RefreshCw, Camera,
  Calendar, Zap, BarChart3, CalendarDays, ChevronDown, ChevronUp, Settings,
} from '../Icons';
import toast from 'react-hot-toast';
import FacialEnrollmentModal from './FacialEnrollmentModal';
import ZoneMapPicker from './ZoneMapPicker';
import { PermisosTab, HorasExtrasTab, CambiosTurnoTab } from './WorkflowTabs';
import ReporteTab from './ReporteTab';
import CalendarioTurnosTab from './CalendarioTurnosTab';
import OnboardingChecklist from './OnboardingChecklist';
import AsignarHorarioWizard from './AsignarHorarioWizard';
import './AsistenciaComponent.css';

// Tabs primarios — uso diario
const TABS_PRIMARY = [
  { id: 'empleados', label: 'Personal', icon: Users },
  { id: 'marcaciones', label: 'Marcaciones', icon: Lock },
  { id: 'reporte', label: 'Reporte', icon: BarChart3 },
];

// Tabs avanzados — setup + casos especiales
const TABS_ADVANCED = [
  { id: 'horarios', label: 'Turnos', icon: Clock },
  { id: 'calendario', label: 'Calendario semanal', icon: CalendarDays },
  { id: 'zonas', label: 'Zonas', icon: MapPin },
  { id: 'kioscos', label: 'Kioscos', icon: Activity },
  { id: 'permisos', label: 'Permisos', icon: Calendar },
  { id: 'horas_extras', label: 'Horas extras', icon: Zap },
  { id: 'cambios_turno', label: 'Cambios de turno', icon: RefreshCw },
];

const AsistenciaComponent = () => {
  const { hasModulo } = useOrganization();
  const [activeSub, setActiveSub] = useState('empleados');
  const [showAdvanced, setShowAdvanced] = useState(false);

  if (!hasModulo('ASI')) {
    return (
      <div className="asi-empty">
        <Lock size={48} strokeWidth={1.5} />
        <h2>Módulo Asistencia no contratado</h2>
        <p>Contacta al administrador para activar este módulo.</p>
      </div>
    );
  }

  return (
    <div className="asi-root">
      <OnboardingChecklist onGoToTab={(id) => setActiveSub(id)} />

      <div className="asi-subnav">
        {TABS_PRIMARY.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              className={`asi-subnav__btn ${activeSub === t.id ? 'is-active' : ''}`}
              onClick={() => setActiveSub(t.id)}
            >
              <Icon size={16} />
              <span>{t.label}</span>
            </button>
          );
        })}
        <button
          className={`asi-subnav__btn asi-subnav__more ${showAdvanced ? 'is-open' : ''}`}
          onClick={() => setShowAdvanced(!showAdvanced)}
        >
          <Settings size={16} />
          <span>Configuración</span>
          {showAdvanced ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {showAdvanced && (
        <div className="asi-subnav asi-subnav--advanced">
          {TABS_ADVANCED.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                className={`asi-subnav__btn ${activeSub === t.id ? 'is-active' : ''}`}
                onClick={() => setActiveSub(t.id)}
              >
                <Icon size={14} />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>
      )}

      <div className="asi-content">
        {activeSub === 'empleados' && <PersonalTab />}
        {activeSub === 'marcaciones' && <MarcacionesTab />}
        {activeSub === 'reporte' && <ReporteTab />}
        {activeSub === 'horarios' && <TurnosTab />}
        {activeSub === 'calendario' && <CalendarioTurnosTab />}
        {activeSub === 'zonas' && <ZonasTab />}
        {activeSub === 'kioscos' && <KioscosTab />}
        {activeSub === 'permisos' && <PermisosTab />}
        {activeSub === 'horas_extras' && <HorasExtrasTab />}
        {activeSub === 'cambios_turno' && <CambiosTurnoTab />}
      </div>
    </div>
  );
};

// ─── Personal (vista 360 consolidada) ──────────────────────────────

const PersonalTab = () => {
  const { employees } = usePersonnel();
  const [selectedEmp, setSelectedEmp] = useState(null);

  if (!employees || employees.length === 0) {
    return (
      <div className="asi-empty asi-empty--inline">
        <Users size={32} />
        <p>No hay empleados registrados. Crea empleados desde el tab Personal del menú principal.</p>
      </div>
    );
  }

  return (
    <div className="asi-emp-layout">
      <div className="asi-emp-list">
        <h3 className="asi-section-title">Personal ({employees.length})</h3>
        <ul className="asi-list">
          {employees.map((e) => {
            const ready = !!e.tiene_pin || !!e.tiene_facial;
            return (
              <li
                key={e._id}
                className={`asi-list__item ${selectedEmp?._id === e._id ? 'is-selected' : ''}`}
                onClick={() => setSelectedEmp(e)}
              >
                <div className="asi-list__primary">
                  {e.nombre} {e.apellido}
                </div>
                <div className="asi-list__secondary">
                  {e.cargo ?? 'Sin cargo'}
                  {!ready && <span className="asi-list__warn">Falta configurar</span>}
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="asi-emp-detail">
        {selectedEmp ? (
          <EmpleadoCard empleado={selectedEmp} />
        ) : (
          <div className="asi-empty asi-empty--inline">
            <p>Selecciona un colaborador para ver y configurar todo lo necesario.</p>
          </div>
        )}
      </div>
    </div>
  );
};

const EmpleadoCard = ({ empleado }) => {
  const { zonas, setPin, clearLockout, clearFacial, asignarZona } = useAsistencia();
  const [showWizard, setShowWizard] = useState(false);
  const [showFacial, setShowFacial] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [showPinForm, setShowPinForm] = useState(false);
  const [zonaId, setZonaId] = useState('');
  const [vigenciaDesde, setVigenciaDesde] = useState(() => new Date().toISOString().slice(0, 10));
  const [showZonaForm, setShowZonaForm] = useState(false);

  // Horario vigente (calendario override → asignacion default)
  const horarioInfo = useQuery(api.asistencia.turnosCalendario.getHorarioParaFecha, {
    empleado_id: empleado._id,
    fecha: new Date().toISOString().slice(0, 10),
  });

  // Zona vigente
  const zonasVigentes = useQuery(api.asistencia.zonas.getZonasVigentes, {
    empleado_id: empleado._id,
  });
  const zonaActual = zonasVigentes?.[0]?.zona;

  const handleSetPin = async () => {
    if (!/^\d{4}$/.test(pinInput)) return toast.error('PIN debe ser 4 dígitos');
    const res = await setPin({ empleado_id: empleado._id, pin: pinInput });
    if (res.success) {
      toast.success('PIN configurado');
      setPinInput('');
      setShowPinForm(false);
    } else {
      toast.error(res.error || 'Error');
    }
  };

  const handleAsignarZona = async () => {
    if (!zonaId) return toast.error('Selecciona una zona');
    const res = await asignarZona({
      empleado_id: empleado._id,
      attendance_zone_id: zonaId,
      vigencia_desde: vigenciaDesde,
    });
    if (res.success) {
      toast.success('Zona asignada');
      setShowZonaForm(false);
    } else {
      toast.error(res.error || 'Error');
    }
  };

  return (
    <div className="asi-emp-detail__panel">
      <h3 className="asi-section-title">{empleado.nombre} {empleado.apellido}</h3>
      <p className="asi-emp-detail__meta">
        {empleado.cargo ?? 'Sin cargo'} - Cédula {empleado.cedula ?? '—'}
      </p>

      {/* HORARIO */}
      <section className="asi-card-section">
        <div className="asi-card-section__head">
          <h4>Horario</h4>
          <button className="asi-btn asi-btn--primary asi-btn--sm" onClick={() => setShowWizard(true)}>
            Asignar horario
          </button>
        </div>
        <div className="asi-card-section__body">
          {horarioInfo === undefined ? (
            <p className="asi-card-section__hint">Cargando...</p>
          ) : horarioInfo?.plantilla ? (
            <>
              <strong>{horarioInfo.plantilla.nombre}</strong>
              <span>
                {horarioInfo.plantilla.hora_entrada} - {horarioInfo.plantilla.hora_salida}
                {horarioInfo.source === 'calendario' && ' (este día, override calendario)'}
              </span>
            </>
          ) : horarioInfo?.source === 'calendario_off' ? (
            <span>Hoy marcado como libre</span>
          ) : (
            <span className="asi-card-section__missing">Sin horario asignado</span>
          )}
        </div>
      </section>

      {/* ZONA */}
      <section className="asi-card-section">
        <div className="asi-card-section__head">
          <h4>Zona de marcación</h4>
          <button className="asi-btn asi-btn--sm" onClick={() => setShowZonaForm(!showZonaForm)}>
            {zonaActual ? 'Cambiar' : 'Asignar'}
          </button>
        </div>
        <div className="asi-card-section__body">
          {zonaActual ? (
            <>
              <strong>{zonaActual.nombre}</strong>
              <span>{zonaActual.direccion ?? `Radio ${zonaActual.radio}m`}</span>
            </>
          ) : (
            <span className="asi-card-section__missing">Sin zona asignada</span>
          )}
        </div>
        {showZonaForm && (
          <div className="asi-card-section__form">
            <select className="asi-input" value={zonaId} onChange={(e) => setZonaId(e.target.value)}>
              <option value="">Selecciona una zona...</option>
              {zonas.filter((z) => z.activo).map((z) => (
                <option key={z._id} value={z._id}>{z.nombre}</option>
              ))}
            </select>
            <input
              type="date"
              className="asi-input"
              value={vigenciaDesde}
              onChange={(e) => setVigenciaDesde(e.target.value)}
            />
            <button className="asi-btn asi-btn--primary" onClick={handleAsignarZona}>Guardar</button>
          </div>
        )}
      </section>

      {/* PIN */}
      <section className="asi-card-section">
        <div className="asi-card-section__head">
          <h4>PIN de marcación</h4>
          <button className="asi-btn asi-btn--sm" onClick={() => setShowPinForm(!showPinForm)}>
            {empleado.tiene_pin ? 'Cambiar PIN' : 'Configurar'}
          </button>
        </div>
        <div className="asi-card-section__body">
          {empleado.tiene_pin
            ? <span>PIN configurado (4 dígitos)</span>
            : <span className="asi-card-section__missing">Sin PIN configurado</span>
          }
        </div>
        {showPinForm && (
          <div className="asi-card-section__form">
            <input
              type="text"
              inputMode="numeric"
              maxLength={4}
              className="asi-input"
              placeholder="4 dígitos"
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ''))}
            />
            <button className="asi-btn asi-btn--primary" onClick={handleSetPin} disabled={pinInput.length !== 4}>
              Guardar PIN
            </button>
            {empleado.tiene_pin && (
              <button
                className="asi-btn"
                onClick={async () => {
                  const r = await clearLockout({ empleado_id: empleado._id });
                  if (r.success) toast.success('Desbloqueado');
                  else toast.error(r.error || 'Error');
                }}
              >
                Desbloquear
              </button>
            )}
          </div>
        )}
      </section>

      {/* FACIAL */}
      <section className="asi-card-section">
        <div className="asi-card-section__head">
          <h4>Reconocimiento facial</h4>
          <button className="asi-btn asi-btn--sm" onClick={() => setShowFacial(true)}>
            <Camera size={14} />
            {empleado.tiene_facial ? 'Re-registrar' : 'Registrar rostro'}
          </button>
        </div>
        <div className="asi-card-section__body">
          {empleado.tiene_facial ? (
            <span>Rostro registrado</span>
          ) : (
            <span className="asi-card-section__missing">Sin rostro registrado</span>
          )}
          {empleado.tiene_facial && (
            <button
              className="asi-link"
              onClick={async () => {
                if (!confirm('Borrar el registro facial del empleado?')) return;
                const r = await clearFacial({ empleado_id: empleado._id });
                if (r.success) toast.success('Borrado');
                else toast.error(r.error || 'Error');
              }}
            >
              Borrar
            </button>
          )}
        </div>
      </section>

      {showWizard && (
        <AsignarHorarioWizard
          empleado={empleado}
          onClose={() => setShowWizard(false)}
          onDone={() => setShowWizard(false)}
        />
      )}

      {showFacial && (
        <FacialEnrollmentModal
          empleado={empleado}
          onClose={() => setShowFacial(false)}
          onComplete={() => setShowFacial(false)}
        />
      )}
    </div>
  );
};

// ─── Turnos (antes Horarios) ───────────────────────────────────────

const TurnosTab = () => {
  const { plantillas, createPlantilla, deactivatePlantilla } = useAsistencia();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    nombre: '',
    hora_entrada: '08:00',
    hora_salida: '17:00',
    hora_almuerzo_inicio: '12:00',
    hora_almuerzo_fin: '13:00',
    horas_diarias: 8,
    tolerancia_entrada_min: 10,
    dias_laborables: [1, 2, 3, 4, 5],
  });

  const handleCreate = async () => {
    if (!form.nombre.trim()) return toast.error('Nombre requerido');
    const res = await createPlantilla(form);
    if (res.success) {
      toast.success('Turno creado');
      setShowForm(false);
      setForm({ ...form, nombre: '' });
    } else {
      toast.error(res.error || 'Error');
    }
  };

  return (
    <div>
      <div className="asi-toolbar">
        <h3 className="asi-section-title">Turnos disponibles</h3>
        <button className="asi-btn asi-btn--primary" onClick={() => setShowForm(!showForm)}>
          <Plus size={16} /> Nuevo turno
        </button>
      </div>

      <p className="asi-hint">
        Los turnos son los horarios estándar de la empresa (Mañana, Tarde, Noche...).
        Después asignas un turno a cada colaborador en la pestaña Personal.
      </p>

      {showForm && (
        <div className="asi-card">
          <div className="asi-form-grid">
            <label>
              Nombre del turno
              <input
                className="asi-input"
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                placeholder="Mañana 6 a 2"
              />
            </label>
            <label>
              Hora entrada
              <input
                type="time"
                className="asi-input"
                value={form.hora_entrada}
                onChange={(e) => setForm({ ...form, hora_entrada: e.target.value })}
              />
            </label>
            <label>
              Hora salida
              <input
                type="time"
                className="asi-input"
                value={form.hora_salida}
                onChange={(e) => setForm({ ...form, hora_salida: e.target.value })}
              />
            </label>
            <label>
              Almuerzo inicio
              <input
                type="time"
                className="asi-input"
                value={form.hora_almuerzo_inicio}
                onChange={(e) => setForm({ ...form, hora_almuerzo_inicio: e.target.value })}
              />
            </label>
            <label>
              Almuerzo fin
              <input
                type="time"
                className="asi-input"
                value={form.hora_almuerzo_fin}
                onChange={(e) => setForm({ ...form, hora_almuerzo_fin: e.target.value })}
              />
            </label>
            <label>
              Horas diarias
              <input
                type="number"
                className="asi-input"
                value={form.horas_diarias}
                onChange={(e) => setForm({ ...form, horas_diarias: Number(e.target.value) })}
              />
            </label>
            <label>
              Tolerancia entrada (min)
              <input
                type="number"
                className="asi-input"
                value={form.tolerancia_entrada_min}
                onChange={(e) => setForm({ ...form, tolerancia_entrada_min: Number(e.target.value) })}
              />
            </label>
            <label className="asi-form-grid__full">
              Días laborables
              <DiasLaborablesSelector
                value={form.dias_laborables}
                onChange={(d) => setForm({ ...form, dias_laborables: d })}
              />
            </label>
          </div>
          <div className="asi-form-actions">
            <button className="asi-btn" onClick={() => setShowForm(false)}>Cancelar</button>
            <button className="asi-btn asi-btn--primary" onClick={handleCreate}>Crear</button>
          </div>
        </div>
      )}

      <table className="asi-table">
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Horario</th>
            <th>Almuerzo</th>
            <th>Días</th>
            <th>Estado</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {plantillas.map((p) => (
            <tr key={p._id} className={!p.activo ? 'is-inactive' : ''}>
              <td>{p.nombre}</td>
              <td>{p.hora_entrada} - {p.hora_salida}</td>
              <td>{p.hora_almuerzo_inicio ? `${p.hora_almuerzo_inicio}-${p.hora_almuerzo_fin}` : '—'}</td>
              <td>{p.dias_laborables.map(diaCorto).join(',')}</td>
              <td>
                {p.activo
                  ? <span className="asi-badge asi-badge--success">activo</span>
                  : <span className="asi-badge">inactivo</span>
                }
              </td>
              <td>
                {p.activo && (
                  <button
                    className="asi-btn asi-btn--icon"
                    onClick={async () => {
                      if (!confirm('Desactivar este turno?')) return;
                      const r = await deactivatePlantilla({ id: p._id });
                      if (r.success) toast.success('Turno desactivado');
                      else toast.error(r.error || 'Error');
                    }}
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </td>
            </tr>
          ))}
          {plantillas.length === 0 && (
            <tr><td colSpan={6} className="asi-table__empty">
              No hay turnos creados. Crea uno arriba o usa el botón "Crear 4 turnos" del checklist.
            </td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

const DIAS = [
  { v: 0, label: 'Dom' },
  { v: 1, label: 'Lun' },
  { v: 2, label: 'Mar' },
  { v: 3, label: 'Mié' },
  { v: 4, label: 'Jue' },
  { v: 5, label: 'Vie' },
  { v: 6, label: 'Sáb' },
];

const DiasLaborablesSelector = ({ value, onChange }) => {
  const toggle = (d) => {
    if (value.includes(d)) onChange(value.filter((x) => x !== d));
    else onChange([...value, d].sort());
  };
  return (
    <div className="asi-dias">
      {DIAS.map((d) => (
        <button
          key={d.v}
          type="button"
          className={`asi-dia ${value.includes(d.v) ? 'is-active' : ''}`}
          onClick={() => toggle(d.v)}
        >
          {d.label}
        </button>
      ))}
    </div>
  );
};

const diaCorto = (n) => DIAS.find((d) => d.v === n)?.label.slice(0, 1).toUpperCase() ?? '?';

// ─── Zonas ─────────────────────────────────────────────────────────

const ZonasTab = () => {
  const { zonas, createZona, removeZona } = useAsistencia();
  const [showForm, setShowForm] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [form, setForm] = useState({
    nombre: '',
    latitud: null,  // null = aún no seleccionada en mapa
    longitud: null,
    radio: 100,
    direccion: '',
  });

  const hasLocation = form.latitud !== null && form.longitud !== null;

  const handleCreate = async () => {
    if (!form.nombre.trim()) return toast.error('Nombre requerido');
    if (!hasLocation) return toast.error('Seleccioná la zona en el mapa');
    const res = await createZona(form);
    if (res.success) {
      toast.success('Zona creada');
      setShowForm(false);
      setForm({ nombre: '', latitud: null, longitud: null, radio: 100, direccion: '' });
    } else {
      toast.error(res.error || 'Error');
    }
  };

  const handlePickerConfirm = ({ lat, lng, radio, direccion }) => {
    setForm((prev) => ({
      ...prev,
      latitud: lat,
      longitud: lng,
      radio,
      direccion: direccion ?? prev.direccion,
    }));
    setShowPicker(false);
  };

  return (
    <div>
      <div className="asi-toolbar">
        <h3 className="asi-section-title">Zonas de marcación</h3>
        <button className="asi-btn asi-btn--primary" onClick={() => setShowForm(!showForm)}>
          <Plus size={16} /> Nueva zona
        </button>
      </div>

      <p className="asi-hint">
        Una zona es el sitio físico donde el personal marca. El sistema valida que el kiosko
        esté dentro del radio antes de aceptar la marcación.
      </p>

      {showForm && (
        <div className="asi-card">
          <div className="asi-form-grid">
            <label className="asi-form-grid__full">
              Nombre
              <input
                className="asi-input"
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                placeholder="Oficina central"
              />
            </label>

            <div className="asi-form-grid__full asi-zone-pick">
              <div className="asi-zone-pick__info">
                {hasLocation ? (
                  <>
                    <strong>Ubicación seleccionada</strong>
                    <span className="asi-monospace">
                      {form.latitud.toFixed(5)}, {form.longitud.toFixed(5)} · radio {form.radio}m
                    </span>
                  </>
                ) : (
                  <>
                    <strong>Sin ubicación</strong>
                    <span>Abre el mapa para colocar el pin y ajustar el radio.</span>
                  </>
                )}
              </div>
              <button
                type="button"
                className="asi-btn asi-btn--primary"
                onClick={() => setShowPicker(true)}
              >
                <MapPin size={16} />
                {hasLocation ? 'Cambiar en mapa' : 'Seleccionar en mapa'}
              </button>
            </div>

            <label className="asi-form-grid__full">
              Dirección (opcional)
              <input
                className="asi-input"
                value={form.direccion}
                onChange={(e) => setForm({ ...form, direccion: e.target.value })}
                placeholder="Calle 50, Edif. ABC"
              />
            </label>
          </div>
          <div className="asi-form-actions">
            <button className="asi-btn" onClick={() => setShowForm(false)}>Cancelar</button>
            <button
              className="asi-btn asi-btn--primary"
              onClick={handleCreate}
              disabled={!hasLocation || !form.nombre.trim()}
            >
              Crear zona
            </button>
          </div>
        </div>
      )}

      {showPicker && (
        <ZoneMapPicker
          initial={hasLocation ? {
            lat: form.latitud,
            lng: form.longitud,
            radio: form.radio,
            direccion: form.direccion,
          } : null}
          onConfirm={handlePickerConfirm}
          onClose={() => setShowPicker(false)}
        />
      )}

      <table className="asi-table">
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Coordenadas</th>
            <th>Radio</th>
            <th>Dirección</th>
            <th>Estado</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {zonas.map((z) => (
            <tr key={z._id} className={!z.activo ? 'is-inactive' : ''}>
              <td>{z.nombre}</td>
              <td className="asi-monospace">{z.latitud.toFixed(5)}, {z.longitud.toFixed(5)}</td>
              <td>{z.radio}m</td>
              <td>{z.direccion ?? '—'}</td>
              <td>{z.activo ? <span className="asi-badge asi-badge--success">activa</span> : <span className="asi-badge">inactiva</span>}</td>
              <td>
                {z.activo && (
                  <button
                    className="asi-btn asi-btn--icon"
                    onClick={async () => {
                      const r = await removeZona({ id: z._id });
                      if (r.success) toast.success('Zona desactivada');
                      else toast.error(r.error || 'Error');
                    }}
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </td>
            </tr>
          ))}
          {zonas.length === 0 && (
            <tr><td colSpan={6} className="asi-table__empty">No hay zonas creadas.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

// ─── Kioscos ───────────────────────────────────────────────────────

const KioscosTab = () => {
  const { kioscos, zonas, createKiosko, updateKiosko, regenerateToken } = useAsistencia();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ nombre: '', attendance_zone_id: '' });

  const handleCreate = async () => {
    if (!form.nombre.trim() || !form.attendance_zone_id) {
      return toast.error('Nombre y zona requeridos');
    }
    const res = await createKiosko(form);
    if (res.success) {
      toast.success('Kiosko creado');
      setShowForm(false);
      setForm({ nombre: '', attendance_zone_id: '' });
    } else {
      toast.error(res.error || 'Error');
    }
  };

  const kioskoUrl = (token) => `${window.location.origin}/kiosko?token=${token}`;

  return (
    <div>
      <div className="asi-toolbar">
        <h3 className="asi-section-title">Kioscos</h3>
        <button className="asi-btn asi-btn--primary" onClick={() => setShowForm(!showForm)}>
          <Plus size={16} /> Nuevo kiosko
        </button>
      </div>

      <p className="asi-hint">
        Un kiosko es el dispositivo (tablet, PC) que muestra la pantalla de marcación.
        Cada kiosko se asocia a UNA zona y obtiene una URL única.
      </p>

      {showForm && (
        <div className="asi-card">
          <div className="asi-form-grid">
            <label>
              Nombre
              <input
                className="asi-input"
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                placeholder="Tablet recepción"
              />
            </label>
            <label>
              Zona
              <select
                className="asi-input"
                value={form.attendance_zone_id}
                onChange={(e) => setForm({ ...form, attendance_zone_id: e.target.value })}
              >
                <option value="">Selecciona zona...</option>
                {zonas.filter((z) => z.activo).map((z) => (
                  <option key={z._id} value={z._id}>{z.nombre}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="asi-form-actions">
            <button className="asi-btn" onClick={() => setShowForm(false)}>Cancelar</button>
            <button className="asi-btn asi-btn--primary" onClick={handleCreate}>Crear kiosko</button>
          </div>
        </div>
      )}

      <table className="asi-table">
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Zona</th>
            <th>URL</th>
            <th>Último ping</th>
            <th>Estado</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {kioscos.map((k) => {
            const zona = zonas.find((z) => z._id === k.attendance_zone_id);
            return (
              <tr key={k._id} className={!k.activo ? 'is-inactive' : ''}>
                <td>{k.nombre}</td>
                <td>{zona?.nombre ?? '—'}</td>
                <td>
                  <button
                    className="asi-btn asi-btn--icon"
                    title="Copiar URL"
                    onClick={() => {
                      navigator.clipboard.writeText(kioskoUrl(k.device_token));
                      toast.success('URL copiada');
                    }}
                  >
                    <Copy size={14} />
                  </button>
                </td>
                <td>{k.ultimo_ping ? new Date(k.ultimo_ping).toLocaleString() : '—'}</td>
                <td>{k.activo ? <span className="asi-badge asi-badge--success">activo</span> : <span className="asi-badge">inactivo</span>}</td>
                <td>
                  <button
                    className="asi-btn asi-btn--icon"
                    title="Regenerar token"
                    onClick={async () => {
                      if (!confirm('Regenerar URL? El dispositivo actual deja de funcionar.')) return;
                      const r = await regenerateToken({ id: k._id });
                      if (r.success) toast.success('Token regenerado');
                      else toast.error(r.error || 'Error');
                    }}
                  >
                    <RefreshCw size={14} />
                  </button>
                  <button
                    className="asi-btn asi-btn--icon"
                    onClick={async () => {
                      const r = await updateKiosko({ id: k._id, activo: !k.activo });
                      if (r.success) toast.success(k.activo ? 'Desactivado' : 'Activado');
                      else toast.error(r.error || 'Error');
                    }}
                  >
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            );
          })}
          {kioscos.length === 0 && (
            <tr><td colSpan={6} className="asi-table__empty">No hay kioscos creados.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

// ─── Marcaciones ───────────────────────────────────────────────────

const MarcacionesTab = () => {
  const today = new Date().toISOString().slice(0, 10);
  const [fecha, setFecha] = useState(today);
  const [editJornada, setEditJornada] = useState(null);
  const jornadas = useQuery(api.asistencia.jornadas.list, { fecha_desde: fecha, fecha_hasta: fecha });
  const intentos = useQuery(api.asistencia.jornadas.listIntentos, { limit: 50 });
  const { employees } = usePersonnel();
  const { eliminarJornada } = useAsistencia();

  const empName = (id) => {
    const e = employees?.find((x) => x._id === id);
    return e ? `${e.nombre} ${e.apellido}` : id;
  };
  const fmtTime = (ts) => ts
    ? new Date(ts).toLocaleTimeString('es-PA', { hour: '2-digit', minute: '2-digit' })
    : '—';

  const handleDelete = async (j) => {
    if (!confirm(`¿Eliminar la jornada de ${empName(j.empleado_id)} del ${j.fecha}? Esta acción no se puede deshacer.`)) return;
    const r = await eliminarJornada({ jornada_id: j._id });
    if (r.success) toast.success('Jornada eliminada');
    else toast.error(r.error || 'Error');
  };

  return (
    <div>
      <div className="asi-toolbar">
        <h3 className="asi-section-title">Marcaciones del día</h3>
        <input
          type="date"
          value={fecha}
          onChange={(e) => setFecha(e.target.value)}
          className="asi-input asi-input--inline"
        />
      </div>

      <h4 className="asi-subsection-title">Jornadas</h4>
      <table className="asi-table">
        <thead>
          <tr>
            <th>Empleado</th>
            <th>Entrada</th>
            <th>Salida almuerzo</th>
            <th>Regreso almuerzo</th>
            <th>Salida</th>
            <th>Estado</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {(jornadas ?? []).map((j) => (
            <tr key={j._id}>
              <td>{empName(j.empleado_id)}</td>
              <td>{fmtTime(j.entrada_timestamp)}</td>
              <td>{fmtTime(j.salida_almuerzo_timestamp)}</td>
              <td>{fmtTime(j.regreso_almuerzo_timestamp)}</td>
              <td>{fmtTime(j.salida_timestamp)}</td>
              <td><span className={`asi-badge asi-badge--${j.estado}`}>{j.estado}</span></td>
              <td>
                <button className="asi-btn asi-btn--icon" title="Editar marcaciones" onClick={() => setEditJornada(j)}>
                  <Clock size={14} />
                </button>
                <button className="asi-btn asi-btn--icon" title="Eliminar jornada" onClick={() => handleDelete(j)}>
                  <Trash2 size={14} />
                </button>
              </td>
            </tr>
          ))}
          {jornadas && jornadas.length === 0 && (
            <tr><td colSpan={7} className="asi-table__empty">Sin marcaciones para esta fecha.</td></tr>
          )}
        </tbody>
      </table>

      {editJornada && (
        <EditarJornadaModal
          jornada={editJornada}
          empName={empName(editJornada.empleado_id)}
          onClose={() => setEditJornada(null)}
        />
      )}

      <h4 className="asi-subsection-title">Intentos recientes (incluye fallidos)</h4>
      <table className="asi-table asi-table--compact">
        <thead>
          <tr>
            <th>Cuándo</th>
            <th>Empleado</th>
            <th>Tipo</th>
            <th>Resultado</th>
            <th>Detalle</th>
          </tr>
        </thead>
        <tbody>
          {(intentos ?? []).map((i) => (
            <tr key={i._id} className={i.resultado !== 'ok' ? 'is-fail' : ''}>
              <td>{new Date(i.timestamp).toLocaleString()}</td>
              <td>{i.empleado_id ? empName(i.empleado_id) : i.cedula_intentada}</td>
              <td>{i.tipo_marca_intentada ?? '—'}</td>
              <td><span className={`asi-badge asi-badge--${i.resultado === 'ok' ? 'success' : 'error'}`}>{i.resultado}</span></td>
              <td>{i.detalle ?? '—'}</td>
            </tr>
          ))}
          {intentos && intentos.length === 0 && (
            <tr><td colSpan={5} className="asi-table__empty">Sin intentos registrados.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

// ─── Modal edición de jornada (corrección manual admin) ────────────

const MARCAS_EDIT = [
  { key: 'entrada', label: 'Entrada' },
  { key: 'salida_almuerzo', label: 'Salida almuerzo' },
  { key: 'regreso_almuerzo', label: 'Regreso almuerzo' },
  { key: 'salida', label: 'Salida' },
];

// ms epoch → "HH:MM" en TZ Panamá (pa' pre-llenar inputs time)
const tsToTime = (ts) => {
  if (!ts) return '';
  return new Date(ts).toLocaleTimeString('en-GB', {
    timeZone: 'America/Panama', hour: '2-digit', minute: '2-digit', hour12: false,
  });
};

// "HH:MM" + fecha YYYY-MM-DD → ms epoch (TZ Panamá UTC-5, sin DST)
const timeToTs = (fecha, time) => {
  if (!time) return null;
  const iso = `${fecha}T${time}:00-05:00`;
  const ms = new Date(iso).getTime();
  return Number.isNaN(ms) ? null : ms;
};

const EditarJornadaModal = ({ jornada, empName, onClose }) => {
  const { editarJornada } = useAsistencia();
  const [times, setTimes] = useState(() =>
    Object.fromEntries(MARCAS_EDIT.map((m) => [m.key, tsToTime(jornada[`${m.key}_timestamp`])])),
  );
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    const args = { jornada_id: jornada._id };
    for (const m of MARCAS_EDIT) {
      args[`${m.key}_timestamp`] = timeToTs(jornada.fecha, times[m.key]); // null si vacío = borrar
    }
    const r = await editarJornada(args);
    setSaving(false);
    if (r.success) {
      toast.success('Marcaciones actualizadas');
      onClose();
    } else {
      toast.error(r.error || 'Error');
    }
  };

  return (
    <div className="asi-modal" onClick={onClose}>
      <div className="asi-modal__panel" onClick={(e) => e.stopPropagation()}>
        <h3>Editar marcaciones</h3>
        <p className="asi-emp-detail__meta">{empName} · {jornada.fecha}</p>
        <p className="asi-hint">
          Vacío = borra esa marca. Las correcciones se registran como
          <strong> manual_admin</strong> en el log de auditoría.
        </p>
        <div className="asi-form-grid">
          {MARCAS_EDIT.map((m) => (
            <label key={m.key}>
              {m.label}
              <input
                type="time"
                className="asi-input"
                value={times[m.key]}
                onChange={(e) => setTimes((t) => ({ ...t, [m.key]: e.target.value }))}
              />
            </label>
          ))}
        </div>
        <div className="asi-form-actions">
          <button className="asi-btn" onClick={onClose} disabled={saving}>Cancelar</button>
          <button className="asi-btn asi-btn--primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AsistenciaComponent;
