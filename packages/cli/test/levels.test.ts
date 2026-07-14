import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';
import { ALL_CHECKS } from '../src/checks/index.js';
import { score } from '../src/index.js';

const FIXTURES = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'fixtures');
const ALL_FIXTURES = ['level-0', 'level-1', 'level-2', 'level-3', 'level-4'];

describe('maturity levels on fixture repositories', () => {
  test.each([
    ['level-0', 0],
    ['level-1', 1],
    ['level-2', 2],
    ['level-3', 3],
    ['level-4', 4],
  ])('%s scores L%i', (fixture, expected) => {
    const report = score(path.join(FIXTURES, fixture));
    expect(report.level.index, JSON.stringify(report.level, null, 2)).toBe(expected);
  });

  test('total rubric points snapshot', () => {
    // Deliberately a literal, not derived: a rubric change must consciously bump
    // this number, not have it float silently along with ALL_CHECKS.
    const total = ALL_CHECKS.reduce((sum, c) => sum + c.points, 0);
    expect(total).toBe(108);
  });

  test('report shape is stable', () => {
    const report = score(path.join(FIXTURES, 'level-4'));
    expect(report.tool.name).toBe('harness-score');
    expect(report.score.max).toBe(ALL_CHECKS.reduce((sum, c) => sum + c.points, 0));
    expect(report.truncated).toBe(false);
    expect(report.dimensions).toHaveLength(6);
    for (const check of report.checks) {
      expect(check.id).toMatch(/^[A-Z]{2,3}-\d{2}$/);
      expect(check.docsUrl).toContain(`#${check.id.toLowerCase()}`);
      expect(typeof check.evidence).toBe('string');
      expect(check.evidence.length).toBeGreaterThan(0);
    }
  });

  test('level-4 fixture earns a high score', () => {
    const report = score(path.join(FIXTURES, 'level-4'));
    expect(report.score.percent).toBeGreaterThanOrEqual(90);
    expect(report.level.nextLevelGaps).toHaveLength(0);
  });

  test('level gaps explain what is missing', () => {
    const report = score(path.join(FIXTURES, 'level-3'));
    expect(report.level.nextLevelGaps.join(' ')).toContain('hooks');
  });

  test.each(ALL_FIXTURES)('%s runs every registered check exactly once', (fixture) => {
    const report = score(path.join(FIXTURES, fixture));
    expect(report.checks).toHaveLength(ALL_CHECKS.length);
    expect(new Set(report.checks.map((c) => c.id)).size).toBe(ALL_CHECKS.length);
  });

  test.each(ALL_FIXTURES)('%s dimension percentages are internally consistent', (fixture) => {
    const report = score(path.join(FIXTURES, fixture));
    for (const dim of report.dimensions) {
      const expected = dim.max === 0 ? 0 : Math.round((dim.earned / dim.max) * 100);
      expect(dim.percent, `${dim.id}: ${dim.earned}/${dim.max}`).toBe(expected);
    }
  });
});
