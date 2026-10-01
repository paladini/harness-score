import { describe, expect, test } from 'vitest';
import type { ReportDiff } from '../src/diff.js';
import { renderTerminal } from '../src/report/terminal.js';
import type { CheckResult, DimensionScore, Report, ScoreSnapshot } from '../src/types.js';
import { DIMENSIONS } from '../src/types.js';

function makeDimensions(
  overrides: Partial<Record<string, number>> = {},
  applicableOverrides: Partial<Record<string, boolean>> = {},
): DimensionScore[] {
  return DIMENSIONS.map((d) => ({
    id: d.id,
    title: d.title,
    earned: overrides[d.id] ?? 0,
    max: 20,
    percent: overrides[d.id] ?? 0,
    applicable: applicableOverrides[d.id] ?? true,
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
    severity: 'error',
    applicable: true,
    ...overrides,
  };
}

function makeSnapshot(overrides: Partial<ScoreSnapshot> = {}): ScoreSnapshot {
  return {
    level: { index: 1, name: 'Documented', nextLevelGaps: [], capped: false },
    score: { earned: 50, max: 108, percent: 46 },
    dimensions: makeDimensions(),
    checks: [makeCheck()],
    detectedHarnesses: [],
    ...overrides,
  };
}

function makeReport(overrides: Partial<Report> = {}): Report {
  const snapshot = makeSnapshot();
  return {
    tool: { name: 'harness-score', version: '0.3.0' },
    root: '/fake',
    truncated: false,
    scopes: { maturity: ['repo'], effective: ['repo'] },
    gate: 'maturity',
    detectedHarnesses: [],
    level: snapshot.level,
    score: snapshot.score,
    dimensions: snapshot.dimensions,
    checks: snapshot.checks,
    effective: snapshot,
    preset: { extends: [], rules: {}, resolved: [] },
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
    presetChanged: false,
    ...overrides,
  };
}

describe('renderTerminal', () => {
  test('renders legacy truncated reports as incomplete without an authoritative level', () => {
    const incomplete = renderTerminal(makeReport({ truncated: true }));
    expect(incomplete).toContain('Maturity: unavailable - incomplete scan');
    expect(incomplete).toContain('maturity: file-count-limit');
    expect(incomplete).toContain('Provisional dimensions:');
    expect(incomplete).not.toContain('Maturity: L1');
    expect(renderTerminal(makeReport({ truncated: false }))).not.toContain('Incomplete scan');
  });

  test('keeps maturity authoritative when only the requested effective scope is incomplete', () => {
    const out = renderTerminal(
      makeReport({
        truncated: true,
        scopes: { maturity: ['repo'], effective: ['repo', 'team'] },
        verdicts: {
          maturity: { status: 'complete', reasons: [] },
          effective: {
            status: 'incomplete',
            reasons: [{ code: 'depth-limit', path: 'team:deep', limit: 8 }],
          },
        },
      }),
    );
    expect(out).toContain('Maturity: L1');
    expect(out).toContain('Effective: unavailable - incomplete scan');
    expect(out).toContain('Effective scan incomplete · provisional effective results are not authoritative.');
    expect(out).toContain('effective: depth-limit at team:deep (limit 8)');
    expect(out).not.toContain('Maturity scan incomplete');
    expect(out).not.toContain('Provisional dimensions:');
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

  test('renders additive check warnings with code and source', () => {
    const report = makeReport({
      checks: [
        makeCheck({
          passed: true,
          warnings: [
            {
              code: 'unknown-hook-event',
              message: 'FutureEvent is not cataloged.',
              source: '.claude/settings.json',
            },
          ],
        }),
      ],
    });
    const out = renderTerminal(report);
    expect(out).toContain('Warnings (1):');
    expect(out).toContain('unknown-hook-event');
    expect(out).toContain('.claude/settings.json');
  });

  test('shows detected harnesses with display names, only when non-empty', () => {
    const detected = makeReport({ detectedHarnesses: ['cursor', 'claude-code', 'devin'] });
    expect(renderTerminal(detected)).toContain('Detected: Cursor, Claude Code, Devin');

    expect(renderTerminal(makeReport({ detectedHarnesses: [] }))).not.toContain('Detected:');
  });

  test('unknown tool ids in detectedHarnesses pass through as-is', () => {
    const out = renderTerminal(makeReport({ detectedHarnesses: ['some-future-tool'] }));
    expect(out).toContain('Detected: some-future-tool');
  });

  test('shows next-level gaps only when present', () => {
    const withGaps = makeReport({
      level: { index: 1, name: 'Documented', nextLevelGaps: ['context ≥ 60%'], capped: false },
    });
    expect(renderTerminal(withGaps)).toContain('To reach L2:');

    const noGaps = makeReport({
      level: { index: 4, name: 'Self-correcting', nextLevelGaps: [], capped: false },
    });
    expect(renderTerminal(noGaps)).not.toContain('To reach L');
  });

  test('shows a capped marker and capReason when the level is capped', () => {
    const out = renderTerminal(
      makeReport({
        level: {
          index: 3,
          name: 'Sensing',
          nextLevelGaps: ['hooks ≥ 70%'],
          capped: true,
          capReason:
            'L4 requires hooks ≥ 70%, which is not reachable: the "hooks" dimension has no applicable checks.',
        },
      }),
    );
    expect(out).toContain('(capped)');
    expect(out).toContain('not reachable');
  });

  test('renders an excluded-by-preset marker for a non-applicable dimension instead of a bar', () => {
    const out = renderTerminal(
      makeReport({
        dimensions: makeDimensions({}, { hooks: false }),
      }),
    );
    expect(out).toContain('excluded by preset');
  });

  test('shows a preset disclosure line only when preset.resolved is non-empty', () => {
    const withPreset = makeReport({
      preset: {
        extends: ['no-hooks'],
        rules: {},
        resolved: [{ id: 'HKS-01', severity: 'off', source: 'extends:no-hooks' }],
      },
    });
    expect(renderTerminal(withPreset)).toContain('Preset:');
    expect(renderTerminal(withPreset)).toContain('no-hooks');

    expect(renderTerminal(makeReport())).not.toContain('Preset:');
  });

  test('an off-severity failing check is excluded from Improvements', () => {
    const report = makeReport({
      checks: [makeCheck({ id: 'HKS-01', passed: false, severity: 'off' }), makeCheck({ passed: true })],
    });
    const out = renderTerminal(report);
    expect(out).not.toContain('HKS-01');
    expect(out).toContain('fully harnessed');
  });

  test('diff section warns when maturityModelChanged is true', () => {
    const out = renderTerminal(makeReport(), makeDiff({ maturityModelChanged: true }));
    expect(out).toContain('Baseline is from a different tool version');
  });

  test('diff section warns when presetChanged is true', () => {
    const out = renderTerminal(makeReport(), makeDiff({ presetChanged: true }));
    expect(out).toContain('Baseline used a different extends/rules config');
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

  test('not-applicable checks are listed apart from improvements', () => {
    const out = renderTerminal(
      makeReport({
        checks: [
          makeCheck({ id: 'HYG-01', passed: false }),
          makeCheck({
            id: 'HYG-08',
            points: 3,
            applicable: false,
            evidence: 'No MCP config is in use; HYG-08 does not apply.',
          }),
        ],
      }),
    );
    expect(out).toContain('Improvements (1)');
    expect(out).toContain('HYG-01');
    expect(out).toContain('Not applicable (1)');
    expect(out).toContain('HYG-08 does not apply');
    expect(out).not.toContain('(+3 pts)');
  });

  test('diff section shows "No change." when nothing changed at all', () => {
    const out = renderTerminal(makeReport(), makeDiff());
    expect(out).toContain('No change.');
  });
});
