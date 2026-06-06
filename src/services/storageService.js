// ============================================================
// STORAGE SERVICE — Capa de persistencia asíncrona conectada a Supabase
// ============================================================

import { supabase } from '../lib/supabaseClient';
import { logger } from '../lib/logger';

const STORAGE_KEYS = {
  ACTIVE_PROFILE: 'ahorro_active_profile',
  SETTINGS: 'ahorro_settings',
  SUBSCRIPTION: 'ahorro_subscription',
  ONBOARDING: 'ahorro_onboarding',
};

// ── Local Storage Helpers para Preferencias de UI ────────────

function readLocal(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeLocal(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

// ── Helper de usuario autenticado ────────────────────────────

async function getUserId() {
  const { data: { user } } = await supabase.auth.getUser();
  return user ? user.id : null;
}

// ── Profiles ─────────────────────────────────────────────────

export async function getProfiles() {
  const { data, error } = await supabase.from('family_profiles').select('*');
  if (error) {
    logger.supabase('getProfiles', error);
    return [];
  }
  return data.map(p => ({
    id: p.id,
    nombre: p.name,
    tipo: p.type,
    tipoPerfil: p.type,
    icono: p.icon,
    rangoEdad: p.age_range,
    comuna: p.commune,
    patologias: p.pathologies,
    creadoEn: p.created_at,
  }));
}

export async function addProfile(profile) {
  const userId = await getUserId();
  if (!userId) return null;

  // No enviar id — dejar que Supabase genere el UUID
  const { data, error } = await supabase.from('family_profiles').insert([{
    user_id: userId,
    name: profile.nombre,
    type: profile.tipo,
    icon: profile.icono,
    age_range: profile.rangoEdad,
    commune: profile.comuna,
    pathologies: profile.patologias || [],
  }]).select().single();

  if (error) {
    logger.supabase('addProfile', error);
    return null;
  }
  // Retornar el UUID real generado por Supabase
  return data.id;
}

export async function updateProfile(id, updates) {
  const payload = {};
  if (updates.nombre !== undefined) payload.name = updates.nombre;
  if (updates.tipo !== undefined) payload.type = updates.tipo;
  if (updates.icono !== undefined) payload.icon = updates.icono;
  if (updates.rangoEdad !== undefined) payload.age_range = updates.rangoEdad;
  if (updates.comuna !== undefined) payload.commune = updates.comuna;
  if (updates.patologias !== undefined) payload.pathologies = updates.patologias;
  if (updates.prevision !== undefined) payload.prevision = updates.prevision;
  payload.updated_at = new Date().toISOString();

  const { error } = await supabase.from('family_profiles').update(payload).eq('id', id);
  if (error) {
    logger.supabase('updateProfile', error);
    return false;
  }
  return true;
}

export async function deleteProfile(id) {
  const { error } = await supabase.from('family_profiles').delete().eq('id', id);
  if (error) logger.supabase('deleteProfile', error);
}

export function getActiveProfileId() {
  return readLocal(STORAGE_KEYS.ACTIVE_PROFILE);
}

export function setActiveProfileId(id) {
  return writeLocal(STORAGE_KEYS.ACTIVE_PROFILE, id);
}

// ── Medications ──────────────────────────────────────────────

export async function getMedications() {
  const { data, error } = await supabase.from('user_medications').select('*');
  if (error) {
    logger.supabase('getMedications', error);
    return [];
  }
  return data.map(m => ({
    id: m.id,
    profileId: m.profile_id,
    catalogId: m.catalog_id,
    nombre: m.name_override || null,
    dosis: m.dose_override || null,
    frecuencia: m.frequency,
    cantidadComprada: m.bought_amount,
    alertasActivas: m.alerts_active,
    origen: m.origin,
    ultimaCompra: m.last_purchase_date,
    creadoEn: m.created_at,
    deleted: false,
  }));
}

export async function addMedication(medication) {
  // No enviar id — dejar que Supabase genere el UUID
  const { data, error } = await supabase.from('user_medications').insert([{
    profile_id: medication.profileId,
    catalog_id: medication.catalogId,
    frequency: medication.frecuencia || 'Diario',
    bought_amount: medication.cantidadComprada || 0,
    alerts_active: medication.alertasActivas !== false,
    origin: medication.origen || 'Manual',
  }]).select().single();

  if (error) {
    logger.supabase('addMedication', error);
    return { success: false, error: error.message };
  }
  return { success: true, id: data.id };
}

export async function updateMedication(id, updates) {
  const payload = {};
  if (updates.frecuencia) payload.frequency = updates.frecuencia;
  if (updates.cantidadComprada !== undefined) payload.bought_amount = updates.cantidadComprada;
  if (updates.alertasActivas !== undefined) payload.alerts_active = updates.alertasActivas;
  if (updates.ultimaCompra) payload.last_purchase_date = updates.ultimaCompra;

  const { error } = await supabase.from('user_medications').update(payload).eq('id', id);
  if (error) logger.supabase('updateMedication', error);
  return !error;
}

export async function deleteMedication(id) {
  const { error } = await supabase.from('user_medications').delete().eq('id', id);
  if (error) logger.supabase('deleteMedication', error);
  return !error;
}

// ── Alerts ───────────────────────────────────────────────────

export async function getAlerts() {
  const { data, error } = await supabase.from('alerts').select('*');
  if (error) {
    logger.supabase('getAlerts', error);
    return [];
  }
  return data.map(a => ({
    id: a.id,
    profileId: a.profile_id,
    medicationId: a.medication_id,
    tipo: a.type,
    mensaje: a.message,
    leida: a.is_read,
    activa: a.is_active,
    creadoEn: a.created_at,
  }));
}

export async function saveAlerts(alerts) {
  const userId = await getUserId();
  if (!userId) return false;

  const payload = alerts.map(a => ({
    id: a.id || undefined,
    user_id: userId,
    profile_id: a.profileId || null,
    medication_id: a.medicationId || null,
    type: a.tipo || 'SYSTEM',
    message: a.mensaje,
    is_read: a.leida || false,
    is_active: a.activa !== false,
  }));

  const { error } = await supabase.from('alerts').upsert(payload);
  if (error) logger.supabase('saveAlerts', error);
  return !error;
}

// ── Cart ─────────────────────────────────────────────────────

export async function getCart() {
  const userId = await getUserId();
  if (!userId) return [];

  const { data: cart } = await supabase
    .from('shopping_carts')
    .select('id')
    .eq('user_id', userId)
    .eq('status', 'active')
    .maybeSingle();

  if (!cart) return [];

  const { data: items, error } = await supabase
    .from('cart_items')
    .select('*, medications_catalog(*)')
    .eq('cart_id', cart.id);

  if (error) {
    logger.supabase('getCart', error);
    return [];
  }

  console.log('[CART] Loaded', items?.length || 0, 'items from db. CART_SOURCE = supabase');

  return (items || []).map(i => ({
    id: i.id,
    catalogId: i.catalog_id,
    medicationId: i.id,
    cantidad: i.quantity,
    nombre: i.medications_catalog?.name || 'Desconocido',
    dosis: i.medications_catalog?.dose || '',
    forma: i.medications_catalog?.form || '',
  }));
}

export async function addToCart(item) {
  const userId = await getUserId();
  if (!userId) return false;

  let { data: cart } = await supabase
    .from('shopping_carts')
    .select('id')
    .eq('user_id', userId)
    .eq('status', 'active')
    .maybeSingle();

  if (!cart) {
    const { data: newCart } = await supabase
      .from('shopping_carts')
      .insert([{ user_id: userId, status: 'active' }])
      .select('id')
      .single();
    cart = newCart;
  }

  // Si ya existe ese medicamento en el carrito, incrementar cantidad
  const { data: existing } = await supabase
    .from('cart_items')
    .select('id, quantity')
    .eq('cart_id', cart.id)
    .eq('catalog_id', item.catalogId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from('cart_items')
      .update({ quantity: existing.quantity + 1 })
      .eq('id', existing.id);
    if (error) logger.supabase('addToCart:update', error);
    return !error;
  }

  const { error } = await supabase.from('cart_items').insert([{
    cart_id: cart.id,
    catalog_id: item.catalogId,
    quantity: item.cantidad || 1,
  }]);

  if (error) logger.supabase('addToCart', error);
  return !error;
}

export async function removeFromCart(itemId) {
  // Decrementar cantidad o eliminar si quantity = 1
  const { data: item } = await supabase
    .from('cart_items')
    .select('id, quantity')
    .eq('id', itemId)
    .maybeSingle();

  if (!item) return false;

  if (item.quantity > 1) {
    const { error } = await supabase
      .from('cart_items')
      .update({ quantity: item.quantity - 1 })
      .eq('id', itemId);
    if (error) logger.supabase('removeFromCart:decrement', error);
    return !error;
  }

  const { error } = await supabase
    .from('cart_items')
    .delete()
    .eq('id', itemId);
  if (error) logger.supabase('removeFromCart:delete', error);
  return !error;
}

export async function deleteFromCart(itemId) {
  // Eliminar completamente sin importar la cantidad
  const { error } = await supabase
    .from('cart_items')
    .delete()
    .eq('id', itemId);
  if (error) logger.supabase('deleteFromCart', error);
  return !error;
}

export async function clearCart() {
  const userId = await getUserId();
  if (!userId) return false;

  await supabase
    .from('shopping_carts')
    .update({ status: 'completed' })
    .eq('user_id', userId)
    .eq('status', 'active');
  return true;
}

// ── Purchases / Savings Records ──────────────────────────────

export async function getPurchases() {
  const { data, error } = await supabase.from('savings_records').select('*');
  if (error) {
    logger.supabase('getPurchases', error);
    return [];
  }
  return data.map(p => ({
    id: p.id,
    profileId: p.profile_id,
    costoFinal: p.total_cost,
    ahorroObtenido: p.savings_obtained,
    fecha: p.purchase_date,
    creadoEn: p.created_at,
  }));
}

export async function addPurchase(purchase) {
  const userId = await getUserId();
  if (!userId) return false;

  const { error } = await supabase.from('savings_records').insert([{
    user_id: userId,
    profile_id: purchase.profileId,
    total_cost: purchase.costoFinal || 0,
    savings_obtained: purchase.ahorroObtenido || 0,
  }]);
  if (error) logger.supabase('addPurchase', error);
  return !error;
}

// ── Settings (Local) ─────────────────────────────────────────

const DEFAULT_SETTINGS = {
  seniorMode: false,
  theme: 'light',
  notificationsEnabled: true,
  language: 'es',
};

export function getSettings() {
  return readLocal(STORAGE_KEYS.SETTINGS) || { ...DEFAULT_SETTINGS };
}

export function updateSettings(updates) {
  const settings = getSettings();
  return writeLocal(STORAGE_KEYS.SETTINGS, { ...settings, ...updates });
}

// ── Onboarding (Local UI state) ──────────────────────────────

export function getOnboarding() {
  return readLocal(STORAGE_KEYS.ONBOARDING);
}

export function saveOnboarding(data) {
  return writeLocal(STORAGE_KEYS.ONBOARDING, data);
}

export function isOnboardingComplete() {
  return !!readLocal(STORAGE_KEYS.ONBOARDING)?.completed;
}

export function clearSessionStorage() {
  try {
    localStorage.removeItem(STORAGE_KEYS.ACTIVE_PROFILE);
    localStorage.removeItem(STORAGE_KEYS.ONBOARDING);
    localStorage.removeItem(STORAGE_KEYS.SUBSCRIPTION);
    sessionStorage.clear();
  } catch (e) {
    console.warn('Error clearing session storage', e);
  }
}

// ── Recipes ──────────────────────────────────────────────────

export async function getRecipes() {
  const { data, error } = await supabase.from('prescriptions').select('*');
  if (error) {
    logger.supabase('getRecipes', error);
    return [];
  }
  return data.map(r => {
    const rawPath = r.image_url || '';
    const segments = rawPath.split('/');
    const fileName = segments.length > 0 ? segments[segments.length - 1] : 'receta';
    return {
      id: r.id,
      profileId: r.profile_id,
      imagen: r.image_url,
      nombreArchivo: fileName,
      medico: r.doctor_name,
      fechaEmision: r.issue_date,
      fechaExpiracion: r.expiration_date,
      medicamentosAsociados: [],
      creadoEn: r.created_at,
    };
  });
}

export async function addRecipe(recipePayload) {
  const userId = await getUserId();
  if (!userId) return false;

  let imageUrl = recipePayload.imagen || '';

  if (recipePayload.file) {
    // Validar tipo MIME en cliente (defensa en profundidad — Supabase policies son la barrera real)
    const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!ALLOWED_MIME.includes(recipePayload.file.type)) {
      logger.warn('addRecipe: tipo de archivo no permitido', { type: recipePayload.file.type });
      return false;
    }
    // Limitar tamaño a 10 MB
    if (recipePayload.file.size > 10 * 1024 * 1024) {
      logger.warn('addRecipe: archivo demasiado grande', { size: recipePayload.file.size });
      return false;
    }

    const fileExt = recipePayload.file.name.split('.').pop().toLowerCase();
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `${userId}/${recipePayload.profileId}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('prescriptions')
      .upload(filePath, recipePayload.file, {
        contentType: recipePayload.file.type,
        upsert: false,
      });

    if (uploadError) {
      logger.storage('upload', uploadError, { filePath });
      return false;
    }

    imageUrl = filePath;
  }

  const { error } = await supabase.from('prescriptions').insert([{
    profile_id: recipePayload.profileId,
    image_url: imageUrl,
    doctor_name: recipePayload.medico || 'No especificado',
    issue_date: recipePayload.fechaEmision,
    expiration_date: recipePayload.fechaExpiracion,
  }]);

  if (error) logger.supabase('addRecipe', error);
  return !error;
}

export async function deleteRecipe(id) {
  const { data: recipe } = await supabase
    .from('prescriptions')
    .select('image_url')
    .eq('id', id)
    .maybeSingle();

  if (recipe?.image_url && !recipe.image_url.startsWith('http')) {
    const { error: storageError } = await supabase.storage
      .from('prescriptions')
      .remove([recipe.image_url]);
    if (storageError) {
      logger.storage('delete', storageError, { path: recipe.image_url });
    }
  }

  const { error } = await supabase.from('prescriptions').delete().eq('id', id);
  if (error) logger.supabase('deleteRecipe', error);
  return !error;
}

export async function getRecipeSignedUrl(filePath) {
  if (!filePath) return null;

  let path = filePath;
  if (path.startsWith('http')) {
    try {
      const url = new URL(filePath);
      const parts = url.pathname.split('/prescriptions/');
      if (parts.length > 1) path = parts[1];
    } catch (e) {
      logger.warn('getRecipeSignedUrl: URL inválida', { filePath });
      return null;
    }
  }

  const { data, error } = await supabase.storage
    .from('prescriptions')
    .createSignedUrl(path, 300);

  if (error) {
    logger.storage('createSignedUrl', error, { path });
    return null;
  }
  return data.signedUrl;
}
