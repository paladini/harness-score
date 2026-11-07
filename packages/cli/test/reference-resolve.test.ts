import { describe, expect, test } from 'vitest';
import { extractReferences } from '../src/references/extract.js';
import { createResolver } from '../src/references/resolve.js';
import type { SourceArtifactKind } from '../src/references/types.js';
import type { ScanIncompleteReason } from '../src/types.js';
import { fakeContext } from './helpers.js';

const BASE_FILES: Record<string, string> = {
  'README.md': '',
  'docs/api.md': '# API\n\n## Login\n',
  'docs/guide.md': '',
  'src/index.ts': '',
  'src/components/Button.tsx': '',
  'lib.js/index.js': '',
};

interface Options {
  path?: string;
  kind?: SourceArtifactKind;
  incomplete?: ScanIncompleteReason[];
}

function resolveAll(content: string, files: Record<string, string> = BASE_FILES, options: Options = {}) {
  const ctx = { ...fakeContext(files), incompleteReasons: options.incomplete };
  const resolve = createResolver(ctx);
  const { references } = extractReferences({
    path: options.path ?? 'AGENTS.md',
    kind: options.kind ?? 'context-instruction',
    content,
  });
  return references.map(resolve);
}

function one(content: string, files?: Record<string, string>, options?: Options) {
  const found = resolveAll(content, files, options);
  expect(found).toHaveLength(1);
  return found[0]!;
}

describe('files and directories', () => {
  test('an existing file is consistent', () => {
    expect(one('[a](docs/guide.md)')).toMatchObject({
      state: 'consistent',
      rule: 'path.file-found',
      evidence: 'file docs/guide.md exists',
      reasonCode: null,
    });
  });

  test('a missing file is inconsistent', () => {
    expect(one('[a](docs/nope.md)')).toMatchObject({
      state: 'inconsistent',
      reasonCode: 'target-missing',
      rule: 'path.file-missing',
    });
  });

  test('directories, present and missing', () => {
    expect(one('[a](docs/)')).toMatchObject({ state: 'consistent', rule: 'path.directory-found' });
    expect(one('[a](nope/)')).toMatchObject({
      state: 'inconsistent',
      reasonCode: 'target-missing',
      rule: 'path.directory-missing',
    });
  });

  test('the repository root exists', () => {
    expect(one('[a](./)')).toMatchObject({
      state: 'consistent',
      evidence: 'directory the repository root exists',
    });
  });

  test('a file cited as a directory, and the reverse, is a type mismatch', () => {
    expect(one('[a](docs/guide.md/)')).toMatchObject({
      state: 'inconsistent',
      reasonCode: 'type-mismatch',
      rule: 'path.type-mismatch',
    });
    expect(one('[a](lib.js)')).toMatchObject({
      state: 'inconsistent',
      reasonCode: 'type-mismatch',
    });
  });

  test('a path with no type indicator stays ambiguous, with the index as evidence', () => {
    expect(one('[a](src)')).toMatchObject({
      state: 'ambiguous',
      reasonCode: 'no-type-indicator',
    });
    expect(one('[a](src)').evidence).toContain('the path exists as a directory');
    expect(one('[a](nothing/here)').evidence).not.toContain('exists');
  });
});

describe('file:line references in code', () => {
  test('the file is checked without its line suffix', () => {
    expect(one('`src/index.ts:12`')).toMatchObject({ state: 'consistent', rawText: 'src/index.ts:12' });
    expect(one('`src/nope.ts:3:1`')).toMatchObject({ state: 'inconsistent', reasonCode: 'target-missing' });
  });
});

describe('bare names', () => {
  test('found at the root: consistent', () => {
    expect(one('`README.md`')).toMatchObject({ state: 'consistent', explicitPath: false });
  });

  test('not found: ambiguous, never inconsistent', () => {
    expect(one('built with `Next.js`')).toMatchObject({
      state: 'ambiguous',
      reasonCode: 'bare-name-not-found',
      rule: 'path.bare-name-missing',
    });
  });

  test('an explicit path that is missing is inconsistent', () => {
    expect(one('`docs/x.md`')).toMatchObject({ state: 'inconsistent', reasonCode: 'target-missing' });
  });
});

describe('documents in subdirectories', () => {
  const files = { 'packages/api/src/x.ts': '', 'README.md': '' };

  test('the reading relative to the document counts', () => {
    expect(one('`src/x.ts`', files, { path: 'packages/api/AGENTS.md' })).toMatchObject({
      state: 'consistent',
      evidence: 'file packages/api/src/x.ts exists relative to the document',
    });
  });

  test('the root reading is tried first', () => {
    expect(one('`README.md`', files, { path: 'packages/api/AGENTS.md' }).evidence).toBe(
      'file README.md exists',
    );
  });

  test('when neither exists the evidence names both', () => {
    expect(one('`src/y.ts`', files, { path: 'packages/api/AGENTS.md' }).evidence).toBe(
      'no file at src/y.ts or packages/api/src/y.ts',
    );
  });
});

describe('globs', () => {
  const rule = (globs: string) => `---\nglobs: ${globs}\n---\n`;
  const options: Options = { path: '.cursor/rules/core.mdc', kind: 'scoped-rule' };

  test('a scope glob with a match is consistent', () => {
    expect(one(rule('src/**/*.ts'), BASE_FILES, options)).toMatchObject({
      state: 'consistent',
      rule: 'glob.matched',
      operational: true,
    });
    expect(one(rule('src/**/*.ts'), BASE_FILES, options).evidence).toMatch(/^\d+ matching file/);
  });

  test('a scope glob with no match is inconsistent', () => {
    expect(one(rule('lib/**'), BASE_FILES, options)).toMatchObject({
      state: 'inconsistent',
      reasonCode: 'glob-no-match',
      rule: 'glob.no-match',
    });
  });

  test('globs mentioned in text are not checked', () => {
    expect(one('`nothing/**/*.zz`')).toMatchObject({
      state: 'not-evaluable',
      reasonCode: 'non-operational-mention',
      rule: 'glob.mention',
    });
  });
});

describe('states decided at extraction are kept', () => {
  test.each([
    ['[a](https://example.com/x)', 'not-evaluable', 'target.external'],
    ['[a]($HOME/x.md)', 'not-evaluable', 'target.dynamic'],
    ['`!src/*.ts`', 'not-supported', 'glob.unsupported'],
    ['[a]()', 'ambiguous', 'target.empty'],
  ])('%s', (source, state, rule) => {
    expect(one(source)).toMatchObject({ state, rule });
  });
});

describe('anchors', () => {
  test('anchors are verified against the document headings', () => {
    expect(one('[a](docs/api.md#login)')).toMatchObject({ state: 'consistent', rule: 'anchor.found' });
    expect(one('[a](docs/api.md#nope)')).toMatchObject({
      state: 'inconsistent',
      reasonCode: 'anchor-missing',
    });
    expect(one('[a](docs/none.md#x)')).toMatchObject({
      state: 'inconsistent',
      reasonCode: 'document-missing',
    });
  });

  test('a missing document is not a defect when the scan may have missed it', () => {
    expect(
      one('[a](docs/none.md#x)', BASE_FILES, { incomplete: [{ code: 'file-count-limit' }] }),
    ).toMatchObject({
      state: 'not-evaluable',
      reasonCode: 'incomplete-scan',
    });
  });
});

describe('incomplete scans', () => {
  const global: ScanIncompleteReason[] = [{ code: 'file-count-limit' }];
  const deep: ScanIncompleteReason[] = [{ code: 'depth-limit', path: 'vendor/deep', limit: 3 }];

  test('a target that is found still counts', () => {
    expect(one('[a](docs/guide.md)', BASE_FILES, { incomplete: global }).state).toBe('consistent');
  });

  test('a missing target is not evaluable when the limit has no location', () => {
    expect(one('[a](docs/nope.md)', BASE_FILES, { incomplete: global })).toMatchObject({
      state: 'not-evaluable',
      reasonCode: 'incomplete-scan',
      rule: 'scan.incomplete',
    });
    expect(one('`Next.js`', BASE_FILES, { incomplete: global }).state).toBe('not-evaluable');
  });

  test('a missing glob match is not evaluable either', () => {
    expect(
      one('---\nglobs: lib/**\n---\n', BASE_FILES, {
        path: '.cursor/rules/core.mdc',
        kind: 'scoped-rule',
        incomplete: global,
      }).state,
    ).toBe('not-evaluable');
  });

  test('only targets that overlap the unscanned path are affected', () => {
    const inside = one('[a](vendor/deep/x.md)', BASE_FILES, { incomplete: deep });
    const ancestor = one('[a](vendor/)', BASE_FILES, { incomplete: deep });
    const elsewhere = one('[a](docs/nope.md)', BASE_FILES, { incomplete: deep });
    expect(inside.state).toBe('not-evaluable');
    expect(ancestor.state).toBe('not-evaluable');
    expect(elsewhere.state).toBe('inconsistent');
  });

  test('a glob is judged by its literal prefix', () => {
    const options = { path: '.cursor/rules/core.mdc', kind: 'scoped-rule' as const, incomplete: deep };
    expect(one('---\nglobs: vendor/**/*.md\n---\n', BASE_FILES, options).state).toBe('not-evaluable');
    expect(one('---\nglobs: docs/**/*.zz\n---\n', BASE_FILES, options).state).toBe('inconsistent');
  });
});

describe('Unicode in the index', () => {
  const decomposed = { [`docs/${'ação'.normalize('NFD')}.md`]: '', 'README.md': '' };

  test('a decomposed file name matches the composed reference, and the evidence says so', () => {
    const ref = one(`[a](docs/${'ação'.normalize('NFC')}.md)`, decomposed);
    expect(ref.state).toBe('consistent');
    expect(ref.evidence).toContain('after Unicode normalization');
  });

  test('globs and directories work on the normalized index too', () => {
    expect(one('[a](docs/)', decomposed).state).toBe('consistent');
    expect(
      one('---\nglobs: docs/*.md\n---\n', decomposed, { path: '.cursor/rules/core.mdc', kind: 'scoped-rule' })
        .state,
    ).toBe('consistent');
  });

  test('a composed index needs no normalization note', () => {
    expect(one('[a](docs/guide.md)').evidence).not.toContain('Unicode');
  });
});

describe('root containment', () => {
  test('no lookup ever receives a path outside the root', () => {
    const calls: string[] = [];
    const inner = fakeContext(BASE_FILES);
    const record = <T>(path: string, answer: T): T => {
      calls.push(path);
      return answer;
    };
    const spy = {
      files: inner.files,
      incompleteReasons: undefined,
      has: (p: string) => record(p, inner.has(p)),
      hasDirectory: (p: string) => record(p, inner.hasDirectory(p)),
      read: (p: string) => record(p, inner.read(p)),
      matchingGlob: (p: string) => record(p, inner.matchingGlob(p)),
    };
    const resolve = createResolver(spy);
    const { references } = extractReferences({
      path: 'docs/AGENTS.md',
      kind: 'context-instruction',
      content:
        '[a](../../../etc/passwd) `../../secret.md` [b](/etc/x) `C:\\Users\\me\\a.md` [c](../README.md)',
    });
    const states = references.map((r) => resolve(r).state);
    expect(states).toContain('not-evaluable');
    for (const call of calls) {
      expect(call.split('/')).not.toContain('..');
      expect(call.startsWith('/')).toBe(false);
    }
  });
});

describe('every reference ends in one of the five states', () => {
  const doc = [
    '[a](docs/guide.md) [b](nope.md) [c](https://x.y) [d](#top) [e](docs/api.md#login)',
    '`src/index.ts` `Next.js` `$HOME/x.md` `src/**/*.ts` `!x/*.ts` [f]()',
    '```sh',
    'cat docs/guide.md missing/dir/',
    '```',
  ].join('\n');

  test('no pending state is left', () => {
    const allowed = ['consistent', 'inconsistent', 'not-evaluable', 'not-supported', 'ambiguous'];
    const found = resolveAll(doc);
    expect(found.length).toBeGreaterThan(8);
    for (const ref of found) expect(allowed).toContain(ref.state);
  });

  test('resolving twice gives the same records', () => {
    expect(resolveAll(doc)).toEqual(resolveAll(doc));
  });

  test('a context without directory and glob lookups gives the same records', () => {
    const { hasDirectory: _d, matchingGlob: _g, ...minimal } = fakeContext(BASE_FILES);
    const { references } = extractReferences({
      path: 'AGENTS.md',
      kind: 'context-instruction',
      content: doc,
    });
    expect(references.map(createResolver(minimal))).toEqual(resolveAll(doc));
  });
});
