# Crear Conductor Real en Clerk

Para crear un conductor real, sigue estos pasos:

## Opción 1: Desde la interfaz (Recomendado)

1. Abre el navegador en: http://localhost:8000
2. Si estás logueado, cierra sesión
3. En la pantalla de login, busca la opción "Registrarse" o "Sign Up"
4. Completa el formulario con estos datos:

```
Email: conductor.real@rmp.com
Password: Conductor@Real2025!
Nombre Completo: Juan Pérez
Tipo de Usuario: Conductor
Teléfono: +507 6000-0000
Documento: 8-888-8888
```

## Opción 2: Desde la consola del navegador

1. Abre http://localhost:8000
2. Abre DevTools (F12)
3. Ve a la pestaña Console
4. Ejecuta este código:

```javascript
// Crear conductor usando el AuthContext
const createConductor = async () => {
  const { signUp } = window.__authContext; // Necesitamos exponer esto
  
  await signUp(
    'conductor.real@rmp.com',
    'Conductor@Real2025!',
    {
      nombre_completo: 'Juan Pérez',
      tipo_usuario: 'conductor',
      telefono: '+507 6000-0000',
      documento: '8-888-8888',
      activo: true
    }
  );
};

createConductor();
```

## Opción 3: Crear directamente en Clerk Dashboard

1. Ve a: https://dashboard.clerk.com
2. Selecciona tu aplicación "RMP"
3. Ve a Users → Create User
4. Completa:
   - Email: conductor.real@rmp.com
   - Password: Conductor@Real2025!
   - First Name: Juan
   - Last Name: Pérez

5. Después, en Convex, ejecuta esta mutación:

```javascript
// En https://peaceful-mustang-86.convex.site (Convex Dashboard)
// Functions → perfiles → createByUserId

{
  "userId": "https://peaceful-mustang-86.clerk.accounts.dev|user_XXXXXXXXX",
  "tipo_usuario": "conductor",
  "nombre_completo": "Juan Pérez",
  "email": "conductor.real@rmp.com",
  "telefono": "+507 6000-0000",
  "documento": "8-888-8888",
  "activo": true
}
```

## Credenciales creadas:

- **Email**: conductor.real@rmp.com
- **Password**: Conductor@Real2025!
- **Tipo**: Conductor
- **Nombre**: Juan Pérez

