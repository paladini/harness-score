import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';
import { ALL_CHECKS } from '../src/checks/index.js';
import { LEVEL_REQUIREMENTS } from '../src/score.js';
import { DIMENSIONS } from '../src/types.js';

const MATURITY_MODEL = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  '..',
  'docs',
  'guide',
  'maturity-model.md',
);

const content = fs.readFileSync(MATURITY_MODEL, 'utf8');

function shortLabel(id: string): string {
  const dim = DIMENSIONS.find((d) => d.id === id);
  if (!dim) throw new Error(`Unknown dimension id in a requirement label: ${id}`);
  return dim.title.split(' ')[0]!;
}

function levelSection(level: number): string {
  const startRe = new RegExp(`### L${level} ·`);
  const startMatch = startRe.exec(content);
  if (!startMatch) throw new Error(`maturity-model.md has no "### L${level} ·" heading`);
  const from = startMatch.index;
  const afterHeading = content.slice(from + startMatch[0].length);
  const nextHeading = /\n#{2,3} /.exec(afterHeading);
  const to = nextHeading ? from + startMatch[0].length + nextHeading.index : content.length;
  return content.slice(from, to);
}

/** Pulls every "<id> ≥ <pct>%" pair out of a LEVEL_REQUIREMENTS label, e.g. "skills ≥ 30% or hooks ≥ 30%". */
function extractPairs(label: string): Array<{ id: string; pct: string }> {
  const re = /([a-z]+)\s*≥\s*(\d+)%/g;
  const pairs: Array<{ id: string; pct: string }> = [];
  let m: RegExpExecArray | null = re.exec(label);
  while (m !== null) {
    pairs.push({ id: m[1]!, pct: m[2]! });
    m = re.exec(label);
  }
  return pairs;
}

describe('maturity-model.md stays in sync with the rubric (packages/cli/src/score.ts + types.ts)', () => {
  test('per-dimension point totals in the guide match the sum of ALL_CHECKS', () => {
    for (const dim of DIMENSIONS) {
      const computed = ALL_CHECKS.filter((c) => c.dimension === dim.id).reduce((sum, c) => sum + c.points, 0);
      const escaped = dim.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const rowRe = new RegExp(`\\|\\s*${escaped}\\s*\\|\\s*(\\d+)\\s*\\|`);
      const row = rowRe.exec(content);
      expect(
        row,
        `no dimension-points table row found for "${dim.title}" in maturity-model.md`,
      ).not.toBeNull();
      const documented = Number(row![1]);
      expect(documented, `${dim.title}: guide says ${documented} pts, ALL_CHECKS sums to ${computed}`).toBe(
        computed,
      );
    }
  });

  test('the total point count in the guide matches the sum of ALL_CHECKS', () => {
    const computed = ALL_CHECKS.reduce((sum, c) => sum + c.points, 0);
    const totalRe = /(\d+) points across/;
    const match = totalRe.exec(content);
    expect(match, 'no "<N> points across ..." sentence found in maturity-model.md').not.toBeNull();
    expect(Number(match![1]), `guide says ${match![1]} points, ALL_CHECKS sums to ${computed}`).toBe(
      computed,
    );
  });

  test('every LEVEL_REQUIREMENTS percentage is mirrored in the matching level section', () => {
    for (const [levelIdx, requirements] of LEVEL_REQUIREMENTS.entries()) {
      const level = levelIdx + 1;
      const section = levelSection(level);
      for (const requirement of requirements) {
        const pairs = extractPairs(requirement.label);
        for (const { id, pct } of pairs) {
          if (id === 'total') {
            const hasTotal = section.includes(`total ≥ ${pct}%`) || section.includes(`total score ≥ ${pct}%`);
            expect(
              hasTotal,
              `L${level}: expected "total (score) ≥ ${pct}%" somewhere in its guide section`,
            ).toBe(true);
            continue;
          }
          const dim = DIMENSIONS.find((d) => d.id === id)!;
          // Accept either the full dimension title ("Context & Guides ≥ 40%",
          // used in the L1 prose) or its short form ("Context ≥ 60%", used
          // from L2 on) — both unambiguously name the same dimension.
          const short = `${shortLabel(id)} ≥ ${pct}%`;
          const full = `${dim.title} ≥ ${pct}%`;
          expect(
            section.includes(short) || section.includes(full),
            `L${level}: expected "${short}" or "${full}" (derived from LEVEL_REQUIREMENTS label "${requirement.label}") in its guide section, got:\n${section}`,
          ).toBe(true);
        }
      }
    }
  });
});
