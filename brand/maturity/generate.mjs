// Generates the harness-score maturity cards and badges (one per level L0-L4).
// Text is pinned with textLength (widths measured once in a browser with the
// brand font stack) so every string renders identically regardless of the
// fonts available on the viewer's system. Re-run with: node generate.mjs
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

// --- measured widths (rendered width, in px, of each string at its exact
// font-size/weight/letter-spacing with the brand font stack) -----------------
const W = {
  label: 203.2,
  L: { 0: 105.4, 1: 94.3, 2: 105.4, 3: 105.4, 4: 108.1 },
  n: { 0: 205.9, 1: 205.4, 2: 114.9, 3: 124.3, 4: 235.8 },
  t: { 0: 266.3, 1: 289.2, 2: 239.5, 3: 254.9, 4: 276.5 },
  site: 250.8,
  bharness: 52.1,
  b: { 0: 111.3, 1: 111.1, 2: 71.2, 3: 75.3, 4: 124.5 },
};

const LEVELS = [
  { n: 0, name: 'Unharnessed', tag: 'Every agent session cold-starts' },
  { n: 1, name: 'Documented', tag: 'AGENTS.md orients every session' },
  { n: 2, name: 'Guided', tag: 'Scoped rules, skills, hygiene' },
  { n: 3, name: 'Sensing', tag: 'Tests, types, CI verify changes' },
  { n: 4, name: 'Self-correcting', tag: 'Hooks close the loop at runtime' },
];

const SITE = 'paladini.github.io/harness-score';

function txt({ x, y, size, weight, spacing = 0, fill, len, anchor, text }) {
  const a = anchor ? ` text-anchor="${anchor}"` : '';
  const s = spacing ? ` letter-spacing="${spacing}"` : '';
  return `<text x="${x}" y="${y}"${a} textLength="${len}" lengthAdjust="spacingAndGlyphs" font-family="${FAM}" font-size="${size}" font-weight="${weight}"${s} fill="${fill}">${text}</text>`;
}

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
  ${txt({ x: lnX, y: 70, size: 19, weight: 700, spacing: 4, fill: C.emer, len: W.label, text: 'HARNESS SCORE' })}
  ${txt({ x: lnX, y: 163, size: 96, weight: 800, spacing: -2, fill: C.emer, len: W.L[level], text: `L${level}` })}
  ${txt({ x: nameX, y: 163, size: 34, weight: 700, fill: C.light, len: W.n[level], text: lvl.name })}
  ${txt({ x: lnX, y: 212, size: 19, weight: 500, fill: C.muted, len: W.t[level], text: lvl.tag })}
  ${txt({ x: 820, y: 212, size: 15, weight: 600, spacing: 1, fill: C.muted, len: W.site, anchor: 'end', text: SITE })}
</svg>
`;
}

// --- BADGE (flat, README-inline) --------------------------------------------
function badge(lvl) {
  const level = lvl.n;
  const microX = [12, 19, 26];
  const microH = [8, 12, 16];
  const microBase = 21;
  const micro = microX
    .map(
      (x, i) =>
        `    <rect x="${x}" y="${microBase - microH[i]}" width="4" height="${microH[i]}" rx="2" fill="url(#hs-fill)"/>`,
    )
    .join('\n');

  const harnessX = 38;
  const segL = Math.round(harnessX + W.bharness + 12); // left segment right edge
  const rightText = `L${level} ${lvl.name}`;
  const total = Math.round(segL + 12 + W.b[level] + 12);
  const rTextX = segL + 12;

  return `<svg width="${total}" height="30" viewBox="0 0 ${total} 30" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Harness Score L${level} ${lvl.name}">
  <title>Harness Score — L${level} ${lvl.name}</title>
  <defs>
    <linearGradient id="hs-fill" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${C.emerTop}"/>
      <stop offset="1" stop-color="${C.emerBottom}"/>
    </linearGradient>
    <clipPath id="hs-badge"><rect x="0" y="0" width="${total}" height="30" rx="6"/></clipPath>
  </defs>
  <g clip-path="url(#hs-badge)">
    <rect x="0" y="0" width="${segL}" height="30" fill="${C.tileTop}"/>
    <rect x="${segL}" y="0" width="${total - segL}" height="30" fill="${C.emerBottom}"/>
${micro}
    ${txt({ x: harnessX, y: 20, size: 15, weight: 600, fill: C.harnessOnDark, len: W.bharness, text: 'harness' })}
    ${txt({ x: rTextX, y: 20, size: 15, weight: 700, fill: C.inkOnEmer, len: W.b[level], text: rightText })}
  </g>
</svg>
`;
}

for (const lvl of LEVELS) {
  writeFileSync(join(OUT, `card-l${lvl.n}.svg`), card(lvl));
  writeFileSync(join(OUT, `badge-l${lvl.n}.svg`), badge(lvl));
}
console.log('Generated 5 cards + 5 badges in', OUT);
