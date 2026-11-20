import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';
import { analyzeRepository, countByState } from '../src/references/analyze.js';
import { createScanContext } from '../src/scan.js';
import { fakeContext } from './helpers.js';

const FILES: Record<string, string> = {
  'AGENTS.md':
    'See [guide](docs/guide.md), [x](docs/missing.md), [e](https://example.com) and `src/index.ts`.',
  'docs/guide.md': '# Guide\n',
  'src/index.ts': '',
  'README.md': '',
  '.cursor/rules/core.mdc': '---\nglobs: src/**/*.ts\n---\nbody',
  'packages/api/AGENTS.md': '[root](../../README.md)',
  'fixtures/demo/AGENTS.md': '[a](nope.md)',
  'openspec/changes/archive/old/proposal.md': '[a](zz.md)',
};

describe('analyzeRepository', () => {
  const result = analyzeRepository(fakeContext(FILES));

  test('checks operational documents only and lists the rest as skipped', () => {
    expect(result.skipped.map((d) => [d.path, d.scope])).toEqual([
      ['fixtures/demo/AGENTS.md', 'illustrative'],
      ['openspec/changes/archive/old/proposal.md', 'archived'],
    ]);
    expect(new Set(result.references.map((r) => r.sourceArtifact))).toEqual(
      new Set(['.cursor/rules/core.mdc', 'AGENTS.md', 'packages/api/AGENTS.md']),
    );
  });

  test('references come ordered by document path and then position', () => {
    const order = result.references.map((r) => [r.sourceArtifact, r.position.line, r.position.column]);
    expect(order).toEqual(
      [...order].sort(
        (a, b) =>
          String(a[0]).localeCompare(String(b[0]), 'en') ||
          Number(a[1]) - Number(b[1]) ||
          Number(a[2]) - Number(b[2]),
      ),
    );
  });

  test('states: found, missing, external and a scope glob', () => {
    const states = Object.fromEntries(result.references.map((r) => [r.rawText, r.state]));
    expect(states['docs/guide.md']).toBe('consistent');
    expect(states['docs/missing.md']).toBe('inconsistent');
    expect(states['https://example.com']).toBe('not-evaluable');
    expect(states['src/index.ts']).toBe('consistent');
    expect(states['src/**/*.ts']).toBe('consistent');
    expect(states['../../README.md']).toBe('consistent');
  });

  test('counts every state and nothing is pending', () => {
    const counts = countByState(result.references);
    expect(Object.keys(counts).sort()).toEqual([
      'ambiguous',
      'consistent',
      'inconsistent',
      'not-evaluable',
      'not-supported',
    ]);
    expect(Object.values(counts).reduce((a, b) => a + b, 0)).toBe(result.references.length);
    expect(counts.inconsistent).toBe(1);
  });

  test('a complete scan is reported as complete', () => {
    expect(result.scanComplete).toBe(true);
    expect(result.unreadable).toEqual([]);
  });

  test('analysing twice gives identical results', () => {
    expect(analyzeRepository(fakeContext(FILES))).toEqual(result);
  });
});

describe('unreadable documents and incomplete scans', () => {
  test('an unreadable operational document is reported, not guessed', () => {
    const inner = fakeContext(FILES);
    const ctx = { ...inner, read: (p: string) => (p === 'AGENTS.md' ? null : inner.read(p)) };
    const result = analyzeRepository(ctx);
    expect(result.unreadable).toEqual(['AGENTS.md']);
    expect(result.references.some((r) => r.sourceArtifact === 'AGENTS.md')).toBe(false);
  });

  test('scan completeness follows the context', () => {
    const ctx = {
      ...fakeContext(FILES),
      truncated: true,
      incompleteReasons: [{ code: 'file-count-limit' as const }],
    };
    const result = analyzeRepository(ctx);
    expect(result.scanComplete).toBe(false);
    expect(result.references.find((r) => r.rawText === 'docs/missing.md')?.state).toBe('not-evaluable');
  });
});

describe('real repository', () => {
  const HERE = path.dirname(fileURLToPath(import.meta.url));
  const REPO_ROOT = path.join(HERE, '..', '..', '..');

  test('the repository itself can be analysed, deterministically, with no pending state', () => {
    const first = analyzeRepository(createScanContext(REPO_ROOT));
    const second = analyzeRepository(createScanContext(REPO_ROOT));
    expect(second).toEqual(first);
    expect(first.references.length).toBeGreaterThan(0);
    expect(first.skipped.some((d) => d.path === 'fixtures/level-1/AGENTS.md')).toBe(true);
    const allowed = new Set(['consistent', 'inconsistent', 'not-evaluable', 'not-supported', 'ambiguous']);
    for (const reference of first.references) expect(allowed.has(reference.state)).toBe(true);
  });
});
