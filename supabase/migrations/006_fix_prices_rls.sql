-- Permitir UPDATE en medication_prices desde el backend (anon key o service role)
-- Los precios no son datos sensibles de usuarios

DROP POLICY IF EXISTS "prices_backend_update" ON medication_prices;
CREATE POLICY "prices_backend_update"
  ON medication_prices FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Verificar políticas activas
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'medication_prices';
