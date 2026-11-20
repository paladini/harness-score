import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, describe, expect, test } from 'vitest';
import { createScanContext } from '../src/scan.js';

const tmpDirs: string[] = [];

function mkRepo(files: string[]): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-score-glob-'));
  tmpDirs.push(dir);
  for (const rel of files) {
    const abs = path.join(dir, rel);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, 'x');
  }
  return dir;
}

afterEach(() => {
  while (tmpDirs.length > 0) {
    fs.rmSync(tmpDirs.pop()!, { recursive: true, force: true });
  }
});

describe('ScanContext.matchingGlob', () => {
  const repo = [
    'README.md',
    'docs/a.md',
    'docs/guide/b.md',
    '.cursor/rules/core.mdc',
    '.agents/skills/deploy/SKILL.md',
    'src/index.ts',
  ];

  test('supports *, ** and ? against real scanned files', () => {
    const ctx = createScanContext(mkRepo(repo));
    expect(ctx.matchingGlob('*.md')).toEqual(['README.md']);
    expect(ctx.matchingGlob('docs/**/*.md')).toEqual(['docs/a.md', 'docs/guide/b.md']);
    expect(ctx.matchingGlob('.cursor/rules/*.mdc')).toEqual(['.cursor/rules/core.mdc']);
    expect(ctx.matchingGlob('**/SKILL.md')).toEqual(['.agents/skills/deploy/SKILL.md']);
    expect(ctx.matchingGlob('src/inde?.ts')).toEqual(['src/index.ts']);
  });

  test('returns files in the same sorted order as ctx.files', () => {
    const ctx = createScanContext(mkRepo(repo));
    const all = ctx.matchingGlob('**') ?? [];
    expect(all).toEqual(ctx.files);
  });

  test('returns an empty list when nothing matches', () => {
    const ctx = createScanContext(mkRepo(repo));
    expect(ctx.matchingGlob('lib/**')).toEqual([]);
  });

  test('returns null, not an empty list, for unsupported syntax', () => {
    const ctx = createScanContext(mkRepo(repo));
    expect(ctx.matchingGlob('!docs/**')).toBeNull();
    expect(ctx.matchingGlob('src/*.{ts,js}')).toBeNull();
    expect(ctx.matchingGlob('$HOME/*.md')).toBeNull();
    expect(ctx.matchingGlob('')).toBeNull();
  });

  test('handles non-ASCII file names, including astral characters', () => {
    const ctx = createScanContext(mkRepo(['notas/ação.md', 'notas/📚.md']));
    expect(ctx.matchingGlob('notas/*.md')).toHaveLength(2);
    // `?` consumes one code point: the astral emoji matches, the 4-letter name does not.
    expect(ctx.matchingGlob('notas/?.md')).toEqual(['notas/📚.md']);
  });

  test('is deterministic across repeated queries and scans', () => {
    const dir = mkRepo(repo);
    const ctx = createScanContext(dir);
    const first = ctx.matchingGlob('docs/**');
    expect(ctx.matchingGlob('docs/**')).toEqual(first);
    expect(createScanContext(dir).matchingGlob('docs/**')).toEqual(first);
  });
});
