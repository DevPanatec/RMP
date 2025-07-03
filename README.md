# RMP - Recolecting Manager Pro

Sistema de gestión de recolección de residuos construido con React moderno.

## 🚀 Migración Completada

Este proyecto ha sido migrado exitosamente de:
- **Antes**: React con CDN + Babel en el navegador
- **Después**: React moderno con Vite + estructura organizada

## 📋 Características

- ✅ **3 Tipos de usuarios**: Administrador, Enterprise, Conductor
- ✅ **Mapas interactivos** con Leaflet/React-Leaflet
- ✅ **Dashboard completo** con KPIs y reportes
- ✅ **Seguimiento en tiempo real** de camiones
- ✅ **Sistema de rutas** y paradas
- ✅ **Gestión de peso** de recolección
- ✅ **Modo oscuro** automático
- ✅ **Responsive design**

## 🛠️ Tecnologías

- **React 18** - Framework principal
- **Vite** - Build tool moderno
- **Leaflet** - Mapas interactivos
- **CSS Custom Properties** - Sistema de diseño
- **ESLint** - Linting de código

## 📦 Instalación

1. **Instala las dependencias:**
   ```bash
   npm install
   ```

2. **Inicia el servidor de desarrollo:**
   ```bash
   npm run dev
   ```

3. **Abre tu navegador en:** `http://localhost:3000`

## 👥 Credenciales de Prueba

| Tipo | Usuario | Contraseña | Descripción |
|------|---------|------------|-------------|
| Admin | `admin` | `admin123` | Acceso completo al sistema |
| Enterprise | `empresa1` | `emp123` | Vista de empresa con camiones asignados |
| Conductor | `conductor1` | `cond123` | Vista de conductor con ruta asignada |

## 📁 Estructura del Proyecto

```
src/
├── components/          # Componentes reutilizables
│   ├── Login/          # Componente de login
│   ├── Map/            # Componente de mapa
│   └── WeightModal/    # Modal de selección de peso
├── pages/              # Páginas principales
│   ├── AdminDashboard/      # Dashboard administrador
│   ├── EnterpriseDashboard/ # Dashboard empresa
│   └── ConductorDashboard/  # Dashboard conductor
├── data/               # Datos mock
├── styles/             # Estilos globales
├── App.jsx             # Componente principal
└── main.jsx           # Punto de entrada
```

## 🎯 Funcionalidades por Usuario

### 👨‍💼 Administrador
- Vista completa de todos los camiones
- Gestión de rutas y paradas
- Reportes de recolección
- Estadísticas globales del sistema

### 🏢 Enterprise
- Vista de camiones asignados
- Seguimiento de rutas específicas
- Reportes de eficiencia
- Métricas de rendimiento

### 🚛 Conductor
- Vista de ruta asignada
- Progreso de paradas
- Registro de peso recolectado
- Estado del camión en tiempo real

## 🚀 Scripts Disponibles

```bash
# Desarrollo
npm run dev

# Build para producción
npm run build

# Preview del build
npm run preview

# Linting
npm run lint
```

## 🎨 Personalización

El sistema de diseño está basado en CSS Custom Properties en `src/styles/index.css`. 
Puedes personalizar:

- **Colores**: Modifica las variables `--color-*`
- **Espaciado**: Ajusta las variables `--space-*`
- **Tipografía**: Cambia las variables `--font-*`
- **Tema oscuro**: Automático según preferencias del sistema

## 📋 Mejoras Implementadas

1. **Estructura modular**: Componentes separados en archivos individuales
2. **Build moderno**: Vite en lugar de CDN scripts
3. **Importaciones optimizadas**: ES6 modules
4. **React-Leaflet**: Integración nativa con React
5. **CSS organizado**: Variables CSS y arquitectura escalable
6. **TypeScript ready**: Estructura preparada para migración a TS

## 🔧 Próximos Pasos

- [ ] Migrar a TypeScript
- [ ] Agregar tests unitarios
- [ ] Implementar estado global (Zustand/Redux)
- [ ] Conectar con API real
- [ ] Agregar PWA capabilities
- [ ] Implementar autenticación JWT

## 📄 Licencia

Este proyecto es de uso interno para sistemas de gestión de recolección de residuos.

---

**¡La migración está completa!** 🎉 Ahora tienes un proyecto React moderno, escalable y bien organizado. 