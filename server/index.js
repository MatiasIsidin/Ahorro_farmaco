import express from 'express';
import cors from 'cors';
import puppeteerExtra from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import AnonymizeUAPlugin from 'puppeteer-extra-plugin-anonymize-ua';
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { scrapeCruzVerde } from './scrapers/cruzVerde.js';
import { scrapeSalcobrand } from './scrapers/salcobrand.js';
import { scrapeAhumada } from './scrapers/ahumada.js';
import { scrapeDrSimi } from './scrapers/drSimi.js';
import { scrapeKnop } from './scrapers/knop.js';
import { updateAllPrices } from './update-prices.mjs';

// Activar plugins stealth antes de cualquier launch
puppeteerExtra.use(StealthPlugin());
puppeteerExtra.use(AnonymizeUAPlugin({ makeWindows: true }));

// ── Cargar .env.local manualmente (Node no usa Vite) ─────────
const __dirname = dirname(fileURLToPath(import.meta.url));
function loadEnv() {
  try {
    const envPath = resolve(__dirname, '../.env.local');
    const lines = readFileSync(envPath, 'utf-8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const idx = trimmed.indexOf('=');
      if (idx === -1) continue;
      const key = trimmed.slice(0, idx).trim();
      const val = trimmed.slice(idx + 1).trim();
      if (!process.env[key]) process.env[key] = val;
    }
  } catch {
    console.warn('[BACKEND] No se encontró .env.local, usando variables de entorno del sistema');
  }
}
loadEnv();

const app = express();
const PORT = process.env.PORT || 3001;

// ── Supabase admin client ─────────────────────────────────────
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

// ── Cache TTL: 24 horas ────────────────────────────────────────
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

let browser = null;

async function initBrowser() {
  if (!browser) {
    try {
      browser = await puppeteerExtra.launch({
        headless: 'new',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-blink-features=AutomationControlled',
          '--disable-infobars',
          '--window-size=1366,768',
        ],
        ignoreDefaultArgs: ['--enable-automation'],
      });
      console.log('[SCRAPER] Browser iniciado (stealth mode)');
    } catch (e) {
      console.error('[SCRAPER] Error iniciando Puppeteer:', e.message);
    }
  }
}

// ── Estrategias de scraping en orden de confiabilidad ─────────
const STRATEGIES = [
  {
    iteration: 1,
    timeout: 12000,
    navTimeout: 20000,
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    waitMethod: 'selector',
    desc: 'Desktop Chrome — selector wait',
  },
  {
    iteration: 2,
    timeout: 20000,
    navTimeout: 30000,
    userAgent: 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36',
    waitMethod: 'selector',
    desc: 'Mobile Chrome — increased timeout',
  },
  {
    iteration: 3,
    timeout: 30000,
    navTimeout: 35000,
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
    waitMethod: 'networkidle',
    desc: 'Safari macOS — networkidle',
  },
];

const SCRAPERS = [
  { fn: scrapeCruzVerde, id: 'cv',  name: 'Cruz Verde' },
  { fn: scrapeSalcobrand,id: 'sal', name: 'Salcobrand' },
  { fn: scrapeAhumada,   id: 'fah', name: 'Farmacias Ahumada' },
  { fn: scrapeDrSimi,    id: 'drs', name: 'Dr. Simi' },
  { fn: scrapeKnop,      id: 'knp', name: 'Farmacias Knop' },
];

// ── Verificar si el caché de Supabase es válido ───────────────
async function getCachedPrices(catalogId) {
  const { data, error } = await supabase
    .from('medication_prices')
    .select('pharmacy_id, price, has_stock, promotion_text, updated_at')
    .eq('catalog_id', catalogId);

  if (error || !data || data.length === 0) return null;

  // Hay datos en Supabase — siempre servir desde caché
  // Solo disparar scraping en background si los datos son muy antiguos (> 24h)
  const now = Date.now();
  const hasRecent = data.some(row => {
    const updated = new Date(row.updated_at || row.created_at || 0).getTime();
    return (now - updated) < CACHE_TTL_MS;
  });

  // Retornar los datos aunque sean viejos — el scraping los actualizará en background
  return { data, needsRefresh: !hasRecent };
}

// ── Guardar precios scrapeados en Supabase ────────────────────
async function savePricesToDB(catalogId, results) {
  if (results.length === 0) return;

  const rows = results.map(r => ({
    catalog_id: catalogId,
    pharmacy_id: r.pharmacyId,
    price: r.price,
    has_stock: r.stock ?? true,
    promotion_text: r.promotion || '',
    price_per_unit: r.pricePerUnit || null,
    units_per_pack: r.units || 1,
    product_name: r.name || null,
    updated_at: new Date().toISOString(),
  }));

  const { error } = await supabase
    .from('medication_prices')
    .upsert(rows, { onConflict: 'catalog_id,pharmacy_id' });

  if (error) {
    console.error('[SCRAPER] Error guardando precios:', error.message);
  } else {
    console.log(`[SCRAPER] ✅ ${rows.length} precios guardados para ${catalogId}`);
  }
}

// ── Scraping con loop de auto-depuración ─────────────────────
async function scrapeWithRetry(medName, catalogId) {
  if (!browser) await initBrowser();
  if (!browser) return [];

  let bestResults = [];

  for (let i = 0; i < STRATEGIES.length; i++) {
    const strategy = STRATEGIES[i];
    console.log(`\n[SCRAPER] ITERATION: ${strategy.iteration} — ${strategy.desc}`);

    const results = await Promise.all(
      SCRAPERS.map(s => s.fn(browser, medName, strategy).catch(() => ({
        error: true, pharmacy: s.name, pharmacyId: s.id, reason: 'crash',
      })))
    );

    const valid = results.filter(r => !r.error && r.price != null);
    const failed = results.filter(r => r.error || r.price == null)
      .map(r => `${r.pharmacy} (${r.reason || 'empty'})`);

    console.log(`[SCRAPER] VALID RESULTS: ${valid.length}/5`);
    if (failed.length) console.log(`[SCRAPER] FAILED: ${failed.join(', ')}`);

    if (valid.length > bestResults.length) bestResults = valid;

    if (valid.length >= 3) {
      console.log(`[SCRAPER] SCRAPING STABLE`);
      console.log(`[SCRAPER] VALID PHARMACIES: ${valid.length}/5`);
      console.log(`[SCRAPER] SOURCE: real-time puppeteer extraction\n`);
      break;
    }

    if (i < STRATEGIES.length - 1) {
      console.log(`[SCRAPER] CHANGED STRATEGY: ${STRATEGIES[i + 1].desc}`);
    }
  }

  return bestResults;
}

app.use(cors());
app.use(express.json());

// ── Scraping background sin bloquear ─────────────────────────
async function scrapeAndUpdate(medName, catalogId) {
  try {
    const results = await scrapeWithRetry(medName, catalogId);
    if (results.length > 0) {
      await savePricesToDB(catalogId, results);
      console.log(`[BG UPDATE] ${catalogId} actualizado con ${results.length} precios`);
    }
  } catch (e) {
    console.warn(`[BG UPDATE] Error actualizando ${catalogId}:`, e.message);
  }
}

// ── GET /api/prices?med=Losartán&catalogId=med-001 ─────────────
app.get('/api/prices', async (req, res) => {
  const { med, catalogId } = req.query;
  if (!med) return res.status(400).json({ error: 'Parámetro "med" requerido' });

  // 1. Siempre intentar servir desde Supabase primero (respuesta instantánea)
  if (catalogId) {
    const cached = await getCachedPrices(catalogId);
    if (cached) {
      console.log(`[CACHE ${cached.needsRefresh ? 'STALE' : 'HIT'}] ${catalogId}`);

      // Si los datos están desactualizados, disparar scraping en background
      if (cached.needsRefresh) {
        scrapeAndUpdate(med, catalogId); // fire-and-forget
      }

      return res.json({ medication: med, prices: cached.data, source: 'cache' });
    }
  }

  // 2. Sin datos en Supabase — scraping en tiempo real (solo primera vez)
  console.log(`[CACHE MISS] ${med} — scraping inicial`);
  const results = await scrapeWithRetry(med, catalogId);

  if (catalogId && results.length > 0) {
    await savePricesToDB(catalogId, results);
  }

  results.sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity));
  res.json({ medication: med, prices: results, source: 'scraping' });
});

// ── GET /api/health ────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', browser: !!browser, timestamp: new Date().toISOString() });
});

app.listen(PORT, async () => {
  console.log(`🚀 Servidor de scraping backend corriendo en http://localhost:${PORT}`);
  await initBrowser();

  // Cron cada 24h — primera ejecución 5 minutos después del arranque
  setTimeout(async () => {
    console.log('[CRON] Iniciando actualización de precios programada...');
    await updateAllPrices().catch(e => console.error('[CRON] Error:', e.message));

    // Repetir cada 24h
    setInterval(async () => {
      console.log('[CRON] Actualización diaria de precios...');
      await updateAllPrices().catch(e => console.error('[CRON] Error:', e.message));
    }, CACHE_TTL_MS);
  }, 5 * 60 * 1000);

  console.log('[CRON] Actualización de precios programada: primera en 5 min, luego cada 24h');
});
