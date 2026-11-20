import { describe, expect, test } from 'vitest';
import { type MarkdownNode, positionWithin, scanMarkdown } from '../src/references/markdown.js';

function links(content: string) {
  return scanMarkdown(content)
    .filter((n): n is Extract<MarkdownNode, { type: 'link' }> => n.type === 'link')
    .map((n) => ({
      syntax: n.syntax,
      text: n.destination.text,
      line: n.destination.position.line,
      column: n.destination.position.column,
    }));
}

function inlineCode(content: string) {
  return scanMarkdown(content)
    .filter((n): n is Extract<MarkdownNode, { type: 'inline-code' }> => n.type === 'inline-code')
    .map((n) => ({
      text: n.content.text,
      line: n.content.position.line,
      column: n.content.position.column,
    }));
}

function blocks(content: string) {
  return scanMarkdown(content).filter(
    (n): n is Extract<MarkdownNode, { type: 'code-block' }> => n.type === 'code-block',
  );
}

function fields(content: string) {
  return scanMarkdown(content)
    .filter((n): n is Extract<MarkdownNode, { type: 'frontmatter-field' }> => n.type === 'frontmatter-field')
    .map((n) => ({
      key: n.key,
      values: n.values.map((v) => ({
        text: v.text,
        line: v.position.line,
        column: v.position.column,
      })),
    }));
}

describe('hyperlinks', () => {
  test('inline link: destination text and position', () => {
    expect(links('See [guide](docs/guide.md) now')).toEqual([
      { syntax: 'inline', text: 'docs/guide.md', line: 1, column: 13 },
    ]);
  });

  test('title is not part of the destination', () => {
    expect(links('[a](x.md "Title")')).toEqual([{ syntax: 'inline', text: 'x.md', line: 1, column: 5 }]);
    expect(links("[a](x.md 'Title')")).toEqual([{ syntax: 'inline', text: 'x.md', line: 1, column: 5 }]);
  });

  test('angle-bracket destination may contain spaces', () => {
    expect(links('[a](<my file.md>)')).toEqual([
      { syntax: 'inline', text: 'my file.md', line: 1, column: 6 },
    ]);
  });

  test('image links are reported as images', () => {
    expect(links('![alt](img/a.png)')).toEqual([{ syntax: 'image', text: 'img/a.png', line: 1, column: 8 }]);
  });

  test('an empty destination is still reported', () => {
    expect(links('[x]()')).toEqual([{ syntax: 'inline', text: '', line: 1, column: 5 }]);
  });

  test('balanced parentheses stay inside the destination', () => {
    expect(links('[a](foo(1).md)')[0]?.text).toBe('foo(1).md');
  });

  test('fragments and queries are kept as written', () => {
    expect(links('[a](docs/api.md#login) [b](x.md?raw=1)').map((l) => l.text)).toEqual([
      'docs/api.md#login',
      'x.md?raw=1',
    ]);
    expect(links('[top](#installation)')[0]?.text).toBe('#installation');
  });

  test('nested image-in-link reports both destinations', () => {
    expect(links('[![img](a.png)](b.md)').map((l) => [l.syntax, l.text])).toEqual([
      ['image', 'a.png'],
      ['inline', 'b.md'],
    ]);
  });

  test('reference definitions are links; footnote definitions are not', () => {
    expect(links('[id]: docs/a.md')).toEqual([
      { syntax: 'definition', text: 'docs/a.md', line: 1, column: 7 },
    ]);
    expect(links('[id]: <docs/a b.md>')[0]).toMatchObject({ text: 'docs/a b.md', column: 8 });
    expect(links('[^1]: a note')).toEqual([]);
  });

  test('autolinks are reported', () => {
    expect(links('Go to <https://example.com/x> now')).toEqual([
      { syntax: 'autolink', text: 'https://example.com/x', line: 1, column: 8 },
    ]);
  });

  test('reference-style usages and malformed links yield nothing', () => {
    expect(links('[text][id]')).toEqual([]);
    expect(links('[a] (b.md)')).toEqual([]);
    expect(links('[a](b.md')).toEqual([]);
    expect(links('[a](b.md junk)')).toEqual([]);
    expect(links('plain [brackets] only')).toEqual([]);
  });

  test('escaped brackets are not links', () => {
    expect(links('\\[x](y.md)')).toEqual([]);
  });
});

describe('inline code', () => {
  test('content and position', () => {
    expect(inlineCode('Run `npm test` and `src/a.ts`')).toEqual([
      { text: 'npm test', line: 1, column: 6 },
      { text: 'src/a.ts', line: 1, column: 21 },
    ]);
  });

  test('longer delimiters allow backticks inside and trim one padding space', () => {
    expect(inlineCode('`` a`b ``')[0]?.text).toBe('a`b');
  });

  test('unclosed or escaped backticks are not code', () => {
    expect(inlineCode('a `unclosed')).toEqual([]);
    expect(inlineCode('\\`x\\`')).toEqual([]);
  });

  test('links inside code are not links', () => {
    expect(links('`[a](b.md)`')).toEqual([]);
    expect(inlineCode('`[a](b.md)`')[0]?.text).toBe('[a](b.md)');
  });

  test('code inside a link label does not hide the link', () => {
    expect(links('[`x]`](a.md)').map((l) => l.text)).toEqual(['a.md']);
  });
});

describe('fenced code blocks', () => {
  const doc = ['intro', '```bash', 'npm test', './scripts/run.sh --fast', '```', 'after'].join('\n');

  test('info string, lines and positions', () => {
    const [block] = blocks(doc);
    expect(block?.info).toBe('bash');
    expect(block?.position).toEqual({ line: 2, column: 1 });
    expect(block?.lines.map((l) => [l.text, l.position.line, l.position.column])).toEqual([
      ['npm test', 3, 1],
      ['./scripts/run.sh --fast', 4, 1],
    ]);
  });

  test('tilde fences work and need a matching closing fence', () => {
    const [block] = blocks('~~~\na\n```\nb\n~~~\nc');
    expect(block?.lines.map((l) => l.text)).toEqual(['a', '```', 'b']);
  });

  test('a shorter closing fence does not close', () => {
    const [block] = blocks('````\nx\n```\ny\n````');
    expect(block?.lines.map((l) => l.text)).toEqual(['x', '```', 'y']);
  });

  test('an unclosed fence runs to the end of the document', () => {
    const [block] = blocks('```\nx\ny');
    expect(block?.lines.map((l) => l.text)).toEqual(['x', 'y']);
  });

  test('indented fences strip the fence indentation', () => {
    const [block] = blocks('  ```\n  indented\n    deeper\n  ```');
    expect(block?.lines.map((l) => [l.text, l.position.column])).toEqual([
      ['indented', 3],
      ['  deeper', 3],
    ]);
  });

  test('content of a block is not scanned for links or inline code', () => {
    const content = '```\n[a](b.md) `c`\n```';
    expect(links(content)).toEqual([]);
    expect(inlineCode(content)).toEqual([]);
  });

  test('a backtick fence cannot have backticks in its info string', () => {
    expect(blocks('``` a`b\nx')).toEqual([]);
  });
});

describe('HTML', () => {
  test('anchors named by name or id are reported with the value position', () => {
    const nodes = scanMarkdown('<a name="login"></a> and <a id=\'top\'>x</a>').filter(
      (n) => n.type === 'html-anchor',
    );
    expect(
      nodes.map((n) =>
        n.type === 'html-anchor' ? [n.attribute, n.value.text, n.value.position.column] : [],
      ),
    ).toEqual([
      ['name', 'login', 10],
      ['id', 'top', 33],
    ]);
  });

  test('comments hide their content, also across lines', () => {
    expect(links('a <!-- [x](hidden.md) --> [y](shown.md)').map((l) => l.text)).toEqual(['shown.md']);
    expect(links('<!--\n[x](hidden.md)\n-->\n[y](shown.md)').map((l) => l.text)).toEqual(['shown.md']);
  });
});

describe('frontmatter', () => {
  test('quoted, plain, flow and block values with positions', () => {
    const doc = [
      '---',
      'description: Does things # note',
      'globs: "src/**/*.ts"',
      'applyTo: a/*.md, b/*.md',
      'paths: ["docs/**", \'x/*.md\']',
      'files:',
      '  - "k/**"',
      '  - m/*.ts',
      'body: |',
      '  not a value',
      '---',
      '# Title',
    ].join('\n');
    expect(fields(doc)).toEqual([
      { key: 'description', values: [{ text: 'Does things', line: 2, column: 14 }] },
      { key: 'globs', values: [{ text: 'src/**/*.ts', line: 3, column: 9 }] },
      { key: 'applyTo', values: [{ text: 'a/*.md, b/*.md', line: 4, column: 10 }] },
      {
        key: 'paths',
        values: [
          { text: 'docs/**', line: 5, column: 10 },
          { text: 'x/*.md', line: 5, column: 21 },
        ],
      },
      {
        key: 'files',
        values: [
          { text: 'k/**', line: 7, column: 6 },
          { text: 'm/*.ts', line: 8, column: 5 },
        ],
      },
      { key: 'body', values: [] },
    ]);
  });

  test('body lines after frontmatter keep absolute line numbers', () => {
    const content = '---\nglobs: a\n---\n[l](x.md)';
    expect(links(content)).toEqual([{ syntax: 'inline', text: 'x.md', line: 4, column: 5 }]);
  });

  test('frontmatter without a closing delimiter is plain text', () => {
    expect(fields('---\nglobs: a\n[l](x.md)')).toEqual([]);
    expect(links('---\nglobs: a\n[l](x.md)')).toHaveLength(1);
  });

  test('only a leading block counts', () => {
    expect(fields('text\n---\nglobs: a\n---')).toEqual([]);
  });
});

describe('positions across platforms and Unicode', () => {
  const unix = 'a\n[x](one.md)\n\n[y](two.md)';

  test('CRLF, CR and LF give identical results', () => {
    const expected = links(unix);
    expect(links(unix.replaceAll('\n', '\r\n'))).toEqual(expected);
    expect(links(unix.replaceAll('\n', '\r'))).toEqual(expected);
    expect(expected.map((l) => l.line)).toEqual([2, 4]);
  });

  test('a leading byte-order mark does not shift columns', () => {
    expect(links('﻿[x](a.md)')).toEqual(links('[x](a.md)'));
    expect(links('﻿---\nglobs: a\n---\n[x](a.md)')).toHaveLength(1);
  });

  test('columns count code points, not UTF-16 units', () => {
    expect(links('ação 📚 [a](b.md)')).toEqual([{ syntax: 'inline', text: 'b.md', line: 1, column: 12 }]);
  });

  test('columns follow the text as written: decomposed accents take more code points', () => {
    const nfc = 'ação [a](b.md)'.normalize('NFC');
    const nfd = 'ação [a](b.md)'.normalize('NFD');
    expect(links(nfc)[0]?.column).toBe(10);
    expect(links(nfd)[0]?.column).toBe(12);
    expect(links(nfd)[0]?.text).toBe('b.md');
  });

  test('positionWithin advances by code points inside a span', () => {
    const [node] = scanMarkdown('`x 📚 y.md`');
    if (node?.type !== 'inline-code') throw new Error('expected inline code');
    expect(positionWithin(node.content, 0)).toEqual({ line: 1, column: 2 });
    expect(positionWithin(node.content, 'x 📚 '.length)).toEqual({ line: 1, column: 6 });
  });
});

function headings(content: string) {
  return scanMarkdown(content)
    .filter((n): n is Extract<MarkdownNode, { type: 'heading' }> => n.type === 'heading')
    .map((n) => ({
      level: n.level,
      text: n.text.text,
      line: n.text.position.line,
      column: n.text.position.column,
    }));
}

describe('headings', () => {
  test('ATX headings: level, title and position', () => {
    expect(headings('# One\n## Two ##\n###   Three')).toEqual([
      { level: 1, text: 'One', line: 1, column: 3 },
      { level: 2, text: 'Two', line: 2, column: 4 },
      { level: 3, text: 'Three', line: 3, column: 7 },
    ]);
  });

  test('a hash without a space, seven hashes or four spaces of indent are not headings', () => {
    expect(headings('#hashtag\n####### seven\n    # indented')).toEqual([]);
  });

  test('an empty heading has an empty title', () => {
    expect(headings('#')).toEqual([{ level: 1, text: '', line: 1, column: 2 }]);
  });

  test('setext headings take the line above the underline', () => {
    expect(headings('Title\n=====\n\nSub\n---\n')).toEqual([
      { level: 1, text: 'Title', line: 1, column: 1 },
      { level: 2, text: 'Sub', line: 4, column: 1 },
    ]);
  });

  test('an underline needs a paragraph line directly above it', () => {
    expect(headings('- item\n---\n\ntext\n\n---\n\n> quote\n---')).toEqual([]);
  });

  test('headings inside fences and comments are ignored', () => {
    expect(headings('```\n# no\n```\n<!--\n# hidden\n-->\n# yes')).toEqual([
      { level: 1, text: 'yes', line: 7, column: 3 },
    ]);
  });

  test('links inside a heading are still reported', () => {
    expect(headings('## See [x](a.md)')[0]?.text).toBe('See [x](a.md)');
    expect(links('## See [x](a.md)').map((l) => l.text)).toEqual(['a.md']);
  });
});

describe('indented code blocks', () => {
  test('four spaces after a blank line start a code block; its links are not links', () => {
    const doc = 'Intro\n\n    [a](b.md) `c`\n    second line\n\nafter [d](e.md)';
    const [block] = blocks(doc);
    expect(block?.info).toBe('');
    expect(block?.lines.map((l) => [l.text, l.position.line, l.position.column])).toEqual([
      ['[a](b.md) `c`', 3, 5],
      ['second line', 4, 5],
    ]);
    expect(links(doc).map((l) => l.text)).toEqual(['e.md']);
    expect(inlineCode(doc)).toEqual([]);
  });

  test('a tab counts as four columns, and so does the start of the document', () => {
    expect(blocks('\tcode/x.md')[0]?.lines.map((l) => l.text)).toEqual(['code/x.md']);
    expect(blocks('    code/x.md')[0]?.lines.map((l) => l.text)).toEqual(['code/x.md']);
  });

  test('a heading lets a block start on the next line', () => {
    expect(blocks('# Title\n    code/x.md')[0]?.lines.map((l) => l.text)).toEqual(['code/x.md']);
  });

  test('blank lines inside the block keep it open', () => {
    const [block] = blocks('\n    a.md\n\n    b.md\nend');
    expect(block?.lines.map((l) => l.text)).toEqual(['a.md', 'b.md']);
  });

  test('indented text right after a paragraph line continues the paragraph', () => {
    expect(blocks('Para\n    [a](b.md)')).toEqual([]);
    expect(links('Para\n    [a](b.md)').map((l) => l.text)).toEqual(['b.md']);
  });

  test('indented text inside a list continues the item', () => {
    const doc = '- item\n\n    [a](b.md)\n\n1. other\n\n    [c](d.md)';
    expect(blocks(doc)).toEqual([]);
    expect(links(doc).map((l) => l.text)).toEqual(['b.md', 'd.md']);
  });

  test('a list ends at the next unindented paragraph', () => {
    const doc = '- item\n\nParagraph\n\n    code/x.md';
    expect(blocks(doc)[0]?.lines.map((l) => l.text)).toEqual(['code/x.md']);
  });

  test('headings inside an indented block are not headings', () => {
    expect(headings('\n    # not a heading')).toEqual([]);
  });

  test('a fence wins over indentation', () => {
    const [block] = blocks('\n    ```sh\n    run.sh\n    ```');
    expect(block?.info).toBe('sh');
    expect(block?.lines.map((l) => l.text)).toEqual(['run.sh']);
  });
});

describe('pathological lines are scanned in linear time', () => {
  const LIMIT_MS = 1500;
  test.each([
    ['unmatched brackets', '['.repeat(100_000)],
    ['unmatched backticks', '` '.repeat(100_000)],
    ['backtick runs of growing length', Array.from({ length: 400 }, (_, i) => '`'.repeat(i + 1)).join(' ')],
    ['unclosed angle brackets', '<a '.repeat(50_000)],
    ['links with unclosed destinations', '[a](<'.repeat(30_000)],
    ['many inline code spans', '`a` '.repeat(30_000)],
    ['many links', '[a](b.md) '.repeat(20_000)],
  ])('%s', (_name, line) => {
    const start = performance.now();
    scanMarkdown(line);
    expect(performance.now() - start).toBeLessThan(LIMIT_MS);
  });

  test('the results on a long line are still exact', () => {
    const line = `${'['.repeat(10_000)} [x](a.md) \`code\``;
    expect(links(line).map((l) => [l.text, l.column])).toEqual([['a.md', 10_006]]);
    expect(inlineCode(line).map((c) => c.text)).toEqual(['code']);
  });
});

describe('ordering and determinism', () => {
  const doc = [
    '---',
    'globs: "a/*.md"',
    '---',
    'Read [guide](g.md) or `cfg.json`.',
    '```sh',
    'cat x.txt',
    '```',
    '<a name="top"></a>',
  ].join('\n');

  test('nodes come in document order', () => {
    const positions = scanMarkdown(doc).map((n) => [n.position.line, n.position.column]);
    expect(positions).toEqual([...positions].sort((a, b) => a[0]! - b[0]! || a[1]! - b[1]!));
    expect(scanMarkdown(doc).map((n) => n.type)).toEqual([
      'frontmatter-field',
      'link',
      'inline-code',
      'code-block',
      'html-anchor',
    ]);
  });

  test('scanning twice gives the same result', () => {
    expect(scanMarkdown(doc)).toEqual(scanMarkdown(doc));
  });

  test('empty and whitespace-only input give no nodes', () => {
    expect(scanMarkdown('')).toEqual([]);
    expect(scanMarkdown('  \n\t\n')).toEqual([]);
  });
});
