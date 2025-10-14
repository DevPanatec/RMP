-- =====================================================
-- MÓDULO DE MANTENIMIENTO - PLANTA DE TRATAMIENTO
-- =====================================================

-- Tabla de Tareas de Mantenimiento
CREATE TABLE IF NOT EXISTS maintenance_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type VARCHAR(20) NOT NULL CHECK (type IN ('preventivo', 'correctivo', 'contingencia')),
    scheduled_date DATE NOT NULL,
    scheduled_time TIME NOT NULL,
    observations TEXT,
    operational_data JSONB,
    status VARCHAR(20) NOT NULL DEFAULT 'programada' CHECK (status IN ('programada', 'en_proceso', 'completada')),
    images_before TEXT[],
    images_during TEXT[],
    images_after TEXT[],
    completed_at TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de Alertas de Mantenimiento
CREATE TABLE IF NOT EXISTS maintenance_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID REFERENCES maintenance_tasks(id) ON DELETE CASCADE,
    equipment_id VARCHAR(100),
    type VARCHAR(50) NOT NULL CHECK (type IN ('task_reminder', 'equipment_maintenance')),
    message TEXT NOT NULL,
    scheduled_date TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'dismissed')),
    severity VARCHAR(20) NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'critical')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_maintenance_tasks_scheduled_date ON maintenance_tasks(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_maintenance_tasks_status ON maintenance_tasks(status);
CREATE INDEX IF NOT EXISTS idx_maintenance_tasks_type ON maintenance_tasks(type);
CREATE INDEX IF NOT EXISTS idx_maintenance_tasks_created_by ON maintenance_tasks(created_by);
CREATE INDEX IF NOT EXISTS idx_maintenance_alerts_task_id ON maintenance_alerts(task_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_alerts_status ON maintenance_alerts(status);
CREATE INDEX IF NOT EXISTS idx_maintenance_alerts_scheduled_date ON maintenance_alerts(scheduled_date);

-- Políticas de seguridad RLS (Row Level Security)
ALTER TABLE maintenance_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_alerts ENABLE ROW LEVEL SECURITY;

-- Política: Admin puede ver todas las tareas
CREATE POLICY "Admin puede ver todas las tareas de mantenimiento"
    ON maintenance_tasks FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM usuarios
            WHERE usuarios.id = auth.uid()
            AND usuarios.tipo = 'admin'
        )
    );

-- Política: Enterprise puede ver todas las tareas
CREATE POLICY "Enterprise puede ver todas las tareas de mantenimiento"
    ON maintenance_tasks FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM usuarios
            WHERE usuarios.id = auth.uid()
            AND usuarios.tipo = 'enterprise'
        )
    );

-- Política: Admin puede insertar tareas
CREATE POLICY "Admin puede crear tareas de mantenimiento"
    ON maintenance_tasks FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM usuarios
            WHERE usuarios.id = auth.uid()
            AND usuarios.tipo = 'admin'
        )
    );

-- Política: Admin puede actualizar tareas
CREATE POLICY "Admin puede actualizar tareas de mantenimiento"
    ON maintenance_tasks FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM usuarios
            WHERE usuarios.id = auth.uid()
            AND usuarios.tipo = 'admin'
        )
    );

-- Política: Admin puede eliminar tareas
CREATE POLICY "Admin puede eliminar tareas de mantenimiento"
    ON maintenance_tasks FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM usuarios
            WHERE usuarios.id = auth.uid()
            AND usuarios.tipo = 'admin'
        )
    );

-- Políticas para alertas
CREATE POLICY "Admin y Enterprise pueden ver alertas"
    ON maintenance_alerts FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM usuarios
            WHERE usuarios.id = auth.uid()
            AND usuarios.tipo IN ('admin', 'enterprise')
        )
    );

CREATE POLICY "Admin puede crear alertas"
    ON maintenance_alerts FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM usuarios
            WHERE usuarios.id = auth.uid()
            AND usuarios.tipo = 'admin'
        )
    );

CREATE POLICY "Admin puede actualizar alertas"
    ON maintenance_alerts FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM usuarios
            WHERE usuarios.id = auth.uid()
            AND usuarios.tipo = 'admin'
        )
    );

CREATE POLICY "Admin puede eliminar alertas"
    ON maintenance_alerts FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM usuarios
            WHERE usuarios.id = auth.uid()
            AND usuarios.tipo = 'admin'
        )
    );

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_maintenance_tasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar updated_at
DROP TRIGGER IF EXISTS maintenance_tasks_updated_at_trigger ON maintenance_tasks;
CREATE TRIGGER maintenance_tasks_updated_at_trigger
    BEFORE UPDATE ON maintenance_tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_maintenance_tasks_updated_at();

-- Comentarios para documentación
COMMENT ON TABLE maintenance_tasks IS 'Tareas de mantenimiento de la planta de tratamiento';
COMMENT ON TABLE maintenance_alerts IS 'Alertas y recordatorios de mantenimiento';
COMMENT ON COLUMN maintenance_tasks.operational_data IS 'Datos operativos en formato JSON: {volume_discharged, cost_per_gallon, total_estimated_cost, cleanup_type, work_duration, technical_observations}';
COMMENT ON COLUMN maintenance_tasks.type IS 'Tipo de mantenimiento: preventivo, correctivo o contingencia';
COMMENT ON COLUMN maintenance_tasks.status IS 'Estado de la tarea: programada, en_proceso o completada';
COMMENT ON COLUMN maintenance_alerts.type IS 'Tipo de alerta: task_reminder (recordatorio de tarea) o equipment_maintenance (mantenimiento de equipo)';
COMMENT ON COLUMN maintenance_alerts.severity IS 'Severidad de la alerta: info, warning o critical';
