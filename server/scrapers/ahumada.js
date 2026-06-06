// ============================================================
// Farmacias Ahumada — Puppeteer Stealth
// Selector: .product → .product-tile, nombre en .product-name
// Precio: primer número del texto del elemento .price-sales
// ============================================================

function extractUnits(text) {
  if (!text) return 1;
  const m = text.match(/\b(\d+)\s*(?:comprimidos?|cápsulas?|caps?|comp\.?|pastillas?|tabletas?|grageas?|supositorios?|mL)\b/i)
    || text.match(/\bx\s*(\d+)\b/i)
    || text.match(/\b(\d+)\s*un(?:idades?)?\b/i);
  if (m) { const n = parseInt(m[1]); if (n > 0 && n <= 500) return n; }
  return 1;
}

function cleanPrice(text) {
  if (!text) return 0;
  // El precio real es el PRIMERO que aparece (el precio actual, no el tachado)
  const nums = text.replace(/\./g, '').match(/\$?\s*(\d+)/g);
  if (!nums || nums.length === 0) return 0;
  return parseInt(nums[0].replace(/[^0-9]/g, ''));
}

export async function scrapeAhumada(browser, medName, strategy) {
  let page;
  try {
    page = await browser.newPage();
    await page.setViewport({ width: 1366, height: 768 });
    await page.setExtraHTTPHeaders({ 'Accept-Language': 'es-CL,es;q=0.9' });

    const query = encodeURIComponent(medName);
    await page.goto(`https://www.farmaciasahumada.cl/search?q=${query}`, {
      waitUntil: 'domcontentloaded',
      timeout: strategy.navTimeout,
    });

    await page.waitForSelector('.product', { timeout: strategy.timeout }).catch(() => {});
    await new Promise(r => setTimeout(r, 1200));

    const items = await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('.product')).slice(0, 10);
      return cards.map(card => {
        const tile = card.querySelector('.product-tile');
        const nameEl = card.querySelector('.product-name, .pdp-link a, [class*="product-name"]');
        // Extraer el precio del primer .price-sales o precio visible
        const priceEl = card.querySelector('.price-sales, [class*="price-sales"], .sales');
        const priceText = priceEl?.innerText?.trim() || card.querySelector('[class*="price"]')?.innerText?.trim() || '';
        return {
          name: nameEl?.innerText?.trim() || '',
          priceText,
          pid: tile?.getAttribute('data-pid') || '',
        };
      }).filter(i => i.priceText);
    });

    await page.close();

    if (!items || items.length === 0) {
      return { error: true, pharmacy: 'Farmacias Ahumada', pharmacyId: 'fah', reason: 'no products found' };
    }

    // Filtrar solo productos relevantes al término buscado
    const normalize = t => (t || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\s]/g, '');
    const searchWords = normalize(medName).split(/\s+/).filter(w => w.length > 2);
    const relevant = items.filter(i => searchWords.some(w => normalize(i.name).includes(w)));
    const candidates = relevant.length > 0 ? relevant : items;

    // Elegir el de menor precio por unidad
    let best = null;
    for (const item of candidates) {
      const price = cleanPrice(item.priceText);
      if (!price || price <= 0) continue;
      const units = extractUnits(item.name);
      const ppu = price / units;
      if (!best || ppu < best.ppu) {
        best = { name: item.name, price, units, ppu };
      }
    }

    if (!best) {
      return { error: true, pharmacy: 'Farmacias Ahumada', pharmacyId: 'fah', reason: 'no valid price parsed' };
    }

    return {
      error: false,
      pharmacy: 'Farmacias Ahumada',
      pharmacyId: 'fah',
      price: best.price,
      pricePerUnit: Math.round(best.ppu * 100) / 100,
      units: best.units,
      name: best.name,
      stock: true,
      promotion: '',
      source: 'puppeteer-stealth',
    };

  } catch (e) {
    if (page && !page.isClosed()) await page.close().catch(() => {});
    return { error: true, pharmacy: 'Farmacias Ahumada', pharmacyId: 'fah', reason: e.message };
  }
}
