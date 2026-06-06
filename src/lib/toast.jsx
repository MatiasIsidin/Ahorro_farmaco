// ============================================================
// TOAST SYSTEM — Notificaciones centralizadas
// Uso: toast.success('Guardado') | toast.error('Error') | toast.info(...)
// ============================================================

import { createContext, useContext, useState, useCallback, useRef } from 'react';

const ToastContext = createContext(null);

let _toastFn = null; // Referencia global para uso fuera de componentes

// ── Tipos ────────────────────────────────────────────────────
const ICONS = {
  success: '✅',
  error: '❌',
  warning: '⚠️',
  info: 'ℹ️',
  loading: '⏳',
};

const DURATIONS = {
  success: 3500,
  error: 6000,
  warning: 5000,
  info: 4000,
  loading: 0, // manual dismiss
};

// ── Provider ─────────────────────────────────────────────────
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const counterRef = useRef(0);

  const dismiss = useCallback((id) => {
    setToasts(prev => prev.map(t => t.id === id ? { ...t, exiting: true } : t));
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 300);
  }, []);

  const show = useCallback((type, message, options = {}) => {
    const id = ++counterRef.current;
    const duration = options.duration ?? DURATIONS[type];

    setToasts(prev => {
      // Máximo 4 toasts simultáneos
      const next = prev.length >= 4 ? prev.slice(1) : prev;
      return [...next, { id, type, message, exiting: false }];
    });

    if (duration > 0) {
      setTimeout(() => dismiss(id), duration);
    }
    return id;
  }, [dismiss]);

  // Exponer globalmente
  _toastFn = show;

  return (
    <ToastContext.Provider value={{ show, dismiss }}>
      {children}
      <div
        role="region"
        aria-live="polite"
        aria-label="Notificaciones"
        style={{
          position: 'fixed',
          bottom: '80px',
          right: '16px',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          maxWidth: '360px',
          width: 'calc(100vw - 32px)',
        }}
      >
        {toasts.map(t => (
          <div
            key={t.id}
            role="alert"
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
              padding: '12px 16px',
              borderRadius: '12px',
              background: 'var(--color-bg-card)',
              border: `1px solid ${
                t.type === 'error' ? '#fecaca' :
                t.type === 'success' ? '#bbf7d0' :
                t.type === 'warning' ? '#fde68a' : '#bfdbfe'
              }`,
              boxShadow: 'var(--shadow-lg)',
              fontSize: 'var(--font-size-sm)',
              color: 'var(--color-text)',
              animation: t.exiting
                ? 'toastOut 0.3s ease forwards'
                : 'toastIn 0.3s ease forwards',
              cursor: 'pointer',
            }}
            onClick={() => dismiss(t.id)}
          >
            <span style={{ fontSize: '16px', flexShrink: 0, marginTop: '1px' }}>
              {ICONS[t.type]}
            </span>
            <span style={{ flex: 1, lineHeight: '1.4' }}>{t.message}</span>
            <button
              aria-label="Cerrar notificación"
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--color-text-muted)',
                fontSize: '16px',
                lineHeight: 1,
                padding: '0 0 0 4px',
                flexShrink: 0,
              }}
              onClick={(e) => { e.stopPropagation(); dismiss(t.id); }}
            >
              ×
            </button>
          </div>
        ))}
      </div>
      <style>{`
        @keyframes toastIn {
          from { opacity: 0; transform: translateX(20px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes toastOut {
          from { opacity: 1; transform: translateX(0); }
          to { opacity: 0; transform: translateX(20px); }
        }
      `}</style>
    </ToastContext.Provider>
  );
}

// ── Hook ─────────────────────────────────────────────────────
export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

// ── API global (para uso fuera de componentes) ───────────────
export const toast = {
  success: (msg, opts) => _toastFn?.('success', msg, opts),
  error: (msg, opts) => _toastFn?.('error', msg, opts),
  warning: (msg, opts) => _toastFn?.('warning', msg, opts),
  info: (msg, opts) => _toastFn?.('info', msg, opts),
  loading: (msg, opts) => _toastFn?.('loading', msg, opts),
};
