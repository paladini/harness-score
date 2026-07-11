import type { Report } from '../types.js';

/** shields.io-style width estimate (Verdana 11px; errs wide so text never clips). */
function textWidth(text: string): number {
  let width = 0;
  for (const char of text) {
    width += /[mwMW%]/.test(char) ? 10 : /[il1.:·| ]/.test(char) ? 4 : 7;
  }
  return width;
}

const H = 20;
const FONT = 'Verdana,Geneva,DejaVu Sans,sans-serif';
const FONT_SIZE = 11;
const TEXT_Y = 14;
const PAD = 7;

/** Left segment: mini bars + "harness" (fixed for every level). */
const LABEL_SEG = 54;
const LABEL_X = 18;
const VALUE_X = LABEL_SEG + PAD;

/**
 * shields.io pattern: height and font-size are constant; only the total width
 * grows with the message. No textLength, no centering — left-aligned text
 * inside segments that are sized to fit.
 */
export function renderBadge(report: Report): string {
  const label = 'harness';
  const value = `L${report.level.index} ${report.level.name} ${report.score.percent}%`;
  const valueSeg = textWidth(value) + PAD * 2;
  const total = LABEL_SEG + valueSeg;
  const labelCx = LABEL_SEG / 2;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${total}" height="${H}" viewBox="0 0 ${total} ${H}" role="img" aria-label="Harness Score ${value}">
  <title>Harness Score: ${value}</title>
  <rect width="${total}" height="${H}" rx="3" fill="#16a877"/>
  <rect width="${LABEL_SEG}" height="${H}" rx="3" fill="#14232f"/>
  <rect x="${LABEL_SEG}" width="${valueSeg}" height="${H}" fill="#16a877"/>
  <g fill="#3ce3a3">
    <rect x="4" y="12" width="2.5" height="4" rx="1.25"/>
    <rect x="8" y="9" width="2.5" height="7" rx="1.25"/>
    <rect x="12" y="6" width="2.5" height="10" rx="1.25"/>
  </g>
  <text x="${labelCx}" y="${TEXT_Y}" font-family="${FONT}" font-size="${FONT_SIZE}" font-weight="400" fill="#e9f2ee" text-anchor="middle">${label}</text>
  <text x="${VALUE_X}" y="${TEXT_Y}" font-family="${FONT}" font-size="${FONT_SIZE}" font-weight="700" fill="#06231a">${value}</text>
</svg>
`;
}
