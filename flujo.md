SISTEMA RMP — FLUJO FUNCIONAL COMPLETO (Versión Final 2025)
1) Principios del sistema

Roles:

Admin: Control total. Crea, edita, elimina, asigna, resuelve riesgos y administra todos los módulos.

Enterprise: Solo lectura. Ve información de su organización.

Conductor: Ejecución operativa. Cumple rutas, genera reportes y riesgos.

Ejes funcionales:
Conductores, Flota, Rutas, Asignaciones, Limpieza, Fumigación, Calendario, Reportes, Riesgos, Inventario, (Costos TBD), (Mantenimiento TBD).

Estados estándar:

Entidad	Estados
Asignación	planificada → en_progreso → completada (o cancelada)
Parada	pendiente → hecha o no_recogida (con motivo)
Riesgo	abierto → resuelto (solo Admin)
Reporte de recolección	generado al finalizar una ruta
Fumigación	programada → realizada → reportada
2) Flujo — Admin
2.1 Acceso y navegación

Ingreso (Auth) → Redirige a Panel de Administración si rol=admin.

Barra lateral real (según diseño actual):

📊 Monitoreo
⚙️ Operaciones
   ├── Personal
   ├── Flota
   ├── Rutas
   ├── Asignación
        ├── Rutas de Seguimiento
        ├── Asignaciones de Limpieza
        └── Asignaciones de Fumigación ← NUEVO
📅 Calendario
🔧 Mantenimiento
🚨 Riesgos
📦 Inventario
💲 Costos
📁 Reportes
     ├── Recolección
     ├── Limpieza
     └── Fumigación ← NUEVO

2.2 Personal (Conductores)

Ver lista de conductores (filtros: activo/inactivo, búsqueda por nombre).

Crear / editar / eliminar conductor.

Resultado: conductor disponible de inmediato para asignaciones.

2.3 Flota (Vehículos)

Ver lista de vehículos (filtros: tipo, estado).

Crear / editar / eliminar vehículo.

Vincular vehículo a conductor.

Regla: no dar de baja si tiene asignaciones activas o futuras.

2.4 Rutas

Listado de rutas (búsqueda, estado).

Crear nueva ruta: nombre, tipo (recolección), paradas ordenadas, notas.

Resultado: ruta aparece en listado y queda disponible para Asignaciones.
⚠️ Las fumigaciones ya no se crean desde aquí.

2.5 Operaciones — Asignación

Vista general:

“Asignaciones Unificadas — Gestiona todas las asignaciones de rutas, limpieza y fumigación en un solo lugar.”

Botones superiores:

[ Nueva Ruta de Seguimiento ]

[ Nueva Asignación de Limpieza ]

[ Nueva Fumigación ] ← NUEVO

Pestañas:

[ Rutas de Seguimiento ]   [ Asignaciones de Limpieza ]   [ Asignaciones de Fumigación ]

a) Rutas de Seguimiento

Crear asignación: ruta + fecha/turno + conductor + vehículo.

Validaciones: evitar duplicar conductor/vehículo en el mismo turno.

Estado inicial: planificada.

Efecto: visible en Calendario y Mi ruta del conductor.

Al finalizar, genera Reporte de Recolección en Admin → Reportes.

b) Asignaciones de Limpieza

Crear tarea de limpieza: ubicación, fecha, observaciones, imágenes.

Al guardar, se genera Reporte Limpieza en Reportes → Limpieza.

Vista tipo grid de lugares con miniaturas.

c) NUEVA — Asignaciones de Fumigación

Objetivo: registrar y controlar fumigaciones internas y externas en cada ubicación, con evidencia y frecuencia establecida.

📋 Formulario de creación

Campo	Tipo	Obligatorio
Tipo de fumigación	Selector (“Interna” / “Externa”)	✅
Ubicación	Selector de lugares	✅
Fecha	Date picker	✅
Imágenes	Upload múltiple	✅
Observaciones	Texto	⚪

⚙️ Validaciones

No duplicar tipo + lugar + fecha.

Mínimo 1 imagen obligatoria.

🔁 Flujo

Crear.

Subir evidencias → Estado: realizada.

Guardar → Estado: reportada.

🧩 Resultado

Se genera automáticamente un Reporte de Fumigación visible en:
Reportes → Fumigación, agrupado por lugar con miniaturas.

Fumigaciones internas: 1 vez al mes.

Fumigaciones externas: 3 veces por semana.

🧠 Preset automático (nuevo comportamiento)
Al crear una nueva fumigación, el sistema muestra un selector simple:

Tipo de fumigación:
🔘 Interna (Mensual)
🔘 Externa (Semanal)

Cuando se selecciona una opción:

Tipo elegido	Se configura automáticamente
Interna (Mensual)	• Frecuencia = 1 vez por mes
* Horario = 7:00 p.m. – 11:00 p.m.
* Límite: 1 registro por ubicación al mes
Externa (Semanal)	• Frecuencia = 3 veces por semana
* Horario = 7:00 p.m. – 11:00 p.m.
* Límite: 3 registros por semana por ubicación

El campo de horario no se edita manualmente (preset fijo).
Solo se eligen:

📍 Ubicación

📅 Fecha

🧴 Productos utilizados

📸 Evidencias

📝 Observaciones (opcional)

Resultado:
El sistema genera automáticamente el reporte con los parámetros correctos, asegurando cumplimiento del horario y frecuencia operativa.

2.6 Calendario

Vista mensual/semanal con colores por estado (planificada, en_progreso, completada).

Clic en evento → ver detalle, reprogramar o cancelar.

Sincronización bidireccional con “Mi ruta” del conductor.

Fumigaciones visibles como eventos informativos nocturnos.

2.7 Reportes (ACTUALIZADO)

Subsecciones:

[ Recolección ]   [ Limpieza ]   [ Fumigación ]

🧭 Vista principal de Reportes

Controles globales:

Rango de fechas: “Desde” – “Hasta”

Filtro de módulos (multi-selección):

✅ Recolección

✅ Limpieza

✅ Fumigación

Botón: [ Descargar selección ]

Descarga los reportes combinados según el rango y los módulos seleccionados.

Formato de exportación: TBD (pendiente de definir).

Requiere al menos un módulo seleccionado.

Permisos: Admin y Enterprise pueden descargar; Conductor no.

a) Recolección

Filtros: fecha, ruta, conductor.

Botón: [ Descargar Recolección ]

Permite elegir rango de fechas y exportar solo Recolección.

Formato TBD.

Contenido: totales por ruta, cargas (alta/media/baja), paradas hechas/no recogidas, evidencias.

b) Limpieza

Vista grid por lugar.

Botón: [ Descargar Limpieza ]

Permite elegir rango de fechas y exportar solo Limpieza.

Formato TBD.

Contenido: ubicaciones atendidas, fechas, observaciones, imágenes.

c) Fumigación

Vista grid por lugar (interna/externa).

Botón: [ Descargar Fumigación ]

Permite elegir rango de fechas y exportar solo Fumigación.

Formato TBD.

Contenido: tipo, fechas, productos, evidencias, cumplimiento de frecuencia.

🔒 Comportamiento común

Admin: descarga completa.

Enterprise: descarga filtrada por su organización.

Validación de rango de fechas (Desde ≤ Hasta).

Si no hay datos en el rango, mensaje: “No hay reportes en el periodo seleccionado.”

2.8 Riesgos

Bandeja con todos los riesgos reportados.

Filtros: estado, tipo, severidad.

Solo Admin puede resolver riesgos internos.

Acción: “Resolver riesgo” → agrega comentario → estado resuelto.

Todos los cambios quedan trazados.

2.9 Inventario

Lista de insumos, herramientas y stock mínimo.

Movimientos: entrada, salida o ajuste.

Alertas automáticas cuando stock < mínimo.

Posible vínculo con tareas por consumo de material.

2.10 Costos (TBD con jefe)

Pendiente definir estructura y KPIs.
Objetivo: reflejar costos operativos y de mantenimiento.

2.11 Mantenimiento (TBD con jefe)

Mantiene el flujo actual.
Pendiente definir alcance y conexión con la flota.

3) Flujo — Conductor

(sin cambios; versión funcional final)

4) Flujo — Enterprise

(solo lectura, sin cambios; no puede resolver riesgos ni editar registros)

5–8) Notificaciones, Validaciones, KPIs y DoD

(sin cambios; coherentes con el nuevo módulo de fumigación y reportes)