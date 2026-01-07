# 🧪 TEST: Agregar Vehículo con GPS

## Pre-requisitos
- ✅ Convex dev corriendo: `npx convex dev`
- ✅ App corriendo: `npm run dev` (puerto 8000)
- ✅ Schema actualizado con `tipo_vehiculo` y `vehicle_location_history`

## Test 1: Vehículo Básico (sin GPS)

**Pasos:**
1. Ir a Dashboard Admin → Tab "Operaciones" → Sección "Flota"
2. Click en "Agregar Vehículo"
3. Llenar:
   - Nombre: `Bus Test 1`
   - Placa: `TEST-001`
   - Marca: `Ford`
   - Modelo: `Transit`
   - Año: `2024`
   - Tipo Servicio: `Limpieza`
   - Tipo Vehículo: `🚌 Bus` (debería ser seleccionado automáticamente)
   - **NO llenar IMEI ni nombre GPS**
4. Click "✅ Agregar Vehículo"

**Resultado Esperado:**
- Modal se cierra
- Vehículo aparece en la lista con badge "🧹 Limpieza" y "🚌 Bus"
- Card muestra "Sin GPS configurado" (NO aparece botón de historial GPS)
- Console log: `✅ Vehículo agregado exitosamente`

## Test 2: Vehículo con GPS SafeTag

**Pasos:**
1. Click en "Agregar Vehículo"
2. Llenar:
   - Nombre: `Bus GPS Principal`
   - Placa: `GPS-001`
   - Marca: `Mercedes`
   - Modelo: `Sprinter`
   - Año: `2024`
   - Tipo Servicio: `Limpieza`
   - Tipo Vehículo: `🚌 Bus`
   - **IMEI**: `357956371545858` (15 dígitos)
   - **Nombre GPS**: `GPS Principal`
3. Observar mientras escribes el IMEI:
   - Con menos de 15 dígitos → Badge naranja "X/15 dígitos"
   - Con 15 dígitos → Badge verde "✓ Válido"
4. Click "✅ Agregar Vehículo"

**Resultado Esperado:**
- Modal se cierra
- Vehículo aparece con badges "🧹 Limpieza" y "🚌 Bus"
- Card muestra:
  - ✅ Botón "Ver Historial GPS" (con ícono Play)
  - ✅ Indicador GPS (ícono satélite)
- Console log: `✅ Vehículo agregado exitosamente`
- En Convex DB:
  ```javascript
  {
    safetag_device_id: "357956371545858",
    safetag_device_name: "GPS Principal",
    gps_imei: "357956371545858",
    gps_conectado: false,
    gps_en_linea: false
  }
  ```

## Test 3: Cambio Dinámico de Tipo de Vehículo

**Pasos:**
1. Abrir modal "Agregar Vehículo"
2. Tipo Servicio: Seleccionar `Recolección`
3. Verificar que Tipo Vehículo cambie a `🚛 Camión Compactador`
4. Cambiar Tipo Servicio a `Fumigación`
5. Verificar que Tipo Vehículo cambie a `🦟 Fumigadora`

**Resultado Esperado:**
- Dropdown de "Tipo Vehículo" se actualiza dinámicamente
- Opciones cambian según el servicio:
  - Limpieza → Bus, Barredora, Pickup, Cisterna, Camión Carga
  - Recolección → Compactador, Camión Recolector
  - Fumigación → Fumigadora, Atomizador

## Test 4: Validación IMEI

**Pasos:**
1. Abrir modal
2. En campo IMEI, escribir: `abc123`
3. Observar que solo acepta números: campo muestra `123`
4. Escribir `12345678901234567890` (20 dígitos)
5. Observar que corta a 15: `123456789012345`

**Resultado Esperado:**
- IMEI solo acepta números (0-9)
- Máximo 15 caracteres
- Badge muestra "15/15 dígitos" (verde)

## Test 5: Error Handling

**Pasos:**
1. Abrir modal
2. Dejar campo "Placa" vacío
3. Intentar hacer submit

**Resultado Esperado:**
- HTML5 validation previene submit
- Tooltip "Please fill out this field"

**Pasos (Error del backend):**
1. Simular error: detener `npx convex dev`
2. Llenar formulario completamente
3. Click "Agregar"

**Resultado Esperado:**
- Botón muestra "⏳ Agregando..." (deshabilitado)
- Mensaje de error aparece en modal: "❌ [error message]"
- Modal NO se cierra
- Botón vuelve a habilitarse
- Console log: `❌ Error adding vehicle:`

## Test 6: Filtros

**Pasos:**
1. Crear varios vehículos:
   - 2 Buses de Limpieza
   - 1 Compactador de Recolección
   - 1 Fumigadora
2. Click en filtro "🧹 Limpieza"
3. Click en sub-filtro "🚌 Buses"

**Resultado Esperado:**
- Solo aparecen los 2 buses de limpieza
- Contador muestra "🚌 Buses (2)"

## 🐛 Si Algo Falla

### Error: "Index vehicle_location_history.by_vehiculo_timestamp not found"
**Causa:** Schema no sincronizado
**Fix:** 
1. Verificar que `npx convex dev` esté corriendo
2. Esperar 10 segundos a que sincronice
3. Refrescar browser

### Error: "Field tipo_vehiculo not found"
**Causa:** Schema no tiene el campo
**Fix:**
1. Abrir `convex/schema.ts`
2. Verificar línea 40: `tipo_vehiculo: v.optional(v.string())`
3. Si no está, agregarlo y esperar sincronización

### Vehículo creado pero no aparece botón GPS
**Causa:** `safetag_device_id` no se guardó
**Fix:**
1. Abrir Convex Dashboard
2. Ver tabla `vehiculos`
3. Buscar el vehículo recién creado
4. Verificar que tenga `safetag_device_id`
5. Si no lo tiene, revisar mutation `add` en `vehiculos.ts`

### Modal no se cierra después de crear vehículo
**Causa:** Error silencioso en la mutación
**Fix:**
1. Abrir DevTools → Console
2. Buscar logs `❌ Error adding vehicle:`
3. Verificar Network → filtrar "convex" → ver response del mutation
4. Revisar Convex logs en terminal

## ✅ Checklist Final

- [ ] Vehículo sin GPS se crea correctamente
- [ ] Vehículo con GPS se crea con `safetag_device_id`
- [ ] Validación IMEI funciona (solo números, 15 dígitos, badge visual)
- [ ] Tipos de vehículo cambian dinámicamente según servicio
- [ ] Errores se muestran en el modal
- [ ] Loading state funciona (botón deshabilitado)
- [ ] Modal se cierra al crear exitosamente
- [ ] Formulario se limpia después de crear
- [ ] Filtros funcionan correctamente
- [ ] Vehículos con GPS muestran botón "Ver Historial GPS"
- [ ] Console logs son claros y útiles

