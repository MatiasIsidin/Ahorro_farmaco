/**
 * Normaliza un string eliminando tildes/diacríticos, lowercase y trim.
 * Ejemplo: "Ácido acetilsalicílico" → "acido acetilsalicilico"
 */
export function normalizeText(str) {
  if (!str) return '';
  return str
    .normalize('NFD')                // descompone caracteres Unicode
    .replace(/[\u0300-\u036f]/g, '') // elimina diacríticos
    .toLowerCase()
    .replace(/\s+/g, ' ')            // elimina espacios dobles/múltiples
    .trim();
}

/**
 * Búsqueda tolerante: verifica si `query` aparece dentro de `target`,
 * ignorando mayúsculas, tildes y espacios extra.
 */
export function tolerantMatch(target, query) {
  return normalizeText(target).includes(normalizeText(query));
}
