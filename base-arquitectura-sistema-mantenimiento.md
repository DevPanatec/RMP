# Sistema de inventario y mantenimiento de equipos
## Documento base de arquitectura

**Propósito.** Este documento establece el marco conceptual y técnico del sistema para que el equipo de desarrollo pueda profundizar en el diseño detallado, cerrar el modelo de datos y planificar la entrega. No es una especificación final: es la base de decisiones, la arquitectura de referencia y los puntos abiertos que el equipo debe resolver.

**Audiencia.** Equipo de desarrollo (backend, frontend, datos/ML, infraestructura).

---

### 1. Visión del sistema

El sistema es un software de mantenimiento de flota y equipos (CMMS — Computerized Maintenance Management System) orientado a talleres y operadores de equipos de limpieza, mantenimiento, recolección y fumigación.

Cada equipo físico que el sistema administra (un "activo") tiene un registro completo: sus piezas, la vida útil de cada pieza, su historial de trabajos y sus planes de mantenimiento preventivo. Sobre ese registro, el sistema presenta un diagrama interactivo del equipo —vista superior y lateral— donde las zonas se pueden tocar para ver las piezas asociadas y su estado, coloreadas según estén al día, próximas a vencer o vencidas.

El diagrama no pretende ser una réplica exacta del modelo específico. El objetivo de calidad es que sea **verosímil y completamente sensato para el usuario y el mecánico**, lo más cercano a la realidad posible. La precisión real del equipo vive en la capa de datos (piezas, números de parte, intervalos); el diagrama es la capa de navegación visual sobre esos datos.

---

### 2. Decisiones de diseño ya tomadas

Estas decisiones están cerradas. El equipo no debe relitigarlas; sí debe profundizar en su implementación.

1. **El diagrama es una capa de navegación, no un CAD.** La fuente de verdad es la base de datos estructurada. El diagrama indexa visualmente esos datos.
2. **Objetivo de calidad: verosímil, no 1:1.** No se busca exactitud al milímetro; se busca que sea sensato y reconocible para un mecánico.
3. **IA de reconocimiento sí; IA de generación de imágenes no.** El sistema usa visión por computador para *extraer* estructura de documentos reales. Nunca *genera* (inventa) imágenes técnicas.
4. **Hotspots sobre imagen, no vectorización del dibujo.** Las zonas clicables son polígonos transparentes superpuestos a una imagen. No se intenta convertir el dibujo en SVG segmentado pieza por pieza.
5. **Renders genéricos por clase, no plantillas por modelo.** Se produce un conjunto acotado de renders limpios (~25-30, uno por clase de equipo). La especificidad por modelo vive en los datos y los hotspots, no en dibujos individuales.
6. **La calidad escala con el corpus documental; no es una puerta dura.** Cuanto más completo el material original de un modelo, mejor el resultado. Sin material, el sistema cae al render genérico de clase. Nunca entrega "nada".
7. **Soporte multi-unidad desde el día uno.** La vida útil se mide en kilómetros, millas, horas-motor o meses según el equipo. El modelo de datos debe soportar varios tipos de unidad de forma nativa.
8. **El paso de aprobación humana (curaduría) es permanente.** El reconocimiento produce borradores; un curador los aprueba antes de publicar. Es la puerta de calidad, no una limitación a eliminar.

---

### 3. Arquitectura de alto nivel

El sistema se compone de los siguientes subsistemas:

- **Repositorio documental.** Almacena los manuales, guías y diagramas originales de cada modelo. Es el insumo del pipeline de reconocimiento.
- **Pipeline de ingestión y reconocimiento.** Procesa los documentos con visión por computador y OCR, extrae datos estructurados y propone mapeos. Probablemente un servicio independiente (ver §10).
- **Base de conocimiento.** Datos de referencia estructurados: taxonomía de equipos, taxonomía de piezas/sistemas, mapeo zona↔pieza, registro de plantillas. Es la columna vertebral del sistema.
- **Registro de activos.** Las unidades físicas reales que el sistema rastrea, con su estado, lecturas y propietario.
- **Motor de diagramas.** En tiempo de ejecución resuelve qué diagrama mostrar para un activo, ensambla render + capa de hotspots + datos, y aplica el coloreado por estado.
- **Gestión de mantenimiento.** Órdenes de trabajo, planes preventivos, bitácora de historial, cálculo de vida útil.
- **Inventario de stock.** Control de piezas en almacén (distinto del registro de piezas instaladas).
- **Herramientas internas.** El mapeador de diagramas y la cola de curaduría.
- **Capa de aplicación.** Interfaz web y móvil para taller, mecánicos y administración.

---

### 4. El corpus documental

El corpus es un subsistema de primera clase. Sin él, el sistema solo puede dar diagramas genéricos.

**Contenido.** Por cada modelo/año se almacenan los documentos disponibles: manuales de servicio, catálogos de partes, guías de usuario y diagramas/despiece originales.

**Estructura.** Cada documento se asocia a un modelo (y opcionalmente a un rango de años), se etiqueta por tipo, y se versiona. Los archivos binarios van a almacenamiento de objetos; la base de datos guarda solo metadatos y referencias.

**Adquisición.** La obtención de documentos es parcialmente manual. Muchos catálogos OEM están detrás de accesos de distribuidor, y para este nicho (barredoras, recolectores, equipos de fumigación) no existe un agregador único. El equipo debe contemplar un flujo de carga manual de documentos además de cualquier ingestión automatizada.

**Cobertura.** Se asume que el corpus estará incompleto y crecerá gradualmente. El diseño del motor de diagramas (§7) y la resiliencia (§9) parten de esa premisa.

**Nota legal.** Los despiece y manuales OEM tienen derechos de autor. El sistema usa estos documentos como *insumo de reconocimiento* y extrae de ellos *datos*. Lo que el sistema publica y muestra al usuario deben ser renders propios y datos estructurados, no las imágenes originales del fabricante redistribuidas. Se recomienda revisión legal del flujo antes de producción.

---

### 5. Pipeline de ingestión y reconocimiento

El pipeline convierte documentos en datos estructurados y borradores de mapeo. Funciona por niveles de fiabilidad decreciente; el equipo debe diseñar puntajes de confianza en cada paso.

**Pasos:**

1. **Ingestión.** Se carga un documento; se registra en el repositorio; se encola para procesamiento.
2. **Análisis de layout.** Se identifican las regiones de la página: dónde está el dibujo y dónde la tabla de partes. *Fiable.*
3. **OCR de la tabla de partes.** Se extrae la relación número de callout → nombre de pieza → número de parte → datos de servicio. *Muy fiable en PDF limpio.* Esto alimenta directamente la base de conocimiento con poca revisión.
4. **Detección de callouts en el dibujo.** Se localizan las etiquetas numeradas dentro del despiece y su posición. *Fiable, con ruido.*
5. **Propuesta de hotspots.** Por cada callout detectado se propone una región clicable (polígono) en esa posición. El enlace callout↔pieza se hace por coincidencia de número con la tabla del paso 3. *Este es el enfoque clave:* la IA solo debe localizar los números, no recortar las piezas — recortar line-art es donde el reconocimiento es débil, y los hotspots evitan ese problema.
6. **Borrador en el mapeador.** Todo lo anterior llega al mapeador interno como un borrador pre-llenado.
7. **Curaduría.** Un curador confirma o corrige el borrador. Con un PDF vectorial limpio esto toma segundos; con un escaneo viejo toma trabajo real.
8. **Validación y publicación.** El borrador aprobado pasa una puerta de validación (§9) y entra a la base de conocimiento.

**Expectativas honestas.** El grado de automatización escala con la calidad del documento. PDF vectorial con tabla limpia → casi todo automático. Manual escaneado antiguo → la tabla se extrae igual, pero el dibujo exige más intervención humana. El paso de curaduría nunca se elimina.

---

### 6. Base de conocimiento — modelo de datos

Esta es la pieza central. A continuación, las entidades agrupadas. Los nombres son orientativos; el equipo debe cerrar el esquema definitivo.

#### 6.1 Datos de referencia

- **`EquipmentClass`** — clase de equipo (barredora vial, fregadora, recolector, etc.). Define los sistemas típicos de la clase y se vincula a su plantilla de render genérico.
- **`Make`** — marca/fabricante.
- **`Model`** — modelo; pertenece a una clase y una marca.
- **`ModelYear`** — año-modelo; pertenece a un modelo.
- **`System`** — sistema o categoría de pieza (motor, frenos, hidráulico, eléctrico, transmisión, etc.). Jerárquico (sistema → subsistema). Es el puente entre piezas y zonas del diagrama.
- **`PartCatalogItem`** — definición de un tipo de pieza. Campos clave: nombre, sistema al que pertenece, números de parte (OEM y alternativos), vida útil esperada (valor + tipo de unidad).
- **`DiagramTemplate`** — render genérico de una clase de equipo. Tiene una o más vistas (superior, lateral), estado de validación y versión.
- **`DiagramZone`** — región nombrada dentro de una plantilla. Se mapea a uno o más sistemas/categorías de pieza.

#### 6.2 Corpus documental

- **`Document`** — un manual, guía o diagrama. Campos clave: modelo/año asociado, tipo, referencia de almacenamiento, versión, estado de ingestión.
- **`IngestionRun`** — resultado del procesamiento de un documento. Campos clave: datos extraídos, puntajes de confianza, estado de revisión.

#### 6.3 Activos y operación

- **`Asset`** — la unidad física que el sistema rastrea. Campos clave: VIN o número de serie, clase/marca/modelo/año, odómetro actual, horas-motor actuales, propietario/cliente, estado.
- **`MeterReading`** — lectura de odómetro u horas en un momento dado. Alimenta el cálculo de vida útil. Debe registrarse fácilmente (idealmente en cada orden de trabajo).
- **`InstalledPart`** — instancia de una pieza instalada en un activo. Campos clave: pieza de catálogo, fecha y lectura de instalación, vida útil esperada, estado (activa/retirada). Es lo que permite rastrear la vida de cada pieza.
- **`AssetDiagram`** — el diagrama resuelto para un activo: qué plantilla usa, qué capa de hotspots, y qué nivel de respaldo se aplicó (ver §7).
- **`Hotspot`** — región clicable (coordenadas de polígono) sobre un diagrama, enlazada a una categoría de pieza o a una pieza instalada.
- **`WorkOrder`** — un trabajo. Campos clave: cliente, activo, fechas de entrada/salida, estado, técnico asignado.
- **`WorkOrderLine`** — tarea o pieza individual dentro de una orden, con mano de obra y costo.
- **`MaintenanceLog`** — registro histórico, solo de adición (append-only), de todo lo hecho sobre un activo.
- **`PMSchedule`** — plan de mantenimiento preventivo: regla de "cada X km / horas / meses". Puede definirse por modelo o por activo.
- **`StockItem`** — pieza en almacén. Campos clave: cantidad, punto de reorden, costo, proveedor. *Distinto de `InstalledPart`:* uno es existencias, el otro es lo instalado.
- **`Supplier`**, **`Customer`**, **`User`/`Technician`** — entidades de soporte.

**Distinción importante.** "Inventario" tiene dos significados que no deben confundirse: el stock de piezas en almacén (`StockItem`) y el registro de activos con sus piezas instaladas (`Asset` + `InstalledPart`). Son subsistemas separados.

---

### 7. Motor de diagramas

En tiempo de ejecución, cuando un usuario abre un activo, el motor decide qué mostrar mediante una **resolución por niveles de respaldo (fallback)**:

1. **Plantilla verificada** — existe un diagrama mapeado y verificado para ese modelo/año. Se sirve.
2. **Plantilla de clase** — no hay diagrama específico; se sirve el render genérico de la clase, con un distintivo visible de "genérico" y los datos del modelo encima vía hotspots.
3. **Solo lista de piezas** — no hay ningún diagrama disponible; se muestra la lista de piezas sin diagrama.

Cada vez que la resolución cae por debajo del nivel 1, se registra el hueco en una **cola de mejora** que un curador cierra (ver §9). El usuario nunca ve un diagrama roto.

**Ensamblado de un diagrama.** Un diagrama mostrado se compone de tres capas: el render (imagen base), la capa de hotspots (polígonos clicables con sus mapeos), y los datos de la base de conocimiento. Sobre las zonas se aplica un coloreado por estado: verde (al día), amarillo (próximo a vencer), rojo (vencido), calculado a partir de las piezas instaladas.

**Interacción.** Tocar una zona filtra y muestra las piezas de ese sistema con su estado; desde ahí se navega al historial de cada pieza.

---

### 8. Gestión de mantenimiento y vida útil

**Cálculo de vida útil.** Por cada `InstalledPart` se guarda el punto de instalación (fecha + lectura) y una vida esperada (ej. 10.000 km, 500 horas, 12 meses). El sistema calcula vida restante y clasifica cada pieza en al día / próxima / vencida. Esto depende de `MeterReading` actualizado: sin lecturas recientes, el cálculo se degrada a solo-fecha. El diseño debe facilitar el registro de lecturas.

**Vista de trabajo por venir.** Tanto los `PMSchedule` como los reemplazos puntuales de piezas alimentan un único panel de "vencido y próximo". En la práctica, esta es la pantalla más usada del sistema.

**Soporte multi-unidad.** El cálculo debe operar indistintamente sobre km, millas, horas o meses según el tipo de unidad de la pieza y del activo. Algunos equipos rastrean dos unidades a la vez (ej. km y horas).

---

### 9. Resiliencia: degradación elegante y self-healing

El sistema es "self-healing" en dos capas. Es importante entender qué significa y qué no.

**No significa** auto-corrección de diagramas. Un sistema no puede saber que un diagrama está "mal" sin una verdad de referencia. No hay auto-reparación mágica del contenido.

**Sí significa:**

- **Resolución con respaldo.** Nunca se muestra algo roto o vacío; se degrada al mejor recurso disponible (§7).
- **Puerta de validación.** Toda plantilla y todo mapeo pasan un chequeo antes de entrar a la base: SVG/imagen válido, todas las zonas con identificador, todas las zonas mapeadas a categorías. Lo malformado se rechaza, nunca se sirve.
- **Chequeos de integridad.** Un proceso periódico detecta zonas sin mapear, piezas sin zona, referencias huérfanas, e inconsistencias, y las marca para revisión.
- **Cola de mejora.** Cada respaldo por debajo del nivel 1 registra automáticamente el hueco de cobertura. Eso alimenta un backlog que un curador cierra. El sistema detecta sus propias carencias y se completa con el tiempo.

**Capa de infraestructura.** Aparte de lo anterior, aplican las prácticas estándar: health checks, reintentos automáticos, reinicio de servicios caídos, circuit breakers, colas con reintento para los trabajos de ingestión.

---

### 10. Stack tecnológico recomendado

Recomendaciones de partida; el equipo debe validarlas según su experiencia.

- **Base de datos: PostgreSQL.** Los datos son profundamente relacionales; es la elección natural.
- **Backend:** el framework que el equipo domine (NestJS/Node, Django, Rails, Laravel, .NET). Django tiene una ventaja concreta: su panel de administración facilita gestionar los datos de referencia (marcas, modelos, años).
- **Frontend: React.** El diagrama es SVG interactivo (zonas y hotspots como elementos clicables).
- **Móvil:** como mínimo web responsive; idealmente una PWA para que los mecánicos registren lecturas y consulten historial desde el celular.
- **Almacenamiento de objetos:** un servicio compatible con S3 para los documentos del corpus, los renders y las fotos de las órdenes de trabajo.
- **Servicio de ingestión y reconocimiento:** conviene un servicio aparte, probablemente en Python por el ecosistema de visión. Componentes a evaluar: librerías de parsing de PDF, OCR (Tesseract es una opción libre y estable), extracción de tablas, y un modelo de detección de objetos para los callouts. Para segmentación, evaluar modelos tipo "segment anything" como punto de partida, midiendo su desempeño real sobre line-art antes de comprometerse. Una cola de trabajos conecta este servicio con el resto.
- **Decodificación de VIN:** la API vPIC de la NHTSA es gratuita para vehículos de calle de mercado norteamericano. La maquinaria todoterreno usa números de serie con esquemas propios de cada fabricante: ahí, entrada manual.

---

### 11. Taxonomía de equipos para v1

Los cuatro dominios cubren aproximadamente 30 clases de equipo. Esta lista define el alcance de los renders genéricos a producir. El equipo debe priorizar las clases más comunes para su mercado.

**Limpieza:** barredora vial, barredora compacta/de aceras, fregadora-secadora (ride-on), fregadora walk-behind, aspiradora industrial, hidrolavadora, camión cisterna / hidrolimpiador de alcantarillas.

**Mantenimiento:** camión grúa / canasta, plataforma elevadora (tijera o brazo), generador, compresor de aire, planta de soldar, montacargas, minicargador, retroexcavadora, camioneta de servicio, tractor cortacésped.

**Recolección:** camión recolector compactador (carga trasera), camión de carga lateral, camión portacontenedores (roll-off), camión volquete, contenedor/dumpster.

**Fumigación:** camión nebulizador, atomizadora/aspersora montada, equipo de fumigación remolcable, nebulizadora portátil (ULV), termonebulizadora, fumigadora de mochila, tractor con tanque aspersor.

---

### 12. Hoja de ruta por fases

El orden está pensado para entregar valor temprano. El error a evitar es empezar por el diagrama: es la fase 2, no la 0.

- **Fase 0 — Núcleo.** Modelo de datos, registro de activos, catálogo de piezas, bitácora manual de mantenimiento. Ya es un producto usable.
- **Fase 1 — Mantenimiento.** Órdenes de trabajo, planes preventivos, lecturas de medidor, cálculo de vida útil, panel de "vencido y próximo".
- **Fase 2 — Motor de diagramas.** Renders genéricos por clase, zonas, coloreado por estado, hotspots colocados manualmente vía el mapeador.
- **Fase 3 — Ingestión y reconocimiento.** Repositorio documental y pipeline de reconocimiento que auto-puebla datos y borradores de hotspots.
- **Fase 4 — Inventario y costos.** Stock de piezas, proveedores, reorden, costos y facturación.
- **Fase 5 — Extensiones.** Decodificación de VIN, fotos en órdenes, reportes, integración de telemetría/odómetro, portal de clientes.

---

### 13. Decisiones abiertas y riesgos

El equipo debe resolver lo siguiente antes o durante el diseño detallado:

- **Multi-tenancy.** ¿El sistema es para un solo taller o un SaaS para muchos? Es una bifurcación arquitectónica costosa de cambiar después. Decidir primero.
- **Estrategia de cobertura documental.** Cómo se obtienen los documentos OEM dado que muchos están restringidos. Definir el flujo de carga manual.
- **Revisión legal.** Validar el uso de documentos OEM como insumo de reconocimiento y asegurar que lo publicado sean activos propios.
- **Capacidad de curaduría.** El reconocimiento produce borradores; alguien los aprueba. Dimensionar ese rol según el ritmo de incorporación de modelos.
- **Calidad variable de documentos.** El esfuerzo humano escala inversamente con la calidad del documento; planificar para escaneos de baja calidad.
- **Renders de v1.** Decidir cómo se producen los ~25-30 renders genéricos (ilustrador contratado, recursos de licencia libre re-trabajados, o producción interna) y su presupuesto.

---

*Fin del documento base. El siguiente paso recomendado es el diseño detallado del modelo de datos (§6) y la definición del servicio de ingestión (§5), que son los dos componentes de mayor riesgo técnico.*
