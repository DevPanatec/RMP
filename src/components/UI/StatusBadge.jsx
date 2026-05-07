import { Badge } from './Badge';
import {
  CheckCircle, Clock, AlertTriangle, Wrench, Truck,
  Pause, XCircle, Play, Calendar
} from '../Icons';

/**
 * StatusBadge — comunica estado con ícono + color.
 * Uso: <StatusBadge status="en_ruta" />
 *
 * Mapea estados comunes de vehículo, ruta, asignación, mantenimiento, fumigación.
 * Acepta cualquier string; si no está mapeado, cae a un default neutro.
 */
const STATUS_MAP = {
  // Vehículos
  disponible:        { variant: 'success', icon: CheckCircle, label: 'Disponible' },
  en_ruta:           { variant: 'info',    icon: Truck,       label: 'En ruta' },
  'En ruta':         { variant: 'info',    icon: Truck,       label: 'En ruta' },
  en_mantenimiento:  { variant: 'warning', icon: Wrench,      label: 'En mantenimiento' },
  inactivo:          { variant: 'default', icon: XCircle,     label: 'Inactivo' },
  activo:            { variant: 'success', icon: CheckCircle, label: 'Activo' },

  // Rutas / asignaciones
  programada:        { variant: 'default', icon: Calendar,    label: 'Programada' },
  asignada:          { variant: 'info',    icon: Calendar,    label: 'Asignada' },
  pendiente:         { variant: 'default', icon: Clock,       label: 'Pendiente' },
  en_progreso:       { variant: 'info',    icon: Play,        label: 'En progreso' },
  en_curso:          { variant: 'info',    icon: Play,        label: 'En curso' },
  completada:        { variant: 'success', icon: CheckCircle, label: 'Completada' },
  cancelada:         { variant: 'error',   icon: XCircle,     label: 'Cancelada' },
  pausada:           { variant: 'warning', icon: Pause,      label: 'Pausada' },

  // Mantenimiento
  realizada:         { variant: 'success', icon: CheckCircle, label: 'Realizada' },
  reportada:         { variant: 'success', icon: CheckCircle, label: 'Reportada' },

  // Severidad / prioridad
  baja:              { variant: 'success', icon: CheckCircle, label: 'Baja' },
  media:             { variant: 'warning', icon: AlertTriangle, label: 'Media' },
  alta:              { variant: 'error',   icon: AlertTriangle, label: 'Alta' },
  urgente:           { variant: 'error',   icon: AlertTriangle, label: 'Urgente' },
  'crítico':         { variant: 'error',   icon: AlertTriangle, label: 'Crítico' },
};

const StatusBadge = ({ status, label, size = 'md', className = '' }) => {
  const cfg = STATUS_MAP[status] || { variant: 'default', icon: Clock, label: label || status };
  const Icon = cfg.icon;
  return (
    <Badge variant={cfg.variant} size={size} icon={<Icon size={12} />} className={className}>
      {label || cfg.label}
    </Badge>
  );
};

export default StatusBadge;
