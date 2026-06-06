// ============================================================
// ANALYTICS — Privacy-safe event tracking (HealthTech compliant)
// Proyecto: vggyvqvwqoudnfupykvx.supabase.co
//
// NUNCA registra: patologías, recetas, nombres de medicamentos,
// datos médicos, PII, contenido de formularios, queries de búsqueda.
// Solo registra: acciones de UI, funnels de conversión, performance.
// ============================================================

import { supabase } from './supabaseClient';

const IS_PROD = import.meta.env.PROD;
const ANALYTICS_ENABLED = import.meta.env.VITE_ANALYTICS_ENABLED === 'true';
const APP_VERSION = import.meta.env.VITE_APP_VERSION || '1.0.0';

// ── Contexto de sesión ───────────────────────────────────────
let _sessionId = null;
let _userId = null;

export function setAnalyticsUser(userId) {
  // Solo almacenar el UUID — nunca email ni datos personales
  _userId = userId || null;
}

function getSessionId() {
  if (_sessionId) return _sessionId;
  _sessionId =
    sessionStorage.getItem('_ahorro_sid') ||
    `s_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  sessionStorage.setItem('_ahorro_sid', _sessionId);
  return _sessionId;
}

function getDeviceInfo() {
  return {
    // Solo metadata técnica — sin fingerprinting
    viewport: `${window.innerWidth}x${window.innerHeight}`,
    mobile: window.innerWidth < 768,
    lang: navigator.language,
  };
}

// ── Allowlist explícita de eventos permitidos ────────────────
const ALLOWED_EVENTS = new Set([
  // Auth funnel
  'auth_signup_attempt',
  'auth_signup_success',
  'auth_signup_error',
  'auth_login_attempt',
  'auth_login_success',
  'auth_login_error',
  'auth_logout',
  'auth_session_restored',

  // Onboarding funnel
  'onboarding_step_view',
  'onboarding_completed',
  'onboarding_abandoned',

  // Feature usage — SIN datos médicos
  'medication_added',          // solo cuenta, sin nombre ni catalogId
  'medication_deleted',
  'medication_alert_toggled',
  'compare_search',            // sin query — solo que ocurrió
  'compare_result_selected',   // sin nombre del medicamento
  'compare_bioequivalent_viewed',
  'cart_item_added',
  'cart_item_removed',
  'cart_checkout_initiated',
  'cart_cleared',
  'recipe_upload_started',
  'recipe_upload_success',
  'recipe_upload_error',       // solo código de error, sin path
  'recipe_viewed',
  'recipe_downloaded',
  'recipe_deleted',
  'signed_url_generated',      // sin path
  'signed_url_error',
  'alert_viewed',
  'alert_dismissed',
  'alert_marked_read',
  'savings_page_viewed',
  'benefit_viewed',
  'report_exported',
  'profile_added',
  'profile_switched',
  'profile_deleted',
  'settings_changed',          // solo key del setting, sin valor
  'premium_page_viewed',
  'premium_cta_clicked',
  'dashboard_viewed',

  // Performance
  'page_view',
  'data_load_time',
  'page_load_time',
]);

// ── Campos bloqueados (nunca deben llegar a analytics) ───────
const BLOCKED_KEYS = [
  'nombre', 'name', 'patologia', 'pathology',
  'medication', 'medicamento', 'receta', 'prescription',
  'query', 'search', 'doctor', 'medico', 'email',
  'password', 'token', 'key', 'secret', 'catalogId',
  'profileId', 'userId', 'filePath', 'path',
];

function sanitize(properties = {}) {
  return Object.fromEntries(
    Object.entries(properties).filter(
      ([k]) => !BLOCKED_KEYS.some(b => k.toLowerCase().includes(b))
    )
  );
}

// ── Track ────────────────────────────────────────────────────
export async function track(event, properties = {}) {
  if (!ANALYTICS_ENABLED) return;

  if (!ALLOWED_EVENTS.has(event)) {
    if (!IS_PROD) console.warn(`[Analytics] Evento no permitido: ${event}`);
    return;
  }

  const safe = sanitize(properties);

  const payload = {
    event_name: event,
    route: window.location.pathname.replace(/\/[0-9a-f-]{8,}/gi, '/:id'),
    metadata: safe,
    session_id: getSessionId(),
    user_id: _userId,
    device_info: getDeviceInfo(),
    app_version: APP_VERSION,
  };

  if (!IS_PROD) {
    console.debug('[Analytics]', event, safe);
    return;
  }

  try {
    await supabase.from('analytics_events').insert([payload]);
  } catch {
    // Analytics nunca debe romper la app
  }
}

// ── Page view ────────────────────────────────────────────────
export function trackPageView(pathname) {
  const sanitized = pathname.replace(/\/[0-9a-f-]{8,}/gi, '/:id');
  track('page_view', { route: sanitized });
}

// ── Performance timing ───────────────────────────────────────
export function trackTiming(name, durationMs) {
  track('data_load_time', { name, duration_ms: Math.round(durationMs) });
}

// ── Auth events ──────────────────────────────────────────────
export function trackAuth(event) {
  track(event);
}

// ── Error crítico (sin datos médicos) ────────────────────────
export function trackError(context) {
  // Solo trackear el contexto técnico, nunca el mensaje de error completo
  track('page_load_time', { error: true, context });
}
