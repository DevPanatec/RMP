# Guía de Diseño - Sistema de Recolección de Basura y Fumigación

## 🌱 Paleta de Colores Eco-Friendly

### Colores Principales

#### Verde Bosque Profesional
- **Primario**: `#2d7a2d` - Color principal para botones, enlaces y elementos destacados
- **Hover**: `#358535` - Estado hover para elementos interactivos
- **Activo**: `#246824` - Estado activo/presionado
- **Claro**: `#e8f5e8` - Fondo claro para elementos sutiles
- **Suave**: `#d4f0d4` - Fondo suave para destacar contenido

#### Verde Eco Secundario
- **Secundario**: `#4a7c59` - Color complementario para variedad
- **Hover**: `#558a66` - Estado hover secundario
- **Claro**: `#edf7f0` - Fondo claro secundario

#### Verde Menta Terciario
- **Terciario**: `#47b381` - Color de acento para elementos especiales
- **Hover**: `#52c793` - Estado hover terciario
- **Claro**: `#e7f9f2` - Fondo claro terciario

### Colores de Acento
- **Eco**: `#7db46c` - Verde eco para elementos naturales
- **Reciclaje**: `#5cb85c` - Verde reciclaje para elementos de reciclaje
- **Naturaleza**: `#6ba16b` - Verde naturaleza para elementos orgánicos

### Colores de Estado
- **Éxito**: `#4caf50` - Verde éxito para confirmaciones
- **Advertencia**: `#ff9800` - Naranja para advertencias
- **Error**: `#f44336` - Rojo para errores
- **Información**: `#2196f3` - Azul para información

### Gradientes Profesionales
- **Primario**: `linear-gradient(135deg, #2d7a2d 0%, #4a7c59 100%)`
- **Secundario**: `linear-gradient(135deg, #4a7c59 0%, #47b381 100%)`
- **Terciario**: `linear-gradient(135deg, #47b381 0%, #7db46c 100%)`
- **Superficie**: `linear-gradient(135deg, #fafcfb 0%, #f8fdf9 100%)`

## 🎨 Componentes Eco-Friendly

### Insignias Eco (Eco Badges)
Perfectas para categorizar tipos de residuos:

```html
<span class="eco-badge eco-badge--organic">🌿 Orgánico</span>
<span class="eco-badge eco-badge--recyclable">♻️ Reciclable</span>
<span class="eco-badge eco-badge--hazardous">⚠️ Peligroso</span>
<span class="eco-badge eco-badge--general">🗑️ General</span>
```

### Tarjetas de Estadísticas Eco
Para mostrar métricas importantes:

```html
<div class="eco-stats-card">
  <div class="eco-stats-card__header">
    <div class="eco-stats-card__icon">🚛</div>
    <h3 class="eco-stats-card__title">Rutas Completadas</h3>
  </div>
  <div class="eco-stats-card__value">28</div>
  <div class="eco-stats-card__label">Esta semana</div>
</div>
```

### Barras de Progreso Eco
Para mostrar el progreso de recolección:

```html
<div class="eco-progress">
  <div class="eco-progress__fill" style="width: 75%"></div>
</div>
```

### Botones de Acción Eco
Para acciones importantes:

```html
<button class="eco-action-btn">
  <span>🚛</span>
  Iniciar Recolección
</button>
<button class="eco-action-btn eco-action-btn--secondary">
  <span>📊</span>
  Ver Reporte
</button>
```

### Alertas Eco
Para notificaciones importantes:

```html
<div class="eco-alert eco-alert--success">
  <div class="eco-alert__icon">✅</div>
  <div class="eco-alert__content">
    <div class="eco-alert__title">Recolección Completada</div>
    <div class="eco-alert__message">La ruta ha sido completada exitosamente.</div>
  </div>
</div>
```

### Navegación Eco
Para menús y navegación:

```html
<nav class="eco-nav">
  <a href="#" class="eco-nav__item active">
    <span class="eco-nav__item__icon">🏠</span>
    <span class="eco-nav__item__text">Inicio</span>
  </a>
  <a href="#" class="eco-nav__item">
    <span class="eco-nav__item__icon">🚛</span>
    <span class="eco-nav__item__text">Rutas</span>
  </a>
</nav>
```

### Grid de Tarjetas Eco
Para organizar contenido:

```html
<div class="eco-card-grid">
  <div class="card">
    <!-- Contenido de la tarjeta -->
  </div>
  <div class="card">
    <!-- Contenido de la tarjeta -->
  </div>
</div>
```

### Spinner de Carga Eco
Para estados de carga:

```html
<div class="eco-loading">
  <div class="eco-loading__spinner"></div>
  <span>Cargando datos...</span>
</div>
```

### Tooltips Eco
Para información adicional:

```html
<div class="eco-tooltip">
  <button class="btn btn--primary">Hover me</button>
  <div class="eco-tooltip__content">
    Información adicional sobre esta acción
  </div>
</div>
```

## 🎯 Mejores Prácticas

### 1. Uso de Colores
- Usa el verde primario (`#2d7a2d`) para elementos principales como botones de acción
- Usa el verde secundario (`#4a7c59`) para elementos complementarios
- Usa el verde terciario (`#47b381`) para acentos especiales
- Mantén un buen contraste para la accesibilidad

### 2. Gradientes
- Usa gradientes para crear profundidad y modernidad
- Aplica gradientes sutiles en fondos y elementos grandes
- Usa gradientes más intensos en botones y elementos interactivos

### 3. Sombras
- Usa `--shadow-sm` para elementos sutiles
- Usa `--shadow-md` para elementos importantes
- Usa `--shadow-eco` para elementos que requieren máxima atención

### 4. Animaciones
- Mantén las animaciones suaves y naturales
- Usa `--duration-fast` (150ms) para interacciones rápidas
- Usa `--duration-normal` (250ms) para transiciones generales

### 5. Responsive Design
- Todos los componentes son responsive por defecto
- Usa `eco-card-grid--compact` para pantallas pequeñas
- Ajusta el padding y spacing en dispositivos móviles

## 🌍 Iconografía Recomendada

Para mantener la coherencia temática, usa estos iconos:

### Recolección de Basura
- 🚛 Camión recolector
- 🗑️ Basura general
- ♻️ Reciclaje
- 🌿 Orgánico
- ⚠️ Peligroso

### Fumigación
- 🦟 Control de plagas
- 🏠 Edificios
- 🛡️ Protección
- 💨 Spray/Fumigación

### Sistema
- 📊 Reportes
- 📍 Ubicaciones
- 👥 Personal
- ⚙️ Configuración
- 📱 Móvil

## 🔧 Variables CSS Disponibles

### Colores
```css
--color-primary: #2d7a2d;
--color-secondary: #4a7c59;
--color-tertiary: #47b381;
--color-success: #4caf50;
--color-warning: #ff9800;
--color-error: #f44336;
--color-info: #2196f3;
```

### Espaciado
```css
--space-4: 4px;
--space-8: 8px;
--space-12: 12px;
--space-16: 16px;
--space-20: 20px;
--space-24: 24px;
--space-32: 32px;
```

### Radios
```css
--radius-sm: 6px;
--radius-base: 8px;
--radius-md: 10px;
--radius-lg: 12px;
--radius-full: 9999px;
```

### Sombras
```css
--shadow-sm: 0 1px 3px rgba(45, 122, 45, 0.1);
--shadow-md: 0 4px 6px -1px rgba(45, 122, 45, 0.1);
--shadow-lg: 0 10px 15px -3px rgba(45, 122, 45, 0.1);
--shadow-eco: 0 8px 32px rgba(45, 122, 45, 0.12);
```

## 📱 Modo Oscuro

El sistema incluye soporte completo para modo oscuro con una paleta de colores adaptada:

- **Fondo**: `#0f1b12` - Verde muy oscuro
- **Superficie**: `#1a2a1f` - Verde oscuro
- **Texto**: `#e8f5ea` - Verde muy claro
- **Primario**: `#4caf50` - Verde brillante

El modo oscuro se activa automáticamente según la preferencia del sistema del usuario.

---

**Desarrollado por**: [Tu Nombre]  
**Fecha**: [Fecha Actual]  
**Versión**: 1.0.0