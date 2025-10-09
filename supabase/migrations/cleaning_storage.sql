-- ============================================
-- MÓDULO DE LIMPIEZA - STORAGE BUCKET
-- ============================================

-- Crear bucket para fotos de limpieza
INSERT INTO storage.buckets (id, name, public)
VALUES ('cleaning-evidences', 'cleaning-evidences', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas de Storage para el bucket cleaning-evidences

-- Permitir a usuarios autenticados subir fotos
CREATE POLICY "Usuarios autenticados pueden subir fotos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'cleaning-evidences');

-- Permitir a todos ver las fotos (bucket público)
CREATE POLICY "Todos pueden ver fotos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'cleaning-evidences');

-- Permitir a usuarios autenticados eliminar sus fotos
CREATE POLICY "Usuarios autenticados pueden eliminar fotos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'cleaning-evidences');
