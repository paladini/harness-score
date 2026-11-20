import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';
import { findOperationalDocuments } from '../src/references/documents.js';
import { createScanContext } from '../src/scan.js';
import { fakeContext } from './helpers.js';

function classify(paths: string[], root?: string) {
  const files = Object.fromEntries(paths.map((p) => [p, '']));
  return findOperationalDocuments(fakeContext(files, root));
}

function byPath(paths: string[], root?: string) {
  return Object.fromEntries(classify(paths, root).map((d) => [d.path, d]));
}

describe('context instructions', () => {
  test.each([
    'AGENTS.md',
    'CLAUDE.md',
    'GEMINI.md',
    '.claude/CLAUDE.md',
    '.claude/AGENTS.md',
    'packages/api/AGENTS.md',
    'services/web/CLAUDE.md',
    'tools/GEMINI.md',
  ])('%s is a context instruction', (file) => {
    expect(byPath([file])[file]).toEqual({
      path: file,
      kind: 'context-instruction',
      scope: 'operational',
    });
  });
});

describe('scoped rules', () => {
  test.each([
    '.cursor/rules/core.mdc',
    '.github/instructions/api.instructions.md',
    '.windsurf/rules/style.md',
    '.clinerules/core.md',
    '.claude/rules/testing.md',
  ])('%s is a scoped rule', (file) => {
    expect(byPath([file])[file]).toEqual({ path: file, kind: 'scoped-rule', scope: 'operational' });
  });
});

describe('skills', () => {
  test.each([
    '.agents/skills/deploy/SKILL.md',
    '.claude/skills/review/SKILL.md',
    '.cursor/skills/release/SKILL.md',
    '.devin/skills/verify/SKILL.md',
  ])('%s is a skill', (file) => {
    expect(byPath([file])[file]).toEqual({ path: file, kind: 'skill', scope: 'operational' });
  });
});

describe('versioned specifications', () => {
  test('recognizes OpenSpec specs and active changes without requiring all four files', () => {
    const docs = byPath([
      'openspec/specs/auth/spec.md',
      'openspec/changes/add-login/proposal.md',
      'openspec/changes/add-login/tasks.md',
    ]);
    for (const doc of Object.values(docs)) {
      expect(doc.kind).toBe('versioned-spec');
      expect(doc.scope).toBe('operational');
    }
    expect(Object.keys(docs)).toHaveLength(3);
  });

  test('archived changes get a distinct scope', () => {
    const docs = byPath(['openspec/changes/archive/2025-01-old/proposal.md']);
    expect(docs['openspec/changes/archive/2025-01-old/proposal.md']).toEqual({
      path: 'openspec/changes/archive/2025-01-old/proposal.md',
      kind: 'versioned-spec',
      scope: 'archived',
    });
  });

  test('ignores non-markdown files and files outside specs/ and changes/', () => {
    expect(classify(['openspec/specs/auth/notes.txt', 'openspec/README.md', 'openspec/project.md'])).toEqual(
      [],
    );
  });
});

describe('illustrative scope', () => {
  test.each([
    'fixtures/level-1/AGENTS.md',
    'examples/app/.cursor/rules/core.mdc',
    'exemplos/AGENTS.md',
    'docs/tutorial/.agents/skills/deploy/SKILL.md',
    'Demo/AGENTS.md',
    'src/__fixtures__/CLAUDE.md',
  ])('%s is illustrative', (file) => {
    expect(byPath([file])[file]?.scope).toBe('illustrative');
  });

  test('matches whole directory names only, and never the file name', () => {
    const docs = byPath(['my-examples/AGENTS.md', 'fixturesque/AGENTS.md', 'AGENTS.md']);
    for (const doc of Object.values(docs)) expect(doc.scope).toBe('operational');
  });
});

describe('non-documents', () => {
  test('are not listed', () => {
    expect(
      classify([
        'README.md',
        'docs/AGENTS.md.bak',
        'NOTAGENTS.md',
        '.cursor/rules/notes.txt',
        'src/index.ts',
        'skills/SKILL.md.orig',
      ]),
    ).toEqual([]);
  });
});

describe('ordering and determinism', () => {
  const files = [
    'packages/b/AGENTS.md',
    '.cursor/rules/core.mdc',
    'AGENTS.md',
    '.agents/skills/deploy/SKILL.md',
    'openspec/specs/a/spec.md',
  ];

  test('lists documents sorted by path', () => {
    const paths = classify(files).map((d) => d.path);
    expect(paths).toEqual([...paths].sort());
  });

  test('same input gives the same output regardless of input order', () => {
    expect(classify([...files].reverse())).toEqual(classify(files));
  });

  test('a path is reported once even when several tools claim it', () => {
    const docs = classify(['.agents/skills/deploy/SKILL.md']);
    expect(docs).toHaveLength(1);
  });
});

describe('scan root inside a tool directory', () => {
  test('recognizes rules when the scan root is the .cursor directory itself', () => {
    const docs = classify(['rules/core.mdc'], '/fake/.cursor');
    expect(docs).toEqual([{ path: 'rules/core.mdc', kind: 'scoped-rule', scope: 'operational' }]);
  });
});

describe('real repository', () => {
  const HERE = path.dirname(fileURLToPath(import.meta.url));
  const REPO_ROOT = path.join(HERE, '..', '..', '..');

  test('root guidance is operational and fixtures are illustrative', () => {
    const docs = byPath(findOperationalDocuments(createScanContext(REPO_ROOT)).map((d) => d.path));
    expect(docs['AGENTS.md']).toMatchObject({ kind: 'context-instruction', scope: 'operational' });
    expect(docs['.agents/skills/pr-release-audit/SKILL.md']).toMatchObject({
      kind: 'skill',
      scope: 'operational',
    });
    expect(docs['fixtures/level-1/AGENTS.md']).toMatchObject({
      kind: 'context-instruction',
      scope: 'illustrative',
    });
  });
});
