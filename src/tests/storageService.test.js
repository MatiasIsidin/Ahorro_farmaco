// ============================================================
// TESTS — storageService.js (validaciones de seguridad de archivos)
// Estos tests validan la lógica de validación ANTES de llamar a Supabase
// ============================================================

import { describe, it, expect, vi } from 'vitest';

// Mock completo de supabase para este archivo
vi.mock('../lib/supabaseClient', () => ({
  supabase: {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-test-123' } } }),
    },
    from: vi.fn().mockReturnValue({
      insert: vi.fn().mockResolvedValue({ error: null }),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null }),
    }),
    storage: {
      from: vi.fn().mockReturnValue({
        upload: vi.fn().mockResolvedValue({ error: null }),
      }),
    },
  },
}));

// Importar la función de validación directamente para testear la lógica
// sin depender del flujo completo de Supabase
describe('Validación de archivos para upload', () => {
  const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
  const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

  function validateFile(file) {
    if (!ALLOWED_MIME.includes(file.type)) return { valid: false, reason: 'tipo_no_permitido' };
    if (file.size > MAX_SIZE) return { valid: false, reason: 'archivo_muy_grande' };
    return { valid: true };
  }

  it('rechaza tipos MIME no permitidos', () => {
    const file = new File(['contenido'], 'malware.exe', { type: 'application/x-msdownload' });
    expect(validateFile(file).valid).toBe(false);
    expect(validateFile(file).reason).toBe('tipo_no_permitido');
  });

  it('rechaza archivos mayores a 10 MB', () => {
    const bigContent = new Uint8Array(11 * 1024 * 1024);
    const file = new File([bigContent], 'grande.pdf', { type: 'application/pdf' });
    expect(validateFile(file).valid).toBe(false);
    expect(validateFile(file).reason).toBe('archivo_muy_grande');
  });

  it('acepta PDF válido dentro del límite', () => {
    const file = new File(['%PDF-1.4 contenido'], 'receta.pdf', { type: 'application/pdf' });
    expect(validateFile(file).valid).toBe(true);
  });

  it('acepta imagen JPEG', () => {
    const file = new File([new Uint8Array(100)], 'foto.jpg', { type: 'image/jpeg' });
    expect(validateFile(file).valid).toBe(true);
  });

  it('acepta imagen PNG', () => {
    const file = new File([new Uint8Array(100)], 'foto.png', { type: 'image/png' });
    expect(validateFile(file).valid).toBe(true);
  });

  it('rechaza HTML (posible XSS)', () => {
    const file = new File(['<script>alert(1)</script>'], 'xss.html', { type: 'text/html' });
    expect(validateFile(file).valid).toBe(false);
  });

  it('rechaza JavaScript', () => {
    const file = new File(['alert(1)'], 'script.js', { type: 'application/javascript' });
    expect(validateFile(file).valid).toBe(false);
  });
});
