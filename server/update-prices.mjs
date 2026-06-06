// ============================================================
// UPDATE PRICES — Actualiza precios reales de Cruz Verde y Dr. Simi
// Uso directo:   node server/update-prices.mjs
// Uso como módulo: import { updateAllPrices } from './update-prices.mjs'
// ============================================================

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import { scrapeCruzVerde } from './scrapers/cruzVerde.js';
import { scrapeDrSimi } from './scrapers/drSimi.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnv() {
  try {
    const lines = readFileSync(resolve(__dirname, '../.env.local'), 'utf-8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const idx = trimmed.indexOf('=');
      if (idx === -1) continue;
      const key = trimmed.slice(0, idx).trim();
      const val = trimmed.slice(idx + 1).trim();
      if (!process.env[key]) process.env[key] = val;
    }
  } catch { /* .env.local opcional */ }
}
loadEnv();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

const CATALOG = [
  { id: 'med-001',  name: 'Losartan' },
  { id: 'med-001b', name: 'Losartan bioequivalente' },
  { id: 'med-002',  name: 'Metformina' },
  { id: 'med-002b', name: 'Metformina bioequivalente' },
  { id: 'med-003',  name: 'Atorvastatina' },
  { id: 'med-004',  name: 'Levotiroxina' },
  { id: 'med-005',  name: 'Sertralina' },
  { id: 'med-005b', name: 'Sertralina bioequivalente' },
  { id: 'med-006',  name: 'Escitalopram' },
  { id: 'med-007',  name: 'Amlodipino' },
  { id: 'med-008',  name: 'Omeprazol' },
  { id: 'med-008b', name: 'Omeprazol bioequivalente' },
  { id: 'med-009',  name: 'Enalapril' },
  { id: 'med-010',  name: 'Bisoprolol' },
  { id: 'med-011',  name: 'Eutirox' },
  { id: 'med-012',  name: 'Rosuvastatina' },
  { id: 'med-013',  name: 'Aspirina' },
  { id: 'med-014',  name: 'Paracetamol' },
];

const SCRAPERS = [
  { fn: scrapeCruzVerde, id: 'cv',  name: 'Cruz Verde' },
  { fn: scrapeDrSimi,   id: 'drs', name: 'Dr. Simi' },
];

export async function updateAllPrices() {
  const startTime = Date.now();
  let updated = 0;
  let errors = 0;

  console.log(`\n[PRICES] Actualizando — ${new Date().toLocaleString('es-CL')}`);

  for (const med of CATALOG) {
    const rows = [];

    for (const scraper of SCRAPERS) {
      try {
        const r = await scraper.fn(null, med.name, {});
        if (!r.error && r.price) {
          rows.push({
            catalog_id: med.id,
            pharmacy_id: r.pharmacyId,
            price: r.price,
            has_stock: r.stock ?? true,
            promotion_text: r.promotion || '',
            price_per_unit: r.pricePerUnit || null,
            units_per_pack: r.units || 1,
            product_name: r.name || null,
            updated_at: new Date().toISOString(),
          });
          const unitInfo = r.units > 1
            ? ` (${r.units} u. → $${Math.round(r.pricePerUnit)}/u)`
            : '';
          console.log(`  ✅ ${scraper.name} — ${med.name}: $${r.price.toLocaleString('es-CL')}${unitInfo}`);
        } else {
          console.log(`  ⚠️  ${scraper.name} — ${med.name}: ${r.reason || 'sin resultado'}`);
        }
      } catch (e) {
        console.log(`  ❌ ${scraper.name} — ${med.name}: ${e.message}`);
        errors++;
      }
    }

    if (rows.length > 0) {
      const { error } = await supabase
        .from('medication_prices')
        .upsert(rows, { onConflict: 'catalog_id,pharmacy_id' });

      if (error) {
        console.log(`  ❌ DB error para ${med.id}: ${error.message}`);
        errors++;
      } else {
        updated += rows.length;
      }
    }

    await new Promise(r => setTimeout(r, 400));
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`[PRICES] ✅ ${updated} actualizados en ${elapsed}s | ⚠️  ${errors} errores\n`);
  return { updated, errors };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await updateAllPrices();
  process.exit(0);
}
