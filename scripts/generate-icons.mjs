// ============================================================
// Genera iconos PWA usando Canvas API nativa de Node 22
// Ejecutar: node scripts/generate-icons.mjs
// ============================================================

import { createCanvas } from 'canvas';
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, '..', 'public', 'icons');

mkdirSync(OUT_DIR, { recursive: true });

function drawIcon(size) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  const r = size * 0.12; // border radius

  // ── Fondo con esquinas redondeadas ───────────────────────
  ctx.beginPath();
  ctx.moveTo(r, 0);
  ctx.lineTo(size - r, 0);
  ctx.quadraticCurveTo(size, 0, size, r);
  ctx.lineTo(size, size - r);
  ctx.quadraticCurveTo(size, size, size - r, size);
  ctx.lineTo(r, size);
  ctx.quadraticCurveTo(0, size, 0, size - r);
  ctx.lineTo(0, r);
  ctx.quadraticCurveTo(0, 0, r, 0);
  ctx.closePath();

  // Gradiente teal (brand color)
  const grad = ctx.createLinearGradient(0, 0, size, size);
  grad.addColorStop(0, '#0d9488');   // --color-primary
  grad.addColorStop(1, '#10b981');   // --color-accent
  ctx.fillStyle = grad;
  ctx.fill();

  // ── Corazón (símbolo de la app) ──────────────────────────
  const cx = size / 2;
  const cy = size / 2 + size * 0.04;
  const hw = size * 0.28; // half-width del corazón

  ctx.fillStyle = '#ffffff';
  ctx.beginPath();

  // Corazón usando bezier curves
  ctx.moveTo(cx, cy + hw * 0.9);
  ctx.bezierCurveTo(cx - hw * 1.4, cy + hw * 0.2, cx - hw * 1.4, cy - hw * 0.8, cx, cy - hw * 0.2);
  ctx.bezierCurveTo(cx + hw * 1.4, cy - hw * 0.8, cx + hw * 1.4, cy + hw * 0.2, cx, cy + hw * 0.9);
  ctx.closePath();
  ctx.fill();

  // ── Cruz médica sobre el corazón ─────────────────────────
  const crossSize = hw * 0.55;
  const crossThick = crossSize * 0.32;
  ctx.fillStyle = '#0d9488';

  // Barra horizontal
  ctx.fillRect(cx - crossSize / 2, cy - crossThick / 2, crossSize, crossThick);
  // Barra vertical
  ctx.fillRect(cx - crossThick / 2, cy - crossSize / 2, crossThick, crossSize);

  return canvas.toBuffer('image/png');
}

const sizes = [192, 512];
for (const size of sizes) {
  const buf = drawIcon(size);
  const outPath = join(OUT_DIR, `icon-${size}.png`);
  writeFileSync(outPath, buf);
  console.log(`✓ Generado: public/icons/icon-${size}.png (${size}x${size})`);
}

console.log('\n✅ Iconos PWA generados correctamente.');
