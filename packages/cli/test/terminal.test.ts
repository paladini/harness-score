import { describe, expect, test } from 'vitest';
import type { ReportDiff } from '../src/diff.js';
import { renderTerminal } from '../src/report/terminal.js';
import type { CheckResult, DimensionScore, Report } from '../src/types.js';
import { DIMENSIONS } from '../src/types.js';

function makeDimensions(overrides: Partial<Record<string, number>> = {}): DimensionScore[] {
  return DIMENSIONS.map((d) => ({
    id: d.id,
    title: d.title,
    earned: overrides[d.id] ?? 0,
    max: 20,
    percent: overrides[d.id] ?? 0,
  }));
}

function makeCheck(overrides: Partial<CheckResult> = {}): CheckResult {
  return {
    id: 'CTX-01',
    dimension: 'context',
    title: 'Agent context file present',
    points: 4,
    earned: 0,
    passed: false,
    evidence: 'No AGENTS.md found.',
    remediation: 'Create an AGENTS.md.',
    docsUrl: 'https://paladini.github.io/harness-score/guide/measure-and-improve#ctx-01',
    ...overrides,
  };
}

function makeReport(overrides: Partial<Report> = {}): Report {
  return {
    tool: { name: 'harness-score', version: '0.3.0' },
    root: '/fake',
    truncated: false,
    level: { index: 1, name: 'Documented', nextLevelGaps: [] },
    score: { earned: 50, max: 108, percent: 46 },
    dimensions: makeDimensions(),
    checks: [makeCheck()],
    ...overrides,
  };
}

function makeDiff(overrides: Partial<ReportDiff> = {}): ReportDiff {
  return {
    level: { before: 1, beforeName: 'Documented', after: 1, afterName: 'Documented', delta: 0 },
    score: {
      before: { earned: 50, max: 108, percent: 46 },
      after: { earned: 50, max: 108, percent: 46 },
      deltaEarned: 0,
      deltaPercent: 0,
    },
    dimensions: DIMENSIONS.map((d) => ({ id: d.id, title: d.title, before: 0, after: 0, delta: 0 })),
    checksChanged: [],
    maturityModelChanged: false,
    ...overrides,
  };
}

describe('renderTerminal', () => {
  test('shows the truncated-scan banner only when report.truncated is true', () => {
    expect(renderTerminal(makeReport({ truncated: true }))).toContain('Scan stopped early');
    expect(renderTerminal(makeReport({ truncated: false }))).not.toContain('Scan stopped early');
  });

  test('shows "fully harnessed" when every check passed', () => {
    const report = makeReport({ checks: [makeCheck({ passed: true })] });
    const out = renderTerminal(report);
    expect(out).toContain('fully harnessed');
    expect(out).not.toContain('Improvements (');
  });

  test('lists improvements with remediation/evidence/docsUrl when checks fail', () => {
    const report = makeReport({ checks: [makeCheck({ passed: false })] });
    const out = renderTerminal(report);
    expect(out).toContain('Improvements (1):');
    expect(out).toContain('Create an AGENTS.md.');
    expect(out).toContain('No AGENTS.md found.');
    expect(out).toContain('measure-and-improve#ctx-01');
  });

  test('shows next-level gaps only when present', () => {
    const withGaps = makeReport({
      level: { index: 1, name: 'Documented', nextLevelGaps: ['context ≥ 60%'] },
    });
    expect(renderTerminal(withGaps)).toContain('To reach L2:');

    const noGaps = makeReport({ level: { index: 4, name: 'Self-correcting', nextLevelGaps: [] } });
    expect(renderTerminal(noGaps)).not.toContain('To reach L');
  });

  test('diff section warns when maturityModelChanged is true', () => {
    const out = renderTerminal(makeReport(), makeDiff({ maturityModelChanged: true }));
    expect(out).toContain('Baseline is from a different tool version');
  });

  test('diff section renders only non-zero dimension deltas', () => {
    const diff = makeDiff({
      dimensions: DIMENSIONS.map((d, i) => ({
        id: d.id,
        title: d.title,
        before: 0,
        after: i === 0 ? 50 : 0,
        delta: i === 0 ? 50 : 0,
      })),
    });
    const out = renderTerminal(makeReport(), diff);
    expect(out).toContain(`${DIMENSIONS[0]!.title.padEnd(20)} 0% → 50% (+50pp)`);
    for (const d of DIMENSIONS.slice(1)) {
      expect(out).not.toContain(`${d.title.padEnd(20)} 0% → 0%`);
    }
  });

  test('diff section shows only newly-passing checks when nothing failed', () => {
    const diff = makeDiff({
      checksChanged: [{ id: 'CTX-01', title: 'x', points: 4, change: 'newly-passing' }],
    });
    const out = renderTerminal(makeReport(), diff);
    expect(out).toContain('Newly passing:');
    expect(out).not.toContain('Newly failing:');
  });

  test('diff section shows only newly-failing checks when nothing improved', () => {
    const diff = makeDiff({
      checksChanged: [{ id: 'CTX-01', title: 'x', points: 4, change: 'newly-failing' }],
    });
    const out = renderTerminal(makeReport(), diff);
    expect(out).toContain('Newly failing:');
    expect(out).not.toContain('Newly passing:');
  });

  test('diff section shows "No change." when nothing changed at all', () => {
    const out = renderTerminal(makeReport(), makeDiff());
    expect(out).toContain('No change.');
  });
});
