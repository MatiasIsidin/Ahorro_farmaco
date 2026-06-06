-- Marcar los precios del seed como actualizados ahora
-- Ejecutar solo una vez para que el caché de 24h funcione desde el inicio
UPDATE medication_prices
SET updated_at = NOW()
WHERE updated_at < NOW() - INTERVAL '1 hour';

-- Verificar
SELECT COUNT(*) as total, MIN(updated_at) as mas_antiguo, MAX(updated_at) as mas_reciente
FROM medication_prices;
