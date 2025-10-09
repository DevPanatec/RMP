-- ============================================
-- MÓDULO DE LIMPIEZA - ROW LEVEL SECURITY (RLS)
-- ============================================

-- Habilitar RLS en todas las tablas
ALTER TABLE salas ENABLE ROW LEVEL SECURITY;
ALTER TABLE areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE cleaning_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE cleaning_photos ENABLE ROW LEVEL SECURITY;

-- ============================================
-- POLÍTICAS PARA TABLA: salas
-- ============================================

-- Todos pueden leer salas activas
CREATE POLICY "Salas son visibles para todos los usuarios autenticados"
  ON salas FOR SELECT
  TO authenticated
  USING (activo = true);

-- Solo admin puede insertar salas
CREATE POLICY "Solo admin puede crear salas"
  ON salas FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM perfiles_usuarios
      WHERE id = auth.uid()
      AND tipo_usuario = 'admin'
    )
  );

-- Solo admin puede actualizar salas
CREATE POLICY "Solo admin puede actualizar salas"
  ON salas FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM perfiles_usuarios
      WHERE id = auth.uid()
      AND tipo_usuario = 'admin'
    )
  );

-- Solo admin puede eliminar salas
CREATE POLICY "Solo admin puede eliminar salas"
  ON salas FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM perfiles_usuarios
      WHERE id = auth.uid()
      AND tipo_usuario = 'admin'
    )
  );

-- ============================================
-- POLÍTICAS PARA TABLA: areas
-- ============================================

-- Todos pueden leer áreas activas
CREATE POLICY "Áreas son visibles para todos los usuarios autenticados"
  ON areas FOR SELECT
  TO authenticated
  USING (activo = true);

-- Solo admin puede insertar áreas
CREATE POLICY "Solo admin puede crear áreas"
  ON areas FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM perfiles_usuarios
      WHERE id = auth.uid()
      AND tipo_usuario = 'admin'
    )
  );

-- Solo admin puede actualizar áreas
CREATE POLICY "Solo admin puede actualizar áreas"
  ON areas FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM perfiles_usuarios
      WHERE id = auth.uid()
      AND tipo_usuario = 'admin'
    )
  );

-- Solo admin puede eliminar áreas
CREATE POLICY "Solo admin puede eliminar áreas"
  ON areas FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM perfiles_usuarios
      WHERE id = auth.uid()
      AND tipo_usuario = 'admin'
    )
  );

-- ============================================
-- POLÍTICAS PARA TABLA: cleaning_assignments
-- ============================================

-- Todos los usuarios autenticados pueden ver asignaciones
CREATE POLICY "Asignaciones son visibles para todos los usuarios autenticados"
  ON cleaning_assignments FOR SELECT
  TO authenticated
  USING (true);

-- Solo admin puede crear asignaciones
CREATE POLICY "Solo admin puede crear asignaciones"
  ON cleaning_assignments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM perfiles_usuarios
      WHERE id = auth.uid()
      AND tipo_usuario = 'admin'
    )
  );

-- Solo admin puede actualizar asignaciones
CREATE POLICY "Solo admin puede actualizar asignaciones"
  ON cleaning_assignments FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM perfiles_usuarios
      WHERE id = auth.uid()
      AND tipo_usuario = 'admin'
    )
  );

-- Solo admin puede eliminar asignaciones
CREATE POLICY "Solo admin puede eliminar asignaciones"
  ON cleaning_assignments FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM perfiles_usuarios
      WHERE id = auth.uid()
      AND tipo_usuario = 'admin'
    )
  );

-- ============================================
-- POLÍTICAS PARA TABLA: cleaning_photos
-- ============================================

-- Todos los usuarios autenticados pueden ver fotos
CREATE POLICY "Fotos son visibles para todos los usuarios autenticados"
  ON cleaning_photos FOR SELECT
  TO authenticated
  USING (true);

-- Solo admin puede subir fotos
CREATE POLICY "Solo admin puede subir fotos"
  ON cleaning_photos FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM perfiles_usuarios
      WHERE id = auth.uid()
      AND tipo_usuario = 'admin'
    )
  );

-- Solo admin puede eliminar fotos
CREATE POLICY "Solo admin puede eliminar fotos"
  ON cleaning_photos FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM perfiles_usuarios
      WHERE id = auth.uid()
      AND tipo_usuario = 'admin'
    )
  );
