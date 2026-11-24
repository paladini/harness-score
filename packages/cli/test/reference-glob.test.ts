import { describe, expect, test } from 'vitest';
import { filterGlob, matchGlob, parseGlob } from '../src/references/glob.js';

describe('literal patterns', () => {
  test('match only the exact path, case-sensitively', () => {
    expect(matchGlob('src/index.ts', 'src/index.ts')).toBe(true);
    expect(matchGlob('src/index.ts', 'src/Index.ts')).toBe(false);
    expect(matchGlob('src/index.ts', 'src/index.tsx')).toBe(false);
    expect(matchGlob('src/index.ts', 'lib/src/index.ts')).toBe(false);
  });

  test('treat regex metacharacters literally', () => {
    expect(matchGlob('a.b', 'a.b')).toBe(true);
    expect(matchGlob('a.b', 'axb')).toBe(false);
    expect(matchGlob('a+b(1)^|', 'a+b(1)^|')).toBe(true);
    expect(matchGlob('a-b', 'a-b')).toBe(true);
  });
});

describe('* wildcard', () => {
  test('matches within one segment only', () => {
    expect(matchGlob('src/*.ts', 'src/a.ts')).toBe(true);
    expect(matchGlob('src/*.ts', 'src/.ts')).toBe(true);
    expect(matchGlob('src/*.ts', 'src/a/b.ts')).toBe(false);
    expect(matchGlob('*.md', 'docs/a.md')).toBe(false);
  });

  test('matches dotfiles and dot directories like any other name', () => {
    expect(matchGlob('.cursor/rules/*.mdc', '.cursor/rules/core.mdc')).toBe(true);
    expect(matchGlob('*', '.gitignore')).toBe(true);
  });

  test('collapses consecutive stars inside a segment', () => {
    expect(matchGlob('a**b', 'axyb')).toBe(true);
    expect(matchGlob('a**b', 'a/b')).toBe(false);
  });
});

describe('? wildcard', () => {
  test('matches exactly one character, never a separator', () => {
    expect(matchGlob('arquivo?.md', 'arquivo1.md')).toBe(true);
    expect(matchGlob('arquivo?.md', 'arquivo.md')).toBe(false);
    expect(matchGlob('arquivo?.md', 'arquivo12.md')).toBe(false);
    expect(matchGlob('a?b', 'a/b')).toBe(false);
  });

  test('counts one code point for accented and astral characters', () => {
    expect(matchGlob('doc?.md', 'docã.md')).toBe(true);
    expect(matchGlob('doc?.md', 'doc📚.md')).toBe(true);
    expect(matchGlob('doc?.md', 'doc📚📚.md')).toBe(false);
  });
});

describe('** wildcard', () => {
  test('matches zero or more segments in the middle', () => {
    expect(matchGlob('src/**/*.ts', 'src/a.ts')).toBe(true);
    expect(matchGlob('src/**/*.ts', 'src/a/b/c.ts')).toBe(true);
    expect(matchGlob('src/**/*.ts', 'lib/a.ts')).toBe(false);
    expect(matchGlob('src/**/*.ts', 'src/a/b.js')).toBe(false);
  });

  test('matches any depth at the start', () => {
    expect(matchGlob('**/SKILL.md', 'SKILL.md')).toBe(true);
    expect(matchGlob('**/SKILL.md', '.agents/skills/x/SKILL.md')).toBe(true);
    expect(matchGlob('**/SKILL.md', 'SKILL.md.bak')).toBe(false);
  });

  test('needs at least one segment when trailing', () => {
    expect(matchGlob('docs/**', 'docs/a.md')).toBe(true);
    expect(matchGlob('docs/**', 'docs/a/b/c.md')).toBe(true);
    expect(matchGlob('docs/**', 'docs')).toBe(false);
    expect(matchGlob('docs/**', 'other/a.md')).toBe(false);
    expect(matchGlob('**', 'any/path/at/all.txt')).toBe(true);
  });
});

describe('unsupported patterns', () => {
  test.each([
    ['', 'empty'],
    ['!src/*.ts', 'negation'],
    ['src\\*.ts', 'backslash'],
    ['$HOME/*.md', 'interpolation'],
    ['src/${DIR}/*.ts', 'interpolation'],
    ['src/*.{ts,js}', 'brace-expansion'],
    ['src/[ab].ts', 'character-class'],
  ])('%j is reported as %s, never as a mismatch', (pattern, reason) => {
    expect(parseGlob(pattern)).toEqual({ supported: false, reason });
    expect(matchGlob(pattern, 'src/a.ts')).toBeNull();
    expect(filterGlob(pattern, ['src/a.ts'])).toBeNull();
  });
});

describe('filterGlob', () => {
  const files = ['README.md', 'docs/a.md', 'docs/guide/b.md', 'src/index.ts'];

  test('keeps input order and returns only matches', () => {
    expect(filterGlob('docs/**/*.md', files)).toEqual(['docs/a.md', 'docs/guide/b.md']);
    expect(filterGlob('*.md', files)).toEqual(['README.md']);
  });

  test('returns an empty list when nothing matches', () => {
    expect(filterGlob('lib/**', files)).toEqual([]);
  });

  test('is deterministic across repeated calls', () => {
    expect(filterGlob('docs/**', files)).toEqual(filterGlob('docs/**', files));
  });
});
