// ============================================================
// TESTS — savingsEngine.js
// ============================================================

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock Supabase antes de importar el engine
vi.mock('../lib/supabaseClient', () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockResolvedValue({ data: [], error: null }),
    }),
  },
}));

import {
  formatCLP,
  calculateAccumulatedSavings,
  calculateFamilySavings,
  assessStockRisk,
  predictNextRefill,
  detectPurchaseOpportunity,
} from '../services/savingsEngine';

describe('formatCLP', () => {
  it('formatea números como pesos chilenos', () => {
    const result = formatCLP(10000);
    expect(result).toContain('10');
    expect(result).toContain('000');
  });

  it('maneja cero', () => {
    expect(formatCLP(0)).toBeTruthy();
  });
});

describe('calculateAccumulatedSavings', () => {
  it('suma ahorroObtenido de todas las compras', () => {
    const purchases = [
      { ahorroObtenido: 5000 },
      { ahorroObtenido: 3000 },
      { ahorroObtenido: 2000 },
    ];
    expect(calculateAccumulatedSavings(purchases)).toBe(10000);
  });

  it('retorna 0 para array vacío', () => {
    expect(calculateAccumulatedSavings([])).toBe(0);
  });

  it('maneja compras sin ahorroObtenido', () => {
    const purchases = [{ costoFinal: 5000 }, { ahorroObtenido: 1000 }];
    expect(calculateAccumulatedSavings(purchases)).toBe(1000);
  });
});

describe('calculateFamilySavings', () => {
  it('es equivalente a calculateAccumulatedSavings', () => {
    const purchases = [{ ahorroObtenido: 7500 }];
    expect(calculateFamilySavings(purchases)).toBe(7500);
  });
});

describe('assessStockRisk', () => {
  it('retorna nivel desconocido cuando no hay datos', () => {
    const result = assessStockRisk('med-inexistente');
    expect(result.nivel).toBe('desconocido');
  });
});

describe('predictNextRefill', () => {
  it('retorna null si no hay ultimaCompra', () => {
    const med = { cantidadComprada: 30, frecuencia: 'Una vez al día' };
    expect(predictNextRefill(med)).toBeNull();
  });

  it('retorna null si no hay cantidadComprada', () => {
    const med = { ultimaCompra: new Date().toISOString() };
    expect(predictNextRefill(med)).toBeNull();
  });

  it('calcula días restantes correctamente', () => {
    const ultimaCompra = new Date();
    ultimaCompra.setDate(ultimaCompra.getDate() - 25);
    const med = {
      ultimaCompra: ultimaCompra.toISOString(),
      cantidadComprada: 30,
      frecuencia: 'Una vez al día',
    };
    const result = predictNextRefill(med);
    expect(result).not.toBeNull();
    expect(result.diasRestantes).toBeGreaterThanOrEqual(0);
    expect(result.diasRestantes).toBeLessThanOrEqual(10);
  });

  it('marca urgente cuando quedan 3 días o menos', () => {
    const ultimaCompra = new Date();
    ultimaCompra.setDate(ultimaCompra.getDate() - 28);
    const med = {
      ultimaCompra: ultimaCompra.toISOString(),
      cantidadComprada: 30,
      frecuencia: 'Una vez al día',
    };
    const result = predictNextRefill(med);
    expect(result?.urgencia).toBe('urgente');
  });
});
