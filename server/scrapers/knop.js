// ============================================================
// Farmacias Knop — Puppeteer Stealth (Bootic moderno)
// URL: /search?fields=title%2C...&q=
// Espera networkidle0 para renderizado React
// ============================================================

function extractUnits(text) {
  if (!text) return 1;
  const m = text.match(/\b(\d+)\s*(?:comprimidos?|cápsulas?|caps?|comp\.?|pastillas?|tabletas?|grageas?)\b/i)
    || text.match(/\bx\s*(\d+)\b/i)
    || text.match(/\b(\d+)\s*un(?:idades?)?\b/i);
  if (m) { const n = parseInt(m[1]); if (n > 0 && n <= 500) return n; }
  return 1;
}

function normalize(text) {
  return (text || '').toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, '');
}

export async function scrapeKnop(browser, medName, strategy) {
  let page;
  try {
    page = await browser.newPage();
    await page.setViewport({ width: 1366, height: 768 });
    await page.setExtraHTTPHeaders({ 'Accept-Language': 'es-CL,es;q=0.9' });

    const q = encodeURIComponent(medName);
    const url = `https://www.farmaciasknop.com/search?fields=title%2Cvariants.title%2Cvariants.sku%2Cproduct_type.name%2Cvendor.name&q=${q}`;

    await page.goto(url, { waitUntil: 'networkidle0', timeout: strategy.navTimeout + 10000 });
    await new Promise(r => setTimeout(r, 3000));

    const items = await page.evaluate(() => {
      // Bootic moderno usa Tailwind — buscar elementos con precio en formato CLP
      const allText = document.body?.innerText || '';

      // Buscar todos los elementos que podrían ser cards de producto
      const selectors = [
        '[class*="product"]',
        'li[class*="item"]',
        '[data-bootic]',
        'article',
        '[class*="card"]',
      ];

      let cards = [];
      for (const sel of selectors) {
        const found = Array.from(document.querySelectorAll(sel));
        // Filtrar solo los que tienen precio CLP
        const withPrice = found.filter(el => /\$[\d\.]+/.test(el.innerText || ''));
        if (withPrice.length > 0) { cards = withPrice; break; }
      }

      // Si no encontramos cards con selectores, buscar por patrones de precio en el DOM
      if (cards.length === 0) {
        // Buscar divs/li que contengan tanto nombre como precio
        const allEls = Array.from(document.querySelectorAll('div, li, article'));
        cards = allEls.filter(el => {
          const text = el.innerText || '';
          return /\$[\d\.]{3,}/.test(text) && text.length < 500 && text.length > 10;
        }).slice(0, 15);
      }

      return cards.slice(0, 12).map(card => {
        const text = card.innerText?.trim() || '';
        // Extraer primer precio válido (entre $100 y $100.000)
        const priceMatches = text.replace(/\./g, '').match(/\$(\d{3,6})/g) || [];
        const prices = priceMatches
          .map(p => parseInt(p.replace('$', '')))
          .filter(p => p > 100 && p < 100000);

        const price = prices.length > 0 ? Math.min(...prices) : 0;

        // Extraer nombre — primera línea larga del texto
        const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 5 && !/^\$/.test(l));
        const name = lines[0] || '';

        return { name, price };
      }).filter(i => i.price > 0);
    });

    await page.close();

    if (!items || items.length === 0) {
      return { error: true, pharmacy: 'Farmacias Knop', pharmacyId: 'knp', reason: 'no products rendered' };
    }

    // Filtrar por relevancia
    const searchWords = normalize(medName).split(/\s+/).filter(w => w.length > 2);
    const relevant = items.filter(i => searchWords.some(w => normalize(i.name).includes(w)));
    const candidates = relevant.length > 0 ? relevant : items;

    let best = null;
    for (const item of candidates) {
      const units = extractUnits(item.name);
      const ppu = item.price / units;
      if (!best || ppu < best.ppu) best = { ...item, units, ppu };
    }

    if (!best) return { error: true, pharmacy: 'Farmacias Knop', pharmacyId: 'knp', reason: 'no valid price' };

    return {
      error: false,
      pharmacy: 'Farmacias Knop',
      pharmacyId: 'knp',
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
    return { error: true, pharmacy: 'Farmacias Knop', pharmacyId: 'knp', reason: e.message };
  }
}
