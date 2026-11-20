import { describe, expect, test } from 'vitest';
import { normalizeTarget } from '../src/references/normalize.js';

const fromRoot = { base: 'root' } as const;
const fromDocs = { base: 'document', sourceDir: 'docs/guide' } as const;

function path(raw: string, options = fromRoot) {
  const result = normalizeTarget(raw, options);
  if (result.kind !== 'path') throw new Error(`expected a path, got ${result.kind}`);
  return result;
}

describe('redundant segments and separators', () => {
  test.each([
    ['./src//index.ts', 'src/index.ts'],
    ['src/./a/../index.ts', 'src/index.ts'],
    ['src\\lib\\a.ts', 'src/lib/a.ts'],
    ['  src/a.ts  ', 'src/a.ts'],
    ['a///b', 'a/b'],
  ])('%j -> %j', (raw, expected) => {
    expect(path(raw).path).toBe(expected);
  });

  test('keeps case untouched', () => {
    expect(path('Docs/README.md').path).toBe('Docs/README.md');
  });

  test('resolves to the repository root as an empty path', () => {
    expect(path('.').path).toBe('');
    expect(path('docs/..').path).toBe('');
  });
});

describe('base: document vs root', () => {
  test('document base resolves from the source directory', () => {
    expect(path('../api.md', fromDocs).path).toBe('docs/api.md');
    expect(path('./b.md', fromDocs).path).toBe('docs/guide/b.md');
    expect(path('../../README.md', fromDocs).path).toBe('README.md');
  });

  test('root base ignores the source directory', () => {
    expect(path('b.md', { base: 'root', sourceDir: 'docs/guide' }).path).toBe('b.md');
  });

  test('a leading slash is root-relative only with the root base', () => {
    expect(path('/docs/a.md').path).toBe('docs/a.md');
    expect(normalizeTarget('/docs/a.md', fromDocs)).toEqual({
      kind: 'not-evaluable',
      reason: 'inaccessible-local-target',
    });
  });
});

describe('directory hint', () => {
  test.each([
    ['docs/', true],
    ['docs', false],
    ['docs/.', true],
    ['docs/guide/..', true],
    ['docs/a.md', false],
  ])('%j -> directoryHint %s', (raw, hint) => {
    expect(path(raw).directoryHint).toBe(hint);
  });
});

describe('root containment', () => {
  test.each([
    ['../outside.md', fromRoot],
    ['docs/../../outside.md', fromRoot],
    ['../../../etc/passwd', fromRoot],
    ['../../../x.md', fromDocs],
    ['..\\..\\x.md', fromRoot],
  ])('%j never escapes the root', (raw, options) => {
    expect(normalizeTarget(raw, options)).toEqual({
      kind: 'not-evaluable',
      reason: 'root-escape-attempt',
    });
  });

  test('going up exactly to the root is allowed', () => {
    expect(path('../../x.md', fromDocs).path).toBe('x.md');
  });
});

describe('not evaluable targets', () => {
  test.each([
    ['http://example.com/a', 'external-resource'],
    ['https://example.com/a.md', 'external-resource'],
    ['mailto:someone@example.com', 'external-resource'],
    ['//cdn.example.com/a.js', 'external-resource'],
    ['$HOME/config.md', 'variable-dependent'],
    ['${DIR}/a.md', 'variable-dependent'],
    ['%USERPROFILE%\\a.md', 'variable-dependent'],
    ['~/notes.md', 'variable-dependent'],
    ['packages/<name>/src', 'variable-dependent'],
    ['$(git rev-parse --show-toplevel)/a.md', 'execution-dependent'],
    ['`pwd`/a.md', 'execution-dependent'],
    ['/etc/passwd', 'inaccessible-local-target'],
    ['C:\\Users\\me\\a.md', 'inaccessible-local-target'],
    ['c:/work/a.md', 'inaccessible-local-target'],
    ['\\\\server\\share\\a.md', 'inaccessible-local-target'],
  ])('%j -> %s', (raw, reason) => {
    expect(normalizeTarget(raw, fromDocs)).toEqual({ kind: 'not-evaluable', reason });
  });

  test('execution-dependent wins over variable-dependent', () => {
    expect(normalizeTarget('$(echo $HOME)/a', fromRoot)).toEqual({
      kind: 'not-evaluable',
      reason: 'execution-dependent',
    });
  });
});

describe('empty input', () => {
  test.each(['', '   ', '\t\n'])('%j is empty', (raw) => {
    expect(normalizeTarget(raw, fromRoot)).toEqual({ kind: 'empty' });
  });
});

describe('Unicode', () => {
  test('NFC and NFD spellings normalize to the same path', () => {
    const nfc = 'docs/ação/guía.md'.normalize('NFC');
    const nfd = 'docs/ação/guía.md'.normalize('NFD');
    expect(nfc).not.toBe(nfd);
    expect(path(nfd).path).toBe(nfc);
    expect(path(nfc).path).toBe(nfc);
  });

  test('keeps astral characters intact', () => {
    expect(path('notas/📚/./índice.md').path).toBe('notas/📚/índice.md'.normalize('NFC'));
  });
});

describe('determinism', () => {
  test('same input and options always give the same result', () => {
    const a = normalizeTarget('../x/./y.md', fromDocs);
    expect(normalizeTarget('../x/./y.md', fromDocs)).toEqual(a);
  });
});
