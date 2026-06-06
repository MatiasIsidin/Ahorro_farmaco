// ============================================================
// LOGGER — Structured logging service (production-grade)
// Proyecto: vggyvqvwqoudnfupykvx.supabase.co
// Niveles: debug | info | warn | error
// En producción: envía warn/error a tabla error_logs en Supabase
// ============================================================

import { supabase } from './supabaseClient';

const IS_PROD = import.meta.env.PROD;
const APP_VERSION = import.meta.env.VITE_APP_VERSION || '1.0.0';

// ── Contexto de sesión ───────────────────────────────────────
let _ctx = { userId: null };

export function setLoggerContext(ctx) {
  _ctx = { ..._ctx, ...ctx };
}

// ── Envío remoto a Supabase ──────────────────────────────────
async function sendToRemote(level, message, meta = {}) {
  try {
    await supabase.from('error_logs').insert([{
      level,
      message: String(message).slice(0, 500),          // truncar
      stack: meta.stack ? String(meta.stack).slice(0, 2000) : null,
      component: meta.component || null,
      app_version: APP_VERSION,
      route: typeof window !== 'undefined' ? window.location.pathname : null,
      metadata: {
        code: meta.code || null,
        supabaseCode: meta.supabaseCode || null,
        supabaseHint: meta.supabaseHint || null,
        errorMessage: meta.errorMessage || null,
        bucket: meta.bucket || null,
        errorId: meta.errorId || null,
      },
      user_id: _ctx.userId || null,
    }]);
  } catch {
    // Silenciar — el logger nunca debe crear loops ni romper la app
  }
}

// ── API pública ──────────────────────────────────────────────
export const logger = {
  debug(message, meta = {}) {
    if (IS_PROD) return;
    console.debug(`[DEBUG] ${message}`, meta);
  },

  info(message, meta = {}) {
    if (IS_PROD) return;
    console.info(`[INFO] ${message}`, meta);
  },

  warn(message, meta = {}) {
    console.warn(`[WARN] ${message}`, meta);
    if (IS_PROD) sendToRemote('warn', message, meta);
  },

  error(message, error = null, meta = {}) {
    const enriched = {
      ...meta,
      code: error?.code || error?.status || null,
      // stack solo en dev — en prod es null para no exponer código fuente
      stack: IS_PROD ? null : error?.stack,
      errorMessage: error?.message || (error ? String(error) : null),
    };
    console.error(`[ERROR] ${message}`, error, meta);
    sendToRemote('error', message, enriched);
  },

  supabase(operation, error, meta = {}) {
    this.error(`Supabase [${operation}]`, error, {
      ...meta,
      supabaseCode: error?.code,
      supabaseHint: error?.hint,
    });
  },

  storage(operation, error, meta = {}) {
    this.error(`Storage [${operation}]`, error, {
      ...meta,
      bucket: meta.bucket || 'prescriptions',
    });
  },

  auth(operation, error) {
    this.error(`Auth [${operation}]`, error);
  },
};
