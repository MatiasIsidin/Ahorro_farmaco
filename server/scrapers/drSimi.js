// ============================================================
// Dr. Simi — VTEX catalog API (sin autenticación)
// Normaliza precio por unidad para comparación justa
// ============================================================
import https from 'https';

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124',
        'Accept': 'application/json',
      },
    }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(d) }); }
        catch { resolve({ status: res.statusCode, data: null }); }
      });
    });
    req.setTimeout(10000, () => { req.destroy(); reject(new Error('timeout')); });
    req.on('error', reject);
  });
}

// Extrae cantidad de unidades desde el nombre del producto
// Ej: "Paracetamol 500 mg 16 comprimidos" → 16
function extractUnits(productName) {
  if (!productName) return 1;
  // Buscar patrones como "16 comprimidos", "24 cápsulas", "30 comp", "x20", "x 20"
  const patterns = [
    /\b(\d+)\s*(?:comprimidos?|cápsulas?|caps?|comp\.?|pastillas?|grageas?|tabletas?)\b/i,
    /\bx\s*(\d+)\b/i,
    /\b(\d+)\s*un(?:idades?)?\b/i,
  ];
  for (const p of patterns) {
    const m = productName.match(p);
    if (m) {
      const n = parseInt(m[1]);
      if (n > 0 && n <= 500) return n; // sanity check
    }
  }
  return 1;
}

export async function scrapeDrSimi(browser, medName, strategy) {
  try {
    const query = encodeURIComponent(medName);
    const url = `https://www.drsimi.cl/api/catalog_system/pub/products/search/${query}?_from=0&_to=9`;

    const { status, data } = await fetchJson(url);

    if ((status !== 200 && status !== 206) || !Array.isArray(data) || data.length === 0) {
      return { error: true, pharmacy: 'Dr. Simi', pharmacyId: 'drs', reason: `status ${status} / empty` };
    }

    // Calcular precio por unidad de cada producto y elegir el más económico
    let best = null;

    for (const product of data) {
      const item = product?.items?.[0];
      const seller = item?.sellers?.[0];
      const offer = seller?.commertialOffer;
      if (!offer?.Price || offer.Price === 0) continue;

      const inStock = (offer.AvailableQuantity || 0) > 0;
      const units = extractUnits(product.productName);
      const pricePerUnit = Math.round((offer.Price / units) * 100) / 100;

      if (!best || pricePerUnit < best.pricePerUnit) {
        best = {
          name: product.productName,
          price: Math.round(offer.Price),
          units,
          pricePerUnit,
          stock: inStock,
          promotion: offer.discountHighlights?.[0]?.name || '',
        };
      }
    }

    if (!best) {
      return { error: true, pharmacy: 'Dr. Simi', pharmacyId: 'drs', reason: 'no valid price in results' };
    }

    return {
      error: false,
      pharmacy: 'Dr. Simi',
      pharmacyId: 'drs',
      price: best.price,
      pricePerUnit: best.pricePerUnit,
      units: best.units,
      name: best.name,
      stock: best.stock,
      promotion: best.promotion,
      source: 'api',
    };

  } catch (err) {
    return { error: true, pharmacy: 'Dr. Simi', pharmacyId: 'drs', reason: err.message };
  }
}
