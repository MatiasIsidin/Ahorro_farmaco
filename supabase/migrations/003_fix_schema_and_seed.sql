-- ============================================================
-- MIGRACIÓN 003 — Fix schema UUID→TEXT + Seed catálogo completo
-- Proyecto: vggyvqvwqoudnfupykvx
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- ============================================================

-- ── 1. SOLTAR TODAS LAS FKs QUE BLOQUEAN EL CAMBIO DE TIPO ──

ALTER TABLE user_medications    DROP CONSTRAINT IF EXISTS user_medications_catalog_id_fkey;
ALTER TABLE medication_prices   DROP CONSTRAINT IF EXISTS medication_prices_catalog_id_fkey;
ALTER TABLE medication_prices   DROP CONSTRAINT IF EXISTS medication_prices_pharmacy_id_fkey;
ALTER TABLE price_history       DROP CONSTRAINT IF EXISTS price_history_catalog_id_fkey;
ALTER TABLE cart_items          DROP CONSTRAINT IF EXISTS cart_items_catalog_id_fkey;
ALTER TABLE savings_records     DROP CONSTRAINT IF EXISTS savings_records_pharmacy_id_fkey;
ALTER TABLE medications_catalog DROP CONSTRAINT IF EXISTS medications_catalog_bioequivalent_of_id_fkey;

-- ── 2. CAMBIAR TIPOS A TEXT ───────────────────────────────────

ALTER TABLE medications_catalog
  ALTER COLUMN id                  TYPE TEXT,
  ALTER COLUMN bioequivalent_of_id TYPE TEXT;

ALTER TABLE pharmacies ALTER COLUMN id TYPE TEXT;

ALTER TABLE user_medications  ALTER COLUMN catalog_id  TYPE TEXT;
ALTER TABLE medication_prices ALTER COLUMN catalog_id  TYPE TEXT;
ALTER TABLE medication_prices ALTER COLUMN pharmacy_id TYPE TEXT;
ALTER TABLE price_history     ALTER COLUMN catalog_id  TYPE TEXT;
ALTER TABLE cart_items        ALTER COLUMN catalog_id  TYPE TEXT;
ALTER TABLE savings_records   ALTER COLUMN pharmacy_id TYPE TEXT;

-- ── 3. RECREAR FKs ────────────────────────────────────────────

ALTER TABLE medications_catalog
  ADD CONSTRAINT medications_catalog_bioequivalent_of_id_fkey
  FOREIGN KEY (bioequivalent_of_id) REFERENCES medications_catalog(id) ON DELETE SET NULL;

ALTER TABLE user_medications
  ADD CONSTRAINT user_medications_catalog_id_fkey
  FOREIGN KEY (catalog_id) REFERENCES medications_catalog(id) ON DELETE SET NULL;

ALTER TABLE medication_prices
  ADD CONSTRAINT medication_prices_catalog_id_fkey
  FOREIGN KEY (catalog_id) REFERENCES medications_catalog(id) ON DELETE CASCADE;

ALTER TABLE medication_prices
  ADD CONSTRAINT medication_prices_pharmacy_id_fkey
  FOREIGN KEY (pharmacy_id) REFERENCES pharmacies(id) ON DELETE CASCADE;

ALTER TABLE price_history
  ADD CONSTRAINT price_history_catalog_id_fkey
  FOREIGN KEY (catalog_id) REFERENCES medications_catalog(id) ON DELETE CASCADE;

ALTER TABLE cart_items
  ADD CONSTRAINT cart_items_catalog_id_fkey
  FOREIGN KEY (catalog_id) REFERENCES medications_catalog(id) ON DELETE SET NULL;

ALTER TABLE savings_records
  ADD CONSTRAINT savings_records_pharmacy_id_fkey
  FOREIGN KEY (pharmacy_id) REFERENCES pharmacies(id) ON DELETE SET NULL;

-- ── 4. SEED FARMACIAS ─────────────────────────────────────────

INSERT INTO pharmacies (id, name, logo, color) VALUES
  ('cv',  'Cruz Verde',        '💚', '#00a651'),
  ('sal', 'Salcobrand',        '💜', '#6b2fa0'),
  ('fah', 'Farmacias Ahumada', '🧡', '#e85d26'),
  ('drs', 'Dr. Simi',          '🤍', '#e32636'),
  ('knp', 'Farmacias Knop',    '💙', '#0072bc')
ON CONFLICT (id) DO UPDATE SET
  name  = EXCLUDED.name,
  logo  = EXCLUDED.logo,
  color = EXCLUDED.color;

-- ── 5. SEED CATÁLOGO DE MEDICAMENTOS ─────────────────────────

INSERT INTO medications_catalog
  (id, name, active_principle, dose, form, category,
   is_bioequivalent, bioequivalent_of_id, isp_certification,
   common_frequency, requires_prescription)
VALUES
  ('med-001', 'Losartán','Losartán potásico','50 mg','Comprimido recubierto','Antihipertensivo',false,NULL,NULL,'Cada 12 horas',true),
  ('med-001b','Losartán (Bioequivalente)','Losartán potásico','50 mg','Comprimido recubierto','Antihipertensivo',true,'med-001','BE-2024-0451','Cada 12 horas',true),
  ('med-002', 'Metformina','Metformina clorhidrato','850 mg','Comprimido recubierto','Antidiabético',false,NULL,NULL,'Cada 8 horas',true),
  ('med-002b','Metformina (Bioequivalente)','Metformina clorhidrato','850 mg','Comprimido recubierto','Antidiabético',true,'med-002','BE-2023-1287','Cada 8 horas',true),
  ('med-003', 'Atorvastatina','Atorvastatina cálcica','20 mg','Comprimido recubierto','Hipolipemiante',false,NULL,NULL,'Una vez al día',true),
  ('med-004', 'Levotiroxina','Levotiroxina sódica','100 mcg','Comprimido','Hormona tiroidea',false,NULL,NULL,'Una vez al día en ayunas',true),
  ('med-005', 'Sertralina','Sertralina clorhidrato','50 mg','Comprimido recubierto','Antidepresivo ISRS',false,NULL,NULL,'Una vez al día',true),
  ('med-005b','Sertralina (Bioequivalente)','Sertralina clorhidrato','50 mg','Comprimido recubierto','Antidepresivo ISRS',true,'med-005','BE-2024-0892','Una vez al día',true),
  ('med-006', 'Escitalopram','Escitalopram oxalato','10 mg','Comprimido recubierto','Antidepresivo ISRS',false,NULL,NULL,'Una vez al día',true),
  ('med-007', 'Amlodipino','Amlodipino besilato','5 mg','Comprimido','Antihipertensivo',false,NULL,NULL,'Una vez al día',true),
  ('med-008', 'Omeprazol','Omeprazol','20 mg','Cápsula con gránulos','Inhibidor bomba de protones',false,NULL,NULL,'Una vez al día en ayunas',false),
  ('med-008b','Omeprazol (Bioequivalente)','Omeprazol','20 mg','Cápsula con gránulos','Inhibidor bomba de protones',true,'med-008','BE-2023-0334','Una vez al día en ayunas',false),
  ('med-009', 'Enalapril','Enalapril maleato','10 mg','Comprimido','Antihipertensivo IECA',false,NULL,NULL,'Cada 12 horas',true),
  ('med-010', 'Bisoprolol','Bisoprolol fumarato','5 mg','Comprimido recubierto','Betabloqueador',false,NULL,NULL,'Una vez al día',true)
ON CONFLICT (id) DO UPDATE SET
  name                  = EXCLUDED.name,
  active_principle      = EXCLUDED.active_principle,
  dose                  = EXCLUDED.dose,
  form                  = EXCLUDED.form,
  category              = EXCLUDED.category,
  is_bioequivalent      = EXCLUDED.is_bioequivalent,
  bioequivalent_of_id   = EXCLUDED.bioequivalent_of_id,
  isp_certification     = EXCLUDED.isp_certification,
  common_frequency      = EXCLUDED.common_frequency,
  requires_prescription = EXCLUDED.requires_prescription;

-- ── 6. SEED PRECIOS DE REFERENCIA ────────────────────────────
-- Estos son precios iniciales que el scraper irá actualizando

INSERT INTO medication_prices (catalog_id, pharmacy_id, price, has_stock, promotion_text) VALUES
  ('med-001','cv',8990,true,''),  ('med-001','sal',9490,true,'10% con tarjeta Salcobrand'),
  ('med-001','fah',8790,true,''), ('med-001','drs',4990,true,''), ('med-001','knp',7990,false,''),
  ('med-001b','cv',4490,true,''), ('med-001b','sal',4990,true,''),
  ('med-001b','fah',4290,true,''),('med-001b','drs',2990,true,''),('med-001b','knp',3990,true,''),
  ('med-002','cv',5990,true,''),  ('med-002','sal',6490,true,'2x1 en segunda unidad'),
  ('med-002','fah',5790,true,''), ('med-002','drs',3490,true,''), ('med-002','knp',5490,true,''),
  ('med-002b','cv',2990,true,''), ('med-002b','sal',3490,true,''),
  ('med-002b','fah',2890,false,''),('med-002b','drs',1990,true,''),('med-002b','knp',2790,true,''),
  ('med-003','cv',12990,true,''), ('med-003','sal',13490,true,'15% con app Salcobrand'),
  ('med-003','fah',11990,true,''),('med-003','drs',6990,true,''), ('med-003','knp',10990,true,''),
  ('med-004','cv',7490,true,''),  ('med-004','sal',7990,true,''),
  ('med-004','fah',7290,false,''),('med-004','drs',4490,true,''), ('med-004','knp',6490,true,''),
  ('med-005','cv',11490,true,''), ('med-005','sal',11990,true,''),
  ('med-005','fah',10990,true,'20% segunda unidad'),('med-005','drs',5990,true,''),('med-005','knp',9490,true,''),
  ('med-005b','cv',5990,true,''), ('med-005b','sal',6490,true,''),
  ('med-005b','fah',5490,true,''),('med-005b','drs',3490,true,''),('med-005b','knp',4990,true,''),
  ('med-006','cv',18990,true,''), ('med-006','sal',19490,true,''),
  ('med-006','fah',17990,true,''),('med-006','drs',8990,false,''),('med-006','knp',15990,true,''),
  ('med-007','cv',6490,true,''),  ('med-007','sal',6990,true,''),
  ('med-007','fah',6290,true,'10% descuento'),('med-007','drs',3490,true,''),('med-007','knp',5490,true,''),
  ('med-008','cv',4990,true,''),  ('med-008','sal',5490,true,''),
  ('med-008','fah',4790,true,''), ('med-008','drs',2490,true,''), ('med-008','knp',3990,true,''),
  ('med-008b','cv',2490,true,''), ('med-008b','sal',2990,true,''),
  ('med-008b','fah',2290,true,''),('med-008b','drs',1490,true,''),('med-008b','knp',1990,true,''),
  ('med-009','cv',4490,true,''),  ('med-009','sal',4990,true,''),
  ('med-009','fah',4290,true,''), ('med-009','drs',2490,true,''), ('med-009','knp',3990,false,''),
  ('med-010','cv',9990,true,''),  ('med-010','sal',10490,true,''),
  ('med-010','fah',9490,true,''), ('med-010','drs',5990,true,''), ('med-010','knp',8490,true,'')
ON CONFLICT (catalog_id, pharmacy_id) DO UPDATE SET
  price          = EXCLUDED.price,
  has_stock      = EXCLUDED.has_stock,
  promotion_text = EXCLUDED.promotion_text;

-- ── 7. SEED HISTORIAL DE PRECIOS ─────────────────────────────

INSERT INTO price_history (catalog_id, month_period, avg_price) VALUES
  ('med-001','2025-12',9200),('med-001','2026-01',9100),('med-001','2026-02',8900),('med-001','2026-03',9300),('med-001','2026-04',8800),('med-001','2026-05',8790),
  ('med-002','2025-12',6200),('med-002','2026-01',6100),('med-002','2026-02',5900),('med-002','2026-03',6000),('med-002','2026-04',5800),('med-002','2026-05',5790),
  ('med-003','2025-12',14500),('med-003','2026-01',14200),('med-003','2026-02',13800),('med-003','2026-03',13500),('med-003','2026-04',12500),('med-003','2026-05',11990),
  ('med-004','2025-12',7800),('med-004','2026-01',7600),('med-004','2026-02',7500),('med-004','2026-03',7400),('med-004','2026-04',7300),('med-004','2026-05',7290),
  ('med-005','2025-12',12500),('med-005','2026-01',12200),('med-005','2026-02',11800),('med-005','2026-03',11500),('med-005','2026-04',11200),('med-005','2026-05',10990),
  ('med-006','2025-12',20000),('med-006','2026-01',19800),('med-006','2026-02',19500),('med-006','2026-03',19200),('med-006','2026-04',18800),('med-006','2026-05',17990),
  ('med-007','2025-12',7000),('med-007','2026-01',6800),('med-007','2026-02',6700),('med-007','2026-03',6600),('med-007','2026-04',6500),('med-007','2026-05',6290),
  ('med-008','2025-12',5500),('med-008','2026-01',5300),('med-008','2026-02',5100),('med-008','2026-03',5000),('med-008','2026-04',4900),('med-008','2026-05',4790),
  ('med-009','2025-12',5000),('med-009','2026-01',4900),('med-009','2026-02',4800),('med-009','2026-03',4700),('med-009','2026-04',4500),('med-009','2026-05',4290),
  ('med-010','2025-12',11000),('med-010','2026-01',10800),('med-010','2026-02',10500),('med-010','2026-03',10200),('med-010','2026-04',10000),('med-010','2026-05',9490)
ON CONFLICT (catalog_id, month_period) DO UPDATE SET avg_price = EXCLUDED.avg_price;

-- ── 8. VERIFICACIÓN ───────────────────────────────────────────
SELECT 'medications_catalog' as tabla, COUNT(*) as filas FROM medications_catalog
UNION ALL SELECT 'pharmacies',        COUNT(*) FROM pharmacies
UNION ALL SELECT 'medication_prices', COUNT(*) FROM medication_prices
UNION ALL SELECT 'price_history',     COUNT(*) FROM price_history;
