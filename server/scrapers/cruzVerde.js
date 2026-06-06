// ============================================================
// Cruz Verde — Salesforce Commerce Cloud OCAPI
// Normaliza precio por unidad para comparación justa
// ============================================================
import https from 'https';

const CV_CLIENT_ID = 'c19ce24d-1677-4754-b9f7-c193997c5a92';
const CV_BASE = 'beta.cruzverde.cl';

function fetchJson(hostname, path, headers = {}) {
  return new Promise((resolve, reject) => {
    const req = https.get({
      hostname,
      path,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124',
        'Accept': 'application/json',
        'x-dw-client-id': CV_CLIENT_ID,
        ...headers,
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

function extractUnits(productName) {
  if (!productName) return 1;
  const patterns = [
    /\b(\d+)\s*(?:comprimidos?|cápsulas?|caps?|comp\.?|pastillas?|grageas?|tabletas?)\b/i,
    /\bx\s*(\d+)\b/i,
    /\b(\d+)\s*un(?:idades?)?\b/i,
  ];
  for (const p of patterns) {
    const m = productName.match(p);
    if (m) {
      const n = parseInt(m[1]);
      if (n > 0 && n <= 500) return n;
    }
  }
  return 1;
}

export async function scrapeCruzVerde(browser, medName, strategy) {
  try {
    const query = encodeURIComponent(medName);
    const path = `/s/Chile/dw/shop/v19_1/product_search?q=${query}&count=10&expand=prices,availability`;

    const { status, data } = await fetchJson(CV_BASE, path);

    if (status !== 200 || !data?.hits?.length) {
      return { error: true, pharmacy: 'Cruz Verde', pharmacyId: 'cv', reason: `status ${status} / no hits` };
    }

    // Calcular precio por unidad y elegir el más económico con stock
    let best = null;

    for (const hit of data.hits) {
      const price = hit.price;
      const orderable = hit.orderable !== false;
      if (!price || price === 0) continue;

      const units = extractUnits(hit.product_name);
      const pricePerUnit = Math.round((price / units) * 100) / 100;

      if (!best || pricePerUnit < best.pricePerUnit) {
        best = {
          name: hit.product_name,
          price: Math.round(price),
          units,
          pricePerUnit,
          stock: orderable,
          promotion: hit.promotional_price ? `Precio oferta: $${hit.promotional_price}` : '',
        };
      }
    }

    if (!best) {
      return { error: true, pharmacy: 'Cruz Verde', pharmacyId: 'cv', reason: 'no valid price in hits' };
    }

    return {
      error: false,
      pharmacy: 'Cruz Verde',
      pharmacyId: 'cv',
      price: best.price,
      pricePerUnit: best.pricePerUnit,
      units: best.units,
      name: best.name,
      stock: best.stock,
      promotion: best.promotion,
      source: 'api',
    };

  } catch (err) {
    return { error: true, pharmacy: 'Cruz Verde', pharmacyId: 'cv', reason: err.message };
  }
}
