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

  test('flags maturityModelChanged when a check point value changed', () => {
    const current = score(path.join(FIXTURES, 'level-4'));
    const baseline = {
      ...current,
      checks: current.checks.map((check) =>
        check.id === 'HYG-08' ? { ...check, points: check.points + 8 } : check,
      ),
    };
    expect(computeDiff(baseline, current).maturityModelChanged).toBe(true);
  });

  test('an applicability change is not a pass/fail delta or a maturity-model change', () => {
    const current = score(path.join(FIXTURES, 'level-4'));
    const baseline = {
      ...current,
      score: { ...current.score, max: current.score.max - 3, earned: current.score.earned - 3 },
      checks: current.checks.map((check) =>
        check.id === 'HYG-08' ? { ...check, applicable: false, passed: false, earned: 0 } : check,
      ),
    };
    const diff = computeDiff(baseline, current);
    expect(diff.maturityModelChanged).toBe(false);
    expect(diff.checksChanged).toEqual([
      expect.objectContaining({ id: 'HYG-08', change: 'became-applicable' }),
    ]);
    expect(diff.checksChanged.some((check) => check.change === 'newly-passing')).toBe(false);
  });

  test('dropping applicability is not reported as newly failing', () => {
    const current = score(path.join(FIXTURES, 'level-4'));
    const baseline = current;
    const next = {
      ...current,
      checks: current.checks.map((check) =>
        check.id === 'HYG-08' ? { ...check, applicable: false, passed: false, earned: 0 } : check,
      ),
    };
    const diff = computeDiff(baseline, next);
    expect(diff.checksChanged).toEqual([
      expect.objectContaining({ id: 'HYG-08', change: 'became-not-applicable' }),
    ]);
    expect(diff.checksChanged.some((check) => check.change === 'newly-failing')).toBe(false);
  });

  test('flags presetChanged when the applied extends/rules differ', () => {
    const current = score(path.join(FIXTURES, 'level-4'));
    const baseline = { ...current, preset: { extends: ['no-hooks'], rules: {}, resolved: [] } };
    expect(computeDiff(baseline, current).presetChanged).toBe(true);
  });

  test('presetChanged is false when both sides carry the same preset', () => {
    const current = score(path.join(FIXTURES, 'level-4'));
    expect(computeDiff(current, current).presetChanged).toBe(false);
  });

  test('a baseline with no preset field at all (pre-v1.5 JSON) does not throw', () => {
    const current = score(path.join(FIXTURES, 'level-4'));
    const { preset: _omit, ...legacyBaseline } = current;
    expect(() => computeDiff(legacyBaseline as typeof current, current)).not.toThrow();
    expect(computeDiff(legacyBaseline as typeof current, current).presetChanged).toBe(false);
  });

  test('rejects incomplete current and legacy baseline reports', () => {
    const complete = score(path.join(FIXTURES, 'level-4'));
    const incomplete = {
      ...complete,
      truncated: true,
      verdicts: {
        maturity: { status: 'incomplete' as const, reasons: [{ code: 'depth-limit' as const }] },
        effective: { status: 'incomplete' as const, reasons: [{ code: 'depth-limit' as const }] },
      },
    };
    expect(() => computeDiff(complete, incomplete)).toThrow('incomplete maturity reports');

    const { verdicts: _verdicts, ...legacyIncomplete } = incomplete;
    expect(() => computeDiff(legacyIncomplete as typeof complete, complete)).toThrow(
      'incomplete maturity reports',
    );
  });

  test('remains maturity-only when effective is incomplete', () => {
    const complete = score(path.join(FIXTURES, 'level-4'));
    const effectiveIncomplete = {
      ...complete,
      truncated: true,
      verdicts: {
        maturity: { status: 'complete' as const, reasons: [] },
        effective: { status: 'incomplete' as const, reasons: [{ code: 'depth-limit' as const }] },
      },
    };

    expect(() => computeDiff(complete, effectiveIncomplete)).not.toThrow();
    expect(computeDiff(complete, effectiveIncomplete).level.delta).toBe(0);
  });
});
