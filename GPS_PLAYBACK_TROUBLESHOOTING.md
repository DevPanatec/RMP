# GPS Playback Troubleshooting Guide

## Error: "Error al cargar historial"

Este error aparece cuando el componente `RoutePlayback` no puede cargar el historial de ubicaciones GPS desde SafeTag.

### Diagnóstico Paso a Paso

#### 1. Verificar que el device existe en SafeTag

```bash
npx convex run testLocationHistory:testFetch
```

**Resultado esperado:**
```
{
  "success": true,
  "todayLocations": 447,  // Debe ser > 0
  "weekLocations": 447,
  "deviceExists": true,   // Debe ser true
  "deviceId": "357956371545858"
}
```

Si `deviceExists: false`:
- El IMEI no está registrado en SafeTag
- Verifica el IMEI en el vehículo vs SafeTag dashboard
- Contacta a SafeTag para agregar el device

#### 2. Verificar credenciales de SafeTag

```bash
npx convex env list
```

Debe mostrar:
```
SAFETAG_API_KEY=stkey_... (debe existir y ser válido)
SAFETAG_USERNAME=dev@panatec.systems (debe existir)
```

Si faltan:
```bash
npx convex env set SAFETAG_API_KEY "your-key-here"
npx convex env set SAFETAG_USERNAME "your-username-here"
```

#### 3. Revisar logs en consola del navegador

Cuando hagas clic en el botón ▶️ (Play), debes ver:

**Logs normales (funcionando):**
```
🔄 loadHistory: Starting to load GPS history {deviceId: "357956371545858", selectedDate: null}
📅 Fetching today's history for device: 357956371545858
✅ History data received: {locationCount: 447, totalDistance: 6.6, hasData: true}
```

**Si hay error:**
```
❌ Error loading route history: [mensaje de error]
❌ Error details: {message: "...", stack: "...", deviceId: "...", selectedDate: null}
```

Tipos de errores comunes:

| Error Message | Causa | Solución |
|--------------|-------|----------|
| `SafeTag API credentials not configured` | Variables de entorno no configuradas | Ejecutar `npx convex env set` |
| `SafeTag API error: 401` | API key inválido | Verificar API key en dashboard de SafeTag |
| `SafeTag API error: 404` | Device no encontrado | Verificar IMEI del vehículo |
| `Cannot read property 'locations' of undefined` | Respuesta vacía de API | Verificar conectividad con SafeTag API |

#### 4. Verificar el vehículo en Convex

Ejecutar en consola del navegador:
```javascript
// Obtener vehículos con SafeTag
const vehicles = await window.convex.query(api.safetag.getVehiclesWithSafeTag);
console.log(vehicles);
```

Debe mostrar el vehículo con:
- `safetag_device_id`: "357956371545858"
- `safetag_device_name`: "GPS SafeTag Principal"
- `gps_latitud` y `gps_longitud`: Con valores numéricos (si ya se sincronizó)

#### 5. Verificar sincronización automática

La sincronización debe ejecutarse cada minuto vía cron job.

Verificar manualmente:
```bash
npx convex run safetag:syncAllVehicles
```

**Resultado esperado:**
```
[CONVEX] ✅ Sincronización completa: 1/1 exitosos
```

Si falla:
- Revisar logs en dashboard de Convex
- Verificar que el cron job esté activo en `convex/crons.ts`

#### 6. Verificar que el modal se abre correctamente

En `FleetManagement.jsx`, cuando haces clic en el botón Play:

```javascript
setPlaybackVehicle({
  deviceId: vehicle.safetag_device_id,  // Debe ser "357956371545858"
  deviceName: vehicle.safetag_device_name,
  placa: vehicle.placa,
  marca: vehicle.marca,
  modelo: vehicle.modelo,
})
```

Agregar console.log temporal:
```javascript
onClick={() => {
  console.log("Opening GPS playback for:", vehicle.safetag_device_id);
  setPlaybackVehicle({ ... });
}}
```

### Errores Conocidos y Soluciones

#### Error: "useAction is not a function"

**Causa**: Importación incorrecta de Convex hooks

**Solución**: Verificar en `useRoutePlayback.js`:
```javascript
import { useAction } from 'convex/react'; // Correcto
// NO: import { useAction } from 'convex';
```

#### Error: "Cannot find module '@convex/_generated/api'"

**Causa**: Convex dev no está corriendo

**Solución**:
```bash
npx convex dev
```

#### Error: El modal se abre pero muestra "No hay datos GPS"

**Causa**: La API devuelve array vacío

**Verificar**:
1. ¿El device está transmitiendo hoy?
2. ¿El IMEI es correcto?
3. Ejecutar test: `npx convex run testLocationHistory:testFetch`

### Archivos Relevantes

- **Frontend Hook**: `src/hooks/useRoutePlayback.js`
- **Componente UI**: `src/components/SafeTag/RoutePlayback.jsx`
- **Backend API**: `convex/safetag.ts`
- **Test Script**: `convex/testLocationHistory.ts`
- **Fleet Component**: `src/components/Fleet/FleetManagement.jsx`

### Endpoints SafeTag

Base URL: `https://api.safetagtracking.com/api/v1`

- **Get Devices**: `GET /devices/:username`
- **Get History Range**: `GET /locations/range/:username/:deviceId?start=ISO&end=ISO`

Headers requeridos:
- `x-api-key`: Tu API key de SafeTag
- `Content-Type`: `application/json`

### Testing Manual con curl

```bash
# Reemplazar con tus credenciales
API_KEY="stkey_..."
USERNAME="dev@panatec.systems"
DEVICE_ID="357956371545858"

# Obtener devices
curl -H "x-api-key: $API_KEY" \
  "https://api.safetagtracking.com/api/v1/devices/$USERNAME"

# Obtener historial de hoy
TODAY_START=$(date -u -I)T00:00:00.000Z
TODAY_END=$(date -u -I)T23:59:59.999Z

curl -H "x-api-key: $API_KEY" \
  "https://api.safetagtracking.com/api/v1/locations/range/$USERNAME/$DEVICE_ID?start=$TODAY_START&end=$TODAY_END"
```

### Contacto y Soporte

Si el problema persiste después de todos estos pasos:

1. Revisar dashboard de SafeTag: Verificar que el device está activo y transmitiendo
2. Revisar logs de Convex: Dashboard → Logs
3. Verificar Network tab en DevTools: Ver las llamadas HTTP que fallan
4. Contactar soporte de SafeTag si el device no aparece en su API

### Checklist de Verificación Rápida

- [ ] Convex dev está corriendo (`npx convex dev`)
- [ ] Variables de entorno configuradas (API key y username)
- [ ] Device existe en SafeTag (ejecutar test)
- [ ] Vehículo tiene `safetag_device_id` configurado
- [ ] IMEI correcto (15 dígitos)
- [ ] Sincronización funcionando (ver logs)
- [ ] Console del navegador no muestra errores JavaScript
- [ ] Network tab muestra llamadas a Convex sin errores 401/403
