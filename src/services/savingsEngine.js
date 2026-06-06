// ============================================================
// SAVINGS ENGINE — Motor de Inteligencia de Ahorro (Supabase)
// ============================================================

import { supabase } from '../lib/supabaseClient';
import { BENEFICIOS } from '../data/mockData';

// ── In-Memory Store (Poblado desde Supabase en AppContext) ──
let FARMACIAS = [];
let MEDICATIONS_CATALOG = [];
let PRECIOS_FARMACIA = {}; // Key: "catalogId_pharmacyId"
let PRICE_HISTORY = {};    // Key: catalogId

// ── Inicialización ──────────────────────────────────────────

export async function initSavingsEngine() {
  // Resetear stores para evitar datos obsoletos en re-init (ej: re-login)
  FARMACIAS = [];
  MEDICATIONS_CATALOG = [];
  PRECIOS_FARMACIA = {};
  PRICE_HISTORY = {};

  try {
    // 1. Cargar Farmacias
    const { data: pharmacies } = await supabase.from('pharmacies').select('*');
    if (pharmacies) FARMACIAS = pharmacies.map(f => ({ id: f.id, nombre: f.name, logo: f.logo, color: f.color }));

    // 2. Cargar Catálogo
    const { data: catalog } = await supabase.from('medications_catalog').select('*');
    if (catalog) {
      MEDICATIONS_CATALOG = catalog.map(c => ({
        id: c.id,
        nombre: c.name,
        principioActivo: c.active_principle,
        dosis: c.dose,
        forma: c.form,
        categoria: c.category,
        esBioequivalente: c.is_bioequivalent,
        bioequivalenteDe: c.bioequivalent_of_id,
        frecuenciaComun: c.common_frequency,
        certificacionISP: c.isp_certification,
        requiereReceta: c.requires_prescription
      }));
    }

    // 3. Cargar Precios
    const { data: prices } = await supabase.from('medication_prices').select('*');
    if (prices) {
      prices.forEach(p => {
        PRECIOS_FARMACIA[`${p.catalog_id}_${p.pharmacy_id}`] = {
          precio: p.price,
          stock: p.has_stock,
          promocion: p.promotion_text,
          precioUnidad: p.price_per_unit || null,
          unidades: p.units_per_pack || 1,
          nombreProducto: p.product_name || null,
        };
      });
    }

    // 4. Cargar Historial
    const { data: history } = await supabase.from('price_history').select('*');
    if (history) {
      history.forEach(h => {
        if (!PRICE_HISTORY[h.catalog_id]) PRICE_HISTORY[h.catalog_id] = [];
        PRICE_HISTORY[h.catalog_id].push({
          mes: h.month_period,
          precioPromedio: h.avg_price
        });
      });
    }

    return true;
  } catch (error) {
    console.error("Error initializing Savings Engine from Supabase:", error);
    return false;
  }
}

export function getMedicationCatalog() {
  return MEDICATIONS_CATALOG;
}

export function getCatalogMedication(id) {
  return MEDICATIONS_CATALOG.find(m => m.id === id);
}

export function getPharmacies() {
  return FARMACIAS;
}

// ── Formateo de precios ──────────────────────────────────────

export function formatCLP(amount) {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0 }).format(amount);
}

// ── Obtener precios (Síncrono/Legacy) ──────────────────────────
export function getPricesForMedication(medicationCatalogId) {
  const result = [];
  for (const farmacia of FARMACIAS) {
    const key = `${medicationCatalogId}_${farmacia.id}`;
    const priceData = PRECIOS_FARMACIA[key];
    if (priceData) {
      result.push({
        farmacia,
        precio: priceData.precio,
        stock: priceData.stock,
        promocion: priceData.promocion,
        precioUnidad: priceData.precioUnidad || null,
        unidades: priceData.unidades || 1,
        nombreProducto: priceData.nombreProducto || null,
      });
    }
  }
  return result;
}

// ── Obtener precios — sirve desde memoria (Supabase), refresca en background ──
export async function fetchPricesForMedication(medicationCatalogId, onRefresh = null) {
  // 1. Servir INMEDIATAMENTE desde los datos ya cargados en memoria por initSavingsEngine
  const cached = getPricesForMedication(medicationCatalogId);

  // 2. Disparar refresco en background via scraper — sin await, no bloquea la UI
  const med = getCatalogMedication(medicationCatalogId);
  if (med) {
    fetch(`/api/prices?med=${encodeURIComponent(med.nombre)}&catalogId=${encodeURIComponent(medicationCatalogId)}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data?.prices?.length) return;
        let changed = false;
        data.prices.forEach(p => {
          const pharmacyId = p.pharmacy_id || p.pharmacyId;
          if (!pharmacyId) return;
          const key = `${medicationCatalogId}_${pharmacyId}`;
          const existing = PRECIOS_FARMACIA[key];
          const newPrice = {
            precio: p.price,
            stock: p.has_stock ?? p.stock ?? true,
            promocion: p.promotion_text || p.promotion || '',
            precioUnidad: p.price_per_unit || null,
            unidades: p.units_per_pack || p.units || 1,
            nombreProducto: p.product_name || p.name || null,
          };
          // Solo notificar si el precio cambió
          if (!existing || existing.precio !== newPrice.precio) {
            changed = true;
          }
          PRECIOS_FARMACIA[key] = newPrice;
        });
        // Notificar al componente solo si hubo cambio real
        if (changed && onRefresh) {
          onRefresh(getPricesForMedication(medicationCatalogId));
        }
      })
      .catch(() => {});
  }

  // 3. Retornar datos en memoria (respuesta instantánea)
  return cached;
}

// ── Mejor / Peor precio (Síncrono) ───────────────────────────

export function findBestPrice(medicationCatalogId) {
  const prices = getPricesForMedication(medicationCatalogId).filter((p) => p.stock);
  if (prices.length === 0) return null;
  return prices.reduce((best, curr) => (curr.precio < best.precio ? curr : best));
}

// ── Encontrar el precio más alto ─────────────────────────────

export function findHighestPrice(medicationCatalogId) {
  const prices = getPricesForMedication(medicationCatalogId).filter((p) => p.stock);
  if (prices.length === 0) return null;
  return prices.reduce((worst, curr) => (curr.precio > worst.precio ? curr : worst));
}

// ── Calcular ahorro potencial de un medicamento ──────────────

export function calculateSavingsPotential(medicationCatalogId) {
  const best = findBestPrice(medicationCatalogId);
  const worst = findHighestPrice(medicationCatalogId);
  if (!best || !worst) return { ahorro: 0, porcentaje: 0 };
  const ahorro = worst.precio - best.precio;
  const porcentaje = worst.precio > 0 ? Math.round((ahorro / worst.precio) * 100) : 0;
  return { ahorro, porcentaje, mejorPrecio: best, peorPrecio: worst };
}

// ── Precio promedio histórico ────────────────────────────────

export function getAverageHistoricalPrice(medicationCatalogId) {
  const history = PRICE_HISTORY[medicationCatalogId] || [];
  if (history.length === 0) return 0;
  const sum = history.reduce((acc, curr) => acc + curr.precioPromedio, 0);
  return Math.round(sum / history.length);
}

export function getPriceHistory(medicationCatalogId) {
  return PRICE_HISTORY[medicationCatalogId] || [];
}

// ── Generar alertas automáticas ──────────────────────────────

export function generateAutoAlerts(userMedications) {
  const alerts = [];
  const hoy = new Date();

  userMedications.forEach((med) => {
    if (!med.alertasActivas) return;

    const currentBest = findBestPrice(med.catalogId);
    const historicalAvg = getAverageHistoricalPrice(med.catalogId);

    // Alerta 1: Quiebre de stock
    if (!currentBest) {
      alerts.push({
        catalogId: med.catalogId,
        tipo: 'QUIEBRE_STOCK',
        mensaje: `No hay stock disponible actualmente para ${med.nombre}. Te avisaremos cuando vuelva.`,
      });
      return; // No calculamos precios si no hay stock
    }

    // Alerta 2: Baja de precio significativa vs promedio histórico
    if (historicalAvg > 0 && currentBest.precio < historicalAvg * 0.8) {
      alerts.push({
        catalogId: med.catalogId,
        tipo: 'BAJA_PRECIO',
        mensaje: `${med.nombre} bajó a ${formatCLP(currentBest.precio)} en ${currentBest.farmacia.nombre} (20% bajo el promedio).`,
      });
    }

    // Alerta 3: Próxima compra (Simulada basada en fecha última compra y cantidad)
    if (med.ultimaCompra && med.cantidadComprada) {
      const ultima = new Date(med.ultimaCompra);
      const diasPasados = Math.floor((hoy - ultima) / (1000 * 60 * 60 * 24));
      
      let pastillasPorDia = 1;
      if (med.frecuencia?.toLowerCase().includes('cada 12')) pastillasPorDia = 2;
      if (med.frecuencia?.toLowerCase().includes('cada 8')) pastillasPorDia = 3;
      
      const diasCobertura = Math.floor(med.cantidadComprada / pastillasPorDia);
      const diasRestantes = diasCobertura - diasPasados;

      if (diasRestantes <= 5 && diasRestantes >= 0) {
        alerts.push({
          catalogId: med.catalogId,
          tipo: 'PROXIMA_COMPRA',
          mensaje: `Te quedan ${diasRestantes} días de ${med.nombre}. Sugerimos comprar pronto en ${currentBest.farmacia.nombre} a ${formatCLP(currentBest.precio)}.`,
        });
      }
    }
  });

  return alerts;
}

// ── Smart Cart / Carrito Inteligente ─────────────────────────

export function calculateSmartCart(cartItems) {
  if (!cartItems || cartItems.length === 0) {
    return { options: [], bestOption: null };
  }

  let catalogIds = cartItems.map((c) => c.catalogId);
  catalogIds = [...new Set(catalogIds)];

  let totalPeorCaso = 0;
  catalogIds.forEach(id => {
    const wp = findHighestPrice(id);
    if (wp) totalPeorCaso += wp.precio;
  });

  const matrix = {};
  catalogIds.forEach((id) => {
    matrix[id] = getPricesForMedication(id);
  });

  const cartFarmaciaUnica = [];
  FARMACIAS.forEach((farmacia) => {
    let subtotal = 0;
    let items = [];
    let hasAll = true;

    for (const id of catalogIds) {
      const priceData = matrix[id].find((p) => p.farmacia.id === farmacia.id);
      if (priceData && priceData.stock) {
        const qty = cartItems.find(c => c.catalogId === id)?.cantidad || 1;
        subtotal += (priceData.precio * qty);
        items.push({ catalogId: id, priceData, qty });
      } else {
        hasAll = false;
        break;
      }
    }

    if (hasAll) {
      cartFarmaciaUnica.push({
        tipo: 'UNICA',
        farmacia,
        subtotal,
        ahorroTotal: totalPeorCaso - subtotal,
        items,
      });
    }
  });

  let subtotalMixto = 0;
  let itemsMixtos = [];
  let tieneQuiebreTotal = false;

  for (const id of catalogIds) {
    const wp = findBestPrice(id);
    if (wp) {
      const qty = cartItems.find(c => c.catalogId === id)?.cantidad || 1;
      subtotalMixto += (wp.precio * qty);
      itemsMixtos.push({ catalogId: id, priceData: wp, qty });
    } else {
      tieneQuiebreTotal = true;
      break;
    }
  }

  const resultOptions = [];

  if (cartFarmaciaUnica.length > 0) {
    cartFarmaciaUnica.sort((a, b) => a.subtotal - b.subtotal);
    resultOptions.push(cartFarmaciaUnica[0]); 
  }

  if (!tieneQuiebreTotal) {
    let farmaciasDistintas = new Set();
    itemsMixtos.forEach(i => farmaciasDistintas.add(i.priceData.farmacia.id));
    
    if (farmaciasDistintas.size > 1) {
      resultOptions.push({
        tipo: 'MIXTA',
        farmacias: Array.from(farmaciasDistintas).map(fid => FARMACIAS.find(f => f.id === fid)),
        subtotal: subtotalMixto,
        ahorroTotal: totalPeorCaso - subtotalMixto,
        items: itemsMixtos,
        info: 'Comprando en diferentes farmacias para máximo ahorro',
      });
    }
  }

  resultOptions.sort((a, b) => a.subtotal - b.subtotal);

  return {
    options: resultOptions,
    bestOption: resultOptions[0] || null,
  };
}

// ── Smart Cart en Tiempo Real (Supabase) ─────────────────────
export async function fetchSmartCart(cartItems) {
  console.log(`[FETCH] Smart Cart para ${cartItems?.length || 0} items. CART_SOURCE = supabase`);
  if (!cartItems || cartItems.length === 0) {
    return { options: [], bestOption: null };
  }

  let catalogIds = [...new Set(cartItems.map(c => c.catalogId))];
  
  const matrix = {};
  await Promise.all(catalogIds.map(async id => {
    matrix[id] = await fetchPricesForMedication(id);
  }));

  let totalPeorCaso = 0;
  catalogIds.forEach(id => {
    const prices = matrix[id].filter(p => p.stock);
    const wp = prices.length > 0 ? prices.reduce((worst, curr) => (curr.precio > worst.precio ? curr : worst)) : null;
    if (wp) totalPeorCaso += wp.precio;
  });

  const cartFarmaciaUnica = [];
  FARMACIAS.forEach((farmacia) => {
    let subtotal = 0;
    let items = [];
    let hasAll = true;

    for (const id of catalogIds) {
      const priceData = matrix[id].find((p) => p.farmacia.id === farmacia.id);
      if (priceData && priceData.stock) {
        const qty = cartItems.find(c => c.catalogId === id)?.cantidad || 1;
        subtotal += (priceData.precio * qty);
        items.push({ catalogId: id, priceData, qty });
      } else {
        hasAll = false;
        break;
      }
    }

    if (hasAll) {
      cartFarmaciaUnica.push({
        tipo: 'UNICA',
        farmacia,
        subtotal,
        ahorroTotal: totalPeorCaso - subtotal,
        items,
      });
    }
  });

  let subtotalMixto = 0;
  let itemsMixtos = [];
  let tieneQuiebreTotal = false;

  for (const id of catalogIds) {
    const prices = matrix[id].filter(p => p.stock);
    const bp = prices.length > 0 ? prices.reduce((best, curr) => (curr.precio < best.precio ? curr : best)) : null;
    
    if (bp) {
      const qty = cartItems.find(c => c.catalogId === id)?.cantidad || 1;
      subtotalMixto += (bp.precio * qty);
      itemsMixtos.push({ catalogId: id, priceData: bp, qty });
    } else {
      tieneQuiebreTotal = true;
      break;
    }
  }

  const resultOptions = [];
  if (cartFarmaciaUnica.length > 0) {
    cartFarmaciaUnica.sort((a, b) => a.subtotal - b.subtotal);
    resultOptions.push(cartFarmaciaUnica[0]); 
  }

  if (!tieneQuiebreTotal) {
    let farmaciasDistintas = new Set();
    itemsMixtos.forEach(i => farmaciasDistintas.add(i.priceData.farmacia.id));
    if (farmaciasDistintas.size > 1) {
      resultOptions.push({
        tipo: 'MIXTA',
        farmacias: Array.from(farmaciasDistintas).map(fid => FARMACIAS.find(f => f.id === fid)),
        subtotal: subtotalMixto,
        ahorroTotal: totalPeorCaso - subtotalMixto,
        items: itemsMixtos,
        info: 'Comprando en diferentes farmacias para máximo ahorro',
      });
    }
  }

  resultOptions.sort((a, b) => a.subtotal - b.subtotal);
  return {
    options: resultOptions,
    bestOption: resultOptions[0] || null,
  };
}

// ── Ahorro global en medicamentos (Síncrono) ───────────────────

export function calculateMonthlyExpense(medications) {
  let estimatedTotal = 0;

  medications.forEach((med) => {
    if (med.deleted) return;
    const best = findBestPrice(med.catalogId);
    if (best) {
      let multiplicadorMensual = 1; 
      // Lógica simple para estimar gasto mensual
      if (med.frecuencia?.toLowerCase().includes('cada 12')) multiplicadorMensual = 2;
      estimatedTotal += (best.precio * multiplicadorMensual);
    }
  });

  return estimatedTotal;
}

export function calculateTotalSavingsPotential(medications) {
  let totalSavings = 0;
  medications.forEach((med) => {
    if (med.deleted) return;
    const stats = calculateSavingsPotential(med.catalogId);
    let multiplicadorMensual = 1;
    if (med.frecuencia?.toLowerCase().includes('cada 12')) multiplicadorMensual = 2;
    totalSavings += (stats.ahorro * multiplicadorMensual);
  });
  return totalSavings;
}

// ── Alternativas Bioequivalentes ─────────────────────────────

export function getBioequivalentAlternatives(medicationCatalogId) {
  const sourceMed = getCatalogMedication(medicationCatalogId);
  if (!sourceMed) return [];

  const alternativas = MEDICATIONS_CATALOG.filter((m) => 
    m.esBioequivalente && 
    (m.bioequivalenteDe === medicationCatalogId || m.principioActivo === sourceMed.principioActivo) &&
    m.id !== medicationCatalogId
  );

  return alternativas.map(alt => {
    const precios = getPricesForMedication(alt.id).filter(p => p.stock);
    if (precios.length === 0) return null;
    const bestPrice = precios.reduce((best, curr) => (curr.precio < best.precio ? curr : best));
    return { ...alt, mejorPrecio: bestPrice };
  }).filter(Boolean);
}

// ── Ahorro acumulado desde registros de compras ──────────────

export function calculateAccumulatedSavings(purchases = []) {
  return purchases.reduce((total, p) => total + (p.ahorroObtenido || 0), 0);
}

// ── Ahorro familiar total ────────────────────────────────────

export function calculateFamilySavings(purchases = []) {
  return calculateAccumulatedSavings(purchases);
}

// ── Detectar oportunidad de compra para un medicamento ───────

export function detectPurchaseOpportunity(medicationCatalogId) {
  const best = findBestPrice(medicationCatalogId);
  const historicalAvg = getAverageHistoricalPrice(medicationCatalogId);
  if (!best || historicalAvg === 0) return null;

  const descuento = historicalAvg - best.precio;
  const porcentaje = Math.round((descuento / historicalAvg) * 100);

  if (porcentaje >= 15) {
    return {
      tipo: 'COMPRAR_AHORA',
      motivo: `${porcentaje}% bajo el precio histórico en ${best.farmacia.nombre}`,
      ahorroEstimado: descuento,
      farmacia: best.farmacia,
      precio: best.precio,
    };
  }
  return null;
}

// ── Evaluar riesgo de quiebre de stock ───────────────────────

export function assessStockRisk(medicationCatalogId) {
  const prices = getPricesForMedication(medicationCatalogId);
  const conStock = prices.filter(p => p.stock).length;
  const total = prices.length;

  if (total === 0) return { nivel: 'desconocido', color: '⚪', descripcion: 'Sin datos de stock' };
  const ratio = conStock / total;

  if (ratio === 0) return { nivel: 'alto', color: '🔴', descripcion: 'Sin stock en ninguna farmacia' };
  if (ratio <= 0.4) return { nivel: 'alto', color: '🔴', descripcion: 'Stock crítico — pocas farmacias disponibles' };
  if (ratio <= 0.7) return { nivel: 'medio', color: '🟡', descripcion: 'Stock limitado en algunas farmacias' };
  return { nivel: 'bajo', color: '🟢', descripcion: 'Stock disponible en la mayoría de farmacias' };
}

// ── Predecir próxima reposición ──────────────────────────────

export function predictNextRefill(med) {
  if (!med.ultimaCompra || !med.cantidadComprada) return null;

  const ultima = new Date(med.ultimaCompra);
  const hoy = new Date();
  const diasPasados = Math.floor((hoy - ultima) / (1000 * 60 * 60 * 24));

  let pastillasPorDia = 1;
  if (med.frecuencia?.toLowerCase().includes('cada 12')) pastillasPorDia = 2;
  if (med.frecuencia?.toLowerCase().includes('cada 8')) pastillasPorDia = 3;

  const diasCobertura = Math.floor(med.cantidadComprada / pastillasPorDia);
  const diasRestantes = diasCobertura - diasPasados;

  if (diasRestantes < 0) return { diasRestantes: 0, urgencia: 'urgente' };
  if (diasRestantes <= 3) return { diasRestantes, urgencia: 'urgente' };
  if (diasRestantes <= 7) return { diasRestantes, urgencia: 'pronto' };
  return { diasRestantes, urgencia: 'normal' };
}

// ── Beneficios aplicables a un medicamento ───────────────────

export function getApplicableBenefits(medicationCatalogId) {
  return BENEFICIOS.filter(b => b.activo && b.medicamentosAplicables.includes(medicationCatalogId));
}

// ── Bioequivalentes con ahorro calculado (para Compare.jsx) ──

export function getBioequivalentSavings(medicationCatalogId) {
  const sourceMed = getCatalogMedication(medicationCatalogId);
  if (!sourceMed) return [];

  const sourceWorst = findHighestPrice(medicationCatalogId);
  if (!sourceWorst) return [];

  const alternativas = MEDICATIONS_CATALOG.filter((m) =>
    m.esBioequivalente &&
    (m.bioequivalenteDe === medicationCatalogId || m.principioActivo === sourceMed.principioActivo) &&
    m.id !== medicationCatalogId
  );

  return alternativas.map(alt => {
    const precios = getPricesForMedication(alt.id).filter(p => p.stock);
    if (precios.length === 0) return null;
    const mejorPrecio = precios.reduce((best, curr) => (curr.precio < best.precio ? curr : best));
    const ahorro = sourceWorst.precio - mejorPrecio.precio;
    const porcentajeAhorro = sourceWorst.precio > 0
      ? Math.round((ahorro / sourceWorst.precio) * 100)
      : 0;
    return {
      medicamento: alt,
      certificacion: alt.certificacionISP || 'N/A',
      mejorPrecio,
      ahorro: Math.max(ahorro, 0),
      porcentajeAhorro: Math.max(porcentajeAhorro, 0),
    };
  }).filter(Boolean).filter(b => b.ahorro > 0);
}

// ── Bioequivalentes en Tiempo Real (Supabase) ────────────────
export async function fetchBioequivalentSavings(medicationCatalogId) {
  const sourceMed = getCatalogMedication(medicationCatalogId);
  if (!sourceMed) return [];

  const sourcePrices = await fetchPricesForMedication(medicationCatalogId);
  const inStockSource = sourcePrices.filter(p => p.stock);
  const sourceWorst = inStockSource.length > 0 ? inStockSource.reduce((worst, curr) => (curr.precio > worst.precio ? curr : worst)) : null;

  if (!sourceWorst) return [];

  const alternativas = MEDICATIONS_CATALOG.filter((m) =>
    m.esBioequivalente &&
    (m.bioequivalenteDe === medicationCatalogId || m.principioActivo === sourceMed.principioActivo) &&
    m.id !== medicationCatalogId
  );

  const results = [];
  for (const alt of alternativas) {
    const precios = await fetchPricesForMedication(alt.id);
    const inStock = precios.filter(p => p.stock);
    if (inStock.length === 0) continue;
    
    const mejorPrecio = inStock.reduce((best, curr) => (curr.precio < best.precio ? curr : best));
    const ahorro = sourceWorst.precio - mejorPrecio.precio;
    const porcentajeAhorro = sourceWorst.precio > 0 ? Math.round((ahorro / sourceWorst.precio) * 100) : 0;
    
    if (ahorro > 0) {
      results.push({
        medicamento: alt,
        certificacion: alt.certificacionISP || 'N/A',
        mejorPrecio,
        ahorro: Math.max(ahorro, 0),
        porcentajeAhorro: Math.max(porcentajeAhorro, 0),
      });
    }
  }
  
  return results.sort((a, b) => b.ahorro - a.ahorro);
}
