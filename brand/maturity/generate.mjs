// Generates the harness-score maturity cards and badges (one per level L0-L4).
// Badges follow shields.io layout (20px, 11px Verdana, fixed segments).
// Re-run with: node generate.mjs
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = dirname(fileURLToPath(import.meta.url));

// --- brand tokens -----------------------------------------------------------
const C = {
  tileTop: '#14232f',
  tileBottom: '#081117',
  emerTop: '#3ce3a3',
  emerBottom: '#16a877',
  slate: '#1e2f3a',
  light: '#f2f6f4',
  muted: '#7c8a92',
  emer: '#3ce3a3',
  inkOnEmer: '#06231a',
  harnessOnDark: '#e9f2ee',
};
const FAM = "'Segoe UI', system-ui, -apple-system, 'Helvetica Neue', Arial, sans-serif";

const LEVELS = [
  { n: 0, name: 'Unharnessed', tag: 'Every agent session cold-starts' },
  { n: 1, name: 'Documented', tag: 'AGENTS.md orients every session' },
  { n: 2, name: 'Guided', tag: 'Scoped rules, skills, hygiene' },
  { n: 3, name: 'Sensing', tag: 'Tests, types, CI verify changes' },
  { n: 4, name: 'Self-correcting', tag: 'Hooks close the loop at runtime' },
];

const SITE = 'paladini.github.io/harness-score';

function txt({ x, y, size, weight, spacing = 0, fill, anchor, text }) {
  const a = anchor ? ` text-anchor="${anchor}"` : '';
  const s = spacing ? ` letter-spacing="${spacing}"` : '';
  return `<text x="${x}" y="${y}"${a} font-family="${FAM}" font-size="${size}" font-weight="${weight}"${s} fill="${fill}">${text}</text>`;
}

// --- BADGE (shields.io layout — keep in sync with badge.ts) -----------------
const BADGE_H = 20;
const BADGE_FONT = 'Verdana,Geneva,DejaVu Sans,sans-serif';
const BADGE_FONT_SIZE = 11;
const BADGE_TEXT_Y = 14;
const BADGE_LABEL_SEG = 58;
const BADGE_VALUE_SEG = 198;
const BADGE_TOTAL = BADGE_LABEL_SEG + BADGE_VALUE_SEG;

// --- CARD --------------------------------------------------------------------
function card(lvl) {
  const level = lvl.n;
  const barX = [48, 84, 120, 156, 192];
  const barH = [40, 58, 76, 94, 112];
  const baseline = 176;
  const bw = 24;
  const bars = barX
    .map((x, i) => {
      const h = barH[i];
      const y = baseline - h;
      const fill = i <= level ? 'url(#hs-fill)' : C.slate;
      return `    <rect x="${x}" y="${y}" width="${bw}" height="${h}" rx="12" fill="${fill}"/>`;
    })
    .join('\n');

  const lnX = 260;
  const nameX = 396;
  return `<svg width="860" height="240" viewBox="0 0 860 240" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Harness Score maturity L${level} ${lvl.name}">
  <title>Harness Score — L${level} ${lvl.name}</title>
  <defs>
    <linearGradient id="hs-tile" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${C.tileTop}"/>
      <stop offset="1" stop-color="${C.tileBottom}"/>
    </linearGradient>
    <linearGradient id="hs-fill" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${C.emerTop}"/>
      <stop offset="1" stop-color="${C.emerBottom}"/>
    </linearGradient>
    <clipPath id="hs-card"><rect x="0" y="0" width="860" height="240" rx="30"/></clipPath>
  </defs>

  <rect x="0" y="0" width="860" height="240" rx="30" fill="url(#hs-tile)"/>
  <g clip-path="url(#hs-card)">
    <ellipse cx="430" cy="18" rx="440" ry="150" fill="#ffffff" opacity="0.045"/>
  </g>
  <rect x="1" y="1" width="858" height="238" rx="29" fill="none" stroke="#ffffff" stroke-opacity="0.07" stroke-width="2"/>

  <!-- level meter -->
${bars}

  <!-- text -->
  ${txt({ x: lnX, y: 70, size: 19, weight: 700, spacing: 4, fill: C.emer, text: 'HARNESS SCORE' })}
  ${txt({ x: lnX, y: 163, size: 96, weight: 800, spacing: -2, fill: C.emer, text: `L${level}` })}
  ${txt({ x: nameX, y: 163, size: 34, weight: 700, fill: C.light, text: lvl.name })}
  ${txt({ x: lnX, y: 212, size: 19, weight: 500, fill: C.muted, text: lvl.tag })}
  ${txt({ x: 820, y: 212, size: 15, weight: 600, spacing: 1, fill: C.muted, anchor: 'end', text: SITE })}
</svg>
`;
}

function badge(lvl) {
  const level = lvl.n;
  const rightText = `L${level} ${lvl.name}`;
  const labelCx = BADGE_LABEL_SEG / 2;
  const valueCx = BADGE_LABEL_SEG + BADGE_VALUE_SEG / 2;

  return `<svg width="${BADGE_TOTAL}" height="${BADGE_H}" viewBox="0 0 ${BADGE_TOTAL} ${BADGE_H}" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Harness Score L${level} ${lvl.name}">
  <title>Harness Score — L${level} ${lvl.name}</title>
  <defs>
    <linearGradient id="hs-fill" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${C.emerTop}"/>
      <stop offset="1" stop-color="${C.emerBottom}"/>
    </linearGradient>
  </defs>
  <rect width="${BADGE_TOTAL}" height="${BADGE_H}" rx="3" fill="${C.emerBottom}"/>
  <rect width="${BADGE_LABEL_SEG}" height="${BADGE_H}" rx="3" fill="${C.tileTop}"/>
  <rect x="${BADGE_LABEL_SEG}" width="${BADGE_VALUE_SEG}" height="${BADGE_H}" fill="${C.emerBottom}"/>
  <g fill="#3ce3a3">
    <rect x="5" y="12" width="2.5" height="4" rx="1.25"/>
    <rect x="9" y="9" width="2.5" height="7" rx="1.25"/>
    <rect x="13" y="6" width="2.5" height="10" rx="1.25"/>
  </g>
  <text x="${labelCx}" y="${BADGE_TEXT_Y}" font-family="${BADGE_FONT}" font-size="${BADGE_FONT_SIZE}" font-weight="400" fill="${C.harnessOnDark}" text-anchor="middle">harness</text>
  <text x="${valueCx}" y="${BADGE_TEXT_Y}" font-family="${BADGE_FONT}" font-size="${BADGE_FONT_SIZE}" font-weight="700" fill="${C.inkOnEmer}" text-anchor="middle">${rightText}</text>
</svg>
`;
}

for (const lvl of LEVELS) {
  writeFileSync(join(OUT, `card-l${lvl.n}.svg`), card(lvl));
  writeFileSync(join(OUT, `badge-l${lvl.n}.svg`), badge(lvl));
}
console.log('Generated 5 cards + 5 badges in', OUT);
