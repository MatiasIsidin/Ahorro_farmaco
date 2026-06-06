// ============================================================
// TESTS — ErrorBoundary
// ============================================================

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ErrorBoundary from '../components/ErrorBoundary';

// Componente que lanza error para testing
function BrokenComponent() {
  throw new Error('Test error');
}

// Suprimir console.error durante este test
const originalError = console.error;
beforeAll(() => { console.error = vi.fn(); });
afterAll(() => { console.error = originalError; });

describe('ErrorBoundary', () => {
  it('muestra fallback UI cuando un hijo lanza error', () => {
    render(
      <ErrorBoundary>
        <BrokenComponent />
      </ErrorBoundary>
    );
    expect(screen.getByText(/algo salió mal/i)).toBeInTheDocument();
    expect(screen.getByText(/volver al inicio/i)).toBeInTheDocument();
  });

  it('renderiza hijos normalmente cuando no hay error', () => {
    render(
      <ErrorBoundary>
        <div>Contenido normal</div>
      </ErrorBoundary>
    );
    expect(screen.getByText('Contenido normal')).toBeInTheDocument();
  });
});
