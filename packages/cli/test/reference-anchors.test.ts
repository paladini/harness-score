import { describe, expect, test } from 'vitest';
import {
  assignAnchorNames,
  createAnchorVerifier,
  documentAnchors,
  foldAccents,
  headingPlainText,
  slugifyHeading,
} from '../src/references/anchors.js';
import { extractReferences } from '../src/references/extract.js';
import { fakeContext } from './helpers.js';

describe('slugifyHeading', () => {
  test.each([
    ['Configuração local', 'configuração-local'],
    ['Hello, World!', 'hello-world'],
    ["What's new?", 'whats-new'],
    ['API v2.0 (beta)', 'api-v20-beta'],
    ['snake_case name', 'snake_case-name'],
    ['`npm test` command', 'npm-test-command'],
    ['[Guide](docs/g.md) intro', 'guide-intro'],
    ['![logo](a.png) Brand', 'logo-brand'],
    ['**Bold** and _italic_ text', 'bold-and-italic-text'],
    ['A - B', 'a---b'],
    ['Emoji 🎉 time', 'emoji--time'],
    ['日本語 見出し', '日本語-見出し'],
    ['<b>Tagged</b> title', 'tagged-title'],
    ['  padded  ', 'padded'],
  ])('%j -> %j', (heading, slug) => {
    expect(slugifyHeading(heading)).toBe(slug);
  });

  test('composed and decomposed accents give the same slug', () => {
    expect(slugifyHeading('Instalação'.normalize('NFD'))).toBe(slugifyHeading('Instalação'.normalize('NFC')));
  });

  test('headingPlainText reduces inline Markdown to words', () => {
    expect(headingPlainText('See [the guide](x.md) and `code`')).toBe('See the guide and code');
  });

  test('foldAccents removes diacritics only', () => {
    expect(foldAccents('configuração')).toBe('configuracao');
    expect(foldAccents('plain')).toBe('plain');
  });
});

describe('repeated headings', () => {
  test('later repeats get -1, -2, ... in order', () => {
    expect(assignAnchorNames(['Setup', 'Usage', 'Setup', 'Setup'])).toEqual([
      'setup',
      'usage',
      'setup-1',
      'setup-2',
    ]);
  });

  test('a heading that already looks like a numbered repeat does not collide', () => {
    expect(assignAnchorNames(['x', 'x', 'x-1'])).toEqual(['x', 'x-1', 'x-1-1']);
  });

  test('headings with no usable text are skipped', () => {
    expect(assignAnchorNames(['🎉', 'Real'])).toEqual(['real']);
  });
});

describe('documentAnchors', () => {
  const doc = [
    '# Guide',
    '',
    '## Configuração local',
    '',
    '```',
    '# not a heading',
    '```',
    '',
    'Setup',
    '-----',
    '',
    '<a name="Legacy-Anchor"></a>',
  ].join('\n');

  test('collects headings (ATX and setext) and HTML anchor names', () => {
    const anchors = documentAnchors(doc);
    expect([...anchors.headings]).toEqual(['guide', 'configuração-local', 'setup']);
    expect([...anchors.foldedHeadings]).toEqual(['guide', 'configuracao-local', 'setup']);
    expect([...anchors.htmlNames]).toEqual(['legacy-anchor']);
  });
});

describe('anchor verification', () => {
  const files = {
    'AGENTS.md': '# Guide\n\n## Configuração local\n\n## Setup\n\n## Setup\n',
    'docs/api.md': '# API\n\n## Login\n\n<a name="legacy"></a>\n',
    'src/a.ts': 'export {};\n',
  };
  const ctx = fakeContext(files);
  const verify = createAnchorVerifier(ctx);

  function verdictOf(link: string) {
    const [reference] = extractReferences({
      path: 'AGENTS.md',
      kind: 'context-instruction',
      content: link,
    }).references;
    return verify(reference!);
  }

  test('same-document anchor that exists', () => {
    expect(verdictOf('[a](#configuração-local)')).toEqual({
      state: 'consistent',
      reasonCode: null,
      rule: 'anchor.found',
      evidence: 'heading anchor "configuração-local" found in AGENTS.md',
    });
  });

  test('accent-insensitive match is reported as such', () => {
    const verdict = verdictOf('[a](#configuracao-local)');
    expect(verdict.state).toBe('consistent');
    expect(verdict.evidence).toContain('after removing accents');
  });

  test('other-document anchor that exists', () => {
    expect(verdictOf('[a](docs/api.md#Login)')).toMatchObject({
      state: 'consistent',
      rule: 'anchor.found',
    });
  });

  test('missing document: absence of file', () => {
    expect(verdictOf('[a](docs/ausente.md#secao)')).toMatchObject({
      state: 'inconsistent',
      reasonCode: 'document-missing',
      rule: 'anchor.document-missing',
    });
  });

  test('existing document without the heading: absence of section', () => {
    expect(verdictOf('[a](docs/api.md#secao-inexistente)')).toMatchObject({
      state: 'inconsistent',
      reasonCode: 'anchor-missing',
      rule: 'anchor.missing',
    });
  });

  test('same-document anchor that does not exist', () => {
    expect(verdictOf('[a](#nope)')).toMatchObject({ state: 'inconsistent', reasonCode: 'anchor-missing' });
  });

  test('HTML anchor is not supported, never inconsistent', () => {
    expect(verdictOf('[a](docs/api.md#legacy)')).toMatchObject({
      state: 'not-supported',
      reasonCode: 'html-anchor',
      rule: 'anchor.html',
    });
  });

  test('a target that is not Markdown is not supported', () => {
    expect(verdictOf('[a](src/a.ts#L10)')).toMatchObject({
      state: 'not-supported',
      reasonCode: 'non-markdown-anchor',
    });
  });

  test('repeated headings: both anchors resolve', () => {
    expect(verdictOf('[a](#setup)').state).toBe('consistent');
    expect(verdictOf('[a](#setup-1)').state).toBe('consistent');
    expect(verdictOf('[a](#setup-2)').state).toBe('inconsistent');
  });

  test('a document that exists but cannot be read is not evaluable', () => {
    const unreadable = createAnchorVerifier({ has: () => true, read: () => null });
    const [reference] = extractReferences({
      path: 'AGENTS.md',
      kind: 'context-instruction',
      content: '[a](docs/api.md#login)',
    }).references;
    expect(unreadable(reference!)).toMatchObject({
      state: 'not-evaluable',
      reasonCode: 'inaccessible-local-target',
    });
  });

  test('each document is read and analysed once', () => {
    let reads = 0;
    const counting = createAnchorVerifier({
      has: (p) => ctx.has(p),
      read: (p) => {
        reads++;
        return ctx.read(p);
      },
    });
    const { references } = extractReferences({
      path: 'AGENTS.md',
      kind: 'context-instruction',
      content: '[a](docs/api.md#login) [b](docs/api.md#legacy) [c](#setup) [d](#setup-1)',
    });
    for (const reference of references) counting(reference);
    expect(reads).toBe(2);
  });

  test('non-anchor references are rejected', () => {
    const [reference] = extractReferences({
      path: 'AGENTS.md',
      kind: 'context-instruction',
      content: '[a](docs/api.md)',
    }).references;
    expect(() => verify(reference!)).toThrow(TypeError);
  });

  test('verdicts are deterministic', () => {
    expect(verdictOf('[a](docs/api.md#login)')).toEqual(verdictOf('[a](docs/api.md#login)'));
  });
});

describe('a fragment missing from the headings', () => {
  const html = [
    '# Doc',
    '',
    '<a name="by-name"></a>',
    '<a id="by-id"></a>',
    '<span id="by-span">x</span>',
    '<div id="by-div"></div>',
    '<a data-id="by-data"></a>',
  ].join('\n');
  const files = { 'AGENTS.md': `${html}\n`, 'docs/html.md': `${html}\n` };
  const verify = createAnchorVerifier(fakeContext(files));

  function verdictOf(link: string) {
    const [reference] = extractReferences({
      path: 'AGENTS.md',
      kind: 'context-instruction',
      content: link,
    }).references;
    return verify(reference!);
  }

  const notSupported = { state: 'not-supported', reasonCode: 'html-anchor', rule: 'anchor.html' };
  const missing = { state: 'inconsistent', reasonCode: 'anchor-missing', rule: 'anchor.missing' };

  test.each([
    ['[a](docs/html.md#by-name)', 'declared by <a name> in another document'],
    ['[a](docs/html.md#by-id)', 'declared by <a id> in another document'],
    ['[a](#by-name)', 'declared by <a name> in the same document'],
    ['[a](#by-id)', 'declared by <a id> in the same document'],
  ])('%s is not supported (%s)', (link) => {
    expect(verdictOf(link)).toMatchObject(notSupported);
  });

  test.each([
    ['[a](docs/html.md#by-span)', 'declared only by <span id> in another document'],
    ['[a](#by-span)', 'declared only by <span id> in the same document'],
    ['[a](docs/html.md#by-div)', 'declared only by <div id>'],
    ['[a](docs/html.md#by-data)', 'an <a> attribute that only ends in id'],
    ['[a](docs/html.md#nowhere)', 'declared nowhere, in a file with HTML anchors'],
    ['[a](#nowhere)', 'declared nowhere, in the same document with HTML anchors'],
  ])('%s is inconsistent (%s)', (link) => {
    expect(verdictOf(link)).toMatchObject(missing);
  });

  test('a heading still wins over an HTML anchor of the same name', () => {
    const both = createAnchorVerifier(fakeContext({ 'docs/a.md': '# Doc\n\n<a name="doc"></a>\n' }));
    const [reference] = extractReferences({
      path: 'AGENTS.md',
      kind: 'context-instruction',
      content: '[a](docs/a.md#doc)',
    }).references;
    expect(both(reference!)).toMatchObject({ state: 'consistent', rule: 'anchor.found' });
  });
});
