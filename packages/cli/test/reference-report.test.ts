import { describe, expect, test } from 'vitest';
import { referenceOverview } from '../src/references/format.js';
import { buildReferenceReport } from '../src/references/report.js';
import { renderMarkdown } from '../src/report/markdown.js';
import { renderTerminal } from '../src/report/terminal.js';
import { buildReportFromScanContext } from '../src/score.js';
import type { ScanContext, ScanIncompleteReason } from '../src/types.js';
import { fakeContext } from './helpers.js';

const FILES: Record<string, string> = {
  'AGENTS.md': '# Guide\n[ok](docs/a.md) [bad](docs/missing.md) [web](https://example.com) `Next.js`\n',
  'docs/a.md': '# A\n',
  'fixtures/demo/AGENTS.md': '[x](y.md)',
};

function context(files = FILES, overrides: Partial<ScanContext> = {}): ScanContext {
  return { ...fakeContext(files), ...overrides };
}

function incomplete(reasons: ScanIncompleteReason[]): Partial<ScanContext> {
  return { truncated: true, incompleteReasons: reasons };
}

function reportWithReferences(ctx: ScanContext) {
  const report = buildReportFromScanContext(ctx);
  report.references = buildReferenceReport(ctx);
  return report;
}

describe('buildReferenceReport', () => {
  const report = buildReferenceReport(context());

  test('summary counts every state and reason', () => {
    expect(report.summary).toEqual({
      operationalDocuments: 1,
      skippedDocuments: 1,
      unreadableDocuments: 0,
      occurrences: 4,
      byState: { consistent: 1, inconsistent: 1, 'not-evaluable': 1, 'not-supported': 0, ambiguous: 1 },
      byReason: { 'bare-name-not-found': 1, 'external-resource': 1, 'target-missing': 1 },
      scanComplete: true,
    });
  });

  test('reason keys are sorted', () => {
    expect(Object.keys(report.summary.byReason)).toEqual([...Object.keys(report.summary.byReason)].sort());
  });

  test('skipped documents keep their kind and scope', () => {
    expect(report.skipped).toEqual([
      { path: 'fixtures/demo/AGENTS.md', kind: 'context-instruction', scope: 'illustrative' },
    ]);
  });

  test('a repository without OpenSpec reports no structure', () => {
    expect(report.specifications.structure.status).toBe('not-identified');
  });

  test('unreadable documents are counted apart from checked ones', () => {
    const inner = fakeContext(FILES);
    const unreadable = buildReferenceReport(
      context(FILES, { read: (p: string) => (p === 'AGENTS.md' ? null : inner.read(p)) }),
    );
    expect(unreadable.summary.operationalDocuments).toBe(0);
    expect(unreadable.summary.unreadableDocuments).toBe(1);
    expect(unreadable.unreadable).toEqual(['AGENTS.md']);
  });
});

describe('referenceOverview', () => {
  test('summary lines and the inconsistent listing', () => {
    const overview = referenceOverview(buildReferenceReport(context()));
    expect(overview.documents).toBe('1 operational documents · 4 references · 1 documents skipped');
    expect(overview.states).toBe(
      'consistent 1 · inconsistent 1 · not evaluable 1 · not supported 0 · ambiguous 1',
    );
    expect(overview.incomplete).toBe(false);
    expect(overview.inconsistent).toEqual([
      { location: 'AGENTS.md:2:23', text: 'docs/missing.md', evidence: 'no file at docs/missing.md' },
    ]);
    expect(overview.hidden).toBe(0);
  });

  test('other outcomes are grouped by state, then count, then reason', () => {
    const overview = referenceOverview(buildReferenceReport(context()));
    expect(overview.other).toEqual([
      { state: 'not-evaluable', reason: 'external-resource', count: 1 },
      { state: 'ambiguous', reason: 'bare-name-not-found', count: 1 },
    ]);
  });

  test('long listings are cut at 50', () => {
    const links = Array.from({ length: 60 }, (_, i) => `[a](missing/n${i}.md)`).join('\n');
    const overview = referenceOverview(buildReferenceReport(context({ 'AGENTS.md': links })));
    expect(overview.inconsistent).toHaveLength(50);
    expect(overview.hidden).toBe(10);
  });

  test('unreadable documents and incomplete scans are flagged', () => {
    const inner = fakeContext(FILES);
    const overview = referenceOverview(
      buildReferenceReport(
        context(FILES, {
          read: (p: string) => (p === 'AGENTS.md' ? null : inner.read(p)),
          ...incomplete([{ code: 'file-count-limit' }]),
        }),
      ),
    );
    expect(overview.documents).toContain('· 1 unreadable');
    expect(overview.incomplete).toBe(true);
  });

  test('specification lines for each structure status', () => {
    expect(referenceOverview(buildReferenceReport(context())).specifications).toEqual([
      'Specifications: no OpenSpec structure found',
    ]);

    const external = context(
      { 'AGENTS.md': '' },
      incomplete([{ code: 'outside-root-symlink', path: 'openspec' }]),
    );
    expect(referenceOverview(buildReferenceReport(external)).specifications).toEqual([
      'Specifications (OpenSpec): stored outside the repository root, not evaluable locally',
    ]);

    const specs = {
      'openspec/specs/a/spec.md': '# A\n\nThe system SHALL work.\n',
      'openspec/specs/b/spec.md': '# B\n\nBody.\n',
    };
    const inner = fakeContext(specs);
    const identified = context(specs, {
      read: (p: string) => (p === 'openspec/specs/b/spec.md' ? null : inner.read(p)),
    });
    expect(referenceOverview(buildReferenceReport(identified)).specifications).toEqual([
      'Specifications (OpenSpec): 2 spec documents · 0 active changes · 0 archived changes',
      'minimum content: sufficient 1 · insufficient 0 · empty 0 · unreadable 1',
      'references in specifications: consistent 0 · inconsistent 0 · not evaluable 0 · not supported 0 · ambiguous 0',
    ]);
  });
});

describe('terminal and Markdown sections', () => {
  test('nothing is added when the report has no references', () => {
    const report = buildReportFromScanContext(context());
    expect(renderTerminal(report)).not.toContain('References (informational');
    expect(renderMarkdown(report)).not.toContain('## References');
  });

  test('terminal section', () => {
    const output = renderTerminal(reportWithReferences(context()));
    expect(output).toContain('References (informational, not part of the score)');
    expect(output).toContain('Inconsistent:');
    expect(output).toContain('AGENTS.md:2:23 docs/missing.md');
    expect(output).toContain('Other outcomes:');
    expect(output).toContain('not evaluable / external-resource: 1');
    expect(output).toContain('Specifications: no OpenSpec structure found');
    expect(output.indexOf('References (informational')).toBeGreaterThan(output.indexOf('harness-score v'));
  });

  test('Markdown section', () => {
    const output = renderMarkdown(reportWithReferences(context()));
    expect(output).toContain('## References');
    expect(output).toContain('_Informational; not part of the score._');
    expect(output).toContain('### Inconsistent');
    expect(output).toContain('`AGENTS.md:2:23` `docs/missing.md` — no file at docs/missing.md');
    expect(output).toContain('### Other outcomes');
    expect(output).toContain('### Specifications');
  });

  test('cut listings and incomplete scans in both formats', () => {
    const links = Array.from({ length: 60 }, (_, i) => `[a](missing/n${i}.md)`).join('\n');
    const ctx = context(
      { 'AGENTS.md': links },
      incomplete([{ code: 'depth-limit', path: 'vendor', limit: 3 }]),
    );
    const report = reportWithReferences(ctx);
    const terminal = renderTerminal(report);
    const markdown = renderMarkdown(report);
    expect(terminal).toContain('and 10 more (use --json for the full list)');
    expect(terminal).toContain('the scan was incomplete');
    expect(markdown).toContain('… and 10 more (see the JSON report).');
    expect(markdown).toContain('The scan was incomplete');
  });

  test('specification details are listed under the heading', () => {
    const specs = { 'openspec/specs/a/spec.md': '# A\n\nBody.\n' };
    const report = reportWithReferences(context(specs));
    expect(renderTerminal(report)).toContain('minimum content: sufficient 1');
    expect(renderMarkdown(report)).toContain('- minimum content: sufficient 1');
  });
});
