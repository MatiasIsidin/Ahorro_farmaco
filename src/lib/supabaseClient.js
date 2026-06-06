import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// ── Validación de variables de entorno ───────────────────────
if (!supabaseUrl || supabaseUrl.includes('placeholder')) {
  console.error(
    '[Supabase] VITE_SUPABASE_URL no está configurada. ' +
    'Copia .env.example a .env.local y completa los valores.'
  );
}

if (!supabaseAnonKey || supabaseAnonKey.includes('placeholder')) {
  console.error(
    '[Supabase] VITE_SUPABASE_ANON_KEY no está configurada.'
  );
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder',
  {
    auth: {
      // Persistir sesión en localStorage (seguro para SPA)
      persistSession: true,
      // Auto-refresh del token antes de expirar
      autoRefreshToken: true,
      // Detectar sesión en URL (para magic links / OAuth)
      detectSessionInUrl: true,
    },
    global: {
      headers: {
        'x-app-version': import.meta.env.VITE_APP_VERSION || '1.0.0',
      },
    },
  }
);
