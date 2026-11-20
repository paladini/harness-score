import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, describe, expect, test } from 'vitest';
import { score } from '../dist/index.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const CLI = path.join(here, '..', 'dist', 'cli.js');
const FIXTURES = path.join(here, '..', '..', '..', 'fixtures');

const tmpDirs: string[] = [];
afterAll(() => {
  for (const dir of tmpDirs) fs.rmSync(dir, { recursive: true, force: true });
});

function run(args: string[]) {
  return spawnSync(process.execPath, [CLI, ...args], { encoding: 'utf8' });
}

function makeRepo(files: Record<string, string>, parent?: string): string {
  const base = parent ?? fs.mkdtempSync(path.join(os.tmpdir(), 'hs-references-'));
  if (!parent) tmpDirs.push(base);
  const root = parent ? path.join(parent, 'repo') : base;
  for (const [rel, content] of Object.entries(files)) {
    const abs = path.join(root, rel);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, content);
  }
  return root;
}

const REPO = {
  'AGENTS.md': [
    '# Guide',
    'See [guide](docs/guide.md), [missing](docs/missing.md#x) and [web](https://example.com).',
    'Read `src/index.ts` and `src/gone.ts`.',
  ].join('\n'),
  'docs/guide.md': '# Guide\n',
  'src/index.ts': 'export {};\n',
};

function json(args: string[]) {
  const result = run([...args, '--json']);
  expect(result.status).toBe(0);
  return JSON.parse(result.stdout);
}

describe('--references: compatibility', () => {
  const root = makeRepo(REPO);

  test('without the flag there is no references field and no section', () => {
    expect(json([root])).not.toHaveProperty('references');
    expect(run([root]).stdout).not.toContain('References (informational');
  });

  test.each([
    ['fixture level-3', path.join(FIXTURES, 'level-3')],
    ['temporary repository', root],
  ])('everything else in the JSON report is identical (%s)', (_name, target) => {
    const { references, ...withFlag } = json([target, '--references']);
    expect(references).toBeDefined();
    expect(withFlag).toEqual(json([target]));
  });

  test('the section is the last key of the report', () => {
    const keys = Object.keys(json([root, '--references']));
    expect(keys[keys.length - 1]).toBe('references');
  });

  test.each([
    ['level-1', '3', 1],
    ['level-4', '4', 0],
  ])('the exit code of --min-level does not change (%s)', (fixture, minLevel, expected) => {
    const target = path.join(FIXTURES, fixture);
    expect(run([target, '--min-level', minLevel, '--quiet']).status).toBe(expected);
    expect(run([target, '--min-level', minLevel, '--quiet', '--references']).status).toBe(expected);
  });

  test('inconsistent references never fail the command or lower the level', () => {
    const without = json([root]);
    const withFlag = json([root, '--references']);
    expect(withFlag.references.summary.byState.inconsistent).toBeGreaterThan(0);
    expect(withFlag.level).toEqual(without.level);
    expect(withFlag.score).toEqual(without.score);
    expect(run([root, '--references', '--min-level', String(without.level.index), '--quiet']).status).toBe(0);
  });

  test('--help documents the flag', () => {
    expect(run(['--help']).stdout).toContain('--references');
  });
});

describe('--references: JSON', () => {
  const root = makeRepo(REPO);
  const references = json([root, '--references']).references;

  test('summary', () => {
    expect(references.summary).toEqual({
      operationalDocuments: 1,
      skippedDocuments: 0,
      unreadableDocuments: 0,
      occurrences: 5,
      byState: {
        consistent: 2,
        inconsistent: 1,
        'not-evaluable': 1,
        'not-supported': 0,
        ambiguous: 1,
      },
      byReason: { 'document-missing': 1, 'external-resource': 1, 'operational-purpose-unknown': 1 },
      scanComplete: true,
    });
  });

  test('every occurrence carries the full record', () => {
    const missing = references.occurrences.find((o: { rawText: string }) => o.rawText === 'src/gone.ts');
    expect(missing).toMatchObject({
      sourceArtifact: 'AGENTS.md',
      sourceArtifactKind: 'context-instruction',
      position: { line: 3, column: 26 },
      syntax: 'inline-code',
      form: 'file-path',
      normalizedTarget: 'src/gone.ts',
      state: 'ambiguous',
      reasonCode: 'operational-purpose-unknown',
      rule: 'path.code-missing',
    });
    expect(typeof missing.evidence).toBe('string');
  });

  test('occurrences keep document and position order', () => {
    const positions = references.occurrences.map((o: { position: { line: number; column: number } }) => [
      o.position.line,
      o.position.column,
    ]);
    expect(positions).toEqual([...positions].sort((a, b) => a[0] - b[0] || a[1] - b[1]));
  });

  test('two runs give identical output', () => {
    expect(run([root, '--references', '--json']).stdout).toBe(run([root, '--references', '--json']).stdout);
  });

  test('--diff keeps working and the references travel with the current report', () => {
    const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'hs-baseline-'));
    tmpDirs.push(scratch);
    const baseline = path.join(scratch, 'baseline.json');
    fs.writeFileSync(baseline, JSON.stringify(json([root])));
    const result = run([root, '--references', '--diff', baseline, '--json']);
    expect(result.status).toBe(0);
    const payload = JSON.parse(result.stdout);
    expect(payload.current.references.summary.occurrences).toBe(5);
    expect(payload.diff).toBeDefined();
  });
});

describe('--references: terminal and Markdown', () => {
  const root = makeRepo(REPO);

  test('terminal section: informational, with positions and evidence', () => {
    const { stdout } = run([root, '--references']);
    expect(stdout).toContain('References (informational, not part of the score)');
    expect(stdout).toContain('1 operational documents · 5 references · 0 documents skipped');
    expect(stdout).toContain(
      'consistent 2 · inconsistent 1 · not evaluable 1 · not supported 0 · ambiguous 1',
    );
    expect(stdout).toContain('AGENTS.md:2:39 docs/missing.md#x');
    expect(stdout).toContain('document docs/missing.md does not exist');
    expect(stdout).toContain('not evaluable / external-resource: 1');
    expect(stdout).toContain('ambiguous / operational-purpose-unknown: 1');
  });

  test('the section comes after the usual report', () => {
    const { stdout } = run([root, '--references']);
    expect(stdout.indexOf('References (informational')).toBeGreaterThan(stdout.indexOf('harness-score v'));
  });

  test('--quiet hides the section', () => {
    expect(run([root, '--references', '--quiet']).stdout).toBe('');
  });

  test('Markdown report', () => {
    const { stdout } = run([root, '--references', '--md', '-', '--quiet']);
    expect(stdout).toContain('## References');
    expect(stdout).toContain('### Inconsistent');
    expect(stdout).toContain('`AGENTS.md:2:39` `docs/missing.md#x`');
  });

  test('a repository without operational documents reports zeros', () => {
    const empty = makeRepo({ 'README.md': '# Nothing here\n' });
    const references = json([empty, '--references']).references;
    expect(references.summary.operationalDocuments).toBe(0);
    expect(references.summary.occurrences).toBe(0);
    expect(run([empty, '--references']).stdout).toContain('0 operational documents · 0 references');
  });

  test('long lists are cut in the terminal but complete in JSON', () => {
    const links = Array.from({ length: 60 }, (_, i) => `[a](missing/n${i}.md)`).join('\n');
    const many = makeRepo({ 'AGENTS.md': links });
    expect(run([many, '--references']).stdout).toContain('and 10 more (use --json for the full list)');
    expect(json([many, '--references']).references.summary.byState.inconsistent).toBe(60);
  });
});

describe('--references: scope', () => {
  test('fixtures and archived specs are listed, not checked', () => {
    const root = makeRepo({
      'AGENTS.md': '[ok](README.md)',
      'README.md': '# readme\n',
      'fixtures/demo/AGENTS.md': '[nope](nope.md)',
      'openspec/changes/archive/old/proposal.md': '[nope](nope.md)',
    });
    const { references } = json([root, '--references']);
    expect(references.summary.skippedDocuments).toBe(2);
    expect(references.summary.byState.inconsistent).toBe(0);
    expect(references.skipped.map((d: { scope: string }) => d.scope).sort()).toEqual([
      'archived',
      'illustrative',
    ]);
  });

  test('a path above the root is never followed', () => {
    const parent = fs.mkdtempSync(path.join(os.tmpdir(), 'hs-outside-'));
    tmpDirs.push(parent);
    fs.writeFileSync(path.join(parent, 'outside.md'), '# outside\n');
    const root = makeRepo({ 'AGENTS.md': '[o](../outside.md) and `../../etc/hosts`' }, parent);
    const { references } = json([root, '--references']);
    expect(references.occurrences).toHaveLength(2);
    for (const occurrence of references.occurrences) {
      expect(occurrence.state).toBe('not-evaluable');
      expect(occurrence.reasonCode).toBe('root-escape-attempt');
    }
  });
});

describe('--references: programmatic API', () => {
  const root = makeRepo(REPO);

  test('score() adds the field only when asked', () => {
    expect('references' in score(root)).toBe(false);
    expect(score(root, { references: true }).references?.summary.occurrences).toBe(5);
  });

  test('the level, score and checks are the same either way', () => {
    const { references: _references, ...withReferences } = score(root, { references: true });
    expect(withReferences).toEqual(score(root));
  });
});

describe('--references: specifications', () => {
  test('a repository without OpenSpec says so', () => {
    const root = makeRepo(REPO);
    expect(json([root, '--references']).references.specifications.structure.status).toBe('not-identified');
    expect(run([root, '--references']).stdout).toContain('Specifications: no OpenSpec structure found');
  });

  test('an OpenSpec structure is reported with its three properties', () => {
    const root = makeRepo({
      'README.md': '# readme\n',
      'openspec/specs/auth/spec.md': '# Auth\n\nThe system SHALL let users log in.\n',
      'openspec/changes/add-login/proposal.md': '# Add login\n',
      'openspec/changes/archive/old/proposal.md': '# Old\n\nDone.\n',
    });
    const { specifications } = json([root, '--references']).references;
    expect(specifications.structure).toEqual({
      status: 'identified',
      convention: 'openspec',
      parts: { specs: 1, activeChanges: 1, archivedChanges: 1 },
    });
    expect(specifications.properties.minimumContent).toEqual({
      sufficient: 1,
      empty: 0,
      insufficient: 1,
      unreadable: 0,
    });
    const { stdout } = run([root, '--references']);
    expect(stdout).toContain(
      'Specifications (OpenSpec): 1 spec documents · 1 active changes · 1 archived changes',
    );
    expect(stdout).toContain('minimum content: sufficient 1 · insufficient 1 · empty 0');
    expect(run([root, '--references', '--md', '-', '--quiet']).stdout).toContain('### Specifications');
  });
});
