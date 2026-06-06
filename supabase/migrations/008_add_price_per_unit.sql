-- Agregar columnas para precio por unidad y cantidad de unidades
ALTER TABLE medication_prices
  ADD COLUMN IF NOT EXISTS price_per_unit NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS units_per_pack INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS product_name TEXT;

-- Ejecutar en Supabase Dashboard → SQL Editor
