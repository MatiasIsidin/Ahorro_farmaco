// ============================================================
// ERROR BOUNDARY — Captura errores React en producción
// Muestra fallback UI en vez de pantalla blanca
// ============================================================

import { Component } from 'react';
import { logger } from '../lib/logger';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, errorId: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, errorMessage: error?.message || String(error) };
  }

  componentDidCatch(error, info) {
    const errorId = `err-${Date.now()}`;
    this.setState({ errorId, errorMessage: error?.message || String(error) });
    logger.error('React ErrorBoundary caught', error, {
      componentStack: info.componentStack?.slice(0, 500),
      errorId,
    });
  }

  handleReset = () => {
    this.setState({ hasError: false, errorId: null });
    window.location.href = '/dashboard';
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div
        role="alert"
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem',
          textAlign: 'center',
          background: 'var(--color-bg)',
          gap: '1rem',
        }}
      >
        <span style={{ fontSize: '3rem' }}>⚠️</span>
        <h2 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700, color: 'var(--color-text)' }}>
          Algo salió mal
        </h2>
        <p style={{ color: 'var(--color-text-secondary)', maxWidth: '400px', lineHeight: 1.6 }}>
          Ocurrió un error inesperado. Tu información está segura. Por favor intenta recargar la página.
        </p>
        {this.state.errorId && (
          <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
            Código de referencia: {this.state.errorId}
          </p>
        )}
        {this.state.errorMessage && import.meta.env.DEV && (
          <pre style={{
            fontSize: '11px', color: '#ef4444', background: '#fef2f2',
            padding: '12px', borderRadius: '8px', maxWidth: '600px',
            textAlign: 'left', overflow: 'auto', marginTop: '8px',
          }}>
            {this.state.errorMessage}
          </pre>
        )}
        <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
          <button
            className="btn btn-primary"
            onClick={this.handleReset}
          >
            Volver al inicio
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => window.location.reload()}
          >
            Recargar página
          </button>
        </div>
      </div>
    );
  }
}
