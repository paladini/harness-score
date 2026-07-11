import type { Report } from '../types.js';

/**
 * shields.io-style dimensions: 20px tall, 11px Verdana, fixed segment widths so
 * every level renders at the same size. VALUE_SEG is sized for the longest
 * possible message ("L4 · Self-correcting 100%").
 */
const H = 20;
const FONT = 'Verdana,Geneva,DejaVu Sans,sans-serif';
const FONT_SIZE = 11;
const TEXT_Y = 14;

/** Widest value string the scanner can emit. */
const MAX_VALUE = 'L4 · Self-correcting 100%';

function textWidth(text: string): number {
  let width = 0;
  for (const char of text) {
    width += /[mwMW%]/.test(char) ? 10 : /[il1.:· ]/.test(char) ? 4 : 7;
  }
  return width;
}

const LABEL_SEG = 58;
const VALUE_SEG = textWidth(MAX_VALUE) + 12;
const TOTAL = LABEL_SEG + VALUE_SEG;
const LABEL_X = 20;
const VALUE_X = LABEL_SEG + 6;

/**
 * Deterministic, self-contained SVG maturity badge in the harness-score brand.
 * Fixed width and height — text never scales or clips by level.
 */
export function renderBadge(report: Report): string {
  const label = 'harness';
  const value = `L${report.level.index} · ${report.level.name} ${report.score.percent}%`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${TOTAL}" height="${H}" viewBox="0 0 ${TOTAL} ${H}" fill="none" role="img" aria-label="Harness Score ${value}">
  <title>Harness Score — ${value}</title>
  <defs>
    <linearGradient id="hs-fill" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#3ce3a3"/>
      <stop offset="1" stop-color="#16a877"/>
    </linearGradient>
    <clipPath id="hs-badge"><rect width="${TOTAL}" height="${H}" rx="3"/></clipPath>
  </defs>
  <g clip-path="url(#hs-badge)">
    <rect width="${LABEL_SEG}" height="${H}" fill="#14232f"/>
    <rect x="${LABEL_SEG}" width="${VALUE_SEG}" height="${H}" fill="#16a877"/>
    <g fill="#3ce3a3">
      <rect x="5" y="12" width="2.5" height="4" rx="1.25"/>
      <rect x="9" y="9" width="2.5" height="7" rx="1.25"/>
      <rect x="13" y="6" width="2.5" height="10" rx="1.25"/>
    </g>
    <text x="${LABEL_X}" y="${TEXT_Y}" font-family="${FONT}" font-size="${FONT_SIZE}" font-weight="600" fill="#e9f2ee">${label}</text>
    <text x="${VALUE_X}" y="${TEXT_Y}" font-family="${FONT}" font-size="${FONT_SIZE}" font-weight="700" fill="#06231a">${value}</text>
  </g>
</svg>
`;
}
