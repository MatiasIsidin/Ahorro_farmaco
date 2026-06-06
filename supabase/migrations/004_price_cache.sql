-- ============================================================
-- MIGRACIÓN 004 — Tabla de caché de precios dinámicos
-- Proyecto: vggyvqvwqoudnfupykvx
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- ============================================================

-- Esta tabla almacena precios obtenidos dinámicamente por los
-- adaptadores de farmacia. Reemplaza la dependencia directa de
-- medication_prices como fuente primaria en el frontend.
-- Tiene un TTL de 30 minutos controlado por la columna updated_at.

CREATE TABLE IF NOT EXISTS price_cache (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  catalog_id text NOT NULL REFERENCES medications_catalog(id) ON DELETE CASCADE,
  pharmacy_id text NOT NULL REFERENCES pharmacies(id) ON DELETE CASCADE,
  price      numeric NOT NULL,
  has_stock  boolean DEFAULT true,
  promotion_text text,
  source     text DEFAULT 'adapter',  -- 'adapter' | 'fallback' | 'manual'
  updated_at timestamptz DEFAULT now(),
  UNIQUE(catalog_id, pharmacy_id)
);

-- Índices para consultas frecuentes
CREATE INDEX IF NOT EXISTS idx_price_cache_catalog ON price_cache(catalog_id);
CREATE INDEX IF NOT EXISTS idx_price_cache_updated ON price_cache(updated_at);

-- RLS: los precios en caché son lectura pública (anon + authenticated)
ALTER TABLE price_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "price_cache_read_all"
  ON price_cache
  FOR SELECT
  USING (true);

-- Solo el backend (service_role) puede insertar/actualizar
CREATE POLICY "price_cache_write_service"
  ON price_cache
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ── VERIFICACIÓN ──
SELECT 'price_cache' AS tabla, COUNT(*) AS filas FROM price_cache;
