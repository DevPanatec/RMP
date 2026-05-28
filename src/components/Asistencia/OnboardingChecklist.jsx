import { useMemo, useState } from 'react';
import { useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { useAsistencia } from '../../context/AsistenciaContext';
import { useOrganization } from '../../context/OrganizationContext';
import { usePersonnel } from '../../context/PersonnelContext';
import { Check, ChevronDown, ChevronUp, Sparkles } from '../Icons';
import toast from 'react-hot-toast';
import './OnboardingChecklist.css';

const OnboardingChecklist = ({ onGoToTab }) => {
  const { plantillas, zonas, kioscos } = useAsistencia();
  const { employees } = usePersonnel();
  const { currentOrgId } = useOrganization();
  const [collapsed, setCollapsed] = useState(false);
  const [creating, setCreating] = useState(false);
  const crearDefault = useMutation(api.asistencia.horarios.crearTurnosDefault);

  const empleadosConPin = (employees ?? []).filter((e) => e.tiene_pin).length;
  const empleadosConFacial = (employees ?? []).filter((e) => e.tiene_facial).length;
  const totalEmp = (employees ?? []).length;

  const steps = useMemo(
    () => [
      {
        id: 'turnos',
        label: 'Crear turnos estándar',
        done: plantillas.length > 0,
        action: plantillas.length === 0
          ? {
              label: 'Crear 4 turnos',
              onClick: async () => {
                setCreating(true);
                try {
                  // v.optional() de Convex acepta undefined, no null. Si super_admin
                  // sin org seleccionada → omitimos arg; backend cae a scope.organizacionId.
                  const args = currentOrgId
                    ? { organizacion_id: currentOrgId }
                    : {};
                  const r = await crearDefault(args);
                  toast.success(`${r.created_count} turnos creados`);
                } catch (e) {
                  toast.error(e.message || 'Error');
                } finally {
                  setCreating(false);
                }
              },
            }
          : { label: 'Ver turnos', onClick: () => onGoToTab('horarios') },
        hint: 'Define los horarios de la empresa (Mañana, Tarde, Noche, Oficina).',
      },
      {
        id: 'zonas',
        label: 'Configurar zona de marcación',
        done: zonas.length > 0,
        action: {
          label: zonas.length === 0 ? 'Crear zona' : 'Ver zonas',
          onClick: () => onGoToTab('zonas'),
        },
        hint: 'El sitio físico donde el personal marca asistencia (oficina, sucursal).',
      },
      {
        id: 'kioscos',
        label: 'Provisionar kiosko',
        done: kioscos.length > 0,
        action: {
          label: kioscos.length === 0 ? 'Crear kiosko' : 'Ver kioscos',
          onClick: () => onGoToTab('kioscos'),
        },
        hint: 'El dispositivo (tablet/PC) donde el personal escanea su cara o PIN.',
      },
      {
        id: 'pin',
        label: `Asignar PIN al personal (${empleadosConPin}/${totalEmp})`,
        done: totalEmp > 0 && empleadosConPin === totalEmp,
        action: { label: 'Configurar', onClick: () => onGoToTab('empleados') },
        hint: 'PIN de 4 dígitos como respaldo si el reconocimiento facial falla.',
      },
      {
        id: 'facial',
        label: `Registrar rostros (${empleadosConFacial}/${totalEmp})`,
        done: totalEmp > 0 && empleadosConFacial === totalEmp,
        action: { label: 'Registrar', onClick: () => onGoToTab('empleados') },
        hint: 'Para que el kiosko los reconozca automáticamente.',
      },
    ],
    [plantillas, zonas, kioscos, employees, empleadosConPin, empleadosConFacial, totalEmp, crearDefault, currentOrgId, onGoToTab],
  );

  const doneCount = steps.filter((s) => s.done).length;
  const allDone = doneCount === steps.length;

  // No mostrar si todo listo
  if (allDone) return null;

  return (
    <div className="onb-card">
      <button className="onb-header" onClick={() => setCollapsed(!collapsed)}>
        <div className="onb-header__title">
          <Sparkles size={18} strokeWidth={1.5} />
          <strong>Configura tu asistencia</strong>
          <span className="onb-progress">{doneCount} / {steps.length}</span>
        </div>
        {collapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
      </button>

      {!collapsed && (
        <ul className="onb-list">
          {steps.map((s) => (
            <li key={s.id} className={`onb-item ${s.done ? 'is-done' : ''}`}>
              <div className="onb-item__check">
                {s.done ? <Check size={14} /> : <span className="onb-dot" />}
              </div>
              <div className="onb-item__body">
                <strong>{s.label}</strong>
                {!s.done && <p>{s.hint}</p>}
              </div>
              {!s.done && s.action && (
                <button
                  className="onb-btn"
                  onClick={s.action.onClick}
                  disabled={creating}
                >
                  {s.action.label}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default OnboardingChecklist;
