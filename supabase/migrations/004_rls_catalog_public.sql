-- ============================================================
-- MIGRACIÓN 004 — RLS para tablas de catálogo (lectura pública)
-- medications_catalog, pharmacies, medication_prices, price_history
-- son datos de referencia — no contienen datos de usuarios.
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- ============================================================

-- ── medications_catalog — lectura pública, escritura solo service_role ──
ALTER TABLE medications_catalog ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "catalog_public_read" ON medications_catalog;
CREATE POLICY "catalog_public_read"
  ON medications_catalog FOR SELECT
  USING (true);

-- ── pharmacies — lectura pública ──────────────────────────────
ALTER TABLE pharmacies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pharmacies_public_read" ON pharmacies;
CREATE POLICY "pharmacies_public_read"
  ON pharmacies FOR SELECT
  USING (true);

-- ── medication_prices — lectura pública, INSERT/UPDATE sin restricción de usuario ──
ALTER TABLE medication_prices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "prices_public_read" ON medication_prices;
CREATE POLICY "prices_public_read"
  ON medication_prices FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "prices_backend_write" ON medication_prices;
CREATE POLICY "prices_backend_write"
  ON medication_prices FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "prices_backend_update" ON medication_prices;
CREATE POLICY "prices_backend_update"
  ON medication_prices FOR UPDATE
  USING (true);

-- ── price_history — lectura pública ──────────────────────────
ALTER TABLE price_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "price_history_public_read" ON price_history;
CREATE POLICY "price_history_public_read"
  ON price_history FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "price_history_backend_write" ON price_history;
CREATE POLICY "price_history_backend_write"
  ON price_history FOR INSERT
  WITH CHECK (true);

-- ── Verificar políticas activas ───────────────────────────────
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE tablename IN ('medications_catalog','pharmacies','medication_prices','price_history')
ORDER BY tablename, cmd;
