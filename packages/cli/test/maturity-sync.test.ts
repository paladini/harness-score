import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';
import { ALL_CHECKS } from '../src/checks/index.js';
import { LEVEL_REQUIREMENTS } from '../src/score.js';
import { DIMENSIONS } from '../src/types.js';

const REPO = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

const MATURITY_MODELS = [
  {
    locale: 'en',
    path: path.join(REPO, 'docs', 'guide', 'maturity-model.md'),
    totalRe: /(\d+) points across/,
  },
  {
    locale: 'pt-BR',
    path: path.join(REPO, 'docs', 'pt-BR', 'guide', 'maturity-model.md'),
    totalRe: /(\d+) pontos em/,
  },
  {
    locale: 'es',
    path: path.join(REPO, 'docs', 'es', 'guide', 'maturity-model.md'),
    totalRe: /(\d+) puntos en/,
  },
  {
    locale: 'zh-CN',
    path: path.join(REPO, 'docs', 'zh-CN', 'guide', 'maturity-model.md'),
    totalRe: /共\s*(\d+)\s*分/,
  },
  {
    locale: 'hi-IN',
    path: path.join(REPO, 'docs', 'hi-IN', 'guide', 'maturity-model.md'),
    totalRe: /(?:^|\n)(\d+) points, छह dimensions में:/,
  },
] as const;

function shortLabel(id: string): string {
  const dim = DIMENSIONS.find((d) => d.id === id);
  if (!dim) throw new Error(`Unknown dimension id in a requirement label: ${id}`);
  return dim.title.split(' ')[0]!;
}

function levelSection(content: string, level: number, locale: string): string {
  const startRe = new RegExp(`### L${level} ·`);
  const startMatch = startRe.exec(content);
  if (!startMatch) throw new Error(`${locale} maturity-model.md has no "### L${level} ·" heading`);
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

describe('maturity-model.md stays in sync with the implementation (score.ts + types.ts)', () => {
  for (const model of MATURITY_MODELS) {
    const content = fs.readFileSync(model.path, 'utf8');

    test(`${model.locale}: per-dimension point totals match the sum of ALL_CHECKS`, () => {
      for (const dim of DIMENSIONS) {
        const computed = ALL_CHECKS.filter((c) => c.dimension === dim.id).reduce(
          (sum, c) => sum + c.points,
          0,
        );
        const escaped = dim.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const rowRe = new RegExp(`\\|\\s*${escaped}\\s*\\|\\s*(\\d+)\\s*\\|`);
        const row = rowRe.exec(content);
        expect(row, `${model.locale}: no dimension-points table row found for "${dim.title}"`).not.toBeNull();
        const documented = Number(row![1]);
        expect(
          documented,
          `${model.locale}: ${dim.title} says ${documented} pts, ALL_CHECKS sums to ${computed}`,
        ).toBe(computed);
      }
    });

    test(`${model.locale}: total point count matches the sum of ALL_CHECKS`, () => {
      const computed = ALL_CHECKS.reduce((sum, c) => sum + c.points, 0);
      const match = model.totalRe.exec(content);
      expect(match, `${model.locale}: no total-points sentence found`).not.toBeNull();
      expect(
        Number(match![1]),
        `${model.locale}: guide says ${match![1]} points, ALL_CHECKS sums to ${computed}`,
      ).toBe(computed);
    });

    test(`${model.locale}: every LEVEL_REQUIREMENTS percentage is mirrored in the matching level section`, () => {
      for (const [levelIdx, requirements] of LEVEL_REQUIREMENTS.entries()) {
        const level = levelIdx + 1;
        const section = levelSection(content, level, model.locale);
        for (const requirement of requirements) {
          const pairs = extractPairs(requirement.label);
          for (const { id, pct } of pairs) {
            if (id === 'total') {
              const totalLabels = ['total', 'total score', 'pontuação total', 'puntuación total', '总分'];
              const hasTotal = totalLabels.some((label) => section.includes(`${label} ≥ ${pct}%`));
              expect(hasTotal, `${model.locale}: L${level} has no total-score threshold of ${pct}%`).toBe(
                true,
              );
              continue;
            }
            const dim = DIMENSIONS.find((d) => d.id === id)!;
            const short = `${shortLabel(id)} ≥ ${pct}%`;
            const full = `${dim.title} ≥ ${pct}%`;
            expect(
              section.includes(short) || section.includes(full),
              `${model.locale}: L${level} is missing "${short}" or "${full}" from "${requirement.label}"`,
            ).toBe(true);
          }
        }
      }
    });
  }
});
