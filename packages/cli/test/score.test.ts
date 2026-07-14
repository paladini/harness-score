import { describe, expect, test } from 'vitest';
import { buildReport, LEVEL_REQUIREMENTS, TOOL_VERSION } from '../src/score.js';
import type { DimensionId, DimensionScore } from '../src/types.js';
import { DIMENSIONS } from '../src/types.js';
import { fakeContext } from './helpers.js';

/** Synthetic dimension map for exercising LEVEL_REQUIREMENTS in isolation, without a full scan. */
function makeDims(overrides: Partial<Record<DimensionId, number>>): Map<DimensionId, DimensionScore> {
  return new Map(
    DIMENSIONS.map((d) => [
      d.id,
      { id: d.id, title: d.title, earned: 0, max: 100, percent: overrides[d.id] ?? 0 },
    ]),
  );
}

describe('LEVEL_REQUIREMENTS boundaries', () => {
  test('L1 context requirement is exact at the 40% boundary', () => {
    const [contextReq] = LEVEL_REQUIREMENTS[0]!;
    expect(contextReq!.met(makeDims({ context: 39 }), 0)).toBe(false);
    expect(contextReq!.met(makeDims({ context: 40 }), 0)).toBe(true);
    expect(contextReq!.met(makeDims({ context: 41 }), 0)).toBe(true);
  });

  test('L2 "skills ≥30% or hooks ≥30%" requirement is a true OR', () => {
    const orReq = LEVEL_REQUIREMENTS[1]![1]!;
    expect(orReq.label).toBe('skills ≥ 30% or hooks ≥ 30%');
    expect(orReq.met(makeDims({ skills: 30, hooks: 0 }), 0)).toBe(true);
    expect(orReq.met(makeDims({ skills: 0, hooks: 30 }), 0)).toBe(true);
    expect(orReq.met(makeDims({ skills: 29, hooks: 29 }), 0)).toBe(false);
  });

  test('L4 "hooks ≥70%" requirement is exact at the boundary', () => {
    const hooksReq = LEVEL_REQUIREMENTS[3]![0]!;
    expect(hooksReq.met(makeDims({ hooks: 69 }), 0)).toBe(false);
    expect(hooksReq.met(makeDims({ hooks: 70 }), 0)).toBe(true);
  });

  test('L4 "total ≥80%" requirement reads totalPercent, ignoring the dims map', () => {
    const totalReq = LEVEL_REQUIREMENTS[3]![1]!;
    expect(totalReq.label).toBe('total ≥ 80%');
    expect(totalReq.met(makeDims({}), 79)).toBe(false);
    expect(totalReq.met(makeDims({}), 80)).toBe(true);
    expect(totalReq.met(makeDims({}), 81)).toBe(true);
  });
});

describe('computeLevel — stops at the first unmet level', () => {
  test('a context-only repo fails at L1 and reports only L1 gaps', () => {
    // Empty repo: fails L1's context requirement outright, so the loop must
    // break before ever evaluating L2/L3/L4 — gaps should be L1-only.
    const report = buildReport(fakeContext({}));
    expect(report.level.index).toBe(0);
    expect(report.level.nextLevelGaps).toEqual(['context ≥ 40%']);
  });
});

describe('buildReport shape', () => {
  test('carries tool version, root, and truncated straight from the context', () => {
    const ctx = fakeContext({ 'AGENTS.md': '# hi' });
    const report = buildReport(ctx);
    expect(report.tool.name).toBe('harness-score');
    expect(report.tool.version).toBe(TOOL_VERSION);
    expect(report.root).toBe(ctx.root);
    expect(report.truncated).toBe(ctx.truncated);
  });
});
