import { describe, expect, test } from 'vitest';
import { normalizeFragment } from '../src/references/anchors.js';
import { extractReferences } from '../src/references/extract.js';
import type { SourceArtifactKind } from '../src/references/types.js';

function extract(content: string, path = 'AGENTS.md', kind: SourceArtifactKind = 'context-instruction') {
  return extractReferences({ path, kind, content });
}

function refs(content: string, path?: string, kind?: SourceArtifactKind) {
  return extract(content, path, kind).references;
}

function only(content: string, path?: string, kind?: SourceArtifactKind) {
  const found = refs(content, path, kind);
  expect(found).toHaveLength(1);
  return found[0]!;
}

describe('hyperlinks', () => {
  test('relative file link: canonical record', () => {
    expect(only('See [guide](docs/guide.md) now')).toEqual({
      sourceArtifact: 'AGENTS.md',
      sourceArtifactKind: 'context-instruction',
      position: { line: 1, column: 13 },
      syntax: 'markdown-link',
      form: 'file-path',
      rawText: 'docs/guide.md',
      normalizedTarget: 'docs/guide.md',
      anchor: null,
      alternateTarget: null,
      explicitPath: true,
      operational: false,
      state: 'pending',
      reasonCode: null,
      rule: 'path.file',
      evidence: 'known file extension',
    });
  });

  test('links resolve from the document directory', () => {
    const ref = only('[x](../shared/x.md)', 'packages/api/AGENTS.md');
    expect(ref.normalizedTarget).toBe('packages/shared/x.md');
    expect(ref.alternateTarget).toBeNull();
  });

  test('a leading slash in a link means the repository root', () => {
    expect(only('[x](/docs/x.md)', 'packages/api/AGENTS.md').normalizedTarget).toBe('docs/x.md');
  });

  test('directory links, with and without the trailing slash', () => {
    expect(only('[d](docs/)')).toMatchObject({ form: 'directory-path', rule: 'path.directory' });
    expect(only('[d](docs)')).toMatchObject({
      form: null,
      state: 'ambiguous',
      reasonCode: 'no-type-indicator',
      rule: 'path.untyped',
    });
  });

  test('query string is dropped and percent escapes are decoded', () => {
    expect(only('[a](x.md?raw=1)').normalizedTarget).toBe('x.md');
    expect(only('[a](my%20file.md)').normalizedTarget).toBe('my file.md');
    expect(only('[a](my%20file.md)').rawText).toBe('my%20file.md');
  });

  test('a file without a known extension is ambiguous, not missing', () => {
    expect(only('[m](Makefile)')).toMatchObject({ state: 'ambiguous', reasonCode: 'no-type-indicator' });
  });

  test('empty destination is ambiguous', () => {
    expect(only('[a]()')).toMatchObject({
      state: 'ambiguous',
      reasonCode: 'empty-destination',
      rule: 'target.empty',
    });
  });

  test('repeated targets are kept as independent observations', () => {
    const found = refs('[a](x.md) and [b](x.md)\n[c](x.md)');
    expect(found.map((r) => [r.position.line, r.position.column])).toEqual([
      [1, 5],
      [1, 19],
      [2, 5],
    ]);
  });
});

describe('anchors', () => {
  test('same-document anchor is normalized', () => {
    expect(only('[t](#Instalação)')).toMatchObject({
      form: 'anchor-same-doc',
      normalizedTarget: 'instalação',
      anchor: 'instalação',
      state: 'pending',
      rule: 'anchor.same-document',
    });
  });

  test('percent-encoded and decomposed spellings give the same slug', () => {
    const encoded = only('[t](#instala%C3%A7%C3%A3o)').anchor;
    const decomposed = only(`[t](#${'instalação'.normalize('NFD')})`).anchor;
    expect(encoded).toBe('instalação');
    expect(decomposed).toBe('instalação');
  });

  test('other-document anchor keeps path and slug apart', () => {
    expect(only('[l](docs/api.md#Login)')).toMatchObject({
      form: 'anchor-other-doc',
      normalizedTarget: 'docs/api.md',
      anchor: 'login',
      state: 'pending',
      rule: 'anchor.other-document',
    });
  });

  test('an empty fragment is ignored after a path and ambiguous alone', () => {
    expect(only('[l](docs/api.md#)')).toMatchObject({ form: 'file-path' });
    expect(only('[l](#)')).toMatchObject({ state: 'ambiguous', reasonCode: 'empty-destination' });
  });

  test('HTML anchors are indexed, not extracted as references', () => {
    const result = extract('<a name="login"></a>\n<a id=\'top\'></a>');
    expect(result.references).toEqual([]);
    expect(result.htmlAnchors).toEqual([
      { name: 'login', attribute: 'name', position: { line: 1, column: 10 } },
      { name: 'top', attribute: 'id', position: { line: 2, column: 8 } },
    ]);
  });

  test('normalizeFragment handles malformed escapes', () => {
    expect(normalizeFragment('100%')).toBe('100%');
    expect(normalizeFragment(' Título ')).toBe('título');
  });
});

describe('targets that cannot be checked locally', () => {
  test.each([
    ['[a](https://example.com/x)', 'external-resource', 'target.external'],
    ['[a]($HOME/x.md)', 'variable-dependent', 'target.dynamic'],
    ['[a](../../../x.md)', 'root-escape-attempt', 'target.outside-root'],
    ['`/etc/passwd`', 'inaccessible-local-target', 'target.absolute'],
    ['`$HOME/config.md`', 'variable-dependent', 'target.dynamic'],
    ['`https://example.com/a`', 'external-resource', 'target.external'],
    ['`${DIR}/run.sh`', 'variable-dependent', 'target.dynamic'],
    ['`@ai-sdk/<provider>`', 'variable-dependent', 'target.dynamic'],
    ['`packages/<provider>/src/index.ts`', 'variable-dependent', 'target.dynamic'],
  ])('%s', (source, reason, rule) => {
    expect(only(source)).toMatchObject({ state: 'not-evaluable', reasonCode: reason, rule });
  });
});

describe('inline code', () => {
  test('paths, directories and files in code spans', () => {
    const found = refs('Run `./scripts/run.sh` in `src/components/` and read `README.md`.');
    expect(found.map((r) => [r.rawText, r.form, r.explicitPath])).toEqual([
      ['./scripts/run.sh', 'file-path', true],
      ['src/components/', 'directory-path', true],
      ['README.md', 'file-path', false],
    ]);
    expect(found.map((r) => r.position.column)).toEqual([6, 28, 55]);
  });

  test('a bare name with a known extension is flagged as not explicit', () => {
    expect(only('built with `Next.js`')).toMatchObject({
      form: 'file-path',
      explicitPath: false,
      state: 'pending',
    });
  });

  test.each([
    '`npm run test`',
    '`git status`',
    '`--fast`',
    '`$HOME`',
    '`the build`',
    '`TODO`',
    'plain text with docs/a.md outside code',
  ])('not extracted: %s', (source) => {
    expect(refs(source)).toEqual([]);
  });

  test('trailing punctuation is not part of the path', () => {
    expect(only('see `docs/a.md,`').rawText).toBe('docs/a.md');
  });

  test('globs in text are mentions, not active scopes', () => {
    expect(only('tests live in `src/**/*.test.ts`')).toMatchObject({
      form: 'glob-pattern',
      state: 'not-evaluable',
      reasonCode: 'non-operational-mention',
      rule: 'glob.mention',
      operational: false,
    });
  });

  test.each([
    ['`!src/*.ts`', 'negation'],
    ['`src/*.{ts,js}`', 'brace-expansion'],
    ['`src/[ab].ts`', 'character-class'],
    ['`src\\*.ts`', 'backslash'],
  ])('unsupported glob %s', (source, reason) => {
    expect(only(source)).toMatchObject({
      state: 'not-supported',
      reasonCode: 'unsupported-glob',
      rule: 'glob.unsupported',
      evidence: `glob syntax not supported: ${reason}`,
    });
  });

  test('Windows separators are normalized for plain paths', () => {
    expect(only('`src\\lib\\a.ts`').normalizedTarget).toBe('src/lib/a.ts');
  });

  test.each([
    ['`src/app.ts:42`', 'src/app.ts:42', 'src/app.ts'],
    ['`src/app.ts:42:7`', 'src/app.ts:42:7', 'src/app.ts'],
    ['`app.ts:3`', 'app.ts:3', 'app.ts'],
  ])('a trailing :line is not part of the path: %s', (source, raw, target) => {
    expect(only(source)).toMatchObject({ rawText: raw, normalizedTarget: target, form: 'file-path' });
  });

  test('the :line suffix is only removed after a known extension', () => {
    expect(refs('`localhost:8080`')).toEqual([]);
    expect(only('`https://example.com:8080`')).toMatchObject({
      state: 'not-evaluable',
      reasonCode: 'external-resource',
    });
    expect(only('`docs/notes:12`')).toMatchObject({ normalizedTarget: 'docs/notes:12', state: 'ambiguous' });
  });
});

describe('code blocks', () => {
  const doc = [
    'intro',
    '```bash',
    'cd src/components',
    './scripts/deploy.sh --env=prod',
    'npm test',
    '```',
  ].join('\n');

  test('candidates come with line and column, commands are skipped', () => {
    const found = refs(doc);
    expect(
      found.map((r) => [r.syntax, r.rawText, r.position.line, r.position.column, r.form, r.state]),
    ).toEqual([
      ['code-block', 'src/components', 3, 4, null, 'ambiguous'],
      ['code-block', './scripts/deploy.sh', 4, 1, 'file-path', 'pending'],
    ]);
  });

  test('paths inside JSON strings are found', () => {
    const found = refs('```json\n{ "config": "./config/app.json" }\n```');
    expect(found.map((r) => [r.rawText, r.position.column])).toEqual([['./config/app.json', 14]]);
  });
});

describe('formal fields', () => {
  const rule = [
    '---',
    'description: Core rules',
    'globs: src/**/*.ts, docs/*.md',
    'paths:',
    '  - "lib/**"',
    '---',
    'body',
  ].join('\n');
  const path = '.cursor/rules/core.mdc';

  test('scope fields of a rule give active globs', () => {
    const found = refs(rule, path, 'scoped-rule');
    expect(found.map((r) => [r.rawText, r.position.line, r.position.column])).toEqual([
      ['src/**/*.ts', 3, 8],
      ['docs/*.md', 3, 21],
      ['lib/**', 5, 6],
    ]);
    for (const ref of found) {
      expect(ref).toMatchObject({
        syntax: 'formal-field',
        form: 'glob-pattern',
        state: 'pending',
        operational: true,
        rule: 'glob.scope',
      });
    }
  });

  test('braces keep their commas inside one item', () => {
    const found = refs('---\nglobs: src/*.{ts,js}\n---', path, 'scoped-rule');
    expect(found).toHaveLength(1);
    expect(found[0]).toMatchObject({ state: 'not-supported', evidence: expect.stringContaining('brace') });
  });

  test('only rules read these fields', () => {
    expect(refs(rule, 'SKILL.md', 'skill')).toEqual([]);
    expect(refs(rule, 'AGENTS.md', 'context-instruction')).toEqual([]);
  });

  test('a directory in a scope field is a directory', () => {
    expect(only('---\npaths: src/\n---', path, 'scoped-rule')).toMatchObject({
      form: 'directory-path',
      operational: false,
    });
  });
});

describe('documents in subdirectories', () => {
  test('code paths keep both readings', () => {
    expect(only('`src/x.ts`', 'packages/api/AGENTS.md')).toMatchObject({
      normalizedTarget: 'src/x.ts',
      alternateTarget: 'packages/api/src/x.ts',
    });
  });

  test('no alternate at the root or when both readings agree', () => {
    expect(only('`src/x.ts`').alternateTarget).toBeNull();
    expect(only('`/etc/x`', 'packages/api/AGENTS.md').alternateTarget).toBeNull();
  });
});

describe('positions and determinism', () => {
  const doc = '[a](one.md)\n\n`two.md` ação 📚 [b](three.md)';

  test('CRLF, CR and LF give the same references', () => {
    const expected = refs(doc);
    expect(refs(doc.replaceAll('\n', '\r\n'))).toEqual(expected);
    expect(refs(doc.replaceAll('\n', '\r'))).toEqual(expected);
  });

  test('columns count code points', () => {
    const found = refs(doc);
    expect(found.map((r) => [r.rawText, r.position.line, r.position.column])).toEqual([
      ['one.md', 1, 5],
      ['two.md', 3, 2],
      ['three.md', 3, 21],
    ]);
  });

  test('output is ordered by position and repeatable', () => {
    const found = refs(doc);
    expect(found).toEqual(refs(doc));
    const positions = found.map((r) => [r.position.line, r.position.column]);
    expect(positions).toEqual([...positions].sort((a, b) => a[0]! - b[0]! || a[1]! - b[1]!));
  });

  test('a document without references gives empty results', () => {
    expect(extract('Just prose, no links.')).toEqual({ references: [], htmlAnchors: [] });
    expect(extract('')).toEqual({ references: [], htmlAnchors: [] });
  });
});

describe('edge cases of extraction', () => {
  test('quoted items in a scope field are unquoted', () => {
    const found = refs(
      '---\nglobs: src/*.ts, "lib/*.ts", \'docs/*.md\'\n---',
      '.cursor/rules/a.mdc',
      'scoped-rule',
    );
    expect(found.map((r) => [r.rawText, r.position.line, r.position.column])).toEqual([
      ['src/*.ts', 2, 8],
      ['lib/*.ts', 2, 19],
      ['docs/*.md', 2, 31],
    ]);
  });

  test('a malformed percent escape in a link is kept as written', () => {
    expect(only('[a](docs/100%zz.md)')).toMatchObject({
      form: 'file-path',
      normalizedTarget: 'docs/100%zz.md',
    });
  });

  test('a link with only a query has an empty destination', () => {
    expect(only('[a](?tab=1)')).toMatchObject({
      state: 'ambiguous',
      rule: 'target.empty',
      reasonCode: 'empty-destination',
    });
  });
});
