import type { Report } from '../types.js';

/**
 * shields.io layout: 20 px tall, 11 px Verdana, fixed segments. Text is
 * centred in each segment (like shields.io) so every level looks the same.
 * VALUE_SEG is intentionally generous — DejaVu on Linux is wider than our
 * width estimate, and clipping looked like a smaller font.
 */
const H = 20;
const FONT = 'Verdana,Geneva,DejaVu Sans,sans-serif';
const FONT_SIZE = 11;
const TEXT_Y = 14;

const LABEL_SEG = 58;
/** Fits "L4 · Self-correcting 100%" on DejaVu with room to spare. */
const VALUE_SEG = 198;
const TOTAL = LABEL_SEG + VALUE_SEG;

/**
 * Deterministic, self-contained SVG maturity badge in the harness-score brand.
 */
export function renderBadge(report: Report): string {
  const label = 'harness';
  const value = `L${report.level.index} · ${report.level.name} ${report.score.percent}%`;
  const labelCx = LABEL_SEG / 2;
  const valueCx = LABEL_SEG + VALUE_SEG / 2;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${TOTAL}" height="${H}" viewBox="0 0 ${TOTAL} ${H}" role="img" aria-label="Harness Score ${value}">
  <title>Harness Score — ${value}</title>
  <defs>
    <linearGradient id="hs-fill" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#3ce3a3"/>
      <stop offset="1" stop-color="#16a877"/>
    </linearGradient>
  </defs>
  <rect width="${TOTAL}" height="${H}" rx="3" fill="#16a877"/>
  <rect width="${LABEL_SEG}" height="${H}" rx="3" fill="#14232f"/>
  <rect x="${LABEL_SEG}" width="${VALUE_SEG}" height="${H}" fill="#16a877"/>
  <g fill="#3ce3a3">
    <rect x="5" y="12" width="2.5" height="4" rx="1.25"/>
    <rect x="9" y="9" width="2.5" height="7" rx="1.25"/>
    <rect x="13" y="6" width="2.5" height="10" rx="1.25"/>
  </g>
  <text x="${labelCx}" y="${TEXT_Y}" font-family="${FONT}" font-size="${FONT_SIZE}" font-weight="400" fill="#e9f2ee" text-anchor="middle">${label}</text>
  <text x="${valueCx}" y="${TEXT_Y}" font-family="${FONT}" font-size="${FONT_SIZE}" font-weight="700" fill="#06231a" text-anchor="middle">${value}</text>
</svg>
`;
}
