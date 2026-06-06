// Polyfill vacío para módulos Node que no existen en el browser
// Usado para reemplazar 'debug' que Supabase Realtime importa internamente
export default function debug() { return () => {}; }
export function enable() {}
export function disable() {}
