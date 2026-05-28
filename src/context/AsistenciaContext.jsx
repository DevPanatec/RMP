import { createContext, useContext, useMemo } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useOrganization } from './OrganizationContext';

const AsistenciaContext = createContext();

export const AsistenciaProvider = ({ children }) => {
  const { currentOrgId } = useOrganization();
  const plantillasData = useQuery(api.asistencia.horarios.listPlantillas);
  const zonasData = useQuery(api.asistencia.zonas.list, {});
  const kioscosData = useQuery(api.asistencia.kioscos.list, {});

  const createPlantillaMut = useMutation(api.asistencia.horarios.createPlantilla);
  const updatePlantillaMut = useMutation(api.asistencia.horarios.updatePlantilla);
  const deactivatePlantillaMut = useMutation(api.asistencia.horarios.deactivatePlantilla);
  const asignarHorarioMut = useMutation(api.asistencia.horarios.asignarHorario);

  const createZonaMut = useMutation(api.asistencia.zonas.create);
  const updateZonaMut = useMutation(api.asistencia.zonas.update);
  const removeZonaMut = useMutation(api.asistencia.zonas.remove);
  const asignarZonaMut = useMutation(api.asistencia.zonas.asignarZona);
  const cerrarAsignacionZonaMut = useMutation(api.asistencia.zonas.cerrarAsignacionZona);

  const createKioskoMut = useMutation(api.asistencia.kioscos.create);
  const updateKioskoMut = useMutation(api.asistencia.kioscos.update);
  const regenerateTokenMut = useMutation(api.asistencia.kioscos.regenerateToken);

  const setPinMut = useMutation(api.asistencia.pin.setPin);
  const clearLockoutMut = useMutation(api.asistencia.pin.clearLockout);

  const clearFacialMut = useMutation(api.asistencia.facial.clearFacial);

  const editarJornadaMut = useMutation(api.asistencia.jornadas.editarJornada);
  const eliminarJornadaMut = useMutation(api.asistencia.jornadas.eliminarJornada);

  // Fase 3 — Permisos
  const createPermisoMut = useMutation(api.asistencia.permisos.create);
  const aprobarPermisoMut = useMutation(api.asistencia.permisos.aprobar);
  const rechazarPermisoMut = useMutation(api.asistencia.permisos.rechazar);
  const removePermisoMut = useMutation(api.asistencia.permisos.remove);
  // Horas extras
  const createHoraExtraMut = useMutation(api.asistencia.horasExtras.create);
  const aprobarHoraExtraMut = useMutation(api.asistencia.horasExtras.aprobar);
  const rechazarHoraExtraMut = useMutation(api.asistencia.horasExtras.rechazar);
  const removeHoraExtraMut = useMutation(api.asistencia.horasExtras.remove);
  // Cambios turno
  const createCambioTurnoMut = useMutation(api.asistencia.cambiosTurno.create);
  const aprobarCambioTurnoMut = useMutation(api.asistencia.cambiosTurno.aprobar);
  const rechazarCambioTurnoMut = useMutation(api.asistencia.cambiosTurno.rechazar);
  const removeCambioTurnoMut = useMutation(api.asistencia.cambiosTurno.remove);

  const plantillas = plantillasData || [];
  const zonas = zonasData || [];
  const kioscos = kioscosData || [];
  const loading =
    plantillasData === undefined || zonasData === undefined || kioscosData === undefined;

  const wrap = (mut) => async (args) => {
    try {
      const result = await mut(args);
      return { success: true, data: result };
    } catch (e) {
      return { success: false, error: e.message };
    }
  };

  // Wrap que inyecta organizacion_id si no viene (super_admin con org seleccionada).
  // Admins de org no necesitan esto (server usa scope.organizacionId), pero no rompe.
  const wrapWithOrg = (mut) => async (args) => {
    try {
      // v.optional(v.id(...)) acepta undefined, NO null. Si currentOrgId es null
      // (super_admin sin org elegida), omitimos arg y backend cae a scope.organizacionId.
      const merged = args?.organizacion_id
        ? args
        : currentOrgId
          ? { ...args, organizacion_id: currentOrgId }
          : args;
      const result = await mut(merged);
      return { success: true, data: result };
    } catch (e) {
      return { success: false, error: e.message };
    }
  };

  const value = useMemo(
    () => ({
      plantillas,
      zonas,
      kioscos,
      loading,
      // Horarios
      createPlantilla: wrapWithOrg(createPlantillaMut),
      updatePlantilla: wrap(updatePlantillaMut),
      deactivatePlantilla: wrap(deactivatePlantillaMut),
      asignarHorario: wrap(asignarHorarioMut),
      // Zonas
      createZona: wrapWithOrg(createZonaMut),
      updateZona: wrap(updateZonaMut),
      removeZona: wrap(removeZonaMut),
      asignarZona: wrap(asignarZonaMut),
      cerrarAsignacionZona: wrap(cerrarAsignacionZonaMut),
      // Kioscos
      createKiosko: wrap(createKioskoMut),
      updateKiosko: wrap(updateKioskoMut),
      regenerateToken: wrap(regenerateTokenMut),
      // PIN
      setPin: wrap(setPinMut),
      clearLockout: wrap(clearLockoutMut),
      // Facial
      clearFacial: wrap(clearFacialMut),
      // Marcaciones (edición admin)
      editarJornada: wrap(editarJornadaMut),
      eliminarJornada: wrap(eliminarJornadaMut),
      // Permisos
      createPermiso: wrap(createPermisoMut),
      aprobarPermiso: wrap(aprobarPermisoMut),
      rechazarPermiso: wrap(rechazarPermisoMut),
      removePermiso: wrap(removePermisoMut),
      // Horas extras
      createHoraExtra: wrap(createHoraExtraMut),
      aprobarHoraExtra: wrap(aprobarHoraExtraMut),
      rechazarHoraExtra: wrap(rechazarHoraExtraMut),
      removeHoraExtra: wrap(removeHoraExtraMut),
      // Cambios turno
      createCambioTurno: wrap(createCambioTurnoMut),
      aprobarCambioTurno: wrap(aprobarCambioTurnoMut),
      rechazarCambioTurno: wrap(rechazarCambioTurnoMut),
      removeCambioTurno: wrap(removeCambioTurnoMut),
    }),
    [plantillas, zonas, kioscos, loading, currentOrgId],
  );

  return <AsistenciaContext.Provider value={value}>{children}</AsistenciaContext.Provider>;
};

export const useAsistencia = () => {
  const ctx = useContext(AsistenciaContext);
  if (!ctx) throw new Error('useAsistencia must be used within AsistenciaProvider');
  return ctx;
};

export default AsistenciaContext;
