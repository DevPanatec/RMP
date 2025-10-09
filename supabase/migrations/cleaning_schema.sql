-- ============================================
-- MÓDULO DE LIMPIEZA - SCHEMA
-- ============================================

-- Tabla: salas
-- Almacena las salas/ubicaciones disponibles
CREATE TABLE IF NOT EXISTS salas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(255) NOT NULL,
  descripcion TEXT,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabla: areas
-- Áreas específicas dentro de cada sala
CREATE TABLE IF NOT EXISTS areas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sala_id UUID NOT NULL REFERENCES salas(id) ON DELETE CASCADE,
  nombre VARCHAR(255) NOT NULL,
  descripcion TEXT,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabla: cleaning_assignments
-- Asignaciones de limpieza con fecha, hora y ubicación
CREATE TABLE IF NOT EXISTS cleaning_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sala_id UUID NOT NULL REFERENCES salas(id) ON DELETE CASCADE,
  area_id UUID NOT NULL REFERENCES areas(id) ON DELETE CASCADE,
  fecha DATE NOT NULL,
  hora TIME NOT NULL,
  estado VARCHAR(50) DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'en_progreso', 'completado', 'cancelado')),
  notas TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabla: cleaning_photos
-- Evidencias fotográficas (antes, durante, después)
CREATE TABLE IF NOT EXISTS cleaning_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES cleaning_assignments(id) ON DELETE CASCADE,
  etapa VARCHAR(20) NOT NULL CHECK (etapa IN ('antes', 'durante', 'despues')),
  file_name VARCHAR(255) NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  mime_type VARCHAR(100),
  uploaded_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para mejorar performance
CREATE INDEX IF NOT EXISTS idx_areas_sala_id ON areas(sala_id);
CREATE INDEX IF NOT EXISTS idx_assignments_sala_id ON cleaning_assignments(sala_id);
CREATE INDEX IF NOT EXISTS idx_assignments_area_id ON cleaning_assignments(area_id);
CREATE INDEX IF NOT EXISTS idx_assignments_fecha ON cleaning_assignments(fecha DESC);
CREATE INDEX IF NOT EXISTS idx_assignments_estado ON cleaning_assignments(estado);
CREATE INDEX IF NOT EXISTS idx_photos_assignment_id ON cleaning_photos(assignment_id);
CREATE INDEX IF NOT EXISTS idx_photos_etapa ON cleaning_photos(etapa);

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_salas_updated_at BEFORE UPDATE ON salas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_areas_updated_at BEFORE UPDATE ON areas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cleaning_assignments_updated_at BEFORE UPDATE ON cleaning_assignments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comentarios en tablas
COMMENT ON TABLE salas IS 'Salas o ubicaciones disponibles para limpieza';
COMMENT ON TABLE areas IS 'Áreas específicas dentro de cada sala';
COMMENT ON TABLE cleaning_assignments IS 'Asignaciones de tareas de limpieza';
COMMENT ON TABLE cleaning_photos IS 'Evidencias fotográficas de las tareas de limpieza';

-- Insertar datos de ejemplo (salas y áreas)
INSERT INTO salas (nombre, descripcion) VALUES
  ('Sala Principal', 'Área principal del edificio'),
  ('Sala de Juntas', 'Sala de reuniones y conferencias'),
  ('Oficinas Administrativas', 'Área de oficinas del personal administrativo'),
  ('Área de Recepción', 'Recepción y sala de espera'),
  ('Baños', 'Baños y sanitarios'),
  ('Cocina/Comedor', 'Área de cocina y comedor')
ON CONFLICT DO NOTHING;

-- Insertar áreas para cada sala
WITH sala_ids AS (
  SELECT id, nombre FROM salas
)
INSERT INTO areas (sala_id, nombre)
SELECT id, area_nombre FROM (
  SELECT s.id, unnest(ARRAY['Área General', 'Zona de Espera', 'Recepción']) as area_nombre
  FROM sala_ids s WHERE s.nombre = 'Sala Principal'
  UNION ALL
  SELECT s.id, unnest(ARRAY['Mesa Principal', 'Área de Proyección', 'Mobiliario'])
  FROM sala_ids s WHERE s.nombre = 'Sala de Juntas'
  UNION ALL
  SELECT s.id, unnest(ARRAY['Escritorios', 'Archivadores', 'Área Común'])
  FROM sala_ids s WHERE s.nombre = 'Oficinas Administrativas'
  UNION ALL
  SELECT s.id, unnest(ARRAY['Mostrador', 'Sala de Espera', 'Entrada'])
  FROM sala_ids s WHERE s.nombre = 'Área de Recepción'
  UNION ALL
  SELECT s.id, unnest(ARRAY['Sanitarios', 'Lavamanos', 'Espejos'])
  FROM sala_ids s WHERE s.nombre = 'Baños'
  UNION ALL
  SELECT s.id, unnest(ARRAY['Área de Cocina', 'Mesas', 'Electrodomésticos'])
  FROM sala_ids s WHERE s.nombre = 'Cocina/Comedor'
) AS area_data
ON CONFLICT DO NOTHING;
