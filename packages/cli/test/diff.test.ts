import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';
import { computeDiff, score } from '../src/index.js';

const FIXTURES = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'fixtures');

describe('computeDiff', () => {
  test('reports level and score improvement between two fixture levels', () => {
    const baseline = score(path.join(FIXTURES, 'level-2'));
    const current = score(path.join(FIXTURES, 'level-4'));
    const diff = computeDiff(baseline, current);

    expect(diff.level.before).toBe(baseline.level.index);
    expect(diff.level.after).toBe(current.level.index);
    expect(diff.level.delta).toBeGreaterThan(0);
    expect(diff.score.deltaEarned).toBeGreaterThan(0);
    expect(diff.checksChanged.some((c) => c.change === 'newly-passing')).toBe(true);
  });

  test('is a no-op diff when compared against itself', () => {
    const report = score(path.join(FIXTURES, 'level-4'));
    const diff = computeDiff(report, report);

    expect(diff.level.delta).toBe(0);
    expect(diff.score.deltaEarned).toBe(0);
    expect(diff.checksChanged).toHaveLength(0);
    expect(diff.dimensions.every((d) => d.delta === 0)).toBe(true);
    expect(diff.maturityModelChanged).toBe(false);
  });

  test('flags maturityModelChanged when the baseline is from a different tool version', () => {
    const current = score(path.join(FIXTURES, 'level-4'));
    const baseline = { ...current, tool: { ...current.tool, version: '0.1.0' } };
    expect(computeDiff(baseline, current).maturityModelChanged).toBe(true);
  });

  test('flags maturityModelChanged when the maturity model total point value changed', () => {
    const current = score(path.join(FIXTURES, 'level-4'));
    const baseline = { ...current, score: { ...current.score, max: current.score.max - 8 } };
    expect(computeDiff(baseline, current).maturityModelChanged).toBe(true);
  });
});
