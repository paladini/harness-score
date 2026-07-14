import { describe, expect, test } from 'vitest';
import type { ReportDiff } from '../src/diff.js';
import { renderMarkdown } from '../src/report/markdown.js';
import type { CheckResult, DimensionScore, Report } from '../src/types.js';
import { DIMENSIONS } from '../src/types.js';

function makeDimensions(): DimensionScore[] {
  return DIMENSIONS.map((d) => ({ id: d.id, title: d.title, earned: 5, max: 20, percent: 25 }));
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
    rubricChanged: false,
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

  test('escapes pipe characters inside evidence so the table does not break', () => {
    const out = renderMarkdown(makeReport({ checks: [makeCheck({ evidence: 'found a | in the value' })] }));
    expect(out).toContain('found a \\| in the value');
    expect(out).not.toContain('found a | in the value');
  });

  test('shows the recommended-improvements section only when a check fails', () => {
    const withFailure = renderMarkdown(makeReport({ checks: [makeCheck({ passed: false })] }));
    expect(withFailure).toContain('## Recommended improvements');

    const allPassing = renderMarkdown(makeReport({ checks: [makeCheck({ passed: true })] }));
    expect(allPassing).not.toContain('## Recommended improvements');
  });

  test('shows the next-level-gaps line only when gaps exist', () => {
    const withGaps = renderMarkdown(
      makeReport({ level: { index: 1, name: 'Documented', nextLevelGaps: ['context ≥ 60%'] } }),
    );
    expect(withGaps).toContain('**To reach L2:**');

    const noGaps = renderMarkdown(
      makeReport({ level: { index: 4, name: 'Self-correcting', nextLevelGaps: [] } }),
    );
    expect(noGaps).not.toContain('**To reach L');
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

  test('diff falls back to "No change since baseline." when nothing changed', () => {
    const out = renderMarkdown(makeReport(), makeDiff());
    expect(out).toContain('No change since baseline.');
  });

  test('diff warns when rubricChanged is true', () => {
    const out = renderMarkdown(makeReport(), makeDiff({ rubricChanged: true }));
    expect(out).toContain('Baseline is from a different tool version');
  });
});
