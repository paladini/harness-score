import { describe, expect, test } from 'vitest';
import type { ReportDiff } from '../src/diff.js';
import { renderMarkdown } from '../src/report/markdown.js';
import type { CheckResult, DimensionScore, Report, ScoreSnapshot } from '../src/types.js';
import { DIMENSIONS } from '../src/types.js';

function makeDimensions(applicableOverrides: Partial<Record<string, boolean>> = {}): DimensionScore[] {
  return DIMENSIONS.map((d) => ({
    id: d.id,
    title: d.title,
    earned: 5,
    max: 20,
    percent: 25,
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

describe('renderMarkdown', () => {
  test('renders header, dimensions table, and checks table', () => {
    const out = renderMarkdown(makeReport());
    expect(out).toContain('# Harness Score Report');
    expect(out).toContain('**Maturity level:** L1 · Documented');
    expect(out).toContain('| Dimension | Score | % |');
    expect(out).toContain(`| ${DIMENSIONS[0]!.title} | 5/20 | 25% |`);
    expect(out).toContain('| | Check | Points | Evidence |');
    expect(out).toContain('❌');
  });

  test('renders explicit incomplete verdicts as provisional and hides the level', () => {
    const out = renderMarkdown(
      makeReport({
        truncated: true,
        verdicts: {
          maturity: {
            status: 'incomplete',
            reasons: [{ code: 'unreadable-directory', path: 'private' }],
          },
          effective: {
            status: 'incomplete',
            reasons: [{ code: 'unreadable-directory', path: 'private' }],
          },
        },
      }),
    );
    expect(out).toContain('**Maturity:** unavailable - incomplete scan');
    expect(out).toContain('**Provisional maturity score:**');
    expect(out).toContain('## Provisional dimensions');
    expect(out).toContain('## Provisional checks');
    expect(out).toContain('unreadable-directory at private');
    expect(out).not.toContain('**Maturity level:** L1');
  });

  test('uses truncated as the fail-closed fallback for old reports', () => {
    const out = renderMarkdown(makeReport({ truncated: true }));
    expect(out).toContain('**Maturity:** unavailable - incomplete scan');
    expect(out).toContain('file-count-limit');
  });

  test('keeps maturity authoritative and scopes the warning when only effective is incomplete', () => {
    const out = renderMarkdown(
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
    expect(out).toContain('**Maturity level:** L1 · Documented');
    expect(out).toContain('**Effective:** unavailable - incomplete scan');
    expect(out).toContain(
      '> ⚠ Effective scan is incomplete. Provisional effective results are not authoritative.',
    );
    expect(out).not.toContain('Maturity scan is incomplete');
    expect(out).toContain('- **effective:** depth-limit at team:deep (limit 8)');
    expect(out).toContain('## Dimensions');
    expect(out).not.toContain('## Provisional dimensions');
  });

  test('shows detected harnesses with display names, only when non-empty', () => {
    const detected = renderMarkdown(makeReport({ detectedHarnesses: ['cursor', 'claude-code', 'devin'] }));
    expect(detected).toContain('**Detected harnesses:** Cursor, Claude Code, Devin');

    expect(renderMarkdown(makeReport({ detectedHarnesses: [] }))).not.toContain('Detected harnesses');
  });

  test('escapes pipe characters inside evidence so the table does not break', () => {
    const out = renderMarkdown(makeReport({ checks: [makeCheck({ evidence: 'found a | in the value' })] }));
    expect(out).toContain('found a \\| in the value');
    expect(out).not.toContain('found a | in the value');
  });

  test('renders additive check warnings with code and source', () => {
    const out = renderMarkdown(
      makeReport({
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
      }),
    );
    expect(out).toContain('## Warnings');
    expect(out).toContain('unknown-hook-event');
    expect(out).toContain('`.claude/settings.json`');
  });

  test('shows the recommended-improvements section only when a check fails', () => {
    const withFailure = renderMarkdown(makeReport({ checks: [makeCheck({ passed: false })] }));
    expect(withFailure).toContain('## Recommended improvements');

    const allPassing = renderMarkdown(makeReport({ checks: [makeCheck({ passed: true })] }));
    expect(allPassing).not.toContain('## Recommended improvements');
  });

  test('shows the next-level-gaps line only when gaps exist', () => {
    const withGaps = renderMarkdown(
      makeReport({
        level: { index: 1, name: 'Documented', nextLevelGaps: ['context ≥ 60%'], capped: false },
      }),
    );
    expect(withGaps).toContain('**To reach L2:**');

    const noGaps = renderMarkdown(
      makeReport({ level: { index: 4, name: 'Self-correcting', nextLevelGaps: [], capped: false } }),
    );
    expect(noGaps).not.toContain('**To reach L');
  });

  test('shows a capped note when the level is capped', () => {
    const out = renderMarkdown(
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
    expect(out).toContain('Capped');
    expect(out).toContain('not reachable');
  });

  test('renders N/A for a non-applicable dimension instead of a misleading 0%', () => {
    const out = renderMarkdown(makeReport({ dimensions: makeDimensions({ hooks: false }) }));
    expect(out).toContain('N/A (excluded by preset)');
  });

  test('shows a preset disclosure line only when preset.resolved is non-empty', () => {
    const withPreset = renderMarkdown(
      makeReport({
        preset: {
          extends: ['no-hooks'],
          rules: {},
          resolved: [{ id: 'HKS-01', severity: 'off', source: 'extends:no-hooks' }],
        },
      }),
    );
    expect(withPreset).toContain('**Preset:**');
    expect(withPreset).toContain('no-hooks');

    expect(renderMarkdown(makeReport())).not.toContain('**Preset:**');
  });

  test('an off-severity check gets a distinct status glyph, not ✅/❌', () => {
    const out = renderMarkdown(
      makeReport({ checks: [makeCheck({ id: 'HKS-01', passed: false, severity: 'off' })] }),
    );
    expect(out).toContain('➖');
  });

  test('an off-severity failing check is excluded from Recommended improvements', () => {
    const out = renderMarkdown(
      makeReport({
        checks: [makeCheck({ id: 'HKS-01', passed: false, severity: 'off' }), makeCheck({ passed: true })],
      }),
    );
    expect(out).not.toContain('## Recommended improvements');
  });

  test('diff table renders only changed dimensions', () => {
    const diff = makeDiff({
      dimensions: DIMENSIONS.map((d, i) => ({
        id: d.id,
        title: d.title,
        before: 0,
        after: i === 0 ? 50 : 0,
        delta: i === 0 ? 50 : 0,
      })),
    });
    const out = renderMarkdown(makeReport(), diff);
    expect(out).toContain('## Compared to baseline');
    expect(out).toContain(`| ${DIMENSIONS[0]!.title} | 0% | 50% | +50pp |`);
    for (const d of DIMENSIONS.slice(1)) {
      expect(out).not.toContain(`| ${d.title} | 0% | 0% |`);
    }
  });

  test('not-applicable checks are omitted from recommended improvements', () => {
    const out = renderMarkdown(
      makeReport({
        checks: [
          makeCheck({
            id: 'HYG-08',
            applicable: false,
            evidence: 'No MCP config is in use; HYG-08 does not apply.',
          }),
        ],
      }),
    );
    expect(out).toContain('| N/A |');
    expect(out).toContain('## Not applicable');
    expect(out).toContain('HYG-08 does not apply');
    expect(out).not.toContain('## Recommended improvements');
  });

  test('diff falls back to "No change since baseline." when nothing changed', () => {
    const out = renderMarkdown(makeReport(), makeDiff());
    expect(out).toContain('No change since baseline.');
  });

  test('diff warns when maturityModelChanged is true', () => {
    const out = renderMarkdown(makeReport(), makeDiff({ maturityModelChanged: true }));
    expect(out).toContain('Baseline is from a different tool version');
  });

  test('diff warns when presetChanged is true', () => {
    const out = renderMarkdown(makeReport(), makeDiff({ presetChanged: true }));
    expect(out).toContain('Baseline used a different extends/rules config');
  });
});
