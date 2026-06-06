// ============================================================
// useAsyncAction — Hook para acciones async con loading/error
// Previene double-submit, maneja errores centralizadamente
// ============================================================

import { useState, useCallback, useRef } from 'react';
import { toast } from '../lib/toast';
import { logger } from '../lib/logger';

/**
 * @param {Function} fn - función async a ejecutar
 * @param {object} options
 * @param {string} [options.successMessage]
 * @param {string} [options.errorMessage]
 * @param {boolean} [options.showToast=true]
 */
export function useAsyncAction(fn, options = {}) {
  const {
    successMessage,
    errorMessage = 'Ocurrió un error. Por favor intenta de nuevo.',
    showToast = true,
  } = options;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const inFlightRef = useRef(false);

  const execute = useCallback(async (...args) => {
    // Prevenir double-submit
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    setLoading(true);
    setError(null);

    try {
      const result = await fn(...args);
      if (showToast && successMessage) {
        toast.success(successMessage);
      }
      return result;
    } catch (err) {
      const msg = err?.message || errorMessage;
      setError(msg);
      logger.error('useAsyncAction caught error', err);
      if (showToast) {
        toast.error(errorMessage);
      }
      throw err;
    } finally {
      setLoading(false);
      inFlightRef.current = false;
    }
  }, [fn, successMessage, errorMessage, showToast]);

  return { execute, loading, error };
}
