import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, describe, expect, test } from 'vitest';
import { createScanContext } from '../src/scan.js';

const tmpDirs: string[] = [];

function mkRepo(files: string[]): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-score-dir-'));
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

describe('ScanContext.hasDirectory', () => {
  test('is true for a directory with files, at any nesting level', () => {
    const ctx = createScanContext(mkRepo(['docs/guide/intro.md', 'README.md']));
    expect(ctx.hasDirectory('docs')).toBe(true);
    expect(ctx.hasDirectory('docs/guide')).toBe(true);
  });

  test('is false for a missing directory and for a partial segment name', () => {
    const ctx = createScanContext(mkRepo(['docs/guide/intro.md']));
    expect(ctx.hasDirectory('src')).toBe(false);
    expect(ctx.hasDirectory('doc')).toBe(false);
    expect(ctx.hasDirectory('docs/gui')).toBe(false);
  });

  test('is false for a file path and for the repository root', () => {
    const ctx = createScanContext(mkRepo(['docs/intro.md', 'README.md']));
    expect(ctx.hasDirectory('README.md')).toBe(false);
    expect(ctx.hasDirectory('docs/intro.md')).toBe(false);
    expect(ctx.hasDirectory('')).toBe(false);
  });

  test('does not normalize trailing slashes or ./ prefixes', () => {
    const ctx = createScanContext(mkRepo(['docs/intro.md']));
    expect(ctx.hasDirectory('docs/')).toBe(false);
    expect(ctx.hasDirectory('./docs')).toBe(false);
  });

  test('does not detect empty directories', () => {
    const dir = mkRepo(['README.md']);
    fs.mkdirSync(path.join(dir, 'empty'));
    expect(createScanContext(dir).hasDirectory('empty')).toBe(false);
  });

  test('handles non-ASCII directory names, including astral characters', () => {
    const dir = mkRepo(['docs/ação/guía.md', 'notas/📚/índice.md']);
    const ctx = createScanContext(dir);
    // Probe with the exact strings the scan produced, so the test holds on
    // filesystems that store names in a different Unicode form (e.g. macOS HFS+).
    const dirsOf = (f: string) => f.split('/').slice(0, -1);
    for (const file of ctx.files) {
      const parts = dirsOf(file);
      for (let i = 1; i <= parts.length; i++) {
        expect(ctx.hasDirectory(parts.slice(0, i).join('/'))).toBe(true);
      }
    }
    expect(ctx.hasDirectory('docs/acao')).toBe(false);
  });

  test('is deterministic across repeated scans of the same tree', () => {
    const dir = mkRepo(['a/b/c.md', 'a/d.md']);
    const probes = ['a', 'a/b', 'a/b/c.md', 'z'];
    const first = probes.map((p) => createScanContext(dir).hasDirectory(p));
    const second = probes.map((p) => createScanContext(dir).hasDirectory(p));
    expect(second).toEqual(first);
    expect(first).toEqual([true, true, false, false]);
  });
});
