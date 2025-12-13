# 📡 Guía de Configuración GPS Tracker

Esta guía explica cómo configurar los dispositivos GPS tracker para integrarlos con el sistema RMP y comenzar a trackear vehículos en tiempo real.

## 🌐 Opciones de Integración GPS

El sistema RMP soporta **dos métodos** de integración GPS:

1. **SafeTag GPS** (Cloud-based, recomendado) - Sin configuración de hardware
2. **GPS Tracker OBD** (Hardware directo) - Requiere configuración SMS

---

## ⭐ Opción 1: SafeTag GPS (Recomendado)

SafeTag es una plataforma cloud que gestiona GPS trackers. El sistema RMP se sincroniza automáticamente con SafeTag cada minuto.

### ✅ Ventajas de SafeTag:
- ✅ Sin configuración SMS del dispositivo GPS
- ✅ Sincronización automática en tiempo real
- ✅ Gestión centralizada de dispositivos
- ✅ Historial de ubicaciones incluido
- ✅ App móvil SafeTag disponible

### 📋 Paso 1: Obtener Credenciales SafeTag API

1. **Crear cuenta en SafeTag**: https://app.safetagtracking.com
2. **Ir a Settings → API**
3. **Generar API Key** (formato: `stkey_...`)
4. **Anotar tu username** (email de tu cuenta SafeTag)

### 🔧 Paso 2: Configurar Credenciales en RMP

Agrega las credenciales SafeTag en `.env.local`:

```env
SAFETAG_API_KEY=stkey_tu_api_key_aqui
SAFETAG_USERNAME=tu_email@ejemplo.com
```

También configúralas en Convex Dashboard:
```bash
npx convex env set SAFETAG_API_KEY "stkey_..."
npx convex env set SAFETAG_USERNAME "tu_email@ejemplo.com"
```

### 📱 Paso 3: Vincular GPS a Vehículo

1. **Ve a SafeTag app** y copia el **IMEI del GPS** (15 dígitos, ej: `357956371545858`)
2. **En RMP Dashboard** → **Operaciones → Flota**
3. **Editar vehículo** o **Agregar nuevo vehículo**
4. En **"📡 Configuración GPS SafeTag"**:
   - **IMEI SafeTag**: Pega el IMEI copiado
   - **Nombre del GPS**: (Opcional) Nombre descriptivo
5. **Guardar**

### ✅ Paso 4: Verificar Sincronización

1. **Ve a Dashboard → SafeTag GPS**
2. **Click "Sincronizar Ahora"**
3. Verifica que aparezca:
   - 🟢 **Estado: Online**
   - 📍 **Ubicación actualizada**
   - 🔋 **Nivel de batería**
   - 📶 **Señal GSM**

**Listo!** El GPS se sincronizará automáticamente cada minuto.

---

## ⚙️ Opción 2: GPS Tracker OBD (Hardware Directo)

---

## 📋 Requisitos Previos

Antes de comenzar, asegúrate de tener:

- ✅ **Dispositivo GPS Tracker OBD** con tarjeta SIM activa
- ✅ **Tarjeta SIM con plan de datos** (GPRS/3G/4G)
- ✅ **Número de teléfono de la SIM** (para enviar comandos SMS)
- ✅ **IMEI del dispositivo GPS** (15 dígitos, encontrarás esto en la etiqueta del dispositivo)
- ✅ **Puerto OBD del vehículo** (generalmente debajo del volante, cerca del panel de fusibles)

---

## 🔧 Paso 1: Instalación Física del GPS Tracker

### Ubicación del puerto OBD2

El puerto OBD2 (On-Board Diagnostics) se encuentra generalmente en:
- **Debajo del volante**, cerca de la columna de dirección
- **Cerca del panel de fusibles**
- **Al lado del pedal del freno**

### Instalación

1. **Localiza el puerto OBD2** en tu vehículo (forma trapezoidal con 16 pines)
2. **Inserta el GPS tracker** en el puerto OBD2 firmemente (escucharás un "click")
3. **Enciende el vehículo** - el LED del GPS debería encenderse
4. **Verifica los LEDs**:
   - 🔴 **LED Rojo (Power)**: Encendido = dispositivo alimentado
   - 🟡 **LED Amarillo (GSM)**: Parpadeando = buscando señal celular / Fijo = conectado a red GSM
   - 🔵 **LED Azul (GPS)**: Parpadeando = buscando satélites / Fijo = señal GPS obtenida

### Tiempo de Inicialización

⏱️ **Primera vez**: 2-5 minutos para obtener señal GPS (debe estar al aire libre)
⏱️ **Subsecuentes**: 30-60 segundos

---

## 📱 Paso 2: Configurar el GPS Tracker vía SMS

Envía los siguientes comandos SMS al número de la tarjeta SIM del GPS tracker:

### 2.1 Configurar APN (Punto de Acceso)

El APN varía según tu operadora móvil en Panamá:

```sms
APN123456,{APN_de_tu_operadora}#
```

**Ejemplos por operadora:**

| Operadora | Comando SMS |
|-----------|-------------|
| Movistar  | `APN123456,internet.movistar.pa#` |
| Claro     | `APN123456,internet.ideasclaro#` |
| Digicel   | `APN123456,web.digicelpanama.com#` |
| + Móvil   | `APN123456,internet.movil#` |

**Respuesta esperada:**
`APN OK`

---

### 2.2 Configurar Servidor GPS (Convex)

Obtén tu URL de deployment de Convex:

1. Ejecuta `npx convex dev` en la terminal
2. Copia la URL que aparece (ej: `https://your-deployment-abc123.convex.site`)
3. Envía el siguiente SMS:

```sms
ADMINIP123456,your-deployment-abc123.convex.site,443#
```

**Nota importante**:
- **NO incluyas `https://`** en el comando
- Usa puerto **443** (HTTPS) o **80** (HTTP)
- Ejemplo completo: `ADMINIP123456,wild-rabbit-42.convex.site,443#`

**Respuesta esperada:**
`ADMINIP OK`

---

### 2.3 Configurar Intervalo de Reporte GPS

Configura cada cuánto tiempo el GPS envía actualizaciones (en segundos):

```sms
TIMER123456,{segundos}#
```

**Recomendaciones:**

| Uso | Intervalo | Comando |
|-----|-----------|---------|
| **Normal** (bajo consumo de datos) | 60 segundos | `TIMER123456,60#` |
| **Alta frecuencia** (tracking preciso) | 30 segundos | `TIMER123456,30#` |
| **Muy alta frecuencia** (demo/pruebas) | 10 segundos | `TIMER123456,10#` |

**Respuesta esperada:**
`TIMER OK`

---

### 2.4 Otros Comandos Útiles

#### Verificar Estado del GPS

```sms
STATUS123456#
```

**Respuesta esperada:**
Información del dispositivo (IMEI, señal GPS, señal GSM, batería, etc.)

#### Resetear el GPS a Configuración de Fábrica

```sms
FORMAT123456#
```

**⚠️ ADVERTENCIA**: Esto borrará TODAS las configuraciones. Solo úsalo si necesitas empezar de cero.

#### Cambiar Contraseña (Opcional)

Por defecto, la contraseña es `123456`. Para cambiarla:

```sms
PASSWORD123456,{nueva_contraseña}#
```

Ejemplo: `PASSWORD123456,987654#`

---

## 🌐 Paso 3: Registrar el GPS en el Sistema RMP

### Desde el Dashboard de Administrador

1. **Accede al sistema** como administrador
2. Ve a **Operaciones → Flota**
3. Haz clic en **"+ Agregar Vehículo"**
4. Llena los datos del vehículo (placa, marca, modelo, etc.)
5. En la sección **"📡 Configuración GPS"**:
   - **IMEI del GPS**: Ingresa el IMEI de 15 dígitos (ejemplo: `123456789012345`)
   - **Protocolo GPS**: Selecciona `GT06 (OBD Tracker)` (o el protocolo de tu dispositivo)
6. Haz clic en **"Agregar Vehículo"**

El GPS tracker ahora está vinculado al vehículo. Cuando el GPS envíe su primera actualización, el vehículo aparecerá en el mapa en tiempo real.

---

## 📊 Paso 4: Verificar que el GPS está Funcionando

### Método 1: Ver en el Mapa

1. Ve a **Dashboard → Monitoreo**
2. Busca el vehículo en el mapa
3. Deberías ver:
   - ✅ **Ícono del vehículo** en la ubicación actual
   - ✅ **Velocidad en tiempo real**
   - ✅ **Última actualización** (debería ser reciente, < 2 minutos)

### Método 2: Revisar Estado GPS

1. Ve a **Operaciones → Flota**
2. Busca el vehículo configurado
3. Verifica el **indicador GPS**:
   - 🟢 **Verde (Conectado)**: GPS reportando correctamente
   - 🔴 **Rojo (Desconectado)**: GPS sin reportar (> 5 minutos sin actualización)

### Método 3: Ver Logs en Convex Dashboard

1. Abre tu Convex Dashboard: https://dashboard.convex.dev
2. Ve a **Logs**
3. Busca mensajes como:
   ```
   ✅ GPS actualizado: ABC-123 (IMEI 123456789012345) -> [8.9833, -79.5167] @ 45 km/h
   ```

---

## 🚨 Solución de Problemas

### Problema 1: GPS no reporta posición

**Síntomas**: Vehículo no aparece en el mapa o muestra "Sin GPS"

**Soluciones**:
1. ✅ Verifica que el vehículo esté **encendido** (OBD tracker solo funciona con ignición ON)
2. ✅ Verifica señal GPS (LED azul debe estar fijo, no parpadeando)
3. ✅ Lleva el vehículo a un **espacio abierto** (sin techo, árboles o edificios altos)
4. ✅ Espera 2-5 minutos para que el GPS obtenga fix de satélites
5. ✅ Verifica que la **SIM tenga saldo/datos activos**
6. ✅ Envía SMS `STATUS123456#` para ver el estado del dispositivo

### Problema 2: "Vehicle not found for this IMEI"

**Síntomas**: En los logs de Convex aparece `⚠️ No se encontró vehículo con IMEI: xxx`

**Soluciones**:
1. ✅ Verifica que el **IMEI sea correcto** (15 dígitos)
2. ✅ Ve a **Operaciones → Flota** y edita el vehículo
3. ✅ Asegúrate de que el **IMEI esté guardado** en el sistema
4. ✅ El IMEI del GPS debe coincidir **exactamente** con el IMEI en el sistema

### Problema 3: GPS reporta pero la posición es incorrecta

**Síntomas**: Vehículo aparece en ubicación equivocada

**Soluciones**:
1. ✅ Espera a que el GPS obtenga **más satélites** (mínimo 4 para buena precisión)
2. ✅ Ve a un **espacio abierto** (los edificios pueden causar "GPS drift")
3. ✅ Verifica que no haya **interferencia electromagnética** cerca del GPS
4. ✅ Reinicia el GPS desconectándolo del OBD y volviéndolo a conectar

### Problema 4: GPS deja de reportar después de un tiempo

**Síntomas**: GPS funciona inicialmente pero deja de actualizar

**Soluciones**:
1. ✅ Verifica que la **SIM no se haya quedado sin datos**
2. ✅ Revisa que el **vehículo esté encendido** (OBD solo funciona con ignición)
3. ✅ Verifica el **intervalo de reporte** con `STATUS123456#`
4. ✅ Revisa los **logs de Convex** para ver si hay errores HTTP

---

## 📡 Formato de Datos GPS Enviados

El GPS tracker envía datos al endpoint de Convex en el siguiente formato:

### Endpoint

```
POST https://tu-deployment.convex.site/gps/update
```

### Parámetros (JSON)

```json
{
  "imei": "123456789012345",
  "lat": 8.9833,
  "lng": -79.5167,
  "speed": 45.5,
  "heading": 180,
  "altitude": 10,
  "precision": 1.5,
  "satellites": 8,
  "timestamp": "2024-01-15T10:30:00Z"
}
```

También soporta formato GET (query parameters):

```
GET https://tu-deployment.convex.site/gps/update?imei=123456789012345&lat=8.9833&lng=-79.5167&speed=45.5...
```

---

## 🔒 Seguridad y Privacidad

### Recomendaciones

- 🔐 Cambia la contraseña por defecto (`123456`) del GPS
- 🔐 No compartas el IMEI públicamente (es como una "llave" para acceder al dispositivo)
- 🔐 Mantén el firmware del GPS actualizado (si el fabricante lo permite)
- 🔐 Usa HTTPS (puerto 443) para la comunicación con Convex

### Control de Acceso

- Solo usuarios **Admin** pueden configurar/editar GPS trackers
- Solo usuarios **Enterprise** pueden ver vehículos asignados a su empresa
- Conductores solo ven su propio vehículo asignado

---

## 📞 Soporte

Si tienes problemas configurando el GPS tracker:

1. Revisa esta guía completa
2. Verifica los logs en Convex Dashboard
3. Envía `STATUS123456#` al GPS y comparte la respuesta
4. Contacta al soporte técnico con:
   - Modelo del GPS tracker
   - Operadora móvil de la SIM
   - Logs de error (si los hay)
   - Capturas de pantalla del problema

---

## 📚 Recursos Adicionales

- **Documentación Convex**: https://docs.convex.dev
- **Códigos de error OBD**: https://www.obd-codes.com
- **Protocolos GPS Tracker**: Consulta el manual de tu dispositivo

---

**Última actualización**: 2025-01-26
**Versión**: 1.0.0
