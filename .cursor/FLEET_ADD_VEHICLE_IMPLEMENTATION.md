# Implementación: Agregar Vehículo con GPS SafeTag

## ✅ Cambios Realizados

### 1. **Backend (Convex)**

#### `convex/schema.ts`
- ✅ Agregado campo `tipo_vehiculo` al schema de `vehiculos`
- ✅ Renombrado tabla `vehicleHistory` → `vehicle_location_history` (fix de índice)

#### `convex/vehiculos.ts`
- ✅ Mutation `add` actualizada para aceptar:
  - `safetagDeviceId` (IMEI del GPS SafeTag)
  - `safetagDeviceName` (nombre descriptivo)
  - `tipoServicio` (camelCase del frontend)
  - `tipoVehiculo` (tipo específico: bus, barredora, pickup, etc.)
  - `año` (con ñ, como envía el frontend)
- ✅ Normalización automática de campos (camelCase → snake_case)
- ✅ Mapeo correcto: `safetagDeviceId` → `gps_imei` y `safetag_device_id`

### 2. **Frontend**

#### `src/components/Fleet/FleetManagement.jsx`
- ✅ Modal de agregar vehículo con campos completos:
  - Nombre, Placa, Marca, Modelo, Año
  - Tipo de Servicio (limpieza, recolección, fumigación)
  - Tipo de Vehículo (dinámico según servicio)
  - **Configuración GPS SafeTag** (IMEI + nombre)
- ✅ Validación IMEI en tiempo real:
  - Solo acepta números
  - Máximo 15 dígitos
  - Indicador visual de validez (badge verde/naranja)
- ✅ Manejo de errores robusto:
  - Estado de carga (`isSubmitting`)
  - Mensajes de error visibles
  - Feedback visual (botón deshabilitado, texto "⏳ Agregando...")
- ✅ Auto-limpieza de errores al editar
- ✅ Logs detallados para debugging

#### `src/components/Fleet/FleetManagement.css`
- ✅ Estilos para mensaje de error
- ✅ Estilos para badges de validación (válido/inválido)
- ✅ Estado deshabilitado de botones
- ✅ Input warning (borde naranja si IMEI incompleto)

### 3. **Context Layer**

#### `src/context/FleetContext.jsx`
- ✅ Ya estaba correcto, solo usa `addVehicleMutation` sin modificaciones

## 🎯 Flujo Completo

1. **Usuario abre modal** → Click en "Agregar Vehículo"
2. **Llena formulario**:
   - Campos obligatorios: nombre, placa, marca, modelo, año, tipo servicio, tipo vehículo
   - Campos opcionales: IMEI GPS SafeTag, nombre GPS
3. **Validación en tiempo real**:
   - IMEI: solo números, 15 dígitos
   - Badge verde si válido, naranja si incompleto
4. **Submit**:
   - Botón muestra "⏳ Agregando..."
   - `FleetContext.addVehicle()` → `addVehicleMutation(formData)`
   - Backend normaliza campos (camelCase → snake_case)
   - Inserta en DB con todos los campos mapeados correctamente
5. **Resultado**:
   - ✅ Éxito: Modal se cierra, formulario se limpia, vehículo aparece en lista
   - ❌ Error: Mensaje visible en modal, botón re-habilitado

## 🔧 Campos Mapeados (Frontend → Backend)

```javascript
// Frontend (formData)
{
  nombre: "Bus Limpieza 1",
  placa: "ABC-123",
  marca: "Mercedes",
  modelo: "Sprinter",
  año: 2024,
  tipoServicio: "limpieza",
  tipoVehiculo: "bus",
  safetagDeviceId: "357956371545858",
  safetagDeviceName: "GPS Principal"
}

// Backend (Convex DB - vehiculos)
{
  nombre: "Bus Limpieza 1",
  placa: "ABC-123",
  marca: "Mercedes",
  modelo: "Sprinter",
  anio: 2024,
  tipo_servicio: "limpieza",
  tipo_vehiculo: "bus",
  safetag_device_id: "357956371545858",
  safetag_device_name: "GPS Principal",
  gps_imei: "357956371545858", // Duplicado para compatibilidad
  estado: "disponible",
  kilometraje: 0,
  gps_conectado: false,
  gps_en_linea: false
}
```

## 🧪 Testing

### Caso 1: Vehículo SIN GPS
```javascript
{
  nombre: "Bus Test",
  placa: "TEST-001",
  marca: "Ford",
  modelo: "Transit",
  año: 2024,
  tipoServicio: "limpieza",
  tipoVehiculo: "bus"
  // NO se llena safetagDeviceId
}
// Resultado: Vehículo creado, sin campos GPS
```

### Caso 2: Vehículo CON GPS
```javascript
{
  nombre: "Bus GPS",
  placa: "GPS-001",
  marca: "Mercedes",
  modelo: "Sprinter",
  año: 2024,
  tipoServicio: "limpieza",
  tipoVehiculo: "bus",
  safetagDeviceId: "357956371545858",
  safetagDeviceName: "GPS Principal"
}
// Resultado: Vehículo creado con GPS configurado
// Aparece botón "Ver Historial GPS" en la card
```

### Caso 3: IMEI Inválido
```javascript
{
  safetagDeviceId: "12345" // Solo 5 dígitos
}
// Resultado: 
// - Badge naranja muestra "5/15 dígitos"
// - Input con borde naranja
// - Submit permitido (campo opcional)
```

## 📝 Notas Importantes

1. **IMEI es opcional**: Si no se llena, el vehículo se crea sin GPS
2. **Validación de longitud**: IMEI debe tener exactamente 15 dígitos (estándar internacional)
3. **Tipos de vehículo dinámicos**: Cambian según el tipo de servicio seleccionado
4. **Normalización automática**: Backend maneja conversión camelCase ↔ snake_case
5. **Compatibilidad**: Código acepta tanto camelCase (frontend) como snake_case (legacy)

## 🚀 Próximos Pasos Sugeridos

- [ ] Agregar botón "Editar" en vehicle cards
- [ ] Validar que IMEI no esté duplicado antes de crear
- [ ] Agregar campo "Proyecto Asignado" en el modal
- [ ] Implementar búsqueda/filtro por placa en la lista
- [ ] Agregar foto del vehículo (upload)

## 🐛 Debugging

Si algo falla, revisar:

1. **Console logs**:
   - `🚗 Enviando datos del vehículo:` (al hacer submit)
   - `✅ Vehículo agregado exitosamente` (al completar)
   - `❌ Error adding vehicle:` (si falla)

2. **Convex Dev**:
   - Verificar que `npx convex dev` esté corriendo
   - Revisar logs del backend en la terminal

3. **Schema**:
   - Confirmar que `tipo_vehiculo` existe en el schema
   - Verificar que `vehicle_location_history` esté definido

4. **Network**:
   - Abrir DevTools → Network → filtrar "convex"
   - Ver request/response del mutation `vehiculos/add`
