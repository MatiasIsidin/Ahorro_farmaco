-- ============================================================
-- OBSERVABILIDAD — Tablas de soporte para producción
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- ── Error logs (frontend errors) ────────────────────────────
CREATE TABLE IF NOT EXISTS error_logs (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  level       TEXT NOT NULL CHECK (level IN ('warn', 'error')),
  message     TEXT NOT NULL,
  context     JSONB,
  user_id     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Solo el propio usuario puede ver sus errores; service_role puede leer todos
ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own error logs"
  ON error_logs FOR INSERT
  WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

-- Retención: eliminar logs > 30 días (ejecutar como cron o manualmente)
-- DELETE FROM error_logs WHERE created_at < NOW() - INTERVAL '30 days';

-- ── Analytics events (privacy-safe) ─────────────────────────
CREATE TABLE IF NOT EXISTS analytics_events (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event       TEXT NOT NULL,
  session_id  TEXT,
  properties  JSONB,
  page        TEXT,
  timestamp   TIMESTAMPTZ DEFAULT NOW()
  -- Sin user_id para privacidad — solo session_id anónimo
);

ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

-- Solo inserción anónima permitida; lectura solo para service_role
CREATE POLICY "Anyone can insert analytics"
  ON analytics_events FOR INSERT
  WITH CHECK (true);

-- Índice para queries de analytics
CREATE INDEX IF NOT EXISTS idx_analytics_event ON analytics_events(event, timestamp);
CREATE INDEX IF NOT EXISTS idx_analytics_session ON analytics_events(session_id);

-- ── Índices de performance para tablas existentes ────────────
CREATE INDEX IF NOT EXISTS idx_user_medications_profile
  ON user_medications(profile_id);

CREATE INDEX IF NOT EXISTS idx_alerts_profile_active
  ON alerts(profile_id, is_active)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_prescriptions_profile
  ON prescriptions(profile_id);

CREATE INDEX IF NOT EXISTS idx_savings_records_user
  ON savings_records(user_id, created_at DESC);
