-- Precios reales obtenidos de Cruz Verde y Dr. Simi — 02-06-2026
-- Cruz Verde via SFCC API (client_id: c19ce24d-...)
-- Dr. Simi via VTEX catalog API (pública)

INSERT INTO medication_prices (catalog_id, pharmacy_id, price, has_stock, promotion_text, updated_at) VALUES
  -- Cruz Verde precios reales
  ('med-001', 'cv', 1890,  true, '', NOW()),
  ('med-002', 'cv', 9140,  true, '', NOW()),
  ('med-003', 'cv', 2290,  true, '', NOW()),
  ('med-004', 'cv', 10390, true, '', NOW()),
  ('med-005', 'cv', 3590,  true, '', NOW()),
  ('med-006', 'cv', 5890,  true, '', NOW()),
  ('med-007', 'cv', 2390,  true, '', NOW()),
  ('med-008', 'cv', 2690,  true, '', NOW()),
  ('med-009', 'cv', 1390,  true, '', NOW()),
  ('med-010', 'cv', 8890,  true, '', NOW()),
  -- Bioequivalentes Cruz Verde (mismo precio que el original)
  ('med-001b', 'cv', 1890, true, '', NOW()),
  ('med-002b', 'cv', 9140, true, '', NOW()),
  ('med-005b', 'cv', 3590, true, '', NOW()),
  ('med-008b', 'cv', 2690, true, '', NOW()),
  -- Medicamentos extra Cruz Verde
  ('med-011', 'cv', 14590, true, '', NOW()),
  ('med-012', 'cv', 15540, true, '', NOW()),
  ('med-013', 'cv', 3390,  true, '', NOW()),
  ('med-014', 'cv', 2440,  true, '', NOW()),

  -- Dr. Simi precios reales
  ('med-001', 'drs', 3200, true, '', NOW()),
  ('med-002', 'drs', 2600, true, '', NOW()),
  ('med-003', 'drs', 6280, true, '', NOW()),
  ('med-004', 'drs', 7920, true, '', NOW()),
  ('med-005', 'drs', 4200, true, '', NOW()),
  ('med-006', 'drs', 3800, true, '', NOW()),
  ('med-007', 'drs', 1680, true, '', NOW()),
  ('med-008', 'drs', 1560, true, '', NOW()),
  ('med-009', 'drs', 3200, true, '', NOW()),
  ('med-010', 'drs', 6880, true, '', NOW()),
  -- Medicamentos extra Dr. Simi
  ('med-011', 'drs', 5920, true, '', NOW()),
  ('med-012', 'drs', 8000, true, '', NOW()),
  ('med-013', 'drs', 2240, true, '', NOW()),
  ('med-014', 'drs', 1200, true, '', NOW()),

  -- Actualizar también el updated_at de Salcobrand/Ahumada/Knop (precios referencia)
  ('med-001', 'sal', 9490, true,  '10% con tarjeta Salcobrand', NOW()),
  ('med-001', 'fah', 8790, true,  '', NOW()),
  ('med-001', 'knp', 7990, false, '', NOW()),
  ('med-002', 'sal', 6490, true,  '2x1 en segunda unidad', NOW()),
  ('med-002', 'fah', 5790, true,  '', NOW()),
  ('med-002', 'knp', 5490, true,  '', NOW()),
  ('med-003', 'sal', 13490, true, '15% con app Salcobrand', NOW()),
  ('med-003', 'fah', 11990, true, '', NOW()),
  ('med-003', 'knp', 10990, true, '', NOW()),
  ('med-004', 'sal', 7990,  true, '', NOW()),
  ('med-004', 'fah', 7290,  false,'', NOW()),
  ('med-004', 'knp', 6490,  true, '', NOW()),
  ('med-005', 'sal', 11990, true, '', NOW()),
  ('med-005', 'fah', 10990, true, '20% segunda unidad', NOW()),
  ('med-005', 'knp', 9490,  true, '', NOW()),
  ('med-006', 'sal', 19490, true, '', NOW()),
  ('med-006', 'fah', 17990, true, '', NOW()),
  ('med-006', 'knp', 15990, true, '', NOW()),
  ('med-007', 'sal', 6990,  true, '', NOW()),
  ('med-007', 'fah', 6290,  true, '10% descuento', NOW()),
  ('med-007', 'knp', 5490,  true, '', NOW()),
  ('med-008', 'sal', 5490,  true, '', NOW()),
  ('med-008', 'fah', 4790,  true, '', NOW()),
  ('med-008', 'knp', 3990,  true, '', NOW()),
  ('med-009', 'sal', 4990,  true, '', NOW()),
  ('med-009', 'fah', 4290,  true, '', NOW()),
  ('med-009', 'knp', 3990,  false,'', NOW()),
  ('med-010', 'sal', 10490, true, '', NOW()),
  ('med-010', 'fah', 9490,  true, '', NOW()),
  ('med-010', 'knp', 8490,  true, '', NOW()),
  ('med-001b','sal', 4990,  true, '', NOW()),
  ('med-001b','fah', 4290,  true, '', NOW()),
  ('med-001b','knp', 3990,  true, '', NOW()),
  ('med-001b','drs', 2990,  true, '', NOW()),
  ('med-002b','sal', 3490,  true, '', NOW()),
  ('med-002b','fah', 2890,  false,'', NOW()),
  ('med-002b','knp', 2790,  true, '', NOW()),
  ('med-002b','drs', 1990,  true, '', NOW()),
  ('med-005b','sal', 6490,  true, '', NOW()),
  ('med-005b','fah', 5490,  true, '', NOW()),
  ('med-005b','knp', 4990,  true, '', NOW()),
  ('med-005b','drs', 3490,  true, '', NOW()),
  ('med-008b','sal', 2990,  true, '', NOW()),
  ('med-008b','fah', 2290,  true, '', NOW()),
  ('med-008b','knp', 1990,  true, '', NOW()),
  ('med-008b','drs', 1490,  true, '', NOW())
ON CONFLICT (catalog_id, pharmacy_id) DO UPDATE SET
  price          = EXCLUDED.price,
  has_stock      = EXCLUDED.has_stock,
  promotion_text = EXCLUDED.promotion_text,
  updated_at     = EXCLUDED.updated_at;

-- Verificar
SELECT pharmacy_id, COUNT(*) as medicamentos, MIN(price) as min_precio, MAX(price) as max_precio
FROM medication_prices
GROUP BY pharmacy_id
ORDER BY pharmacy_id;
