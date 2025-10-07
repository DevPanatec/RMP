# 👥 Usuarios de Prueba - RMP System

## ✅ Cuentas Creadas Exitosamente

Se han creado **3 cuentas de prueba** en Supabase Auth con sus respectivos perfiles en la base de datos.

---

## 🔐 Credenciales de Acceso

### 1️⃣ **Administrador**
- **Email:** `admin@rmp.com`
- **Contraseña:** `admin123`
- **Tipo:** `admin`
- **Nombre:** Administrador del Sistema
- **Acceso:** Dashboard completo de administración

### 2️⃣ **Usuario Enterprise**
- **Email:** `empresa@rmp.com`
- **Contraseña:** `empresa123`
- **Tipo:** `enterprise`
- **Nombre:** Usuario Enterprise
- **Acceso:** Dashboard empresarial

### 3️⃣ **Conductor**
- **Email:** `conductor@rmp.com`
- **Contraseña:** `conductor123`
- **Tipo:** `conductor`
- **Nombre:** Juan Pérez
- **Acceso:** Dashboard de conductor
- **Vehículo Asignado:** ABC-123 (ID: 1)

---

## 🚀 Cómo Usar

1. **Inicia la aplicación:**
   ```bash
   npm run dev
   ```

2. **Abre el navegador** en `http://localhost:5173`

3. **Selecciona el tipo de usuario** en el dropdown del login

4. **Haz clic en "Auto-llenar"** para completar automáticamente las credenciales

5. **Haz clic en "Iniciar Sesión"**

---

## 📊 Información de los Perfiles

| Usuario | UUID | Tipo | Vehículo | Teléfono | Documento |
|---------|------|------|----------|----------|-----------|
| Admin | `d5ee426a-3277-434d-99e4-b4c3b9619036` | admin | - | +507 6000-0001 | 8-000-0001 |
| Enterprise | `6ae6f5b0-a291-437d-84de-a765fc11ee2b` | enterprise | - | +507 6000-0002 | 8-000-0002 |
| Conductor | `15275bfc-044c-43a8-b1f8-f0e4e2e5c782` | conductor | ID: 1 | +507 6000-0003 | 8-000-0003 |

---

## 🔧 Crear Más Usuarios

Si necesitas crear más usuarios de prueba, puedes:

### Opción 1: Usar el botón en el Login
1. Ve a la pantalla de login
2. Haz clic en "🔧 Crear Usuarios de Prueba"
3. Se abrirá un modal con las opciones

### Opción 2: Ejecutar el script
```bash
node scripts/createTestUsers.mjs
```

### Opción 3: Usar la interfaz de Supabase
1. Ve a [Supabase Dashboard](https://supabase.com/dashboard)
2. Navega a Authentication > Users
3. Crea usuarios manualmente
4. Los perfiles se crearán automáticamente al hacer login

---

## 🔒 Seguridad

- ✅ Autenticación real con Supabase Auth
- ✅ Tokens JWT seguros
- ✅ Sesiones persistentes
- ✅ Foreign keys a `auth.users`
- ✅ Validación de tipos de usuario
- ⚠️ **IMPORTANTE:** Estas son cuentas de PRUEBA. En producción, usa contraseñas seguras.

---

## 📁 Archivos Relacionados

- `src/context/SupabaseAuthContext.jsx` - Contexto de autenticación
- `src/components/Login/Login.jsx` - Componente de login
- `src/components/CreateTestUsers/CreateTestUsers.jsx` - Modal para crear usuarios
- `scripts/createTestUsers.mjs` - Script de creación de usuarios
- `src/App.jsx` - Integración del provider de auth

---

## 🎯 Características Implementadas

✅ **Sistema de autenticación completo:**
- Sign in / Sign up
- Sign out
- Password reset
- Update profile
- Persistent sessions

✅ **Perfiles de usuario:**
- 3 tipos: admin, enterprise, conductor
- Datos personales (nombre, teléfono, documento)
- Asignación de vehículos (conductores)
- Timestamps automáticos

✅ **Tablas de base de datos:**
- `perfiles_usuarios` - Perfiles de usuarios
- `turnos` - Turnos de trabajo
- `empleados_turnos` - Asignación de turnos
- `asistencia` - Control de asistencia
- `evaluaciones_desempeno` - Evaluaciones
- `historial_posiciones` - Tracking GPS

---

## 📞 Soporte

Si tienes problemas con las cuentas:
1. Verifica que estés usando las credenciales correctas
2. Revisa que el proyecto de Supabase esté activo
3. Consulta los logs en la consola del navegador
4. Ejecuta el script de creación de usuarios nuevamente

---

**Última actualización:** 6 de octubre de 2025
**Versión:** 1.0.0
