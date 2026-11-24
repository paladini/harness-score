import { describe, expect, test } from 'vitest';
import { analyzeRepository } from '../src/references/analyze.js';
import { assessMinimumContent, assessSpecifications } from '../src/references/specs.js';
import type { ScanIncompleteReason } from '../src/types.js';
import { fakeContext } from './helpers.js';

function assess(files: Record<string, string>, incompleteReasons?: ScanIncompleteReason[]) {
  const ctx = { ...fakeContext(files), incompleteReasons };
  return assessSpecifications(ctx, analyzeRepository(ctx));
}

const SPEC = '# Auth\n\n## Requirement: login\nThe system SHALL let users log in.\n';
const PROPOSAL = '# Add login\n\n## Why\nUsers need accounts.\n';
const TASKS = '# Tasks\n\n- [ ] add the form\n- [x] add the route\n';

describe('minimum content', () => {
  test.each([
    ['empty file', '', 'empty'],
    ['only spaces and blank lines', '  \n\n\t\n', 'empty'],
    ['only an HTML comment', '<!-- fill this in -->\n', 'empty'],
    ['only a heading', '# Title\n', 'insufficient'],
    ['heading with a comment-only body', '# Title\n<!-- TODO -->\n', 'insufficient'],
    ['text without any heading', 'Just a sentence.\n', 'insufficient'],
    ['heading and body', SPEC, 'sufficient'],
    ['setext heading and body', 'Title\n=====\n\nBody text.\n', 'sufficient'],
    ['frontmatter alone does not count', '---\nid: x\n---\n', 'empty'],
    ['frontmatter, heading and body', `---\nid: x\n---\n${PROPOSAL}`, 'sufficient'],
  ])('%s', (_name, content, expected) => {
    expect(assessMinimumContent('openspec/specs/x/spec.md', content)).toBe(expected);
  });

  test('a tasks file needs at least one list item', () => {
    expect(assessMinimumContent('openspec/changes/a/tasks.md', TASKS)).toBe('sufficient');
    expect(assessMinimumContent('openspec/changes/a/tasks.md', '# Tasks\n\nWe will do things.\n')).toBe(
      'insufficient',
    );
  });

  test('line endings do not matter', () => {
    expect(assessMinimumContent('a/spec.md', SPEC.replaceAll('\n', '\r\n'))).toBe('sufficient');
  });
});

describe('structure', () => {
  test('no OpenSpec documents: not identified', () => {
    const result = assess({ 'AGENTS.md': '# Guide\n', 'README.md': '' });
    expect(result.structure).toEqual({
      status: 'not-identified',
      convention: null,
      parts: { specs: 0, activeChanges: 0, archivedChanges: 0 },
    });
    expect(result.documents).toEqual([]);
  });

  test('specs and changes, without requiring every file of a change', () => {
    const result = assess({
      'openspec/specs/auth/spec.md': SPEC,
      'openspec/specs/billing/spec.md': SPEC,
      'openspec/changes/add-login/proposal.md': PROPOSAL,
      'openspec/changes/add-login/tasks.md': TASKS,
      'openspec/changes/fix-typo/proposal.md': PROPOSAL,
      'openspec/changes/archive/2025-01-old/proposal.md': PROPOSAL,
    });
    expect(result.structure).toEqual({
      status: 'identified',
      convention: 'openspec',
      parts: { specs: 2, activeChanges: 2, archivedChanges: 1 },
    });
  });

  test('only archived material still shows the structure, with no active change', () => {
    const result = assess({ 'openspec/changes/archive/old/proposal.md': PROPOSAL });
    expect(result.structure.status).toBe('identified');
    expect(result.structure.parts).toEqual({ specs: 0, activeChanges: 0, archivedChanges: 1 });
  });

  test('a structure behind a symlink out of the root is external', () => {
    const result = assess({ 'AGENTS.md': '' }, [{ code: 'outside-root-symlink', path: 'openspec' }]);
    expect(result.structure.status).toBe('external');
    expect(result.properties.structure).toBe('external');
  });

  test('a symlink elsewhere does not make the structure external', () => {
    const result = assess({ 'openspec/specs/a/spec.md': SPEC }, [
      { code: 'outside-root-symlink', path: 'vendor/x' },
    ]);
    expect(result.structure.status).toBe('identified');
  });
});

describe('documents and properties', () => {
  const files = {
    'README.md': '# readme\n',
    'openspec/specs/auth/spec.md': `${SPEC}\nSee [readme](../../../README.md) and [gone](../../../gone.md).\n`,
    'openspec/specs/empty/spec.md': '',
    'openspec/changes/add-login/proposal.md': '# Add login\n',
    'openspec/changes/archive/old/proposal.md': '[x](nope.md)',
  };
  const result = assess(files);

  test('each document gets its own assessment; archived ones are not assessed', () => {
    expect(result.documents.map((d) => [d.path, d.scope, d.minimumContent])).toEqual([
      ['openspec/changes/add-login/proposal.md', 'operational', 'insufficient'],
      ['openspec/changes/archive/old/proposal.md', 'archived', 'not-assessed'],
      ['openspec/specs/auth/spec.md', 'operational', 'sufficient'],
      ['openspec/specs/empty/spec.md', 'operational', 'empty'],
    ]);
  });

  test('minimum content counts cover operational documents only', () => {
    expect(result.properties.minimumContent).toEqual({
      sufficient: 1,
      empty: 1,
      insufficient: 1,
      unreadable: 0,
    });
  });

  test('reference consistency comes from the reference check of operational documents', () => {
    const auth = result.documents.find((d) => d.path === 'openspec/specs/auth/spec.md')!;
    expect(auth.references.total).toBe(2);
    expect(auth.references.byState.consistent).toBe(1);
    expect(auth.references.byState.inconsistent).toBe(1);
    expect(result.properties.referenceConsistency).toMatchObject({ consistent: 1, inconsistent: 1 });
    const archived = result.documents.find((d) => d.scope === 'archived')!;
    expect(archived.references.total).toBe(0);
  });

  test('the three properties stay independent: no combined verdict', () => {
    expect(Object.keys(result.properties).sort()).toEqual([
      'minimumContent',
      'referenceConsistency',
      'structure',
    ]);
    const noRefs = assess({ 'openspec/specs/a/spec.md': SPEC });
    expect(noRefs.properties.minimumContent.sufficient).toBe(1);
    expect(Object.values(noRefs.properties.referenceConsistency).every((n) => n === 0)).toBe(true);
  });

  test('an unreadable operational document is reported as such', () => {
    const inner = fakeContext({ 'openspec/specs/a/spec.md': SPEC });
    const ctx = { ...inner, read: () => null };
    const report = assessSpecifications(ctx, analyzeRepository(inner));
    expect(report.documents[0]?.minimumContent).toBe('unreadable');
    expect(report.properties.minimumContent.unreadable).toBe(1);
  });

  test('assessing twice gives the same result', () => {
    expect(assess(files)).toEqual(result);
  });
});
