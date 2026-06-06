-- ============================================================
-- OBSERVABILIDAD FINAL — Production-grade
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- Proyecto: vggyvqvwqoudnfupykvx
-- ============================================================

-- ── 1. ERROR LOGS ────────────────────────────────────────────

DROP TABLE IF EXISTS error_logs CASCADE;

CREATE TABLE error_logs (
  id           UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  level        TEXT        NOT NULL CHECK (level IN ('warn', 'error')),
  message      TEXT        NOT NULL,
  stack        TEXT,
  component    TEXT,
  app_version  TEXT,
  route        TEXT,
  metadata     JSONB       DEFAULT '{}'::jsonb,
  user_id      UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Índices
CREATE INDEX idx_error_logs_user       ON error_logs(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_error_logs_level      ON error_logs(level, created_at DESC);
CREATE INDEX idx_error_logs_created    ON error_logs(created_at DESC);
CREATE INDEX idx_error_logs_version    ON error_logs(app_version, created_at DESC);

-- RLS
ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;

-- INSERT: usuario autenticado puede insertar sus propios logs
--         o logs anónimos (user_id IS NULL) para errores pre-auth
CREATE POLICY "error_logs_insert"
  ON error_logs FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    OR user_id IS NULL
  );

-- SELECT: solo el dueño puede leer sus propios logs
CREATE POLICY "error_logs_select_own"
  ON error_logs FOR SELECT
  USING (user_id = auth.uid());

-- UPDATE/DELETE: BLOQUEADO desde cliente (solo service_role)
-- No se crean políticas UPDATE/DELETE → acceso denegado por defecto

-- Retención automática: función para limpiar logs > 30 días
CREATE OR REPLACE FUNCTION cleanup_old_error_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM error_logs WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$;

-- ── 2. ANALYTICS EVENTS ──────────────────────────────────────

DROP TABLE IF EXISTS analytics_events CASCADE;

CREATE TABLE analytics_events (
  id           UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  event_name   TEXT        NOT NULL,
  route        TEXT,
  metadata     JSONB       DEFAULT '{}'::jsonb,
  user_id      UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id   TEXT,
  device_info  JSONB       DEFAULT '{}'::jsonb,
  app_version  TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW() NOT NULL
  -- NUNCA almacenar: nombres de medicamentos, patologías, datos médicos
);

-- Índices para queries de analytics
CREATE INDEX idx_analytics_event_name  ON analytics_events(event_name, created_at DESC);
CREATE INDEX idx_analytics_session     ON analytics_events(session_id);
CREATE INDEX idx_analytics_created     ON analytics_events(created_at DESC);
CREATE INDEX idx_analytics_user        ON analytics_events(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_analytics_route       ON analytics_events(route, event_name);

-- RLS
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

-- INSERT: cualquier usuario autenticado puede insertar
CREATE POLICY "analytics_insert_authenticated"
  ON analytics_events FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    OR user_id IS NULL
  );

-- SELECT: solo el dueño puede leer sus propios eventos
CREATE POLICY "analytics_select_own"
  ON analytics_events FOR SELECT
  USING (user_id = auth.uid());

-- UPDATE/DELETE: BLOQUEADO desde cliente

-- ── 3. ÍNDICES DE PERFORMANCE PARA TABLAS EXISTENTES ─────────
-- (idempotentes — IF NOT EXISTS)

CREATE INDEX IF NOT EXISTS idx_family_profiles_user
  ON family_profiles(user_id);

CREATE INDEX IF NOT EXISTS idx_user_medications_profile
  ON user_medications(profile_id);

CREATE INDEX IF NOT EXISTS idx_user_medications_catalog
  ON user_medications(catalog_id);

CREATE INDEX IF NOT EXISTS idx_alerts_profile_active
  ON alerts(profile_id, is_active)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_alerts_user_unread
  ON alerts(user_id, is_read)
  WHERE is_read = false;

CREATE INDEX IF NOT EXISTS idx_prescriptions_profile
  ON prescriptions(profile_id);

CREATE INDEX IF NOT EXISTS idx_prescriptions_expiry
  ON prescriptions(expiration_date)
  WHERE expiration_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_savings_records_user
  ON savings_records(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_shopping_carts_user_active
  ON shopping_carts(user_id, status)
  WHERE status = 'active';

-- ── 4. VERIFICACIÓN FINAL ─────────────────────────────────────
-- Ejecutar para confirmar que todo está correcto:
--
-- SELECT tablename, rowsecurity
-- FROM pg_tables
-- WHERE schemaname = 'public'
--   AND tablename IN ('error_logs', 'analytics_events');
--
-- SELECT schemaname, tablename, policyname, cmd, qual
-- FROM pg_policies
-- WHERE tablename IN ('error_logs', 'analytics_events')
-- ORDER BY tablename, cmd;
