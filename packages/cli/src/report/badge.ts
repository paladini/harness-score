import type { Report } from '../types.js';

/**
 * Approximate Verdana 11px advance the way shields.io does. Verdana is one of
 * the widest common sans fonts, so real rendering (DejaVu on Linux, Segoe on
 * Windows, Helvetica on macOS) stays narrower than this estimate — centered
 * text therefore always fits its segment without measuring fonts at runtime.
 */
function textWidth(text: string): number {
  let width = 0;
  for (const char of text) {
    width += /[mwMW%]/.test(char) ? 10 : /[il1.:· ]/.test(char) ? 4 : 7;
  }
  return width;
}

/**
 * Deterministic, self-contained SVG maturity badge in the harness-score brand
 * (graphite tile + ascending emerald bars). No network, no shields.io
 * dependency: `▮▮▮ harness | L3 · Sensing 72%`.
 */
export function renderBadge(report: Report): string {
  const label = 'harness';
  const value = `L${report.level.index} · ${report.level.name} ${report.score.percent}%`;

  const barsRight = 20;
  const labelX = barsRight + 8;
  const labelSeg = Math.round(labelX + textWidth(label) + 9);
  const valueSeg = Math.round(textWidth(value) + 22);
  const total = labelSeg + valueSeg;
  const h = 22;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${total}" height="${h}" role="img" aria-label="harness score: ${value}">
  <title>harness score: ${value}</title>
  <defs>
    <linearGradient id="hs-g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#14232f"/>
      <stop offset="1" stop-color="#0b141c"/>
    </linearGradient>
    <linearGradient id="hs-e" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#3ce3a3"/>
      <stop offset="1" stop-color="#16a877"/>
    </linearGradient>
    <clipPath id="hs-r"><rect width="${total}" height="${h}" rx="5"/></clipPath>
  </defs>
  <g clip-path="url(#hs-r)">
    <rect width="${labelSeg}" height="${h}" fill="url(#hs-g)"/>
    <rect x="${labelSeg}" width="${valueSeg}" height="${h}" fill="url(#hs-e)"/>
    <g fill="#3ce3a3">
      <rect x="8" y="11" width="3" height="5" rx="1.5"/>
      <rect x="13" y="8" width="3" height="8" rx="1.5"/>
      <rect x="18" y="5" width="3" height="11" rx="1.5"/>
    </g>
  </g>
  <g font-family="Verdana,Geneva,DejaVu Sans,sans-serif" font-size="11">
    <text x="${labelX}" y="15" fill="#e9f2ee" font-weight="600">${label}</text>
    <text x="${labelSeg + valueSeg / 2}" y="15" fill="#06231a" font-weight="700" text-anchor="middle">${value}</text>
  </g>
</svg>
`;
}
