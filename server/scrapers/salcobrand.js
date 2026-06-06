// ============================================================
// Salcobrand — Puppeteer Stealth
// URL: /search_result?query= con waitUntil networkidle0
// Precio real: .display-card-price > .display-offer-price > .display-secoundary-price-normal
// Nombre: .product-info.truncate (nombre completo)
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

function parsePrice(text) {
  if (!text) return 0;
  // Solo el primer número del texto — evita concatenar precio original + precio oferta
  const clean = text.replace(/\./g, '').trim();
  const m = clean.match(/^\$?\s*(\d+)/);
  return m ? parseInt(m[1]) : 0;
}

export async function scrapeSalcobrand(browser, medName, strategy) {
  let page;
  try {
    page = await browser.newPage();
    await page.setViewport({ width: 1366, height: 768 });
    await page.setExtraHTTPHeaders({ 'Accept-Language': 'es-CL,es;q=0.9' });

    const query = encodeURIComponent(medName);
    await page.goto(`https://salcobrand.cl/search_result?query=${query}`, {
      waitUntil: 'networkidle0',
      timeout: strategy.navTimeout + 10000,
    });
    await new Promise(r => setTimeout(r, 1500));

    const items = await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('.product.clickable'));

      return cards.slice(0, 12).map(card => {
        // Nombre completo en .product-info
        const nameEl = card.querySelector('.product-info.truncate, .product-info');
        const name = nameEl?.innerText?.trim() || card.querySelector('img[alt]')?.getAttribute('alt') || '';

        // Precio: prioridad card price > offer price > normal price
        const cardPriceEl = card.querySelector('.display-card-price');
        const offerPriceEl = card.querySelector('.display-offer-price');
        const normalPriceEl = card.querySelector('.display-secoundary-price-normal');

        const priceText = cardPriceEl?.innerText?.trim()
          || offerPriceEl?.innerText?.trim()
          || normalPriceEl?.innerText?.trim()
          || '';

        const price = parseInt(priceText.replace(/\./g, '').replace(/[^0-9]/g, ''));
        return { name, price };
      }).filter(i => i.price > 0 && i.price < 5000000); // sanity check
    });

    await page.close();

    if (!items || items.length === 0) {
      return { error: true, pharmacy: 'Salcobrand', pharmacyId: 'sal', reason: 'no products rendered' };
    }

    // Filtrar por relevancia
    const searchWords = normalize(medName).split(/\s+/).filter(w => w.length > 2);
    const relevant = items.filter(i => searchWords.some(w => normalize(i.name).includes(w)));
    const candidates = relevant.length > 0 ? relevant : items;

    // Elegir menor precio por unidad
    let best = null;
    for (const item of candidates) {
      const units = extractUnits(item.name);
      const ppu = item.price / units;
      if (!best || ppu < best.ppu) best = { ...item, units, ppu };
    }

    if (!best) return { error: true, pharmacy: 'Salcobrand', pharmacyId: 'sal', reason: 'no valid price' };

    return {
      error: false,
      pharmacy: 'Salcobrand',
      pharmacyId: 'sal',
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
    return { error: true, pharmacy: 'Salcobrand', pharmacyId: 'sal', reason: e.message };
  }
}
